import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { hasSupabasePublicConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { ProfileSummary, UserRole } from "@/types/domain";

export type UserContext = {
  user: User;
  profile: ProfileSummary | null;
  roles: UserRole[];
};

export function hasAnyRole(roles: UserRole[], allowed: UserRole[]) {
  return roles.some((role) => allowed.includes(role));
}

export function isResponseStaff(roles: UserRole[]) {
  return hasAnyRole(roles, ["ADMIN", "DRRMO_STAFF", "COORDINATOR"]);
}

export async function getUserContext(): Promise<UserContext | null> {
  if (!hasSupabasePublicConfig()) return null;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, phone, organization")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    user,
    profile: (profile as ProfileSummary | null) ?? null,
    roles: ((roleRows ?? []).map((row) => row.role) as UserRole[]) ?? [],
  };
}

export async function requireUserContext(): Promise<UserContext> {
  if (!hasSupabasePublicConfig()) {
    redirect("/login?error=Account%20services%20are%20not%20configured.");
  }

  const context = await getUserContext();
  if (!context) redirect("/login");
  return context;
}
