import React, { useState } from "react";
import { X } from "lucide-react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabaseClient";
import { PRO_FEATURES, PRO_LIMITS, STRIPE_PRICES } from "../config";

export function UpgradeSheet({ reason, onClose, session, notify }) {
  const [plan, setPlan] = useState("annual");
  const [loading, setLoading] = useState(false);

  const monthly = 3.99;
  const annual = 39.99;
  const annualMonthly = (annual / 12).toFixed(2);
  const saving = Math.round((1 - annual / (monthly * 12)) * 100);

  const reasonMessages = {
    accounts: `Free plan includes up to ${PRO_LIMITS.accounts} accounts.`,
    goals: `Free plan includes up to ${PRO_LIMITS.goals} active goals.`,
    transactions: `Free plan includes up to ${PRO_LIMITS.transactions} transactions.`,
    timeline: "Wealth Timeline is a Pro feature.",
    insights: "Grow UP Insights is a Pro feature.",
    compound: "Compound Wealth calculator is a Pro feature.",
    fire: "FIRE goal type is a Pro feature.",
    export: "CSV export is a Pro feature.",
    reminders: "Email reminders are a Pro feature.",
  };

  const handleUpgrade = async (skipTrial = false) => {
    if (!session) { notify("Please sign in first.", "error"); return; }
    setLoading(true);
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token) {
        notify("Session expired — please sign out and sign in again.", "error");
        setLoading(false);
        return;
      }

      const priceId = STRIPE_PRICES[plan];

      // Call edge function directly via fetch so we can read non-2xx bodies
      const res = await fetch(`${SUPABASE_URL}/functions/v1/swift-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${freshSession.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ priceId, plan, skipTrial }),
      });

      const responseText = await res.text();
      console.log("Edge function status:", res.status);
      console.log("Edge function response:", responseText);

      if (!res.ok) {
        let detail = responseText;
        try { detail = JSON.parse(responseText)?.detail || JSON.parse(responseText)?.error || responseText; } catch {}
        notify(`Checkout failed (${res.status}): ${detail}`, "error");
        setLoading(false);
        return;
      }

      const data = JSON.parse(responseText);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        notify(`No URL returned: ${JSON.stringify(data)}`, "error");
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout exception:", err);
      notify(`Exception: ${err?.message || String(err)}`, "error");
      setLoading(false);
    }
  };

  return (
    <div className="upgrade-backdrop" onClick={onClose}>
      <div className="upgrade-sheet" onClick={e => e.stopPropagation()}>
        <button className="upgrade-close" onClick={onClose}><X size={20}/></button>

        <div className="upgrade-hero">
          <div className="upgrade-pro-badge">✦ GROW UP PRO</div>
          <h2>Unlock everything</h2>
          <p>14-day free trial · no card charged today</p>
        </div>

        {reason && reasonMessages[reason] && (
          <div className="upgrade-reason">
            <span>⚠️</span> {reasonMessages[reason]} Upgrade to continue.
          </div>
        )}

        <div className="upgrade-plan-toggle">
          <button className={plan === "monthly" ? "active" : ""} onClick={() => setPlan("monthly")}>
            <span className="upgrade-plan-name">Monthly</span>
            <span className="upgrade-plan-price">A${monthly}/mo</span>
          </button>
          <button className={plan === "annual" ? "active" : ""} onClick={() => setPlan("annual")}>
            <span className="upgrade-plan-name">Annual <span className="upgrade-save-badge">Save {saving}%</span></span>
            <span className="upgrade-plan-price">A${annualMonthly}/mo</span>
            <span className="upgrade-plan-billed">A${annual} billed once a year</span>
          </button>
        </div>

        <div className="upgrade-features">
          {PRO_FEATURES.map(f => (
            <div key={f} className="upgrade-feature-row">
              <span className="upgrade-check">✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="upgrade-cta-group">
          <button className="upgrade-cta" onClick={() => handleUpgrade(false)} disabled={loading}>
            {loading ? "Opening checkout…" : "Start 14-day free trial"}
          </button>
          <button className="upgrade-cta-secondary" onClick={() => handleUpgrade(true)} disabled={loading}>
            {plan === "annual" ? `Subscribe now — A$${annual}/yr` : `Subscribe now — A$${monthly}/mo`}
          </button>
        </div>
        <p className="upgrade-fine">
          Trial: no card required · 14 days free · cancel anytime
        </p>
      </div>
    </div>
  );
}

