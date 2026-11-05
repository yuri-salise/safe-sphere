"use server";

import type { DeliveryStatus, UserRole } from "@/types/domain";
import { hasAnyRole } from "@/lib/auth";
import {
  actionContext,
  actionErrorMessage,
  formBool,
  formText,
  refreshAndRedirect,
  redirectWithMessage,
} from "@/lib/server/action-utils";

const staff: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR"];
const logisticsOrStaff: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR", "LOGISTICS"];

export async function createVehicleAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, roles } = await actionContext();
    if (!hasAnyRole(roles, staff)) throw new Error("Only response coordinators can register vehicles.");

    const assetCode = formText(formData, "asset_code");
    const plateNumber = formText(formData, "plate_number");
    const vehicleType = formText(formData, "vehicle_type");
    const capacityNote = formText(formData, "capacity_note");
    if (!assetCode || !vehicleType) throw new Error("Asset code and vehicle type are required.");

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .insert({
        asset_code: assetCode,
        plate_number: plateNumber || null,
        vehicle_type: vehicleType,
        capacity_note: capacityNote || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (vehicle) {
      const { error: availabilityError } = await supabase.from("vehicle_availability").insert({
        vehicle_id: vehicle.id,
        is_available: true,
        status_note: "Available",
      });
      if (availabilityError) throw availabilityError;
    }
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Vehicle registered.");
}

export async function updateVehicleAvailabilityAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, roles } = await actionContext();
    if (!hasAnyRole(roles, logisticsOrStaff)) throw new Error("You do not have permission to update vehicles.");

    const vehicleId = formText(formData, "vehicle_id");
    const isAvailable = formBool(formData, "is_available");
    const statusNote = formText(formData, "status_note");

    const { error } = await supabase.from("vehicle_availability").upsert(
      { vehicle_id: vehicleId, is_available: isAvailable, status_note: statusNote || null, updated_at: new Date().toISOString() },
      { onConflict: "vehicle_id" },
    );
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Vehicle availability updated.");
}

export async function createAssignmentAction(formData: FormData) {
  const returnPath = formText(formData, "return_path") || "/dashboard/logistics";
  try {
    const { supabase, roles, user } = await actionContext();
    if (!hasAnyRole(roles, staff)) throw new Error("Only response coordinators can create assignments.");

    const donationId = formText(formData, "donation_id");
    const incidentId = formText(formData, "incident_id");
    const assignedTo = formText(formData, "assigned_to");
    const vehicleId = formText(formData, "vehicle_id");
    const instructions = formText(formData, "instructions");

    if (!assignedTo) throw new Error("Choose a responder or logistics assignee.");
    if (!donationId && !incidentId) throw new Error("An assignment must be linked to an incident or donation.");

    const { error } = await supabase.from("logistics_assignments").insert({
      donation_id: donationId || null,
      incident_id: incidentId || null,
      assigned_to: assignedTo,
      assigned_by: user.id,
      vehicle_id: vehicleId || null,
      instructions: instructions || null,
      status: "PENDING",
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(returnPath, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(returnPath, "Operational assignment created and assignee notified.");
}

export async function acceptAssignmentAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, user } = await actionContext();
    const assignmentId = formText(formData, "assignment_id");
    const { error } = await supabase
      .from("logistics_assignments")
      .update({ status: "ACCEPTED", accepted_at: new Date().toISOString() })
      .eq("id", assignmentId)
      .eq("assigned_to", user.id);
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Assignment accepted.");
}

export async function completeAssignmentAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, user, roles } = await actionContext();
    const assignmentId = formText(formData, "assignment_id");
    let query = supabase
      .from("logistics_assignments")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", assignmentId);
    if (!hasAnyRole(roles, staff)) query = query.eq("assigned_to", user.id);
    const { error } = await query;
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Assignment completed.");
}

export async function cancelAssignmentAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, user, roles } = await actionContext();
    const assignmentId = formText(formData, "assignment_id");
    let query = supabase
      .from("logistics_assignments")
      .update({ status: "CANCELLED" })
      .eq("id", assignmentId);
    if (!hasAnyRole(roles, staff)) query = query.eq("assigned_to", user.id);
    const { error } = await query;
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Assignment cancelled and reserved resources released.");
}

export async function createDeliveryAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, roles } = await actionContext();
    if (!hasAnyRole(roles, logisticsOrStaff)) throw new Error("You do not have permission to create deliveries.");

    const donationId = formText(formData, "donation_id");
    const assignmentId = formText(formData, "logistics_assignment_id");
    const recipientId = formText(formData, "recipient_id");
    const destinationLabel = formText(formData, "destination_label");
    if (!donationId) throw new Error("Choose a donation.");
    if (!assignmentId) throw new Error("Choose the logistics assignment carrying this donation.");
    if (!recipientId) throw new Error("Choose a recipient or local coordinator for digital confirmation.");
    if (!destinationLabel) throw new Error("Enter a delivery destination.");

    const { error } = await supabase.from("deliveries").insert({
      donation_id: donationId,
      logistics_assignment_id: assignmentId || null,
      recipient_id: recipientId || null,
      destination_label: destinationLabel || null,
      status: "ASSIGNED",
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Delivery record created.");
}

export async function updateDeliveryStatusAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, roles } = await actionContext();
    if (!hasAnyRole(roles, logisticsOrStaff)) throw new Error("You do not have permission to update deliveries.");

    const deliveryId = formText(formData, "delivery_id");
    const status = formText(formData, "status") as DeliveryStatus;
    const patch: Record<string, unknown> = { status };
    if (status === "PICKED_UP") patch.picked_up_at = new Date().toISOString();
    if (status === "DELIVERED") patch.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("deliveries").update(patch).eq("id", deliveryId);
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Delivery status updated and synchronized with the donation timeline.");
}

export async function confirmDeliveryAction(formData: FormData) {
  const path = "/dashboard/logistics";
  try {
    const { supabase, user } = await actionContext();
    const deliveryId = formText(formData, "delivery_id");
    const note = formText(formData, "confirmation_note");
    const proof = formData.get("proof");
    let proofPath: string | null = null;

    if (proof instanceof File && proof.size > 0) {
      if (proof.size > 3 * 1024 * 1024) throw new Error("Proof file must be 3 MB or smaller.");
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowed.includes(proof.type)) throw new Error("Proof must be a JPG, PNG, WebP, or PDF file.");
      const safeName = proof.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      proofPath = `${user.id}/${deliveryId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("delivery-proofs").upload(proofPath, proof, {
        contentType: proof.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
    }

    const { error } = await supabase.from("delivery_confirmations").insert({
      delivery_id: deliveryId,
      confirmed_by: user.id,
      confirmation_note: note || null,
      proof_path: proofPath,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Delivery receipt confirmed and transparency log finalized.");
}
