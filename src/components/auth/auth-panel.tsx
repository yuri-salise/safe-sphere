"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hasSupabasePublicConfig } from "@/lib/config";

type AuthPanelProps = {
  mode: "login" | "register";
};

export function AuthPanel({ mode }: AuthPanelProps) {
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("DONOR");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = hasSupabasePublicConfig();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setMessage("Account services are not available on this deployment.");
      return;
    }

    setPending(true);
    setMessage(null);

    let keepPending = false;

    try {
      const supabase = createClient();

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name, requested_role: role },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });
        if (error) throw error;
        if (data.session) {
          keepPending = true;
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/dashboard");
          return;
        }
        setMessage(
          "Registration submitted. Check your email to confirm your account.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        keepPending = true;
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/dashboard");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      if (!keepPending) setPending(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div>
        <span className="eyebrow">Secure access</span>
        <h1>{isRegister ? "Create your Safe Sphere account" : "Welcome back"}</h1>
        <p>
          {isRegister
            ? "Create a verified community account for donations, recipient confirmation, or volunteer coordination."
            : "Sign in to access your assigned Safe Sphere command tools."}
        </p>
      </div>

      {isRegister && (
        <>
          <label>
            Display name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label>
            Primary community role
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="DONOR">Donor</option>
              <option value="RECIPIENT">Recipient</option>
              <option value="VOLUNTEER">Volunteer</option>
            </select>
          </label>
          <small className="field-hint">
            DRRMO, coordinator, logistics, rescue-personnel, and administrator roles are granted by an administrator.
          </small>
        </>
      )}

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </label>

      <button
        className="button button-green button-full auth-submit-button"
        disabled={pending || !configured}
        aria-busy={pending}
      >
        {pending && <span className="button-spinner" aria-hidden="true" />}
        <span>{pending ? (isRegister ? "Creating account…" : "Signing in…") : isRegister ? "Create account" : "Log in"}</span>
      </button>

      {pending && (
        <div className="auth-pending-message" role="status" aria-live="polite">
          <span className="auth-pending-dot" aria-hidden="true" />
          {isRegister
            ? "Creating your secure Safe Sphere account. This may take a moment."
            : "Verifying your account and opening your dashboard…"}
        </div>
      )}

      {!configured && <div className="auth-message">Account services are not configured for this deployment.</div>}
      {message && <div className="auth-message">{message}</div>}

      <p className="auth-switch">
        {isRegister ? "Already registered?" : "Need an account?"} {" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Log in" : "Register"}
        </Link>
      </p>
    </form>
  );
}
