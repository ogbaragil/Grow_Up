import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const KEEP_SIGNED_IN_KEY = "growup_keep_signed_in";

// Records whether the user asked to stay signed in across browser restarts.
// Call this right before sign in / sign up / OAuth so the storage adapter
// below knows where to persist the session token. Defaults to "keep" so
// returning users (and anyone who never touched the checkbox) stay logged in.
export function setKeepSignedIn(keep) {
  try {
    window.localStorage.setItem(KEEP_SIGNED_IN_KEY, keep ? "true" : "false");
  } catch { /* storage unavailable — fall back to default keep */ }
}

function keepSignedIn() {
  try {
    return window.localStorage.getItem(KEEP_SIGNED_IN_KEY) !== "false";
  } catch {
    return true;
  }
}

// Hybrid storage for the Supabase auth token:
//  • "Keep me signed in" ON  → localStorage  (survives a full browser close)
//  • "Keep me signed in" OFF → sessionStorage (cleared when the browser closes)
// Reads check both stores so an existing session is always found, regardless
// of where it was written — this keeps already-signed-in users logged in after
// the upgrade.
const authStorage = {
  getItem: (k) => {
    try {
      const fromSession = window.sessionStorage.getItem(k);
      if (fromSession !== null) return fromSession;
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      if (keepSignedIn()) {
        window.localStorage.setItem(k, v);
        window.sessionStorage.removeItem(k);
      } else {
        window.sessionStorage.setItem(k, v);
        window.localStorage.removeItem(k);
      }
    } catch { /* ignore */ }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
      window.sessionStorage.removeItem(k);
    } catch { /* ignore */ }
  },
};

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const SUPABASE_URL = url || "";
export const SUPABASE_ANON_KEY = key || "";
