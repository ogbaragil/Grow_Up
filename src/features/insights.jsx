import React, { useMemo } from "react";
import { Menu, ArrowLeft } from "lucide-react";
import { buildGrowUpInsights } from "../lib/insights";

export function InsightsStrip({ state, totals, openInsights }) {
  const insights = useMemo(() => buildGrowUpInsights(state, totals), [state, totals]);

  if (!insights.length) return null;

  return (
    <section className="growup-insights-strip scrollable-insights-strip" aria-label="Grow UP Insights">
      <div className="insights-strip-scroll">
        {insights.map((item, index) => (
          <article
            className={`insight-dashboard-card ${item.tone}`}
            key={`${item.title}-${index}`}
            onClick={openInsights}
          >
            <div className="insights-strip-head">
              <div>
                <p>{index === 0 ? "Grow UP Insights" : item.label}</p>
                <h2>{item.title}</h2>
              </div>
              <span>{item.icon}</span>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}




export function InsightsPage({ state, totals, setMenuOpen, setInsightsOpen }) {
  const insights = useMemo(() => buildGrowUpInsights(state, totals), [state, totals]);

  return (
    <div className="screen insights-page">
      <div className="compound-header">
        <button className="round-nav-btn" onClick={()=>setInsightsOpen(false)} aria-label="Back">
          <ArrowLeft size={24}/>
        </button>
        <div>
          <h1>Grow UP Insights</h1>
          <p>Smart signals from your wealth data.</p>
        </div>
        <button className="mini-menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu">
          <Menu size={24}/>
        </button>
      </div>

      <section className="insight-hero-card">
        <span>Today’s read</span>
        <h2>{insights[0]?.title || "Add more data"}</h2>
        <p>{insights[0]?.body || "Save snapshots and goals to unlock richer insights."}</p>
      </section>

      <div className="insight-grid">
        {insights.map((item, index) => (
          <article className={`insight-card ${item.tone}`} key={`${item.title}-${index}`}>
            <div className="insight-icon">{item.icon}</div>
            <div>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}


