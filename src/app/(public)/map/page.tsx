import type { Metadata } from "next";
import { SafeSphereMap } from "@/components/map/safe-sphere-map";
import Link from "next/link";
import { getUserContext, isResponseStaff } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Live Incident Map",
  description: "Real-time disaster situational awareness, affected population, and active hazard telemetry.",
};

export default async function MapPage() {
  const context = await getUserContext();
  const reportPath = context
    ? isResponseStaff(context.roles)
      ? "/dashboard/incidents"
      : "/dashboard/incidents#report"
    : "/login";

  return (
    <section className="section shell map-page page-enter">
      <div className="section-heading split-heading">
        <div>
          <span className="eyebrow">Real-Time Situational Awareness</span>
          <h1>Live Incident Map</h1>
        </div>
        <p>
          View active emergency locations, severity ratings, response status, and estimated people
          affected across the operational jurisdiction in one shared telemetry console.
        </p>
      </div>
      <SafeSphereMap />
      <div className="form-actions" style={{ marginTop: "24px" }}>
        <Link className="button button-green button-large" href={reportPath}>
          {context ? "Mark a Location & Report Incident" : "Sign In to Report Incident"}
        </Link>
        <Link className="button button-ghost button-large" href="/transparency">
          View Aid Transparency Ledger ↗
        </Link>
      </div>
    </section>
  );
}
