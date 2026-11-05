import Link from "next/link";
import { SafeSphereLogo } from "@/components/brand/safe-sphere-logo";
import { getUserContext } from "@/lib/auth";

export async function SiteHeader() {
  const context = await getUserContext();
  const signedIn = Boolean(context);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <SafeSphereLogo />
        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/map">Live Map</Link>
          <Link href="/transparency">Transparency</Link>
          <Link href="/#capabilities">Capabilities</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <div className="header-actions">
          {signedIn ? (
            <Link className="button button-green" href="/dashboard">
              Launch Console
            </Link>
          ) : (
            <>
              <Link className="button button-ghost" href="/login">
                Log in
              </Link>
              <Link className="button button-green" href="/register">
                Join Safe Sphere
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
