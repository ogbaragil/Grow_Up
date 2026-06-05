import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Verify Stripe's signature header: "t=<unix>,v1=<hmac>,...".
// HMAC-SHA256 of `${t}.${rawBody}` with the endpoint's signing secret,
// compared in constant time, with a 5-minute replay tolerance.
async function verifyStripeSignature(body: string, sigHeader: string | null): Promise<boolean> {
  if (!sigHeader || !STRIPE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=", 2) as [string, string])
  );
  const timestamp = parts["t"];
  const expected = parts["v1"];
  if (!timestamp || !expected) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const computed = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Reject anything not provably from Stripe. Without this check, anyone
  // who finds this URL can forge subscription events.
  const validSignature = await verifyStripeSignature(body, req.headers.get("stripe-signature"));
  if (!validSignature) {
    console.error("Webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("Stripe webhook event received:", event.type);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const upsert = async (data: Record<string, unknown>) => {
    console.log("Upserting:", JSON.stringify(data));
    const { error } = await supabase
      .from("growup_subscriptions")
      .upsert(data, { onConflict: "user_id" });
    if (error) console.error("Upsert error:", JSON.stringify(error));
    else console.log("Upsert success");
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        console.log("checkout.session.completed userId:", userId);
        if (!userId) { console.error("No user_id in metadata"); break; }

        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        const sub = await subRes.json();
        console.log("Subscription status:", sub.status);

        await upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: sub.status || "trialing",
          plan: plan || "monthly",
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const { data: existing } = await supabase
          .from("growup_subscriptions")
          .select("user_id, plan")
          .eq("stripe_customer_id", sub.customer)
          .maybeSingle();
        if (!existing) { console.error("No record for customer:", sub.customer); break; }
        await upsert({
          user_id: existing.user_id,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          plan: existing.plan,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const { data: existing } = await supabase
          .from("growup_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", invoice.customer)
          .maybeSingle();
        if (!existing) break;
        await upsert({ user_id: existing.user_id, stripe_customer_id: invoice.customer, status: "past_due", updated_at: new Date().toISOString() });
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }
  } catch (err) {
    console.error("Handler error:", String(err));
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
