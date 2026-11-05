import { SafeSphereMark } from "@/components/brand/safe-sphere-logo";

export default function GlobalLoading() {
  return (
    <div className="global-loading" role="status" aria-live="polite">
      <div className="global-loading-console">
        <div className="radar-loader-wrapper" aria-hidden="true">
          <div className="radar-ring" />
          <div className="radar-ring-inner" />
          <div className="radar-sweep" />
          <div className="radar-core-logo">
            <SafeSphereMark size="lg" />
          </div>
        </div>

        <h2 className="global-loading-title">Safe Sphere Mission Control</h2>
        <p className="global-loading-subtitle">
          Synchronizing GIS hazard telemetry & crisis readiness matrix…
        </p>

        <div className="telemetry-progress-bar" aria-hidden="true">
          <div className="telemetry-progress-fill" />
        </div>

        <div className="telemetry-status-terminal">
          <span>
            <i className="telemetry-ping-dot" />
            TELEMETRY MESH ONLINE
          </span>
          <span>LATENCY &lt; 20ms</span>
        </div>
      </div>
    </div>
  );
}
