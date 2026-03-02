# ForexBot Marketplace

> Plataforma tecnológica intermediaria entre desarrolladores de bots de Forex y traders.
> **No somos asesores financieros. No ofrecemos copy trading ni gestión de capital.**

---

## Stack

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | Next.js 14 (App Router) | SSR para SEO del marketplace |
| Core API | NestJS + TypeORM | Estructura para equipos junior/mid |
| Analytics | Python + FastAPI | Ecosistema científico (NumPy) |
| DB | PostgreSQL 15 | ACID, JOINs, índices parciales |
| Cache | Redis 7 | Rate limiting + cache de licencias |
| Pagos | Stripe Connect | Marketplace payments nativo |
| Storage | Azure Blob | KYC documents (intercambiable) |
| Infra | Railway + Docker | Migración limpia a AWS/GCP |

## Inicio rápido

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/analytics/.env.example apps/analytics/.env

# Completar secretos en los .env:
# - POSTGRES_PASSWORD
# - REDIS_PASSWORD
# - JWT_ACCESS_SECRET (openssl rand -hex 64)
# - JWT_REFRESH_SECRET (openssl rand -hex 64)
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET

docker-compose up -d
```

API: http://localhost:3001/api/docs
Analytics: http://localhost:8000/docs
Frontend: http://localhost:3000

## Flujos de comunicación críticos

### 1. Comprador adquiere suscripción
```
Browser → POST /api/v1/payments/checkout
  → Stripe Checkout Session (redirect)
  → Stripe → POST /api/v1/payments/webhooks/stripe
  → NestJS: idempotency check en stripe_events
  → INSERT subscriptions + licenses + payments (transaction)
  → License generada y disponible
```

### 2. Seller sube historial Forex
```
EA (MT4/5) → POST /api/v1/marketplace/bots/:id/history (X-API-Key)
  → NestJS valida API key → INSERT trade_history
  → NestJS → POST http://analytics:8000/analyze (interno)
  → Analytics calcula métricas + detecta anomalías
  → NestJS → UPSERT performance_snapshots + anomaly_flags
  → Cache invalidado en Redis
```

### 3. Bot MT valida licencia en tiempo real
```
EA (MT4/5) → POST /api/v1/licensing/validate (cada N horas)
  → Rate limit check en Redis (max 10/min por licenseKey)
  → Cache check en Redis (TTL 5min)
  → Si no hay cache → query PostgreSQL
  → Resultado cacheado → Respuesta <50ms
  → Log async en license_validations (no bloquea)
```

## Estructura del proyecto

```
forexbot-marketplace/
├── apps/
│   ├── api/                    # NestJS Core API
│   │   └── src/
│   │       ├── auth/           # JWT + 2FA + API Keys
│   │       ├── users/
│   │       ├── kyc/
│   │       ├── marketplace/    # Bots CRUD + listings
│   │       ├── payments/       # Stripe + webhooks
│   │       ├── licensing/      # Hot path MT4/5
│   │       ├── reviews/
│   │       └── common/         # Filters, interceptors, decorators
│   ├── analytics/              # Python + FastAPI
│   │   └── app/
│   │       ├── routes/         # analyze, metrics, snapshots, anomalies
│   │       ├── services/       # metrics_calculator, anomaly_detector
│   │       └── models/         # Trade, MetricsResult, AnomalyReport
│   ├── ea/                     # MQL5 Bridge EA
│   └── frontend/               # Next.js
├── infrastructure/
│   └── database/
│       └── schema.sql          # Schema completo con índices
├── docker-compose.yml
└── .env.example
```

## Indicadores para migrar de Railway a AWS

1. RAM > 8GB en cualquier servicio → ECS Fargate
2. Compliance/GDPR requiere VPC isolation
3. Costo mensual > $2,000
4. Necesitas multi-región para latencia de validación de licencias

Diseño actual es container-first: Railway → AWS es cambiar `railway.toml` por `task-definition.json`.

## Métricas calculadas

- Sharpe Ratio (anualizado, RF configurable)
- Sortino Ratio
- Max Drawdown (absoluto y porcentual)
- Profit Factor
- Win Rate
- Expectancy por trade
- Average RRR
- Recovery Factor
- Calmar Ratio

## Anomalías detectadas

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| martingale_detected | CRITICAL | Posiciones > 2x después de pérdida |
| excessive_risk_per_trade | WARNING/CRITICAL | > 5% del capital en un trade |
| manipulated_equity_curve | CRITICAL | Curva sin drawdown real |
| insufficient_trade_history | WARNING/CRITICAL | < 100 trades |
| suspicious_overfitting | WARNING | Varianza > 40% entre períodos |
| no_stop_loss | WARNING | > 80% trades sin SL |
| zero_losses_detected | CRITICAL | Nunca pierde |

---

**DESCARGO DE RESPONSABILIDAD**: ForexBot Marketplace es un intermediario tecnológico.
Las métricas mostradas son datos históricos de rendimiento y NO constituyen asesoramiento
financiero ni garantía de rendimiento futuro. El trading de divisas conlleva riesgo de pérdida.
