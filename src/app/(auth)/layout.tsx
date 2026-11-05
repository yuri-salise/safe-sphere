import Link from "next/link";
import { redirect } from "next/navigation";
import { SafeSphereLogo } from "@/components/brand/safe-sphere-logo";
import { getUserContext } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const context = await getUserContext();
  if (context) redirect("/dashboard");

  return (
    <main className="auth-layout page-enter">
      <section className="auth-brand-panel">
        <SafeSphereLogo href="/" />
        <div>
          <span className="eyebrow eyebrow-light">Secure Access Portal</span>
          <h2>Cryptographically protected disaster response operations.</h2>
          <p>
            Authenticate to coordinate incident reports, personnel readiness matrices,
            logistics dispatch, and verifiable aid distribution from a single command console.
          </p>
        </div>
        <Link href="/" className="text-link text-link-light">
          ← Back to public overview
        </Link>
      </section>
      <section className="auth-form-panel">{children}</section>
    </main>
  );
}
