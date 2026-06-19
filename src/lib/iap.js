// src/lib/iap.js
// Bridge between the web app (running inside the iOS WKWebView wrapper) and
// native StoreKit In-App Purchase.
//
// On the web / PWA build there is no native message handler, so `isNativeIOS()`
// returns false and callers fall back to the existing Stripe checkout flow.
// Inside the iOS wrapper, native registers a WKScriptMessageHandler named
// "growupIAP" and calls window.__growupIAP_resolve(id, result) when done.

const handler = () =>
  (typeof window !== "undefined" && window.webkit?.messageHandlers?.growupIAP) || null;

/** True only when running inside the native iOS wrapper. */
export const isNativeIOS = () => !!handler();

let _seq = 0;
const _pending = new Map();

if (typeof window !== "undefined") {
  // Native invokes this after a purchase / restore / manage call finishes.
  // result = { ok: boolean, error?: string }
  window.__growupIAP_resolve = (id, result) => {
    const p = _pending.get(id);
    if (!p) return;
    _pending.delete(id);
    if (result && result.ok) p.resolve(result);
    else p.reject(new Error(result?.error || "purchase_failed"));
  };
}

function send(action, payload = {}) {
  const mh = handler();
  if (!mh) return Promise.reject(new Error("native_unavailable"));
  const id = ++_seq;
  return new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject });
    // Safety timeout so the UI never hangs if native never calls back.
    setTimeout(() => {
      if (_pending.has(id)) {
        _pending.delete(id);
        reject(new Error("timeout"));
      }
    }, 180_000);
    mh.postMessage({ id, action, ...payload });
  });
}

// ctx carries everything native needs to record the entitlement server-side:
//   { token, validateUrl, anonKey }
// - token      : the user's current Supabase access token (so the edge
//                function knows which user to credit)
// - validateUrl: `${SUPABASE_URL}/functions/v1/iap-validate`
// - anonKey    : SUPABASE_ANON_KEY (public; required as the apikey header)

/**
 * Trigger a native StoreKit purchase.
 * @param {"monthly"|"annual"} plan
 * @param {{token:string, validateUrl:string, anonKey:string}} ctx
 * Resolves once native has recorded the entitlement server-side; the caller
 * should then call refreshSubscription() to pull the updated status.
 * Rejects with Error("cancelled") if the user backs out.
 */
export const purchasePro = (plan, ctx) => send("purchase", { plan, ...ctx });

/** Restore previous purchases (required by Apple for subscription apps). */
export const restorePurchases = (ctx) => send("restore", ctx);

/** Open the iOS system subscription-management screen. */
export const openManageSubscriptions = () => send("manage");
