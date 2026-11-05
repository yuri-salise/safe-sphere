import Link from "next/link";
import { IncidentLocationPicker } from "@/components/map/incident-location-picker";
import { createIncidentAction, submitIncidentReportAction } from "@/app/actions/incidents";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { hasAnyRole, requireUserContext } from "@/lib/auth";
import { formatDateTime, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { SubmitButton } from "@/components/ui/submit-button";

const staffRoles: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR"];

function severityTone(severity: string) {
  if (severity === "CRITICAL") return "red" as const;
  if (severity === "HIGH") return "orange" as const;
  if (severity === "MODERATE") return "yellow" as const;
  return "green" as const;
}

export default async function IncidentsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const context = await requireUserContext();
  const supabase = await createClient();
  const canManage = hasAnyRole(context.roles, staffRoles);

  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, code, title, incident_type, severity, status, location_label, estimated_affected, is_public, review_status, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="dashboard-topline">
        <div>
          <span className="eyebrow">Incident command</span>
          <h1>Incident management</h1>
          <p className="lede dashboard-lede">Mark a location and report an incident. Community reports appear publicly after administrator approval.</p>
        </div>
        <Link className="button button-ghost" href="/map">Open live map ↗</Link>
      </div>

      {canManage && (
        <article className="panel-card module-section">
          <div className="panel-heading"><div><span className="eyebrow">New report</span><h2>Register calamity report</h2></div></div>
          <form className="data-form" action={createIncidentAction}>
            <div className="form-grid form-grid-3">
              <label>Incident title<input name="title" minLength={5} maxLength={160} required placeholder="e.g. Flooding near Musuan gate" /></label>
              <label>Incident type<input name="incident_type" required list="incident-types" placeholder="Flood, Fire, Medical…" /></label>
              <label>Severity<select name="severity" defaultValue="MODERATE"><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
              <label>Location label<input name="location_label" placeholder="Building, barangay, road, sector" /></label>
              <label>Estimated people affected<input name="estimated_affected" type="number" min="0" step="1" defaultValue="0" /></label>
              <label className="checkbox-field"><input name="is_public" type="checkbox" defaultChecked /> Visible on public map</label>
            </div>
            <IncidentLocationPicker />
            <label>Description<textarea name="description" rows={4} placeholder="Observed conditions, hazards, access constraints, immediate concerns…" /></label>
            <div className="form-actions"><SubmitButton className="button button-green" pendingText="Creating incident…">Create incident</SubmitButton></div>
            <datalist id="incident-types"><option value="Flood" /><option value="Fire" /><option value="Earthquake" /><option value="Landslide" /><option value="Medical" /><option value="Storm" /><option value="Relief" /></datalist>
          </form>
        </article>
      )}

      {!canManage && (
        <article className="panel-card module-section" id="report">
          <div className="panel-heading"><div><span className="eyebrow">Community report</span><h2>Mark an incident on the map</h2></div></div>
          <p>Your report stays private while an administrator reviews it.</p>
          <form className="data-form" action={submitIncidentReportAction}>
            <div className="form-grid form-grid-3">
              <label>Incident title<input name="title" minLength={5} maxLength={160} required placeholder="e.g. Flooding near Musuan gate" /></label>
              <label>Incident type<input name="incident_type" required list="community-incident-types" placeholder="Flood, Fire, Medical…" /></label>
              <label>Severity<select name="severity" defaultValue="MODERATE"><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
              <label>Location label<input name="location_label" placeholder="Building, barangay, road, sector" /></label>
              <label>Estimated people affected<input name="estimated_affected" type="number" min="0" step="1" defaultValue="0" /></label>
            </div>
            <IncidentLocationPicker requireSelection />
            <label>Description<textarea name="description" rows={4} placeholder="What happened? Describe hazards and help needed…" /></label>
            <div className="form-actions"><SubmitButton className="button button-green" pendingText="Submitting report…">Submit for review</SubmitButton></div>
            <datalist id="community-incident-types"><option value="Flood" /><option value="Fire" /><option value="Earthquake" /><option value="Landslide" /><option value="Medical" /><option value="Storm" /><option value="Relief" /></datalist>
          </form>
        </article>
      )}

      <article className="panel-card module-section">
        <div className="panel-heading">
          <div><span className="eyebrow">Current records</span><h2>{canManage ? "Incident registry" : "Public incidents and your reports"}</h2></div>
          <span className="record-count">{incidents?.length ?? 0} records</span>
        </div>
        {!incidents?.length ? (
          <EmptyState title="No incidents available" text="New reports will appear here after they are registered." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Incident</th><th>Type</th><th>Severity</th><th>Status</th><th>Review</th><th>Affected</th><th>Updated</th><th /></tr></thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td><strong>{incident.code}</strong><span>{incident.title}</span><small>{incident.location_label || "Location not labeled"}</small></td>
                    <td>{incident.incident_type}</td>
                    <td><DataBadge tone={severityTone(incident.severity)}>{incident.severity}</DataBadge></td>
                    <td><DataBadge>{titleCaseStatus(incident.status)}</DataBadge></td>
                    <td><DataBadge tone={incident.review_status === "APPROVED" ? "green" : incident.review_status === "REJECTED" ? "red" : "yellow"}>{incident.review_status === "APPROVED" ? (incident.is_public ? "Public" : "Internal") : titleCaseStatus(incident.review_status)}</DataBadge></td>
                    <td>{incident.estimated_affected}</td>
                    <td>{formatDateTime(incident.updated_at)}</td>
                    <td><Link className="text-link" href={`/dashboard/incidents/${incident.id}`}>{canManage ? "Manage" : "View"} →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
