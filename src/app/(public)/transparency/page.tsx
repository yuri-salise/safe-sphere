import type { Metadata } from "next";
import Link from "next/link";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { hasSupabasePublicConfig } from "@/lib/config";
import { formatDateTime, formatMoney, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Aid Transparency Ledger",
  description: "Cryptographic and verifiable chain of custody for all humanitarian aid and disaster relief pledges.",
};

type TimelineRow = {
  event_id: string;
  donation_code: string;
  incident_code: string | null;
  incident_title: string | null;
  donor_label: string;
  donation_type: string;
  amount: number | null;
  currency: string | null;
  event_type: string;
  public_note: string | null;
  created_at: string;
};

export default async function TransparencyPage() {
  let events: TimelineRow[] = [];
  let unavailable = !hasSupabasePublicConfig();

  if (!unavailable) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("get_public_donation_timeline", { p_limit: 150 });
      if (error) unavailable = true;
      else events = (data ?? []) as TimelineRow[];
    } catch {
      unavailable = true;
    }
  }

  const grouped = new Map<string, TimelineRow[]>();
  for (const event of events) {
    grouped.set(event.donation_code, [...(grouped.get(event.donation_code) ?? []), event]);
  }

  return (
    <section className="section shell page-enter">
      <div className="section-heading split-heading">
        <div>
          <span className="eyebrow">Public Accountability & Audit Ledger</span>
          <h1>Aid Transparency Chain</h1>
        </div>
        <p>
          Follow verifiable relief events from pledge commitment through logistics, transit,
          delivery, and recipient digital acknowledgement without compromising private donor identity.
        </p>
      </div>

      {unavailable ? (
        <div className="public-alert">
          Live transparency ledger is temporarily running in standalone mode. Configure Supabase database credentials to synchronize chain of custody records.
        </div>
      ) : grouped.size === 0 ? (
        <EmptyState
          title="No verified relief events on record"
          text="Confirmed public timeline events will appear here as relief operations and pledges are processed."
        />
      ) : (
        <div className="transparency-grid">
          {Array.from(grouped.entries()).map(([code, rows]) => {
            const latest = rows[0];
            return (
              <article className="transparency-card" key={code}>
                <div className="transparency-head">
                  <div>
                    <span className="eyebrow">{code}</span>
                    <h2>
                      {latest.incident_code
                        ? `${latest.incident_code} — ${latest.incident_title}`
                        : "General Emergency Aid Fund"}
                    </h2>
                  </div>
                  <DataBadge tone={latest.event_type === "COMPLETED" ? "green" : "yellow"}>
                    {titleCaseStatus(latest.event_type)}
                  </DataBadge>
                </div>
                <div className="transparency-meta">
                  <span>{latest.donor_label}</span>
                  <span>{titleCaseStatus(latest.donation_type)}</span>
                  {latest.donation_type === "FUNDS" && (
                    <span>{formatMoney(latest.amount, latest.currency || "PHP")}</span>
                  )}
                </div>
                <ol className="timeline-list public-timeline">
                  {[...rows].reverse().map((event) => (
                    <li key={event.event_id}>
                      <i />
                      <div>
                        <strong>{titleCaseStatus(event.event_type)}</strong>
                        <span>{event.public_note || "Operational transition verified"}</span>
                        <small>{formatDateTime(event.created_at)}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      )}

      <div className="public-cta">
        <Link className="button button-green button-large" href="/map">
          View Live Incident Map ↗
        </Link>
        <Link className="button button-ghost button-large" href="/register">
          Create Community Account
        </Link>
      </div>
    </section>
  );
}
