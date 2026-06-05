import { historyRows } from "../lib/history";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Repeat2, Menu, ChevronDown, TrendingUp, SlidersHorizontal } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Card, EmptyState, Kpi } from "../components/ui";
import { CompactTxn } from "./cashflow";
import { InsightsStrip } from "./insights";
import { WealthTimelineBriefCard } from "./timeline";
import { addMonths, monthLabel, shortMonthLabel } from "../lib/dates";
import { calculateGoalProgress, estimateGoalCompletion, getAccountsForSelectedMonth, goalColorForType, goalIconForType, refineDebtPayoffCalcWithHistory } from "../lib/goals";
import { computeTotals, latestDashboardState, selectSmartDashboardGoal, sixMonthAnimationStart, upcomingTransactionsForDashboard, weightedThreeMonthMomentum } from "../lib/insights";
import { money, signedMoney } from "../lib/money";
import { upcomingTransactions } from "../lib/transactions";

export function useAnimatedNumber(targetValue, startValue = 0, duration = 1100) {
  const [value, setValue] = useState(startValue);

  useEffect(() => {
    let frame;
    const startTime = performance.now();
    const from = Number(startValue || 0);
    const to = Number(targetValue || 0);
    const diff = to - from;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(progress);
      setValue(from + diff * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    setValue(from);
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [targetValue, startValue, duration]);

  return value;
}

export function CompactOverviewHeader({ title, sub, isDemo=false, setMenuOpen }) {
  return (
    <div className="compact-overview-header">
      <div className="compact-title-block">
        <div className="compact-title-line">
          <h1>{title}</h1>
          <span className={isDemo ? "mode-pill demo-mode-pill" : "mode-pill real-mode-pill"}>
            {isDemo ? "Demo Mode" : "Real Mode"}
          </span>
        </div>
        {sub && <p>{sub}</p>}
      </div>

      <button className="top-menu-btn compact-menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu">
        <Menu size={26}/>
      </button>
    </div>
  );
}




export function useAutoCarousel(itemCount = 3, intervalMs = 5200, resumeDelayMs = 5200) {
  const ref = React.useRef(null);
  const timerRef = React.useRef(null);
  const resumeRef = React.useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollToIndex = React.useCallback((nextIndex) => {
    const el = ref.current;
    if (!el || itemCount <= 0) return;

    const clamped = ((nextIndex % itemCount) + itemCount) % itemCount;
    const child = el.children?.[clamped];

    if (child) {
      el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    }

    setIndex(clamped);
  }, [itemCount]);

  const pauseThenResume = React.useCallback(() => {
    setPaused(true);
    window.clearTimeout(resumeRef.current);
    resumeRef.current = window.setTimeout(() => setPaused(false), resumeDelayMs);
  }, [resumeDelayMs]);

  useEffect(() => {
    if (paused || itemCount <= 1) return;

    timerRef.current = window.setInterval(() => {
      scrollToIndex(index + 1);
    }, intervalMs);

    return () => window.clearInterval(timerRef.current);
  }, [paused, index, itemCount, intervalMs, scrollToIndex]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const children = Array.from(el.children || []);
      if (!children.length) return;

      const nearest = children.reduce((best, child, i) => {
        const distance = Math.abs(child.offsetLeft - el.scrollLeft);
        return distance < best.distance ? { index: i, distance } : best;
      }, { index: 0, distance: Infinity });

      setIndex(nearest.index);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => () => {
    window.clearInterval(timerRef.current);
    window.clearTimeout(resumeRef.current);
  }, []);

  return { ref, index, scrollToIndex, pauseThenResume };
}


export function ShareNetWorthCard({ netWorth, prevNet, displayName }) {
  const [copied, setCopied] = useState(false);
  const mom = netWorth - (prevNet || 0);
  const momStr = mom >= 0 ? `+${money(mom)}` : money(mom);
  const text = `My net worth is ${money(netWorth)} (${momStr} this month) — tracked with Grow UP 🌱 growupapp.app`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Net Worth — Grow UP", text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="share-networth-card">
      <div className="share-networth-left">
        <span>Share your progress</span>
        <p>{text}</p>
      </div>
      <button className="share-networth-btn" onClick={share}>
        {copied ? "✓ Copied" : "Share"}
      </button>
    </div>
  );
}

export function BackfillPrompt({ state, setState, setTab }) {
  const prevMonth = addMonths(state.selectedMonth, -1);
  const prevLabel = monthLabel(prevMonth);
  const goBackfill = () => {
    setState(s => ({ ...s, showBackfillPrompt: false, selectedMonth: prevMonth }));
    setTab("assets");
  };
  const dismiss = () => setState(s => ({ ...s, showBackfillPrompt: false }));
  return (
    <div className="backfill-backdrop">
      <div className="backfill-card">
        <div className="backfill-icon">📅</div>
        <h2>Add last month too?</h2>
        <p>Adding your <strong>{prevLabel}</strong> balances unlocks trends, forecasts, and momentum — the best parts of Grow UP.</p>
        <button className="backfill-cta" onClick={goBackfill}>Go to {prevLabel} →</button>
        <button className="backfill-skip" onClick={dismiss}>Skip for now</button>
      </div>
    </div>
  );
}

export function MinimalOverview({ state, totals, setMenuOpen, setHistoryMetric, setTab, displayName, setInsightsOpen, setTimelineOpen, isDemo=false, isPro=false, showUpgrade }) {
  const dashboardState = useMemo(() => latestDashboardState(state), [state]);
  const dashboardTotals = useMemo(() => computeTotals(dashboardState), [dashboardState]);
  const accounts = getAccountsForSelectedMonth(dashboardState);
  const topAsset = accounts
    .filter(a => a.kind === "asset" && Number(a.balance || 0) > 0)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
  const topAssetPercent = topAsset && dashboardTotals.assets
    ? Math.round((Number(topAsset.balance || 0) / Math.max(1, dashboardTotals.assets)) * 1000) / 10
    : 0;
  const topAssetCirc = 2 * Math.PI * 42;
  const goals = dashboardState.goals.filter(g => !g.archived);
  const smartGoal = selectSmartDashboardGoal(goals, dashboardState, dashboardTotals, accounts);
  const primaryGoal = smartGoal?.goal || goals[0] || null;

  const animatedStartNetWorth = sixMonthAnimationStart(dashboardState, dashboardTotals.prevNet || dashboardTotals.net);
  const animatedNetWorth = useAnimatedNumber(dashboardTotals.net, animatedStartNetWorth, 1300);
  const momentumScore = weightedThreeMonthMomentum(dashboardState, dashboardTotals.net);
  const animatedMomentum = useAnimatedNumber(momentumScore, 0, 1100);

  const upcomingMiniTxns = upcomingTransactionsForDashboard(dashboardState, 4);
  const dashboardCarousel = useAutoCarousel(3, 5600, 5200);
  const chartRows = historyRows(dashboardState).slice().reverse().slice(-6);
  const chartValues = chartRows.map(r => Number(r.net || 0));
  const min = Math.min(...chartValues, dashboardTotals.net);
  const max = Math.max(...chartValues, dashboardTotals.net);
  const range = Math.max(1, max - min);
  const points = chartValues.length
    ? chartValues.map((v, i) => {
        const x = chartValues.length === 1 ? 0 : (i / (chartValues.length - 1)) * 300;
        const y = 128 - ((v - min) / range) * 104;
        return `${x},${y}`;
      }).join(" ")
    : "0,120 300,80";

  let goalCalc = smartGoal?.calc || null;
  let goalForecast = smartGoal?.forecast || null;

  if (primaryGoal && !goalCalc) {
    goalCalc = calculateGoalProgress(primaryGoal, dashboardTotals, accounts);
    goalCalc = refineDebtPayoffCalcWithHistory(primaryGoal, dashboardState, goalCalc);
    goalForecast = estimateGoalCompletion(primaryGoal, dashboardState, goalCalc, dashboardTotals);
  }

  return (
    <div className="screen minimal-dashboard-screen">
      <div className="minimal-dashboard-head compact-minimal-head">
        <div className="minimal-title-block">
          <div className="minimal-greeting-line">
            <p>Welcome back</p>
            {isPro ? (
              <span className="mode-pill pro-mode-pill">✦ Pro</span>
            ) : isDemo ? (
              <span className="mode-pill demo-mode-pill">Demo Mode</span>
            ) : (
              <button className="mode-pill free-mode-pill" onClick={() => showUpgrade?.("general")}>
                Free · Upgrade
              </button>
            )}
          </div>
          <h1>{displayName || "there"}</h1>
        </div>
        <button className="top-menu-btn compact-menu-btn settings-header-btn" onClick={()=>setTab("settings")} aria-label="Settings">
          <SlidersHorizontal size={24}/>
        </button>
      </div>

      <section className="minimal-networth-card" onClick={()=>setHistoryMetric("net")}>
        <p>Net Worth</p>
        <h2>{money(animatedNetWorth)}</h2>
        <span className={dashboardTotals.net - dashboardTotals.prevNet >= 0 ? "nw-mom gain" : "nw-mom loss"}>
          {signedMoney(dashboardTotals.net - dashboardTotals.prevNet)} over last month
        </span>
        {chartValues.length >= 2 && (() => {
          const pts = chartValues.map((v,i) => {
            const x = (i/(chartValues.length-1))*300;
            const y = 68 - ((v-min)/range)*58;
            return `${x},${y}`;
          });
          const fillPath = `M${pts.map(p=>p).join(' L')} L300,80 L0,80 Z`;
          return (
            <svg viewBox="0 0 300 80" className="networth-hero-sparkline" preserveAspectRatio="none">
              <defs>
                <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,.22)"/>
                  <stop offset="100%" stopColor="rgba(255,255,255,.0)"/>
                </linearGradient>
              </defs>
              <path d={fillPath} fill="url(#nwFill)"/>
              <polyline
                points={pts.join(" ")}
                fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              />
              {pts.map((p, i) => {
                const [x, y] = p.split(",").map(Number);
                return i === pts.length - 1
                  ? <circle key={i} cx={x} cy={y} r={4} fill="white" opacity={0.9}/>
                  : null;
              })}
            </svg>
          );
        })()}
        {chartValues.length >= 2 && (
          <div className="nw-chart-labels">
            <span>{shortMonthLabel(chartRows[0]?.key)}</span>
            <span>{shortMonthLabel(chartRows[chartRows.length-1]?.key)}</span>
          </div>
        )}
      </section>

      <InsightsStrip state={dashboardState} totals={dashboardTotals} openInsights={()=>setInsightsOpen?.(true)} />

      <WealthTimelineBriefCard state={dashboardState} openTimeline={()=>setTimelineOpen?.(true)} />

      {primaryGoal && goalCalc && (() => {
        const colorMap = {
          green:  "linear-gradient(135deg,#1a7a40 0%,#236b4a 100%)",
          red:    "linear-gradient(135deg,#b91c1c 0%,#9f1239 100%)",
          purple: "linear-gradient(135deg,#6d28d9 0%,#4c1d95 100%)",
          blue:   "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)",
          gold:   "linear-gradient(135deg,#b45309 0%,#92400e 100%)",
        };
        const bg = colorMap[primaryGoal.color || goalColorForType(primaryGoal.goalType)] || colorMap.green;
        const pct = Math.min(100, Math.max(0, goalCalc.progress));
        const r = 28; const circ = 2 * Math.PI * r;
        return (
          <section className="overview-goal-card-v2" style={{background: bg}} onClick={()=>setTab("goals")}>
            <div className="overview-goal-row">
              <div className="overview-goal-ring-wrap">
                <svg width={64} height={64} viewBox="0 0 64 64">
                  <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={5}/>
                  <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth={5}
                    strokeDasharray={`${circ * pct/100} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 32 32)" style={{transition:"stroke-dasharray .5s"}}/>
                </svg>
                <span className="overview-goal-emoji">{primaryGoal.icon || goalIconForType(primaryGoal.goalType)}</span>
              </div>
              <div className="overview-goal-info">
                <p>{smartGoal?.deadlineScore < 1000*60*60*24*120 ? "Closest deadline" : "Top progress"}</p>
                <h2>{primaryGoal.name}</h2>
                <div className="overview-goal-status-row">
                  {goalForecast?.label && goalForecast.label !== "Need more history" && (
                    <span className="overview-goal-eta">→ {goalForecast.label}</span>
                  )}
                </div>
              </div>
              <strong className="overview-goal-pct">{Math.round(pct)}%</strong>
            </div>
            <div className="overview-goal-bar">
              <div className="overview-goal-bar-fill" style={{width:`${pct}%`}}/>
            </div>
            {goalForecast?.detail && goalForecast.kind !== "neutral" && (
              <p className="overview-goal-detail">{goalForecast.detail}</p>
            )}
          </section>
        );
      })()}

      <section className="minimal-feature-carousel" aria-label="Dashboard highlights">
        <div
          className="feature-track"
          ref={dashboardCarousel.ref}
          onTouchStart={dashboardCarousel.pauseThenResume}
          onMouseDown={dashboardCarousel.pauseThenResume}
          onWheel={dashboardCarousel.pauseThenResume}
          onScroll={dashboardCarousel.pauseThenResume}
        >
          {/* Card 1 — Momentum */}
          <article className="minimal-chart-card feature-slide dark-momentum-card">
            <div className="minimal-row">
              <div>
                <p>3-month weighted trend</p>
                <h2>Momentum</h2>
              </div>
              <strong>{animatedMomentum >= 0 ? "+" : ""}{Math.round(animatedMomentum)}%</strong>
            </div>
            <svg viewBox="0 0 300 140" className="minimal-trend-svg" onClick={()=>setHistoryMetric("net")}>
              <polyline points={points} />
            </svg>
            <span className="feature-caption">
              {animatedMomentum >= 10 ? "Strong positive trend" : animatedMomentum >= 0 ? "Positive trend" : "Negative trend — review your goals"}
            </span>
          </article>

          {/* Card 2 — Upcoming Transactions */}
          <article className="minimal-upcoming-card feature-slide">
            <div className="upcoming-card-head">
              <div>
                <p>Coming up</p>
                <h2>Transactions</h2>
              </div>
              <button type="button" className="carousel-nav-btn" onClick={()=>setTab("cash")} aria-label="Open Cash Flow">→</button>
            </div>
            <div className="upcoming-mini-list">
              {upcomingMiniTxns.length ? upcomingMiniTxns.map(txn => (
                <div className="upcoming-mini-item" key={txn.id}>
                  <span className={`upcoming-icon ${txn.type === "income" ? "income" : "expense"}`}>
                    {txn.icon || (txn.type === "income" ? "💵" : "💳")}
                  </span>
                  <div>
                    <strong>{txn.name}</strong>
                    <small>{txn.dateObj.toLocaleDateString("en-US", { month:"short", day:"numeric" })}</small>
                  </div>
                  <b className={txn.type === "income" ? "gain" : "risk"}>
                    {txn.type === "income" ? "+" : "-"}{money(txn.amount)}
                  </b>
                </div>
              )) : (
                <div className="upcoming-empty">No upcoming transactions in the next 7 days.</div>
              )}
            </div>
          </article>

          {/* Card 3 — Cash Flow (real data) */}
          <article className="minimal-cash-snapshot-card feature-slide">
            <div className="upcoming-card-head">
              <div>
                <p>This month</p>
                <h2>Cash Flow</h2>
              </div>
              <button type="button" className="carousel-nav-btn" onClick={()=>setTab("cash")} aria-label="Open Cash Flow">→</button>
            </div>
            <div className="cash-snapshot-big">
              <strong className={dashboardTotals.income - dashboardTotals.expenses >= 0 ? "" : "danger"}>
                {signedMoney(dashboardTotals.income - dashboardTotals.expenses)}
              </strong>
              <span>monthly surplus</span>
            </div>
            <div className="cash-real-bars">
              <div className="cash-real-bar-row">
                <span>Income</span>
                <div className="cash-bar-track">
                  <div className="cash-bar-fill income" style={{width: dashboardTotals.income > 0 ? "100%" : "0%"}}/>
                </div>
                <b className="gain">{money(dashboardTotals.income)}</b>
              </div>
              <div className="cash-real-bar-row">
                <span>Expenses</span>
                <div className="cash-bar-track">
                  <div className="cash-bar-fill expense" style={{width: dashboardTotals.income > 0 ? `${Math.min(100, (dashboardTotals.expenses/dashboardTotals.income)*100)}%` : "100%"}}/>
                </div>
                <b className="risk">-{money(dashboardTotals.expenses)}</b>
              </div>
            </div>
          </article>
        </div>

        <div className="feature-dots">
          {[0,1,2].map(i => (
            <button
              key={i}
              type="button"
              className={dashboardCarousel.index === i ? "active" : ""}
              onClick={() => {
                dashboardCarousel.pauseThenResume();
                dashboardCarousel.scrollToIndex(i);
              }}
              aria-label={`Show dashboard card ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {topAsset && (
        <section className="minimal-top-asset-card" onClick={()=>setHistoryMetric("assets")}>
          <div className="minimal-top-asset-copy">
            <div className="top-asset-label">
              <span>◔</span>
              <b>Top Asset</b>
            </div>
            <p>{topAsset.name}</p>
            <h2>{money(topAsset.balance)}</h2>
            <small>{topAssetPercent}% of total assets</small>
          </div>

          <div className="top-asset-ring" style={{ "--assetPercent": topAssetPercent }}>
            <svg viewBox="0 0 100 100">
              <circle className="ring-bg" cx="50" cy="50" r="42" />
              <circle
                className="ring-fill"
                cx="50"
                cy="50"
                r="42"
                strokeDasharray={topAssetCirc}
                strokeDashoffset={topAssetCirc - (topAssetCirc * topAssetPercent / 100)}
              />
            </svg>
            <strong>{topAssetPercent}%</strong>
          </div>
        </section>
      )}

      <section className="minimal-split-card">
        <button onClick={()=>setHistoryMetric("assets")}><span>Total Assets</span><strong>{money(dashboardTotals.assets)}</strong></button>
        <button onClick={()=>setHistoryMetric("debts")}><span>Total Debts</span><strong>{money(dashboardTotals.debts)}</strong></button>
      </section>

      <ShareNetWorthCard netWorth={dashboardTotals.net} prevNet={dashboardTotals.prevNet} displayName={displayName} />
    </div>
  );
}

export function Overview({  state, totals, setEditor, setTab, setMenuOpen, setHistoryMetric, displayName, isDemo = false}) {
  const dashboardState = useMemo(() => latestDashboardState(state), [state]);
  const dashboardTotals = useMemo(() => computeTotals(dashboardState), [dashboardState]);
  const dashboardMonthLabel = monthLabel(dashboardState.selectedMonth);

  const completedGoals = dashboardState.goals.filter(g =>
    calculateGoalProgress(g, dashboardTotals, getAccountsForSelectedMonth(dashboardState)).progress >= 100
  ).length;

  const upcoming = upcomingTransactions(dashboardState.transactions, 7);
  const chartData = historyRows(dashboardState).slice().reverse().map(r => ({ m:shortMonthLabel(r.key), net:r.net }));

  const animatedStartNetWorth = sixMonthAnimationStart(dashboardState, dashboardTotals.prevNet || dashboardTotals.net);
  const animatedNetWorth = useAnimatedNumber(dashboardTotals.net, animatedStartNetWorth, 1300);

  return (
    <div className="screen">
      <CompactOverviewHeader
        title={`Welcome, ${displayName || "there"}`}
        sub={`Here's your Snapshot for ${dashboardMonthLabel}`}
        isDemo={isDemo}
        setMenuOpen={setMenuOpen}
      />

      <InsightsStrip state={state} totals={totals} openInsights={()=>setInsightsOpen?.(true)} />

      <WealthTimelineBriefCard state={state} openTimeline={()=>setTimelineOpen?.(true)} />

      <div className="kpi-grid">
        <Kpi onClick={()=>setHistoryMetric("assets")} title="Total Assets" value={money(dashboardTotals.assets)} sub={`${signedMoney(dashboardTotals.assets - dashboardTotals.prevAssets)} vs last month`} icon="💼" dot="green" />
        <Kpi onClick={()=>setHistoryMetric("debts")} title="Total Debts" value={money(dashboardTotals.debts)} sub={`${signedMoney(dashboardTotals.debts - dashboardTotals.prevDebts)} vs last month`} icon="💳" dot="red" />
        <Kpi onClick={()=>setHistoryMetric("net")} title="Net Worth" value={money(animatedNetWorth)} sub={`${signedMoney(dashboardTotals.net - dashboardTotals.prevNet)} vs last month`} icon="$" dot="blue" animated />
        <Kpi onClick={()=>setTab("goals")} title="Goals" value={`${completedGoals} / ${state.goals.length}`} sub="completed" icon="🎯" dot="purple" />
      </div>

      {state.accounts.length === 0 && state.goals.length === 0 && state.transactions.length === 0 && (
        <EmptyState icon="🌱" title="Start building your snapshot" text="Add your first account, goal, or cash flow item. Nothing is hard-coded." action="Add account" onClick={()=>setEditor({ type:"account" })}/>
      )}

      <Card className="networth-trend-card">
        <div className="card-head">
          <span className="green-square"><TrendingUp size={22}/></span>
          <div><h2>Net Worth Trend</h2><p>Use the dropdown for History</p></div>
          <button className="trend-history-btn" onClick={(e)=>{ e.stopPropagation(); setHistoryMetric("net"); }} aria-label="Open net worth history"><ChevronDown size={22}/></button>
        </div>
        <div className="trend-box">
          <div><span>Current Net Worth</span><strong className="counting-networth">{money(animatedNetWorth)}</strong></div>
          <div><span>Snapshots</span><strong className="success">{Object.keys(state.monthSnapshots || {}).length}</strong></div>
        </div>
        <div className="chart-holder">
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={chartData.length ? chartData : [{m:"Now", net:totals.net}]}>
              <XAxis dataKey="m" hide />
              <YAxis hide />
              <Tooltip formatter={(v)=>money(v)} />
              <Line type="monotone" dataKey="net" stroke="#3fa463" strokeWidth={3} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="cash-card" onClick={()=>setTab("cash")}>
        <div className="card-head">
          <span className="blue-square"><Repeat2 size={22}/></span>
          <h2>Cash Flow</h2>
        </div>
        <div className="mini-pair">
          <div><span>Money In (monthly)</span><strong>{money(dashboardTotals.income)}</strong></div>
          <div><span>Money Out (monthly)</span><strong>{money(dashboardTotals.expenses)}</strong></div>
        </div>
        <div className="upcoming-head"><h3>Upcoming <span>· Next 7 days</span></h3><span>{upcoming.length} upcoming</span></div>
        {upcoming.length ? upcoming.slice(0,4).map(t => <CompactTxn key={t.id} t={t}/>) : <p className="muted">No upcoming transactions yet.</p>}
      </Card>
    </div>
  );
}

