import Link from "next/link";
import { notFound } from "next/navigation";
import { addIncidentNeedAction, addIncidentUpdateAction, logIncidentCoordinationAction, updateIncidentNeedAction, updateIncidentStateAction } from "@/app/actions/incidents";
import { createAssignmentAction } from "@/app/actions/logistics";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { hasAnyRole, requireUserContext } from "@/lib/auth";
import { formatDateTime, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { SubmitButton } from "@/components/ui/submit-button";

const staffRoles: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR"];

export default async function IncidentDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const context = await requireUserContext();
  const supabase = await createClient();
  const canManage = hasAnyRole(context.roles, staffRoles);

  const [incidentResult, needsResult, updatesResult, coordinationResult, profilesResult, rolesResult, availabilityResult, vehiclesResult, vehicleAvailabilityResult] = await Promise.all([
    supabase.from("incidents").select("*").eq("id", id).maybeSingle(),
    supabase.from("incident_needs").select("*").eq("incident_id", id).order("created_at", { ascending: true }),
    supabase.from("incident_updates").select("id, message, status, severity, created_at, created_by").eq("incident_id", id).order("created_at", { ascending: false }),
    canManage ? supabase.from("incident_coordination").select("id, organization, coordination_type, status, note, created_at").eq("incident_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    canManage ? supabase.from("profiles").select("id, display_name, phone, organization").eq("is_active", true).order("display_name") : Promise.resolve({ data: [] }),
    canManage ? supabase.from("user_roles").select("user_id, role") : Promise.resolve({ data: [] }),
    canManage ? supabase.from("personnel_availability").select("person_id, is_available, available_until").eq("is_available", true) : Promise.resolve({ data: [] }),
    canManage ? supabase.from("vehicles").select("id, asset_code, vehicle_type").eq("is_active", true).order("asset_code") : Promise.resolve({ data: [] }),
    canManage ? supabase.from("vehicle_availability").select("vehicle_id, is_available").eq("is_available", true) : Promise.resolve({ data: [] }),
  ]);

  const incident = incidentResult.data;
  if (!incident) notFound();

  const operationalRoleUsers = new Set(
    (rolesResult.data ?? [])
      .filter((row) => ["VOLUNTEER", "RESCUE_PERSONNEL", "LOGISTICS", "COORDINATOR", "DRRMO_STAFF"].includes(row.role))
      .map((row) => row.user_id),
  );
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const availablePersonnelIds = new Set(
    (availabilityResult.data ?? [])
      .filter((row) => !row.available_until || new Date(row.available_until).getTime() > now)
      .map((row) => row.person_id),
  );
  const responders = (profilesResult.data ?? []).filter((profile) => operationalRoleUsers.has(profile.id) && availablePersonnelIds.has(profile.id));
  const availableVehicleIds = new Set((vehicleAvailabilityResult.data ?? []).map((row) => row.vehicle_id));
  const availableVehicles = (vehiclesResult.data ?? []).filter((vehicle) => availableVehicleIds.has(vehicle.id));

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="detail-back"><Link className="text-link" href="/dashboard/incidents">← Incident registry</Link></div>
      <div className="dashboard-topline">
        <div>
          <span className="eyebrow">{incident.code}</span>
          <h1>{incident.title}</h1>
          <p className="lede dashboard-lede">{incident.location_label || "No location label"} • {incident.incident_type}</p>
        </div>
        <div className="detail-badges"><DataBadge tone={incident.severity === "CRITICAL" ? "red" : incident.severity === "HIGH" ? "orange" : incident.severity === "MODERATE" ? "yellow" : "green"}>{incident.severity}</DataBadge><DataBadge>{titleCaseStatus(incident.status)}</DataBadge></div>
      </div>

      <div className="detail-grid">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Incident facts</span><h2>Current operational state</h2></div></div>
          <dl className="detail-list">
            <div><dt>Description</dt><dd>{incident.description || "No description provided."}</dd></div>
            <div><dt>Estimated affected</dt><dd>{incident.estimated_affected}</dd></div>
            <div><dt>Public map</dt><dd>{incident.is_public ? "Visible" : "Restricted"}</dd></div>
            <div><dt>Review</dt><dd>{titleCaseStatus(incident.review_status)}</dd></div>
            <div><dt>Verified</dt><dd>{incident.verified_at ? formatDateTime(incident.verified_at) : "Pending verification"}</dd></div>
            <div><dt>Updated</dt><dd>{formatDateTime(incident.updated_at)}</dd></div>
          </dl>
        </article>

        {canManage && (
          <article className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Command controls</span><h2>Update incident state</h2></div></div>
            <form className="data-form compact-form" action={updateIncidentStateAction}>
              <input type="hidden" name="incident_id" value={id} />
              <div className="form-grid form-grid-2">
                <label>Status<select name="status" defaultValue={incident.status}><option value="REPORTED">Reported</option><option value="VERIFIED">Verified</option><option value="ACTIVE">Active</option><option value="RESPONSE_ONGOING">Response ongoing</option><option value="NEEDS_MET">Needs met</option><option value="CLOSED">Closed</option></select></label>
                <label>Severity<select name="severity" defaultValue={incident.severity}><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
                <label>Estimated affected<input name="estimated_affected" type="number" min="0" defaultValue={incident.estimated_affected} /></label>
                <label>Location label<input name="location_label" defaultValue={incident.location_label || ""} /></label>
                <label className="checkbox-field"><input name="verified" type="checkbox" defaultChecked={Boolean(incident.verified_at)} /> Verified by DRRMO/coordinator</label>
              </div>
              <SubmitButton className="button button-green" pendingText="Saving state…">Save incident state</SubmitButton>
            </form>
          </article>
        )}
      </div>

      <div className="dashboard-grid module-section">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Needs list</span><h2>Required aid and resources</h2></div></div>
          {!needsResult.data?.length ? <EmptyState title="No needs recorded" text="Add food, water, medical, shelter, transport, or other requirements." /> : (
            <div className="stack-list">
              {needsResult.data.map((need) => {
                const needed = Number(need.quantity_needed ?? 0);
                const met = Number(need.quantity_met ?? 0);
                const progress = needed > 0 ? Math.min(100, Math.round((met / needed) * 100)) : (need.is_resolved ? 100 : 0);
                return (
                  <div className="need-card" key={need.id}>
                    <div className="need-head"><div><strong>{need.category}</strong><span>{need.description || "No additional description"}</span></div><DataBadge tone={need.is_resolved ? "green" : "yellow"}>{need.is_resolved ? "Resolved" : "Open"}</DataBadge></div>
                    <div className="progress-bar"><i style={{ width: `${progress}%` }} /></div>
                    <small>{met} / {needed || "—"} {need.unit || ""} met</small>
                    {canManage && (
                      <form className="inline-form" action={updateIncidentNeedAction}>
                        <input type="hidden" name="incident_id" value={id} /><input type="hidden" name="need_id" value={need.id} />
                        <input name="quantity_met" type="number" min="0" step="any" defaultValue={met} aria-label={`Quantity met for ${need.category}`} />
                        <label className="checkbox-field"><input name="is_resolved" type="checkbox" defaultChecked={need.is_resolved} /> Resolved</label>
                        <SubmitButton className="mini-button" pendingText="Updating…">Update</SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {canManage && (
            <form className="data-form subform" action={addIncidentNeedAction}>
              <input type="hidden" name="incident_id" value={id} />
              <div className="form-grid form-grid-2"><label>Need category<input name="category" required placeholder="Water, medicine, transport…" /></label><label>Description<input name="description" /></label><label>Quantity needed<input name="quantity_needed" type="number" min="0" step="any" /></label><label>Unit<input name="unit" placeholder="packs, liters, units…" /></label></div>
              <SubmitButton className="button button-ghost" pendingText="Adding need…">Add need</SubmitButton>
            </form>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Timeline</span><h2>Incident updates</h2></div></div>
          {canManage && (
            <form className="data-form subform subform-top" action={addIncidentUpdateAction}>
              <input type="hidden" name="incident_id" value={id} />
              <label>Operational update<textarea name="message" rows={3} required placeholder="What changed, what was verified, or what action was taken?" /></label>
              <SubmitButton className="button button-ghost" pendingText="Recording…">Record update</SubmitButton>
            </form>
          )}
          {!updatesResult.data?.length ? <EmptyState title="No updates recorded" text="Status changes and field notes will form the incident history." /> : (
            <ol className="timeline-list">
              {updatesResult.data.map((update) => (
                <li key={update.id}><i /><div><strong>{update.message}</strong><span>{formatDateTime(update.created_at)}</span>{(update.status || update.severity) && <small>{update.status ? titleCaseStatus(update.status) : ""} {update.severity || ""}</small>}</div></li>
              ))}
            </ol>
          )}
        </article>
      </div>

      {canManage && (
        <article className="panel-card module-section">
          <div className="panel-heading"><div><span className="eyebrow">Inter-office coordination</span><h2>Coordination log</h2></div></div>
          <form className="data-form" action={logIncidentCoordinationAction}>
            <input type="hidden" name="incident_id" value={id} />
            <div className="form-grid form-grid-3">
              <label>Office / organization<select name="organization" defaultValue="DRRM Council"><option>DRRM Council</option><option>Red Cross Youth Council</option><option>Office of Health Services</option><option>Office of General Services</option><option>University Housing / Homestay</option><option>Other</option></select></label>
              <label>Coordination type<select name="coordination_type" defaultValue="NOTIFICATION"><option value="NOTIFICATION">Notification</option><option value="FIRST_AID">First aid</option><option value="MEDICAL_SUPPORT">Medical support</option><option value="VEHICLE_REQUEST">Vehicle request</option><option value="RELIEF_TEAM">Relief team activation</option><option value="RESOURCE_REQUEST">Resource request</option></select></label>
              <label>Status<select name="coordination_status" defaultValue="CONTACTED"><option value="CONTACTED">Contacted</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="DISPATCHED">Dispatched</option><option value="UNAVAILABLE">Unavailable</option><option value="COMPLETED">Completed</option></select></label>
            </div>
            <label>Coordination note<input name="coordination_note" placeholder="Report reference, requested support, vehicle response, first-aid action…" /></label>
            <SubmitButton className="button button-ghost" pendingText="Logging…">Log coordination</SubmitButton>
          </form>
          {(coordinationResult.data ?? []).length > 0 && <div className="coordination-list">{(coordinationResult.data ?? []).map((entry) => <div className="simple-record" key={entry.id}><div><strong>{entry.organization} — {titleCaseStatus(entry.coordination_type)}</strong><span>{entry.note || "No note"} • {formatDateTime(entry.created_at)}</span></div><DataBadge tone={entry.status === "COMPLETED" || entry.status === "DISPATCHED" ? "green" : entry.status === "UNAVAILABLE" ? "red" : "yellow"}>{titleCaseStatus(entry.status)}</DataBadge></div>)}</div>}
        </article>
      )}

      {canManage && (
        <article className="panel-card module-section">
          <div className="panel-heading"><div><span className="eyebrow">Resource dispatch</span><h2>Assign responder and vehicle</h2></div><Link className="text-link" href="/dashboard/logistics">Open logistics →</Link></div>
          <div className="resource-summary"><DataBadge tone={responders.length ? "green" : "red"}>{responders.length} responders available</DataBadge><DataBadge tone={availableVehicles.length ? "green" : "neutral"}>{availableVehicles.length} vehicles available</DataBadge>{!responders.length && <span>No available personnel are currently eligible for dispatch. Record a resource request in the coordination log above.</span>}</div>
          <form className="data-form" action={createAssignmentAction}>
            <input type="hidden" name="incident_id" value={id} /><input type="hidden" name="return_path" value={`/dashboard/incidents/${id}`} />
            <div className="form-grid form-grid-3">
              <label>Assignee<select name="assigned_to" required defaultValue=""><option value="" disabled>Select responder</option>{responders.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.id}</option>)}</select></label>
              <label>Vehicle<select name="vehicle_id" defaultValue=""><option value="">No vehicle</option>{availableVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.asset_code} — {vehicle.vehicle_type}</option>)}</select></label>
              <label>Instructions<input name="instructions" placeholder="Task, rendezvous point, priority…" /></label>
            </div>
            <SubmitButton className="button button-green" disabled={!responders.length} pendingText="Creating assignment…">Create dispatch assignment</SubmitButton>
          </form>
        </article>
      )}
    </section>
  );
}
