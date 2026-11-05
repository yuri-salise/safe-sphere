import { appConfig } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <strong>{appConfig.name}</strong>
          <p>Real-time coordination, resource readiness, and immutable disaster relief transparency.</p>
        </div>
        <span>Encrypted Operations & Community Safety Protocol</span>
      </div>
    </footer>
  );
}
