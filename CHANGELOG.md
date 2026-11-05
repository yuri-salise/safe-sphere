# Changelog

All notable changes to the **Safe Sphere** disaster coordination and aid transparency platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-05

### Added
- **Tactical Telemetry Interface**:
  - Implemented high-contrast dark theme with obsidian surfaces (`#080B0E`, `#101419`, `#161B22`) and electric lime accents (`#00FF66`).
  - Monospace telemetry data badges, status indicators, and operational modals.
  - Custom SVG shield and orbital ring vector emblem (`SafeSphereLogo`).
  - Accessible animation feedback with full `prefers-reduced-motion` compliance.

- **Situational GIS Calamity Intelligence**:
  - Interactive MapLibre GL v6 GIS vector map with live incident telemetry.
  - Pinpoint coordinate picker with draggable markers and automatic fallback coordinate calibration.
  - Self-hosted MapLibre GL worker modules via `scripts/copy-maplibre-worker.mjs` for standalone deployment reliability.
  - Real-time Supabase replication for live incident and dispatch updates.

- **Humanitarian Aid Transparency Ledger**:
  - Provider-neutral goods and financial pledge registration pipeline.
  - Sanitized public transparency audit timeline with donor/recipient PII scrubbing.
  - Append-only event sourcing for donation status transitions (`PLEDGED` -> `VERIFIED` -> `ALLOCATED` -> `IN_TRANSIT` -> `DELIVERED`).

- **Logistics & Fleet Dispatch Engine**:
  - Emergency vehicle fleet registry with capacity, operational status, and active deployment tracking.
  - Personnel readiness matrix with real-time operational status management.
  - Atomic state transitions preventing vehicle double-dispatch or concurrent conflicts.
  - Recipient delivery verification with optional proof-of-delivery attachments stored in private Supabase buckets.

- **Incident Command & Reporting**:
  - Community-submitted emergency incident intake with triage workflows.
  - Named inter-office coordination log and urgent resource requirements tracking.
  - RFC 4180-compliant CSV data exports with spreadsheet formula injection protection.
  - Comprehensive administrative governance and role-based access control (RBAC).

- **Security & Infrastructure**:
  - Strict PostgreSQL Row Level Security (RLS) policies across all tables.
  - PKCE-secured authentication flow with SSR session validation.
  - TypeScript 5 strict compilation with Next.js 16 Turbopack build optimization.
  - Complete documentation suite including Architecture, Telemetry Design System, Supabase Setup, and API catalogs.
