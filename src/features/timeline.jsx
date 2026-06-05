import { historyRows } from "../lib/history";
import React, { useMemo, useState } from "react";
import { Menu, ChevronRight, X, ArrowLeft } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Goals } from "./goals";
import { shortMonthLabel } from "../lib/dates";
import { calculateGoalProgress, estimateGoalCompletion, getAccountsForSelectedMonth, goalIconForType, goalTypeLabel, goalValueForSnapshot, refineDebtPayoffCalcWithHistory } from "../lib/goals";
import { buildWealthTimelineItems, computeTotals, getProfileMonthlyExpenses, latestDashboardState, timelineScenarioSummary } from "../lib/insights";
import { money, signedMoney } from "../lib/money";

export function WealthTimelineBriefCard({ state, openTimeline }) {
  const items = useMemo(() => buildWealthTimelineItems(state, "balanced"), [state]);
  const summary = useMemo(() => timelineScenarioSummary(state, "balanced"), [state]);
  const next = summary.next;

  return (
    <section className="wealth-timeline-brief-card" onClick={openTimeline}>
      <div className="timeline-brief-copy">
        <p>Wealth Timeline</p>
        <h2>{next ? next.title : "Build your path"}</h2>
        <span>{next ? `${next.label} · ${next.detail}` : "Add goals to project future milestones."}</span>
      </div>

      <div className="timeline-brief-rail">
        {items.slice(0,4).map((item, index) => (
          <i key={`${item.title}-${index}`} className={item.tone}>
            {index === 0 ? "●" : index + 1}
          </i>
        ))}
      </div>

      <button type="button" aria-label="Open Wealth Timeline">→</button>
    </section>
  );
}


export function TimelineDrawer({ item, state, scenario, onClose, onEditGoal, onOpenCompound }) {
  if (!item) return null;
  const totals = computeTotals(latestDashboardState(state));
  const accounts = getAccountsForSelectedMonth(latestDashboardState(state));
  const profile = state.profile || {};

  // ── Today card ──────────────────────────────────────────────────────────
  if (item.category === "Today") {
    const rows = historyRows(state); // newest first — do NOT reverse
    const chartData = rows.slice().reverse().map(r => ({ m: shortMonthLabel(r.key), net: r.net })); // chart needs oldest-first
    return (
      <TimelineDrawerShell title="Net Worth History" icon="●" tone={item.tone} onClose={onClose}>
        {chartData.length >= 2 ? (
          <div style={{height:200,marginBottom:16}}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="m" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip formatter={v => money(v)}/>
                <Line type="monotone" dataKey="net" stroke="var(--green)" strokeWidth={3} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="muted tl-drawer-empty">Save 2+ monthly snapshots to see your trend.</p>}
        <div className="tl-drawer-stats tl-mom-scroll">
          {rows.map((r,i,arr) => {
            const prev = arr[i+1]; // arr[i+1] is older since rows is newest-first
            const mom = prev ? r.net - prev.net : null;
            return (
              <div key={r.key} className="tl-drawer-stat-row">
                <span>{shortMonthLabel(r.key)}</span>
                <strong>{money(r.net)}</strong>
                {mom !== null && <em className={mom >= 0 ? "success" : "danger"}>{signedMoney(mom)}</em>}
              </div>
            );
          })}
        </div>
      </TimelineDrawerShell>
    );
  }

  // ── Goal card ───────────────────────────────────────────────────────────
  if (item.category === "Goal") {
    const goal = (state.goals || []).find(g => g.name === item.title && !g.archived);
    if (!goal) return (
      <TimelineDrawerShell title={item.title} icon={item.icon} tone={item.tone} onClose={onClose}>
        <p className="muted tl-drawer-empty">Goal data not found.</p>
      </TimelineDrawerShell>
    );
    let calc = calculateGoalProgress(goal, totals, accounts);
    calc = refineDebtPayoffCalcWithHistory(goal, latestDashboardState(state), calc);
    const forecast = estimateGoalCompletion(goal, state, calc, totals);
    const pct = Math.round(calc.progress || 0);

    // Sparkline
    const snapKeys = Object.keys(state.monthSnapshots || {}).sort();
    const sparkData = snapKeys.map(key => {
      const snap = state.monthSnapshots[key];
      const val = goalValueForSnapshot(goal, snap);
      if (val === null || !Number.isFinite(val)) return null;
      const target = Number(goal.target || 0);
      if (goal.goalType === "debtPayoff") {
        const start = Math.max(Number(goal.start || 0), val);
        return start > 0 ? Math.min(100, ((start - val) / start) * 100) : 0;
      }
      return target > 0 ? Math.min(100, (val / target) * 100) : 0;
    }).filter(v => v !== null);
    const sparkPoints = sparkData.length >= 2 ? (() => {
      const min = Math.min(...sparkData), max = Math.max(...sparkData);
      const range = Math.max(1, max - min);
      return sparkData.map((v,i) => `${(i/(sparkData.length-1))*260},${58-((v-min)/range)*50}`).join(" ");
    })() : null;

    return (
      <TimelineDrawerShell title={goal.name} icon={goal.icon || goalIconForType(goal.goalType)} tone={item.tone} onClose={onClose}>
        <div className="tl-drawer-progress-row">
          <span>{pct}%</span>
          <span className="muted">{goalTypeLabel(goal.goalType)}</span>
        </div>
        <div className="tl-bar"><div className="tl-bar-fill" style={{width:`${pct}%`}}/></div>
        {sparkPoints && (
          <svg viewBox="0 0 260 60" style={{width:"100%",height:60,margin:"10px 0 0",display:"block"}}>
            <polyline points={sparkPoints} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <div className="tl-drawer-stats" style={{marginTop:12}}>
          <div className="tl-drawer-stat-row"><span>Current</span><strong>{money(calc.current)}</strong></div>
          <div className="tl-drawer-stat-row"><span>Target</span><strong>{money(calc.target)}</strong></div>
          <div className="tl-drawer-stat-row"><span>Remaining</span><strong>{money(calc.remaining)}</strong></div>
          <div className="tl-drawer-stat-row"><span>Forecast</span><strong>{forecast.label}</strong></div>
          {forecast.detail && <p className="muted" style={{fontSize:12,marginTop:6}}>{forecast.detail}</p>}
        </div>
        <div className="tl-drawer-actions">
          <button className="primary" onClick={() => { onEditGoal(goal); onClose(); }}>Go to Goals →</button>
        </div>
      </TimelineDrawerShell>
    );
  }

  // ── Wealth Milestone card ───────────────────────────────────────────────
  if (item.category === "Wealth Milestone") {
    const netWorth = Number(totals.net || 0);
    const milestoneAmounts = { "First 100k":100000, "Quarter Million":250000, "Half Million":500000, "Millionaire":1000000 };
    const target = milestoneAmounts[item.title];
    const remaining = target ? Math.max(0, target - netWorth) : 0;

    // Compute dates for all 3 scenarios
    const scenarioDates = ["conservative","balanced","aggressive"].map(sc => {
      const cfg = { conservative:{multiplier:.65,annualReturn:.035}, balanced:{multiplier:1,annualReturn:.055}, aggressive:{multiplier:1.35,annualReturn:.075} }[sc];
      const history = historyRows(latestDashboardState(state)).slice().sort((a,b)=>a.key.localeCompare(b.key)).filter(r=>Number.isFinite(Number(r.net)));
      const growths = history.slice(-6).map((r,i,arr)=> i ? Number(r.net||0)-Number(arr[i-1].net||0) : null).filter(v=>Number.isFinite(v));
      const avgGrowth = growths.length ? growths.reduce((s,v)=>s+v,0)/growths.length : 0;
      const monthlyAdd = growths.length >= 2 ? avgGrowth * cfg.multiplier : null;
      if (!monthlyAdd || !target) return { sc, label: "Need more history" };
      const monthlyReturn = Math.pow(1 + cfg.annualReturn, 1/12) - 1;
      let projected = netWorth;
      for (let m=1; m<=720; m++) {
        projected = (projected * (1 + monthlyReturn)) + monthlyAdd;
        if (projected >= target) {
          const d = new Date(new Date().getFullYear(), new Date().getMonth() + m, 1);
          return { sc, label: d.toLocaleDateString("en-US", {month:"short",year:"numeric"}) };
        }
      }
      return { sc, label: "Beyond 60 years" };
    });

    return (
      <TimelineDrawerShell title={item.title} icon={item.icon} tone={item.tone} onClose={onClose}>
        <div className="tl-drawer-stats">
          <div className="tl-drawer-stat-row"><span>Target</span><strong>{money(target)}</strong></div>
          <div className="tl-drawer-stat-row"><span>Current</span><strong>{money(netWorth)}</strong></div>
          <div className="tl-drawer-stat-row"><span>Remaining</span><strong>{money(remaining)}</strong></div>
        </div>
        <div className="tl-scenario-comparison">
          <p className="tl-drawer-section-label">Scenario comparison</p>
          {scenarioDates.map(({sc, label}) => (
            <div key={sc} className={`tl-scenario-row ${sc === scenario ? "current" : ""}`}>
              <span style={{textTransform:"capitalize"}}>{sc}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>
        <div className="tl-drawer-actions">
          <button className="primary" onClick={() => { onOpenCompound(target); onClose(); }}>Open Compound Calculator →</button>
        </div>
      </TimelineDrawerShell>
    );
  }

  // ── Debt Free card ──────────────────────────────────────────────────────
  if (item.category === "Freedom") {
    const debtAccounts = accounts.filter(a => a.kind === "debt" && Number(a.balance||0) > 0);
    const snapKeys = Object.keys(state.monthSnapshots || {}).sort();
    const debtRows = debtAccounts.map(a => {
      let monthlyPaydown = null;
      if (snapKeys.length >= 2) {
        const oldest = state.monthSnapshots[snapKeys[0]];
        const newest = state.monthSnapshots[snapKeys[snapKeys.length-1]];
        const oldBal = (oldest.accounts||[]).find(x=>x.id===a.id)?.balance || 0;
        const newBal = (newest.accounts||[]).find(x=>x.id===a.id)?.balance || 0;
        const reduction = Number(oldBal) - Number(newBal);
        const months = Math.max(1, snapKeys.length - 1);
        if (reduction > 0) monthlyPaydown = reduction / months;
      }
      const bal = Number(a.balance || 0);
      const monthsToFree = monthlyPaydown ? Math.ceil(bal / monthlyPaydown) : null;
      const freeDate = monthsToFree ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsToFree, 1) : null;
      return { ...a, monthlyPaydown, freeDate, bal };
    });

    return (
      <TimelineDrawerShell title="Debt Free Breakdown" icon="⚡" tone={item.tone} onClose={onClose}>
        {debtRows.length ? debtRows.map(a => (
          <div key={a.id} className="tl-debt-row">
            <div className="tl-debt-row-head">
              <span className="round-icon debt" style={{width:32,height:32,fontSize:16}}>{a.icon||"💳"}</span>
              <div>
                <strong>{a.name}</strong>
                <span className="muted">{money(a.bal)} remaining</span>
              </div>
              <div className="tl-debt-row-eta">
                {a.freeDate
                  ? <><b>{a.freeDate.toLocaleDateString("en-US",{month:"short",year:"numeric"})}</b><small>{money(a.monthlyPaydown)}/mo avg</small></>
                  : <small className="muted">Need more history</small>}
              </div>
            </div>
            <div className="tl-bar" style={{marginTop:6}}>
              <div className="tl-bar-fill danger" style={{width:`${Math.min(100, (a.bal / (debtRows.reduce((s,x)=>s+x.bal,0)||1))*100)}%`}}/>
            </div>
          </div>
        )) : (
          <p className="muted tl-drawer-empty">No debt accounts with balances found. Your debt may be tracked via profile estimate only.</p>
        )}
      </TimelineDrawerShell>
    );
  }

  // ── FIRE / Coast FIRE card ──────────────────────────────────────────────
  if (item.category === "Independence") {
    const monthlyExpenses = getProfileMonthlyExpenses(state, totals);
    const annualExpenses = monthlyExpenses * 12;
    const fireTarget = Math.round(annualExpenses * 25);
    const age = Number(profile.age || 35);
    const retirementAge = Number(profile.retirementAge || 65);
    const yearsToRetirement = Math.max(1, retirementAge - age);
    const coastFireTarget = Math.round(fireTarget / Math.pow(1.05, yearsToRetirement));
    const netWorth = Number(totals.net || 0);
    const isCoast = item.title === "Coast FIRE";
    const target = isCoast ? coastFireTarget : fireTarget;
    const pct = target > 0 ? Math.min(100, Math.round((netWorth / target) * 100)) : 0;
    const remaining = Math.max(0, target - netWorth);

    const fireGoalExists = (state.goals||[]).some(g => g.goalType === "fire" && !g.archived);

    return (
      <TimelineDrawerShell title={item.title} icon={item.icon} tone={item.tone} onClose={onClose}>
        <div className="tl-drawer-progress-row">
          <span>{pct}% there</span>
          <span className="muted">{isCoast ? `Coast by age ${retirementAge}` : "25× annual spend"}</span>
        </div>
        <div className="tl-bar"><div className="tl-bar-fill" style={{width:`${pct}%`}}/></div>
        <div className="tl-drawer-stats" style={{marginTop:14}}>
          {isCoast ? (
            <>
              <div className="tl-drawer-stat-row"><span>Coast FIRE number</span><strong>{money(coastFireTarget)}</strong></div>
              <div className="tl-drawer-stat-row"><span>Based on age</span><strong>{age} → {retirementAge}</strong></div>
              <div className="tl-drawer-stat-row"><span>Assumes 5% real return</span><strong></strong></div>
              <div className="tl-drawer-stat-row"><span>Full FIRE number</span><strong>{money(fireTarget)}</strong></div>
            </>
          ) : (
            <>
              <div className="tl-drawer-stat-row"><span>FIRE number</span><strong>{money(fireTarget)}</strong></div>
              <div className="tl-drawer-stat-row"><span>Based on annual spend</span><strong>{money(annualExpenses)}</strong></div>
              <div className="tl-drawer-stat-row"><span>Current net worth</span><strong>{money(netWorth)}</strong></div>
              <div className="tl-drawer-stat-row"><span>Remaining</span><strong>{money(remaining)}</strong></div>
            </>
          )}
          <p className="muted" style={{fontSize:12,marginTop:8}}>{item.label} · {item.detail}</p>
        </div>
        <div className="tl-drawer-actions">
          {!fireGoalExists && (
            <button className="primary" onClick={() => { onEditGoal({ goalType:"fire", target: fireTarget }); onClose(); }}>
              Go to Goals — create FIRE goal →
            </button>
          )}
          <button className={fireGoalExists ? "primary" : "ghost"} onClick={() => { onOpenCompound(target); onClose(); }}>
            Open Compound Calculator →
          </button>
        </div>
      </TimelineDrawerShell>
    );
  }

  return null;
}

export function TimelineDrawerShell({ children, title, icon, tone, onClose }) {
  return (
    <div className="tl-drawer-backdrop" onClick={onClose}>
      <div className={`tl-drawer ${tone}`} onClick={e => e.stopPropagation()}>
        <div className="tl-drawer-head">
          <span className="tl-drawer-icon">{icon}</span>
          <h2>{title}</h2>
          <button className="tl-drawer-close" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="tl-drawer-body">{children}</div>
      </div>
    </div>
  );
}

export function WealthTimelinePage({ state, setState, setMenuOpen, setTimelineOpen, setCompoundOpen, setTab }) {
  const [scenario, setScenario] = useState("balanced");
  const [activeItem, setActiveItem] = useState(null);
  const items = useMemo(() => buildWealthTimelineItems(state, scenario), [state, scenario]);
  const summary = useMemo(() => timelineScenarioSummary(state, scenario), [state, scenario]);
  const scenarioLabel = scenario === "conservative" ? "Conservative" : scenario === "aggressive" ? "Aggressive" : "Balanced";

  const handleEditGoal = () => {
    setActiveItem(null);
    setTimelineOpen(false);
    if (setTab) setTab("goals");
  };

  const handleOpenCompound = () => {
    setActiveItem(null);
    setTimelineOpen(false);
    if (setCompoundOpen) setCompoundOpen(true);
  };

  return (
    <div className="screen wealth-timeline-page">
      <div className="compound-header">
        <button className="round-nav-btn" onClick={()=>setTimelineOpen(false)} aria-label="Back">
          <ArrowLeft size={24}/>
        </button>
        <div>
          <h1>Wealth Timeline</h1>
          <p>Your goals, milestones, and future wealth path.</p>
        </div>
        <button className="mini-menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu">
          <Menu size={24}/>
        </button>
      </div>

      <section className="timeline-hero timeline-v2-hero">
        <span>{scenarioLabel} projection</span>
        <h2>{summary.next?.label || "Build your timeline"}</h2>
        <p>{summary.next ? `Next up: ${summary.next.title}` : "Add goals to project your next milestones."}</p>

        <div className="timeline-projection-stats">
          <div><small>Recent pace</small><strong>{money(summary.avgGrowth)}/mo</strong></div>
          <div><small>Timeline points</small><strong>{summary.count}</strong></div>
        </div>
      </section>

      <div className="timeline-scenario-tabs">
        {[["conservative","Conservative"],["balanced","Balanced"],["aggressive","Aggressive"]].map(([key,label]) => (
          <button key={key} type="button" className={scenario === key ? "active" : ""} onClick={()=>setScenario(key)}>
            {label}
          </button>
        ))}
      </div>

      <section className="wealth-timeline-list">
        {items.map((item, index) => (
          <article
            className={`timeline-item ${item.tone} tappable`}
            key={`${item.title}-${index}`}
            onClick={() => setActiveItem(item)}
          >
            <div className="timeline-node"><span>{item.icon}</span></div>
            <div className="timeline-content">
              <small>{item.category || item.label}</small>
              <h3>{item.title}</h3>
              <p>{item.label} · {item.detail}</p>
            </div>
            <ChevronRight size={18} className="tl-item-chevron"/>
          </article>
        ))}
      </section>

      {activeItem && (
        <TimelineDrawer
          item={activeItem}
          state={state}
          scenario={scenario}
          onClose={() => setActiveItem(null)}
          onEditGoal={handleEditGoal}
          onOpenCompound={handleOpenCompound}
        />
      )}
    </div>
  );
}



