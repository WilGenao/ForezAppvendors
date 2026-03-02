# Arquitectura de Comunicación entre Servicios

## Diagrama General del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTES                                    │
├──────────────┬──────────────────────┬────────────────────────────────┤
│  Next.js App │  MT4/5 EA (MQL5/4)   │  Admin Panel                  │
│  (Browser)   │  (Windows/VPS)        │  (Browser)                    │
└──────┬───────┴──────────┬───────────┴────────────────┬──────────────┘
       │                  │                             │
       │ HTTPS            │ HTTPS                       │ HTTPS
       ▼                  ▼                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    NestJS Core API (:3001)                            │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │   Auth   │  │ Market   │  │  Payments │  │    Licensing       │  │
│  │  Module  │  │  place   │  │  Module   │  │    Module          │  │
│  └──────────┘  └──────────┘  └───────────┘  └────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐                          │
│  │  Users   │  │   KYC    │  │  Reviews  │                          │
│  │  Module  │  │  Module  │  │  Module   │                          │
│  └──────────┘  └──────────┘  └───────────┘                          │
└─────────────────────┬──────────────────────────────────────────────-─┘
                      │ REST HTTP (interno)
                      │ + Redis Cache
                      ▼
┌─────────────────────────────────────┐
│   Python FastAPI Analytics (:8000)   │
│  ┌────────────┐  ┌────────────────┐  │
│  │  /analyze  │  │  /detect-      │  │
│  │  /snapshot │  │  anomalies     │  │
│  └────────────┘  └────────────────┘  │
└─────────────────────────────────────┘
           │                │
           ▼                ▼
    ┌──────────┐     ┌──────────┐
    │PostgreSQL│     │  Redis   │
    │  :5432   │     │  :6379   │
    └──────────┘     └──────────┘
           │
           ▼
    ┌──────────────┐
    │Azure Blob    │
    │Storage       │
    └──────────────┘
```

---

## FLUJO 1: Comprador adquiere suscripción a un bot

```
Buyer Browser          NestJS API           Stripe          Analytics       PostgreSQL       Redis
     │                     │                  │                 │               │               │
     │ POST /payments/      │                  │                 │               │               │
     │ create-checkout      │                  │                 │               │               │
     │─────────────────────>│                  │                 │               │               │
     │                      │ Validar JWT      │                 │               │               │
     │                      │ Validar listing  │                 │               │               │
     │                      │─────────────────────────────────────────────────>│               │
     │                      │ SELECT bot_listing WHERE id=$1 AND status='published'             │
     │                      │<─────────────────────────────────────────────────│               │
     │                      │                  │                 │               │               │
     │                      │ Stripe: crear    │                 │               │               │
     │                      │ Checkout Session │                 │               │               │
     │                      │─────────────────>│                 │               │               │
     │                      │<─────────────────│                 │               │               │
     │                      │ {url: checkout.stripe.com/...}     │               │               │
     │<─────────────────────│                  │                 │               │               │
     │                      │                  │                 │               │               │
     │ [Usuario paga en Stripe]                │                 │               │               │
     │                      │                  │                 │               │               │
     │                      │<─────────────────│                 │               │               │
     │                      │ Webhook: checkout.session.completed                │               │
     │                      │                  │                 │               │               │
     │                      │ INSERT stripe_events (idempotencia)│               │               │
     │                      │─────────────────────────────────────────────────>│               │
     │                      │                  │                 │               │               │
     │                      │ BEGIN TRANSACTION│                 │               │               │
     │                      │ INSERT subscriptions               │               │               │
     │                      │ INSERT payments                    │               │               │
     │                      │ INSERT licenses + generar license_key               │               │
     │                      │ UPDATE bot_listings.licenses_sold  │               │               │
     │                      │─────────────────────────────────────────────────>│               │
     │                      │ COMMIT           │                 │               │               │
     │                      │                  │                 │               │               │
     │                      │ Cachear licencia en Redis (TTL 24h)│               │               │
     │                      │─────────────────────────────────────────────────────────────────>│
     │                      │                  │                 │               │               │
     │                      │ Email: "Tu licencia está lista"    │               │               │
     │                      │                  │                 │               │               │

PUNTOS DE FALLA Y PLAN:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Fallo                     │ Qué pasa                    │ Solución              │
├───────────────────────────┼─────────────────────────────┼───────────────────────┤
│ Webhook llega 2 veces     │ INSERT stripe_events falla  │ UNIQUE en stripe_event│
│                           │ por UNIQUE constraint       │ _id, retornar 200 OK  │
├───────────────────────────┼─────────────────────────────┼───────────────────────┤
│ DB cae durante INSERT      │ Transaction rollback        │ Stripe reintenta el   │
│ subscriptions             │ automático. Stripe reintenta│ webhook hasta 72h     │
├───────────────────────────┼─────────────────────────────┼───────────────────────┤
│ Redis cae                 │ Licencia no cacheada        │ EA hace fallback a DB │
│                           │                             │ directo (más lento)   │
├───────────────────────────┼─────────────────────────────┼───────────────────────┤
│ Email falla               │ El usuario no recibe email  │ Job de retry en DB    │
│                           │                             │ tabla email_queue     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## FLUJO 2: Vendedor sube historial Forex para verificación

```
Seller Browser         NestJS API           PostgreSQL       Redis        Analytics Engine
     │                     │                    │               │               │
     │ POST /analytics/     │                    │               │               │
     │ upload-history       │                    │               │               │
     │ (multipart CSV/JSON) │                    │               │               │
     │─────────────────────>│                    │               │               │
     │                      │ Validar JWT        │               │               │
     │                      │ Validar KYC status │               │               │
     │                      │───────────────────>│               │               │
     │                      │                    │               │               │
     │                      │ INSERT verification_job (status=pending)           │
     │                      │ INSERT trade_history (raw, sin procesar)           │
     │                      │───────────────────>│               │               │
     │                      │                    │               │               │
     │ {jobId: "uuid",       │                    │               │               │
     │  status: "processing"}│                   │               │               │
     │<─────────────────────│                    │               │               │
     │                      │                    │               │               │
     │ [Frontend polling cada 3s a GET /jobs/:id]│               │               │
     │                      │                    │               │               │
     │                      │─────────────────────────────────────────────────>│
     │                      │ POST /analyze {bot_id, job_id, trades: [...]}      │
     │                      │                    │               │               │
     │                      │                    │               │               │
     │                      │                    │               │               Analytics
     │                      │                    │               │               procesa:
     │                      │                    │               │               - Sharpe
     │                      │                    │               │               - Drawdown
     │                      │                    │               │               - Anomalías
     │                      │                    │               │               - etc.
     │                      │                    │               │               │
     │                      │<─────────────────────────────────────────────────│
     │                      │ {metrics: {...}, anomalies: [...], status: "ok"}   │
     │                      │                    │               │               │
     │                      │ BEGIN TRANSACTION  │               │               │
     │                      │ UPDATE verification_job.status = 'completed'      │
     │                      │ INSERT performance_snapshots                       │
     │                      │ INSERT anomaly_flags (si hay)                      │
     │                      │ UPDATE bots.cached_* (métricas desnorm.)           │
     │                      │ UPDATE bots.is_verified = TRUE (si no hay críticos)│
     │                      │───────────────────>│               │               │
     │                      │ COMMIT             │               │               │
     │                      │                    │               │               │
     │                      │ Cachear métricas en Redis (TTL 1h)│               │
     │                      │─────────────────────────────────>│               │
     │                      │                    │               │               │
     │ GET /jobs/:id → status: "completed"       │               │               │
     │<─────────────────────│                    │               │               │

PUNTOS DE FALLA Y PLAN:
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Fallo                        │ Qué pasa                │ Solución                  │
├──────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ Analytics Engine cae durante │ HTTP timeout en API     │ Job queda en 'processing' │
│ el procesamiento             │                         │ Cron job retries cada 5m  │
│                              │                         │ hasta 3 intentos          │
├──────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ Trade history muy grande     │ Request timeout         │ Paginar trades en lotes   │
│ (>50k trades)                │                         │ de 5000, streaming        │
├──────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ Analytics devuelve anomalía  │ Bot NO se verifica      │ Flag visible en admin y   │
│ crítica                      │ automáticamente         │ en panel del seller       │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## FLUJO 3: EA en MT4/5 valida licencia en tiempo real

```
MT4/5 EA               NestJS API                Redis           PostgreSQL
(Windows/VPS)         LicensingModule              │               │
     │                     │                        │               │
     │ POST /licenses/      │                        │               │
     │ validate             │                        │               │
     │ {apiKey, licenseKey, │                        │               │
     │  mtAccountId,        │                        │               │
     │  platform: "MT5"}    │                        │               │
     │─────────────────────>│                        │               │
     │                      │ Rate limit check       │               │
     │                      │ (API key → max 1 req/5min per license) │
     │                      │──────────────────────>│               │
     │                      │                        │               │
     │                      │ [SI está en caché]     │               │
     │                      │ GET license:{key}      │               │
     │                      │──────────────────────>│               │
     │                      │<──────────────────────│               │
     │                      │ {valid: true, expiresAt: ...}          │
     │                      │                        │               │
     │                      │ [SI NO está en caché]  │               │
     │                      │                        │ SELECT licenses│
     │                      │                        │ JOIN subscriptions│
     │                      │──────────────────────────────────────>│
     │                      │<──────────────────────────────────────│
     │                      │ Cachear en Redis (TTL 1h)              │
     │                      │──────────────────────>│               │
     │                      │                        │               │
     │                      │ INSERT license_validations (async, no bloquea)    │
     │                      │                        │               │
     │<─────────────────────│                        │               │
     │ {valid: true/false,   │                        │               │
     │  message: "...",      │                        │               │
     │  expiresAt: "..."}    │                        │               │

CONSIDERACIONES CRÍTICAS DE PERFORMANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Este endpoint puede recibir llamadas en cada tick del EA.
   MT5 puede generar 100+ ticks por segundo en pares activos.

2. SOLUCIÓN: EA valida al inicio y luego cada 4 horas máximo.
   Además, rate limit estricto en API: 1 validación por licencia
   cada 5 minutos. Respuestas cacheadas en Redis 1 hora.

3. Target de latencia: p95 < 50ms con Redis hit.
   Sin Redis: p95 < 200ms.

4. Si la validación falla por error de red, el EA SIGUE funcionando
   hasta 24h (diseño del EA). No interrumpimos operaciones activas.

PUNTOS DE FALLA Y PLAN:
┌──────────────────────────────────────────────────────────────────────────────┐
│ Fallo              │ Qué pasa                     │ Solución                 │
├────────────────────┼──────────────────────────────┼──────────────────────────┤
│ API caída          │ EA no puede validar           │ EA tiene modo offline:   │
│                    │                               │ sigue 24h, luego para    │
├────────────────────┼──────────────────────────────┼──────────────────────────┤
│ Redis caído        │ Fallback a PostgreSQL         │ ConnectionError → DB     │
│                    │ directo, más lento            │ con timeout de 2s        │
├────────────────────┼──────────────────────────────┼──────────────────────────┤
│ Abuso del endpoint │ Rate limit activo             │ 429 Too Many Requests    │
│ (bot malicioso)    │                               │ + log + alerta admin     │
└──────────────────────────────────────────────────────────────────────────────┘
```
