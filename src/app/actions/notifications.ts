"use server";

import { actionContext, actionErrorMessage, formText, refreshAndRedirect, redirectWithMessage } from "@/lib/server/action-utils";

export async function markNotificationReadAction(formData: FormData) {
  const path = "/dashboard";
  try {
    const { supabase, user } = await actionContext();
    const id = formText(formData, "notification_id");
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Notification marked as read.");
}
