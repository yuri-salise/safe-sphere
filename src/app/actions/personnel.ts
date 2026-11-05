"use server";

import {
  actionContext,
  actionErrorMessage,
  formBool,
  formText,
  refreshAndRedirect,
  redirectWithMessage,
} from "@/lib/server/action-utils";

export async function updateAvailabilityAction(formData: FormData) {
  const path = "/dashboard/personnel";
  try {
    const { supabase, user } = await actionContext();
    const isAvailable = formBool(formData, "is_available");
    const statusNote = formText(formData, "status_note");
    const availableUntil = formText(formData, "available_until");
    if (isAvailable && availableUntil) {
      const expiry = new Date(availableUntil);
      if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
        throw new Error("Available-until must be a future date and time.");
      }
    }

    const { error } = await supabase.from("personnel_availability").upsert(
      {
        person_id: user.id,
        is_available: isAvailable,
        status_note: statusNote || null,
        available_until: availableUntil ? new Date(availableUntil).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "person_id" },
    );
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Availability updated.");
}
