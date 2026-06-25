import { getCurrentAge } from "../lib/user";
import React, { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Plus, Pencil, Trash2, Archive, ChevronDown, ChevronUp, ChevronRight, X, ArrowLeft, Menu, RotateCcw, Check, Star, Info } from "lucide-react";
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

      {sortedActiveGoals.length > 0 && (
        <button className="page-footer-link" onClick={openCompound}>
          <span>Run a Compound Wealth scenario</span>
          <ChevronRight size={15} />
        </button>
      )}

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

// ── Projection engine ──────────────────────────────────────────────────────
// Beginning-of-year contributions, compounded annually. Returns a baseline row
// (year 0 = starting amount) followed by one row per projected year.
function projectWealth({ start, monthly, years, rate, startYear, age }) {
  const s = Math.max(0, Number(start) || 0);
  const annual = Math.max(0, Number(monthly) || 0) * 12;
  const yrs = Math.max(0, Math.round(Number(years) || 0));
  const r = (Number(rate) || 0) / 100;
  const sy = Number(startYear) || new Date().getFullYear();
  const a0 = Number(age) || 0;

  const rows = [{ year: sy, age: a0, contributions: s, growth: 0, value: s }];
  let value = s;
  for (let i = 1; i <= yrs; i++) {
    const beforeGrowth = value + annual;
    const growth = beforeGrowth * r;
    value = beforeGrowth + growth;
    rows.push({ year: sy + i, age: a0 + i, contributions: s + annual * i, growth, value });
  }
  const futureValue = value;
  const totalContributions = s + annual * yrs;
  const totalGrowth = Math.max(0, futureValue - totalContributions);
  return { rows, futureValue, totalContributions, totalGrowth, endYear: sy + yrs };
}

const MILESTONE_LADDER = [100000, 250000, 500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000, 10000000, 25000000];

function firstYearAtOrAbove(rows, threshold) {
  const hit = rows.find(r => r.value >= threshold);
  return hit ? { year: hit.year, yearsFromStart: hit.year - rows[0].year } : null;
}

// Formatted, editable value chip: shows "$20,000" at rest, raw digits while typing.
function CwValue({ value, onChange, prefix = "", suffix = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const display = editing ? draft : `${prefix}${Number(value || 0).toLocaleString()}${suffix}`;
  return (
    <input
      className="cw-field-value"
      inputMode="decimal"
      value={display}
      onFocus={() => { setEditing(true); setDraft(String(value ?? 0)); }}
      onChange={(e) => { const d = e.target.value.replace(/[^0-9.]/g, ""); setDraft(d); onChange(Number(d) || 0); }}
      onBlur={() => setEditing(false)}
    />
  );
}

function CwField({ label, caption, value, onChange, prefix, suffix, min, max, step, minLabel, maxLabel }) {
  const sliderMax = Math.max(max, Number(value) || 0);
  return (
    <div className="cw-field">
      <div className="cw-field-label">{label}</div>
      <CwValue value={value} onChange={onChange} prefix={prefix} suffix={suffix} />
      <div className="cw-field-caption">{caption}</div>
      <input
        type="range" className="cw-slider"
        min={min} max={sliderMax} step={step}
        value={Math.min(Math.max(Number(value) || 0, min), sliderMax)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="cw-field-range"><span>{minLabel}</span><span>{maxLabel}</span></div>
    </div>
  );
}

function CwTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="cw-tooltip">
      <div className="cw-tooltip-year">{row.year} · age {row.age}</div>
      <div className="cw-tooltip-line"><span style={{ color: "#6366f1" }}>Future value</span><b>{money(row.value)}</b></div>
      <div className="cw-tooltip-line"><span className="muted">Contributions</span><b>{money(row.contributions)}</b></div>
    </div>
  );
}

export function CompoundWealthPage({ setCompoundOpen, setMenuOpen, state, setState, totals }) {
  const startingNet = totals ? Math.max(0, Math.round(Number(totals.net || 0))) : 20000;
  const startingSurplus = totals ? Math.max(0, Math.round((totals.income || 0) - (totals.expenses || 0))) : 2100;

  const saved = state.profile?.compoundInputs;
  const defaults = {
    start: startingNet || 20000,
    monthly: startingSurplus || 2100,
    years: 20,
    rate: 7,
    startYear: new Date().getFullYear(),
    age: getCurrentAge(state.profile) || 35,
  };
  const [inputs, setInputs] = useState({
    start: saved?.start ?? defaults.start,
    monthly: saved?.monthly ?? defaults.monthly,
    years: saved?.years ?? defaults.years,
    rate: saved?.rate ?? defaults.rate,
    startYear: saved?.startYear ?? defaults.startYear,
    age: saved?.age ?? defaults.age,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const apply = (patch) => {
    const next = { ...inputs, ...patch };
    Object.keys(patch).forEach((k) => { next[k] = Number(next[k] || 0); });
    setInputs(next);
    setState((s) => ({ ...s, profile: { ...(s.profile || {}), compoundInputs: next } }));
  };
  const change = (key, value) => apply({ [key]: value });

  const reset = () => {
    setInputs(defaults);
    setState((s) => ({ ...s, profile: { ...(s.profile || {}), compoundInputs: null } }));
  };

  const proj = useMemo(() => projectWealth(inputs), [inputs]);
  const { rows, futureValue, totalContributions, totalGrowth, endYear } = proj;

  const growthPct = futureValue > 0 ? (totalGrowth / futureValue) * 100 : 0;
  const contribPct = futureValue > 0 ? (totalContributions / futureValue) * 100 : 0;
  const yearRows = rows.slice(1); // exclude the baseline row for the table

  // Milestones: round thresholds reached within the horizon + a final goal card.
  const milestones = useMemo(() => {
    const reached = MILESTONE_LADDER
      .filter((t) => t <= futureValue + 0.5)
      .map((t) => ({ amount: t, ...firstYearAtOrAbove(rows, t) }))
      .filter((m) => m.year != null)
      .slice(0, 4);
    return reached;
  }, [rows, futureValue]);

  // What-if scenarios (previews computed without mutating live inputs).
  const scenarios = useMemo(() => {
    const mk = (label, patch, sub) => ({ label, sub, patch, fv: projectWealth({ ...inputs, ...patch }).futureValue });
    const base = [
      { label: "Base case", patch: null, fv: futureValue, active: true },
      mk("+$500 / month", { monthly: Number(inputs.monthly || 0) + 500 }),
      mk("10% return", { rate: 10 }),
      mk("Retire at 60", { years: Math.max(1, 60 - Number(inputs.age || 0)) }),
    ];
    const more = [
      mk("12% return", { rate: 12 }),
      mk("+$1,000 / month", { monthly: Number(inputs.monthly || 0) + 1000 }),
      mk("Retire at 55", { years: Math.max(1, 55 - Number(inputs.age || 0)) }),
    ];
    return showMore ? [...base, ...more] : base;
  }, [inputs, futureValue, showMore]);

  // Hero sparkline path
  const spark = useMemo(() => {
    const vals = rows.map((r) => r.value);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const span = maxV - minV || 1;
    const pts = rows.map((r, i) => [(i / (rows.length - 1 || 1)) * 100, 100 - ((r.value - minV) / span) * 92 - 4]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
    const area = `${line} L100,100 L0,100 Z`;
    return { line, area, end: pts[pts.length - 1] || [100, 50] };
  }, [rows]);

  const sign = currencySign(state.currency);
  // Tight K/M formatter so the chart axis and checkpoint table never overflow
  // on small phones (compactMoney shows full numbers between 10k–1M).
  const kMoney = (v) => {
    const n = Number(v) || 0;
    const a = Math.abs(n);
    if (a >= 1000000) return `${sign}${(n / 1000000).toFixed(1)}M`;
    if (a >= 1000) return `${sign}${(n / 1000).toFixed(a >= 100000 ? 0 : 1)}K`;
    return `${sign}${Math.round(n)}`;
  };

  return (
    <div className="screen compound-screen cw-screen">
      <div className="compound-header">
        <button className="round-nav-btn" onClick={() => setCompoundOpen(false)}><ArrowLeft size={24} /></button>
        <div>
          <h1>Compound Wealth</h1>
          <p>Run your rich-life scenarios and see how time turns habits into wealth.</p>
        </div>
        <button className="mini-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={24} /></button>
      </div>

      {/* Hero */}
      <section className="cw-hero">
        <div className="cw-hero-top">
          <div className="cw-hero-label">Projected future value</div>
          <div className="cw-hero-value">{money(futureValue)}</div>
          {totalGrowth > 0 && (
            <div className="cw-hero-pill">▲ Up {money(totalGrowth)} ({growthPct.toFixed(1)}%) from growth</div>
          )}
        </div>
        <div className="cw-hero-spark">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="cw-spark-svg">
            <defs>
              <linearGradient id="cwHeroFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b8bf6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#8b8bf6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={spark.area} fill="url(#cwHeroFill)" />
            <path d={spark.line} fill="none" stroke="#a5a5fb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="cw-spark-end" style={{ left: `${spark.end[0]}%`, top: `${spark.end[1]}%` }} />
          <div className="cw-spark-tag">{endYear}<b>{compactMoney(futureValue)}</b></div>
        </div>
        <div className="cw-hero-stats">
          <div className="cw-stat">
            <small>TOTAL CONTRIBUTIONS</small>
            <strong>{money(totalContributions)}</strong>
            <em>{contribPct.toFixed(1)}% of future value</em>
          </div>
          <div className="cw-stat">
            <small>TOTAL GROWTH</small>
            <strong className="grow">{money(totalGrowth)}</strong>
            <em>{growthPct.toFixed(1)}% of future value</em>
          </div>
          <div className="cw-stat">
            <small>TIME PERIOD</small>
            <strong>{inputs.years} years</strong>
            <em>{inputs.startYear} – {endYear}</em>
          </div>
        </div>
      </section>

      {/* Scenario inputs */}
      <Card className="cw-card">
        <div className="cw-scenario-head">
          <div>
            <h2>Your Scenario</h2>
            <p className="cw-sub">Compared to today · Updated in real time</p>
          </div>
          <button className="cw-reset" onClick={reset}><RotateCcw size={15} /> Reset</button>
        </div>

        <div className="cw-fields">
          <CwField label="Starting amount" caption="From your net worth"
            value={inputs.start} onChange={(v) => change("start", v)} prefix={sign}
            min={0} max={1000000} step={1000} minLabel={`${sign}0`} maxLabel={`${sign}1M+`} />
          <CwField label="Monthly contribution" caption="From your cash surplus"
            value={inputs.monthly} onChange={(v) => change("monthly", v)} prefix={sign} suffix=" /mo"
            min={0} max={10000} step={50} minLabel={`${sign}0`} maxLabel={`${sign}10K+`} />
          <CwField label="Annual return" caption="Average annual growth rate"
            value={inputs.rate} onChange={(v) => change("rate", v)} suffix="%"
            min={0} max={15} step={0.5} minLabel="0%" maxLabel="15%+" />
          <CwField label="Years" caption="Time horizon"
            value={inputs.years} onChange={(v) => change("years", v)} suffix=" years"
            min={1} max={50} step={1} minLabel="1" maxLabel="50+" />
        </div>

        <button className="cw-advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
          Advanced options {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showAdvanced && (
          <div className="cw-advanced">
            <label>Start year<input type="number" value={inputs.startYear} onChange={(e) => change("startYear", e.target.value)} /></label>
            <label>Your age at start<input type="number" value={inputs.age} onChange={(e) => change("age", e.target.value)} /></label>
          </div>
        )}
      </Card>

      {/* Projection chart */}
      <Card className="cw-card cw-chart-card">
        <div className="cw-chart-head">
          <h2>Wealth Projection</h2>
        </div>
        <div className="cw-legend">
          <span className="cw-legend-item"><i className="dot value" /> Future value</span>
          <span className="cw-legend-item"><i className="dot contrib" /> Total contributions</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={rows} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cwChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={36} />
            <YAxis tickFormatter={kMoney} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={46} />
            <Tooltip content={<CwTooltip />} />
            <Area type="monotone" dataKey="contributions" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 4" fill="none" dot={false} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#cwChartFill)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="cw-chart-note">Values in today's {state.currency || "USD"} (not adjusted for inflation)</p>
      </Card>

      {/* Milestones */}
      <div className="cw-section-label">Key Milestones</div>
      <div className="cw-milestones">
        {milestones.map((m) => (
          <div className="cw-milestone" key={m.amount}>
            <span className="cw-milestone-check"><Check size={14} /></span>
            <span className="cw-milestone-year">{m.year}</span>
            <span className="cw-milestone-amount">{compactMoney(m.amount)}</span>
          </div>
        ))}
        <div className="cw-milestone goal">
          <span className="cw-milestone-star"><Star size={14} /></span>
          <span className="cw-milestone-year">{endYear}</span>
          <span className="cw-milestone-amount">{compactMoney(futureValue)}</span>
          <span className="cw-milestone-sub">{inputs.years} years 🎉</span>
        </div>
      </div>

      {/* Yearly checkpoints (collapsible) */}
      <Card className="cw-card cw-checkpoints">
        <button className="cw-checkpoints-head" onClick={() => setShowTable((v) => !v)}>
          <div>
            <h2>Yearly Checkpoints</h2>
            <p className="cw-sub">See how your wealth grows year by year</p>
          </div>
          <span className="cw-view-table">{showTable ? "Hide" : "View table"} {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </button>
        {showTable && (
          <div className="cw-table">
            <div className="checkpoint-head"><span>Year</span><span>Age</span><span>Contr.</span><span>Growth</span><span>Value</span></div>
            {yearRows.map((row) => (
              <div className="checkpoint-row" key={row.year}>
                <span>{row.year}</span>
                <span>{row.age}</span>
                <span>{kMoney(row.contributions)}</span>
                <span className="success">+{kMoney(row.growth)}</span>
                <span>{kMoney(row.value)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* What-if scenarios */}
      <div className="cw-section-label">What if Scenarios</div>
      <p className="cw-sub cw-whatif-sub">Tap a scenario to instantly see the impact</p>
      <div className="cw-whatif">
        {scenarios.map((sc) => (
          <button
            key={sc.label}
            className={`cw-scenario-chip ${sc.active ? "active" : ""}`}
            onClick={() => { if (sc.patch) apply(sc.patch); }}
          >
            <span className="cw-scenario-label">{sc.label}</span>
            <span className="cw-scenario-fv">{compactMoney(sc.fv)}</span>
          </button>
        ))}
        <button className="cw-scenario-chip more" onClick={() => setShowMore((v) => !v)}>
          <Info size={15} />
          <span className="cw-scenario-label">{showMore ? "Show less" : "Compare more"}</span>
        </button>
      </div>
    </div>
  );
}

