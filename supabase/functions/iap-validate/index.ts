// supabase/functions/iap-validate/index.ts
//
// Called by the native iOS wrapper after a StoreKit purchase or restore.
// Authenticates the user from their Supabase access token, asks Apple for the
// authoritative transaction record, and writes the entitlement to
// growup_subscriptions using the service role (never the client).
//
// Request body: { transactionId: string, plan?: string }
// Headers:      Authorization: Bearer <user supabase jwt>, apikey: <anon key>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getTransaction,
  entitlementFromTransaction,
  BUNDLE_ID,
} from "../_shared/appstore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Identify the user from their token.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { transactionId } = await req.json();
    if (!transactionId) return json({ error: "missing transactionId" }, 400);

    // Authoritative lookup from Apple.
    const tx = await getTransaction(String(transactionId));
    if (tx.bundleId !== BUNDLE_ID) {
      return json({ error: "bundle_mismatch" }, 400);
    }

    const entitlement = entitlementFromTransaction(tx);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertError } = await admin
      .from("growup_subscriptions")
      .upsert(
        {
          user_id: user.id,
          ...entitlement,
          updated_at: new Date().toISOString(),
        },
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
