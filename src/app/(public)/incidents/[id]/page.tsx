import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { hasSupabasePublicConfig } from "@/lib/config";
import { formatDateTime, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Incident Details" };

export default async function PublicIncidentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!hasSupabasePublicConfig()) notFound();
  const supabase = await createClient();
  const [incidentResult, needsResult, updatesResult] = await Promise.all([
    supabase.from("incidents").select("id, code, title, description, incident_type, severity, status, location_label, estimated_affected, updated_at").eq("id", id).eq("is_public", true).maybeSingle(),
    supabase.from("incident_needs").select("id, category, description, quantity_needed, quantity_met, unit, is_resolved").eq("incident_id", id).order("created_at", { ascending: true }),
    supabase.from("incident_updates").select("id, message, status, severity, created_at").eq("incident_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const incident = incidentResult.data;
  if (!incident) notFound();

  return (
    <section className="section shell page-enter">
      <div className="detail-back"><Link className="text-link" href="/map">← Live incident map</Link></div>
      <div className="section-heading split-heading"><div><span className="eyebrow">{incident.code}</span><h1>{incident.title}</h1></div><div><div className="detail-badges"><DataBadge tone={incident.severity === "CRITICAL" ? "red" : incident.severity === "HIGH" ? "orange" : incident.severity === "MODERATE" ? "yellow" : "green"}>{incident.severity}</DataBadge><DataBadge>{titleCaseStatus(incident.status)}</DataBadge></div><p>{incident.location_label || "Operational Zone"} • Updated {formatDateTime(incident.updated_at)}</p></div></div>
      <div className="public-detail-grid"><article className="panel-card"><h2>Situation</h2><p className="public-copy">{incident.description || "No public description is available."}</p><dl className="detail-list"><div><dt>Type</dt><dd>{incident.incident_type}</dd></div><div><dt>Estimated affected</dt><dd>{incident.estimated_affected}</dd></div></dl></article><article className="panel-card"><h2>Current needs</h2>{!needsResult.data?.length ? <EmptyState title="No public needs listed" text="Operational needs will appear when published." /> : <div className="stack-list">{needsResult.data.map((need) => <div className="simple-record" key={need.id}><div><strong>{need.category}</strong><span>{need.description || ""}</span></div><DataBadge tone={need.is_resolved ? "green" : "yellow"}>{need.is_resolved ? "Resolved" : `${need.quantity_met || 0}/${need.quantity_needed || "—"} ${need.unit || ""}`}</DataBadge></div>)}</div>}</article></div>
      <article className="panel-card module-section"><h2>Public updates</h2>{!updatesResult.data?.length ? <EmptyState title="No public updates yet" text="Verified incident updates will appear here." /> : <ol className="timeline-list">{updatesResult.data.map((update) => <li key={update.id}><i /><div><strong>{update.message}</strong><span>{formatDateTime(update.created_at)}</span>{(update.status || update.severity) && <small>{update.status ? titleCaseStatus(update.status) : ""} {update.severity || ""}</small>}</div></li>)}</ol>}</article>
    </section>
  );
}
