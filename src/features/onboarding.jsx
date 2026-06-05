import { getCurrentAge } from "../lib/user";
import { CURRENCY_OPTIONS, currencySign, money } from "../lib/money";
import React, { useMemo, useState } from "react";
import { safeId } from "../state/normalize";
import { monthKey } from "../lib/dates";
import { createMonthlySnapshotState } from "../state/snapshots";

export const PRIMARY_GOAL_OPTIONS = [
  { value: "debt",    icon: "⚡", label: "Pay off debt",              sub: "Get out of debt faster" },
  { value: "savings", icon: "🛡️", label: "Build savings",             sub: "Emergency fund or cash buffer" },
  { value: "house",   icon: "🏠", label: "Save for a house",          sub: "Home deposit or upgrade" },
  { value: "invest",  icon: "📈", label: "Grow investments",          sub: "Build a portfolio over time" },
  { value: "fire",    icon: "🔥", label: "Reach financial independence", sub: "Retire early or work optionally" },
];

export const COMMON_EXPENSE_PRESETS = [
  { name: "Rent / Mortgage", icon: "🏠" },
  { name: "Groceries",       icon: "🛒" },
  { name: "Car / Transport", icon: "🚗" },
  { name: "Insurance",       icon: "🛡️" },
  { name: "Childcare",       icon: "👶" },
  { name: "Subscriptions",   icon: "📺" },
  { name: "Utilities",       icon: "⚡" },
  { name: "Phone / Internet",icon: "📱" },
];

const CURRENCY_FLAGS = {
  USD: "🇺🇸", AUD: "🇦🇺", GBP: "🇬🇧", EUR: "🇪🇺", NGN: "🇳🇬", CAD: "🇨🇦",
  NZD: "🇳🇿", JPY: "🇯🇵", CNY: "🇨🇳", INR: "🇮🇳", ZAR: "🇿🇦", GHS: "🇬🇭",
  KES: "🇰🇪", CHF: "🇨🇭", SGD: "🇸🇬", AED: "🇦🇪",
};

const num = (v) => Math.max(0, Number(v) || 0);

export function InfoBadge({ tip }) {
  // Hover shows the tooltip on desktop; tap/focus toggles it on touch devices.
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`info-badge${open ? " open" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={tip}
      onClick={(e) => { e.preventDefault(); setOpen(o => !o); }}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } }}
    >
      i
      <span className="info-badge-tip">{tip}</span>
    </span>
  );
}

export function OnboardingWizard({ state, setState, onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    firstName: state.firstName || "",
    birth: state.profile?.birth || "",
    retirementAge: state.profile?.retirementAge || 65,
    income: state.profile?.income || "",
    currency: state.currency || "USD",
    expenses: state.profile?.expenses?.length ? state.profile.expenses : [],
    primaryGoal: state.profile?.primaryGoal || null,
    cashBalance: "",
    investBalance: "",
    debtBalance: "",
    goalTarget: "",
  });

  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));
  const setExpense = (i, k, v) => setProfile(p => {
    const expenses = [...p.expenses];
    expenses[i] = { ...expenses[i], [k]: v };
    return { ...p, expenses };
  });

  // Fixed flow: 0 welcome · 1 currency · 2 goal · 3 income · 4 expenses · 5 balances · 6 summary
  const SCREENS = 7;
  const LAST = SCREENS - 1;

  const next = () => setStep(s => Math.min(LAST, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const currentAge = getCurrentAge({ birth: profile.birth });
  const retirementTooLow = currentAge != null && Number(profile.retirementAge) <= currentAge;

  // ── Derived numbers shared by the summary screen and finish() ──
  const derived = useMemo(() => {
    const monthlyExpenses = profile.expenses.reduce((s, e) => s + num(e.amount), 0);
    const income = num(profile.income);
    const surplus = income > 0 ? income - monthlyExpenses : 0;
    const assets = num(profile.cashBalance) + num(profile.investBalance);
    const debts = num(profile.debtBalance);
    const net = assets - debts;
    const fireNumber = monthlyExpenses > 0 ? Math.round(monthlyExpenses * 12 * 25) : 0;

    // Simple 10-year projection at 7% p.a. on net worth + monthly surplus
    let projected = Math.max(0, net);
    const annualContribution = Math.max(0, surplus) * 12;
    for (let i = 0; i < 10; i++) projected = (projected + annualContribution) * 1.07;

    return { monthlyExpenses, income, surplus, assets, debts, net, fireNumber, projected: Math.round(projected) };
  }, [profile]);

  const finish = () => {
    const now = new Date().toISOString();
    const cur = profile.currency || "USD";

    // ── Starter accounts from balances ──
    const starterAccounts = [];
    if (num(profile.cashBalance) > 0) starterAccounts.push({
      id: safeId(), name: "Savings", icon: "🏦", kind: "asset", subtype: "savings",
      balance: num(profile.cashBalance), previous: 0
    });
    if (num(profile.investBalance) > 0) starterAccounts.push({
      id: safeId(), name: "Investments", icon: "📈", kind: "asset", subtype: "investment",
      balance: num(profile.investBalance), previous: 0
    });
    let debtAccountId = null;
    if (num(profile.debtBalance) > 0) {
      debtAccountId = safeId();
      starterAccounts.push({
        id: debtAccountId, name: "Debt", icon: "💳", kind: "debt", subtype: "loan",
        balance: num(profile.debtBalance), previous: 0
      });
    }

    // ── Starter transactions from income + expenses ──
    const starterTransactions = [
      ...(num(profile.income) > 0 ? [{
        id: safeId(), type: "income", name: "Salary", icon: "💵",
        amount: num(profile.income), frequency: "monthly", recurring: true,
        date: now, endsOn: null
      }] : []),
      ...profile.expenses
        .filter(e => e.name && num(e.amount) > 0)
        .map(e => ({
          id: safeId(), type: "expense", name: e.name, icon: e.icon || "💳",
          amount: num(e.amount), frequency: "monthly", recurring: true,
          date: now, endsOn: null
        }))
    ];

    // ── Starter goal — only created when it can actually track something ──
    const starterGoals = [];
    const goalBase = { current: "", start: "", accountId: "", account: "", deadline: "", open: false, archived: false };

    if (profile.primaryGoal === "fire" && derived.fireNumber > 0) {
      starterGoals.push({
        ...goalBase, id: safeId(), name: "Financial Independence", icon: "🔥",
        goalType: "fire", color: "gold", target: derived.fireNumber
      });
    } else if (profile.primaryGoal === "debt" && num(profile.debtBalance) > 0) {
      starterGoals.push({
        ...goalBase, id: safeId(), name: "Debt free", icon: "⚡",
        goalType: "debtPayoff", color: "red", target: 0,
        start: num(profile.debtBalance), current: num(profile.debtBalance),
        accountId: debtAccountId || "", account: debtAccountId ? "Debt" : ""
      });
    } else if (profile.primaryGoal === "house" && num(profile.goalTarget) > 0) {
      starterGoals.push({
        ...goalBase, id: safeId(), name: "Home deposit", icon: "🏠",
        goalType: "savings", color: "blue", target: num(profile.goalTarget),
        accountId: starterAccounts.find(a => a.subtype === "savings")?.id || "",
        account: starterAccounts.find(a => a.subtype === "savings") ? "Savings" : ""
      });
    } else if (profile.primaryGoal === "savings") {
      const target = num(profile.goalTarget) > 0
        ? num(profile.goalTarget)
        : derived.monthlyExpenses > 0 ? Math.round(derived.monthlyExpenses * 3) : 0;
      if (target > 0) starterGoals.push({
        ...goalBase, id: safeId(), name: "Emergency fund", icon: "🛡️",
        goalType: "savings", color: "blue", target,
        accountId: starterAccounts.find(a => a.subtype === "savings")?.id || "",
        account: starterAccounts.find(a => a.subtype === "savings") ? "Savings" : ""
      });
    } else if (profile.primaryGoal === "invest" && num(profile.goalTarget) > 0) {
      starterGoals.push({
        ...goalBase, id: safeId(), name: "Investment portfolio", icon: "📈",
        goalType: "accountGrowth", color: "green", target: num(profile.goalTarget),
        accountId: starterAccounts.find(a => a.subtype === "investment")?.id || "",
        account: starterAccounts.find(a => a.subtype === "investment") ? "Investments" : ""
      });
    }

    setState(s => {
      let nextState = {
        ...s,
        firstName: profile.firstName || s.firstName,
        currency: cur,
        profileComplete: true,
        selectedMonth: monthKey(),
        profile: {
          ...(s.profile || {}),
          birth: profile.birth || null,
          age: currentAge,
          retirementAge: Number(profile.retirementAge) || 65,
          income: num(profile.income) || null,
          expenses: profile.expenses.filter(e => e.name && num(e.amount) > 0),
          primaryGoal: profile.primaryGoal,
          roughDebt: num(profile.debtBalance) || null,
        },
        accounts: s.accounts?.length ? s.accounts : starterAccounts,
        transactions: s.transactions?.length ? s.transactions : starterTransactions,
        goals: s.goals?.length ? s.goals : starterGoals,
      };

      // Save the first month snapshot so the dashboard shows a real net worth
      // (and the trend chart has its first data point) immediately.
      if (!s.accounts?.length && starterAccounts.length) {
        try { nextState = createMonthlySnapshotState(nextState); } catch (e) { console.error(e); }
      }

      return nextState;
    });
    onComplete();
  };

  const progressPct = Math.round(((step + 1) / SCREENS) * 100);
  const screenProps = { total: SCREENS, progress: progressPct };

  // ── Step 0 — Welcome + name + age ──
  if (step === 0) return (
    <WizardScreen {...screenProps} step={0} onBack={null} onNext={next} nextLabel="Let's go →" nextDisabled={retirementTooLow}>
      <div className="wizard-hero">
        <div className="wizard-logo">🌱</div>
        <h1>Welcome to Grow UP</h1>
        <p>A couple of minutes and your personalised financial picture is ready.</p>
      </div>
      <label className="wizard-label">What should we call you?
        <input className="wizard-input" placeholder="First name" value={profile.firstName} onChange={e => set("firstName", e.target.value)} />
      </label>
      <div className="wizard-row">
        <label className="wizard-label">Birth month &amp; year{currentAge != null ? <span className="wizard-hint"> · age {currentAge}</span> : null}
          <input className="wizard-input" type="month" value={profile.birth || ""} max={new Date().toISOString().slice(0, 7)} onChange={e => set("birth", e.target.value)} />
        </label>
        <label className="wizard-label">Desired retirement age
          <input className="wizard-input" type="number" placeholder="e.g. 65" value={profile.retirementAge} onChange={e => set("retirementAge", e.target.value)} min={currentAge != null ? currentAge + 1 : 40} max="99" />
        </label>
      </div>
      {retirementTooLow && <p className="wizard-error">Retirement age needs to be above your current age ({currentAge}).</p>}
    </WizardScreen>
  );

  // ── Step 1 — Currency ──
  if (step === 1) return (
    <WizardScreen {...screenProps} step={1} onBack={back} onNext={next} nextLabel="Continue →">
      <h2 className="wizard-question">What currency do you use?</h2>
      <p className="wizard-sub">All your balances will display in this currency.</p>
      <div className="wizard-currency-grid">
        {CURRENCY_OPTIONS.map(([code, name]) => (
          <button key={code} type="button"
            className={"wizard-currency-option" + (profile.currency === code ? " selected" : "")}
            onClick={() => set("currency", code)}>
            <span className="wizard-currency-flag">{CURRENCY_FLAGS[code] || "💱"}</span>
            <strong>{code}</strong>
            <small>{name}</small>
            {profile.currency === code && <span className="wizard-check">✓</span>}
          </button>
        ))}
      </div>
    </WizardScreen>
  );

  // ── Step 2 — Primary goal ──
  if (step === 2) return (
    <WizardScreen {...screenProps} step={2} onBack={back} onNext={next} nextLabel="Continue →" nextDisabled={!profile.primaryGoal}>
      <h2 className="wizard-question">What's your main financial focus right now?</h2>
      <p className="wizard-sub">Pick one — you can add more goals later.</p>
      <div className="wizard-goal-options">
        {PRIMARY_GOAL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`wizard-goal-option ${profile.primaryGoal === opt.value ? "selected" : ""}`}
            onClick={() => set("primaryGoal", opt.value)}
          >
            <span className="wizard-goal-icon">{opt.icon}</span>
            <div>
              <strong>{opt.label}</strong>
              <small>{opt.sub}</small>
            </div>
            {profile.primaryGoal === opt.value && <span className="wizard-check">✓</span>}
          </button>
        ))}
      </div>
    </WizardScreen>
  );

  // ── Step 3 — Income ──
  if (step === 3) return (
    <WizardScreen {...screenProps} step={3} onBack={back} onNext={next} nextLabel="Continue →">
      <h2 className="wizard-question">What's your monthly take-home income?</h2>
      <p className="wizard-sub">After tax. We'll pre-fill Cash Flow with this — you can refine it later.</p>
      <div className="wizard-amount-wrap">
        <span className="wizard-currency">{currencySign(profile.currency)}</span>
        <input
          className="wizard-input large"
          type="number"
          min="0"
          placeholder="e.g. 5000"
          value={profile.income}
          onChange={e => set("income", e.target.value)}
        />
        <span className="wizard-per">/mo</span>
      </div>
      <button type="button" className="wizard-skip" onClick={next}>Skip for now</button>
    </WizardScreen>
  );

  // ── Step 4 — Expenses (chip-first: tap a chip to add a row) ──
  if (step === 4) {
    const MAX_EXPENSES = 5;
    const atCap = profile.expenses.length >= MAX_EXPENSES;
    const usedNames = new Set(profile.expenses.map(e => e.name));

    const addPreset = (p) => {
      if (atCap || usedNames.has(p.name)) return;
      setProfile(prev => ({ ...prev, expenses: [...prev.expenses, { name: p.name, icon: p.icon, amount: "" }] }));
    };
    const addCustom = () => {
      if (atCap) return;
      setProfile(prev => ({ ...prev, expenses: [...prev.expenses, { name: "", icon: "💳", amount: "", custom: true }] }));
    };
    const removeExpense = (i) => setProfile(prev => ({ ...prev, expenses: prev.expenses.filter((_, idx) => idx !== i) }));

    return (
      <WizardScreen {...screenProps} step={4} onBack={back} onNext={next} nextLabel="Continue →">
        <h2 className="wizard-question">What are your biggest monthly expenses?</h2>
        <p className="wizard-sub">Tap to add your top 3 — rough amounts are fine. These unlock your FIRE number and spending chart.</p>

        <div className="wizard-expense-presets top">
          {COMMON_EXPENSE_PRESETS.map(p => {
            const used = usedNames.has(p.name);
            return (
              <button
                key={p.name}
                type="button"
                className={`quickadd-chip small${used ? " used" : ""}${atCap && !used ? " capped" : ""}`}
                disabled={used || atCap}
                onClick={() => addPreset(p)}
              >{p.icon} {p.name}</button>
            );
          })}
          <button type="button" className={`quickadd-chip small${atCap ? " capped" : ""}`} disabled={atCap} onClick={addCustom}>＋ Add your own</button>
        </div>

        {profile.expenses.map((exp, i) => (
          <div key={i} className="wizard-expense-row">
            <span className="wizard-expense-icon static">{exp.icon || "💳"}</span>
            {exp.custom ? (
              <input
                className="wizard-input flex1"
                placeholder="Expense name"
                autoFocus
                value={exp.name}
                onChange={e => setExpense(i, "name", e.target.value)}
              />
            ) : (
              <strong className="wizard-expense-name">{exp.name}</strong>
            )}
            <div className="wizard-amount-wrap small">
              <span className="wizard-currency">{currencySign(profile.currency)}</span>
              <input
                className="wizard-input"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                autoFocus={!exp.custom}
                value={exp.amount}
                onChange={e => setExpense(i, "amount", e.target.value)}
              />
            </div>
            <button type="button" className="wizard-expense-remove" aria-label={`Remove ${exp.name || "expense"}`} onClick={() => removeExpense(i)}>×</button>
          </div>
        ))}

        {profile.expenses.length > 0 && (
          <div className="wizard-total-row">
            <span>Monthly total</span>
            <strong>{money(derived.monthlyExpenses, profile.currency)}</strong>
          </div>
        )}

        <button type="button" className="wizard-skip" onClick={next}>Skip for now</button>
      </WizardScreen>
    );
  }

  // ── Step 5 — Balances (seeds accounts + first snapshot = real net worth) ──
  if (step === 5) {
    const goalTargetMeta =
      profile.primaryGoal === "house" ? {
        label: "Home deposit target",
        tip: "How much you need saved for your deposit. Progress tracks your Savings balance automatically as it grows."
      } :
      profile.primaryGoal === "invest" ? {
        label: "Portfolio target",
        tip: "The total value you want your investments to reach. Progress tracks your Investments balance automatically."
      } :
      profile.primaryGoal === "savings" ? {
        label: `Emergency fund target${derived.monthlyExpenses > 0 ? ` (suggested: ${money(Math.round(derived.monthlyExpenses * 3), profile.currency)})` : ""}`,
        tip: "A cash buffer for surprises. Three months of expenses is a common starting point — progress tracks your Savings balance."
      } :
      null;

    return (
      <WizardScreen {...screenProps} step={5} onBack={back} onNext={next} nextLabel="Continue →">
        <h2 className="wizard-question">Let's set up your net worth</h2>
        <p className="wizard-sub">Rough balances are fine — your dashboard comes alive the moment you finish.</p>

        <label className="wizard-label">🏦 Cash &amp; savings
          <div className="wizard-amount-wrap small full">
            <span className="wizard-currency">{currencySign(profile.currency)}</span>
            <input className="wizard-input" type="number" min="0" placeholder="0" value={profile.cashBalance} onChange={e => set("cashBalance", e.target.value)} />
          </div>
        </label>
        <label className="wizard-label">📈 Investments &amp; retirement funds
          <div className="wizard-amount-wrap small full">
            <span className="wizard-currency">{currencySign(profile.currency)}</span>
            <input className="wizard-input" type="number" min="0" placeholder="0" value={profile.investBalance} onChange={e => set("investBalance", e.target.value)} />
          </div>
        </label>
        <label className="wizard-label">💳 Total debt{profile.primaryGoal === "debt" ? <span className="wizard-hint"> · powers your debt-free goal</span> : null}
          <div className="wizard-amount-wrap small full">
            <span className="wizard-currency">{currencySign(profile.currency)}</span>
            <input className="wizard-input" type="number" min="0" placeholder="0" value={profile.debtBalance} onChange={e => set("debtBalance", e.target.value)} />
          </div>
        </label>

        {goalTargetMeta && (
          <label className="wizard-label">🎯 {goalTargetMeta.label} <InfoBadge tip={goalTargetMeta.tip} />
            <div className="wizard-amount-wrap small full">
              <span className="wizard-currency">{currencySign(profile.currency)}</span>
              <input className="wizard-input" type="number" min="0" placeholder="0" value={profile.goalTarget} onChange={e => set("goalTarget", e.target.value)} />
            </div>
          </label>
        )}

        <button type="button" className="wizard-skip" onClick={next}>Skip for now</button>
      </WizardScreen>
    );
  }

  // ── Step 6 — Your financial picture (summary + finish) ──
  const fmt = (n) => money(n, profile.currency);
  const hasAnything = derived.net !== 0 || derived.income > 0 || derived.monthlyExpenses > 0;
  return (
    <WizardScreen {...screenProps} step={6} onBack={back} onNext={finish} nextLabel="Open my dashboard ✓">
      <div className="wizard-hero">
        <div className="wizard-logo">✨</div>
        <h1>{profile.firstName ? `${profile.firstName}, here's` : "Here's"} your financial picture</h1>
        <p>{hasAnything ? "Built from your answers — it's live on your dashboard the second you finish." : "Add balances and cash flow any time — your dashboard is ready when you are."}</p>
      </div>

      <div className="wizard-summary-grid">
        <div className="wizard-summary-card hero">
          <small>Net worth today</small>
          <strong>{fmt(derived.net)}</strong>
          {derived.debts > 0 && <span>{fmt(derived.assets)} assets · {fmt(derived.debts)} debt</span>}
        </div>
        <div className="wizard-summary-card">
          <small>Monthly surplus</small>
          <strong className={derived.surplus >= 0 ? "good" : "bad"}>{derived.income > 0 ? fmt(derived.surplus) : "—"}</strong>
          <span>{derived.income > 0 ? "income minus expenses" : "add income to unlock"}</span>
        </div>
        <div className="wizard-summary-card">
          <small>FIRE number</small>
          <strong>{derived.fireNumber > 0 ? fmt(derived.fireNumber) : "—"}</strong>
          <span>{derived.fireNumber > 0 ? "25× your annual expenses" : "add expenses to unlock"}</span>
        </div>
        <div className="wizard-summary-card">
          <small>In 10 years*</small>
          <strong className="good">{hasAnything ? fmt(derived.projected) : "—"}</strong>
          <span>at 7% growth, current habits</span>
        </div>
      </div>
      {hasAnything && <p className="wizard-footnote">*A projection, not a promise — explore scenarios any time in the Compound calculator.</p>}
    </WizardScreen>
  );
}

export function WizardScreen({ children, step, total, progress, onBack, onNext, nextLabel, nextDisabled }) {
  return (
    <div className="wizard-screen">
      <div className="wizard-progress-bar">
        <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="wizard-dots">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`wizard-dot ${i <= step ? "active" : ""}`} />
        ))}
      </div>
      <div className="wizard-body">
        {children}
      </div>
      <div className="wizard-footer">
        {onBack && (
          <button type="button" className="wizard-back" onClick={onBack}>← Back</button>
        )}
        <button
          type="button"
          className={`wizard-next ${nextDisabled ? "disabled" : ""}`}
          onClick={!nextDisabled ? onNext : undefined}
        >{nextLabel || "Continue →"}</button>
      </div>
    </div>
  );
}

export function OnboardingTips({ state, setState, setTab }) {
  if (state.onboardingDismissed) return null;

  const accountsDone = (state.accounts || []).length >= 2;
  const snapshotsDone = Object.keys(state.monthSnapshots || {}).length >= 2;
  const cashDone = (state.transactions || []).length >= 2;
  const goalsDone = (state.goals || []).filter(g => !g.archived).length >= 1;

  const steps = [
    { done: accountsDone, title:"Add your accounts", detail:"Start with the assets and debts that drive your net worth.", tab:"assets" },
    { done: snapshotsDone, title:"Save two months of balances", detail:"Save this month, then switch the month selector back one and save last month's balances too. Two months unlock your trend chart, goal forecasting, and the full history table — no waiting.", tab:"assets" },
    { done: cashDone, title:"Add cash flow", detail:"Salary, rent, subscriptions, and recurring bills make insights smarter.", tab:"cash" },
    { done: goalsDone, title:"Create one goal", detail:"A single target gives the timeline something meaningful to project.", tab:"goals" }
  ];

  const completeCount = steps.filter(s => s.done).length;
  const snapshotCount = Object.keys(state.monthSnapshots || {}).length;
  const showCelebration = snapshotCount === 1 && !state.firstSnapshotCelebrationDismissed;

  return (
    <>
      {showCelebration && (
        <div className="snapshot-celebration-banner">
          <span>First snapshot saved 🎉 Switch back one month and save last month's balances to unlock trends and forecasting right now.</span>
          <button onClick={() => setState(s => ({ ...s, firstSnapshotCelebrationDismissed: true }))}>×</button>
        </div>
      )}
      <section className="onboarding-tips-card">
        <div className="onboarding-head">
          <div>
            <p>Quick setup</p>
            <h2>Get the best from Grow UP</h2>
          </div>
          <button type="button" onClick={()=>setState(s=>({...s,onboardingDismissed:true}))}>×</button>
        </div>

        <div className="onboarding-progress">
          <i style={{ width:`${(completeCount / steps.length) * 100}%` }}></i>
        </div>

        <div className="onboarding-steps">
          {steps.map(step => (
            <button
              type="button"
              key={step.title}
              className={step.done ? "done" : ""}
              onClick={()=>setTab(step.tab)}
            >
              <span>{step.done ? "✓" : "○"}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
