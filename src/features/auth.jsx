import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export function AuthScreen({ enterDemoMode }) {
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = email.trim() && password.length >= 6;

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured. Check your Cloudflare environment variables.");
      return;
    }

    if (!canSubmit) {
      setMessage("Enter an email and a password with at least 6 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signUp") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim() || email.trim().split("@")[0] } }
        });

        if (error) throw error;
        setMessage("Account created. Check your email if Supabase asks for confirmation, then sign in.");
        setMode("signIn");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) setMessage(error.message || "Google sign-in failed.");
  };

  const resetPassword = async () => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin
    });

    if (error) setMessage(error.message);
    else setMessage("Password reset email sent.");
  };

  return (
    <div className="app-shell">
      <main className="phone auth-phone">
        <section className="auth-card">
          <div className="app-icon large">GV</div>
          <h1>Grow UP</h1>
          <p>Sign in to sync your snapshots, goals, and wealth progress.</p>

          <div className="auth-tabs">
            <button className={mode === "signIn" ? "active" : ""} onClick={()=>setMode("signIn")}>Sign in</button>
            <button className={mode === "signUp" ? "active" : ""} onClick={()=>setMode("signUp")}>Create account</button>
          </div>

          <button className="google-auth-btn" onClick={signInWithGoogle} type="button">
            <span>G</span>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={submit}>
            {mode === "signUp" && (
              <label>
                First name
                <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Your first name" />
              </label>
            )}

            <label>
              Email
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </label>

            <label>
              Password
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 characters" autoComplete={mode === "signIn" ? "current-password" : "new-password"} />
            </label>

            {message && <div className="auth-message">{message}</div>}

            <button className="primary full" disabled={busy || !canSubmit}>
              {busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signIn" && (
            <button className="link-btn" onClick={resetPassword}>Forgot password?</button>
          )}

          <button className="demo-auth-btn" type="button" onClick={enterDemoMode}>
            Explore Demo
          </button>

          <div className="auth-legal-links">
            <a href="/privacy">Privacy Policy</a>
            <span>•</span>
            <a href="/terms">Terms</a>
          </div>
        </section>
      </main>
    </div>
  );
}


