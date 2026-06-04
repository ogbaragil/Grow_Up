import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  if (!secret) return true; // Skip verification if secret not set (dev mode)
  try {
    const parts = signature.split(",").reduce((acc: Record<string, string>, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts["t"];
    const expectedSig = parts["v1"];
    if (!timestamp || !expectedSig) return false;
    const payload = `${timestamp}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === expectedSig;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  // Only verify if secret is configured
  if (STRIPE_WEBHOOK_SECRET) {
    const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      console.error("Invalid Stripe signature");
      return new Response("Invalid signature", { status: 400 });
    }
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("Stripe webhook event:", event.type);

  // Use service role key if available, otherwise anon key
  const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, supabaseKey);

  const upsertSub = async (data: Record<string, unknown>) => {
    console.log("Upserting subscription:", JSON.stringify(data));
    const { error } = await supabase
      .from("growup_subscriptions")
      .upsert(data, { onConflict: "user_id" });
    if (error) console.error("Upsert error:", error);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        console.log("Checkout completed, userId:", userId, "plan:", plan);
        if (!userId) {
          console.error("No user_id in metadata");
          break;
        }

        // Fetch subscription details from Stripe
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        const stripeSub = await subRes.json();
        console.log("Stripe subscription status:", stripeSub.status);

        await upsertSub({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: stripeSub.status || "trialing",
          plan: plan || "monthly",
          trial_ends_at: stripeSub.trial_end
            ? new Date(stripeSub.trial_end * 1000).toISOString()
            : null,
          current_period_end: stripeSub.current_period_end
            ? new Date(stripeSub.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object;
        const { data: existing } = await supabase
          .from("growup_subscriptions")
          .select("user_id, plan")
          .eq("stripe_customer_id", stripeSub.customer)
          .maybeSingle();

        if (!existing) {
          console.error("No subscription found for customer:", stripeSub.customer);
          break;
        }

        await upsertSub({
          user_id: existing.user_id,
          stripe_customer_id: stripeSub.customer,
          stripe_subscription_id: stripeSub.id,
          status: event.type === "customer.subscription.deleted" ? "canceled" : stripeSub.status,
          plan: existing.plan,
          trial_ends_at: stripeSub.trial_end
            ? new Date(stripeSub.trial_end * 1000).toISOString()
            : null,
          current_period_end: stripeSub.current_period_end
            ? new Date(stripeSub.current_period_end * 1000).toISOString()
            : null,
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
        await upsertSub({
          user_id: existing.user_id,
          stripe_customer_id: invoice.customer,
          status: "past_due",
          updated_at: new Date().toISOString(),
        });
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
