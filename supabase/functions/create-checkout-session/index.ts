import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = "https://growupapp.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", detail: authError?.message }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { priceId, plan, skipTrial } = body;
    if (!priceId) {
      return new Response(JSON.stringify({ error: "priceId required" }), { status: 400, headers: corsHeaders });
    }

    // Check for existing Stripe customer
    const { data: sub } = await supabase
      .from("growup_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Build params — use customer ID if exists, otherwise email. Never both.
    const params: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${APP_URL}?checkout=success&plan=${plan}`,
      cancel_url: `${APP_URL}?checkout=cancel`,
      ...(skipTrial ? {} : { "subscription_data[trial_period_days]": "14" }),
      "payment_method_collection": skipTrial ? "always" : "if_required",
      "metadata[user_id]": user.id,
      "metadata[plan]": plan ?? "",
      allow_promotion_codes: "true",
    };

    if (sub?.stripe_customer_id) {
      params.customer = sub.stripe_customer_id;
    } else {
      params.customer_email = user.email!;
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });

    const stripeSession = await stripeRes.json();

    if (!stripeSession.url) {
      console.error("Stripe error response:", JSON.stringify(stripeSession));
      return new Response(
        JSON.stringify({ error: "Stripe error", detail: stripeSession?.error?.message ?? "Unknown" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ url: stripeSession.url }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500, headers: corsHeaders
    });
  }
});
