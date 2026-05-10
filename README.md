# Multi-Vendor E-Commerce Platform Prototype

> 🇱🇰 Sri Lanka's premier multi-vendor fashion marketplace prototype

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Fastify](https://img.shields.io/badge/Fastify-4-white?logo=fastify)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)

---

## Table of Contents

1. [Overview](#overview)
2. [Implemented Features](#implemented-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Monorepo Structure](#monorepo-structure)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Database](#database)
9. [API Documentation](#api-documentation)

---

## Overview

This repository contains the MVP/prototype version of a full-featured multi-vendor clothing marketplace built with a **modular monolith** architecture. It is designed to connect fashion vendors with buyers, reflecting the foundational tech stack and core ecommerce capabilities.

**Key capabilities currently implemented:**
- Multi-vendor storefront with vendor onboarding flows
- Split order management — one checkout, multiple vendor fulfilment
- Product catalog management (Products, Variants, Categories)
- Elasticsearch-powered product search with faceted filtering
- Payment integrations (PayHere for local payments, Stripe for international cards)
- Real-time updates via WebSocket + Redis Pub/Sub
- Cart & Checkout processes
- Basic settlement tracking and automated email capabilities
- User Authentication (JWT) and Role-Based Access Control

---

## Implemented Features

This prototype implements the foundation and core modules of the final system:

### 1. Frontend Web App (Next.js 14)
- **Customer Pages:** Homepage, product listing/search, product details, flash sales.
- **Shopping Flow:** Cart, Wishlist, and Checkout.
- **User Dashboard:** Profile, Order tracking.
- **Styling:** Dark-mode-first aesthetic with Tailwind CSS and shadcn/ui.
- **State Management:** Zustand + TanStack Query.

### 2. Backend API (Fastify)
- **Auth Module:** Login, registration, JWT token generation, role verification.
- **Catalog Module:** CRUD operations for products, variants, and categories.
- **Search Module:** Full-text search and type-ahead autocomplete powered by Elasticsearch.
- **Order Module:** Cart validation, order placement, and split order routing.
- **Payment Module:** Checkout session management and webhook handling for PayHere and Stripe.
- **Realtime Module:** WebSocket server for live updates.
- **Vendor Module:** Basic vendor profiles and management.
- **Job Queues:** Asynchronous processing with BullMQ.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
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
│              BullMQ workers                             │
└─────────────────────────────────────────────────────────┘
```

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
| **Payments** | PayHere (primary LK), Stripe (international) |
| **Email** | Amazon SES (with MailHog for local dev) |
| **Logging** | Pino with structured JSON output |

---

## Monorepo Structure

```
ecommerce-platform/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   │   ├── src/app/          # App Router pages & layouts
│   │   ├── src/components/   # React components
│   │   └── package.json
│   │
│   └── api/                  # Fastify REST API
│       ├── src/config/       # Environment validation
│       ├── src/lib/          # Logger, Redis, auth middleware
│       ├── src/modules/      # Feature modules (auth, vendor, etc.)
│       └── package.json
│
├── packages/
│   ├── db/                   # Prisma schema + client singleton
│   ├── types/                # Shared TypeScript types
│   ├── ui/                   # Shared UI components + utilities
│   └── config/               # Shared ESLint/TS configs
│
├── docker/                   # Local dev: PostgreSQL, Redis, ES
└── README.md                 # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** 20 LTS or later
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker Desktop** (for local services)

### 1. Clone & install

```bash
git clone <repository-url>
cd ecommerce-platform
pnpm install
```

### 2. Configure environment

```bash
# API
cp apps/api/.env.example apps/api/.env.local

# Web
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start local services

```bash
pnpm docker:dev
# Starts: PostgreSQL (5432), Redis (6379), Elasticsearch (9200)
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
| `PAYHERE_MERCHANT_SECRET` | PayHere merchant secret | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key | ✅ |

---

## Database

The database schema (`packages/db/prisma/schema.prisma`) covers platform entities for identity, vendor profiles, products, orders, cart, and payments.

### Migration commands

```bash
# Create new migration
pnpm db:migrate

# Open schema browser
pnpm db:studio
```

---

## API Documentation

Once the API server is running, interactive docs are available at **`http://localhost:4000/docs`** (Swagger UI).
