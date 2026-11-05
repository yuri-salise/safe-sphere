# Safe Sphere Architecture — v1.0

Safe Sphere is built as an enterprise-grade, event-driven emergency operations platform. This document outlines the technical design, data flows, concurrency controls, and security models.

---

## 1. High-Level Request Pipeline

```text
Browser Client (React 19 Server & Client Components)
   │
   ├── [HTTP / HTTPS]
   │    ▼
   ├── Next.js 16 Edge / Server Runtime (Node.js 22.x)
   │    ├─ Server Actions (Encrypted cookie session & mutations)
   │    ├─ Route Handlers (PKCE token exchange & sanitized CSV streaming)
   │    └─ Proxy Layer (Automatic JWT claims validation & cookie refresh)
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

---

## 2. Concurrency & State Machine Guarantees

In fast-moving disaster scenarios, race conditions (such as double-assigning an ambulance or misplacing relief goods) can have catastrophic consequences. Safe Sphere implements strict database-level concurrency controls:

### Resource Allocation State Machine
```text
[ Available Personnel / Fleet ]
         │
         │  Atomic Task Creation (logistics_assignments)
         ▼
[ RESERVED / LOCKED ] ──► Status note set to active task code
         │
         ├── Task Accepted ──► [ DISPATCHED / IN TRANSIT ]
         │                              │
         │                              ▼
         └── Task Cancelled / Completed ──► [ AUTOMATIC RELEASE ]
                                                   │
                                                   ▼
                                         [ RETURNED TO POOL ]
```

1. **Atomic Lock**: Creating an assignment atomically marks `personnel_availability.is_available = false` and `vehicle_availability.is_available = false`.
2. **Guarded Release**: When an assignment is closed or declined, a PostgreSQL trigger inspects all outstanding assignments. If no other active task claims the asset, it is released back to the available pool.
3. **Availability Window Enforcement**: If a responder's `available_until` timestamp has expired, the dispatch selector automatically filters them out of the coordinator's assignment dropdown.

### Aid Custody Lifecycle
```text
[ Community Pledge ] 
         │ (review_status = 'PENDING')
         ▼
[ Admin Approval Gate ]
         │ (review_status = 'APPROVED')
         ▼
[ PLEDGED ] ──► [ ASSIGNED ] ──► [ PICKED UP ] ──► [ IN TRANSIT ]
                                                           │
                                                           ▼
[ DIGITAL RECEIPT CONFIRMATION ] ◄────────────────── [ DELIVERED ]
         │
         ▼
[ COMPLETED ] (Immutable Chain of Custody Record)
```

- Every state change writes an append-only row to `donation_events`.
- Neither donors nor administrators can rewrite past history.
- Digital delivery confirmation requires recipient acknowledgement and optionally accepts cryptographic proof uploads (photo/PDF) stored in private Supabase Storage buckets.

---

## 3. Geospatial Architecture (PostGIS)

Safe Sphere relies on the PostGIS spatial extension for geographic accuracy:
- Coordinates are stored as standard WGS84 geography points:
  ```sql
  location extensions.geography(Point, 4326)
  ```
- Spatial indexing is applied via GIST:
  ```sql
  create index if not exists idx_incidents_location on public.incidents using gist(location);
  ```
- **Sanitized Public RPC (`get_public_incidents`)**:
  Public clients never query raw tables directly. Instead, they invoke a sanitized PostgreSQL function that extracts numeric longitude/latitude and masks sensitive administrative internal notes:
  ```sql
  extensions.st_x(location::extensions.geometry) as longitude,
  extensions.st_y(location::extensions.geometry) as latitude
  ```

---

## 4. Security & Role-Based Access Matrix

Safe Sphere adheres to defense-in-depth principles: UI checks only enhance usability; PostgreSQL Row Level Security (RLS) is the definitive authorization perimeter.

| Role | Incident Management | Donation Processing | Fleet & Logistics | User Governance |
| :--- | :---: | :---: | :---: | :---: |
| **PUBLIC** | Submit private report | Submit pledge | None | Own profile |
| **DONOR** | Submit private report | View own pledge status | None | Own profile |
| **RECIPIENT** | View public incidents | Confirm received aid | None | Own profile |
| **VOLUNTEER** | View assigned incidents | None | View assigned delivery | Own availability |
| **RESCUE_PERSONNEL**| View & update assigned | None | View assigned task | Own availability |
| **LOGISTICS** | View active incidents | Advance donation state | Register vehicles / Deliveries | Own availability |
| **COORDINATOR** | Full incident command | Manage & assign aid | Full dispatch & fleet | View team |
| **DRRMO_STAFF** | Full incident command | Full donation access | Full logistics access | System reports |
| **ADMIN** | Full administrative rights | Full review & audit | Full fleet authority | Grant/Revoke roles |

---

## 5. Performance Optimizations

1. **Turbopack Compiler**: Build and compilation times are reduced to under 12 seconds with incremental module evaluation.
2. **Self-Hosted MapLibre Workers**: Rather than resolving worker scripts dynamically through bundlers (a common source of map rendering hangs), Safe Sphere self-hosts `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` in `/public/maplibre/`.
3. **Resilient Basemap Fallback**: If third-party vector map CDNs stall for more than 7 seconds, Safe Sphere automatically swaps to a zero-worker raster fallback map, guaranteeing continuous visual command under network degradation.
4. **Formula Injection Sanitization**: All exported CSV cells beginning with `=, +, -, @` are prepended with an apostrophe `'` to eliminate malicious spreadsheet code execution.
