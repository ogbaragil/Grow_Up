import React, { useState } from "react";
import { Trash2, X } from "lucide-react";
import { PRO_LIMITS } from "../config";
import { goalColorForType, goalIconForType } from "../lib/goals";
import { money } from "../lib/money";
import { monthKey } from "../lib/dates";
import { ACCOUNT_SUBTYPE_OPTIONS, inferAccountSubtype, safeId } from "../state/normalize";

export const ACCOUNT_PRESETS = {
  asset: [
    { name:"Savings Account",    icon:"🏦", subtype:"savings" },
    { name:"Everyday Account",   icon:"💳", subtype:"savings" },
    { name:"Investment Account", icon:"📈", subtype:"investment" },
    { name:"Retirement fund",    icon:"🏛️", subtype:"super" },
    { name:"Property",           icon:"🏠", subtype:"property" },
    { name:"Emergency Fund",     icon:"🛡️", subtype:"emergency" },
    { name:"Crypto",             icon:"₿",  subtype:"investment" },
    { name:"Term Deposit",       icon:"🔒", subtype:"savings" },
  ],
  debt: [
    { name:"Credit Card",        icon:"💳", subtype:"credit_card" },
    { name:"Home Loan",          icon:"🏠", subtype:"loan" },
    { name:"Car Loan",           icon:"🚗", subtype:"loan" },
    { name:"Personal Loan",      icon:"📋", subtype:"loan" },
    { name:"Student Loan",       icon:"🎓", subtype:"loan" },
    { name:"Buy Now Pay Later",  icon:"🛍️", subtype:"credit_card" },
    { name:"Tax Debt",           icon:"🏛️", subtype:"other" },
    { name:"Medical Debt",       icon:"🏥", subtype:"other" },
  ]
};

export const TRANSACTION_PRESETS = {
  income: [
    { name:"Salary",           icon:"💵", frequency:"monthly" },
    { name:"Freelance",        icon:"💻", frequency:"monthly" },
    { name:"Rental Income",    icon:"🏠", frequency:"monthly" },
    { name:"Dividends",        icon:"📈", frequency:"quarterly" },
    { name:"Side Business",    icon:"🏪", frequency:"monthly" },
    { name:"Government Benefit",icon:"🏛️",frequency:"fortnightly" },
    { name:"Child Support",    icon:"👨‍👩‍👧", frequency:"monthly" },
    { name:"Interest",         icon:"🏦", frequency:"monthly" },
  ],
  expense: [
    { name:"Rent / Mortgage",  icon:"🏠", frequency:"monthly" },
    { name:"Groceries",        icon:"🛒", frequency:"weekly" },
    { name:"Car Insurance",    icon:"🚗", frequency:"monthly" },
    { name:"Health Insurance", icon:"🏥", frequency:"monthly" },
    { name:"Phone Plan",       icon:"📱", frequency:"monthly" },
    { name:"Internet",         icon:"🌐", frequency:"monthly" },
    { name:"Electricity",      icon:"⚡", frequency:"monthly" },
    { name:"Streaming",        icon:"📺", frequency:"monthly" },
    { name:"Gym",              icon:"🏋️", frequency:"monthly" },
    { name:"Fuel",             icon:"⛽", frequency:"weekly" },
    { name:"Subscriptions",    icon:"🔄", frequency:"monthly" },
    { name:"Childcare",        icon:"👶", frequency:"weekly" },
  ]
};

export const GOAL_PRESETS = [
  { name:"Pay off credit card",     icon:"💳", goalType:"debtPayoff",    color:"red" },
  { name:"Buy a home",              icon:"🏠", goalType:"accountGrowth", color:"green" },
  { name:"Emergency fund",          icon:"🛡️", goalType:"savings",       color:"blue" },
  { name:"Reach $100k",             icon:"💎", goalType:"netWorth",      color:"green" },
  { name:"Pay off car loan",        icon:"🚗", goalType:"debtPayoff",    color:"red" },
  { name:"Investment portfolio",    icon:"📈", goalType:"accountGrowth", color:"purple" },
  { name:"Holiday fund",            icon:"✈️", goalType:"savings",       color:"blue" },
  { name:"Financial independence",  icon:"🔥", goalType:"fire",          color:"gold" },
];

export const COMMON_EMOJIS = [
  "💵","💳","🏦","🏠","🚗","📈","🏛️","🛡️","💻","🎓","🏥","📱",
  "⚡","🌐","🛒","⛽","📺","🏋️","✈️","🔒","₿","🏪","👶","🔄",
  "💎","🚀","🎯","⚡","🌱","🧾","📋","🎁","🏆","💼","🏗️","🛍️",
];

export function QuickAddPicker({ presets, onSelect }) {
  return (
    <div className="quickadd-grid">
      {presets.map(p => (
        <button key={p.name} type="button" className="quickadd-chip" onClick={() => onSelect(p)}>
          <span>{p.icon}</span>
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  );
}

export function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="emoji-picker-wrap">
      <div className="emoji-input-row">
        <input
          className="emoji-text-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Emoji or text"
          maxLength={4}
        />
        <button type="button" className="emoji-grid-toggle" onClick={() => setOpen(v => !v)}>
          {open ? "Close" : "Pick"}
        </button>
      </div>
      {open && (
        <div className="emoji-grid">
          {COMMON_EMOJIS.map(e => (
            <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorModal({ editor, setEditor, state, setState, autoSaveMonthSnapshot, totals, isPro, showUpgrade }) {
  const item = editor.item || {};
  const isNew = !item.id;
  const [presetPicked, setPresetPicked] = useState(!isNew);

  // Free tier limit check — block before showing form for new items
  if (isNew && !isPro) {
    if (editor.type === "account" && (state.accounts || []).length >= PRO_LIMITS.accounts) {
      showUpgrade?.("accounts");
      setEditor(null);
      return null;
    }
    if (editor.type === "goal" && (state.goals || []).filter(g => !g.archived).length >= PRO_LIMITS.goals) {
      showUpgrade?.("goals");
      setEditor(null);
      return null;
    }
    if (editor.type === "transaction" && (state.transactions || []).length >= PRO_LIMITS.transactions) {
      showUpgrade?.("transactions");
      setEditor(null);
      return null;
    }
  } // skip preset screen when editing
  const [form, setForm] = useState({
    name:item.name || "",
    icon:item.icon || "",
    kind:item.kind || editor.defaultKind || "asset",
    subtype:item.subtype || inferAccountSubtype(item),
    balance:item.balance || "",
    previous:item.previous || "",
    type:item.type || "expense",
    amount:item.amount || "",
    date:item.date ? item.date.slice(0,10) : new Date().toISOString().slice(0,10),
    recurring:item.recurring || false,
    frequency:item.frequency || (item.recurring ? "monthly" : "oneOff"),
    endsOn:item.endsOn || "",
    goalType:item.goalType || "netWorth",
    accountId:item.accountId || "",
    account:item.account || "",
    current:item.current || "",
    start:item.start || item.startAmount || "",
    target:item.target ?? "",
    deadline:item.deadline || "",
    color:item.color || "green"
  });

  const change = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const applyPreset = (p) => {
    const expenseBased = p.goalType === "fire" && totals
      ? Math.round(Number(totals.expenses || 0) * 12 * 25)
      : 0;
    setForm(f => ({
      ...f,
      name: p.name || f.name,
      icon: p.icon || f.icon,
      ...(p.subtype   && { subtype:   p.subtype }),
      ...(p.frequency && { frequency: p.frequency, recurring: p.frequency !== "oneOff" }),
      ...(p.goalType  && { goalType:  p.goalType }),
      ...(p.color     && { color:     p.color }),
      ...(expenseBased > 0 && { target: expenseBased }),
    }));
    setPresetPicked(true);
  };

  const save = async () => {
    let nextStateForAutoSave = null;
    if (editor.type === "account") {
      const acct = {
        id:item.id || safeId(),
        name:form.name || "Account",
        icon:form.icon || (form.kind === "debt" ? "💳" : "💼"),
        kind:form.kind,
        subtype:form.subtype || "other",
        balance:Number(form.balance || 0),
        previous:Number(item.previous || 0)
      };
      const isNew = !item.id;
      const accounts = item.id ? state.accounts.map(a => a.id === item.id ? { ...a, ...acct } : a) : [...state.accounts, acct];

      // For new accounts, inject into PAST snapshots with balance 0 so users
      // can navigate back and fill in historical balances. The current (and
      // any future) month keeps the balance the user just entered — otherwise
      // the new balance is immediately overwritten by the zero placeholder.
      // For edits, only update snapshots that already contain that account.
      const nowKey = monthKey();
      let monthSnapshots = { ...(state.monthSnapshots || {}) };
      Object.keys(monthSnapshots).forEach(key => {
        const snap = monthSnapshots[key];
        const snapAccounts = snap.accounts || [];
        const alreadyExists = snapAccounts.some(a => a.id === acct.id);

        let updatedAccounts;
        if (isNew && !alreadyExists) {
          const injectBalance = key.localeCompare(nowKey) >= 0 ? acct.balance : 0;
          updatedAccounts = [...snapAccounts, { ...acct, balance: injectBalance, previous: 0 }];
        } else if (!isNew && alreadyExists) {
          // Propagate metadata (name, icon, type) everywhere, but only update
          // the balance from the current month forward — past months keep
          // their saved history.
          const isPast = key.localeCompare(nowKey) < 0;
          updatedAccounts = snapAccounts.map(a =>
            a.id === acct.id
              ? { ...a, ...acct, ...(isPast ? { balance: a.balance, previous: a.previous } : {}) }
              : a
          );
        } else {
          return; // nothing to change for this snapshot
        }

        const assets = updatedAccounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
        const debts  = updatedAccounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);
        monthSnapshots[key] = {
          ...snap,
          accounts: updatedAccounts,
          assets,
          debts,
          net: assets - debts,
          updatedAt: snap.updatedAt // preserve original timestamp — this is a structural migration, not an edit
        };
      });

      nextStateForAutoSave = { ...state, accounts, monthSnapshots };
      setState(nextStateForAutoSave);
    }

    if (editor.type === "transaction") {
      const frequency = form.frequency || "oneOff";
      const tx = {
        id:item.id || safeId(),
        type:form.type,
        name:form.name || "Transaction",
        icon:form.icon || (form.type === "income" ? "💵" : "💳"),
        amount:Number(form.amount || 0),
        date:new Date(form.date).toISOString(),
        frequency,
        recurring:frequency !== "oneOff",
        endsOn: form.endsOn || null
      };
      setState(s => ({ ...s, transactions:item.id ? s.transactions.map(t => t.id === item.id ? tx : t) : [...s.transactions, tx] }));
    }

    if (editor.type === "goal") {
      const linkedAccount = state.accounts.find(a => a.id === form.accountId);
      const goal = {
        id:item.id || safeId(),
        name:form.name || "Goal",
        icon:form.icon || goalIconForType(form.goalType),
        goalType:form.goalType,
        accountId:form.accountId || "",
        account:linkedAccount?.name || form.account || (form.goalType === "netWorth" ? "Net Worth" : "Manual"),
        color:form.color || goalColorForType(form.goalType),
        current:Number(form.current || 0),
        start:Number(form.start || 0),
        target:Number(form.target || 0),
        deadline:form.deadline,
        open:item.open ?? true
      };
      setState(s => {
        nextStateForAutoSave = {
          ...s,
          goals:item.id
            ? (s.goals || []).map(g => g.id === item.id ? { ...g, ...goal, archived:g.archived, archivedAt:g.archivedAt } : g)
            : [...(s.goals || []), goal]
        };
        return nextStateForAutoSave;
      });
    }

    if (editor.type === "account" && autoSaveMonthSnapshot && nextStateForAutoSave) {
      await autoSaveMonthSnapshot(nextStateForAutoSave);
    }

    setEditor(null);
  };

  // ── Preset picker screen ───────────────────────────────────────────────────
  if (!presetPicked) {
    const presets =
      editor.type === "account"     ? ACCOUNT_PRESETS[form.kind === "debt" ? "debt" : "asset"] :
      editor.type === "transaction" ? TRANSACTION_PRESETS[form.type === "income" ? "income" : "expense"] :
      editor.type === "goal"        ? GOAL_PRESETS : [];
    return (
      <div className="modal-backdrop">
        <div className="editor-modal">
          <div className="modal-head">
            <h2>Add {editor.type}</h2>
            <button onClick={() => setEditor(null)}><X/></button>
          </div>
          {editor.type === "account" && (
            <div className="preset-kind-toggle">
              <button type="button" className={form.kind === "asset" ? "active" : ""} onClick={() => change("kind","asset")}>Asset</button>
              <button type="button" className={form.kind === "debt"  ? "active" : ""} onClick={() => change("kind","debt")}>Debt</button>
            </div>
          )}
          {editor.type === "transaction" && (
            <div className="preset-kind-toggle">
              <button type="button" className={form.type === "income"  ? "active" : ""} onClick={() => change("type","income")}>Income</button>
              <button type="button" className={form.type === "expense" ? "active" : ""} onClick={() => change("type","expense")}>Expense</button>
            </div>
          )}
          <p className="quickadd-label">Choose a common one to get started:</p>
          <QuickAddPicker presets={presets} onSelect={applyPreset} />
          <button type="button" className="quickadd-custom" onClick={() => setPresetPicked(true)}>
            + Enter custom name instead
          </button>
        </div>
      </div>
    );
  }

  // ── Detail form ────────────────────────────────────────────────────────────
  return (
    <div className="modal-backdrop">
      <div className="editor-modal">
        <div className="modal-head"><h2>{item.id ? "Edit" : "Add"} {editor.type}</h2><button onClick={()=>setEditor(null)}><X/></button></div>
        {isNew && (
          <button type="button" className="quickadd-back" onClick={() => setPresetPicked(false)}>
            ← Back to suggestions
          </button>
        )}
        <label>Name<input value={form.name} onChange={e=>change("name", e.target.value)} /></label>
        <label>Icon / Emoji<EmojiPicker value={form.icon} onChange={v => change("icon", v)} /></label>

        {editor.type === "account" && <>
          <label>Kind<select value={form.kind} onChange={e=>change("kind", e.target.value)}><option value="asset">Asset</option><option value="debt">Debt</option></select></label>
          <label>Subtype<select value={form.subtype} onChange={e=>change("subtype", e.target.value)}>{ACCOUNT_SUBTYPE_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><small className="field-caption">Helps with goal matching and insights.</small></label>
          <label>Current balance<input type="number" value={form.balance} onChange={e=>change("balance", e.target.value)} /></label>
        </>}

        {editor.type === "transaction" && <>
          <label>Type<select value={form.type} onChange={e=>change("type", e.target.value)}><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label>Amount<input type="number" value={form.amount} onChange={e=>change("amount", e.target.value)} /></label>
          <label>Start / Next Date<input type="date" value={form.date} onChange={e=>change("date", e.target.value)} /></label>
          <label>Frequency
            <select value={form.frequency} onChange={e=>{
              change("frequency", e.target.value);
              change("recurring", e.target.value !== "oneOff");
            }}>
              <option value="oneOff">One-off</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          {form.frequency !== "oneOff" && (
            <label>Ends on (optional)
              <input type="date" value={form.endsOn || ""} onChange={e => change("endsOn", e.target.value)} />
              <small className="field-caption">Leave blank for ongoing</small>
            </label>
          )}
        </>}

        {editor.type === "goal" && <>
          <label>Goal Type
            <select value={form.goalType} onChange={e=>change("goalType", e.target.value)}>
              <option value="netWorth">Net Worth Goal</option>
              <option value="accountGrowth">Account Growth Goal</option>
              <option value="debtPayoff">Debt Payoff Goal</option>
              <option value="savings">Savings Goal</option>
              <option value="fire" disabled={!isPro}>FIRE / Financial Independence{!isPro ? " (Pro)" : ""}</option>
            </select>
          </label>
          {form.goalType === "netWorth" ? (
            <label>Metric<input value="Net Worth" disabled /></label>
          ) : form.goalType === "fire" ? (
            <>
              <label>
                Your FIRE number
                <input
                  type="number"
                  value={form.target}
                  onChange={e => change("target", e.target.value)}
                  placeholder="e.g. 1500000"
                />
                {(() => {
                  const expenseBased = Math.round(Number(totals?.expenses || 0) * 12 * 25);
                  return expenseBased > 0
                    ? <small className="field-caption">Suggested from your expenses: {money(expenseBased)} (25× annual spend). Edit to override.</small>
                    : <small className="field-caption">Enter your target net worth to reach financial independence. Add expenses in Cash Flow for an automatic suggestion.</small>;
                })()}
              </label>
            </>
          ) : (
            <label>Linked Account
              <select value={form.accountId} onChange={e=>change("accountId", e.target.value)}>
                <option value="">Manual / No linked account</option>
                {state.accounts
                  .filter(a => form.goalType === "debtPayoff" ? a.kind === "debt" : a.kind === "asset")
                  .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
          {form.goalType === "debtPayoff" ? (
            <>
              <label>Starting Debt<input type="number" value={form.start} onChange={e=>change("start", e.target.value)} placeholder="Original debt amount" /></label>
              <label>Current Debt Override<input type="number" value={form.current} onChange={e=>change("current", e.target.value)} placeholder="Only used if no account linked" /></label>
            </>
          ) : form.goalType === "fire" || form.goalType === "netWorth" ? null : (
            <>
              <label>Current Override<input type="number" value={form.current} onChange={e=>change("current", e.target.value)} placeholder="Only used if no account linked" /></label>
              <label>Target<input type="number" value={form.target} onChange={e=>change("target", e.target.value)} /></label>
            </>
          )}
          <label>Deadline<input type="date" value={form.deadline} onChange={e=>change("deadline", e.target.value)} /></label>
          <label>Color<select value={form.color} onChange={e=>change("color", e.target.value)}><option value="green">Green</option><option value="purple">Purple</option><option value="red">Red</option><option value="blue">Blue</option><option value="gold">Gold</option></select></label>
        </>}

        <button className="primary full" onClick={save}>Save</button>
        {item.id && editor.type === "transaction" && (
          <button
            className="danger-full"
            onClick={() => {
              setState(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== item.id) }));
              setEditor(null);
            }}
          >
            <Trash2 size={16}/> Delete transaction
          </button>
        )}
      </div>
    </div>
  );
}

