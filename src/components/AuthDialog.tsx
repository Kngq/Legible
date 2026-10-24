"use client";

// Email + password sign up / log in modal, backed by Supabase. Handles only the
// account; it never reads or writes the Legible profile. Opens from the header's
// Login and Sign up buttons.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./AuthProvider";
import { Button, FOCUS } from "./ui";
import { Glyph } from "./icons";

export type AuthMode = "login" | "signup";

export function AuthDialog({ mode: initial, onClose }: { mode: AuthMode; onClose: () => void }) {
  const { configured, signUp, signIn } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const signup = mode === "signup";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    const addr = email.trim();
    if (!addr || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (signup && password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = signup ? await signUp(addr, password, name) : await signIn(addr, password);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.needsConfirmation) {
        setNotice("Check your email to confirm your account, then log in.");
        setMode("login");
        setPassword("");
        return;
      }
      onClose(); // signed in
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 h-full w-full bg-foreground/30" tabIndex={-1} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-xl bg-background p-6 shadow-card outline-none"
      >
        <div className="flex items-start justify-between">
          <h2 id="auth-title" className="font-display text-title">
            {signup ? "Create your account" : "Log in"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className={`-mr-2 -mt-1 flex size-10 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS}`}>
            <Glyph name="close" />
          </button>
        </div>

        <p className="mt-1 text-small text-muted-foreground">
          Your account is separate from your profile. Your town and answers stay in this browser.
        </p>

        {!configured ? (
          <p className="mt-4 rounded-md bg-surface-muted p-3 text-small">Accounts aren&apos;t set up in this environment yet.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            {signup && (
              <div>
                <label htmlFor="auth-name" className="text-small font-semibold">Name</label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name or nickname"
                  className={`mt-1 h-11 w-full rounded-md bg-surface px-3 text-body shadow-hairline placeholder:text-muted-foreground ${FOCUS}`}
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="text-small font-semibold">Email</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 h-11 w-full rounded-md bg-surface px-3 text-body shadow-hairline ${FOCUS}`}
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="text-small font-semibold">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 h-11 w-full rounded-md bg-surface px-3 text-body shadow-hairline ${FOCUS}`}
              />
            </div>

            {error && <p role="alert" className="text-small font-semibold text-attention-strong">{error}</p>}
            {notice && <p className="text-small text-muted-foreground">{notice}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Working…" : signup ? "Create account" : "Log in"}
            </Button>
          </form>
        )}

        {configured && (
          <p className="mt-4 text-center text-small text-muted-foreground">
            {signup ? "Already have an account?" : "No account yet?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(signup ? "login" : "signup");
                setError(null);
                setNotice(null);
              }}
              className={`font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent ${FOCUS}`}
            >
              {signup ? "Log in" : "Sign up"}
            </button>
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
