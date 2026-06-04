import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { plan } = await req.json();

    // Find latest Stripe customer for this email
    const customersRes = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${user.email}'&limit=1`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
    );
    const customers = await customersRes.json();
    const customer = customers?.data?.[0];
    if (!customer) return new Response(JSON.stringify({ status: "no_customer" }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Get active subscriptions for this customer
    const subsRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=all&limit=5`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
    );
    const subs = await subsRes.json();
    const sub = subs?.data?.find((s: any) => s.status === "trialing" || s.status === "active");
    if (!sub) return new Response(JSON.stringify({ status: "no_subscription" }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Write to Supabase
    const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, supabaseKey);

    const { error: upsertError } = await adminClient.from("growup_subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      plan: plan || "monthly",
      trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (upsertError) console.error("Upsert error:", upsertError);

    return new Response(JSON.stringify({ status: sub.status, plan }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err) {
    console.error("verify-subscription error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
