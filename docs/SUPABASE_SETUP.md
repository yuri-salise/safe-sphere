# Safe Sphere Supabase Setup — v1.0

## 1. Create the project

Create a Supabase project and wait for the database to finish provisioning.

In **Project Settings → API**, copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Create `.env.local` from `.env.example` and enter those values.

## 2. Apply database migrations

Run these files in order using the Supabase SQL Editor or Supabase CLI:

1. `supabase/migrations/202608190001_safesphere_foundation.sql`
2. `supabase/migrations/202608190002_safesphere_operational_pipeline.sql`
3. `supabase/migrations/202610130001_community_incident_reports.sql`
4. `supabase/migrations/202610130002_community_donation_approval.sql`

The first migration creates the base PostGIS schema, roles, incidents, donations, personnel, vehicles, logistics, deliveries, notifications, and RLS.

The second migration completes the operational workflow: public transparency RPC, safe coordinate incident creation, atomic Donor-role donation pledging, safe community-role backfill for existing accounts, payment-reference fields, inter-office coordination, availability-window-aware resource reservation/release, active-assignment resource guards, assignment states, workflow triggers, automatic donation/delivery synchronization, notification events, audit logging, Realtime publication, and the private `delivery-proofs` Storage bucket.

The third migration lets signed-in users submit pinned incident reports privately. Administrators review them under Administration; only approved reports appear on the public map. Existing incidents retain their current public status.

The fourth migration lets any signed-in account submit a goods or funds pledge. It appears in the donation registry as needing administrator approval. Only approved pledges can advance through the donation workflow or appear on the public transparency timeline. Existing donations retain their approved standing.

Verify with an account that has only the baseline PUBLIC role: submit a pledge, confirm the registry shows “Needs admin approval” and `/transparency` does not show it, then approve it from `/dashboard/admin`. Confirm the pledge can proceed through the normal status workflow. Repeat with a second pledge and reject it; the rejected pledge must remain unprocessable and absent from `/transparency`.

After applying it, verify with separate community and admin accounts: submit a report from `/dashboard/incidents`, confirm it appears as Pending only to its reporter and staff, then approve it from `/dashboard/admin` and check `/map`. Repeat with a second report and reject it; it must remain absent from the public map.

## 3. Configure Auth URLs

In **Authentication → URL Configuration**:

Local development:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/**
```

For Vercel, add the production URL, for example:

```text
https://your-safesphere-domain.vercel.app/**
```

If you use a custom domain, add it as well. Safe Sphere includes both `/auth/callback` (PKCE code exchange) and `/auth/confirm` (token-hash OTP confirmation) route handlers.

For SSR-safe email confirmation, you can set the Supabase **Confirm signup** email template action URL to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
```

The normal browser signup flow also supplies `/auth/callback?next=/dashboard` as its redirect target.

## 4. Register the first account

Start Safe Sphere and register normally. Public community roles can be selected during registration:

- Donor
- Recipient
- Volunteer

The database always adds the `PUBLIC` baseline role as well. The database migration also backfills safe Donor/Recipient/Volunteer roles from existing signup metadata.

Operational roles are intentionally not self-service:

- Rescue Personnel
- Logistics
- Coordinator
- DRRMO Staff
- Admin

## 5. Bootstrap the first administrator

After registering your first trusted administrator account, run this once in the Supabase SQL Editor, replacing the email:

```sql
insert into public.user_roles(user_id, role)
select id, 'ADMIN'::public.app_role
from auth.users
where email = 'your-admin-email@example.com'
on conflict do nothing;
```

Sign out and back in. The **Administration** module will appear in the dashboard sidebar. Future roles can be granted from that page.

## 6. Realtime

The database schema registers these tables with the `supabase_realtime` publication when it exists:

- incidents
- incident_needs
- incident_coordination
- personnel_availability
- donations
- donation_events
- logistics_assignments
- deliveries
- notifications

The public map subscribes to incident changes and refreshes its sanitized map RPC.

## 7. Delivery proof storage

The migration creates a private bucket named:

```text
delivery-proofs
```

Recipient confirmation accepts JPG, PNG, WebP, or PDF files up to 3 MB. Files are stored under the confirming user's ID and remain private. RLS permits the owner, response staff, and logistics personnel to read permitted proofs.

## 8. Optional seed data

For a development-only Supabase project, you can run:

```text
supabase/seed.sql
```

It creates sample public incidents and vehicles. It does not create Auth users.

Do not run demonstration seed data on production unless you explicitly want those records.

## 9. Vercel environment variables

Add:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
NEXT_PUBLIC_ENABLE_DEMO_DATA=false
```

Redeploy after changing any `NEXT_PUBLIC_*` value because Next.js embeds public environment variables into the client bundle during the build.

## 10. Role responsibilities

Recommended production assignment:

- **PUBLIC** — baseline authenticated user
- **DONOR** — optional donor identity/profile role; any signed-in account can submit a pledge
- **RECIPIENT** — delivery confirmation role
- **VOLUNTEER** — volunteer readiness and assignment
- **RESCUE_PERSONNEL** — rescue readiness and assignment
- **LOGISTICS** — vehicle/delivery operations
- **COORDINATOR** — incident/resource/donation coordination
- **DRRMO_STAFF** — incident command and operational administration
- **ADMIN** — role administration and protected audit access

RLS remains the database authorization boundary even when UI elements are hidden by role.
