import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fatal-state">
      <div className="fatal-card">
        <span className="eyebrow">404 Error</span>
        <h1>Record Not Found</h1>
        <p>The requested Safe Sphere page or record is unavailable, does not exist, or requires elevated authorization.</p>
        <Link className="button button-green" href="/">Return to Home</Link>
      </div>
    </main>
  );
}
