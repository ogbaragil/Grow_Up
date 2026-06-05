import { supabase } from "./supabaseClient";

export const SUPPORT_EMAIL = "support@lgds.com.au";

// ── Stripe / Monetisation ─────────────────────────────────────────────────
// Live values come from env (.env.production / hosting provider settings);
// the literals below are TEST-mode fallbacks so local dev keeps working.
// Publishable keys and price IDs are safe to expose client-side; secret keys
// (sk_...) and webhook secrets (whsec_...) must ONLY live in Supabase
// function secrets — never in this file.
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  || "pk_test_51TeU2SHnS0FyPv2zbuDTqMA1bYWUZdiFVBEa6X3LN51VQ5YmryfKot1MFUkQ5iCfk60lK7jokAAUNl3M5M7FcRWc00Dp1bLA3v";
export const STRIPE_PRICES = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || "price_1TeUDkHnS0FyPv2zI0oBKPEj",  // A$3.99/month
  annual:  import.meta.env.VITE_STRIPE_PRICE_ANNUAL  || "price_1TeUFAHnS0FyPv2z8H92AS7S",  // A$39.99/year
};
export const PRO_LIMITS = { accounts: 3, goals: 2, transactions: 5, snapshotMonths: 3 };
export const PRO_FEATURES = [
  "Unlimited accounts, goals & transactions",
  "Full snapshot history (no 3-month cap)",
  "Wealth Timeline & scenarios",
  "Grow UP Insights",
  "Compound Wealth calculator",
  "FIRE financial independence goal",
  "Email & push reminders",
  "CSV export",
];

export async function createCheckoutSession(plan, session) {
  if (!supabase || !session) return null;
  try {
    // Get fresh access token to ensure it's passed correctly
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    const token = freshSession?.access_token;
    if (!token) return null;

    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { priceId: STRIPE_PRICES[plan], plan },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      console.error("Checkout function error:", error);
      return null;
    }
    if (data?.error) {
      console.error("Checkout session error:", data.error, data.detail);
      return null;
    }
    return data?.url || null;
  } catch (err) {
    console.error("Checkout error:", err);
    return null;
  }
}

