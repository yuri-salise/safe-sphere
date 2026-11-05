"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Safe Sphere application error", error);
  }, [error]);

  return (
    <main className="fatal-state">
      <div className="fatal-card">
        <span className="eyebrow">Safe Sphere</span>
        <h1>Operational Error Encountered</h1>
        <p>The requested operation could not be completed. Retry the page; if the issue persists, verify database configuration or notify administration.</p>
        <button className="button button-green" type="button" onClick={reset}>Try Again</button>
      </div>
    </main>
  );
}
