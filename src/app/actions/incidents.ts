"use server";

import type { IncidentSeverity, IncidentStatus, UserRole } from "@/types/domain";
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

const staffRoles: UserRole[] = ["ADMIN", "DRRMO_STAFF", "COORDINATOR"];

function assertStaff(roles: UserRole[]) {
  if (!hasAnyRole(roles, staffRoles)) {
    throw new Error("You do not have permission to manage incidents.");
  }
}

export async function submitIncidentReportAction(formData: FormData) {
  const path = "/dashboard/incidents";
  try {
    const { supabase } = await actionContext();
    const title = formText(formData, "title");
    const incidentType = formText(formData, "incident_type");
    const severity = formText(formData, "severity") as IncidentSeverity;
    const latitude = formNumber(formData, "latitude", Number.NaN);
    const longitude = formNumber(formData, "longitude", Number.NaN);
    const estimatedAffected = Math.max(0, Math.floor(formNumber(formData, "estimated_affected", 0)));

    if (title.length < 5 || title.length > 160) throw new Error("Report title must contain 5 to 160 characters.");
    if (!incidentType) throw new Error("Incident type is required.");
    if (formText(formData, "location_selected") !== "true") throw new Error("Choose a point on the map for your report.");
    if (!(["LOW", "MODERATE", "HIGH", "CRITICAL"] as string[]).includes(severity)) {
      throw new Error("Choose a valid severity.");
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("Enter a valid latitude.");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Enter a valid longitude.");

    const { error } = await supabase.rpc("submit_incident_report", {
      p_title: title,
      p_description: formText(formData, "description") || null,
      p_incident_type: incidentType,
      p_severity: severity,
      p_latitude: latitude,
      p_longitude: longitude,
      p_location_label: formText(formData, "location_label") || null,
      p_estimated_affected: estimatedAffected,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Report submitted for administrator review. It is not public yet.");
}

export async function reviewIncidentReportAction(formData: FormData) {
  const path = "/dashboard/admin";
  try {
    const { supabase, roles, user } = await actionContext();
    if (!hasAnyRole(roles, ["ADMIN"])) throw new Error("Administrator access is required.");
    const incidentId = formText(formData, "incident_id");
    const decision = formText(formData, "decision");
    if (!incidentId || !["APPROVED", "REJECTED"].includes(decision)) {
      throw new Error("Choose a valid report decision.");
    }

    const { error } = await supabase.from("incidents").update({
      review_status: decision,
      is_public: decision === "APPROVED",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", incidentId).eq("review_status", "PENDING").select("id").single();
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Report review saved.");
}

export async function createIncidentAction(formData: FormData) {
  const path = "/dashboard/incidents";
  try {
    const { supabase, roles } = await actionContext();
    assertStaff(roles);

    const title = formText(formData, "title");
    const incidentType = formText(formData, "incident_type");
    const description = formText(formData, "description");
    const locationLabel = formText(formData, "location_label");
    const severity = formText(formData, "severity") as IncidentSeverity;
    const latitude = formNumber(formData, "latitude", Number.NaN);
    const longitude = formNumber(formData, "longitude", Number.NaN);
    const estimatedAffected = Math.max(0, Math.floor(formNumber(formData, "estimated_affected", 0)));
    const isPublic = formBool(formData, "is_public");

    if (title.length < 5) throw new Error("Incident title must contain at least 5 characters.");
    if (!incidentType) throw new Error("Incident type is required.");
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("Enter a valid latitude.");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Enter a valid longitude.");

    const { error } = await supabase.rpc("create_incident", {
      p_title: title,
      p_description: description || null,
      p_incident_type: incidentType,
      p_severity: severity || "MODERATE",
      p_latitude: latitude,
      p_longitude: longitude,
      p_location_label: locationLabel || null,
      p_estimated_affected: estimatedAffected,
      p_is_public: isPublic,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }

  refreshAndRedirect(path, "Incident created and added to the operational map.");
}

export async function updateIncidentStateAction(formData: FormData) {
  const incidentId = formText(formData, "incident_id");
  const path = `/dashboard/incidents/${incidentId}`;
  try {
    const { supabase, roles, user } = await actionContext();
    assertStaff(roles);

    const status = formText(formData, "status") as IncidentStatus;
    const severity = formText(formData, "severity") as IncidentSeverity;
    const estimatedAffected = Math.max(0, Math.floor(formNumber(formData, "estimated_affected", 0)));
    const locationLabel = formText(formData, "location_label");
    const verified = formBool(formData, "verified");

    const patch: Record<string, unknown> = {
      status,
      severity,
      estimated_affected: estimatedAffected,
      location_label: locationLabel || null,
    };

    if (verified) {
      patch.verified_by = user.id;
      patch.verified_at = new Date().toISOString();
      if (status === "REPORTED") patch.status = "VERIFIED";
    }

    const { error } = await supabase.from("incidents").update(patch).eq("id", incidentId);
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }

  refreshAndRedirect(path, "Incident status updated.");
}

export async function addIncidentUpdateAction(formData: FormData) {
  const incidentId = formText(formData, "incident_id");
  const path = `/dashboard/incidents/${incidentId}`;
  try {
    const { supabase, roles, user } = await actionContext();
    assertStaff(roles);
    const message = formText(formData, "message");
    if (message.length < 3) throw new Error("Update message is too short.");

    const { error } = await supabase.from("incident_updates").insert({
      incident_id: incidentId,
      message,
      created_by: user.id,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Incident update recorded.");
}

export async function addIncidentNeedAction(formData: FormData) {
  const incidentId = formText(formData, "incident_id");
  const path = `/dashboard/incidents/${incidentId}`;
  try {
    const { supabase, roles } = await actionContext();
    assertStaff(roles);
    const category = formText(formData, "category");
    const description = formText(formData, "description");
    const quantityNeeded = formNumber(formData, "quantity_needed", 0);
    const unit = formText(formData, "unit");
    if (!category) throw new Error("Need category is required.");
    if (quantityNeeded < 0) throw new Error("Quantity needed cannot be negative.");

    const { error } = await supabase.from("incident_needs").insert({
      incident_id: incidentId,
      category,
      description: description || null,
      quantity_needed: quantityNeeded || null,
      unit: unit || null,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Incident need added.");
}

export async function updateIncidentNeedAction(formData: FormData) {
  const incidentId = formText(formData, "incident_id");
  const needId = formText(formData, "need_id");
  const path = `/dashboard/incidents/${incidentId}`;
  try {
    const { supabase, roles } = await actionContext();
    assertStaff(roles);
    const quantityMet = Math.max(0, formNumber(formData, "quantity_met", 0));
    const resolved = formBool(formData, "is_resolved");

    const { error } = await supabase
      .from("incident_needs")
      .update({ quantity_met: quantityMet, is_resolved: resolved })
      .eq("id", needId)
      .eq("incident_id", incidentId);
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Need progress updated.");
}

export async function logIncidentCoordinationAction(formData: FormData) {
  const incidentId = formText(formData, "incident_id");
  const path = `/dashboard/incidents/${incidentId}`;
  try {
    const { supabase, roles, user } = await actionContext();
    assertStaff(roles);
    const organization = formText(formData, "organization");
    const coordinationType = formText(formData, "coordination_type") || "NOTIFICATION";
    const status = formText(formData, "coordination_status") || "CONTACTED";
    const note = formText(formData, "coordination_note");
    if (!organization) throw new Error("Choose the office or response organization contacted.");

    const { error } = await supabase.from("incident_coordination").insert({
      incident_id: incidentId,
      organization,
      coordination_type: coordinationType,
      status,
      note: note || null,
      created_by: user.id,
    });
    if (error) throw error;
  } catch (error) {
    redirectWithMessage(path, "error", actionErrorMessage(error));
  }
  refreshAndRedirect(path, "Coordination activity logged.");
}
