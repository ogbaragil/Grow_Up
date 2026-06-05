import { getCurrentAge } from "../lib/user";
import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Archive, ChevronDown, ChevronUp, X, ArrowLeft } from "lucide-react";
import { Card, EmptyState, GoalRing, ScreenTitle } from "../components/ui";
import { calculateGoalProgress, clamp, estimateGoalCompletion, getAccountsForSelectedMonth, goalColorForType, goalIconForType, goalStatus, goalTypeLabel, goalValueForSnapshot, monthlyNeeded, refineDebtPayoffCalcWithHistory } from "../lib/goals";
import { computeTotals } from "../lib/insights";
import { compactMoney, currencySign, money } from "../lib/money";
import { readOnlyDemoAlert } from "../state/demo";

export function Goals({ state, setState, setEditor, setMenuOpen, setCompoundOpen, isDemo=false }) {
  const [goalMenuOpen, setGoalMenuOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [showArchivedGoals, setShowArchivedGoals] = useState(false);
  const [debtStrategy, setDebtStrategy] = useState("avalanche");

  const totals = computeTotals(state);
  const accountsForMonth = getAccountsForSelectedMonth(state);

  const allGoals = state.goals || [];
  const activeGoals = allGoals.filter(g => !g.archived);
  const archivedGoals = allGoals.filter(g => g.archived);
  const debtGoals = activeGoals.filter(g => g.goalType === "debtPayoff");

  const sortedDebtGoalIds = debtGoals.length >= 2
    ? debtGoals
        .map(g => {
          let calc = calculateGoalProgress(g, totals, accountsForMonth);
          calc = refineDebtPayoffCalcWithHistory(g, state, calc);
          return { id: g.id, remaining: Number(calc.remaining || 0) };
        })
        .sort((a, b) => debtStrategy === "avalanche" ? b.remaining - a.remaining : a.remaining - b.remaining)
        .map(g => g.id)
    : null;

  const sortedActiveGoals = sortedDebtGoalIds
    ? activeGoals.slice().sort((a, b) => {
        const ai = sortedDebtGoalIds.indexOf(a.id);
        const bi = sortedDebtGoalIds.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : activeGoals;

  const toggle = (id) => setState(s => ({
    ...s,
    goals: (s.goals || []).map(g => g.id === id ? { ...g, open: !g.open } : g)
  }));

  const del = (id) => setState(s => ({
    ...s,
    goals: (s.goals || []).filter(g => g.id !== id)
  }));

  const archive = (id) => {
    if (isDemo) return readOnlyDemoAlert();
    setState(s => ({
      ...s,
      goals: (s.goals || []).map(g => g.id === id ? { ...g, archived: true, archivedAt: new Date().toISOString(), open: false } : g)
    }));
    setShowArchivedGoals(true);
  };

  const restore = (id) => {
    if (isDemo) return readOnlyDemoAlert();
    setState(s => ({
      ...s,
      goals: (s.goals || []).map(g => g.id === id ? { ...g, archived: false, restoredAt: new Date().toISOString() } : g)
    }));
  };

  const moveGoal = (id, direction) => {
    if (isDemo) return readOnlyDemoAlert();
    setState(s => {
      const activeIds = (s.goals || []).filter(g => !g.archived).map(g => g.id);
      const activeIndex = activeIds.indexOf(id);
      const nextActiveId = activeIds[activeIndex + direction];
      if (!nextActiveId) return s;
      const goals = [...(s.goals || [])];
      const index = goals.findIndex(g => g.id === id);
      const nextIndex = goals.findIndex(g => g.id === nextActiveId);
      if (index < 0 || nextIndex < 0) return s;
      [goals[index], goals[nextIndex]] = [goals[nextIndex], goals[index]];
      return { ...s, goals };
    });
  };

  const openAddGoal = () => {
    if (isDemo) return readOnlyDemoAlert();
    setGoalMenuOpen(false);
    setEditor({ type: "goal" });
  };

  const openCompound = () => {
    setGoalMenuOpen(false);
    setCompoundOpen(true);
  };

  return (
    <div className="screen">
      <ScreenTitle title="Your Goals" sub="Big dreams? Let's make them happen — one goal at a time." setMenuOpen={setMenuOpen} />

      {reorderMode && <div className="snapshot-banner">Reorder mode enabled · use ↑ ↓ on each goal</div>}

      {debtGoals.length >= 2 && (
        <Card>
          <h2>Debt Payoff Strategy</h2>
          <div className="dashboard-style-toggle" style={{marginTop:"12px"}}>
            <button type="button" className={debtStrategy === "avalanche" ? "active" : ""} onClick={() => setDebtStrategy("avalanche")}>Avalanche</button>
            <button type="button" className={debtStrategy === "snowball" ? "active" : ""} onClick={() => setDebtStrategy("snowball")}>Snowball</button>
          </div>
          <p className="muted" style={{marginTop:"10px",fontSize:"14px"}}>
            {debtStrategy === "avalanche"
              ? "Attack the largest debt first to minimise total interest."
              : "Clear the smallest debt first for quick wins and momentum."}
          </p>
        </Card>
      )}

      <section className="goals-section active-goals-section">
        <div className="goals-section-label"><span></span><strong>Active Goals</strong></div>
        {sortedActiveGoals.length ? sortedActiveGoals.map((g, index) => (
          <GoalCard
            key={g.id}
            g={g}
            totals={totals}
            accounts={accountsForMonth}
            state={state}
            toggle={toggle}
            del={del}
            archive={archive}
            setEditor={setEditor}
            reorderMode={reorderMode}
            moveGoal={moveGoal}
            canMoveUp={index > 0}
            canMoveDown={index < sortedActiveGoals.length - 1}
          />
        )) : (
          <EmptyState icon="🎯" title="No active goals" text="Add your next wealth goal or restore one from the archive." action="Add goal" onClick={openAddGoal}/>
        )}
      </section>

      <section className="archived-goals-wrap">
        <button className="archived-goals-toggle" type="button" onClick={() => setShowArchivedGoals(v => !v)}>
          <div>
            <strong>Archived Goals</strong>
            <span>{archivedGoals.length ? `${archivedGoals.length} completed & retired goal${archivedGoals.length === 1 ? "" : "s"}` : "No archived goals yet"}</span>
          </div>
          <b>{showArchivedGoals ? "−" : "+"}</b>
        </button>

        {showArchivedGoals && (
          <div className="archived-goals-list">
            {archivedGoals.length ? archivedGoals.map(g => {
              let calc = calculateGoalProgress(g, totals, accountsForMonth);
              calc = refineDebtPayoffCalcWithHistory(g, state, calc);
              const pct = Math.round(calc.progress || 0);
              const colorMap = {
                green:  "linear-gradient(135deg,#1a7a40 0%,#236b4a 100%)",
                red:    "linear-gradient(135deg,#b91c1c 0%,#9f1239 100%)",
                purple: "linear-gradient(135deg,#6d28d9 0%,#4c1d95 100%)",
                blue:   "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)",
                gold:   "linear-gradient(135deg,#b45309 0%,#92400e 100%)",
              };
              const bg = colorMap[g.color || goalColorForType(g.goalType)] || colorMap.green;
              return (
                <article key={g.id} className="goal-card-v2 archived-v2" style={{background: bg, opacity: 0.7, filter: "saturate(0.5)"}}>
                  <div className="goal-v2-top" style={{cursor:"default", paddingBottom:12}}>
                    <div className="goal-v2-icon-wrap">
                      <span className="goal-v2-emoji">{g.icon || goalIconForType(g.goalType)}</span>
                      <GoalRing pct={pct} size={64}/>
                    </div>
                    <div className="goal-v2-main">
                      <h2 className="goal-v2-name">{g.name}</h2>
                      <span style={{fontSize:12,color:"rgba(255,255,255,.6)",fontWeight:800}}>{goalTypeLabel(g.goalType)} · archived</span>
                      <div className="goal-v2-bar" style={{marginTop:6}}>
                        <div className="goal-v2-bar-fill" style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                    <div className="goal-v2-pct"><b>{pct}%</b></div>
                  </div>
                  <div style={{padding:"0 16px 14px",borderTop:"1px solid rgba(255,255,255,.12)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,marginBottom:12}}>
                      <span style={{fontSize:12,color:"rgba(255,255,255,.5)",fontWeight:800}}>
                        Archived {g.archivedAt ? new Date(g.archivedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : ""}
                      </span>
                    </div>
                    <div className="goal-v2-actions">
                      <button type="button" className="goal-v2-btn edit" onClick={()=>restore(g.id)}>Restore</button>
                      <button type="button" className="goal-v2-btn delete" onClick={()=>del(g.id)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="empty-archive-note">Archive completed, paused, or retired goals here so your active list stays focused.</div>
            )}
          </div>
        )}
      </section>

      {goalMenuOpen && (
        <div className="goal-fab-menu">
          <button onClick={openAddGoal}><span className="menu-icon green">+</span><b>Add goal</b></button>
          <button onClick={()=>{ if (isDemo) return readOnlyDemoAlert(); setReorderMode(v=>!v); setGoalMenuOpen(false); }}><span className="menu-icon gray">↕</span><b>{reorderMode ? "Done reorder" : "Reorder goals"}</b></button>
          <button onClick={openCompound}><span className="menu-icon gray">%</span><b>Compound Wealth</b></button>
        </div>
      )}

      <button className={goalMenuOpen ? "fab edit-active" : "fab"} onClick={()=> isDemo ? readOnlyDemoAlert() : setGoalMenuOpen(v=>!v)} aria-label="Goal actions">
        {goalMenuOpen ? <X size={34}/> : <Plus size={34}/>}      
      </button>
    </div>
  );
}

export function GoalCard({ g, totals, accounts, state, toggle, del, archive, setEditor, reorderMode, moveGoal, canMoveUp, canMoveDown }) {
  let calc = calculateGoalProgress(g, totals, accounts);
  calc = refineDebtPayoffCalcWithHistory(g, state, calc);
  const pct = Math.round(calc.progress);
  const forecast = estimateGoalCompletion(g, state, calc, totals);
  const calcWithRate = { ...calc, monthlyRate: forecast.monthlyRate || 0 };
  const status = goalStatus(calcWithRate, g);
  const isNearlyDone = pct >= 80 && pct < 100;
  const isComplete = pct >= 100;

  // Sparkline
  const sparkData = Object.entries(state.monthSnapshots || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, snap]) => {
      const val = goalValueForSnapshot(g, snap);
      if (val === null || !Number.isFinite(val)) return null;
      const target = Number(g.target || 0);
      const goalType = g.goalType || "accountGrowth";
      if (goalType === "debtPayoff") {
        const start = Math.max(Number(g.start || 0), Number(g.current || 0), val);
        return start > 0 ? clamp(((start - val) / start) * 100) : 0;
      }
      return target > 0 ? clamp((val / target) * 100) : 0;
    }).filter(v => v !== null);

  const sparkPoints = sparkData.length >= 2 ? (() => {
    const min = Math.min(...sparkData), max = Math.max(...sparkData);
    const range = Math.max(1, max - min);
    return sparkData.map((v, i) => {
      const x = (i / (sparkData.length - 1)) * 200;
      const y = 30 - ((v - min) / range) * 26;
      return `${x},${y}`;
    }).join(" ");
  })() : null;

  const colorMap = {
    green:  { bg: "linear-gradient(135deg,#1a7a40 0%,#236b4a 100%)", border: "rgba(255,255,255,.12)" },
    red:    { bg: "linear-gradient(135deg,#b91c1c 0%,#9f1239 100%)", border: "rgba(255,255,255,.12)" },
    purple: { bg: "linear-gradient(135deg,#6d28d9 0%,#4c1d95 100%)", border: "rgba(255,255,255,.12)" },
    blue:   { bg: "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)", border: "rgba(255,255,255,.12)" },
    gold:   { bg: "linear-gradient(135deg,#b45309 0%,#92400e 100%)", border: "rgba(255,255,255,.12)" },
  };
  const theme = colorMap[g.color || goalColorForType(g.goalType)] || colorMap.green;

  return (
    <div
      className={`goal-card-v2 ${g.open ? "open" : ""} ${isNearlyDone ? "nearly-done" : ""} ${isComplete ? "complete" : ""}`}
      style={{ background: theme.bg, borderColor: theme.border }}
    >
      {/* Closed header — always visible */}
      <div className="goal-v2-top" onClick={() => !reorderMode && toggle(g.id)}>
        <div className="goal-v2-icon-wrap">
          <span className="goal-v2-emoji">{g.icon || goalIconForType(g.goalType)}</span>
          {!reorderMode && <GoalRing pct={pct} size={64}/>}
        </div>

        <div className="goal-v2-main">
          <h2 className="goal-v2-name">{g.name}</h2>
          <div className="goal-v2-status-row">
            <span className={`goal-v2-status ${status.kind}`}>{status.icon} {status.label}</span>
            {forecast.label !== "Need more history" && (
              <span className="goal-v2-eta">→ {forecast.label}</span>
            )}
          </div>
          {/* Inline progress bar always visible */}
          <div className="goal-v2-bar">
            <div className="goal-v2-bar-fill" style={{width: `${calc.noTarget ? 0 : pct}%`}}/>
          </div>
        </div>

        <div className="goal-v2-pct">
          <b>{calc.noTarget ? "—" : `${pct}%`}</b>
        </div>

        {reorderMode ? (
          <div className="reorder-controls" onClick={e => e.stopPropagation()}>
            <button disabled={!canMoveUp} onClick={() => moveGoal(g.id, -1)}>↑</button>
            <button disabled={!canMoveDown} onClick={() => moveGoal(g.id, 1)}>↓</button>
          </div>
        ) : (
          <div className="goal-v2-chevron">
            {g.open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {g.open && !reorderMode && (
        <div className="goal-v2-detail">
          {/* Progress figures */}
          <div className="goal-v2-figures">
            {calc.noTarget ? (
              <p className="goal-v2-notarget">Edit this goal and enter a target to start tracking.</p>
            ) : (calc.goalType || g.goalType) === "debtPayoff" ? (
              <>
                <div><span>Paid off</span><strong>{money(Math.max(0, Number(calc.start||0) - Number(calc.current||0)))}</strong></div>
                <div><span>Remaining</span><strong>{money(calc.remaining)}</strong></div>
                <div><span>Started at</span><strong>{money(calc.start)}</strong></div>
              </>
            ) : (
              <>
                <div><span>Current</span><strong>{money(calc.current)}</strong></div>
                <div><span>Target</span><strong>{money(calc.target)}</strong></div>
                <div><span>Remaining</span><strong>{money(calc.remaining)}</strong></div>
              </>
            )}
            {g.deadline && (
              <div><span>Deadline</span><strong>{new Date(g.deadline).toLocaleDateString("en-US",{month:"short",year:"numeric"})}</strong></div>
            )}
          </div>

          {/* Forecast */}
          {forecast.kind !== "neutral" && (
            <div className={`goal-v2-forecast ${forecast.kind}`}>
              <div className="goal-v2-forecast-main">
                <span>Forecast</span>
                <strong>{forecast.label}</strong>
              </div>
              {forecast.detail && <small>{forecast.detail}</small>}
            </div>
          )}

          {/* Sparkline */}
          {sparkPoints && (
            <div className="goal-v2-spark">
              <svg viewBox="0 0 200 32" style={{width:"100%",height:32,display:"block"}}>
                <polyline points={sparkPoints} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Progress over time</span>
            </div>
          )}

          {/* Monthly pace if deadline set */}
          {calc.monthlyNeeded > 0 && (
            <p className="goal-v2-pace">{money(calc.monthlyNeeded)}/mo needed to hit deadline</p>
          )}

          {/* Actions */}
          <div className="goal-v2-actions">
            <button className="goal-v2-btn edit" onClick={() => setEditor({ type:"goal", item:g })}>
              <Pencil size={16}/> Edit
            </button>
            <button className="goal-v2-btn archive" onClick={() => archive(g.id)}>
              <Archive size={16}/> Archive
            </button>
            <button className="goal-v2-btn delete" onClick={() => del(g.id)}>
              <Trash2 size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CompoundWealthPage({ setCompoundOpen, setMenuOpen, state, setState, totals }) {
  const startingNet = totals ? Math.max(0, Number(totals.net || 0)) : 20000;
  const startingSurplus = totals ? Math.max(0, Math.round((totals.income || 0) - (totals.expenses || 0))) : 2100;

  // Load saved inputs from profile, fall back to live totals for first open
  const saved = state.profile?.compoundInputs;
  const [inputs, setInputs] = useState({
    start:     saved?.start     ?? startingNet   ?? 20000,
    monthly:   saved?.monthly   ?? startingSurplus ?? 2100,
    years:     saved?.years     ?? 20,
    rate:      saved?.rate      ?? 7,
    startYear: saved?.startYear ?? new Date().getFullYear(),
    age:       saved?.age       ?? (getCurrentAge(state.profile) || 35)
  });

  // Persist inputs to state whenever they change
  const change = (key, value) => {
    const next = { ...inputs, [key]: Number(value || 0) };
    setInputs(next);
    setState(s => ({ ...s, profile: { ...(s.profile || {}), compoundInputs: next } }));
  };

  const rows = useMemo(() => {
    let value = Number(inputs.start || 0);
    const annualContribution = Number(inputs.monthly || 0) * 12;
    const rate = Number(inputs.rate || 0) / 100;
    const out = [];

    for (let i = 1; i <= Number(inputs.years || 0); i++) {
      const year = Number(inputs.startYear || new Date().getFullYear()) + i - 1;
      const age = Number(inputs.age || 0) + i - 1;
      const contribution = annualContribution * i;
      const beforeGrowth = value + annualContribution;
      const growth = beforeGrowth * rate;
      value = beforeGrowth + growth;

      out.push({
        year,
        age,
        contribution,
        growth,
        value
      });
    }

    return out;
  }, [inputs]);

  const futureValue = rows.at(-1)?.value || Number(inputs.start || 0);
  const totalContributions = Number(inputs.start || 0) + (Number(inputs.monthly || 0) * 12 * Number(inputs.years || 0));
  const totalGrowth = Math.max(0, futureValue - totalContributions);

  const reset = () => {
    const defaults = { start: startingNet || 20000, monthly: startingSurplus || 2100, years: 20, rate: 7, startYear: new Date().getFullYear(), age: getCurrentAge(state.profile) || 35 };
    setInputs(defaults);
    setState(s => ({ ...s, profile: { ...(s.profile || {}), compoundInputs: null } }));
  };

  return (
    <div className="screen compound-screen">
      <div className="compound-header">
        <button className="round-nav-btn" onClick={()=>setCompoundOpen(false)}><ArrowLeft size={24}/></button>
        <div>
          <h1>Compound Wealth</h1>
          <p>Run your rich-life scenarios and see how time turns habits into wealth.</p>
        </div>
        <button className="reset-btn" onClick={reset}>Reset</button>
      </div>

      <section className="compound-hero-card">
        <div className="compound-hero-label">Projected future value</div>
        <div className="compound-hero-value">{money(futureValue)}</div>
        <div className="compound-hero-stats">
          <div><small>Contributions</small><strong>{money(totalContributions)}</strong></div>
          <div><small>Growth</small><strong className="success">+{money(totalGrowth)}</strong></div>
          <div><small>Years</small><strong>{inputs.years}</strong></div>
        </div>
      </section>

      <Card>
        <span className="section-chip">Scenario inputs</span>
        <div className="compound-grid">
          <label>Starting amount ({currencySign(state.currency)})<input type="number" value={inputs.start} onChange={e=>change("start", e.target.value)} /><small className="field-caption">Pre-filled from your current net worth</small></label>
          <label>Monthly contribution ({currencySign(state.currency)})<input type="number" value={inputs.monthly} onChange={e=>change("monthly", e.target.value)} /><small className="field-caption">Pre-filled from your cash surplus</small></label>
          <label>Years<input type="number" value={inputs.years} onChange={e=>change("years", e.target.value)} /></label>
          <label>Annual rate (%)<input type="number" value={inputs.rate} onChange={e=>change("rate", e.target.value)} /></label>
          <label>Start year (calendar)<input type="number" value={inputs.startYear} onChange={e=>change("startYear", e.target.value)} /></label>
          <label>Your age at start year<input type="number" value={inputs.age} onChange={e=>change("age", e.target.value)} /></label>
        </div>
      </Card>

      <div className="checkpoint-label"><i></i><b>Yearly checkpoints</b></div>

      <Card className="checkpoint-card">
        <h2>Yearly Checkpoints</h2>
        <div className="checkpoint-head"><span>Year</span><span>Age</span><span>Contr.</span><span>Growth</span><span>Value</span></div>
        {rows.map(row => (
          <div className="checkpoint-row" key={row.year}>
            <span>{row.year}</span>
            <span>{row.age}</span>
            <span>{compactMoney(row.contribution)}</span>
            <span className="success">+{compactMoney(row.growth)}</span>
            <span>{compactMoney(row.value)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

