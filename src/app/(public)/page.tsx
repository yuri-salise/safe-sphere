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
              Real-Time Disaster Operations. <br />
              <span className="hero-highlight">Zero Latency Coordination.</span>
            </h1>
            <p>
              {appConfig.name} synchronizes GIS hazard mapping, emergency fleet readiness,
              inter-agency response feeds, and an immutable humanitarian aid ledger into a single,
              high-contrast mission control console.
            </p>
            <div className="hero-actions">
              <Link className="button button-green button-large" href="/map">
                Explore Live Radar Map ↗
              </Link>
              <Link className="button button-outline-light button-large" href="/dashboard">
                Launch Mission Console
              </Link>
            </div>

            <div className="hero-kpis">
              <div className="hero-kpi-item">
                <i />
                <span>Live GIS Hazard Mesh</span>
              </div>
              <div className="hero-kpi-item">
                <i />
                <span>Cryptographic Aid Audit</span>
              </div>
              <div className="hero-kpi-item">
                <i />
                <span>Conflict-Free Fleet Dispatch</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Safe Sphere mission control telemetry preview">
            <div className="hero-telemetry-hud">
              <div className="hud-header">
                <div className="hud-status-live">
                  <i />
                  <span>MISSION CONTROL ONLINE</span>
                </div>
                <div className="hud-coords">
                  7.8582° N, 125.0499° E
                </div>
              </div>

              <div className="hud-alert-card">
                <div className="hud-alert-top">
                  <span className="hud-alert-badge">HIGH PRIORITY ALERT</span>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "var(--font-geist-mono)" }}>
                    INC-DEMO-001
                  </span>
                </div>
                <strong>Flood Monitoring Point — Central Sector</strong>
                <p>83 residents sheltered • Water levels stabilizing • Field team active</p>
              </div>

              <div className="hud-fleet-row">
                <div className="hud-fleet-pill">
                  <span>VEHICLE ASSET</span>
                  <strong>
                    SPHERE-DEMO-01
                    <i>READY</i>
                  </strong>
                </div>
                <div className="hud-fleet-pill">
                  <span>DISPATCH TEAM</span>
                  <strong>
                    FIELD UNIT 04
                    <i>ACTIVE</i>
                  </strong>
                </div>
              </div>

              <div className="hud-ledger-chain">
                <div className="hud-ledger-head">
                  <span>IMMUTABLE CHAIN OF CUSTODY</span>
                  <b>DON-9842F</b>
                </div>
                <div className="hud-chain-steps">
                  <div className="hud-chain-line" />
                  <div className="hud-chain-step active">
                    <div className="hud-step-node" />
                    <span>PLEDGED</span>
                  </div>
                  <div className="hud-chain-step active">
                    <div className="hud-step-node" />
                    <span>VERIFIED</span>
                  </div>
                  <div className="hud-chain-step active">
                    <div className="hud-step-node" />
                    <span>TRANSIT</span>
                  </div>
                  <div className="hud-chain-step">
                    <div className="hud-step-node" />
                    <span>DELIVERED</span>
                  </div>
                </div>
              </div>

              <div className="hud-footer">
                <span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff66" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  POSTGRES RLS VERIFIED
                </span>
                <span>WS REPLICATION: LIVE</span>
              </div>
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
