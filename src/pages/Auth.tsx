import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.ts";
import { useApp } from "../state.tsx";
import { ErrorText, Field, useSubmit } from "../components/ui.tsx";
import type { Me } from "../../shared/types.ts";

export function AuthPage() {
  const { code } = useParams();
  const { setMe, reloadMe } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">(code ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", inviteCode: code ?? "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { busy, error, submit } = useSubmit(async () => {
    if (mode === "register") {
      setMe(await api<Me>("POST", "/auth/register", form));
    } else {
      await api("POST", "/auth/login", { email: form.email, password: form.password });
      // If they arrived via an invite link, join after signing in.
      if (code) await api("POST", "/households/join", { code });
      await reloadMe();
    }
    navigate("/", { replace: true });
  });

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <img src="/icon.svg" alt="" />
          Pawlease
        </div>
        <p className="tagline">Everything your dogs need, shared with the people who love them.</p>
        {code && (
          <div className="callout" style={{ textAlign: "center" }}>
            🎉 You've been invited to join a household. {mode === "register" ? "Create an account" : "Sign in"} to accept.
          </div>
        )}
        <div className="card">
          <div className="segmented" role="group" aria-label="Sign in or create account">
            <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
              Sign in
            </button>
            <button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>
              Create account
            </button>
          </div>
          <form className="form" onSubmit={submit}>
            {mode === "register" && (
              <Field label="Your name">
                <input className="input" required autoComplete="name" value={form.name} onChange={set("name")} />
              </Field>
            )}
            <Field label="Email">
              <input className="input" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Password" hint={mode === "register" ? "At least 8 characters" : undefined}>
              <input
                className="input"
                type="password"
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={form.password}
                onChange={set("password")}
              />
            </Field>
            {mode === "register" && (
              <Field label="Family invite code (optional)" hint="Have a code from family? Enter it to share their dogs. Leave blank to start your own household.">
                <input
                  className="input"
                  autoCapitalize="characters"
                  value={form.inviteCode}
                  onChange={set("inviteCode")}
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
                />
              </Field>
            )}
            <ErrorText error={error} />
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "One moment…" : mode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
