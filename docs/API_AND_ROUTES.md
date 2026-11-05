# Safe Sphere — API & Route Specifications

This document catalogs all endpoints, App Router pages, Server Actions, and data export contracts within Safe Sphere.

---

## 1. Route Map

### Public Routes (Unauthenticated)
| Route | Method | Purpose | Data Source |
| :--- | :---: | :--- | :--- |
| `/` | `GET` | Landing overview, high-level operational metrics, and protocol introduction. | Static / Server Component |
| `/map` | `GET` | Live GIS calamity map showing verified public incidents and severity pins. | Client Component via RPC `get_public_incidents` |
| `/incidents/[id]` | `GET` | Public incident detail view, resource needs, and operational timeline updates. | Direct Supabase query (filtered `is_public = true`) |
| `/transparency` | `GET` | Public aid chain of custody and immutable donation timeline. | PostgreSQL RPC `get_public_donation_timeline` |
| `/login` | `GET` | Secure authentication access portal. | Supabase Auth SSR |
| `/register` | `GET` | Self-service registration for community roles (Donor, Recipient, Volunteer). | Supabase Auth SSR |

### Authentication Callback Routes
| Route | Method | Purpose |
| :--- | :---: | :--- |
| `/auth/callback` | `GET` | Handles PKCE authentication code exchange and session cookie initialization. |
| `/auth/confirm` | `GET` | Handles token-hash OTP email confirmation links with automated redirection. |

### Operations Command Center (Authenticated)
All `/dashboard/*` routes require active authentication via `requireUserContext()`. Unauthorized requests are redirected to `/login`.

| Route | Minimum Role | Purpose |
| :--- | :--- | :--- |
| `/dashboard` | `PUBLIC` | Situational overview, readiness metrics, and targeted user notifications. |
| `/dashboard/incidents` | `PUBLIC` | Incident registry. Allows staff to register official incidents and public users to submit private reports for approval. |
| `/dashboard/incidents/[id]`| `PUBLIC` | Incident command console: log updates, track needs, and coordinate inter-office actions. |
| `/dashboard/donations` | `PUBLIC` | Pledge registry. Allows community members to submit aid pledges and coordinators to verify/assign them. |
| `/dashboard/donations/[id]`| `PUBLIC` | Donation itemization, status lifecycle transitions, and transport dispatch. |
| `/dashboard/personnel` | `PUBLIC` | Responder readiness matrix: manage availability windows, specialties, and contact info. |
| `/dashboard/logistics` | `LOGISTICS` / `COORDINATOR` | Fleet registry, delivery dispatch, and recipient digital sign-off. |
| `/dashboard/reports` | `ADMIN` / `DRRMO_STAFF` | Operational summary, protected system audit log, and CSV export utilities. |
| `/dashboard/admin` | `ADMIN` | Role assignment, community incident report review, and donation approval gate. |

---

## 2. Server Actions Catalog

Server actions are located under [`src/app/actions/`](../src/app/actions/) and execute server-side with strict session verification and input validation.

### Incident Management (`actions/incidents.ts`)
- `createIncidentAction(formData)`: Creates a new verified incident (Staff only).
- `submitIncidentReportAction(formData)`: Submits a community report with `review_status = 'PENDING'`.
- `updateIncidentStatusAction(formData)`: Updates severity, status (`REPORTED`, `ACTIVE`, `NEEDS_MET`, `CLOSED`), and affected counts.
- `addIncidentUpdateAction(formData)`: Posts a timestamped operational update to the incident timeline.
- `addIncidentNeedAction(formData)`: Adds or updates required relief resource quantities.
- `logCoordinationAction(formData)`: Logs inter-agency coordination (DRRM, Red Cross, Health, etc.) and notifies members.

### Donation & Relief Custody (`actions/donations.ts`)
- `createDonationAction(formData)`: Atomically submits a goods or funds pledge.
- `updateDonationStatusAction(formData)`: Advances donation status through the chain of custody (`CONFIRMED`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `COMPLETED`).
- `addDonationItemAction(formData)`: Itemizes physical goods attached to an approved donation.

### Logistics & Fleet Dispatch (`actions/logistics.ts`)
- `createVehicleAction(formData)`: Registers a transport resource with capacity specifications.
- `updateVehicleAvailabilityAction(formData)`: Toggles vehicle availability and maintenance notes.
- `createAssignmentAction(formData)`: Atomically reserves an available vehicle and responder for an incident or aid delivery.
- `updateAssignmentStatusAction(formData)`: Accepts, declines, completes, or cancels a logistics assignment (automatically releasing reserved assets).
- `createDeliveryAction(formData)`: Binds an assigned donation to a recipient and generates transit tracking.
- `confirmDeliveryAction(formData)`: Completes digital recipient sign-off with optional private photo/PDF proof upload.

### Administration & Governance (`actions/admin.ts`)
- `grantRoleAction(formData)`: Assigns operational privileges to a user account.
- `revokeRoleAction(formData)`: Removes specific permissions from an account.
- `reviewIncidentReportAction(formData)`: Approves community reports for public map visibility or rejects them.
- `reviewDonationPledgeAction(formData)`: Approves pledges for operational processing or rejects invalid pledges.

---

## 3. Data Export & CSV Contracts

Located in [`src/app/api/reports/`](../src/app/api/reports/), these endpoints generate standard RFC 4180 CSV exports with formula injection safeguards:

### Incidents Export
- **Endpoint**: `GET /api/reports/incidents.csv`
- **Filename**: `safe-sphere-incidents.csv`
- **Fields**: `Code`, `Title`, `Type`, `Severity`, `Status`, `Approval`, `Location`, `Latitude`, `Longitude`, `Affected`, `Public`, `Created`, `Updated`

### Donations Export
- **Endpoint**: `GET /api/reports/donations.csv`
- **Filename**: `safe-sphere-donations.csv`
- **Fields**: `Code`, `Incident ID`, `Type`, `Approval`, `Status`, `Amount`, `Currency`, `Anonymous`, `Payment Method`, `Payment Reference`, `Created`, `Updated`
