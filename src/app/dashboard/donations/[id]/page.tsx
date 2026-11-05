import Link from "next/link";
import { notFound } from "next/navigation";
import { addDonationItemAction, updateDonationStatusAction } from "@/app/actions/donations";
import { createAssignmentAction } from "@/app/actions/logistics";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { hasAnyRole, requireUserContext } from "@/lib/auth";
import { formatDateTime, formatMoney, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { SubmitButton } from "@/components/ui/submit-button";

const managers: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR", "LOGISTICS"];
const coordinators: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR"];

export default async function DonationDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const context = await requireUserContext();
  const supabase = await createClient();
  const canManage = hasAnyRole(context.roles, managers);
  const canAssign = hasAnyRole(context.roles, coordinators);

  const [donationResult, itemsResult, eventsResult, incidentResult, profilesResult, rolesResult, availabilityResult, vehiclesResult, vehicleAvailabilityResult] = await Promise.all([
    supabase.from("donations").select("*").eq("id", id).maybeSingle(),
    supabase.from("donation_items").select("*").eq("donation_id", id).order("id"),
    supabase.from("donation_events").select("id, event_type, public_note, created_at, performed_by").eq("donation_id", id).order("created_at", { ascending: true }),
    supabase.from("incidents").select("id, code, title, status").order("updated_at", { ascending: false }),
    canAssign ? supabase.from("profiles").select("id, display_name").eq("is_active", true).order("display_name") : Promise.resolve({ data: [] }),
    canAssign ? supabase.from("user_roles").select("user_id, role") : Promise.resolve({ data: [] }),
    canAssign ? supabase.from("personnel_availability").select("person_id, is_available, available_until").eq("is_available", true) : Promise.resolve({ data: [] }),
    canAssign ? supabase.from("vehicles").select("id, asset_code, vehicle_type").eq("is_active", true).order("asset_code") : Promise.resolve({ data: [] }),
    canAssign ? supabase.from("vehicle_availability").select("vehicle_id, is_available").eq("is_available", true) : Promise.resolve({ data: [] }),
  ]);

  const donation = donationResult.data;
  if (!donation) notFound();
  const incident = (incidentResult.data ?? []).find((row) => row.id === donation.incident_id);
  const roleUserIds = new Set((rolesResult.data ?? []).filter((row) => ["LOGISTICS", "VOLUNTEER", "RESCUE_PERSONNEL"].includes(row.role)).map((row) => row.user_id));
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const availablePersonnelIds = new Set(
    (availabilityResult.data ?? [])
      .filter((row) => !row.available_until || new Date(row.available_until).getTime() > now)
      .map((row) => row.person_id),
  );
  const assignees = (profilesResult.data ?? []).filter((profile) => roleUserIds.has(profile.id) && availablePersonnelIds.has(profile.id));
  const availableVehicleIds = new Set((vehicleAvailabilityResult.data ?? []).map((row) => row.vehicle_id));
  const availableVehicles = (vehiclesResult.data ?? []).filter((vehicle) => availableVehicleIds.has(vehicle.id));
  const isOwner = donation.donor_id === context.user.id;
  const assignmentReady = donation.review_status === "APPROVED"
    && ["CONFIRMED", "FAILED_PICKUP", "DELIVERY_FAILED"].includes(donation.current_status)
    && !["NEEDS_MET", "CLOSED"].includes(incident?.status || "");
  const manualStatusOptions = donation.review_status !== "APPROVED" ? [] : donation.current_status === "PLEDGED"
    ? ["CONFIRMED", "CANCELLED"]
    : donation.current_status === "CONFIRMED"
      ? ["CANCELLED"]
      : [];

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="detail-back"><Link className="text-link" href="/dashboard/donations">← Donation registry</Link></div>
      <div className="dashboard-topline">
        <div><span className="eyebrow">{donation.code}</span><h1>Donation record</h1><p className="lede dashboard-lede">{incident ? `${incident.code} — ${incident.title}` : "General relief"}</p></div>
        <DataBadge tone={donation.current_status === "COMPLETED" ? "green" : donation.current_status.includes("FAILED") || donation.current_status === "CANCELLED" ? "red" : "yellow"}>{titleCaseStatus(donation.current_status)}</DataBadge>
      </div>

      <div className="detail-grid">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Pledge details</span><h2>{titleCaseStatus(donation.donation_type)} contribution</h2></div></div>
          <dl className="detail-list">
            <div><dt>Amount</dt><dd>{donation.donation_type === "FUNDS" ? formatMoney(donation.amount, donation.currency || "PHP") : "Goods donation"}</dd></div>
            <div><dt>Approval</dt><dd>{donation.review_status === "PENDING" ? "Needs admin approval" : titleCaseStatus(donation.review_status)}</dd></div>
            <div><dt>Public identity</dt><dd>{donation.is_anonymous ? "Anonymous donor" : "Donor name may be shown"}</dd></div>
            <div><dt>Payment method</dt><dd>{donation.payment_method || "—"}</dd></div>
            <div><dt>Reference</dt><dd>{donation.payment_reference || "—"}</dd></div>
            <div><dt>Payment verified</dt><dd>{donation.payment_verified_at ? formatDateTime(donation.payment_verified_at) : "Not yet verified"}</dd></div>
            <div><dt>Pledged</dt><dd>{formatDateTime(donation.created_at)}</dd></div>
            <div><dt>Message</dt><dd>{donation.donor_message || "—"}</dd></div>
          </dl>
        </article>

        {canManage && (
          <article className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Custody control</span><h2>Workflow state</h2></div></div>
            {manualStatusOptions.length ? (
              <form className="data-form compact-form" action={updateDonationStatusAction}>
                <input type="hidden" name="donation_id" value={id} />
                <label>Next action<select name="status" defaultValue={manualStatusOptions[0]}>{manualStatusOptions.map((status) => <option key={status} value={status}>{titleCaseStatus(status)}</option>)}</select></label>
                <label>Public timeline note<textarea name="public_note" rows={3} placeholder="Optional public-facing context for this status event" /></label>
                <SubmitButton className="button button-green" pendingText="Applying transition…">Apply transition</SubmitButton>
              </form>
            ) : (
              <p className="public-copy">{donation.review_status === "PENDING" ? "Administrator approval is required before processing." : donation.review_status === "REJECTED" ? "This pledge was rejected and cannot be processed." : "Pickup, transit, delivery, and completion states are synchronized from logistics activity and recipient confirmation."}</p>
            )}
          </article>
        )}
      </div>

      <div className="dashboard-grid module-section">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Contents</span><h2>Donation items</h2></div></div>
          {!itemsResult.data?.length ? <EmptyState title="No goods itemization" text={donation.donation_type === "FUNDS" ? "This is a funds donation." : "Add the donated goods below."} /> : (
            <div className="stack-list">{itemsResult.data.map((item) => <div className="simple-record" key={item.id}><div><strong>{item.item_name}</strong><span>{item.notes || "No notes"}</span></div><b>{item.quantity} {item.unit}</b></div>)}</div>
          )}
          {donation.donation_type === "GOODS" && isOwner && donation.current_status === "PLEDGED" && donation.review_status !== "REJECTED" && (
            <form className="data-form subform" action={addDonationItemAction}><input type="hidden" name="donation_id" value={id} /><div className="form-grid form-grid-3"><label>Item<input name="item_name" required /></label><label>Quantity<input name="quantity" type="number" min="0.01" step="any" required /></label><label>Unit<input name="unit" required /></label></div><label>Notes<input name="notes" /></label><SubmitButton className="button button-ghost" pendingText="Adding item…">Add item</SubmitButton></form>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Transparency</span><h2>Chain of custody</h2></div></div>
          {donation.review_status === "PENDING" && <p className="form-note">These events become public only after administrator approval.</p>}
          {!eventsResult.data?.length ? <EmptyState title="No timeline events" text="Status events will appear here." /> : (
            <ol className="timeline-list">{eventsResult.data.map((event) => <li key={event.id}><i /><div><strong>{titleCaseStatus(event.event_type)}</strong><span>{event.public_note || "Status recorded"}</span><small>{formatDateTime(event.created_at)}</small></div></li>)}</ol>
          )}
        </article>
      </div>

      {canAssign && assignmentReady && (
        <article className="panel-card module-section">
          <div className="panel-heading"><div><span className="eyebrow">Logistics handoff</span><h2>Assign relief movement</h2></div><Link className="text-link" href="/dashboard/logistics">Open logistics →</Link></div>
          <form className="data-form" action={createAssignmentAction}>
            <input type="hidden" name="donation_id" value={id} /><input type="hidden" name="incident_id" value={donation.incident_id || ""} /><input type="hidden" name="return_path" value={`/dashboard/donations/${id}`} />
            <div className="resource-summary"><DataBadge tone={assignees.length ? "green" : "red"}>{assignees.length} personnel available</DataBadge><DataBadge tone={availableVehicles.length ? "green" : "neutral"}>{availableVehicles.length} vehicles available</DataBadge>{!assignees.length && <span>No eligible responder/logistics personnel are currently available.</span>}</div>
            <div className="form-grid form-grid-3"><label>Assignee<select name="assigned_to" defaultValue="" required><option value="" disabled>Select logistics/responder</option>{assignees.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.id}</option>)}</select></label><label>Vehicle<select name="vehicle_id" defaultValue=""><option value="">No vehicle</option>{availableVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.asset_code} — {vehicle.vehicle_type}</option>)}</select></label><label>Instructions<input name="instructions" placeholder="Pickup location, contact, destination…" /></label></div>
            <SubmitButton className="button button-green" disabled={!assignees.length} pendingText="Assigning logistics…">Assign logistics</SubmitButton>
          </form>
        </article>
      )}
    </section>
  );
}
