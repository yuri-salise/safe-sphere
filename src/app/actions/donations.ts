"use server";

import type { DonationStatus, DonationType, UserRole } from "@/types/domain";
import {
  actionContext,
  actionErrorMessage,
  formBool,
  formNumber,
  formText,
  refreshAndRedirect,
  redirectWithMessage,
} from "@/lib/server/action-utils";
import { hasAnyRole } from "@/lib/auth";

const managerRoles: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR", "LOGISTICS"];

export async function createDonationAction(formData: FormData) {
  const path = "/dashboard/donations";
  try {
    const { supabase } = await actionContext();
    const donationType = formText(formData, "donation_type") as DonationType;
    const incidentId = formText(formData, "incident_id");
    const amount = formNumber(formData, "amount", 0);
    const isAnonymous = formBool(formData, "is_anonymous");
    const donorMessage = formText(formData, "donor_message");
    const itemName = formText(formData, "item_name");
    const quantity = formNumber(formData, "quantity", 0);
    const unit = formText(formData, "unit");
    const paymentMethod = formText(formData, "payment_method");
    const paymentReference = formText(formData, "payment_reference");

    if (!incidentId) throw new Error("Choose a target incident or affected area.");
    if (!(["GOODS", "FUNDS"] as string[]).includes(donationType)) throw new Error("Choose a valid donation type.");
    if (donationType === "FUNDS" && amount <= 0) throw new Error("Enter a fund amount greater than zero.");
    if (donationType === "GOODS" && (!itemName || quantity <= 0 || !unit)) {
      throw new Error("Goods donations require an item, quantity, and unit.");
    }

    const { error } = await supabase.rpc("create_donation_pledge", {
      p_incident_id: incidentId,
      p_donation_type: donationType,
      p_amount: donationType === "FUNDS" ? amount : null,
      p_is_anonymous: isAnonymous,
      p_donor_message: donorMessage || null,
      p_payment_method: donationType === "FUNDS" ? paymentMethod || null : null,
      p_payment_reference: donationType === "FUNDS" ? paymentReference || null : null,
      p_item_name: donationType === "GOODS" ? itemName : null,
      p_quantity: donationType === "GOODS" ? quantity : null,
      p_unit: donationType === "GOODS" ? unit : null,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }

  refreshAndRedirect(path, "Donation pledge submitted. It needs administrator approval before processing.");
}

export async function reviewDonationAction(formData: FormData) {
  const path = "/dashboard/admin";
  try {
    const { supabase, roles, user } = await actionContext();
    if (!hasAnyRole(roles, ["ADMIN"])) throw new Error("Administrator access is required.");
    const donationId = formText(formData, "donation_id");
    const decision = formText(formData, "decision");
    if (!donationId || !["APPROVED", "REJECTED"].includes(decision)) {
      throw new Error("Choose a valid donation decision.");
    }

    const { error } = await supabase.from("donations").update({
      review_status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", donationId).eq("review_status", "PENDING").select("id").single();
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Donation review saved.");
}

export async function addDonationItemAction(formData: FormData) {
  const donationId = formText(formData, "donation_id");
  const path = `/dashboard/donations/${donationId}`;
  try {
    const { supabase } = await actionContext();
    const itemName = formText(formData, "item_name");
    const quantity = formNumber(formData, "quantity", 0);
    const unit = formText(formData, "unit");
    const notes = formText(formData, "notes");
    if (!itemName || quantity <= 0 || !unit) throw new Error("Enter a valid item, quantity, and unit.");

    const { error } = await supabase.from("donation_items").insert({
      donation_id: donationId,
      item_name: itemName,
      quantity,
      unit,
      notes: notes || null,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Donation item added.");
}

export async function updateDonationStatusAction(formData: FormData) {
  const donationId = formText(formData, "donation_id");
  const path = `/dashboard/donations/${donationId}`;
  try {
    const { supabase, roles, user } = await actionContext();
    if (!hasAnyRole(roles, managerRoles)) throw new Error("You do not have permission to update donation status.");

    const status = formText(formData, "status") as DonationStatus;
    const publicNote = formText(formData, "public_note");
    const { data: donationRow, error: donationReadError } = await supabase
      .from("donations")
      .select("donation_type, current_status, review_status")
      .eq("id", donationId)
      .single();
    if (donationReadError) throw donationReadError;
    if (donationRow.review_status !== "APPROVED") {
      throw new Error("This donation needs administrator approval before processing.");
    }

    const allowedManualTransitions: Partial<Record<DonationStatus, DonationStatus[]>> = {
      PLEDGED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["CANCELLED"],
    };
    if (!(allowedManualTransitions[donationRow.current_status as DonationStatus] ?? []).includes(status)) {
      throw new Error("This donation state is controlled by the logistics and recipient-confirmation workflow.");
    }

    const patch: Record<string, unknown> = { current_status: status };
    if (status === "CONFIRMED" && donationRow.donation_type === "FUNDS") {
      patch.payment_verified_at = new Date().toISOString();
      patch.payment_verified_by = user.id;
    }

    const { error } = await supabase.from("donations").update(patch).eq("id", donationId);
    if (error) throw error;

    if (publicNote) {
      const { error: eventError } = await supabase.from("donation_events").insert({
        donation_id: donationId,
        event_type: status,
        performed_by: user.id,
        public_note: publicNote,
        is_public: true,
        metadata: { source: "manual_status_note" },
      });
      if (eventError) throw eventError;
    }
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Donation status updated and logged.");
}
