import Link from "next/link";
import { DonationPledgeForm } from "@/components/donations/donation-pledge-form";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { requireUserContext } from "@/lib/auth";
import { formatDateTime, formatMoney, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DonationsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  await requireUserContext();
  const supabase = await createClient();

  const [donationsResult, incidentsResult] = await Promise.all([
    supabase
      .from("donations")
      .select("id, code, donation_type, current_status, review_status, amount, currency, is_anonymous, payment_method, created_at, incident_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("incidents")
      .select("id, code, title, status")
      .eq("review_status", "APPROVED")
      .neq("status", "CLOSED")
      .order("updated_at", { ascending: false }),
  ]);

  const incidentMap = new Map((incidentsResult.data ?? []).map((incident) => [incident.id, incident]));
  const donations = donationsResult.data ?? [];

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="dashboard-topline">
        <div>
          <span className="eyebrow">Relief accountability</span>
          <h1>Donation management</h1>
          <p className="lede dashboard-lede">Pledge goods or funds, select the affected area, and follow the chain of custody through recipient confirmation.</p>
        </div>
        <Link className="button button-ghost" href="/transparency">Public transparency ↗</Link>
      </div>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">New pledge</span><h2>Record donation</h2></div></div>
        <p className="form-note">Any signed-in account can pledge. New pledges need administrator approval before processing.</p>
        <DonationPledgeForm incidents={(incidentsResult.data ?? []).map(({ id, code, title }) => ({ id, code, title }))} />
      </article>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Accessible records</span><h2>Donation registry</h2></div><span className="record-count">{donations.length} records</span></div>
        {!donations.length ? <EmptyState title="No donations available" text="Your donation pledges or operationally accessible donations will appear here." /> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Donation</th><th>Target</th><th>Type</th><th>Value</th><th>Approval</th><th>Status</th><th>Created</th><th /></tr></thead><tbody>
            {donations.map((donation) => {
              const incident = donation.incident_id ? incidentMap.get(donation.incident_id) : null;
              return <tr key={donation.id}><td><strong>{donation.code}</strong><span>{donation.is_anonymous ? "Anonymous publicly" : "Public donor identity"}</span></td><td>{incident ? `${incident.code} — ${incident.title}` : "General relief"}</td><td>{titleCaseStatus(donation.donation_type)}</td><td>{donation.donation_type === "FUNDS" ? formatMoney(donation.amount, donation.currency || "PHP") : "Goods"}</td><td><DataBadge tone={donation.review_status === "APPROVED" ? "green" : donation.review_status === "REJECTED" ? "red" : "yellow"}>{donation.review_status === "PENDING" ? "Needs admin approval" : titleCaseStatus(donation.review_status)}</DataBadge></td><td><DataBadge tone={donation.current_status === "COMPLETED" ? "green" : donation.current_status.includes("FAILED") || donation.current_status === "CANCELLED" ? "red" : "yellow"}>{titleCaseStatus(donation.current_status)}</DataBadge></td><td>{formatDateTime(donation.created_at)}</td><td><Link className="text-link" href={`/dashboard/donations/${donation.id}`}>Open →</Link></td></tr>;
            })}
          </tbody></table></div>
        )}
      </article>
    </section>
  );
}
