# Safe Sphere — Operational Demonstration & Testing Guide

## Purpose

This guide defines the recommended walkthrough to demonstrate Safe Sphere during project presentations, technical defense, disaster preparedness audits, or system acceptance testing.

The demonstration is intentionally arranged as **one continuous disaster-response story** rather than a page-by-page tour. This makes the system easier to understand and shows that the modules are connected through actual database state, role permissions, logistics transitions, public map updates, and donation transparency.

Assumption: **all required user accounts and roles are already created and verified before the demonstration.** Do not spend presentation time registering accounts unless registration itself is being evaluated.

---

# 1. Recommended Demonstration Objective

By the end of the demo, the audience should have seen the complete Safe Sphere operational chain:

```text
Calamity reported
    ↓
Incident verified / published
    ↓
Needs recorded
    ↓
Personnel + vehicle made available
    ↓
Donor pledges aid
    ↓
Donation confirmed
    ↓
Logistics assignment created
    ↓
Assignee accepts
    ↓
Aid picked up
    ↓
Aid in transit
    ↓
Aid delivered
    ↓
Recipient digitally confirms receipt
    ↓
Donation completed
    ↓
Public transparency timeline updated
    ↓
Reports / audit records updated
    ↓
Incident closed when needs are met
```

The demo should prove that Safe Sphere is not merely a collection of forms. Each step should visibly affect the next step.

---

# 2. Accounts to Prepare

Prepare the following accounts before the presentation.

| Demo account | Required role | Purpose during demo |
|---|---|---|
| `admin@demo` | ADMIN | Show role control and audit capability if needed |
| `drrmo@demo` | DRRMO_STAFF | Create and manage the calamity record |
| `coordinator@demo` | COORDINATOR | Manage needs, coordination, personnel, vehicle, and dispatch |
| `responder@demo` | RESCUE_PERSONNEL or VOLUNTEER | Publish readiness and accept assignment |
| `logistics@demo` | LOGISTICS | Accept logistics work and move aid through delivery states |
| `donor@demo` | DONOR | Create the donation pledge |
| `recipient@demo` | RECIPIENT | Digitally confirm aid receipt |

Optional:

- A second Volunteer account to demonstrate unavailable/available personnel filtering.
- A second Donor account for a fund-donation example.
- A second vehicle to show that only available vehicles can be dispatched.

## Best practice

Use **separate browser profiles or separate browsers** so every role remains signed in.

Example:

```text
Chrome Profile 1  → DRRMO
Chrome Profile 2  → Coordinator
Edge              → Donor
Firefox           → Logistics
Chrome Incognito  → Recipient
Second Incognito  → Responder
```

This is significantly better than repeatedly signing out and signing back in during the presentation.

---

# 3. Prepare One Demo Scenario

Use one realistic incident for the entire presentation.

Recommended scenario:

```text
Incident title: Flash Flood near Musuan Gate
Incident type: Flood
Severity: HIGH
Location: Sector 4 / North Perimeter
Latitude: 7.8582
Longitude: 125.0499
Estimated affected: 120
Public visibility: Enabled
```

Recommended needs:

```text
Drinking Water   → 100 cases
Food Packs       → 150 packs
First Aid Kits   → 20 kits
```

Recommended vehicle:

```text
Asset code: SPHERE-RESCUE-01
Vehicle type: Utility / Rescue Vehicle
Plate number: DEMO-001
Capacity note: Relief goods + response personnel
Availability: Available
```

Recommended goods donation:

```text
Type: GOODS
Target: Flash Flood near Musuan Gate
Item: Drinking Water
Quantity: 40
Unit: cases
Visibility: Public donor
Message: For families affected near Musuan Gate.
```

Recommended recipient:

```text
recipient@demo
```

Use fixed demonstration data so presenters do not have to invent values while speaking.

---

# 4. Pre-Demo Checklist

Complete these checks 15–30 minutes before presenting.

- [ ] Production Vercel deployment is `Ready`.
- [ ] `/api/health` responds successfully.
- [ ] Supabase environment variables are configured.
- [ ] Both database migrations are applied.
- [ ] Map loads correctly on `/map`.
- [ ] OpenFreeMap tiles load on the presentation network.
- [ ] Every demo account can log in.
- [ ] Required roles are already assigned.
- [ ] Recipient profile exists and is selectable.
- [ ] Responder profile exists and can change availability.
- [ ] At least one vehicle is registered or ready to register.
- [ ] No old demo assignment is holding the responder or vehicle unavailable.
- [ ] Browser zoom is approximately 90–100%.
- [ ] Browser developer tools are closed unless needed for the technical portion.
- [ ] Notifications from unrelated applications are disabled.
- [ ] A small JPG/PNG proof-of-delivery image is ready if proof upload will be demonstrated.
- [ ] A fallback screenshot/video of the complete workflow is available in case internet access fails.

## Data-cleanliness recommendation

Do not begin the defense with dozens of old test records.

Prefer either:

1. a clean demonstration database, or
2. clearly named records prefixed with `DEMO`.

Example:

```text
DEMO — Flash Flood near Musuan Gate
DEMO-VEHICLE-01
```

---

# 5. Recommended Demonstration Order

## Phase 1 — Start with the Public View

**Account:** None / public browser  
**Route:** `/map`

Start from the public-facing map before showing dashboards.

### Show

- Public incident map.
- Map controls.
- Current active incidents, if any.
- Public access without an operational account.

### Explain

> Safe Sphere gives the community a public situational view while keeping operational controls behind authenticated role-based access.

If using a clean database, point out that the incident about to be created is not yet visible.

### Why this works well

The audience receives a baseline. Later, when the new incident appears, they can immediately see that the DRRMO action changed the public system.

---

# 6. Phase 2 — DRRMO Creates the Calamity Report

**Account:** DRRMO Staff  
**Route:** `/dashboard/incidents`

Create the prepared incident.

Use:

```text
Flash Flood near Musuan Gate
Flood
HIGH
Sector 4 / North Perimeter
7.8582
125.0499
120 affected
Public = Yes
```

Click **Create incident**.

### Immediately demonstrate

1. The new incident appears in the **Incident registry**.
2. Open the incident using **Manage →**.
3. Show the incident code generated by the system.
4. Show severity, status, location, and affected population.

### Then return to the public map

Refresh or allow Realtime to update.

Confirm that the new incident appears on `/map`.

### Explain

> The DRRMO creates one authoritative incident record. That same record drives the command dashboard and the public map, so staff are not manually maintaining separate copies of disaster information.

This is the first major proof of system integration.

---

# 7. Phase 3 — Build the Incident Operational Picture

**Account:** DRRMO Staff or Coordinator  
**Route:** `/dashboard/incidents/[incident-id]`

## Add incident needs

Create at least these needs:

```text
Drinking Water → 100 cases
Food Packs → 150 packs
First Aid Kits → 20 kits
```

Show the resulting **Needs list**.

## Add an operational update

Example:

```text
Floodwater remains elevated near the access road. Relief movement is possible through the eastern approach.
```

## Log inter-office coordination

Demonstrate at least two organizations.

Recommended:

```text
Office of Health Services
Coordination type: Medical support
Status: ACKNOWLEDGED
Note: Medical response team placed on standby.
```

and:

```text
Office of General Services
Coordination type: Transport resources
Status: ACKNOWLEDGED
Note: One utility vehicle available for dispatch.
```

Optional additional examples:

```text
DRRM Council
Red Cross Youth Council
University Housing / Homestay
```

### Explain

> Safe Sphere records not only the calamity itself, but also the operational needs and coordination history surrounding that incident.

Do not claim that each office currently has a dedicated independent workflow unless that functionality is actually being demonstrated. Inter-office coordination is principally recorded through the incident coordination log.

---

# 8. Phase 4 — Demonstrate Personnel Readiness

**Account:** Rescue Personnel or Volunteer  
**Route:** `/dashboard/personnel`

Set the responder to:

```text
Available for rescue / relief operations = Yes
Available until = future time, optional
Readiness note = Ready for deployment with relief movement team.
```

Click **Update readiness**.

Then switch to the Coordinator/DRRMO view.

Show that the responder now appears as available for assignment.

### Key point to explain

> Personnel availability is user-maintained but dispatch is controlled by authorized operational staff.

If time permits, demonstrate that an expired or unavailable responder cannot be selected for dispatch.

---

# 9. Phase 5 — Demonstrate Vehicle Availability

**Account:** Coordinator / DRRMO / authorized Logistics account  
**Route:** `/dashboard/logistics`

If the vehicle is not already prepared, register:

```text
SPHERE-RESCUE-01
Utility / Rescue Vehicle
DEMO-001
Relief goods + response personnel
```

Set the vehicle to **Available**.

### Explain

> Vehicle readiness is managed separately from personnel readiness. Both must be available before the system can reserve them for an active dispatch.

This is important because the original operational flow checks both personnel and vehicle resources.

---

# 10. Phase 6 — Donor Views the Need and Creates a Pledge

**Account:** Donor  
**Routes:** `/map`, then `/dashboard/donations`

First show the donor viewing the affected area or incident.

Then create a goods pledge:

```text
Donation type: GOODS
Target incident: Flash Flood near Musuan Gate
Item: Drinking Water
Quantity: 40
Unit: cases
Anonymous/Public: Public
Message: For families affected near Musuan Gate.
```

Click **Submit donation pledge**.

Open the resulting donation record.

### Show

- Donation code.
- Incident target.
- Donation type.
- Goods itemization.
- Current status.
- Donation timeline / chain of custody.

### Explain

> A donor contribution is not simply stored as one final status. Safe Sphere keeps the current state and a chronological event history so the movement of aid can later be audited and shown publicly.

---

# 11. Optional Phase — Demonstrate Fund Donation

Use this only if presentation time permits.

**Account:** Donor  
**Route:** `/dashboard/donations`

Create:

```text
Type: FUNDS
Amount: 1000 PHP
Payment method: Demo Bank Transfer
Reference: DEMO-TXN-001
```

### Important presentation wording

Do **not** state that the platform processes a real live electronic payment.

Correct explanation:

> Safe Sphere records a provider-neutral fund pledge, payment method, and transaction reference. Authorized staff verifies the payment before the donation advances. A live gateway such as PayMongo or Xendit can later be attached to this verification boundary.

This avoids overstating current functionality.

---

# 12. Phase 7 — Staff Confirms the Donation

**Account:** Coordinator / DRRMO Staff  
**Route:** `/dashboard/donations/[donation-id]`

Review the donor pledge.

Apply the appropriate transition so the donation becomes confirmed and eligible for logistics assignment.

### Show

- Donation status changes.
- Timeline receives another event.
- Goods itemization becomes protected after confirmation.

If practical, attempt to add another goods item after confirmation and show that the system rejects the invalid modification.

### Explain

> Once a pledge enters the operational chain, Safe Sphere protects the donation contents from uncontrolled modification.

This is a useful technical-defense demonstration because it proves workflow enforcement rather than only UI behavior.

---

# 13. Phase 8 — Create the Logistics Assignment

**Account:** Coordinator / DRRMO Staff  
**Route:** Donation detail or incident detail

Create an assignment using:

```text
Target: Current donation / incident
Responder: responder@demo
Vehicle: SPHERE-RESCUE-01
Instructions: Collect pledged water and deliver to designated recipient point.
```

Click **Create dispatch assignment** / **Assign logistics**.

### Immediately show

- Assignment is created.
- Responder is reserved.
- Vehicle is reserved.
- Reserved personnel are no longer considered available for another active assignment.
- Reserved vehicle is no longer available for another active assignment.

### Strong technical demonstration

Open another assignment form and show that the same busy responder/vehicle is no longer available for a second active dispatch.

### Explain

> Assignment creation is availability-aware. The database prevents one responder or vehicle from being dispatched to conflicting active tasks.

This is one of the strongest features to demonstrate during a defense.

---

# 14. Phase 9 — Assignee Accepts the Task

**Account:** Logistics or assigned Responder  
**Route:** `/dashboard/logistics`

Open the assignment queue.

Click **Accept**.

Show the assignment state after acceptance.

### Optional negative-path demonstration

If a second test assignment exists:

1. Assign it to another responder.
2. Click **Decline**.
3. Show that reserved resources are released.

Only demonstrate this if there is enough time. The main storyline should remain uninterrupted.

---

# 15. Phase 10 — Create and Advance the Aid Delivery

**Account:** Logistics  
**Route:** `/dashboard/logistics`

Create the delivery from the accepted assignment.

Select:

```text
Recipient: recipient@demo
Destination: Musuan Gate relief point
```

Then move through the valid delivery sequence:

```text
ASSIGNED
   ↓
PICKED_UP
   ↓
IN_TRANSIT
   ↓
DELIVERED
```

Do each transition separately so the audience can see the workflow.

### Explain

> Safe Sphere enforces the logistics state machine. Aid cannot jump directly from assignment to completed delivery without passing through its required operational stages.

### Optional validation demonstration

Try an invalid state jump on a disposable test record, or explain that the database rejects invalid transitions.

Do not intentionally break the main demonstration record.

---

# 16. Phase 11 — Recipient Digitally Confirms Receipt

**Account:** Recipient  
**Route:** `/dashboard/logistics`

Find the delivery awaiting confirmation.

Enter:

```text
Confirmation note:
Received 40 cases of drinking water in good condition.
```

Optional: upload the prepared small proof-of-delivery image.

Click **Confirm aid received**.

### This should automatically demonstrate several outcomes

Verify that:

```text
Delivery → Confirmed
Donation → Completed
Assignment → Completed
Responder → Released when no longer assigned
Vehicle → Released when no longer assigned
Donor → Completion notification generated
Transparency event → Added
```

### Explain

> Logistics can report that the aid reached the destination, but the final confirmation comes from the recipient. This closes the digital chain of custody.

This is the climax of the demonstration and should not be rushed.

---

# 17. Phase 12 — Show Public Donation Transparency

**Account:** None / public browser  
**Route:** `/transparency`

Locate the completed donation.

Show the public event chain.

Expected sequence resembles:

```text
Pledged
Confirmed
Assigned
Picked Up
In Transit
Delivered
Recipient Confirmed
Completed
```

Show:

- Donation code.
- Target incident.
- Donor label or anonymous identity handling.
- Donation type.
- Amount for fund donations where applicable.
- Public event notes.
- Event timestamps.

### Explain

> The public sees the accountability trail without receiving protected account information.

This directly demonstrates the central donation-transparency purpose of Safe Sphere.

---

# 18. Phase 13 — Show Dashboard Notifications

**Account:** Donor and/or operational account  
**Route:** `/dashboard`

Show relevant notification(s), especially the donor completion notification.

Examples:

```text
Assignment created
Aid delivered — confirmation required
Donation completed
```

Mark one as read if desired.

Keep this brief; notifications support the workflow rather than being the main feature.

---

# 19. Phase 14 — Show Reports and Audit Trail

**Account:** Admin  
**Route:** `/dashboard/reports`

Show:

- Current operational metrics.
- Open incident counts.
- Donation status counts.
- Delivery totals / confirmation metrics.
- Incident CSV export.
- Donation CSV export.
- Recent protected actions / audit logs.

### Explain

> Operational status is summarized for management, while critical system changes are separately recorded for accountability.

Do not spend too much time reading individual audit rows. The purpose is to prove the audit mechanism exists.

---

# 20. Phase 15 — Close the Incident

**Account:** DRRMO / Coordinator  
**Route:** `/dashboard/incidents/[incident-id]`

When the demonstration needs are satisfied:

1. Update the relevant need(s) as fulfilled.
2. Set the incident to the appropriate resolved/closed state.
3. Save the incident state.

Then return to:

```text
/map
```

Confirm that a closed incident is no longer shown as an active public-map incident when the configured query excludes closed records.

### Final explanation

> The same incident record has now completed its lifecycle from reporting and public situational awareness through resource coordination, donation delivery, recipient confirmation, accountability reporting, and closure.

This gives the demonstration a clear ending.

---

# 21. Recommended 15–20 Minute Defense Sequence

If presentation time is limited, use this exact order.

| Time | Demonstration |
|---:|---|
| 0:00–1:00 | Public map and system purpose |
| 1:00–3:30 | DRRMO creates incident |
| 3:30–5:00 | Needs + operational update + office coordination |
| 5:00–6:00 | Personnel and vehicle readiness |
| 6:00–8:00 | Donor creates goods pledge |
| 8:00–10:00 | Staff confirms pledge and assigns responder/vehicle |
| 10:00–12:30 | Logistics accepts and moves delivery through stages |
| 12:30–14:00 | Recipient confirms receipt |
| 14:00–15:30 | Public transparency timeline |
| 15:30–17:00 | Reports, audit, notifications |
| 17:00–18:00 | Incident closure + final map check |
| 18:00–20:00 | Technical questions / buffer |

Do not try to demonstrate every button. Demonstrate **state changes and cross-module effects**.

---

# 22. Recommended Presenter Roles

For a group defense, divide the demonstration by operational responsibility rather than by random pages.

### Presenter 1 — System overview / Public side

Covers:

- Landing page
- Public map
- Project objective
- Role-based architecture

### Presenter 2 — DRRMO / Incident command

Covers:

- Incident reporting
- Needs
- Incident updates
- Inter-office coordination

### Presenter 3 — Resources / Logistics

Covers:

- Personnel readiness
- Vehicle availability
- Assignment
- Delivery state progression

### Presenter 4 — Donation / Transparency

Covers:

- Donor pledge
- Recipient confirmation
- Public transparency timeline
- Reports/audit conclusion

If only one person presents, retain the same sequence but keep all demo browser sessions open beforehand.

---

# 23. What to Emphasize During Questions

## "Is this just CRUD?"

Recommended answer:

> No. CRUD operations exist underneath the interface, but core processes are state-controlled. Personnel and vehicles are reserved during assignments, donations have guarded transitions, deliveries follow a required sequence, recipient confirmation closes the donation chain, and public transparency is generated from append-only events rather than a single editable status field.

## "How is access controlled?"

Recommended answer:

> The interface uses role checks for usability, while Supabase PostgreSQL Row Level Security is the final database authorization boundary. Users can only access operations permitted by their roles and ownership relationships.

## "How is the map updated?"

Recommended answer:

> Incident geography is stored using PostGIS. MapLibre renders the client map using OpenFreeMap, and Supabase Realtime is used to refresh public incident changes.

## "Can a logistics user fake final receipt?"

Recommended answer:

> Logistics can mark the physical delivery as delivered, but final digital confirmation belongs to the assigned recipient. Recipient confirmation then completes the donation chain.

## "Can one vehicle be dispatched twice?"

Recommended answer:

> Active assignment creation reserves the vehicle and personnel. They remain unavailable until the active assignment is completed or cancelled and no other active assignment still holds them.

## "Does the system accept real online payments?"

Recommended answer:

> Safe Sphere implements provider-neutral fund pledging, transaction reference recording, and staff verification. A live payment provider can be integrated through the existing payment-verification boundary without redesigning the donation transparency workflow.

## "Why is there a public transparency page?"

Recommended answer:

> The public page exposes a sanitized donation chain of custody while hiding protected account information. It allows the community and donors to see how relief progresses from pledge through delivery and recipient confirmation.

---

# 24. Features That Should Not Be Overstated

During the defense, describe the current implementation exactly.

### Payment gateway

Current:

```text
Fund pledge + payment method/reference + authorized verification
```

Not yet:

```text
Live PayMongo/Xendit checkout and webhook settlement
```

### Inter-office coordination

Current:

```text
Structured incident coordination log
+ status
+ organization
+ notes
+ notifications where applicable
```

Not yet a separate full command dashboard for every external municipal office.

### Volunteer field incident reporting

Current incident creation is primarily controlled by:

```text
ADMIN
DRRMO_STAFF
COORDINATOR
```

Do not state that volunteers currently submit public incidents for DRRMO verification unless that feature has been added in a later version.

---

# 25. Failure-Recovery Plan for the Live Demonstration

Never rely on only one live path during a defense.

## If map tiles fail

Continue using the incident registry and incident details, and explain that map rendering depends on external tile connectivity while incident coordinates remain stored in PostGIS.

## If Supabase/Vercel connectivity fails

Have screenshots or a screen recording prepared showing:

1. incident creation,
2. public map,
3. donation pledge,
4. assignment,
5. delivery states,
6. recipient confirmation,
7. transparency timeline.

## If one role account fails to log in

Keep one ADMIN account available so the role can be verified/reassigned if necessary.

## If a responder or vehicle does not appear in assignment selection

Check:

```text
Responder availability = true
Availability expiry = still in the future
Vehicle availability = true
No active assignment already reserves the resource
```

## If donation cannot be assigned

Check that the donation has reached the required confirmed state.

## If recipient cannot confirm

Check that:

```text
Delivery recipient = currently signed-in recipient
Delivery status = DELIVERED
```

---

# 26. Best Demonstration Principle

The strongest Safe Sphere demonstration is not:

```text
"Here is the incident page."
"Here is the donation page."
"Here is the logistics page."
```

Instead demonstrate:

```text
One incident
    ↓ changes
One public map
    ↓ creates
One need
    ↓ attracts
One donation
    ↓ creates
One logistics assignment
    ↓ uses
One responder + one vehicle
    ↓ transports
One delivery
    ↓ requires
One recipient confirmation
    ↓ produces
One complete public transparency record
```

That sequence demonstrates the actual value of the system: **coordination between people, resources, disaster information, donations, logistics, and accountability through one shared operational platform.**

---

# 27. Final Demo Checklist

Immediately before presenting:

- [ ] Public map open in one browser.
- [ ] DRRMO dashboard already signed in.
- [ ] Coordinator dashboard already signed in.
- [ ] Donor dashboard already signed in.
- [ ] Responder dashboard already signed in.
- [ ] Logistics dashboard already signed in.
- [ ] Recipient dashboard already signed in.
- [ ] Admin Reports page ready in another tab.
- [ ] Demo incident values copied into a presenter note.
- [ ] Vehicle details copied into a presenter note.
- [ ] Donation details copied into a presenter note.
- [ ] Proof-of-delivery image available locally.
- [ ] Internet stable.
- [ ] Old assignments cleared.
- [ ] Responder available.
- [ ] Vehicle available.
- [ ] Browser notifications muted.
- [ ] Backup recording/screenshots ready.

---

## Recommended final line during the defense

> Safe Sphere demonstrates the complete operational chain from verified calamity information to resource coordination, donation tracking, physical aid delivery, recipient confirmation, and public accountability in one role-controlled platform.
