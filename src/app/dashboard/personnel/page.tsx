import { updateProfileAction } from "@/app/actions/profile";
import { updateAvailabilityAction } from "@/app/actions/personnel";
import { DataBadge } from "@/components/ui/data-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { hasAnyRole, requireUserContext } from "@/lib/auth";
import { formatDateTime, titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { SubmitButton } from "@/components/ui/submit-button";

const operationalRoles: UserRole[] = ["VOLUNTEER", "RESCUE_PERSONNEL", "LOGISTICS", "COORDINATOR", "DRRMO_STAFF", "ADMIN"];
const staffRoles: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR"];

function isEffectivelyAvailable(row: { is_available?: boolean; available_until?: string | null } | null | undefined) {
  if (!row?.is_available) return false;
  return !row.available_until || new Date(row.available_until).getTime() > Date.now();
}

export default async function PersonnelPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const context = await requireUserContext();
  const supabase = await createClient();
  const canViewDirectory = hasAnyRole(context.roles, staffRoles);
  const canManageOwnAvailability = hasAnyRole(context.roles, operationalRoles);

  const ownAvailabilityResult = await supabase
    .from("personnel_availability")
    .select("*")
    .eq("person_id", context.user.id)
    .maybeSingle();

  const [profilesResult, rolesResult, availabilityResult] = await Promise.all([
    canViewDirectory ? supabase.from("profiles").select("id, display_name, phone, organization, is_active").eq("is_active", true).order("display_name") : Promise.resolve({ data: context.profile ? [{ ...context.profile, is_active: true }] : [] }),
    canViewDirectory ? supabase.from("user_roles").select("user_id, role") : supabase.from("user_roles").select("user_id, role").eq("user_id", context.user.id),
    canViewDirectory ? supabase.from("personnel_availability").select("person_id, is_available, status_note, available_until, updated_at") : Promise.resolve({ data: ownAvailabilityResult.data ? [ownAvailabilityResult.data] : [] }),
  ]);

  const ownAvailability = ownAvailabilityResult.data;
  const rolesByUser = new Map<string, string[]>();
  for (const row of rolesResult.data ?? []) {
    rolesByUser.set(row.user_id, [...(rolesByUser.get(row.user_id) ?? []), row.role]);
  }
  const availabilityByUser = new Map((availabilityResult.data ?? []).map((row) => [row.person_id, row]));
  const personnel = (profilesResult.data ?? []).filter((profile) => (rolesByUser.get(profile.id) ?? []).some((role) => operationalRoles.includes(role as UserRole)) || profile.id === context.user.id);

  return (
    <section className="dashboard-content page-enter">
      <FlashMessage searchParams={searchParams} />
      <div className="dashboard-topline">
        <div><span className="eyebrow">Response readiness</span><h1>Personnel availability</h1><p className="lede dashboard-lede">Maintain contact information and current deployment readiness for rescue operations.</p></div>
        <DataBadge tone={isEffectivelyAvailable(ownAvailability) ? "green" : "neutral"}>{isEffectivelyAvailable(ownAvailability) ? "You are available" : "You are unavailable"}</DataBadge>
      </div>

      <div className="detail-grid">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Your profile</span><h2>Contact information</h2></div></div>
          <form className="data-form compact-form" action={updateProfileAction}>
            <label>Display name<input name="display_name" required defaultValue={context.profile?.display_name || ""} /></label>
            <label>Phone / contact<input name="phone" defaultValue={context.profile?.phone || ""} /></label>
            <label>Organization / unit<input name="organization" defaultValue={context.profile?.organization || ""} placeholder="DRRMO, Red Cross Youth, OHS…" /></label>
            <SubmitButton className="button button-ghost" pendingText="Saving profile…">Save profile</SubmitButton>
          </form>
        </article>

        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Readiness</span><h2>Update your availability</h2></div></div>
          {canManageOwnAvailability ? (
            <form className="data-form compact-form" action={updateAvailabilityAction}>
              <label className="availability-switch"><input type="checkbox" name="is_available" defaultChecked={isEffectivelyAvailable(ownAvailability)} /><span>Available for rescue / relief operations</span></label>
              <label>Status note<input name="status_note" defaultValue={ownAvailability?.status_note || ""} placeholder="Ready at DRRMO, on campus, off duty…" /></label>
              <label>Available until<input name="available_until" type="datetime-local" /></label>
              <SubmitButton className="button button-green" pendingText="Updating readiness…">Update readiness</SubmitButton>
            </form>
          ) : (
            <EmptyState title="Operational role required" text="Volunteer, rescue, logistics, coordinator, DRRMO, or administrator access is required before availability can be published." />
          )}
        </article>
      </div>

      <article className="panel-card module-section">
        <div className="panel-heading"><div><span className="eyebrow">Personnel dashboard</span><h2>{canViewDirectory ? "Available rescue personnel" : "Your readiness record"}</h2></div><span className="record-count">{personnel.length} people</span></div>
        {!personnel.length ? <EmptyState title="No personnel records" text="Personnel with operational roles will appear here." /> : (
          <div className="personnel-grid">
            {personnel.map((profile) => {
              const availability = availabilityByUser.get(profile.id);
              const roles = rolesByUser.get(profile.id) ?? [];
              return (
                <article className="person-card" key={profile.id}>
                  <div className="person-card-head"><div className="avatar-mark">{(profile.display_name || "?").slice(0, 2).toUpperCase()}</div><DataBadge tone={isEffectivelyAvailable(availability) ? "green" : "neutral"}>{isEffectivelyAvailable(availability) ? "Available" : "Unavailable"}</DataBadge></div>
                  <strong>{profile.display_name || "Unnamed user"}</strong>
                  <span>{profile.organization || "No organization listed"}</span>
                  <small>{profile.phone || "No contact number"}</small>
                  <div className="role-list light-role-list">{roles.filter((role) => role !== "PUBLIC").map((role) => <span key={role}>{titleCaseStatus(role)}</span>)}</div>
                  <p>{availability?.status_note || "No readiness note"}</p>
                  <small>Updated {formatDateTime(availability?.updated_at)}</small>
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
