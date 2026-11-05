"use server";

import type { UserRole } from "@/types/domain";
import { hasAnyRole } from "@/lib/auth";
import {
  actionContext,
  actionErrorMessage,
  formText,
  refreshAndRedirect,
  redirectWithMessage,
} from "@/lib/server/action-utils";

export async function grantRoleAction(formData: FormData) {
  const path = "/dashboard/admin";
  try {
    const { supabase, roles, user } = await actionContext();
    if (!hasAnyRole(roles, ["ADMIN"])) throw new Error("Administrator access is required.");
    const userId = formText(formData, "user_id");
    const role = formText(formData, "role") as UserRole;
    if (!userId || !role) throw new Error("Choose a user and role.");

    const { error } = await supabase.from("user_roles").upsert(
      { user_id: userId, role, granted_by: user.id },
      { onConflict: "user_id,role" },
    );
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Role granted.");
}

export async function revokeRoleAction(formData: FormData) {
  const path = "/dashboard/admin";
  try {
    const { supabase, roles, user } = await actionContext();
    if (!hasAnyRole(roles, ["ADMIN"])) throw new Error("Administrator access is required.");
    const userId = formText(formData, "user_id");
    const role = formText(formData, "role") as UserRole;
    if (role === "PUBLIC") throw new Error("The PUBLIC baseline role cannot be removed.");
    if (userId === user.id && role === "ADMIN") throw new Error("You cannot remove your own administrator role.");

    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Role revoked.");
}
