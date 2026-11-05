import Link from "next/link";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { hasAnyRole, requireUserContext } from "@/lib/auth";
import { formatDateTime, formatMoney, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const context = await requireUserContext();
  const supabase = await createClient();
  const isAdmin = hasAnyRole(context.roles, ["ADMIN"]);

  const [incidentsResult, donationsResult, deliveriesResult, personnelResult, auditResult] = await Promise.all([
    supabase.from("incidents").select("id, code, title, severity, status, estimated_affected, updated_at").order("updated_at", { ascending: false }),
    supabase.from("donations").select("id, code, donation_type, amount, currency, current_status, review_status, created_at").order("created_at", { ascending: false }),
    supabase.from("deliveries").select("id, status, delivered_at, created_at").order("created_at", { ascending: false }),
    supabase.from("personnel_availability").select("person_id, is_available"),
    isAdmin ? supabase.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
  ]);

  const incidents = incidentsResult.data ?? [];
  const donations = donationsResult.data ?? [];
  const deliveries = deliveriesResult.data ?? [];
  const personnel = personnelResult.data ?? [];
  const openIncidents = incidents.filter((row) => row.status !== "CLOSED").length;
  const peopleAffected = incidents.filter((row) => row.status !== "CLOSED").reduce((sum, row) => sum + Number(row.estimated_affected ?? 0), 0);
  const approvedDonations = donations.filter((row) => row.review_status === "APPROVED");
  const funds = approvedDonations.filter((row) => row.donation_type === "FUNDS" && row.current_status !== "CANCELLED").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const confirmedDeliveries = deliveries.filter((row) => row.status === "CONFIRMED").length;
  const readyPersonnel = personnel.filter((row) => row.is_available).length;

  return (
    <section className="dashboard-content page-enter">
      <div className="dashboard-topline">
        <div><span className="eyebrow">Decision support</span><h1>Reports & transparency</h1><p className="lede dashboard-lede">Summarize incident load, response readiness, donations, deliveries, and audit history from the records available to your role.</p></div>
        <div className="inline-actions"><Link className="button button-ghost" href="/api/reports/incidents.csv">Incident CSV</Link><Link className="button button-ghost" href="/api/reports/donations.csv">Donation CSV</Link></div>
      </div>

      <div className="metric-grid stagger-grid">
        <article className="metric-card"><span>Open incidents</span><strong>{openIncidents}</strong><small>{peopleAffected} estimated affected</small></article>
        <article className="metric-card"><span>Ready personnel</span><strong>{readyPersonnel}</strong><small>{personnel.length} visible records</small></article>
        <article className="metric-card"><span>Approved funds pledged</span><strong className="metric-money">{formatMoney(funds)}</strong><small>Accessible approved, non-cancelled pledges</small></article>
        <article className="metric-card"><span>Confirmed deliveries</span><strong>{confirmedDeliveries}</strong><small>{deliveries.length} delivery records</small></article>
      </div>

      <div className="dashboard-grid module-section">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Incident summary</span><h2>Current operational load</h2></div></div>
          {!incidents.length ? <EmptyState title="No incident data" text="Incident summaries will appear after reports are created." /> : <div className="stack-list">{incidents.slice(0, 10).map((incident) => <div className="simple-record" key={incident.id}><div><strong>{incident.code} — {incident.title}</strong><span>{incident.estimated_affected} affected • updated {formatDateTime(incident.updated_at)}</span></div><div className="inline-badges"><DataBadge>{titleCaseStatus(incident.status)}</DataBadge><DataBadge tone={incident.severity === "CRITICAL" ? "red" : incident.severity === "HIGH" ? "orange" : incident.severity === "MODERATE" ? "yellow" : "green"}>{incident.severity}</DataBadge></div></div>)}</div>}
        </article>

        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Donation status</span><h2>Relief accountability</h2></div><Link className="text-link" href="/transparency">Public view ↗</Link></div>
          {!donations.length ? <EmptyState title="No donation data" text="Donation status records will appear here." /> : <div className="status-summary-list"><div><span>Needs admin approval</span><strong>{donations.filter((row) => row.review_status === "PENDING").length}</strong></div>{Array.from(new Set(approvedDonations.map((row) => row.current_status))).map((status) => { const count = approvedDonations.filter((row) => row.current_status === status).length; return <div key={status}><span>{titleCaseStatus(status)}</span><strong>{count}</strong></div>; })}</div>}
        </article>
      </div>

      {isAdmin && (
        <article className="panel-card module-section">
          <div className="panel-heading"><div><span className="eyebrow">Administrator audit</span><h2>Recent protected actions</h2></div><Link className="text-link" href="/dashboard/admin">Manage access →</Link></div>
          {!auditResult.data?.length ? <EmptyState title="No audit records" text="Critical system mutations will appear here." /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Record</th><th>Actor</th></tr></thead><tbody>{auditResult.data.map((row) => <tr key={row.id}><td>{formatDateTime(row.created_at)}</td><td>{row.action}</td><td>{titleCaseStatus(row.entity_type)}</td><td>{row.entity_id || "—"}</td><td>{row.actor_id || "System"}</td></tr>)}</tbody></table></div>}
        </article>
      )}
    </section>
  );
}
