import React, { useState } from "react";
import { safeId } from "../state/normalize";

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

export function OnboardingWizard({ state, setState, onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    age: state.profile?.age || "",
    retirementAge: state.profile?.retirementAge || 65,
    income: state.profile?.income || "",
    currency: state.currency || "AUD",
    expenses: state.profile?.expenses?.length ? state.profile.expenses : [
      { name: "", icon: "🏠", amount: "" },
      { name: "", icon: "🛒", amount: "" },
      { name: "", icon: "📱", amount: "" },
    ],
    primaryGoal: state.profile?.primaryGoal || null,
    roughDebt: state.profile?.roughDebt || "",
  });

  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));
  const setExpense = (i, k, v) => setProfile(p => {
    const expenses = [...p.expenses];
    expenses[i] = { ...expenses[i], [k]: v };
    return { ...p, expenses };
  });

  const TOTAL_STEPS = profile.primaryGoal === "debt" ? 6 : 5;

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const finish = () => {
    // Build starter transactions from profile expenses
    const starterTransactions = [
      ...(profile.income > 0 ? [{
        id: safeId(), type: "income", name: "Salary", icon: "💵",
        amount: Number(profile.income), frequency: "monthly", recurring: true,
        date: new Date().toISOString(), endsOn: null
      }] : []),
      ...profile.expenses
        .filter(e => e.name && Number(e.amount) > 0)
        .map(e => ({
          id: safeId(), type: "expense", name: e.name, icon: e.icon || "💳",
          amount: Number(e.amount), frequency: "monthly", recurring: true,
          date: new Date().toISOString(), endsOn: null
        }))
    ];

    // Build starter goal from primaryGoal
    const starterGoals = [];
    if (profile.primaryGoal === "fire") {
      const expenses = profile.expenses.reduce((s,e) => s + Number(e.amount||0), 0);
      const fireTarget = expenses > 0 ? Math.round(expenses * 12 * 25) : 0;
      starterGoals.push({
        id: safeId(), name: "Financial Independence", icon: "🔥",
        goalType: "fire", color: "gold", target: fireTarget,
        current: "", start: "", accountId: "", account: "", deadline: "",
        open: false, archived: false
      });
    } else if (profile.primaryGoal === "debt" && Number(profile.roughDebt) > 0) {
      starterGoals.push({
        id: safeId(), name: "Pay off debt", icon: "⚡",
        goalType: "debtPayoff", color: "red",
        start: Number(profile.roughDebt), current: Number(profile.roughDebt),
        target: 0, accountId: "", account: "", deadline: "",
        open: false, archived: false
      });
    } else if (profile.primaryGoal === "house") {
      starterGoals.push({
        id: safeId(), name: "Home deposit", icon: "🏠",
        goalType: "savings", color: "blue", target: "",
        current: "", start: "", accountId: "", account: "", deadline: "",
        open: false, archived: false
      });
    } else if (profile.primaryGoal === "savings") {
      const expenses = profile.expenses.reduce((s,e) => s + Number(e.amount||0), 0);
      starterGoals.push({
        id: safeId(), name: "Emergency fund", icon: "🛡️",
        goalType: "savings", color: "blue",
        target: expenses > 0 ? Math.round(expenses * 3) : "",
        current: "", start: "", accountId: "", account: "", deadline: "",
        open: false, archived: false
      });
    } else if (profile.primaryGoal === "invest") {
      starterGoals.push({
        id: safeId(), name: "Investment portfolio", icon: "📈",
        goalType: "accountGrowth", color: "green", target: "",
        current: "", start: "", accountId: "", account: "", deadline: "",
        open: false, archived: false
      });
    }

    setState(s => ({
      ...s,
      firstName: profile.firstName || s.firstName,
      currency: profile.currency || s.currency || "AUD",
      profileComplete: true,
      profile: {
        age: Number(profile.age) || null,
        retirementAge: Number(profile.retirementAge) || 65,
        income: Number(profile.income) || null,
        expenses: profile.expenses.filter(e => e.name && Number(e.amount) > 0),
        primaryGoal: profile.primaryGoal,
        roughDebt: Number(profile.roughDebt) || null,
      },
      transactions: s.transactions.length ? s.transactions : starterTransactions,
      goals: s.goals.length ? s.goals : starterGoals,
    }));
    onComplete();
  };

  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  // Step 0 — Welcome + name + age
  if (step === 0) return (
    <WizardScreen step={0} total={TOTAL_STEPS} progress={progressPct} onBack={null} onNext={next} nextLabel="Let's go →">
      <div className="wizard-hero">
        <div className="wizard-logo">🌱</div>
        <h1>Welcome to Grow UP</h1>
        <p>Three quick questions and your personalised financial picture is ready.</p>
      </div>
      <label className="wizard-label">What should we call you?
        <input className="wizard-input" placeholder="First name" value={profile.firstName || ""} onChange={e => set("firstName", e.target.value)} />
      </label>
      <div className="wizard-row">
        <label className="wizard-label">Your age
          <input className="wizard-input" type="number" placeholder="e.g. 34" value={profile.age} onChange={e => set("age", e.target.value)} min="18" max="99" />
        </label>
        <label className="wizard-label">Target retirement age
          <input className="wizard-input" type="number" placeholder="e.g. 65" value={profile.retirementAge} onChange={e => set("retirementAge", e.target.value)} min="40" max="99" />
        </label>
      </div>
    </WizardScreen>
  );

  // Step 1 — Primary goal
  // Step 1 — Currency
  if (step === 1) {
    const CURRENCIES = [
      ["AUD","🇦🇺","Australian Dollar"],["USD","🇺🇸","US Dollar"],
      ["GBP","🇬🇧","British Pound"],["EUR","🇪🇺","Euro"],
      ["NZD","🇳🇿","NZ Dollar"],["CAD","🇨🇦","Canadian Dollar"],
      ["SGD","🇸🇬","Singapore Dollar"],["INR","🇮🇳","Indian Rupee"],
    ];
    return (
      <WizardScreen step={1} total={TOTAL_STEPS} progress={progressPct} onBack={back} onNext={next} nextLabel="Continue →">
        <h2 className="wizard-question">What currency do you use?</h2>
        <p className="wizard-sub">All your balances will display in this currency.</p>
        <div className="wizard-currency-grid">
          {CURRENCIES.map(([code, flag, name]) => (
            <button key={code} type="button"
              className={"wizard-currency-option" + (profile.currency === code ? " selected" : "")}
              onClick={() => set("currency", code)}>
              <span className="wizard-currency-flag">{flag}</span>
              <strong>{code}</strong>
              <small>{name}</small>
              {profile.currency === code && <span className="wizard-check">✓</span>}
            </button>
          ))}
        </div>
      </WizardScreen>
    );
  }

  // Step 2 — Primary goal
  if (step === 2) return (
    <WizardScreen step={2} total={TOTAL_STEPS} progress={progressPct} onBack={back} onNext={next} nextLabel="Continue →" nextDisabled={!profile.primaryGoal}>
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

  // Step 2 — Monthly income
  // Step 3 — Income
  if (step === 3) return (
    <WizardScreen step={3} total={TOTAL_STEPS} progress={progressPct} onBack={back} onNext={next} nextLabel="Continue →">
      <h2 className="wizard-question">What's your monthly take-home income?</h2>
      <p className="wizard-sub">After tax. We'll pre-fill Cash Flow with this — you can refine it later.</p>
      <div className="wizard-amount-wrap">
        <span className="wizard-currency">$</span>
        <input
          className="wizard-input large"
          type="number"
          placeholder="e.g. 5000"
          value={profile.income}
          onChange={e => set("income", e.target.value)}
        />
        <span className="wizard-per">/mo</span>
      </div>
      <button type="button" className="wizard-skip" onClick={next}>Skip for now</button>
    </WizardScreen>
  );

  // Step 3 — Top 3 expenses
  // Step 4 — Expenses
  if (step === 4) return (
    <WizardScreen step={4} total={TOTAL_STEPS} progress={progressPct} onBack={back} onNext={profile.primaryGoal === "debt" ? next : finish} nextLabel={profile.primaryGoal === "debt" ? "Continue →" : "Finish setup ✓"}>
      <h2 className="wizard-question">What are your biggest monthly expenses?</h2>
      <p className="wizard-sub">Just the top 3 — roughly is fine. These unlock your FIRE number and spending chart.</p>

      {profile.expenses.map((exp, i) => (
        <div key={i} className="wizard-expense-row">
          <button
            type="button"
            className="wizard-expense-icon"
            onClick={() => {
              const presets = COMMON_EXPENSE_PRESETS;
              const next = presets[i % presets.length];
              setExpense(i, "icon", next.icon);
              if (!exp.name) setExpense(i, "name", next.name);
            }}
            title="Tap to cycle icon"
          >{exp.icon || "💳"}</button>
          <input
            className="wizard-input flex1"
            placeholder={["Rent / Mortgage", "Groceries", "Other expense"][i]}
            value={exp.name}
            onChange={e => setExpense(i, "name", e.target.value)}
          />
          <div className="wizard-amount-wrap small">
            <span className="wizard-currency">$</span>
            <input
              className="wizard-input"
              type="number"
              placeholder="0"
              value={exp.amount}
              onChange={e => setExpense(i, "amount", e.target.value)}
            />
          </div>
        </div>
      ))}

      <div className="wizard-expense-presets">
        {COMMON_EXPENSE_PRESETS.map(p => (
          <button
            key={p.name}
            type="button"
            className="quickadd-chip small"
            onClick={() => {
              const emptyIdx = profile.expenses.findIndex(e => !e.name);
              const idx = emptyIdx >= 0 ? emptyIdx : 0;
              setExpense(idx, "name", p.name);
              setExpense(idx, "icon", p.icon);
            }}
          >{p.icon} {p.name}</button>
        ))}
      </div>

      <button type="button" className="wizard-skip" onClick={profile.primaryGoal === "debt" ? next : finish}>Skip for now</button>
    </WizardScreen>
  );

  // Step 4 — Debt amount (only if primaryGoal === "debt")
  // Step 5 — Debt
  if (step === 5) return (
    <WizardScreen step={5} total={TOTAL_STEPS} progress={progressPct} onBack={back} onNext={finish} nextLabel="Finish setup ✓">
      <h2 className="wizard-question">Roughly how much debt do you have?</h2>
      <p className="wizard-sub">A ballpark is fine — this powers your debt-free timeline and goal tracking.</p>
      <div className="wizard-amount-wrap">
        <span className="wizard-currency">$</span>
        <input
          className="wizard-input large"
          type="number"
          placeholder="e.g. 12000"
          value={profile.roughDebt}
          onChange={e => set("roughDebt", e.target.value)}
        />
      </div>
      <button type="button" className="wizard-skip" onClick={finish}>Skip for now</button>
    </WizardScreen>
  );

  return null;
}

export function WizardScreen({ children, step, total, progress, onBack, onNext, nextLabel, nextDisabled }) {
  return (
    <div className="wizard-screen">
      <div className="wizard-progress-bar">
        <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="wizard-dots">
        {Array.from({ length: total + 1 }).map((_, i) => (
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
    { done: snapshotsDone, title:"Update two months", detail:"Save this month's balances, then come back next month and save again. Two snapshots unlock your trend chart, goal forecasting, and the full history table.", tab:"assets" },
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
          <span>First snapshot saved 🎉 Come back next month and save again to unlock trends and forecasting.</span>
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



