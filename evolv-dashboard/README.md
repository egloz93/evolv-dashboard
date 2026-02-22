# Evolv Dashboard

> **Real-time CFO Intelligence Platform** — Cash flow, burn, KPIs, and an AI co-pilot. Built to replace reactive 15-day-old books with live financial decisions.

![Stack](https://img.shields.io/badge/Next.js-14-black) ![Auth](https://img.shields.io/badge/Auth0-MFA-orange) ![DB](https://img.shields.io/badge/Postgres-Prisma-blue) ![AI](https://img.shields.io/badge/Claude-AI-purple)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EVOLV DASHBOARD                       │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │  Auth0   │    │ Next.js  │    │   PostgreSQL      │  │
│  │  + MFA   │───▶│  App     │───▶│   (Prisma ORM)   │  │
│  └──────────┘    └──────────┘    └──────────────────┘  │
│                       │                                  │
│          ┌────────────┼────────────┐                    │
│          ▼            ▼            ▼                    │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│    │  Plaid   │ │  Stripe  │ │   QBO    │              │
│    │  (Bank)  │ │ (Revenue)│ │  (P&L)   │              │
│    └──────────┘ └──────────┘ └──────────┘              │
│                       │                                  │
│                  ┌──────────┐                           │
│                  │ Claude   │                           │
│                  │ AI Chat  │                           │
│                  └──────────┘                           │
└─────────────────────────────────────────────────────────┘
```

## Features

- **13-Week Cash Flow Forecast** — Weekly inflow/outflow/net from real Plaid + Stripe data
- **Live Cash Position** — Plaid bank balance sync every 4 hours
- **QBO Monthly P&L** — Automated QuickBooks sync with expense breakdown
- **KPI Dashboard** — LTV, CAC, MRR, ARR, Churn, NDR
- **Evolv AI Co-pilot** — Claude-powered chatbot with live financial context
- **MFA via Auth0** — Google Authenticator, SMS, or WebAuthn
- **Role-Based Access** — Admin / CFO / Analyst / Viewer
- **Full Audit Trail** — Every action logged with user, timestamp, IP
- **Security Headers** — CSP, HSTS, X-Frame-Options on all routes
- **Auto Token Refresh** — Cron job refreshes QBO + Plaid tokens nightly

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-org/evolv-dashboard
cd evolv-dashboard
npm install
cp .env.example .env.local
```

### 2. Set Up Auth0
1. Create an Auth0 application at [manage.auth0.com](https://manage.auth0.com)
2. App Type: **Regular Web Application**
3. Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
4. Allowed Logout URLs: `http://localhost:3000`
5. **Enable MFA**: Auth0 Dashboard → Security → Multi-factor Auth → Enable
   - Turn on **Google Authenticator** and **SMS**
   - Set policy to **Always** (recommended for financial data)

### 3. Set Up QuickBooks Online
1. Go to [developer.intuit.com](https://developer.intuit.com)
2. Create app → Select **Accounting** scope
3. Copy Client ID and Secret to `.env.local`
4. Add redirect URI: `http://localhost:3000/api/auth/qbo/callback`

### 4. Set Up Stripe
1. Get API keys from [dashboard.stripe.com](https://dashboard.stripe.com)
2. Webhooks → Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Subscribe to: `payment_intent.succeeded`, `invoice.paid`, `customer.subscription.*`

### 5. Set Up Plaid
1. Register at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Create app, copy Client ID and Secret
3. Products: **Transactions**, **Balance**

### 6. Database
```bash
# Start Postgres (or use Railway/Supabase/Neon)
docker run -d -p 5432:5432 -e POSTGRES_DB=evolv_db postgres:15

# Push schema
npx prisma db push
npx prisma generate
```

### 7. Run Locally
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/evolv-dashboard
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Add all environment variables from `.env.example`
4. Deploy!

### 3. Set Vercel Secrets for CI/CD
```bash
vercel env add AUTH0_SECRET production
vercel env add DATABASE_URL production
# ... repeat for all vars
```

### 4. GitHub Secrets (for CI/CD)
Add to GitHub repo → Settings → Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## Security Architecture

| Layer | Implementation |
|-------|---------------|
| Authentication | Auth0 with mandatory MFA |
| Authorization | JWT + Role-based middleware |
| Token Storage | AES-256-GCM encrypted in Postgres |
| Transport | HTTPS enforced via HSTS |
| Rate Limiting | 100 req/min per IP |
| Audit Logging | All API actions logged with user + IP |
| Secret Scanning | TruffleHog in CI pipeline |
| Security Headers | CSP, X-Frame-Options, CORP, COEP |

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[auth0]` | GET | Auth0 OAuth flow |
| `/api/auth/qbo` | GET | QBO connect redirect |
| `/api/auth/qbo/callback` | GET | QBO token exchange |
| `/api/plaid/link-token` | POST | Create Plaid Link token |
| `/api/plaid/exchange-token` | POST | Exchange + sync |
| `/api/stripe/webhook` | POST | Stripe event handler |
| `/api/qbo/sync` | POST | Manual QBO P&L sync |
| `/api/dashboard/cashflow` | GET | 13-week cash flow data |
| `/api/chat` | POST | AI chatbot endpoint |

---

## Roadmap

- [ ] Scenario modeling ("what if we hire 3 engineers?")
- [ ] Investor-ready PDF report export
- [ ] Slack alerts for low runway / burn spikes
- [ ] Multi-entity / multi-currency support
- [ ] Forecasting with ML (Prophet)
- [ ] Mobile app (React Native)
