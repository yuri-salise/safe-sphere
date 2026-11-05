export default function DashboardLoading() {
  return (
    <div className="dashboard-content loading-stack" aria-label="Loading dashboard">
      <div className="skeleton skeleton-title" />
      <div className="metric-grid">
        <div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-panel" />
    </div>
  );
}
