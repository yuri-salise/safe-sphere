<div align="center">

# Safe Sphere

**Enterprise Real-Time Disaster Coordination, Fleet Dispatch & Aid Transparency Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre-GL_v6-2C3E50?style=for-the-badge&logo=maplibre)](https://maplibre.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_PostGIS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br />

*Safe Sphere unifies live geographic information system (GIS) hazard tracking, responder fleet readiness, inter-agency emergency communication, and an immutable humanitarian aid transparency ledger into a unified, high-contrast mission control console.*

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Core Capabilities](#-core-capabilities)
- [Design Philosophy & Telemetry UI](#-design-philosophy--telemetry-ui)
- [Architecture & Data Pipeline](#-architecture--data-pipeline)
- [Security & Access Governance (RBAC)](#-security--access-governance-rbac)
- [Quick Start Guide](#-quick-start-guide)
- [Project Structure](#-project-structure)
- [Routes & Endpoints](#-routes--endpoints)
- [Documentation Suite](#-documentation-suite)
- [Contributing & License](#-contributing--license)

---

## 🌐 Overview

During complex natural calamities and humanitarian emergencies, coordination breakdowns frequently occur due to fragmented systems: disaster mapping is divorced from resource availability, donations suffer from opacity, and dispatch schedules risk double-allocating emergency vehicles.

**Safe Sphere** eliminates operational silos. Built on top of **Next.js 16**, **Supabase PostgreSQL**, **PostGIS**, and **MapLibre GL**, it delivers a fault-tolerant operational ecosystem where:
- Every incident is geotagged, validated, and broadcast in real time.
- Emergency personnel and transport vehicles are reserved and released with atomic state machine guarantees.
- Relief goods and financial contributions flow through an append-only digital chain of custody from initial pledge to digital recipient acknowledgement.

---

## ⚡ Core Capabilities

### 1. Situational GIS Calamity Intelligence
- **Live Vector & Raster Telemetry**: MapLibre GL v6 rendering with dynamic coordinate resolution and high-performance vector basemaps.
- **Dynamic Severity Stratification**: Immediate visual categorization across `CRITICAL`, `HIGH`, `MODERATE`, and `LOW` operational alerts.
- **Pinpoint Location Picker**: Integrated coordinate picker with draggable markers, map center calibration, and bounding-box geolocation.
- **WebSocket Pub/Sub**: Real-time Supabase replication pushes database mutations directly to client viewports without manual polling.

### 2. Fleet & Personnel Readiness Matrix
- **Atomic Resource Guarding**: Dispatched personnel and transport units are reserved atomically in the database; mission completion or cancellation automatically restores readiness.
- **Time-Window Availability**: Enforces availability expiration timestamps, preventing the dispatch of off-duty rescue units.
- **Multi-Role Responder Profiles**: Granular registry covering rescue skills, contact channels, and organizational affiliations.

### 3. Humanitarian Aid Ledger & Chain of Custody
- **Append-Only Event Sourcing**: Every custody event (`PLEDGED` → `APPROVED` → `ASSIGNED` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED` → `CONFIRMED`) creates an immutable, timestamped record.
- **Physical & Monetary Relief**: Support for itemized supplies (medical kits, rations, shelter gear) and verified financial pledges.
- **Public Accountability Portal**: Open, privacy-preserving timeline allowing citizens and donors to inspect relief progress without revealing sensitive personal recipient data.
- **Digital Receipt Verification**: Recipient confirmation supports encrypted proof uploads (JPG, PNG, WebP, PDF up to 3 MB) housed in private Supabase Storage buckets.

---

## 🎨 Design Philosophy & Telemetry UI

Safe Sphere utilizes a **High-Contrast Tactical Telemetry Interface** engineered specifically for 24/7 command centers and field conditions:

- **Obsidian Dark Void (`#080B0E`)**: Minimizes ocular fatigue during continuous monitoring and eliminates field glare on battery-powered devices.
- **Electric Lime Hierarchy (`#00FF66`)**: High-visibility luminescent accent reserved for primary actions, active telemetry pulses, and verified markers.
- **Monospace Tabular Data**: Coordinates, timestamps, asset serials, and currency figures utilize Geist Mono with tabular figures (`tabular-nums`) for rapid vertical scanning.
- **Layered Surfaces**: Modular cards with 1px hairline borders (`rgba(255, 255, 255, 0.08)`) and subtle elevation glows organize complex information without visual overload.

*For complete color token definitions and UI patterns, see [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).*

---

## 🏗️ Architecture & Data Pipeline

```text
Browser Client (React 19 Server & Client Components)
   │
   ├── [HTTPS]
   │    ▼
   ├── Next.js 16 Edge / Server Runtime (Node.js 22.x)
   │    ├─ Server Actions (Encrypted cookie session & mutations)
   │    ├─ Route Handlers (PKCE token exchange & sanitized CSV streaming)
   │    └─ Proxy Layer (Automatic JWT claims validation & session refresh)
   │
   ├── [Supabase Client & SSR Connector]
   │    ▼
   ├── Supabase PostgreSQL 15+
   │    ├─ PostGIS Extension (Spatial indexing & geofenced queries)
   │    ├─ Row Level Security (Granular table & row authorization)
   │    ├─ Stored Procedures & RPCs (Sanitized public projections)
   │    ├─ Triggers & Event Sourcing (Atomic resource reservation/release)
   │    └─ Supabase Storage (Private encrypted delivery receipts)
   │
   └── [WebSocket WSS]
        ▼
   Supabase Realtime Engine
        └─ Broadcasts public incident mutations directly to MapLibre GIS clients
```

*For complete concurrency guarantees, spatial index designs, and state machine transitions, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).*

---

## 🔐 Security & Access Governance (RBAC)

Safe Sphere employs strict defense-in-depth principles. While the client UI adapts to user roles, **PostgreSQL Row Level Security (RLS)** serves as the non-bypassable perimeter.

| Role | Incident Management | Aid & Donations | Fleet & Dispatch | System Administration |
| :--- | :---: | :---: | :---: | :---: |
| **PUBLIC** | Submit private report | Submit pledge | None | View own profile |
| **DONOR** | Submit private report | View own pledges | None | Manage profile |
| **RECIPIENT** | View public incidents | Confirm aid receipt | None | Manage profile |
| **VOLUNTEER** | View assigned incidents | None | View assigned delivery | Toggle availability |
| **RESCUE_PERSONNEL**| View/update assigned | None | View assigned mission | Toggle availability |
| **LOGISTICS** | View active incidents | Advance aid custody | Register fleet / Dispatch | Manage fleet state |
| **COORDINATOR** | Full incident command | Manage & assign aid | Full dispatch control | Oversee personnel |
| **DRRMO_STAFF** | Full incident command | Full donation access | Full logistics access | Operational audit |
| **ADMIN** | Full administrative rights | Full review & audit | Full fleet authority | Grant/revoke roles |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `22.x` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Supabase Account**: With PostgreSQL 15+ and PostGIS enabled

### 1. Clone & Install
```bash
git clone https://github.com/yuri-salise/safe-sphere.git
cd safe-sphere
npm install
```

### 2. Environment Configuration
Copy `.env.example` to create your active `.env.local`:

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local

# macOS / Linux Bash
cp .env.example .env.local
```

Configure your credentials in `.env.local`:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Safe Sphere"

# Supabase Credentials (from Supabase Dashboard -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here

# Geographic Operations Center Default Coordinates
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
NEXT_PUBLIC_MAP_DEFAULT_LNG=125.0499
NEXT_PUBLIC_MAP_DEFAULT_LAT=7.8582
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=14

# Set to true for local testing with simulated incident telemetry
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

### 3. Database Initialization
Run the database migration files in sequential order in your **Supabase SQL Editor**:

1. `supabase/migrations/202608190001_safesphere_foundation.sql`
2. `supabase/migrations/202608190002_safesphere_operational_pipeline.sql`
3. `supabase/migrations/202610130001_community_incident_reports.sql`
4. `supabase/migrations/202610130002_community_donation_approval.sql`

*Detailed setup, storage bucket provisioning, and admin account creation are described in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).*

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```text
safe-sphere/
├── docs/                 # In-depth architectural & deployment documentation
│   ├── API_AND_ROUTES.md # Complete App Router catalog & CSV specifications
│   ├── ARCHITECTURE.md   # Concurrency models, state machines & PostGIS design
│   ├── DESIGN_SYSTEM.md  # Tactical telemetry design tokens & UI components
│   ├── ENV_VARIABLES.md  # Parameter references for local and production hosts
│   └── SUPABASE_SETUP.md # Database migrations, storage buckets & RBAC guide
├── public/               # Static assets & self-hosted MapLibre worker scripts
├── scripts/              # Build utilities (MapLibre worker asset preparation)
├── src/
│   ├── app/              # Next.js App Router (Pages, layouts, API routes, Server Actions)
│   │   ├── (auth)/       # Authentication access portals
│   │   ├── (public)/     # Public map, landing, and transparency ledger
│   │   ├── actions/      # Type-safe Server Actions for state transitions
│   │   ├── api/          # Health check & sanitized CSV streaming endpoints
│   │   └── dashboard/    # Authenticated operations command modules
│   ├── components/       # Modular React components
│   │   ├── auth/         # Auth forms & session feedback
│   │   ├── brand/        # Safe Sphere geometric mark & emblem
│   │   ├── dashboard/    # Operational cards & operator info
│   │   ├── donations/    # Aid pledge forms & itemization
│   │   ├── layout/       # Glassmorphic header, sidebar, and footer
│   │   ├── logistics/    # Delivery dispatch & recipient confirmation
│   │   ├── map/          # MapLibre telemetry engine & location picker
│   │   └── ui/           # Status pills, data badges, and buttons
│   ├── lib/              # Config, formatting, authentication, and Supabase SSR clients
│   └── types/            # TypeScript domain interfaces and enum types
└── supabase/             # PostgreSQL schemas, triggers, RLS policies, and seed data
```

---

## 🌐 Routes & Endpoints

| Category | Route | Access | Purpose |
| :--- | :--- | :---: | :--- |
| **Public** | `/` | All | Operational overview and status summary |
| **Public** | `/map` | All | Live GIS incident map and active alerts |
| **Public** | `/transparency` | All | Public humanitarian aid audit timeline |
| **Public** | `/incidents/[id]` | All | Incident situation, required needs, and updates |
| **Auth** | `/login`, `/register`| All | PKCE authentication and self-registration |
| **Console**| `/dashboard` | Signed In | Situational metrics and alert notifications |
| **Console**| `/dashboard/incidents`| Signed In | Incident command registry and reporting |
| **Console**| `/dashboard/donations`| Signed In | Aid pledge registry and status pipeline |
| **Console**| `/dashboard/personnel`| Signed In | Responder readiness matrix |
| **Console**| `/dashboard/logistics`| Staff | Fleet management and delivery dispatch |
| **Console**| `/dashboard/reports` | Staff | Audit logs and sanitized CSV exporters |
| **Console**| `/dashboard/admin` | Admin | Role assignment and report approvals |
| **API** | `/api/health` | All | System heartbeat monitoring endpoint |
| **API** | `/api/reports/*.csv` | Staff | RFC 4180 compliant CSV exports |

*For complete route parameters and Server Action signatures, see [`docs/API_AND_ROUTES.md`](docs/API_AND_ROUTES.md).*

---

## 📚 Documentation Suite

- 📘 [**Architecture & Concurrency Guide**](docs/ARCHITECTURE.md)
- 🎨 [**Tactical Telemetry Design System**](docs/DESIGN_SYSTEM.md)
- ⚙️ [**Environment Variables Reference**](docs/ENV_VARIABLES.md)
- 🗄️ [**Supabase Setup & RBAC Bootstrap**](docs/SUPABASE_SETUP.md)
- 🌐 [**API & Routes Catalog**](docs/API_AND_ROUTES.md)
- 📋 [**Demonstration & Testing Guide**](SAFE_SPHERE_DEMONSTRATION_GUIDE.md)

---

## 🛡️ Security & Integrity

- **Database-Level Row Level Security**: All queries are evaluated against PostgreSQL RLS rules.
- **Sanitized Public Projections**: Public endpoints access database state exclusively through PostgreSQL stored procedures (`get_public_incidents`, `get_public_donation_timeline`), guaranteeing zero exposure of private donor/recipient PII.
- **Formula Injection Mitigation**: CSV reports prepend untrusted cells (`=, +, -, @`) with an apostrophe to neutralize spreadsheet formula injection vulnerabilities.
- **Private Storage**: Proof-of-delivery attachments are stored in an encrypted private Supabase Storage bucket accessible only to the recipient, assigned logistics personnel, and incident command staff.

---

## 📄 License

Safe Sphere is open-source software licensed under the **[MIT License](LICENSE)**. Built to advance public safety, humanitarian relief transparency, and crisis response agility.
