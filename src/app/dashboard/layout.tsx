import Link from "next/link";
import { SafeSphereLogo } from "@/components/brand/safe-sphere-logo";
import { DashboardUser } from "@/components/dashboard/dashboard-user";
import { requireUserContext } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await requireUserContext();
  const isAdmin = context.roles.includes("ADMIN");

  const navItems = [
    ["Overview", "/dashboard"],
    ["Incidents", "/dashboard/incidents"],
    ["Donations", "/dashboard/donations"],
    ["Personnel", "/dashboard/personnel"],
    ["Logistics", "/dashboard/logistics"],
    ["Reports", "/dashboard/reports"],
    ...(isAdmin ? [["Administration", "/dashboard/admin"]] : []),
  ] as const;

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <SafeSphereLogo href="/dashboard" />
        <nav aria-label="Operations dashboard">
          {navItems.map(([label, href]) => (
            <Link href={href} key={href}>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-public-links">
          <Link href="/map">Live GIS Map ↗</Link>
          <Link href="/transparency">Aid Transparency ↗</Link>
        </div>
        <DashboardUser
          name={context.profile?.display_name || context.user.email?.split("@")[0] || "Safe Sphere operator"}
          email={context.user.email || ""}
          roles={context.roles}
        />
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
