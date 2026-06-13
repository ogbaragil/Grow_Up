import React, { useState } from "react";
import { Eye, EyeOff, Info, Lock, Mail, ShieldCheck } from "lucide-react";
import { supabase, setKeepSignedIn } from "../supabaseClient";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16.37 12.93c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.44 2.5-.37 6.19 1.04 8.22.69.99 1.51 2.1 2.58 2.06 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.6.67 2.7.65 1.11-.02 1.82-1.01 2.5-2.01.79-1.15 1.11-2.27 1.13-2.32-.02-.01-2.17-.83-2.19-3.3zM14.3 6.87c.57-.69.95-1.65.85-2.6-.82.03-1.81.54-2.4 1.23-.52.61-.98 1.58-.86 2.51.91.07 1.84-.46 2.41-1.14z"/>
    </svg>
  );
}

export function AuthLogo() {
  return <img className="auth-logo-img" src="/icons/growup-logo.png" alt="Grow UP" />;
}

export function AuthScreen({ enterDemoMode, initialMode = "signIn" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedInState] = useState(true);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [message, setMessage] = useState(null); // { text, type: "error" | "success" | "info" }

  const canSubmit = email.trim() && password.length >= 6;
  const say = (text, type = "info") => setMessage(text ? { text, type } : null);

  const submit = async (event) => {
    event.preventDefault();
    say(null);

    if (!supabase) {
      say("We're having trouble connecting right now. Please try again shortly.", "error");
      return;
    }

    if (!canSubmit) {
      say("Enter an email and a password with at least 6 characters.", "error");
      return;
    }

    setBusy(true);
    setKeepSignedIn(keepSignedIn);

    try {
      if (mode === "signUp") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim() || email.trim().split("@")[0] } }
        });

        if (error) throw error;

        if (data?.session) {
          // Email confirmation disabled — user is signed in, the app takes over.
          return;
        }

        say(`Check your inbox — we've sent a confirmation link to ${email.trim()}. Open it to activate your account, then sign in here.`, "success");
        setMode("signIn");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      say(error.message || "Authentication failed. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    say(null);

    if (!supabase) {
      say("We're having trouble connecting right now. Please try again shortly.", "error");
      return;
    }

    setGoogleBusy(true);
    setKeepSignedIn(keepSignedIn);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      setGoogleBusy(false);
      say(error.message || "Google sign-in failed.", "error");
    }
    // On success the browser redirects to Google, so the busy state can stay on.
  };

  const signInWithApple = async () => {
    say(null);

    if (!supabase) {
      say("We're having trouble connecting right now. Please try again shortly.", "error");
      return;
    }

    setAppleBusy(true);
    setKeepSignedIn(keepSignedIn);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      setAppleBusy(false);
      say(error.message || "Apple sign-in failed.", "error");
    }
    // On success the browser redirects to Apple, so the busy state can stay on.
  };

  const resetPassword = async () => {
    if (!supabase) {
      say("We're having trouble connecting right now. Please try again shortly.", "error");
      return;
    }

    if (!email.trim()) {
      say("Enter your email above first, then tap Forgot password.", "error");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin
    });

    if (error) say(error.message, "error");
    else say(`Password reset email sent to ${email.trim()}. Open the link on this device to choose a new password.`, "success");
  };

  return (
    <div className="app-shell">
      <main className="phone auth-phone">
        <section className="auth-card">
          <a
            className="auth-learn-icon"
            href="https://ogbara.com.au/growup/" target="_blank" rel="noopener"
            aria-label="Learn more about Grow UP"
            title="Learn more about Grow UP"
          >
            <Info size={20} />
          </a>
          <AuthLogo />
          <h1>Grow UP</h1>
          <p>{mode === "signIn"
            ? "Welcome back. Pick up where you left off."
            : "Free to start — see your complete financial picture in minutes."}</p>

          <div className="auth-tabs">
            <button className={mode === "signIn" ? "active" : ""} onClick={()=>{setMode("signIn"); say(null);}}>Sign in</button>
            <button className={mode === "signUp" ? "active" : ""} onClick={()=>{setMode("signUp"); say(null);}}>Create account</button>
          </div>

          <button className="apple-auth-btn" onClick={signInWithApple} type="button" disabled={appleBusy}>
            <AppleMark />
            {appleBusy ? "Connecting…" : "Continue with Apple"}
          </button>

          <button className="google-auth-btn" onClick={signInWithGoogle} type="button" disabled={googleBusy}>
            <GoogleMark />
            {googleBusy ? "Connecting…" : "Continue with Google"}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={submit}>
            {mode === "signUp" && (
              <label>
                First name
                <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Your first name" autoComplete="given-name" />
              </label>
            )}

            <label>
              Email address
              <div className="auth-field">
                <Mail className="auth-field-icon" size={18} />
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
            </label>

            <label>
              Password
              <div className="auth-field password-wrap">
                <Lock className="auth-field-icon" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder={mode === "signIn" ? "Your password" : "Minimum 6 characters"}
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(v => !v)}
                >{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
            </label>

            <div className="auth-remember-row">
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={e => setKeepSignedInState(e.target.checked)}
                />
                <span>Keep me signed in</span>
              </label>
              {mode === "signIn" && (
                <button type="button" className="auth-forgot" onClick={resetPassword}>Forgot password?</button>
              )}
            </div>

            {message && <div className={`auth-message ${message.type}`} aria-live="polite">{message.text}</div>}

            <button className="primary full" disabled={busy || !canSubmit}>
              {busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
            </button>

            <div className="auth-secure-note">
              <ShieldCheck size={16} />
              <span>Your data is encrypted and private.</span>
            </div>
          </form>

          <div className="auth-divider auth-new-divider"><span>New to Grow UP?</span></div>

          <div className="auth-cta-row">
            <a className="auth-cta auth-cta-learn" href="https://ogbara.com.au/growup/" target="_blank" rel="noopener">Learn more</a>
            <button className="auth-cta auth-cta-demo" type="button" onClick={enterDemoMode}>Explore demo</button>
          </div>

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

export function ResetPasswordScreen({ onDone, notify = () => {} }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ text: "Password needs at least 6 characters.", type: "error" });
      return;
    }
    if (password !== confirm) {
      setMessage({ text: "Passwords don't match.", type: "error" });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setMessage({ text: error.message || "Could not update password. Please try again.", type: "error" });
      return;
    }

    notify("Password updated — you're signed in.", "success");
    onDone();
  };

  return (
    <div className="app-shell">
      <main className="phone auth-phone">
        <section className="auth-card">
          <AuthLogo />
          <h1>Set a new password</h1>
          <p>You followed a password reset link. Choose a new password to finish.</p>

          <form onSubmit={submit}>
            <label>
              New password
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(v => !v)}
                >{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
            </label>

            <label>
              Confirm new password
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={e=>setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                autoComplete="new-password"
              />
            </label>

            {message && <div className={`auth-message ${message.type}`} aria-live="polite">{message.text}</div>}

            <button className="primary full" disabled={busy || !password || !confirm}>
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
