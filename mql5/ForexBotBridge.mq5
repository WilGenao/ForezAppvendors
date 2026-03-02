//+------------------------------------------------------------------+
//|  ForexBot Marketplace - EA Bridge                                |
//|  Conecta el EA con la plataforma para:                           |
//|  1. Validar licencia al inicio y periódicamente                  |
//|  2. Subir historial de trades al Analytics Engine               |
//|                                                                  |
//|  NOTAS SOBRE LIMITACIONES DE MQL5 PARA HTTP:                    |
//|  - MQL5 no tiene async/await. Todo HTTP es bloqueante.           |
//|  - WebRequest() requiere que el URL esté en la lista blanca      |
//|    de Tools → Options → Expert Advisors → Allow WebRequest       |
//|  - Máximo 1 request a la vez — no podemos paralelizar            |
//|  - Timeout máximo recomendado: 5000ms para no congelar el chart  |
//|  - En MQL4: usar la misma función WebRequest() pero sin          |
//|    soporte nativo de JSON — usar StringFormat para construir JSON |
//+------------------------------------------------------------------+

#property copyright "ForexBot Marketplace"
#property version   "1.0"
#property strict

//--- Parámetros configurables por el usuario en el panel del EA
input string ApiKey = "";              // Tu API Key del Marketplace
input string LicenseKey = "";          // Tu License Key del Marketplace
input string ApiBaseUrl = "https://api.forexbot.example.com/api/v1"; // URL de la API
input int    LicenseCheckIntervalHours = 4;  // Validar licencia cada X horas
input int    HistoryUploadBatchSize = 500;   // Trades por batch de subida
input bool   DebugMode = false;              // Activar logs detallados

//--- Variables globales de estado
datetime g_lastLicenseCheck = 0;
bool     g_licenseValid = false;
string   g_accountNumber = "";

//+------------------------------------------------------------------+
//| Función principal de inicialización del EA                       |
//+------------------------------------------------------------------+
int OnInit()
{
   g_accountNumber = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

   Print("[ForexBot Bridge] Iniciando validación de licencia...");
   Print("[ForexBot Bridge] Cuenta: ", g_accountNumber, " | Broker: ", AccountInfoString(ACCOUNT_COMPANY));

   //--- Validar licencia antes de que el EA empiece a operar
   if(!ValidateLicense())
   {
      Print("[ForexBot Bridge] ERROR: Licencia inválida. El EA no puede operar.");
      return INIT_FAILED;
   }

   Print("[ForexBot Bridge] Licencia validada correctamente.");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Tick handler - validación periódica                              |
//+------------------------------------------------------------------+
void OnTick()
{
   //--- Revalidar licencia cada LicenseCheckIntervalHours
   //--- Usamos datetime para calcular diferencia en segundos
   if(TimeCurrent() - g_lastLicenseCheck > LicenseCheckIntervalHours * 3600)
   {
      if(!ValidateLicense())
      {
         Print("[ForexBot Bridge] Licencia expirada o revocada. Deteniendo operaciones.");
         g_licenseValid = false;
         //--- Aquí el EA debe implementar su lógica de parada segura
         //--- (cerrar posiciones abiertas, cancelar ordenes pendientes, etc.)
         return;
      }
   }

   if(!g_licenseValid)
   {
      return; //--- No operar sin licencia válida
   }

   //--- Tu lógica de trading aquí...
   //--- El EA Bridge NO implementa la estrategia, solo la infraestructura
}

//+------------------------------------------------------------------+
//| Validar licencia contra el API del Marketplace                   |
//+------------------------------------------------------------------+
bool ValidateLicense()
{
   if(ApiKey == "" || LicenseKey == "")
   {
      Print("[ForexBot Bridge] ERROR: ApiKey y LicenseKey son obligatorios.");
      return false;
   }

   string brokerName = AccountInfoString(ACCOUNT_COMPANY);
   
   //--- Construir payload JSON manualmente (MQL5 no tiene librería JSON nativa)
   string jsonBody = StringFormat(
      "{\"licenseKey\":\"%s\",\"accountNumber\":\"%s\",\"brokerName\":\"%s\"}",
      LicenseKey,
      g_accountNumber,
      EscapeJsonString(brokerName)
   );

   string responseStr;
   int statusCode = SendPostRequest(
      ApiBaseUrl + "/licensing/validate",
      jsonBody,
      responseStr,
      3000 // timeout 3 segundos — más corto que el tick para no congelar
   );

   if(statusCode != 200)
   {
      if(DebugMode)
         Print("[ForexBot Bridge] Validación falló. Status: ", statusCode, " | Response: ", responseStr);
      
      //--- Si hay error de red (0) — ser tolerante, podría ser temporal
      if(statusCode == 0)
      {
         Print("[ForexBot Bridge] Error de red al validar licencia. Reintentando en próximo ciclo.");
         //--- En caso de error de red, mantener estado anterior (tolerancia a fallas temporales)
         return g_licenseValid; // mantener estado previo
      }
      
      return false;
   }

   //--- Parse básico de la respuesta para extraer "valid"
   //--- MQL4 nota: usar StringFind() en lugar de json parsing
   if(StringFind(responseStr, "\"valid\":true") >= 0)
   {
      g_lastLicenseCheck = TimeCurrent();
      g_licenseValid = true;
      return true;
   }

   if(DebugMode)
      Print("[ForexBot Bridge] Licencia no válida según respuesta: ", responseStr);
   
   return false;
}

//+------------------------------------------------------------------+
//| Subir historial de trades al Analytics Engine                    |
//| Llamar desde OnDeinit() o manualmente desde botón en panel       |
//+------------------------------------------------------------------+
bool UploadTradeHistory()
{
   int totalHistory = HistoryDealsTotal();
   if(totalHistory == 0)
   {
      Print("[ForexBot Bridge] No hay historial para subir.");
      return true;
   }

   Print("[ForexBot Bridge] Subiendo historial: ", totalHistory, " operaciones...");

   int batchStart = 0;
   int batchNum = 0;
   
   while(batchStart < totalHistory)
   {
      int batchEnd = MathMin(batchStart + HistoryUploadBatchSize, totalHistory);
      
      string tradesJson = BuildTradesBatch(batchStart, batchEnd);
      
      if(tradesJson == "")
      {
         batchStart = batchEnd;
         continue;
      }

      double initialBalance = AccountInfoDouble(ACCOUNT_BALANCE) - GetNetProfit(batchStart, batchEnd);
      
      string jsonBody = StringFormat(
         "{\"bot_id\":\"pending\",\"initial_balance\":%.2f,\"trades\":[%s]}",
         MathMax(initialBalance, 1.0),
         tradesJson
      );

      string responseStr;
      int statusCode = SendPostRequest(
         // Nota: este endpoint va al Analytics Engine directamente o via Core API
         // En producción, usar el Core API como proxy (que tiene autenticación)
         ApiBaseUrl + "/bots/upload-history",
         jsonBody,
         responseStr,
         30000 // 30 segundos para batches grandes
      );

      if(statusCode != 200 && statusCode != 201)
      {
         Print("[ForexBot Bridge] Error subiendo batch ", batchNum, ": ", statusCode);
         Print("[ForexBot Bridge] Response: ", responseStr);
         return false;
      }

      batchNum++;
      if(DebugMode)
         Print("[ForexBot Bridge] Batch ", batchNum, " subido. Trades ", batchStart, "-", batchEnd);
      
      batchStart = batchEnd;
      
      //--- Pausa entre batches para no sobrecargar el servidor
      Sleep(500);
   }

   Print("[ForexBot Bridge] Historial subido en ", batchNum, " batches.");
   return true;
}

//+------------------------------------------------------------------+
//| Construir JSON de un batch de trades                             |
//+------------------------------------------------------------------+
string BuildTradesBatch(int startIdx, int endIdx)
{
   string tradesArray = "";
   bool first = true;
   
   if(!HistorySelect(0, TimeCurrent()))
   {
      Print("[ForexBot Bridge] Error al seleccionar historial.");
      return "";
   }

   for(int i = startIdx; i < endIdx; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      //--- Solo trades de entrada/salida (no depósitos, comisiones, etc.)
      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      //--- Solo trades cerrados (DEAL_ENTRY_OUT)
      ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_INOUT) continue;

      string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      double lots = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
      datetime dealTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      string direction = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";

      //--- Formatear datetime como ISO 8601
      string timeStr = FormatDateTime(dealTime);

      string tradeJson = StringFormat(
         "{\"external_trade_id\":\"%I64u\",\"direction\":\"%s\",\"symbol\":\"%s\","
         "\"lot_size\":%.2f,\"close_price\":%.5f,\"profit_usd\":%.2f,"
         "\"commission_usd\":%.2f,\"swap_usd\":%.2f,\"closed_at\":\"%s\","
         "\"opened_at\":\"%s\"}",
         ticket, direction, symbol,
         lots, price, profit,
         commission, swap, timeStr, timeStr // opened_at aproximado si no disponible
      );

      if(!first) tradesArray += ",";
      tradesArray += tradeJson;
      first = false;
   }

   return tradesArray;
}

//+------------------------------------------------------------------+
//| Enviar HTTP POST request                                         |
//| LIMITACIÓN MQL5: WebRequest() es bloqueante.                     |
//| Esto congela el chart mientras espera respuesta.                 |
//| Solución: usar timeouts cortos y manejar errores de red           |
//| graciosamente (no fallar el EA por un error de API).             |
//+------------------------------------------------------------------+
int SendPostRequest(string url, string body, string &response, int timeout = 5000)
{
   char   postData[];
   char   resultData[];
   string resultHeaders;

   StringToCharArray(body, postData, 0, StringLen(body), CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1); // Remover null terminator

   string headers = "Content-Type: application/json\r\n" +
                    "x-api-key: " + ApiKey + "\r\n";

   ResetLastError();
   int statusCode = WebRequest(
      "POST",
      url,
      headers,
      timeout,
      postData,
      resultData,
      resultHeaders
   );

   if(statusCode == -1)
   {
      int error = GetLastError();
      if(DebugMode)
         Print("[ForexBot Bridge] WebRequest error: ", error, " | URL: ", url);
      return 0; // Indicamos error de red con 0
   }

   response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
   return statusCode;
}

//+------------------------------------------------------------------+
//| Helpers                                                          |
//+------------------------------------------------------------------+

string FormatDateTime(datetime dt)
{
   MqlDateTime mdt;
   TimeToStruct(dt, mdt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
      mdt.year, mdt.mon, mdt.day,
      mdt.hour, mdt.min, mdt.sec);
}

string EscapeJsonString(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\n", "\\n");
   StringReplace(s, "\r", "\\r");
   return s;
}

double GetNetProfit(int startIdx, int endIdx)
{
   double total = 0;
   for(int i = startIdx; i < endIdx; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0)
         total += HistoryDealGetDouble(ticket, DEAL_PROFIT);
   }
   return total;
}

void OnDeinit(const int reason)
{
   //--- Subir historial al salir (opcional — puede ser costoso en tiempo)
   //--- Descomentar si se quiere subida automática al remover el EA
   // UploadTradeHistory();
   Print("[ForexBot Bridge] EA detenido. Razón: ", reason);
}

/*
//+------------------------------------------------------------------+
//| DIFERENCIAS MQL4 vs MQL5                                        |
//+------------------------------------------------------------------+

MQL4 notas de adaptación:
1. HistoryDealsTotal() → OrdersHistoryTotal()
2. HistoryDealGetTicket() → OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)
3. HistoryDealGetDouble(ticket, DEAL_PROFIT) → OrderProfit()
4. HistoryDealGetString(ticket, DEAL_SYMBOL) → OrderSymbol()
5. AccountInfoInteger(ACCOUNT_LOGIN) → AccountNumber()
6. AccountInfoDouble(ACCOUNT_BALANCE) → AccountBalance()
7. ENUM_DEAL_TYPE no existe — usar OrderType() == OP_BUY / OP_SELL
8. WebRequest() existe en MQL4 también desde build 600+
   pero requiere misma configuración de lista blanca

Estructura de OnTick() es idéntica en MQL4.
*/
