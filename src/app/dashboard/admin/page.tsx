import { notFound } from "next/navigation";
import { grantRoleAction, revokeRoleAction } from "@/app/actions/admin";
import { reviewIncidentReportAction } from "@/app/actions/incidents";
import { reviewDonationAction } from "@/app/actions/donations";
import { DataBadge } from "@/components/ui/data-badge";
import { FlashMessage } from "@/components/ui/flash-message";
import { hasAnyRole, requireUserContext } from "@/lib/auth";
import { formatDateTime, formatMoney, titleCaseStatus } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { SubmitButton } from "@/components/ui/submit-button";

const grantableRoles: UserRole[] = ["DONOR", "RECIPIENT", "VOLUNTEER", "RESCUE_PERSONNEL", "LOGISTICS", "COORDINATOR", "DRRMO_STAFF", "ADMIN"];

export default async function AdminPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const context = await requireUserContext();
  if (!hasAnyRole(context.roles, ["ADMIN"])) notFound();
  const supabase = await createClient();

  const [profilesResult, rolesResult, pendingReportsResult, pendingDonationsResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name, phone, organization, is_active, created_at").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role, granted_at").order("granted_at", { ascending: true }),
    supabase.from("incidents").select("id, code, title, description, incident_type, severity, location_label, reported_by, created_at").eq("review_status", "PENDING").order("created_at", { ascending: true }),
    supabase.from("donations").select("id, code, donor_id, donation_type, amount, currency, donor_message, created_at").eq("review_status", "PENDING").order("created_at", { ascending: true }),
  ]);
  const rolesByUser = new Map<string, string[]>();
  for (const row of rolesResult.data ?? []) rolesByUser.set(row.user_id, [...(rolesByUser.get(row.user_id) ?? []), row.role]);
  const pendingLocations = new Map<string, { latitude: number; longitude: number }>();
  await Promise.all((pendingReportsResult.data ?? []).map(async (report) => {
    const { data } = await supabase.rpc("get_incident_location", { p_incident_id: report.id });
    if (data?.[0]) pendingLocations.set(report.id, data[0]);
  }));

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="dashboard-topline"><div><span className="eyebrow">Access control</span><h1>Administration</h1><p className="lede dashboard-lede">Grant operational roles after user identity and responsibilities are verified.</p></div><DataBadge tone="red">Administrator</DataBadge></div>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Donation review</span><h2>Pledges needing approval</h2></div><span className="record-count">{pendingDonationsResult.data?.length ?? 0} pending</span></div>
        {!pendingDonationsResult.data?.length ? <p>No donation pledges are waiting for review.</p> : (
          <div className="stack-list">
            {pendingDonationsResult.data.map((donation) => {
              const donor = profilesResult.data?.find((profile) => profile.id === donation.donor_id);
              return <div className="simple-record" key={donation.id}>
                <div>
                  <strong>{donation.code} — {titleCaseStatus(donation.donation_type)} pledge</strong>
                  <span>{donor?.display_name || "Unknown account"} · {donation.donation_type === "FUNDS" ? formatMoney(donation.amount, donation.currency || "PHP") : "Goods donation"}</span>
                  <span>{donation.donor_message || "No message"}</span>
                  <small>Submitted {formatDateTime(donation.created_at)}</small>
                  <Link className="text-link" href={`/dashboard/donations/${donation.id}`}>Inspect full pledge →</Link>
                </div>
                <div className="revoke-list">
                  <form action={reviewDonationAction}><input type="hidden" name="donation_id" value={donation.id} /><input type="hidden" name="decision" value="APPROVED" /><SubmitButton className="mini-button" pendingText="Approving…">Approve</SubmitButton></form>
                  <form action={reviewDonationAction}><input type="hidden" name="donation_id" value={donation.id} /><input type="hidden" name="decision" value="REJECTED" /><SubmitButton className="mini-button mini-danger" pendingText="Rejecting…">Reject</SubmitButton></form>
                </div>
              </div>;
            })}
          </div>
        )}
      </article>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Community reports</span><h2>Pending map reports</h2></div><span className="record-count">{pendingReportsResult.data?.length ?? 0} pending</span></div>
        {!pendingReportsResult.data?.length ? <p>No reports are waiting for review.</p> : (
          <div className="stack-list">
            {pendingReportsResult.data.map((report) => {
              const reporter = profilesResult.data?.find((profile) => profile.id === report.reported_by);
              const location = pendingLocations.get(report.id);
              return <div className="simple-record" key={report.id}>
                <div>
                  <strong>{report.code} — {report.title}</strong>
                  <span>{report.incident_type} · {report.severity} · {report.location_label || "Unlabeled location"}</span>
                  <span>{report.description || "No description"}</span>
                  <small>Submitted by {reporter?.display_name || "Unknown user"} · {formatDateTime(report.created_at)}</small>
                  {location && <a className="text-link" href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`} target="_blank" rel="noopener noreferrer">Inspect selected map pin ↗</a>}
                  <Link className="text-link" href={`/dashboard/incidents/${report.id}`}>View full report →</Link>
                </div>
                <div className="revoke-list">
                  <form action={reviewIncidentReportAction}><input type="hidden" name="incident_id" value={report.id} /><input type="hidden" name="decision" value="APPROVED" /><SubmitButton className="mini-button" pendingText="Approving…">Approve and publish</SubmitButton></form>
                  <form action={reviewIncidentReportAction}><input type="hidden" name="incident_id" value={report.id} /><input type="hidden" name="decision" value="REJECTED" /><SubmitButton className="mini-button mini-danger" pendingText="Rejecting…">Reject</SubmitButton></form>
                </div>
              </div>;
            })}
          </div>
        )}
      </article>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Role assignment</span><h2>Grant role</h2></div></div>
        <form className="data-form" action={grantRoleAction}>
          <div className="form-grid form-grid-2"><label>User<select name="user_id" required defaultValue=""><option value="" disabled>Select account</option>{(profilesResult.data ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.id} — {profile.organization || "No organization"}</option>)}</select></label><label>Role<select name="role" required defaultValue="VOLUNTEER">{grantableRoles.map((role) => <option key={role} value={role}>{titleCaseStatus(role)}</option>)}</select></label></div>
          <SubmitButton className="button button-green" pendingText="Granting role…">Grant role</SubmitButton>
        </form>
      </article>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Accounts</span><h2>User role registry</h2></div><span className="record-count">{profilesResult.data?.length ?? 0} users</span></div>
        <div className="admin-user-grid">
          {(profilesResult.data ?? []).map((profile) => {
            const roles = rolesByUser.get(profile.id) ?? [];
            return <article className="admin-user-card" key={profile.id}><div><strong>{profile.display_name || "Unnamed user"}</strong><span>{profile.organization || "No organization"}</span><small>{profile.phone || "No phone"}</small></div><div className="role-list light-role-list">{roles.map((role) => <span key={role}>{titleCaseStatus(role)}</span>)}</div><div className="revoke-list">{roles.filter((role) => role !== "PUBLIC").map((role) => <form action={revokeRoleAction} key={role}><input type="hidden" name="user_id" value={profile.id} /><input type="hidden" name="role" value={role} /><SubmitButton className="mini-button mini-danger" pendingText="Removing…">Remove {titleCaseStatus(role)}</SubmitButton></form>)}</div></article>;
          })}
        </div>
      </article>
    </section>
  );
}
