// supabase/functions/iap-validate/index.ts
//
// Called by the native iOS wrapper after a StoreKit purchase or restore.
// Authenticates the user from their Supabase access token, asks Apple for the
// authoritative transaction record, and writes the entitlement to
// growup_subscriptions using the service role (never the client).
//
// Request body: { transactionId: string }
// Headers:      Authorization: Bearer <user supabase jwt>, apikey: <anon key>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── App Store Server API helpers (inlined so the function deploys standalone) ──
// Required Supabase secrets:
//   APP_STORE_ISSUER_ID, APP_STORE_KEY_ID, APP_STORE_PRIVATE_KEY (.p8 contents),
//   APP_BUNDLE_ID (app.growupapp), APP_STORE_ENV ("Production" | "Sandbox")
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const ISSUER_ID = Deno.env.get("APP_STORE_ISSUER_ID")!;
const KEY_ID = Deno.env.get("APP_STORE_KEY_ID")!;
const PRIVATE_KEY_PEM = Deno.env.get("APP_STORE_PRIVATE_KEY")!;
const BUNDLE_ID = Deno.env.get("APP_BUNDLE_ID") || "app.growupapp";

const PROD_HOST = "https://api.storekit.itunes.apple.com";
const SANDBOX_HOST = "https://api.storekit-sandbox.itunes.apple.com";

const PRODUCT_TO_PLAN: Record<string, string> = {
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
      exp: getNumericDate(60 * 20),
      aud: "appstoreconnect-v1",
      bid: BUNDLE_ID,
    },
    key,
  );
}

function decodeJWSPayload<T = Record<string, unknown>>(jws: string): T {
  const part = jws.split(".")[1];
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "="));
  return JSON.parse(json) as T;
}

interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  type: string;
  expiresDate?: number;
  offerType?: number;
  revocationDate?: number;
}

async function getTransactionFromHost(host: string, jwt: string, txId: string) {
  const res = await fetch(`${host}/inApps/v1/transactions/${txId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`App Store API ${res.status}: ${await res.text()}`);
  const { signedTransactionInfo } = await res.json();
  return decodeJWSPayload<AppleTransaction>(signedTransactionInfo);
}

async function getTransaction(txId: string): Promise<AppleTransaction> {
  const jwt = await appStoreJWT();
  const env = Deno.env.get("APP_STORE_ENV");
  const order = env === "Sandbox" ? [SANDBOX_HOST, PROD_HOST] : [PROD_HOST, SANDBOX_HOST];
  for (const host of order) {
    const tx = await getTransactionFromHost(host, jwt, txId);
    if (tx) return tx;
  }
  throw new Error("transaction_not_found");
}

function entitlementFromTransaction(tx: AppleTransaction) {
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
// ── end App Store helpers ──

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { transactionId } = await req.json();
    if (!transactionId) return json({ error: "missing transactionId" }, 400);

    const tx = await getTransaction(String(transactionId));
    if (tx.bundleId !== BUNDLE_ID) return json({ error: "bundle_mismatch" }, 400);

    const entitlement = entitlementFromTransaction(tx);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertError } = await admin
      .from("growup_subscriptions")
      .upsert(
        { user_id: user.id, ...entitlement, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      console.error("upsert error:", upsertError);
      return json({ error: "db_write_failed" }, 500);
    }

    return json({ status: entitlement.status, plan: entitlement.plan });
  } catch (err) {
    console.error("iap-validate error:", err);
    return json({ error: String(err) }, 500);
  }
});
