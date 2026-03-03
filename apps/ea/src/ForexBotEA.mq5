//+------------------------------------------------------------------+
//|  ForexBot Marketplace — Licensed Expert Advisor                  |
//|  Connects to ForexBot API for license validation                 |
//+------------------------------------------------------------------+
#property copyright "ForexBot Marketplace"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

//--- Input parameters
input string   LicenseKey       = "";           // License Key (from dashboard)
input string   ApiUrl           = "http://localhost:3001/api/v1"; // API URL
input int      ValidationInterval = 3600;       // Validate every N seconds
input bool     StopOnInvalidLicense = true;     // Stop trading if license invalid
input double   LotSize          = 0.01;         // Lot size
input int      TakeProfit       = 50;           // Take Profit (pips)
input int      StopLoss         = 30;           // Stop Loss (pips)
input int      MagicNumber      = 123456;       // Magic number

//--- Global variables
CTrade         trade;
bool           licenseValid     = false;
datetime       lastValidation   = 0;
string         licenseStatus    = "PENDING";
int            accountId;

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   accountId = (int)AccountInfoInteger(ACCOUNT_LOGIN);
   trade.SetMagicNumber(MagicNumber);
   
   Print("ForexBot EA v1.0 — Initializing...");
   Print("Account: ", accountId);
   Print("License Key: ", StringLen(LicenseKey) > 0 ? StringSubstr(LicenseKey, 0, 8) + "..." : "NOT SET");
   
   if(StringLen(LicenseKey) == 0) {
      Alert("ERROR: No license key set. Please enter your license key in EA settings.");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   // Validate license on startup
   if(!ValidateLicense()) {
      if(StopOnInvalidLicense) {
         Alert("LICENSE INVALID: EA will not trade. Check your license at forexbot.io/dashboard");
         return INIT_FAILED;
      }
   }
   
   // Set timer for periodic validation
   EventSetTimer(ValidationInterval);
   
   Print("ForexBot EA initialized successfully.");
   Print("License status: ", licenseStatus);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("ForexBot EA stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Timer — periodic license validation                              |
//+------------------------------------------------------------------+
void OnTimer()
{
   ValidateLicense();
}

//+------------------------------------------------------------------+
//| Main tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
   // Check license validity
   if(!licenseValid) {
      Comment("⚠ FOREXBOT: License invalid — trading suspended\nStatus: ", licenseStatus, "\nVisit: dashboard.forexbot.io");
      return;
   }
   
   // Show license info on chart
   Comment(
      "✓ FOREXBOT LICENSED\n",
      "Status: ", licenseStatus, "\n",
      "Account: ", accountId, "\n",
      "Last check: ", TimeToString(lastValidation, TIME_DATE|TIME_SECONDS)
   );
   
   // -------------------------------------------------------
   // YOUR TRADING LOGIC GOES HERE
   // This is where you implement the actual strategy
   // -------------------------------------------------------
   RunStrategy();
}

//+------------------------------------------------------------------+
//| License validation via HTTP                                      |
//+------------------------------------------------------------------+
bool ValidateLicense()
{
   string url      = ApiUrl + "/licensing/validate";
   string headers  = "Content-Type: application/json\r\n";
   string platform = "MT5";
   
   // Build JSON body
   string body = StringFormat(
      "{\"licenseKey\":\"%s\",\"mtAccountId\":\"%d\",\"mtPlatform\":\"%s\",\"hwidHash\":\"%s\"}",
      LicenseKey,
      accountId,
      platform,
      GetHWID()
   );
   
   char   postData[];
   char   result[];
   string resultHeaders;
   
   StringToCharArray(body, postData, 0, StringLen(body));
   ArrayResize(postData, StringLen(body));
   
   int res = WebRequest(
      "POST",
      url,
      headers,
      5000,
      postData,
      result,
      resultHeaders
   );
   
   if(res == -1) {
      int err = GetLastError();
      Print("WebRequest failed. Error: ", err, ". Make sure URL is whitelisted in Tools > Options > Expert Advisors");
      
      // Allow trading if can't reach server (offline tolerance)
      if(TimeCurrent() - lastValidation < ValidationInterval * 3) {
         Print("Using cached license status: ", licenseStatus);
         return licenseValid;
      }
      licenseStatus = "UNREACHABLE";
      licenseValid  = false;
      return false;
   }
   
   string response = CharArrayToString(result);
   Print("License validation response: ", response);
   
   // Parse response
   if(StringFind(response, "\"isValid\":true") >= 0) {
      licenseValid   = true;
      licenseStatus  = "ACTIVE";
      lastValidation = TimeCurrent();
      Print("License VALID — trading enabled");
      return true;
   }
   else {
      licenseValid  = false;
      lastValidation = TimeCurrent();
      
      if(StringFind(response, "EXPIRED") >= 0)       licenseStatus = "EXPIRED";
      else if(StringFind(response, "REVOKED") >= 0)  licenseStatus = "REVOKED";
      else if(StringFind(response, "SUSPENDED") >= 0) licenseStatus = "SUSPENDED";
      else                                            licenseStatus = "INVALID";
      
      Print("License INVALID — status: ", licenseStatus);
      return false;
   }
}

//+------------------------------------------------------------------+
//| Generate hardware ID hash                                        |
//+------------------------------------------------------------------+
string GetHWID()
{
   string hwid = StringFormat("%d_%s_%s",
      accountId,
      AccountInfoString(ACCOUNT_SERVER),
      AccountInfoString(ACCOUNT_COMPANY)
   );
   return hwid;
}

//+------------------------------------------------------------------+
//| Example strategy — replace with real logic                       |
//+------------------------------------------------------------------+
void RunStrategy()
{
   // Skip if we already have an open position
   if(PositionsTotal() > 0) return;
   
   double point  = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double ask    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   int    digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   
   // Simple example: Moving average crossover
   double ma_fast[], ma_slow[];
   ArraySetAsSeries(ma_fast, true);
   ArraySetAsSeries(ma_slow, true);
   
   int handle_fast = iMA(_Symbol, PERIOD_H1, 10, 0, MODE_EMA, PRICE_CLOSE);
   int handle_slow = iMA(_Symbol, PERIOD_H1, 50, 0, MODE_EMA, PRICE_CLOSE);
   
   if(handle_fast == INVALID_HANDLE || handle_slow == INVALID_HANDLE) return;
   
   CopyBuffer(handle_fast, 0, 0, 3, ma_fast);
   CopyBuffer(handle_slow, 0, 0, 3, ma_slow);
   
   IndicatorRelease(handle_fast);
   IndicatorRelease(handle_slow);
   
   double tp_points = TakeProfit * point * 10;
   double sl_points = StopLoss  * point * 10;
   
   // Bullish crossover — BUY
   if(ma_fast[1] < ma_slow[1] && ma_fast[0] > ma_slow[0]) {
      double sl = NormalizeDouble(bid - sl_points, digits);
      double tp = NormalizeDouble(ask + tp_points, digits);
      trade.Buy(LotSize, _Symbol, ask, sl, tp, "ForexBot EA");
      SendTradeToAnalytics("BUY", ask, sl, tp);
   }
   
   // Bearish crossover — SELL
   if(ma_fast[1] > ma_slow[1] && ma_fast[0] < ma_slow[0]) {
      double sl = NormalizeDouble(ask + sl_points, digits);
      double tp = NormalizeDouble(bid - tp_points, digits);
      trade.Sell(LotSize, _Symbol, bid, sl, tp, "ForexBot EA");
      SendTradeToAnalytics("SELL", bid, sl, tp);
   }
}

//+------------------------------------------------------------------+
//| Send trade data to Analytics Engine                              |
//+------------------------------------------------------------------+
void SendTradeToAnalytics(string direction, double price, double sl, double tp)
{
   string url     = ApiUrl + "/analytics/trade";
   string headers = "Content-Type: application/json\r\nAuthorization: License " + LicenseKey + "\r\n";
   
   string body = StringFormat(
      "{\"direction\":\"%s\",\"symbol\":\"%s\",\"price\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,\"accountId\":%d,\"timestamp\":\"%s\"}",
      direction, _Symbol, price, sl, tp, accountId,
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
   );
   
   char postData[];
   char result[];
   string resultHeaders;
   StringToCharArray(body, postData, 0, StringLen(body));
   ArrayResize(postData, StringLen(body));
   
   WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
}
//+------------------------------------------------------------------+