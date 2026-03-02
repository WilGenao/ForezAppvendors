//+------------------------------------------------------------------+
//| ForexBot Marketplace Bridge EA                                    |
//| Conecta MetaTrader 5 con ForexBot Marketplace API                 |
//|                                                                   |
//| AVISO LEGAL: Este EA es únicamente tecnología de intermediación.  |
//| No constituye asesoramiento financiero ni gestión de capital.     |
//+------------------------------------------------------------------+
#property copyright "ForexBot Marketplace"
#property version   "1.0"
#property strict

#include <Trade\Trade.mqh>
#include <JAson.mqh>

// ============================================================
// INPUTS
// ============================================================
input string   API_KEY         = "";           // Tu API Key del Marketplace
input string   BOT_ID          = "";           // ID del bot en el marketplace
input string   LICENSE_KEY      = "";          // Clave de licencia
input string   API_BASE_URL    = "https://api.forexbot.com/api/v1"; // URL base API
input int      VALIDATE_EVERY_HOURS = 4;       // Validar licencia cada N horas
input int      UPLOAD_BATCH_SIZE    = 500;     // Trades por batch al subir historial
input bool     AUTO_UPLOAD_HISTORY  = true;    // Subir historial automáticamente
input int      UPLOAD_INTERVAL_HOURS = 24;    // Cada cuántas horas subir historial

// ============================================================
// VARIABLES GLOBALES
// ============================================================
datetime g_last_license_check = 0;
datetime g_last_history_upload = 0;
bool     g_license_valid = false;
int      g_upload_retries = 0;
const int MAX_RETRIES = 3;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(API_KEY) == 0 || StringLen(BOT_ID) == 0 || StringLen(LICENSE_KEY) == 0) {
      Alert("ForexBot Bridge: API_KEY, BOT_ID and LICENSE_KEY are required");
      return INIT_PARAMETERS_INCORRECT;
   }

   // Validar licencia al inicio
   if(!ValidateLicense()) {
      Alert("ForexBot Bridge: License validation failed. EA will not operate.");
      return INIT_FAILED;
   }

   // Subir historial inicial si está habilitado
   if(AUTO_UPLOAD_HISTORY) {
      UploadTradeHistory();
   }

   // Timer cada hora para checks periódicos
   EventSetTimer(3600);
   Print("ForexBot Bridge initialized successfully for bot: ", BOT_ID);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Timer — comprobaciones periódicas                                 |
//+------------------------------------------------------------------+
void OnTimer()
{
   datetime now = TimeCurrent();

   // Validar licencia cada N horas
   if(now - g_last_license_check >= VALIDATE_EVERY_HOURS * 3600) {
      if(!ValidateLicense()) {
         Print("ForexBot Bridge: License invalid. Stopping EA.");
         ExpertRemove();
         return;
      }
   }

   // Subir historial
   if(AUTO_UPLOAD_HISTORY && now - g_last_history_upload >= UPLOAD_INTERVAL_HOURS * 3600) {
      UploadTradeHistory();
   }
}

//+------------------------------------------------------------------+
//| VALIDACIÓN DE LICENCIA                                            |
//| Limitación MQL5: WebRequest es bloqueante y tiene timeout fijo.  |
//| No hay async nativo — cada request bloquea el hilo del EA.       |
//| Solución: solo validar en init y cada N horas, no en cada tick.  |
//+------------------------------------------------------------------+
bool ValidateLicense()
{
   string url = API_BASE_URL + "/licensing/validate";

   // Construir JSON body manualmente (MQL5 no tiene JSON nativo)
   string mt_account = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string body = "{\"licenseKey\":\"" + LICENSE_KEY + "\","
               + "\"mtAccountId\":\"" + mt_account + "\","
               + "\"mtPlatform\":\"MT5\","
               + "\"hwidHash\":\"" + GetHwidHash() + "\"}";

   string headers = "Content-Type: application/json\r\nX-API-Key: " + API_KEY;
   char   post_data[];
   StringToCharArray(body, post_data, 0, StringLen(body));

   char   result_data[];
   string result_headers;
   int    timeout = 5000; // 5 segundos timeout

   // MQL5 WebRequest — bloqueante pero con timeout
   int res = WebRequest("POST", url, headers, timeout, post_data, result_data, result_headers);

   if(res == -1) {
      int err = GetLastError();
      Print("ForexBot Bridge: WebRequest error ", err, ". Check Tools > Options > Expert Advisors > Allow WebRequest for: ", API_BASE_URL);
      // Si falla la red, usar último resultado cacheado (fail-open para no interrumpir trading)
      return g_license_valid;
   }

   if(res != 200) {
      Print("ForexBot Bridge: License validation HTTP error: ", res);
      g_license_valid = false;
      return false;
   }

   string response = CharArrayToString(result_data);
   bool is_valid = StringFind(response, "\"isValid\":true") >= 0;

   g_license_valid = is_valid;
   g_last_license_check = TimeCurrent();
   Print("ForexBot Bridge: License validation result: ", is_valid ? "VALID" : "INVALID");
   return is_valid;
}

//+------------------------------------------------------------------+
//| SUBIDA DE HISTORIAL DE TRADES                                     |
//| Envía historial en batches de UPLOAD_BATCH_SIZE                  |
//| MQL5 limitación: string máx ~32KB por WebRequest                 |
//| Solución: batches de 500 trades con pausa entre requests         |
//+------------------------------------------------------------------+
void UploadTradeHistory()
{
   Print("ForexBot Bridge: Starting history upload for bot ", BOT_ID);

   int total_deals = HistoryDealsTotal();
   if(total_deals == 0) {
      Print("ForexBot Bridge: No trade history available");
      return;
   }

   // Cargar historial completo
   if(!HistorySelect(0, TimeCurrent())) {
      Print("ForexBot Bridge: Failed to load history");
      return;
   }

   int batch_count = 0;
   int trade_count = 0;
   string batch_trades = "[";
   bool first_in_batch = true;

   for(int i = 0; i < total_deals; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      ENUM_DEAL_TYPE deal_type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      // Solo deals de entrada/salida de posición
      if(deal_type != DEAL_TYPE_BUY && deal_type != DEAL_TYPE_SELL) continue;
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      string trade_json = BuildTradeJson(ticket);
      if(StringLen(trade_json) == 0) continue;

      if(!first_in_batch) batch_trades += ",";
      batch_trades += trade_json;
      first_in_batch = false;
      trade_count++;

      // Enviar batch cuando llega al límite
      if(trade_count >= UPLOAD_BATCH_SIZE) {
         batch_trades += "]";
         if(SendHistoryBatch(batch_trades, batch_count)) {
            batch_count++;
         } else {
            g_upload_retries++;
            if(g_upload_retries >= MAX_RETRIES) {
               Print("ForexBot Bridge: Max retries reached, aborting upload");
               return;
            }
         }
         batch_trades = "[";
         first_in_batch = true;
         trade_count = 0;
         Sleep(1000); // Pausa entre batches — no saturar la API
      }
   }

   // Enviar último batch
   if(trade_count > 0) {
      batch_trades += "]";
      SendHistoryBatch(batch_trades, batch_count);
   }

   g_last_history_upload = TimeCurrent();
   g_upload_retries = 0;
   Print("ForexBot Bridge: History upload complete. Batches sent: ", batch_count + 1);
}

//+------------------------------------------------------------------+
string BuildTradeJson(ulong ticket)
{
   double profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
   double price      = HistoryDealGetDouble(ticket, DEAL_PRICE);
   double volume     = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   string symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);
   datetime time     = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   ENUM_DEAL_TYPE dtype = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
   long   magic      = HistoryDealGetInteger(ticket, DEAL_MAGIC);

   string direction = (dtype == DEAL_TYPE_BUY) ? "buy" : "sell";
   string time_str = TimeToString(time, TIME_DATE|TIME_SECONDS);
   // Formato ISO 8601
   StringReplace(time_str, ".", "-");
   StringReplace(time_str, " ", "T");
   time_str += "Z";

   string json = "{"
      + "\"ticket\":" + IntegerToString(ticket) + ","
      + "\"direction\":\"" + direction + "\","
      + "\"symbol\":\"" + symbol + "\","
      + "\"lot_size\":" + DoubleToString(volume, 2) + ","
      + "\"close_price\":" + DoubleToString(price, 5) + ","
      + "\"profit_usd\":" + DoubleToString(profit, 5) + ","
      + "\"commission_usd\":" + DoubleToString(commission, 5) + ","
      + "\"swap_usd\":" + DoubleToString(swap, 5) + ","
      + "\"closed_at\":\"" + time_str + "\","
      + "\"magic_number\":" + IntegerToString(magic)
      + "}";

   return json;
}

//+------------------------------------------------------------------+
bool SendHistoryBatch(string trades_json, int batch_index)
{
   string url = API_BASE_URL + "/marketplace/bots/" + BOT_ID + "/history";

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   string body = "{"
      + "\"bot_id\":\"" + BOT_ID + "\","
      + "\"batch_index\":" + IntegerToString(batch_index) + ","
      + "\"initial_balance\":" + DoubleToString(balance, 2) + ","
      + "\"trades\":" + trades_json
      + "}";

   string headers = "Content-Type: application/json\r\nX-API-Key: " + API_KEY;
   char   post_data[];
   StringToCharArray(body, post_data, 0, StringLen(body));
   char   result_data[];
   string result_headers;

   int res = WebRequest("POST", url, headers, 30000, post_data, result_data, result_headers);

   if(res == 200 || res == 201) {
      Print("ForexBot Bridge: Batch ", batch_index, " uploaded successfully");
      return true;
   }

   string response = CharArrayToString(result_data);
   Print("ForexBot Bridge: Batch ", batch_index, " upload failed. HTTP: ", res, " Response: ", response);
   return false;
}

//+------------------------------------------------------------------+
// Hardware ID para protección de licencia por cuenta
string GetHwidHash()
{
   // Combinar identificadores únicos de la instalación MT5
   string raw = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))
              + AccountInfoString(ACCOUNT_SERVER)
              + IntegerToString(TerminalInfoInteger(TERMINAL_BUILD));
   // MQL5 no tiene SHA256 nativo — enviar raw y hashear en el servidor
   return raw;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("ForexBot Bridge deinitialized. Reason: ", reason);
}

// OnTick vacío — este EA no hace trading, solo reporta
void OnTick() {}
