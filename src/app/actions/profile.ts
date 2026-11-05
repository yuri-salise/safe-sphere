"use server";

import { actionContext, actionErrorMessage, formText, refreshAndRedirect, redirectWithMessage } from "@/lib/server/action-utils";

export async function updateProfileAction(formData: FormData) {
  const path = "/dashboard/personnel";
  try {
    const { supabase, user } = await actionContext();
    const displayName = formText(formData, "display_name");
    const phone = formText(formData, "phone");
    const organization = formText(formData, "organization");

    if (displayName.length < 2) throw new Error("Display name must contain at least 2 characters.");

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, phone: phone || null, organization: organization || null })
      .eq("id", user.id);
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Profile updated.");
}
