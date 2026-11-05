export default function GlobalLoading() {
  return (
    <div className="global-loading" role="status" aria-live="polite">
      <div className="global-loading-card">
        <span className="global-loader-mark" aria-hidden="true" style={{ background: "#000000", color: "#00ff66", border: "1px solid rgba(0,255,102,0.3)" }}>SS</span>
        <span className="global-loading-spinner" aria-hidden="true" />
        <strong>Loading Safe Sphere</strong>
        <span>Synchronizing telemetry & operational data…</span>
      </div>
    </div>
  );
}
