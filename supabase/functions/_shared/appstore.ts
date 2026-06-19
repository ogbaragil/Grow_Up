// supabase/functions/_shared/appstore.ts
//
// Helpers for talking to Apple's App Store Server API. We authenticate to
// Apple with an App Store Connect API key (ES256 JWT) and then ask Apple for
// the authoritative transaction record. Because the data comes back from
// Apple's own authenticated, TLS-protected API, it is the source of truth for
// entitlement — we do not have to verify the JWS certificate chain ourselves.
//
// Required Supabase secrets (set with `supabase secrets set ...`):
//   APP_STORE_ISSUER_ID   - App Store Connect API issuer id (UUID)
//   APP_STORE_KEY_ID      - the .p8 key id (e.g. ABC123DEFG)
//   APP_STORE_PRIVATE_KEY - full contents of the .p8 file (BEGIN/END lines incl.)
//   APP_BUNDLE_ID         - app.growupapp
//   APP_STORE_ENV         - "Production" or "Sandbox" (defaults to trying prod then sandbox)

import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const ISSUER_ID = Deno.env.get("APP_STORE_ISSUER_ID")!;
const KEY_ID = Deno.env.get("APP_STORE_KEY_ID")!;
const PRIVATE_KEY_PEM = Deno.env.get("APP_STORE_PRIVATE_KEY")!;
export const BUNDLE_ID = Deno.env.get("APP_BUNDLE_ID") || "app.growupapp";

const PROD_HOST = "https://api.storekit.itunes.apple.com";
const SANDBOX_HOST = "https://api.storekit-sandbox.itunes.apple.com";

// Map App Store Connect product ids -> the plan strings the app uses.
export const PRODUCT_TO_PLAN: Record<string, string> = {
  "app.growupapp.pro.monthly": "monthly",
  "app.growupapp.pro.annual": "annual",
};

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function appStoreJWT(): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(PRIVATE_KEY_PEM),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  return await create(
    { alg: "ES256", kid: KEY_ID, typ: "JWT" },
    {
      iss: ISSUER_ID,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 20), // 20 minutes
      aud: "appstoreconnect-v1",
      bid: BUNDLE_ID,
    },
    key,
  );
}

// Decode (without verifying) the payload of an Apple-signed JWS string.
export function decodeJWSPayload<T = Record<string, unknown>>(jws: string): T {
  const part = jws.split(".")[1];
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "="));
  return JSON.parse(json) as T;
}

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  type: string;
  expiresDate?: number; // ms epoch
  offerType?: number;   // 1 = introductory (free trial), etc.
  revocationDate?: number;
}

async function getTransactionFromHost(host: string, jwt: string, txId: string) {
  const res = await fetch(`${host}/inApps/v1/transactions/${txId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (res.status === 404) return null;          // not found on this host
  if (!res.ok) throw new Error(`App Store API ${res.status}: ${await res.text()}`);
  const { signedTransactionInfo } = await res.json();
  return decodeJWSPayload<AppleTransaction>(signedTransactionInfo);
}

// Look up a transaction authoritatively, trying production then sandbox so the
// same code works for App Review (sandbox) and live users (production).
export async function getTransaction(txId: string): Promise<AppleTransaction> {
  const jwt = await appStoreJWT();
  const env = Deno.env.get("APP_STORE_ENV");
  const order = env === "Sandbox" ? [SANDBOX_HOST, PROD_HOST] : [PROD_HOST, SANDBOX_HOST];
  for (const host of order) {
    const tx = await getTransactionFromHost(host, jwt, txId);
    if (tx) return tx;
  }
  throw new Error("transaction_not_found");
}

// Translate an Apple transaction into the row shape growup_subscriptions uses.
export function entitlementFromTransaction(tx: AppleTransaction) {
  const plan = PRODUCT_TO_PLAN[tx.productId] || "monthly";
  const now = Date.now();
  const active = !tx.revocationDate && (!tx.expiresDate || tx.expiresDate > now);
  let status: "active" | "trialing" | "free";
  if (!active) status = "free";
  else status = tx.offerType === 1 ? "trialing" : "active";
  return {
    plan,
    status,
    provider: "apple",
    apple_original_transaction_id: tx.originalTransactionId,
    current_period_end: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
    trial_ends_at:
      tx.offerType === 1 && tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
  };
}
