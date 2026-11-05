"use client";

import { useMemo, useState } from "react";
import { createDeliveryAction } from "@/app/actions/logistics";
import { titleCaseStatus } from "@/lib/format";
import { SubmitButton } from "@/components/ui/submit-button";

type DonationOption = {
  id: string;
  code: string;
  current_status: string;
};

type AssignmentOption = {
  id: string;
  donation_id: string | null;
  assignee_name: string;
  status: string;
};

type RecipientOption = {
  id: string;
  display_name: string | null;
};

export function DeliveryCreateForm({
  donations,
  assignments,
  recipients,
}: {
  donations: DonationOption[];
  assignments: AssignmentOption[];
  recipients: RecipientOption[];
}) {
  const [donationId, setDonationId] = useState("");
  const matchingAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.donation_id === donationId && assignment.status === "ACCEPTED"),
    [assignments, donationId],
  );

  return (
    <form className="data-form compact-form" action={createDeliveryAction}>
      <label>
        Donation
        <select name="donation_id" required value={donationId} onChange={(event) => setDonationId(event.target.value)}>
          <option value="" disabled>Select donation</option>
          {donations.map((donation) => (
            <option key={donation.id} value={donation.id}>{donation.code} — {titleCaseStatus(donation.current_status)}</option>
          ))}
        </select>
      </label>
      <label>
        Logistics assignment
        <select name="logistics_assignment_id" required defaultValue="" key={donationId} disabled={!donationId}>
          <option value="" disabled>{donationId ? "Select assignment" : "Choose a donation first"}</option>
          {matchingAssignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>{assignment.assignee_name} — {titleCaseStatus(assignment.status)}</option>
          ))}
        </select>
      </label>
      {donationId && matchingAssignments.length === 0 && (
        <p className="form-note">The logistics assignment must be accepted before a delivery record can be created.</p>
      )}
      <label>
        Recipient / local coordinator
        <select name="recipient_id" required defaultValue="">
          <option value="" disabled>Select recipient</option>
          {recipients.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.display_name || profile.id}</option>
          ))}
        </select>
      </label>
      <label>Destination<input name="destination_label" required placeholder="Relief center, barangay, household…" /></label>
      <SubmitButton
        className="button button-green"
        disabled={!donationId || matchingAssignments.length === 0 || recipients.length === 0}
        pendingText="Creating delivery…"
      >
        Create delivery
      </SubmitButton>
    </form>
  );
}
