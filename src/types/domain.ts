export type IncidentSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type IncidentStatus =
  | "REPORTED"
  | "VERIFIED"
  | "ACTIVE"
  | "RESPONSE_ONGOING"
  | "NEEDS_MET"
  | "CLOSED";

export type UserRole =
  | "PUBLIC"
  | "DONOR"
  | "RECIPIENT"
  | "VOLUNTEER"
  | "RESCUE_PERSONNEL"
  | "LOGISTICS"
  | "COORDINATOR"
  | "DRRMO_STAFF"
  | "ADMIN";

export type DonationType = "GOODS" | "FUNDS";

export type DonationStatus =
  | "PLEDGED"
  | "CONFIRMED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RECIPIENT_CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED_PICKUP"
  | "DELIVERY_FAILED";

export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CONFIRMED"
  | "FAILED";

export type AssignmentStatus = "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";

export type MapIncident = {
  id: string;
  code: string;
  title: string;
  incidentType: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  estimatedAffected: number;
  updatedAt: string;
};

export type ProfileSummary = {
  id: string;
  display_name: string | null;
  phone: string | null;
  organization: string | null;
};
