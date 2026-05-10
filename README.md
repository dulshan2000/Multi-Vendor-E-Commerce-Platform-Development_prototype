# MarkComm — Multi-Vendor E-Commerce Platform

> 🇱🇰 Sri Lanka's premier multi-vendor fashion marketplace — built for **Mark & Comm (Pvt) Ltd**

[![CI](https://github.com/markcomm/platform/actions/workflows/ci.yml/badge.svg)](https://github.com/markcomm/platform/actions)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Fastify](https://img.shields.io/badge/Fastify-4-white?logo=fastify)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)

---

## Table of Contents

1. [Overview](#overview)
2. [Sri Lanka Market Specifics](#sri-lanka-market-specifics)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Monorepo Structure](#monorepo-structure)
6. [Getting Started](#getting-started)
7. [Development Workflow](#development-workflow)
8. [Environment Variables](#environment-variables)
9. [Database](#database)
10. [API Documentation](#api-documentation)
11. [Deployment](#deployment)
12. [Implementation Progress](#implementation-progress)
13. [Team & Contact](#team--contact)

---

## Overview

MarkComm is a full-featured multi-vendor clothing marketplace built with a **modular monolith** architecture. It connects Sri Lankan fashion vendors with buyers across all 9 provinces, with support for local payment methods, local couriers, and LKR pricing.

**Key capabilities:**
- Multi-vendor storefront with independent vendor dashboards
- Island-wide delivery via Domex, PickMe, Lanka Post, and Kapruka
- PayHere-first payment processing (Cards, eZ Cash, mCash, Genie, FriMi, COD)
- Split order management — one checkout, multiple vendor fulfilment
- Tiered loyalty points system (Bronze → Silver → Gold → Platinum)
- Real-time order tracking via WebSocket + Redis Pub/Sub
- Elasticsearch-powered product search with Sinhala-aware faceting
- Automated financial settlement with append-only ledger

---

## Sri Lanka Market Specifics

| Feature | Implementation |
|---------|---------------|
| **Primary currency** | LKR (Sri Lankan Rupee) |
| **Primary payment** | PayHere (payhere.lk) — Cards, eZ Cash, mCash |
| **Digital wallets** | Dialog Genie, FriMi (Nations Trust Bank) |
| **International** | Stripe (Visa/Mastercard/Apple Pay/Google Pay) |
| **COD** | Cash on Delivery — island-wide |
| **Local couriers** | Domex Express, PickMe Delivery, Lanka Post EMS, Kapruka |
| **International** | DHL, FedEx, Aramex Sri Lanka |
| **Tax** | VAT 18% + NBT 2% (Nation Building Tax) |
| **Phone format** | `+94XXXXXXXXX` |
| **Provinces** | All 9 Sri Lankan provinces supported |
| **Payout banks** | Sampath, Commercial Bank, HNB, BOC, People's Bank |
| **AWS region** | `ap-southeast-1` (Singapore) |
| **Locale** | `en-LK` primary, Sinhala (`si-LK`) and Tamil (`ta-LK`) planned |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CloudFront CDN (ap-southeast-1)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│           Next.js 14 Frontend (SSR/SSG/ISR hybrid)              │
│   Customer Storefront │ Vendor Dashboard │ Admin Panel          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                  Fastify API v1 (/api/v1/...)                   │
│        Rate Limiting │ JWT Auth │ Zod Validation                │
└───┬──────────────┬──────────────┬──────────────┬───────────────┘
    │ Auth         │ Catalog      │ Orders        │ Payments
    │              │              │               │ (PayHere/Stripe)
┌───▼──────────────▼──────────────▼───────────────▼──────┐
│         PostgreSQL 16 │ Redis 7 │ Elasticsearch 8       │
│              BullMQ workers (email, reports, sync)      │
└─────────────────────────────────────────────────────────┘
```

### Rendering Strategy

| Page | Strategy | Revalidation |
|------|----------|-------------|
| Homepage | SSR | Per-request (personalized) |
| Product listings | ISR | 60s |
| Product detail | ISR | 30s |
| Vendor storefronts | ISR | 5 min |
| Checkout | CSR | Real-time |
| Dashboards | CSR | Real-time (authenticated) |
| Static pages | SSG | Build-time |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript strict |
| **Styling** | Tailwind CSS 3, shadcn/ui, Radix UI |
| **State** | Zustand (global) + TanStack Query (server state) |
| **Backend** | Fastify 4, Node.js 20 LTS, TypeScript |
| **Database** | PostgreSQL 16 with Prisma ORM |
| **Cache** | Redis 7 (sessions, rate limiting, pub/sub, cart) |
| **Search** | Elasticsearch 8 |
| **Queue** | BullMQ (Redis-backed) |
| **Payments** | PayHere (primary LK), Stripe (international), Genie, FriMi |
| **Email** | Amazon SES (with MailHog for local dev) |
| **File Storage** | AWS S3 + CloudFront (ap-southeast-1) |
| **Logging** | Pino with structured JSON output |
| **Monitoring** | AWS CloudWatch + Sentry |

---

## Monorepo Structure

```
markcomm-platform/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/          # App Router pages & layouts
│   │   │   ├── components/   # React components
│   │   │   └── lib/          # Utilities, API client
│   │   └── package.json
│   │
│   └── api/                  # Fastify REST API
│       ├── src/
│       │   ├── config/       # Environment validation
│       │   ├── lib/          # Logger, Redis, auth middleware
│       │   ├── modules/      # Feature modules (auth, vendor, etc.)
│       │   └── server.ts     # Fastify entry point
│       └── package.json
│
├── packages/
│   ├── db/                   # Prisma schema + client singleton
│   │   └── prisma/
│   │       └── schema.prisma # Complete DB schema
│   ├── types/                # Shared TypeScript types (LK-specific)
│   ├── ui/                   # Shared UI components + utilities
│   └── config/               # Shared ESLint/TS configs
│
├── docker/
│   └── docker-compose.dev.yml # Local dev: PostgreSQL, Redis, ES
├── .github/
│   └── workflows/ci.yml      # GitHub Actions CI
├── infrastructure/
│   └── terraform/            # AWS infrastructure as code
├── IMPLEMENTATION_PLAN.md    # Full project specification
└── README.md                 # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** 20 LTS or later
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker Desktop** (for local services)
- **Git** 2.40+

### 1. Clone & install

```bash
git clone <repository-url>
cd markcomm-platform
pnpm install
```

### 2. Configure environment

```bash
# API
cp apps/api/.env.example apps/api/.env.local

# Web
cp apps/web/.env.example apps/web/.env.local
```

Edit `.env.local` files and fill in:
- Generate JWT secrets: `node -e "require('crypto').randomBytes(64).toString('hex')"`
- Set your **PayHere** sandbox credentials from [payhere.lk](https://payhere.lk)
- Set `PAYHERE_SANDBOX=true` for development

### 3. Start local services

```bash
pnpm docker:dev
# Starts: PostgreSQL (5432), Redis (6379), Elasticsearch (9200)

# With email UI + Kibana:
docker compose -f docker/docker-compose.dev.yml --profile debug up -d
# MailHog UI: http://localhost:8025
# Kibana: http://localhost:5601
```

### 4. Run database migrations

```bash
pnpm db:migrate
# Creates all tables from packages/db/prisma/schema.prisma
```

### 5. Start development servers

```bash
pnpm dev
# Frontend: http://localhost:3000
# API:      http://localhost:4000
# API Docs: http://localhost:4000/docs
# Health:   http://localhost:4000/health
```

---

## Development Workflow

### Branch Strategy (Gitflow)

```
main        ← Production releases only
develop     ← Integration branch
feature/*   ← Feature branches (from develop)
hotfix/*    ← Production hotfixes (from main)
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add PayHere payment integration
fix(order): prevent double commission calculation
chore(deps): update Prisma to 6.2
docs(api): add settlement endpoint documentation
```

### Running Tests

```bash
# Unit tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format check
pnpm format:check

# Format fix
pnpm format
```

### Database Studio

```bash
pnpm db:studio
# Opens Prisma Studio at http://localhost:5555
```

---

## Environment Variables

### API (`apps/api/.env.local`)

| Variable | Description | Required |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | ✅ |
| `REDIS_URL` | Redis connection URL | ✅ |
| `JWT_ACCESS_SECRET` | 64-char hex secret for access tokens | ✅ |
| `JWT_REFRESH_SECRET` | 64-char hex secret for refresh tokens | ✅ |
| `COOKIE_SECRET` | 32+ char secret for cookie signing | ✅ |
| `PAYHERE_MERCHANT_ID` | PayHere merchant ID | ✅ |
| `PAYHERE_MERCHANT_SECRET` | PayHere merchant secret (for hash) | ✅ |
| `PAYHERE_SANDBOX` | `true` for sandbox mode | ✅ |
| `GENIE_API_KEY` | Dialog Genie API key | Optional |
| `FRIMI_API_KEY` | FriMi API key | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key (international cards) | ✅ |
| `S3_BUCKET_NAME` | AWS S3 bucket for assets | ✅ |
| `SES_FROM_EMAIL` | Sender email (e.g. `noreply@markcomm.lk`) | ✅ |
| `LK_VAT_RATE` | Sri Lanka VAT rate (default: `0.18`) | Optional |
| `LK_NBT_RATE` | Nation Building Tax rate (default: `0.02`) | Optional |

> ⚠️ **Never commit `.env.local` files.** All production secrets go into AWS Secrets Manager.

---

## Database

The database schema covers all platform entities:

| Module | Tables |
|--------|--------|
| Identity | `users`, `user_sessions`, `oauth_accounts`, `email_verification_tokens`, `password_reset_tokens` |
| Vendor | `vendor_profiles`, `vendor_storefronts`, `vendor_documents`, `vendor_staff`, `payout_accounts`, `commission_rules` |
| Customer | `customer_profiles`, `addresses`, `wishlists`, `wishlist_items`, `loyalty_accounts`, `loyalty_events` |
| Catalog | `categories`, `products`, `product_variants`, `product_images`, `product_categories`, `inventory_records`, `product_reviews` |
| Cart | `carts`, `cart_items` |
| Orders | `orders`, `order_items`, `payments`, `order_shipments`, `shipment_tracking_events` |
| Returns | `return_requests` |
| Financial | `ledger_entries` (append-only), `payout_requests` |
| Marketing | `coupons`, `abandoned_carts` |
| Admin | `audit_logs`, `cms_pages`, `system_config` |

### Schema location

```
packages/db/prisma/schema.prisma
```

### Migration commands

```bash
# Create new migration
pnpm db:migrate

# Apply to production
pnpm --filter @markcomm/db migrate:prod

# Open schema browser
pnpm db:studio
```

---

## API Documentation

Once the API server is running, interactive docs are available at:

**`http://localhost:4000/docs`** (Swagger UI)

### API Endpoints Overview

```
/api/v1/
├── auth/        register, login, logout, refresh, forgot-password, verify-email
├── vendors/     CRUD + approve/suspend + analytics
├── products/    CRUD + bulk-import + variants
├── orders/      place + cancel + fulfill + return
├── cart/        get + add/update/remove items
├── payments/    checkout session + webhooks (PayHere, Stripe)
├── search/      Elasticsearch product search with filters
├── settlements/ ledger + payout requests + history
└── analytics/   vendor dashboards + admin overview + reports
```

### Response Envelope

All responses follow this structure:

```json
{
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 24 },
  "error": null
}
```

---

## Deployment

### AWS Infrastructure (ap-southeast-1 — Singapore)

| Component | Service | Notes |
|-----------|---------|-------|
| Frontend | ECS Fargate | Auto-scales on CPU/RPS |
| API | ECS Fargate | Auto-scales on CPU/RPS |
| Workers | ECS Fargate | Auto-scales on queue depth |
| Database | RDS PostgreSQL Multi-AZ | r6g.large |
| Cache | ElastiCache Redis | Cluster mode |
| CDN | CloudFront | Assets + static content |
| Storage | S3 | Vendor assets, documents |
| Email | Amazon SES | noreply@markcomm.lk |

### Environments

| Env | Trigger |
|-----|---------|
| `dev` | Push to `develop` |
| `staging` | Merge to `main` |
| `production` | Manual approval gate |

### Deploy to production

```bash
# Requires AWS CLI and terraform configured
cd infrastructure/terraform
terraform plan -var-file="production.tfvars"
terraform apply -var-file="production.tfvars"
```

---

## Implementation Progress

### Phase 1 — Foundation & MVP (Weeks 1–12)

| Sprint | Status | Description |
|--------|--------|-------------|
| 1–2 | ✅ **Done** | Monorepo setup, CI/CD, Docker, Prisma schema, Auth module |
| 3–4 | 🔜 Next | Vendor registration, onboarding wizard, admin approval |
| 5–6 | 🔜 Planned | Product catalog CRUD, variants, image upload |
| 7–8 | 🔜 Planned | Customer storefront, category pages, cart |
| 9–10 | 🔜 Planned | Checkout, PayHere integration, order placement |
| 11–12 | 🔜 Planned | Vendor order queue, email confirmations, MVP testing |

### Phase 2–5

Refer to [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full 42-week delivery plan.

---

## Team & Contact

**Client**: Mark & Comm (Pvt) Ltd, Colombo, Sri Lanka  
**Submission Deadline**: May 20, 2026  
**Delivery Timeline**: ~42 weeks (10 months)

| Role | Count |
|------|-------|
| Technical Lead / Architect | 1 |
| Backend Engineers (Senior) | 2 |
| Frontend Engineers (Senior) | 2 |
| Full-Stack Engineer | 1 |
| DevOps / Cloud Engineer | 1 |
| QA Engineer | 1 |
| UI Integration Specialist | 1 |
| Project Manager | 1 |

---

*Last updated: May 11, 2026 — Document Version 1.0*  
*Subject to revision as designs and requirements are finalised.*
