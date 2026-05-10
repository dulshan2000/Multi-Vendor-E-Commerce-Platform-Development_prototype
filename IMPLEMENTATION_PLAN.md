# Multi-Vendor E-Commerce Platform — Comprehensive Implementation Plan

**Project**: Confidential Multi-Vendor Clothing Platform  
**Client**: Mark & Comm (Pvt) Ltd  
**Date**: May 11, 2026  
**Submission Deadline**: May 20, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Design](#3-system-design)
4. [Database Schema Design](#4-database-schema-design)
5. [Module Breakdown](#5-module-breakdown)
6. [API Architecture](#6-api-architecture)
7. [Security & Compliance](#7-security--compliance)
8. [Third-Party Integrations](#8-third-party-integrations)
9. [Phased Delivery Plan](#9-phased-delivery-plan)
10. [Infrastructure & DevOps](#10-infrastructure--devops)
11. [Testing Strategy](#11-testing-strategy)
12. [Team Structure & Resource Allocation](#12-team-structure--resource-allocation)
13. [Risk Register](#13-risk-register)
14. [Cost Estimate Framework](#14-cost-estimate-framework)
15. [Post-Launch Support Plan](#15-post-launch-support-plan)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture Pattern

The platform uses a **modular monolith with service-oriented boundaries** — a pragmatic middle ground that avoids premature microservices complexity while keeping bounded contexts clean and extractable as the platform scales.

```
┌─────────────────────────────────────────────────────────────────┐
│                          CDN (CloudFront)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              Next.js Frontend (SSR/SSG/ISR hybrid)              │
│   Customer Storefront │ Vendor Dashboard │ Admin Panel          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                    API Gateway (Kong / AWS API GW)              │
│        Rate Limiting │ Auth Validation │ Request Routing        │
└───┬──────────────┬──────────────┬──────────────┬───────────────┘
    │              │              │              │
┌───▼───┐   ┌──────▼──┐   ┌──────▼──┐   ┌──────▼──────┐
│  Auth  │   │ Catalog │   │ Orders  │   │  Payments   │
│Service │   │ Service │   │ Service │   │  Service    │
└───┬───┘   └──────┬──┘   └──────┬──┘   └──────┬──────┘
    │              │              │              │
┌───▼──────────────▼──────────────▼──────────────▼──────┐
│              PostgreSQL (Primary + Read Replicas)       │
│                  Redis (Cache + Sessions + Queues)      │
│              Elasticsearch (Product Search/Analytics)  │
└───────────────────────────────────────────────────────┘
```

### 1.2 Rendering Strategy

| Page Type | Strategy | Rationale |
|-----------|----------|-----------|
| Product listings | ISR (60s revalidation) | Fresh catalog, SEO-indexed |
| Product detail | ISR (30s revalidation) | Inventory changes frequently |
| Vendor storefronts | ISR (5 min) | Branding/catalog updates |
| Checkout flow | CSR | Dynamic, user-specific |
| Dashboards | CSR | Real-time, authenticated |
| Static/CMS pages | SSG | Maximum performance |
| Homepage | SSR | Personalization + SEO |

---

## 2. Technology Stack

### 2.1 Core Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | Next.js 14 (App Router) | Server components, ISR, excellent SEO, TypeScript-first |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid pixel-perfect implementation of provided designs |
| **State Management** | Zustand + React Query (TanStack) | Lightweight global state; server-state caching |
| **Backend** | Node.js 20 LTS + Fastify | High throughput, schema validation, plugin architecture |
| **API Style** | REST (primary) + WebSocket (real-time) | Broad compatibility; WS for live tracking/notifications |
| **Database** | PostgreSQL 16 | ACID compliance, JSONB for flexible schemas, row-level security |
| **ORM** | Prisma | Type-safe queries, migration management |
| **Cache** | Redis 7 | Sessions, rate limiting, cart state, pub/sub |
| **Search** | Elasticsearch 8 | Advanced product search, faceted filtering, analytics |
| **Job Queue** | BullMQ (Redis-backed) | Email sending, settlement processing, report generation |
| **File Storage** | AWS S3 + CloudFront | Product images, vendor assets, documents |
| **Email** | Amazon SES / SendGrid | Transactional + marketing emails |
| **Auth** | JWT (access) + Refresh Tokens | Stateless, scalable; refresh stored in Redis |

### 2.2 Infrastructure

| Component | Service |
|-----------|---------|
| Cloud Provider | AWS (primary) |
| Container Orchestration | AWS ECS Fargate (initial) → EKS (scale) |
| CI/CD | GitHub Actions + AWS CodePipeline |
| IaC | Terraform |
| Monitoring | AWS CloudWatch + Grafana + Sentry |
| Secrets Management | AWS Secrets Manager |
| DNS & SSL | Route 53 + ACM |

---

## 3. System Design

### 3.1 Domain Boundary Map

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   IDENTITY &     │  │    CATALOG &     │  │   ORDER &        │
│   ACCESS         │  │    INVENTORY     │  │   FULFILLMENT    │
│                  │  │                  │  │                  │
│ • Users          │  │ • Products       │  │ • Orders         │
│ • Vendors        │  │ • SKUs/Variants  │  │ • Shipments      │
│ • Roles/Perms    │  │ • Categories     │  │ • Returns        │
│ • Sessions       │  │ • Inventory      │  │ • Tracking       │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PAYMENT &      │  │   MARKETING &    │  │   ANALYTICS &    │
│   SETTLEMENT     │  │   PROMOTIONS     │  │   REPORTING      │
│                  │  │                  │  │                  │
│ • Transactions   │  │ • Campaigns      │  │ • Events         │
│ • Commissions    │  │ • Coupons        │  │ • Dashboards     │
│ • Payouts        │  │ • Loyalty Points │  │ • Reports        │
│ • Ledger         │  │ • Abandoned Cart │  │ • Data Exports   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 3.2 Multi-Tenancy Model

- **Shared database, shared schema** with `vendor_id` row-level partitioning
- Row-Level Security (RLS) enforced at PostgreSQL level for vendor data isolation
- Vendor-specific subdomains: `{vendor-slug}.platform.com` resolved via Next.js middleware
- Separate S3 prefixes per vendor for asset isolation

### 3.3 Real-Time Architecture

```
Customer Browser ──WebSocket──► Node.js WS Server ──► Redis Pub/Sub
                                                            │
Vendor Dashboard ──WebSocket──► Node.js WS Server ◄────────┘
                  (order notifications, inventory alerts)
```

Events streamed in real-time:
- Order status changes
- Inventory threshold alerts
- New vendor registration (admin)
- Shipment status updates
- Payment confirmation

---

## 4. Database Schema Design

### 4.1 Core Entity Relationships

```
users
  ├── vendor_profiles (1:1)
  │     ├── vendor_products (1:N)
  │     │     ├── product_variants (1:N)
  │     │     │     └── inventory_records (1:1)
  │     │     ├── product_images (1:N)
  │     │     └── product_categories (M:N)
  │     ├── vendor_storefronts (1:1)
  │     ├── vendor_commissions (1:N)
  │     └── payout_accounts (1:N)
  │
  ├── customer_profiles (1:1)
  │     ├── addresses (1:N)
  │     ├── wishlists (1:N)
  │     └── loyalty_accounts (1:1)
  │
  └── orders (1:N)
        ├── order_items (1:N) ──► product_variants
        ├── order_shipments (1:N)
        │     └── shipment_tracking_events (1:N)
        ├── payments (1:N)
        └── returns (1:N)
```

### 4.2 Key Tables Overview

```sql
-- Core user table (unified auth)
users (id, email, password_hash, role, status, created_at)

-- Vendor-specific profile
vendor_profiles (id, user_id, business_name, slug, status,
                 commission_tier, onboarding_step, approved_at)

-- Product catalog
products (id, vendor_id, title, description, status,
          category_id, tags, metadata JSONB)

product_variants (id, product_id, sku, size, color,
                  price, compare_price, weight)

inventory_records (id, variant_id, quantity, reserved_qty,
                   warehouse_location, low_stock_threshold)

-- Order processing
orders (id, customer_id, status, subtotal, discount_total,
        tax_total, shipping_total, grand_total, currency)

order_items (id, order_id, variant_id, vendor_id,
             quantity, unit_price, vendor_payout_amount)

-- Financial ledger (append-only, never updated)
ledger_entries (id, vendor_id, type, amount, currency,
                reference_id, reference_type, created_at)

-- Commission configuration
commission_rules (id, vendor_id, type[percentage|fixed|tiered],
                  rate, threshold_min, threshold_max, effective_from)

-- Payouts
payout_requests (id, vendor_id, amount, status,
                 scheduled_at, processed_at, gateway_reference)
```

---

## 5. Module Breakdown

### 5.1 Module 1 — Identity & Access Management

**Scope**: Authentication, authorization, role-based access control

**Roles**:
| Role | Capabilities |
|------|-------------|
| `super_admin` | Full platform access, system configuration |
| `platform_admin` | Vendor moderation, content management |
| `vendor_owner` | Full vendor account management |
| `vendor_staff` | Order management, limited catalog access |
| `customer` | Shopping, account management |
| `guest` | Browse and checkout without registration |

**Implementation**:
- JWT access tokens (15-minute expiry) + HttpOnly cookie refresh tokens (7-day expiry)
- Redis token blocklist for immediate revocation on logout/suspension
- TOTP-based 2FA for vendor and admin accounts
- OAuth2 social login for customers (Google, Facebook)
- Email verification flow with time-limited tokens
- Password reset with secure, single-use tokens

---

### 5.2 Module 2 — Vendor Management System

**Onboarding Flow**:
```
Step 1: Business Registration (company details, legal info)
Step 2: Document Upload (business registration, ID verification)
Step 3: Bank/Payout Account Setup
Step 4: Store Setup (branding, slug, description)
Step 5: Admin Review & Approval
Step 6: Product Catalog Upload
Step 7: Go Live
```

**Vendor Portal Features**:
- Multi-step onboarding wizard with progress persistence
- Bulk product import via CSV/Excel with validation and error reporting
- Product variant matrix builder (size × color × material)
- Inventory management with low-stock alerts and auto-reorder thresholds
- Order queue with fulfillment workflow (Accept → Pack → Ship → Delivered)
- Vendor-customizable storefront (banner, logo, brand colors, featured products)
- Staff accounts with granular permission assignment
- Document management (contracts, tax certificates)

---

### 5.3 Module 3 — Product Catalog & Search

**Catalog Architecture**:
- Hierarchical category tree (unlimited depth) with breadcrumb navigation
- Tag-based taxonomy for cross-category discovery
- Product attributes schema (configurable per category: fabric, fit, occasion, etc.)
- Elasticsearch index synced from PostgreSQL via BullMQ jobs

**Search Capabilities**:
- Full-text search with stemming and typo tolerance
- Faceted filtering: price range, size, color, brand, rating, availability
- Sort options: relevance, price, newest, best-selling, rating
- Autocomplete suggestions with trending queries
- Search analytics (zero-result tracking, popular queries)

**Recommendation Engine**:
- **Collaborative filtering**: "Customers who bought X also bought Y"
- **Content-based filtering**: Similar items by attributes
- **Recently viewed** tracking (Redis per-session)
- **Trending products** (time-weighted sales velocity)
- **Vendor featured products** (paid placement)

---

### 5.4 Module 4 — Order Management & Fulfillment

**Order Lifecycle State Machine**:
```
PENDING_PAYMENT → PAYMENT_CONFIRMED → VENDOR_ACCEPTED →
PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY →
DELIVERED → [RETURN_REQUESTED → RETURN_APPROVED → REFUNDED]
```

**Split Order Logic**:
- Single customer checkout with products from multiple vendors
- Single `orders` record with multiple `order_items` grouped by `vendor_id`
- Each vendor manages fulfillment independently
- Consolidated tracking view for customer
- Commission and payout calculated per vendor subtotal

**Return & Exchange Flow**:
- Customer initiates return request with reason and photo upload
- Vendor reviews and approves/rejects within SLA window
- Courier pickup scheduling for approved returns
- Automated refund processing upon return receipt confirmation
- Exchange managed as new order with credit offset

---

### 5.5 Module 5 — Financial & Settlement System

**Commission Model**:
```
Commission Types:
├── Percentage-based: rate% of item price (e.g., 10%)
├── Fixed-fee: flat amount per order (e.g., $5 per order)
└── Tiered: rate varies by monthly GMV
    ├── < $10,000 GMV: 12%
    ├── $10,000–$50,000 GMV: 10%
    └── > $50,000 GMV: 8%
```

**Settlement Processing**:
- Append-only ledger for all financial events (immutable audit trail)
- Automated settlement calculations triggered post-delivery confirmation
- Hold period: configurable (e.g., 7-14 days after delivery, before payout eligibility)
- Payout schedules: weekly automated OR vendor-initiated withdrawal
- Multi-currency support with FX rate snapshots at transaction time
- Tax calculation integration (configurable per jurisdiction)

**Payment Gateway Strategy**:
- Primary: Stripe (global card processing, SCA compliance)
- Regional: PayHere or iPay88 for South/Southeast Asian markets
- Digital wallets: Apple Pay, Google Pay via Stripe
- Buy Now Pay Later: Afterpay/Klarna integration hook
- All gateway credentials stored in AWS Secrets Manager (never in codebase)

---

### 5.6 Module 6 — Delivery & Logistics Management

**Courier Integration Architecture**:
```
                    ┌─────────────────────┐
                    │  Shipping Abstraction│
                    │       Layer         │
                    └──────────┬──────────┘
          ┌───────────────┬────┘────────────┬──────────────┐
     ┌────▼───┐    ┌──────▼──┐    ┌────────▼─┐    ┌───────▼──┐
     │  DHL   │    │ FedEx   │    │  UPS     │    │ Local    │
     │        │    │         │    │          │    │ Carriers │
     └────────┘    └─────────┘    └──────────┘    └──────────┘
```

- Unified `ShippingProvider` interface (adapter pattern) for each carrier
- Rate shopping: simultaneous quotes from all carriers, return cheapest/fastest options
- Webhook receivers for real-time carrier status pushes
- Label generation and printing workflow for vendors
- Address validation via Google Maps Platform or SmartyStreets
- Delivery zone rules: regions, blacklists, weight/dimension limits

---

### 5.7 Module 7 — Customer Experience

**Shopping Flow**:
```
Browse/Search → Product Detail → Add to Cart → 
Cart Review → Checkout (Guest or Auth) →
Address Entry → Shipping Selection → 
Payment → Order Confirmation
```

**Cart Implementation**:
- Server-side cart (PostgreSQL) for authenticated users — persists across devices
- Redis-backed cart for guests — merged into user cart on login
- Real-time inventory reservation on cart add (soft lock: 15 min)
- Price recalculation on checkout open (handles price changes)

**Wishlist**:
- Multiple named wishlists per user
- Share wishlist via link (public/private toggle)
- Price drop and back-in-stock notifications for wishlisted items

---

### 5.8 Module 8 — Marketing & Retention

**Abandoned Cart Recovery**:
- Trigger: cart inactive for 1 hour (authenticated users)
- Email sequence: T+1hr (reminder), T+24hr (10% discount), T+72hr (last chance)
- Revenue attribution tracking per recovered cart

**Loyalty Program**:
- Point earning: X points per $1 spent (configurable)
- Point redemption: points → discount codes at checkout
- Tier system: Bronze / Silver / Gold / Platinum
- Tier benefits: free shipping, early access, priority support
- Points expiry: configurable rolling window

**Promotional Engine**:
```
Campaign Types:
├── Percentage discount (10% off)
├── Fixed discount ($5 off)
├── Free shipping
├── Buy X get Y free
├── Spend threshold ($50+ get free gift)
├── Flash sale (time-limited, countdown timer)
└── Bundle pricing (product combinations)

Targeting:
├── All customers
├── Customer segment (by tier, location, purchase history)
├── First-time buyers
└── Specific products/categories/vendors
```

**Email Notification System**:

| Trigger | Template |
|---------|----------|
| Registration | Welcome + email verification |
| Order placed | Order confirmation with items |
| Order shipped | Shipping confirmation + tracking link |
| Order delivered | Delivery confirmation + review request |
| Return approved | Return instructions + label |
| Refund processed | Refund confirmation |
| Abandoned cart | Recovery sequence (3 emails) |
| Low loyalty points | Engagement nudge |
| Flash sale | Campaign announcement |
| Password reset | Secure reset link |
| Vendor approved | Onboarding next steps |

---

### 5.9 Module 9 — Analytics & Reporting

**Vendor Analytics Dashboard** (real-time + historical):
- Revenue summary (today / week / month / custom range)
- Orders volume and fulfillment rate
- Top-selling products and variants
- Inventory health (low stock, dead stock)
- Customer demographics (age, location, new vs returning)
- Conversion funnel (views → cart → orders)
- Payout history and upcoming settlement amounts
- Product return rates and reasons

**Platform Admin Analytics**:
- Gross Merchandise Value (GMV) by period
- Platform revenue (commission collected)
- Vendor performance rankings
- Customer acquisition metrics (CAC, LTV)
- Geographic sales heatmaps
- Payment method distribution
- Carrier performance (delivery rates, SLA breaches)

**Report Generation**:
- Scheduled reports (daily/weekly/monthly) via email
- On-demand custom report builder (select metrics + date range + filters)
- Export formats: CSV, Excel (.xlsx), PDF
- BullMQ jobs handle heavy report generation asynchronously

---

### 5.10 Module 10 — Administration Panel

**Centralized Admin Dashboard**:
- Platform health overview (uptime, error rates, active sessions)
- Vendor queue: pending approvals, flagged accounts, suspension management
- Order oversight: escalation handling, dispute resolution
- CMS: static pages (About, Terms, Privacy, FAQ) with rich-text editor
- System configuration: commission defaults, platform fees, feature flags
- User management: search, view, suspend, impersonate (audit-logged)
- Notification center: system-wide announcements to vendors or customers

---

## 6. API Architecture

### 6.1 Endpoint Structure

```
/api/v1/
├── auth/
│   ├── POST   register
│   ├── POST   login
│   ├── POST   logout
│   ├── POST   refresh
│   ├── POST   forgot-password
│   └── POST   verify-email
│
├── vendors/
│   ├── GET    /                    (admin: list all)
│   ├── POST   /                    (register new vendor)
│   ├── GET    /:id                 (vendor profile)
│   ├── PATCH  /:id                 (update profile)
│   ├── POST   /:id/approve         (admin action)
│   ├── POST   /:id/suspend         (admin action)
│   └── GET    /:id/analytics       (vendor dashboard data)
│
├── products/
│   ├── GET    /                    (catalog with filters)
│   ├── POST   /                    (vendor: create)
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   ├── POST   /bulk-import         (CSV upload)
│   └── GET    /:id/variants
│
├── orders/
│   ├── GET    /                    (customer orders / vendor orders)
│   ├── POST   /                    (place order)
│   ├── GET    /:id
│   ├── POST   /:id/cancel
│   ├── POST   /:id/fulfill         (vendor action)
│   └── POST   /:id/return
│
├── payments/
│   ├── POST   /checkout/session    (create payment intent)
│   ├── POST   /webhooks/:gateway   (gateway webhooks)
│   └── GET    /methods             (available payment methods)
│
├── cart/
│   ├── GET    /
│   ├── POST   /items
│   ├── PATCH  /items/:id
│   └── DELETE /items/:id
│
├── settlements/
│   ├── GET    /ledger              (vendor ledger entries)
│   ├── POST   /payout/request      (vendor-initiated withdrawal)
│   └── GET    /payout/history
│
├── search/
│   └── GET    /products            (Elasticsearch-backed)
│
├── shipping/
│   ├── POST   /rates               (get shipping quotes)
│   ├── POST   /label               (generate label)
│   └── GET    /track/:trackingNo
│
└── analytics/
    ├── GET    /vendor/:id/summary
    ├── GET    /vendor/:id/products
    ├── GET    /admin/overview
    └── POST   /reports/generate
```

### 6.2 API Standards

- Versioned via URL prefix (`/api/v1/`)
- JSON request/response with consistent envelope: `{ data, meta, error }`
- Pagination: cursor-based for large datasets, offset-based for paginated UIs
- Rate limiting: per IP (unauthenticated) and per user ID (authenticated) via Redis
- Request validation: JSON Schema via Fastify's built-in AJV integration
- Error codes: standardized machine-readable codes alongside HTTP status codes

---

## 7. Security & Compliance

### 7.1 PCI DSS Compliance

- **Never store raw card data** — all card handling delegated to Stripe/payment gateways
- Platform achieves **PCI DSS SAQ A** scope (redirected payment processing)
- HTTPS enforced everywhere; HSTS headers set
- Tokenized payment methods stored at gateway level only
- Annual penetration testing by certified third party

### 7.2 Application Security (OWASP Top 10)

| Threat | Mitigation |
|--------|-----------|
| Injection (SQLi) | Prisma parameterized queries; no raw SQL from user input |
| Broken Authentication | JWT rotation, token revocation list, account lockout after 5 failed attempts |
| Sensitive Data Exposure | AES-256 encryption at rest; TLS 1.3 in transit; PII masked in logs |
| XML/XXE | JSON-only APIs; no XML processing |
| Broken Access Control | RLS at DB level; middleware authorization checks on every route |
| Security Misconfiguration | Terraform IaC reviewed; no default credentials; security headers via Helmet.js |
| XSS | CSP headers; React's built-in encoding; DOMPurify for user-generated content |
| Insecure Deserialization | Input validation on all endpoints; schema enforcement |
| SSRF | Allowlist-only outbound HTTP calls; no user-controlled URL fetching |
| Logging & Monitoring | Centralized structured logging; alerts on anomalous behavior |

### 7.3 Additional Security Measures

- **GDPR/Data Privacy**: Data retention policies, right-to-erasure API, explicit consent tracking
- **Rate Limiting**: Tiered limits per endpoint sensitivity (auth endpoints: strict)
- **CORS**: Strict origin allowlist; no wildcard
- **File Uploads**: Type validation, size limits, virus scanning (ClamAV or AWS Macie)
- **Admin Actions**: Full audit log for all admin-performed mutations
- **Vendor Impersonation**: Logged, time-limited, requires elevated admin role

---

## 8. Third-Party Integrations

| Category | Service | Integration Method |
|----------|---------|-------------------|
| Payment Primary | Stripe | REST API + Webhooks |
| Payment Regional | PayHere | REST API + Callbacks |
| Shipping | DHL, FedEx, UPS, local carriers | REST APIs (adapter pattern) |
| Email | Amazon SES | AWS SDK (SMTP fallback) |
| SMS Notifications | Twilio | REST API |
| Address Validation | Google Maps Platform | REST API |
| Tax Calculation | TaxJar or Avalara | REST API |
| Analytics | Mixpanel / Amplitude (customer events) | JavaScript SDK + server events |
| Error Tracking | Sentry | SDK (frontend + backend) |
| Image CDN | CloudFront + Lambda@Edge | S3 origin |
| Search | Elasticsearch (self-hosted on ECS) | REST API |
| Currency Rates | Open Exchange Rates | REST API (hourly caching) |

---

## 9. Phased Delivery Plan

### Phase 1 — Foundation & MVP (Weeks 1–12)

**Goal**: A functional marketplace where vendors can list products and customers can purchase them.

| Week | Deliverables |
|------|-------------|
| 1–2 | Project setup, CI/CD, infrastructure provisioning, DB schema v1, auth module |
| 3–4 | Vendor registration, onboarding wizard, admin approval workflow |
| 5–6 | Product catalog CRUD, variant management, image upload |
| 7–8 | Customer storefront (homepage, category pages, product detail), cart |
| 9–10 | Checkout flow, Stripe payment integration, order placement |
| 11–12 | Basic order management for vendors, order confirmation emails, MVP testing |

**MVP Acceptance Criteria**:
- Vendor can register, get approved, and list products
- Customer can browse, add to cart, checkout, and receive confirmation
- Admin can manage vendors and view orders
- Stripe payments processing successfully

---

### Phase 2 — Core Platform (Weeks 13–22)

**Goal**: Full logistics, financial settlement, and complete customer experience.

| Week | Deliverables |
|------|-------------|
| 13–14 | Shipping carrier integrations (DHL, FedEx, UPS), rate calculation, label generation |
| 15–16 | Real-time shipment tracking, delivery status notifications |
| 17–18 | Financial settlement system, commission calculation, ledger, payout module |
| 19–20 | Return & exchange workflow, refund processing |
| 21–22 | Customer accounts (full profile, order history, wishlists), loyalty program foundation |

---

### Phase 3 — Growth Features (Weeks 23–30)

**Goal**: Marketing tools, advanced search, recommendations, and analytics.

| Week | Deliverables |
|------|-------------|
| 23–24 | Elasticsearch integration, advanced search, faceted filtering, autocomplete |
| 25–26 | Product recommendation engine, behavioral tracking |
| 27–28 | Marketing module: coupons, discounts, flash sales, promotional campaigns |
| 29–30 | Abandoned cart recovery email sequences, customer segmentation |

---

### Phase 4 — Analytics, Admin & Hardening (Weeks 31–38)

**Goal**: Comprehensive analytics, full admin capabilities, performance optimization, and security hardening.

| Week | Deliverables |
|------|-------------|
| 31–32 | Vendor analytics dashboards, report generation, data export |
| 33–34 | Admin panel: full vendor moderation, CMS, system configuration |
| 35–36 | Platform-wide analytics, GMV tracking, carrier performance reports |
| 37–38 | Performance optimization (Core Web Vitals targets), load testing, security audit |

---

### Phase 5 — Launch Preparation (Weeks 39–42)

| Week | Deliverables |
|------|-------------|
| 39 | UAT (User Acceptance Testing) with client |
| 40 | Bug fixes from UAT, design QA pass |
| 41 | Staging environment sign-off, go-live checklist completion |
| 42 | Production launch, monitoring activation, hypercare period begins |

**Total Duration**: ~42 weeks (approximately 10 months)

---

## 10. Infrastructure & DevOps

### 10.1 Environment Strategy

| Environment | Purpose | Scale |
|-------------|---------|-------|
| `local` | Developer machines | Docker Compose |
| `dev` | Feature branch testing | Minimal ECS Fargate |
| `staging` | Pre-production UAT | Production-mirror |
| `production` | Live platform | Auto-scaling ECS Fargate |

### 10.2 Production Infrastructure (AWS)

```
Region: ap-southeast-1 (Singapore) — closest to Sri Lanka

VPC:
├── Public Subnets:  ALB, NAT Gateway
├── Private Subnets: ECS Tasks, RDS, ElastiCache
└── DB Subnets:      RDS Multi-AZ, Elasticsearch

Compute:
├── ECS Fargate (Next.js frontend): 2 tasks min, 10 max (auto-scale on CPU/RPS)
├── ECS Fargate (API service): 2 tasks min, 20 max (auto-scale on CPU/RPS)
└── ECS Fargate (Worker/Queue): 1 task min, 5 max (auto-scale on queue depth)

Data:
├── RDS PostgreSQL Multi-AZ (db.r6g.large initial) + 1 read replica
├── ElastiCache Redis (cache.r6g.large, cluster mode enabled)
└── S3 + CloudFront (media storage and CDN)

Networking:
├── CloudFront distribution (global CDN)
├── ALB (SSL termination, sticky sessions for WS)
└── Route 53 (DNS, health checks, failover)
```

### 10.3 CI/CD Pipeline

```
Developer Push →
  GitHub Actions:
    ├── Lint + Type Check (ESLint, tsc --noEmit)
    ├── Unit Tests (Jest)
    ├── Integration Tests (Testcontainers)
    ├── Build Docker Images
    ├── Push to ECR
    └── Deploy to Environment:
          dev: automatic on merge to `develop`
          staging: automatic on merge to `main`
          production: manual approval gate required
```

### 10.4 Scaling Strategy

- **Database**: Connection pooling via PgBouncer; read replicas for analytics queries
- **Cache**: Redis Cluster for horizontal scaling; cache-aside pattern
- **Search**: Elasticsearch with sharding per index
- **Assets**: Pre-signed S3 URLs for vendor uploads; CloudFront for reads
- **Sessions**: Redis (eliminates sticky sessions requirement)
- **Background Jobs**: BullMQ with multiple worker instances competing on queues

---

## 11. Testing Strategy

### 11.1 Testing Pyramid

| Level | Tool | Coverage Target |
|-------|------|----------------|
| Unit Tests | Jest | 80%+ business logic |
| Integration Tests | Jest + Testcontainers (real PostgreSQL, Redis) | All API endpoints |
| E2E Tests | Playwright | Critical user journeys |
| Performance Tests | k6 | Checkout, search, product listing |
| Security Tests | OWASP ZAP | Pre-release automated scan |

### 11.2 Critical E2E Test Scenarios

1. **Customer**: Browse → Search → Filter → View Product → Add to Cart → Checkout (guest) → Order confirmation
2. **Customer (Auth)**: Login → Checkout → Apply coupon → Pay → Track order → Return request
3. **Vendor**: Register → Onboard → Upload products → Receive order → Fulfill → View payout
4. **Admin**: Approve vendor → Moderate product → Process escalation → View analytics

### 11.3 Performance Targets

| Metric | Target |
|--------|--------|
| Time to First Byte (TTFB) | < 200ms (cached) |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.5s |
| API P95 response time | < 300ms |
| Concurrent users (initial capacity) | 5,000 |
| Orders per minute (initial capacity) | 500 |

### 11.4 Browser & Device Compatibility

- **Browsers**: Chrome 120+, Firefox 120+, Safari 16+, Edge 120+
- **Mobile**: iOS Safari 16+, Chrome for Android
- **Viewports**: 320px (mobile min) through 2560px (wide desktop)
- **Accessibility**: WCAG 2.1 AA compliance

---

## 12. Team Structure & Resource Allocation

### 12.1 Core Team Composition

| Role | Count | Responsibility |
|------|-------|---------------|
| Technical Lead / Architect | 1 | Architecture decisions, code review, technical client liaison |
| Backend Engineers (Senior) | 2 | API services, database design, integrations |
| Frontend Engineers (Senior) | 2 | Next.js UI implementation from designs |
| Full-Stack Engineer | 1 | Feature development across stack |
| DevOps / Cloud Engineer | 1 | Infrastructure, CI/CD, monitoring |
| QA Engineer | 1 | Test planning, automation, manual QA |
| UI Integration Specialist | 1 | Pixel-perfect design implementation, CSS/animation |
| Project Manager | 1 | Timeline tracking, client communication, sprint management |

**Total Core Team**: 10 people

### 12.2 Communication Plan

- **Daily standups**: 15 min async video updates (Loom or Slack)
- **Weekly sprint reviews**: Live demo of completed features to client
- **Bi-weekly sprint planning**: Backlog grooming and next sprint commitment
- **Monthly stakeholder reports**: Progress vs. timeline, KPIs, risk updates
- **Project management**: Linear or Jira (sprint boards, backlog, bug tracking)
- **Design review sessions**: Before and after implementation of each major UI section
- **Emergency escalation**: Direct Technical Lead contact within 4 hours

---

## 13. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| UI design ambiguity causing rework | Medium | High | Design review sessions before implementation; design tokens extracted early |
| Third-party courier API instability | Medium | Medium | Adapter pattern isolates changes; fallback to manual tracking |
| Payment gateway compliance delays | Low | High | Stripe onboarding started at project kickoff; PayHere as parallel track |
| Scope creep from client feature additions | High | High | Change request process with impact assessment; contract defines MVP scope |
| Team member unavailability | Low | Medium | Cross-training; documentation-first culture; 10% capacity buffer |
| Database performance at scale | Low | High | Load testing at Phase 4; indexing strategy reviewed per query plan |
| Elasticsearch operational complexity | Medium | Medium | AWS OpenSearch as managed alternative; dedicated DevOps ownership |
| Security vulnerability discovered pre-launch | Low | Critical | OWASP ZAP scans in CI; external pen test in Week 37–38 |

---

## 14. Cost Estimate Framework

### 14.1 Development Cost Breakdown (by Phase)

| Phase | Duration | Scope | Relative Cost |
|-------|----------|-------|--------------|
| Phase 1 — Foundation & MVP | 12 weeks | Auth, catalog, checkout, basic orders | ~28% |
| Phase 2 — Core Platform | 10 weeks | Logistics, settlement, returns, accounts | ~24% |
| Phase 3 — Growth Features | 8 weeks | Search, recommendations, marketing | ~19% |
| Phase 4 — Analytics & Hardening | 8 weeks | Analytics, admin, performance, security | ~19% |
| Phase 5 — Launch Preparation | 4 weeks | UAT, fixes, go-live | ~10% |

### 14.2 Monthly Infrastructure Costs (Estimated — AWS ap-southeast-1)

| Component | Monthly Estimate (USD) |
|-----------|----------------------|
| ECS Fargate (frontend + API + workers) | $400–$800 |
| RDS PostgreSQL Multi-AZ (r6g.large) | $300–$450 |
| ElastiCache Redis (r6g.large) | $150–$200 |
| Elasticsearch / OpenSearch | $200–$350 |
| CloudFront + S3 | $100–$300 |
| ALB, NAT Gateway, data transfer | $150–$250 |
| SES (email), other services | $50–$100 |
| **Total (initial scale)** | **$1,350–$2,450/month** |

*Costs scale with traffic; pricing grows gradually with platform success.*

### 14.3 Payment Terms Recommendation

| Milestone | Payment % |
|-----------|----------|
| Contract signing + kickoff | 20% |
| Phase 1 (MVP) delivery & sign-off | 20% |
| Phase 2 (Core Platform) delivery | 20% |
| Phase 3 (Growth Features) delivery | 15% |
| Phase 4 (Analytics + Hardening) delivery | 15% |
| Production launch (Phase 5) | 10% |

---

## 15. Post-Launch Support Plan

### 15.1 Support Tiers

| Tier | Response SLA | Scope |
|------|-------------|-------|
| **P1 — Critical** (platform down, payments failing) | 2 hours | 24/7 on-call |
| **P2 — High** (core feature broken, data inconsistency) | 8 hours | Business hours + on-call |
| **P3 — Medium** (feature degraded, UX issue) | 24 hours | Business hours |
| **P4 — Low** (cosmetic, enhancement request) | 5 business days | Sprint backlog |

### 15.2 Maintenance Activities

- **Weekly**: Dependency security audit (`npm audit`), infrastructure health review
- **Monthly**: Performance benchmarking, database query plan review, cost optimization
- **Quarterly**: Penetration testing review, disaster recovery drill, SLA reporting
- **Ongoing**: Bug fixes within agreed free warranty period (90 days post-launch)

### 15.3 Handover & Documentation

- Architecture decision records (ADRs) maintained throughout development
- API documentation via OpenAPI 3.0 (auto-generated + manually enriched)
- Operational runbook: deployment procedures, rollback steps, on-call playbook
- Database migration history and schema documentation
- Admin and vendor user manuals
- Video walkthrough recordings for all major platform areas
- Training sessions (3 sessions): Admin team, vendor onboarding team, technical team

### 15.4 Enhancement Process

- Post-launch enhancement requests logged in project backlog
- Monthly backlog grooming to prioritize feature additions
- Retainer-based model for ongoing development recommended
- Minimum 2-week sprint cycles for enhancements
- All changes go through staging environment before production

---

## Appendix A — Development Standards

- **Version Control**: Git with Gitflow branching strategy (`main`, `develop`, `feature/*`, `hotfix/*`)
- **Code Review**: All PRs require at least 1 senior review; no direct pushes to `main` or `develop`
- **Commit Convention**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **TypeScript**: Strict mode enabled across all frontend and backend code
- **API Documentation**: OpenAPI spec updated with every endpoint change (code-first via Zod/Fastify schemas)
- **Environment Variables**: Never committed; managed via AWS Secrets Manager + local `.env.local` (gitignored)
- **Linting**: ESLint + Prettier enforced in CI; no warnings allowed in `main`
- **Database Migrations**: Prisma migrate with squashed migrations per release; no manual schema edits on production

---

## Appendix B — Design Implementation Approach

Given that complete UI/UX designs will be provided post-contract signing (under NDA):

1. **Design Token Extraction** (Week 1): Parse design files for color palette, typography scale, spacing system, border radii, and shadow tokens — generate a Tailwind config and CSS variables
2. **Component Inventory** (Week 1–2): Catalog all unique components in the design system; map to implementation priority
3. **Storybook Setup** (Week 2): Build isolated component library matching the design system before integration
4. **Design QA Process**: Automated screenshot comparison (Chromatic or Percy) against design references for critical components
5. **Pixel-perfect tolerance**: < 2px positional variance accepted; colors matched to hex/HSL values from design tokens

---

*Document Version 1.0 — May 11, 2026*  
*Subject to revision based on design file review and client clarifications*
