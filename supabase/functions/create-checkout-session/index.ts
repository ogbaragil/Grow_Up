import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = "https://growupapp.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Auth check
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { priceId, plan } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({ error: "priceId required" }), { status: 400 });
    }

    // Check for existing Stripe customer
    const { data: sub } = await supabase
      .from("growup_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    const customerParam = sub?.stripe_customer_id
      ? { customer: sub.stripe_customer_id }
      : { customer_email: user.email };

    // Create Stripe checkout session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        success_url: `${APP_URL}?checkout=success&plan=${plan}`,
        cancel_url: `${APP_URL}?checkout=cancel`,
        "subscription_data[trial_period_days]": "14",
        "metadata[user_id]": user.id,
        "metadata[plan]": plan,
        ...(sub?.stripe_customer_id
          ? { customer: sub.stripe_customer_id }
          : { customer_email: user.email! }),
        "allow_promotion_codes": "true",
      }),
    });

    const session = await stripeRes.json();
    if (!session.url) {
      console.error("Stripe error:", session);
      return new Response(JSON.stringify({ error: "Failed to create checkout session" }), { status: 500 });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
