import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { FlashMessage } from "@/components/ui/flash-message";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/auth";
import { formatDateTime, titleCaseStatus } from "@/lib/format";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function DashboardPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const context = await requireUserContext();
  const supabase = await createClient();

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const [incidentsCount, personnelReadyResult, transitCount, deliveryCount, incidentsResult, updatesResult, notificationResult] =
    await Promise.all([
      supabase.from("incidents").select("id", { count: "exact", head: true }).in("status", ["REPORTED", "VERIFIED", "ACTIVE", "RESPONSE_ONGOING"]),
      supabase.from("personnel_availability").select("person_id, available_until").eq("is_available", true),
      supabase.from("donations").select("id", { count: "exact", head: true }).in("current_status", ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]),
      supabase.from("deliveries").select("id", { count: "exact", head: true }).eq("status", "CONFIRMED"),
      supabase.from("incidents").select("id, code, title, severity, status, updated_at").neq("status", "CLOSED").order("updated_at", { ascending: false }).limit(5),
      supabase.from("incident_updates").select("id, message, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("notifications").select("id, title, message, action_url, read_at, created_at").eq("user_id", context.user.id).order("created_at", { ascending: false }).limit(5),
    ]);

  const readyPersonnel = (personnelReadyResult.data ?? []).filter(
    (row) => !row.available_until || new Date(row.available_until).getTime() > now,
  ).length;

  const metrics = [
    ["Active incidents", String(incidentsCount.count ?? 0), "Open operational records"],
    ["Responders ready", String(readyPersonnel), "Available personnel"],
    ["Aid moving", String(transitCount.count ?? 0), "Assigned through delivered"],
    ["Confirmed deliveries", String(deliveryCount.count ?? 0), "Digitally acknowledged"],
  ];

  const incidents = incidentsResult.data ?? [];
  const updates = updatesResult.data ?? [];
  const notifications = notificationResult.data ?? [];

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="dashboard-topline">
        <div>
          <span className="eyebrow">Operations center</span>
          <h1>Situational overview</h1>
          <p className="lede dashboard-lede">
            Welcome, {context.profile?.display_name || context.user.email}. Your dashboard reflects the records your assigned roles can access.
          </p>
        </div>
        <StatusPill tone="green">Connected workspace</StatusPill>
      </div>

      <div className="metric-grid stagger-grid">
        {metrics.map(([label, value, meta]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{meta}</small>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="panel-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Incident load</span><h2>Priority queue</h2></div>
            <Link href="/dashboard/incidents">Open module →</Link>
          </div>
          {incidents.length === 0 ? (
            <EmptyState title="No open incidents" text="Verified and active incidents will appear here." />
          ) : incidents.map((incident) => (
            <Link className={`incident-row incident-${String(incident.severity).toLowerCase()}`} href={`/dashboard/incidents/${incident.id}`} key={incident.id}>
              <div><strong>{incident.code}</strong><span>{incident.title}</span></div>
              <div className="row-end"><b>{incident.severity}</b><small>{titleCaseStatus(incident.status)}</small></div>
            </Link>
          ))}
        </article>

        <article className="panel-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Operational record</span><h2>Recent updates</h2></div>
          </div>
          {updates.length === 0 ? (
            <EmptyState title="No recent updates" text="Incident activity will be listed here." />
          ) : (
            <ul className="activity-list">
              {updates.map((item) => (
                <li key={item.id}><time>{formatDateTime(item.created_at)}</time><span>{item.message}</span></li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="panel-card dashboard-wide-card">
        <div className="panel-heading">
          <div><span className="eyebrow">Your notifications</span><h2>Assignments and confirmations</h2></div>
        </div>
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" text="New assignments and workflow events will appear here." />
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <div className={`notification-row ${notification.read_at ? "notification-read" : ""}`} key={notification.id}>
                <div>
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <small>{formatDateTime(notification.created_at)}</small>
                </div>
                <div className="inline-actions">
                  {notification.action_url && <Link className="text-link" href={notification.action_url}>Open</Link>}
                  {!notification.read_at && (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notification_id" value={notification.id} />
                      <SubmitButton className="mini-button" pendingText="Updating…">Mark read</SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
