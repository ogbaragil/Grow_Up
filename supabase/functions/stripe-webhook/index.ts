import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(",").reduce((acc: Record<string, string>, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts["t"];
  const expectedSig = parts["v1"];
  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computed === expectedSig;
}

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const upsertSub = async (data: Record<string, unknown>) => {
    await supabase.from("growup_subscriptions").upsert(data, { onConflict: "user_id" });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;
      if (!userId) break;

      // Fetch full subscription from Stripe
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      const stripeSub = await subRes.json();

      await upsertSub({
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: stripeSub.status,
        plan,
        trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const stripeSub = event.data.object;
      const customerId = stripeSub.customer;

      // Look up user by customer ID
      const { data: existing } = await supabase
        .from("growup_subscriptions")
        .select("user_id, plan")
        .eq("stripe_customer_id", customerId)
        .single();
      if (!existing) break;

      await upsertSub({
        user_id: existing.user_id,
        stripe_subscription_id: stripeSub.id,
        status: event.type === "customer.subscription.deleted" ? "canceled" : stripeSub.status,
        plan: existing.plan,
        trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
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
        .single();
      if (!existing) break;
      await upsertSub({
        user_id: existing.user_id,
        status: "past_due",
        updated_at: new Date().toISOString(),
      });
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
