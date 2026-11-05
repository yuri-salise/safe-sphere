import { acceptAssignmentAction, cancelAssignmentAction, completeAssignmentAction, confirmDeliveryAction, createVehicleAction, updateDeliveryStatusAction, updateVehicleAvailabilityAction } from "@/app/actions/logistics";
import { DeliveryCreateForm } from "@/components/logistics/delivery-create-form";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { hasAnyRole, requireUserContext } from "@/lib/auth";
import { formatDateTime, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { SubmitButton } from "@/components/ui/submit-button";

const staffRoles: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR"];
const logisticsRoles: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR", "LOGISTICS"];

function nextDeliveryStatuses(status: string) {
  switch (status) {
    case "PENDING": return ["ASSIGNED", "FAILED"];
    case "ASSIGNED": return ["PICKED_UP", "FAILED"];
    case "PICKED_UP": return ["IN_TRANSIT", "FAILED"];
    case "IN_TRANSIT": return ["DELIVERED", "FAILED"];
    default: return [];
  }
}

export default async function LogisticsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const context = await requireUserContext();
  const supabase = await createClient();
  const canRegisterVehicles = hasAnyRole(context.roles, staffRoles);
  const canManageLogistics = hasAnyRole(context.roles, logisticsRoles);

  const [assignmentsResult, deliveriesResult, confirmationsResult, vehiclesResult, vehicleAvailabilityResult, donationsResult, profilesResult, rolesResult] = await Promise.all([
    supabase.from("logistics_assignments").select("*").order("created_at", { ascending: false }),
    supabase.from("deliveries").select("*").order("created_at", { ascending: false }),
    supabase.from("delivery_confirmations").select("id, delivery_id, confirmed_by, confirmation_note, proof_path, confirmed_at").order("confirmed_at", { ascending: false }),
    supabase.from("vehicles").select("*").eq("is_active", true).order("asset_code"),
    supabase.from("vehicle_availability").select("*").order("updated_at", { ascending: false }),
    supabase.from("donations").select("id, code, current_status, review_status, incident_id").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, phone, organization").order("display_name"),
    canManageLogistics ? supabase.from("user_roles").select("user_id, role") : Promise.resolve({ data: [] }),
  ]);

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const vehicles = new Map((vehiclesResult.data ?? []).map((vehicle) => [vehicle.id, vehicle]));
  const availability = new Map((vehicleAvailabilityResult.data ?? []).map((row) => [row.vehicle_id, row]));
  const donations = new Map((donationsResult.data ?? []).map((donation) => [donation.id, donation]));
  const assignments = assignmentsResult.data ?? [];
  const deliveries = deliveriesResult.data ?? [];
  const confirmations = new Map((confirmationsResult.data ?? []).map((row) => [row.delivery_id, row]));
  const proofEntries = await Promise.all((confirmationsResult.data ?? []).filter((row) => row.proof_path).map(async (row) => {
    const { data } = await supabase.storage.from("delivery-proofs").createSignedUrl(row.proof_path as string, 600);
    return [row.delivery_id, data?.signedUrl ?? null] as const;
  }));
  const proofUrls = new Map(proofEntries);
  const availableDonations = (donationsResult.data ?? []).filter((donation) => donation.review_status === "APPROVED" && !["COMPLETED", "CANCELLED"].includes(donation.current_status));
  const recipientIds = new Set((rolesResult.data ?? []).filter((row) => ["RECIPIENT", "COORDINATOR", "DRRMO_STAFF", "ADMIN"].includes(row.role)).map((row) => row.user_id));
  const recipients = (profilesResult.data ?? []).filter((profile) => recipientIds.has(profile.id));

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="dashboard-topline">
        <div><span className="eyebrow">Movement control</span><h1>Logistics & delivery</h1><p className="lede dashboard-lede">Coordinate assignments, vehicles, pickup, transit, delivery, and digital recipient confirmation.</p></div>
        <DataBadge tone="green">{assignments.filter((row) => row.status !== "COMPLETED" && row.status !== "CANCELLED").length} active assignments</DataBadge>
      </div>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Assignment queue</span><h2>Relief and response tasks</h2></div></div>
        {!assignments.length ? <EmptyState title="No logistics assignments" text="Incident and donation assignments created by coordinators will appear here." /> : (
          <div className="assignment-grid">
            {assignments.map((assignment) => {
              const assignee = profiles.get(assignment.assigned_to);
              const vehicle = assignment.vehicle_id ? vehicles.get(assignment.vehicle_id) : null;
              const donation = assignment.donation_id ? donations.get(assignment.donation_id) : null;
              const isMine = assignment.assigned_to === context.user.id;
              const isDonationAssignment = Boolean(assignment.donation_id);
              const hasActiveDelivery = deliveries.some((delivery) =>
                delivery.logistics_assignment_id === assignment.id &&
                ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(delivery.status),
              );
              const canFinishIncidentAssignment =
                !isDonationAssignment &&
                assignment.status === "ACCEPTED" &&
                (isMine || hasAnyRole(context.roles, staffRoles));
              const canCancelAssignment =
                (isMine || hasAnyRole(context.roles, staffRoles)) &&
                assignment.status !== "COMPLETED" &&
                assignment.status !== "CANCELLED" &&
                !(isDonationAssignment && hasActiveDelivery);
              return (
                <article className="assignment-card" key={assignment.id}>
                  <div className="assignment-head"><DataBadge tone={assignment.status === "COMPLETED" ? "green" : assignment.status === "CANCELLED" ? "red" : assignment.status === "ACCEPTED" ? "yellow" : "neutral"}>{titleCaseStatus(assignment.status || "PENDING")}</DataBadge><small>{formatDateTime(assignment.created_at)}</small></div>
                  <strong>{donation ? `Donation ${donation.code}` : "Incident response assignment"}</strong>
                  <span>Assignee: {assignee?.display_name || assignment.assigned_to}</span>
                  <span>Vehicle: {vehicle ? `${vehicle.asset_code} — ${vehicle.vehicle_type}` : "Not assigned"}</span>
                  <p>{assignment.instructions || "No additional instructions."}</p>
                  <div className="inline-actions">
                    {isMine && assignment.status === "PENDING" && <form action={acceptAssignmentAction}><input type="hidden" name="assignment_id" value={assignment.id} /><SubmitButton className="mini-button" pendingText="Accepting…">Accept</SubmitButton></form>}
                    {canFinishIncidentAssignment && <form action={completeAssignmentAction}><input type="hidden" name="assignment_id" value={assignment.id} /><SubmitButton className="mini-button" pendingText="Completing…">Complete</SubmitButton></form>}
                    {canCancelAssignment && <form action={cancelAssignmentAction}><input type="hidden" name="assignment_id" value={assignment.id} /><SubmitButton className="mini-button danger" pendingText="Updating…">{isMine && !hasAnyRole(context.roles, staffRoles) ? "Decline" : "Cancel"}</SubmitButton></form>}
                  </div>
                  {isDonationAssignment && assignment.status === "ACCEPTED" && (
                    <small className="muted-text">Donation assignments complete automatically after the recipient confirms delivery.</small>
                  )}
                  {isDonationAssignment && hasActiveDelivery && (
                    <small className="muted-text">This assignment cannot be cancelled while its delivery is active.</small>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </article>

      <div className="dashboard-grid module-section">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Vehicle availability</span><h2>Transport resources</h2></div></div>
          {!vehiclesResult.data?.length ? <EmptyState title="No vehicles registered" text="Response coordinators can register transport resources." /> : (
            <div className="stack-list">
              {vehiclesResult.data.map((vehicle) => {
                const state = availability.get(vehicle.id);
                return <div className="vehicle-card" key={vehicle.id}><div><strong>{vehicle.asset_code} — {vehicle.vehicle_type}</strong><span>{vehicle.plate_number || "No plate listed"} • {vehicle.capacity_note || "No capacity note"}</span></div><DataBadge tone={state?.is_available ? "green" : "neutral"}>{state?.is_available ? "Available" : "Unavailable"}</DataBadge>{canManageLogistics && <form className="inline-form full-inline-form" action={updateVehicleAvailabilityAction}><input type="hidden" name="vehicle_id" value={vehicle.id} /><label className="checkbox-field"><input type="checkbox" name="is_available" defaultChecked={state?.is_available ?? false} /> Available</label><input name="status_note" defaultValue={state?.status_note || ""} placeholder="Status note" /><SubmitButton className="mini-button" pendingText="Saving…">Save</SubmitButton></form>}</div>;
              })}
            </div>
          )}
          {canRegisterVehicles && <form className="data-form subform" action={createVehicleAction}><div className="form-grid form-grid-2"><label>Asset code<input name="asset_code" required placeholder="SSF-VEH-01" /></label><label>Vehicle type<input name="vehicle_type" required placeholder="Pickup, ambulance, van…" /></label><label>Plate number<input name="plate_number" /></label><label>Capacity note<input name="capacity_note" placeholder="8 passengers / 1 ton…" /></label></div><SubmitButton className="button button-ghost" pendingText="Registering vehicle…">Register vehicle</SubmitButton></form>}
        </article>

        {canManageLogistics && (
          <article className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Delivery setup</span><h2>Create aid delivery</h2></div></div>
            <DeliveryCreateForm
              donations={availableDonations.map(({ id, code, current_status }) => ({ id, code, current_status }))}
              assignments={assignments.map((assignment) => ({
                id: assignment.id,
                donation_id: assignment.donation_id,
                assignee_name: profiles.get(assignment.assigned_to)?.display_name || "Assignee",
                status: assignment.status || "PENDING",
              }))}
              recipients={recipients.map(({ id, display_name }) => ({ id, display_name }))}
            />
          </article>
        )}
      </div>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Aid distribution</span><h2>Delivery tracking & confirmation</h2></div><span className="record-count">{deliveries.length} deliveries</span></div>
        {!deliveries.length ? <EmptyState title="No deliveries" text="Create a delivery after a donation has been assigned for transport." /> : (
          <div className="delivery-grid">
            {deliveries.map((delivery) => {
              const donation = donations.get(delivery.donation_id);
              const recipient = delivery.recipient_id ? profiles.get(delivery.recipient_id) : null;
              const canConfirm = delivery.recipient_id === context.user.id && delivery.status === "DELIVERED";
              const confirmation = confirmations.get(delivery.id);
              const proofUrl = proofUrls.get(delivery.id);
              const nextStatuses = nextDeliveryStatuses(delivery.status);
              return (
                <article className="delivery-card" key={delivery.id}>
                  <div className="delivery-head"><strong>{donation?.code || "Donation"}</strong><DataBadge tone={delivery.status === "CONFIRMED" ? "green" : delivery.status === "FAILED" ? "red" : "yellow"}>{titleCaseStatus(delivery.status)}</DataBadge></div>
                  <dl className="mini-detail-list"><div><dt>Recipient</dt><dd>{recipient?.display_name || "Not assigned"}</dd></div><div><dt>Destination</dt><dd>{delivery.destination_label || "Not specified"}</dd></div><div><dt>Picked up</dt><dd>{formatDateTime(delivery.picked_up_at)}</dd></div><div><dt>Delivered</dt><dd>{formatDateTime(delivery.delivered_at)}</dd></div></dl>
                  {canManageLogistics && nextStatuses.length > 0 && <form className="inline-form full-inline-form" action={updateDeliveryStatusAction}><input type="hidden" name="delivery_id" value={delivery.id} /><select name="status" defaultValue={nextStatuses[0]}>{nextStatuses.map((status) => <option key={status} value={status}>{titleCaseStatus(status)}</option>)}</select><SubmitButton className="mini-button" pendingText="Updating…">Update status</SubmitButton></form>}
                  {confirmation && <div className="confirmation-receipt"><strong>Digitally confirmed</strong><span>{formatDateTime(confirmation.confirmed_at)}</span><p>{confirmation.confirmation_note || "Recipient confirmed receipt of aid."}</p>{proofUrl && <a className="text-link" href={proofUrl} target="_blank" rel="noreferrer">View confirmation proof ↗</a>}</div>}
                  {canConfirm && <form className="data-form confirmation-form" action={confirmDeliveryAction}><input type="hidden" name="delivery_id" value={delivery.id} /><label>Confirmation note<textarea name="confirmation_note" rows={2} placeholder="Aid received in good condition…" /></label><label>Optional proof (max 3 MB)<input type="file" name="proof" accept="image/jpeg,image/png,image/webp,application/pdf" /></label><SubmitButton className="button button-green" pendingText="Confirming receipt…">Confirm aid received</SubmitButton></form>}
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
