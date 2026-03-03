\# ForexBot EA — Installation Guide



\## Requirements

\- MetaTrader 5 (build 2755+)

\- Active license from forexbot.io/dashboard



\## Installation

1\. Copy `ForexBotEA.ex5` to: `MT5\_DATA\_FOLDER/MQL5/Experts/ForexBot/`

2\. Restart MetaTrader 5

3\. Drag EA onto any chart

4\. In settings, enter your \*\*License Key\*\* from the dashboard

5\. Enable \*\*Allow WebRequests\*\* in Tools > Options > Expert Advisors

6\. Add to allowed URLs: `http://localhost:3001` (or your production API URL)



\## Settings

| Parameter | Description |

|-----------|-------------|

| LicenseKey | Your license key from dashboard |

| ApiUrl | ForexBot API endpoint |

| ValidationInterval | How often to validate license (seconds) |

| StopOnInvalidLicense | Stop trading if license invalid |

| LotSize | Trading lot size |

| TakeProfit | Take profit in pips |

| StopLoss | Stop loss in pips |



\## License Validation Flow

1\. EA starts → validates license with API

2\. Every `ValidationInterval` seconds → revalidates

3\. If license invalid → trading stops, alert shown

4\. If API unreachable → uses cached status for 3x interval

