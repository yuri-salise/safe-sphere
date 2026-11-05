"use client";

import { useState } from "react";
import { createDonationAction } from "@/app/actions/donations";
import type { DonationType } from "@/types/domain";
import { SubmitButton } from "@/components/ui/submit-button";

type IncidentOption = {
  id: string;
  code: string;
  title: string;
};

export function DonationPledgeForm({ incidents }: { incidents: IncidentOption[] }) {
  const [donationType, setDonationType] = useState<DonationType>("GOODS");

  return (
    <form className="data-form" action={createDonationAction}>
      <div className="form-grid form-grid-3">
        <label>
          Donation type
          <select
            name="donation_type"
            value={donationType}
            onChange={(event) => setDonationType(event.target.value as DonationType)}
          >
            <option value="GOODS">Goods</option>
            <option value="FUNDS">Funds</option>
          </select>
        </label>
        <label>
          Target incident / area
          <select name="incident_id" defaultValue="" required>
            <option value="" disabled>Select incident</option>
            {incidents.map((incident) => (
              <option key={incident.id} value={incident.id}>{incident.code} — {incident.title}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-field">
          <input type="checkbox" name="is_anonymous" /> Keep donor identity anonymous publicly
        </label>
      </div>

      <div className="pledge-detail-panel" key={donationType}>
        {donationType === "GOODS" ? (
          <fieldset>
            <legend>Goods details</legend>
            <div className="form-grid form-grid-3">
              <label>Item<input name="item_name" required placeholder="Rice, water, medicine…" /></label>
              <label>Quantity<input name="quantity" type="number" min="0.01" step="any" required /></label>
              <label>Unit<input name="unit" required placeholder="packs, cases, units…" /></label>
            </div>
          </fieldset>
        ) : (
          <fieldset>
            <legend>Funds details</legend>
            <div className="form-grid form-grid-3">
              <label>Amount (PHP)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
              <label>Payment method<input name="payment_method" placeholder="Bank transfer, cash deposit…" /></label>
              <label>Reference / receipt no.<input name="payment_reference" placeholder="Transaction reference" /></label>
            </div>
          </fieldset>
        )}
      </div>

      <label>Message / instructions<textarea name="donor_message" rows={3} placeholder="Pickup details, item notes, donor instructions…" /></label>
      {donationType === "FUNDS" && (
        <p className="form-note">Safe Sphere records the pledge and payment reference. An authorized response coordinator verifies the payment before it is marked confirmed.</p>
      )}
      <SubmitButton className="button button-green" disabled={!incidents.length} pendingText="Submitting pledge…">Submit donation pledge</SubmitButton>
      {!incidents.length && <p className="form-note">There are no open incidents available for donation targeting.</p>}
    </form>
  );
}
