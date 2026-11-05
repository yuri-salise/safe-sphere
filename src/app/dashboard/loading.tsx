export default function DashboardLoading() {
  return (
    <div className="dashboard-content loading-stack" role="status" aria-live="polite">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div className="skeleton" style={{ height: 32, width: 220, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 340, borderRadius: 6 }} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontFamily: "var(--font-geist-mono)",
            color: "var(--sphere-neon)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--sphere-neon)",
              boxShadow: "0 0 8px var(--sphere-neon)",
              display: "inline-block",
              animation: "safe-pulse-dot 1s infinite alternate",
            }}
          />
          SYNCING TELEMETRY…
        </div>
      </div>

      <div className="metric-grid">
        <div className="skeleton" style={{ height: 110, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 110, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 110, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 110, borderRadius: 14 }} />
      </div>

      <div className="skeleton" style={{ height: 340, borderRadius: 16, marginTop: 8 }} />
    </div>
  );
}
