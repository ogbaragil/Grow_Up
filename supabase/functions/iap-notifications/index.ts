// supabase/functions/iap-notifications/index.ts
//
// App Store Server Notifications V2 webhook. Apple POSTs { signedPayload }
// whenever a subscription renews, expires, is refunded, etc. We read the
// transaction id from the notification, re-fetch the authoritative record from
// Apple's App Store Server API (so a forged POST can't grant entitlement), and
// update growup_subscriptions accordingly.
//
// Set this function's URL as the "Production"/"Sandbox" Server Notification URL
// in App Store Connect → your app → App Information → App Store Server
// Notifications (V2).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  decodeJWSPayload,
  getTransaction,
  entitlementFromTransaction,
  BUNDLE_ID,
} from "../_shared/appstore.ts";

interface NotificationPayload {
  notificationType: string;
  subtype?: string;
  data?: { signedTransactionInfo?: string; signedRenewalInfo?: string; bundleId?: string };
}

// Notification types that mean "entitlement is gone".
const REVOKING = new Set(["EXPIRED", "REFUND", "REVOKE", "GRACE_PERIOD_EXPIRED"]);

serve(async (req) => {
  try {
    const { signedPayload } = await req.json();
    if (!signedPayload) return new Response("missing signedPayload", { status: 400 });

    const note = decodeJWSPayload<NotificationPayload>(signedPayload);
    const signedTx = note.data?.signedTransactionInfo;
    if (!signedTx) return new Response("ok (no transaction)", { status: 200 });

    // Read the id, then re-fetch the authoritative record from Apple.
    const claimed = decodeJWSPayload<{ transactionId: string; bundleId: string }>(signedTx);
    if (claimed.bundleId !== BUNDLE_ID) return new Response("ignored", { status: 200 });

    const tx = await getTransaction(String(claimed.transactionId));
    const entitlement = entitlementFromTransaction(tx);
    if (REVOKING.has(note.notificationType)) entitlement.status = "free";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find the row by Apple's stable original-transaction id (the user may not
    // be the caller here, so we key on the subscription, not the session).
    const { error } = await admin
      .from("growup_subscriptions")
      .update({ ...entitlement, updated_at: new Date().toISOString() })
      .eq("apple_original_transaction_id", tx.originalTransactionId);

    if (error) console.error("notification update error:", error);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("iap-notifications error:", err);
    // Return 200 so Apple does not hammer retries on a parse error we can't fix.
    return new Response("ok", { status: 200 });
  }
});
