import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { appConfig } from "@/lib/config";

const capabilities = [
  {
    number: "01",
    title: "Calamity intelligence",
    text: "Capture verified incident details, severity, affected population, GIS coordinates, and live operational updates in one unified record.",
  },
  {
    number: "02",
    title: "Resource coordination",
    text: "Make personnel, volunteer, vehicle, and logistics availability visible to authorized coordinators when decisions are mission-critical.",
  },
  {
    number: "03",
    title: "Aid transparency ledger",
    text: "Track goods and funds through pledge, assignment, transit, delivery, and digital recipient confirmation instead of an opaque status.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero-section page-enter">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <StatusPill tone="green">Safe Sphere Protocol Active</StatusPill>
            <h1>
              Disaster response is stronger when everyone sees the same operational picture.
            </h1>
            <p>
              {appConfig.name} unifies incident GIS mapping, responder readiness, relief logistics,
              and verifiable donation transparency into a modern, high-integrity coordination network.
            </p>
            <div className="hero-actions">
              <Link className="button button-green button-large" href="/map">
                Explore Live Map ↗
              </Link>
              <Link className="button button-outline-light button-large" href="/dashboard">
                Launch Operations Console
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-label="Safe Sphere operating model preview">
            <div className="signal-card signal-main">
              <span>SITUATIONAL AWARENESS</span>
              <strong>Live GIS Map + Verified Feeds</strong>
              <p>Incidents, urgent needs, responder teams, and transport in one operational view</p>
              <div className="progress-line"><i /></div>
              <div className="signal-stats">
                <span><b>Map</b> incidents</span>
                <span><b>Needs</b> relief</span>
                <span><b>Teams</b> ready</span>
              </div>
            </div>
            <div className="signal-card signal-float signal-one">
              <span>AUDIT LEDGER</span>
              <strong>Chain of Custody</strong>
              <p>Pledge through digital recipient sign-off</p>
            </div>
            <div className="signal-card signal-float signal-two">
              <span>READINESS MATRIX</span>
              <strong>Personnel & Fleet</strong>
              <p>Availability before dispatch</p>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-grid">
          <span>REAL-TIME GIS MAP</span>
          <span>ROLE-BASED GOVERNANCE</span>
          <span>AID CHAIN OF CUSTODY</span>
          <span>PERSONNEL READINESS</span>
        </div>
      </section>

      <section id="capabilities" className="section shell">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">High-Integrity Operations</span>
            <h2>Built around the reality of emergency response</h2>
          </div>
          <p>
            {appConfig.name} brings incident awareness, responder readiness, relief movement, and
            donation accountability into a single operational interface for swift, clear coordination.
          </p>
        </div>

        <div className="capability-grid">
          {capabilities.map((item) => (
            <article className="capability-card" key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-muted">
        <div className="shell workflow-grid">
          <div>
            <span className="eyebrow">Operational Protocol</span>
            <h2>From verified report to documented outcome.</h2>
            <p>
              Every emergency operation is modeled as a sequence of auditable events so the
              platform shows not only the current state, but the complete chain of how it was resolved.
            </p>
          </div>
          <ol className="workflow-list">
            <li><b>01</b><span>Incident reported and verified</span></li>
            <li><b>02</b><span>Needs and affected sectors mapped</span></li>
            <li><b>03</b><span>Personnel and transport atomically assigned</span></li>
            <li><b>04</b><span>Relief moved with cryptographic status events</span></li>
            <li><b>05</b><span>Recipient digitally confirms delivery receipt</span></li>
          </ol>
        </div>
      </section>
    </>
  );
}
