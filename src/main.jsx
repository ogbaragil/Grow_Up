
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home, CreditCard, Repeat2, Target, Menu, Plus, Pencil, Trash2, Archive,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sun, Moon, TrendingUp,
  X, Save, DownloadCloud, RotateCcw, SlidersHorizontal
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "./supabaseClient";
import "./styles.css";

const STORAGE_KEY = "growup_clean_state_v2";

const money = (n) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0
}).format(Number(n || 0));

const monthLabel = () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

const EMPTY_STATE = {
  firstName: "Gil",
  theme: "light",
  mode: "Real Mode",
  month: monthLabel(),
  accounts: [],
  transactions: [],
  goals: [],
  monthlyNetWorth: []
};

function safeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function useGrowState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
    } catch {
      return EMPTY_STATE;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return [state, setState];
}

function App() {
  const [state, setState] = useGrowState();
  const [tab, setTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }, [state.theme]);

  const totals = useMemo(() => {
    const assets = state.accounts.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance || 0),0);
    const debts = state.accounts.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance || 0),0);
    const prevAssets = state.accounts.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.previous || 0),0);
    const prevDebts = state.accounts.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.previous || 0),0);
    const income = state.transactions.filter(t => t.type === "income" && t.recurring).reduce((s,t)=>s+Number(t.amount || 0),0);
    const expenses = state.transactions.filter(t => t.type === "expense" && t.recurring).reduce((s,t)=>s+Number(t.amount || 0),0);
    return { assets, debts, net: assets - debts, prevAssets, prevDebts, prevNet: prevAssets - prevDebts, income, expenses };
  }, [state]);

  const update = (patch) => setState(s => ({ ...s, ...patch }));

  const saveSnapshot = async () => {
    if (!supabase) return alert("Supabase env vars are missing.");
    const { error } = await supabase.from("growup_snapshots").insert({ user_id: "gil", app_state: state });
    if (error) return alert(`Supabase sync failed: ${error.message}`);
    alert("Snapshot saved to Supabase.");
  };

  const restoreSnapshot = async () => {
    if (!supabase) return alert("Supabase env vars are missing.");
    if (!confirm("Restore the latest Supabase snapshot? This replaces local app data.")) return;
    const { data, error } = await supabase.from("growup_snapshots")
      .select("app_state, state, created_at")
      .order("created_at", { ascending:false })
      .limit(1);
    if (error) return alert(`Restore failed: ${error.message}`);
    const restored = data?.[0]?.app_state || data?.[0]?.state;
    if (!restored) return alert("No snapshot found.");
    setState({ ...EMPTY_STATE, ...restored });
    alert("Latest snapshot restored.");
  };

  const common = { state, setState, totals, setEditor };

  return (
    <div className="app-shell">
      <main className="phone">
{tab === "overview" && <Overview {...common} setTab={setTab} />}
        {tab === "assets" && <AssetsDebts {...common} />}
        {tab === "cash" && <CashFlow {...common} />}
        {tab === "goals" && <Goals {...common} />}
        {tab === "settings" && <Settings state={state} update={update} saveSnapshot={saveSnapshot} restoreSnapshot={restoreSnapshot} />}

        <BottomNav tab={tab} setTab={setTab} />
      </main>

      {menuOpen && (
        <MenuSheet
          state={state}
          setMenuOpen={setMenuOpen}
          setTab={setTab}
          update={update}
          saveSnapshot={saveSnapshot}
          restoreSnapshot={restoreSnapshot}
        />
      )}

      {editor && <EditorModal editor={editor} setEditor={setEditor} state={state} setState={setState} />}
    </div>
  );
}

function ScreenTitle({ title, sub }) {
  return (
    <section className="page-header">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <button className="mini-menu-btn">
        <Menu size={20}/>
      </button>
    </section>
  );
}

function EmptyState({ title, text, action, onClick }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button className="primary" onClick={onClick}><Plus size={18}/>{action}</button>}
    </div>
  );
}

function Overview({ state, totals, setEditor, setTab }) {
  const completedGoals = state.goals.filter(g => goalPct(g) >= 100).length;
  const upcoming = upcomingTransactions(state.transactions, 7);

  const chartData = state.monthlyNetWorth.length
    ? state.monthlyNetWorth
    : [{ m:"Now", net: totals.net }];

  return (
    <div className="screen">
      <ScreenTitle title={`Welcome, ${state.firstName}`} sub={`Here's your Snapshot for ${state.month}`} />
      <span className="mode-pill">{state.mode}</span>

      <div className="kpi-grid">
        <Kpi title="Total Assets" value={money(totals.assets)} sub={`${signedMoney(totals.assets - totals.prevAssets)} vs last month`} icon="💼" dot="green" />
        <Kpi title="Total Debts" value={money(totals.debts)} sub={`${signedMoney(totals.debts - totals.prevDebts)} vs last month`} icon="💳" dot="red" />
        <Kpi title="Net Worth" value={money(totals.net)} sub={`${signedMoney(totals.net - totals.prevNet)} vs last month`} icon="$" dot="blue" />
        <Kpi title="Goals" value={`${completedGoals} / ${state.goals.length}`} sub="completed" icon="🎯" dot="purple" />
      </div>

      {state.accounts.length === 0 && state.goals.length === 0 && state.transactions.length === 0 && (
        <EmptyState
          title="Start building your snapshot"
          text="Add your first account, goal, or cash flow item. Nothing is hard-coded now."
          action="Add account"
          onClick={()=>setEditor({ type:"account" })}
        />
      )}

      <Card>
        <div className="card-head">
          <span className="green-square"><TrendingUp size={22}/></span>
          <div><h2>Net Worth Trend</h2><p>12-month overview</p></div>
          <ChevronDown className="muted-icon"/>
        </div>
        <div className="trend-box">
          <div><span>Current Net Worth</span><strong>{money(totals.net)}</strong></div>
          <div><span>Growth</span><strong className="success">{state.monthlyNetWorth.length ? "+0%" : "—"}</strong></div>
        </div>
        <div className="chart-holder">
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={chartData}>
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
          <div><span>Money In (monthly)</span><strong>{money(totals.income)}</strong></div>
          <div><span>Money Out (monthly)</span><strong>{money(totals.expenses)}</strong></div>
        </div>
        <div className="upcoming-head"><h3>Upcoming <span>· Next 7 days</span></h3><span>{upcoming.length} upcoming</span></div>
        {upcoming.length ? upcoming.slice(0,4).map(t => <CompactTxn key={t.id} t={t}/>) : <p className="muted">No upcoming transactions yet.</p>}
      </Card>
    </div>
  );
}

function Kpi({ title, value, sub, icon, dot }) {
  return (
    <div className="kpi">
      <div className={`emoji-badge ${dot}`}>{icon}</div>
      <span className={`dot ${dot}`}></span>
      <p>{title}</p>
      <h2>{value}</h2>
      <small>{sub}</small>
    </div>
  );
}

function AssetsDebts({ state, setState, totals, setEditor }) {
  const assets = state.accounts.filter(a => a.kind === "asset");
  const debts = state.accounts.filter(a => a.kind === "debt");

  const updateBalance = (id, value) => {
    setState(s => ({
      ...s,
      accounts: s.accounts.map(a => a.id === id ? { ...a, balance:Number(value || 0) } : a)
    }));
  };

  return (
    <div className="screen">
      <ScreenTitle title="Assets & Debts" sub="Update balances month-to-month. Changes feed your Overview." />
      <div className="month-switch"><ChevronLeft/><strong>{state.month}</strong><ChevronRight/></div>

      {state.accounts.length === 0 ? (
        <EmptyState title="No accounts yet" text="Add assets and debts to calculate net worth." action="Add account" onClick={()=>setEditor({ type:"account" })}/>
      ) : (
        <>
          <AccountGroup title={`Assets (${assets.length})`} sub="Enter this month's values; see last month + change." accounts={assets} updateBalance={updateBalance} />
          <AccountGroup title={`Debts (${debts.length})`} sub="Enter this month's amounts owed; see last month + change." accounts={debts} updateBalance={updateBalance} />
          <Card className="summary-list">
            <div><span>Assets (this month)</span><strong>{money(totals.assets)}</strong></div>
            <div><span>Debts (this month)</span><strong>{money(totals.debts)}</strong></div>
            <div className="bold"><span>Net Worth</span><strong>{money(totals.net)}</strong></div>
          </Card>
        </>
      )}

      <button className="fab" onClick={()=>setEditor({ type:"account" })}><Plus size={34}/></button>
    </div>
  );
}

function AccountGroup({ title, sub, accounts, updateBalance }) {
  return (
    <Card className="account-group">
      <h2>{title}</h2>
      <p>{sub}</p>
      {accounts.map(a => {
        const delta = Number(a.balance || 0) - Number(a.previous || 0);
        return (
          <div className="account-row" key={a.id}>
            <div className={`round-icon ${a.kind === "debt" ? "debt" : "asset"}`}>{a.icon || (a.kind==="debt" ? "💳" : "💼")}</div>
            <div className="row-main">
              <strong>{a.name}</strong>
              <span>Prev: {money(a.previous)} {delta < 0 ? "↓" : delta > 0 ? "↑" : "—"} {money(Math.abs(delta))}</span>
            </div>
            <input value={a.balance} type="number" onChange={(e)=>updateBalance(a.id, e.target.value)} />
          </div>
        );
      })}
    </Card>
  );
}

function CashFlow({ state, totals, setEditor }) {
  const next7 = upcomingTransactions(state.transactions, 7);
  const recurringIncome = state.transactions.filter(t => t.recurring && t.type === "income");
  const recurringExpenses = state.transactions.filter(t => t.recurring && t.type === "expense");

  return (
    <div className="screen">
      <ScreenTitle title="Cash Flow" sub="See what's coming in and what's going out." />
      <Card>
        <h2>Money In vs Out</h2>
        <div className="cash-totals">
          <div><span>Monthly Income</span><strong className="success">{money(totals.income)}</strong></div>
          <div><span>Monthly Expenses</span><strong className="danger">{money(totals.expenses)}</strong></div>
        </div>
        <div className="net-line"><span>Net</span><strong className={totals.income - totals.expenses >= 0 ? "success" : "danger"}>{money(totals.income - totals.expenses)}</strong></div>
      </Card>

      <Card>
        <div className="section-title"><h2>Next 7 Days <ChevronDown size={20}/></h2><b>{next7.length} upcoming</b></div>
        {next7.length ? next7.map(t => <TransactionRow key={t.id} t={t} setEditor={setEditor}/>) : <p className="muted">No upcoming transactions yet.</p>}
      </Card>

      <TransactionGroup title={`Recurring Income (${recurringIncome.length})`} total={totals.income} color="success" txns={recurringIncome} setEditor={setEditor}/>
      <TransactionGroup title={`Recurring Expenses (${recurringExpenses.length})`} total={totals.expenses} color="danger" txns={recurringExpenses} setEditor={setEditor}/>

      <button className="fab" onClick={()=>setEditor({ type:"transaction" })}><Plus size={34}/></button>
    </div>
  );
}

function TransactionGroup({ title, total, color, txns, setEditor }) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className={color}>Total Monthly: {money(total)}</p>
      {txns.length ? txns.map(t => <TransactionRow key={t.id} t={t} setEditor={setEditor} controls />) : <p className="muted">None yet.</p>}
    </Card>
  );
}

function TransactionRow({ t, setEditor, controls=false }) {
  return (
    <div className="transaction-row">
      <div className={`round-icon ${t.type === "income" ? "asset" : "debt"}`}>{t.icon || (t.type==="income" ? "💵" : "💳")}</div>
      <div className="row-main">
        <strong>{t.name}</strong>
        <span>{formatDate(t.date)} · {relativeDate(t.date)}</span>
      </div>
      <strong className={t.type === "income" ? "success" : "danger"}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</strong>
      {controls && <button className="icon-btn" onClick={()=>setEditor({ type:"transaction", item:t })}><Pencil size={20}/></button>}
    </div>
  );
}

function CompactTxn({ t }) {
  const d = new Date(t.date);
  return (
    <div className="compact-txn">
      <strong>{d.toLocaleString("en-US", { weekday:"short", day:"numeric", month:"short" })}</strong>
      <span>{t.icon || "💳"}</span>
      <p>{t.name}</p>
      <b className={t.type === "income" ? "success" : "danger"}>{money(t.amount)} {t.type === "expense" ? "↓" : "↑"}</b>
    </div>
  );
}

function Goals({ state, setState, setEditor }) {
  const toggle = (id) => setState(s => ({ ...s, goals:s.goals.map(g => g.id === id ? { ...g, open:!g.open } : g) }));
  const del = (id) => setState(s => ({ ...s, goals:s.goals.filter(g => g.id !== id) }));

  return (
    <div className="screen">
      <ScreenTitle title="Your Goals" sub="Big dreams? Let's make them happen — one goal at a time." />
      {state.goals.length ? state.goals.map(g => <GoalCard key={g.id} g={g} toggle={toggle} del={del} setEditor={setEditor}/>) : (
        <EmptyState title="No goals yet" text="Add your first wealth goal and track progress." action="Add goal" onClick={()=>setEditor({ type:"goal" })}/>
      )}
      <button className="fab" onClick={()=>setEditor({ type:"goal" })}><Plus size={34}/></button>
    </div>
  );
}

function GoalCard({ g, toggle, del, setEditor }) {
  const pct = Math.round(goalPct(g));
  const remaining = g.target === 0 ? g.current : Math.max(0, Number(g.target || 0) - Number(g.current || 0));
  return (
    <div className={`goal-card ${g.color || "green"} ${g.open ? "open":""}`}>
      <div className="goal-top" onClick={()=>toggle(g.id)}>
        <div className="goal-icon">{g.icon || "🎯"}</div>
        <div className="row-main">
          <h2>{g.name}</h2>
          <span>{g.account}</span>
        </div>
        <b>{pct}%</b>
        {g.open ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
      </div>
      {g.open && (
        <div className="goal-details">
          <div className="progress-line"><span>{money(g.current)} / {money(g.target)}</span><b>{pct}%</b></div>
          <div className="bar"><i style={{width:`${pct}%`}}></i></div>
          <dl>
            <dt>Target</dt><dd>{money(g.target)}</dd>
            <dt>Current balance</dt><dd>{money(g.current)}</dd>
            <dt>Remaining</dt><dd>{money(remaining)}</dd>
            <dt>Deadline</dt><dd>{g.deadline ? new Date(g.deadline).toLocaleDateString("en-US", {month:"short", year:"numeric"}) : "—"}</dd>
          </dl>
          <div className="goal-actions">
            <button onClick={()=>setEditor({ type:"goal", item:g })}><Pencil size={20}/>Edit</button>
            <button className="archive"><Archive size={20}/>Archive</button>
            <button className="delete" onClick={()=>del(g.id)}><Trash2 size={20}/>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings({ state, update, saveSnapshot, restoreSnapshot }) {
  return (
    <div className="screen">
      <ScreenTitle title="Settings" sub="Manage theme, local data, and Supabase snapshots." />
      <Card>
        <h2>Appearance</h2>
        <p>Theme: {state.theme}</p>
        <button className="primary" onClick={()=>update({ theme:state.theme === "light" ? "dark" : "light" })}>{state.theme === "light" ? <Moon size={18}/> : <Sun size={18}/>} Toggle theme</button>
      </Card>
      <Card>
        <h2>Cloud backup</h2>
        <p>Save and restore snapshots manually. Restore never runs automatically.</p>
        <div className="button-row">
          <button className="primary" onClick={saveSnapshot}><Save size={18}/> Save snapshot</button>
          <button className="secondary" onClick={restoreSnapshot}><DownloadCloud size={18}/> Restore latest</button>
        </div>
      </Card>
      <Card>
        <h2>Danger zone</h2>
        <button className="danger-btn" onClick={()=>{ if(confirm("Reset local data?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }}}><RotateCcw size={18}/> Reset local data</button>
      </Card>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    ["overview", Home, "Overview"],
    ["assets", CreditCard, "Assets & De..."],
    ["cash", Repeat2, "Cash Flow"],
    ["goals", Target, "Wealth Goals"],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([id, Icon, label]) => (
        <button key={id} className={tab === id ? "active" : ""} onClick={()=>setTab(id)}>
          <Icon size={26}/><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function MenuSheet({ state, setMenuOpen, setTab, update, saveSnapshot, restoreSnapshot }) {
  return (
    <div className="sheet-backdrop" onClick={()=>setMenuOpen(false)}>
      <div className="menu-sheet" onClick={(e)=>e.stopPropagation()}>
        <div className="sheet-head"><div className="app-icon">GV</div><div><h2>Grow UP</h2><p>Personal finance PWA</p></div><button onClick={()=>setMenuOpen(false)}><X/></button></div>
        <button onClick={()=>{setTab("overview");setMenuOpen(false)}}><Home/> Overview</button>
        <button onClick={()=>{setTab("assets");setMenuOpen(false)}}><CreditCard/> Assets & Debts</button>
        <button onClick={()=>{setTab("cash");setMenuOpen(false)}}><Repeat2/> Cash Flow</button>
        <button onClick={()=>{setTab("goals");setMenuOpen(false)}}><Target/> Wealth Goals</button>
        <hr/>
        <button onClick={()=>update({ theme:state.theme === "light" ? "dark" : "light" })}>{state.theme === "light" ? <Moon/> : <Sun/>} Toggle theme</button>
        <button onClick={saveSnapshot}><Save/> Save snapshot to Supabase</button>
        <button onClick={restoreSnapshot}><DownloadCloud/> Restore latest from Supabase</button>
        <button onClick={()=>{setTab("settings");setMenuOpen(false)}}><SlidersHorizontal/> Settings</button>
      </div>
    </div>
  );
}

function EditorModal({ editor, setEditor, state, setState }) {
  const item = editor.item || {};
  const [form, setForm] = useState({
    name:item.name || "",
    icon:item.icon || "",
    kind:item.kind || "asset",
    balance:item.balance || "",
    previous:item.previous || "",
    type:item.type || "expense",
    amount:item.amount || "",
    category:item.category || "",
    date:item.date ? item.date.slice(0,10) : new Date().toISOString().slice(0,10),
    recurring:item.recurring || false,
    account:item.account || "",
    current:item.current || "",
    target:item.target ?? "",
    deadline:item.deadline || "",
    color:item.color || "green"
  });

  const change = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const save = () => {
    if (editor.type === "account") {
      const acct = {
        id:item.id || safeId(),
        name:form.name || "Account",
        icon:form.icon || (form.kind === "debt" ? "💳" : "💼"),
        kind:form.kind,
        balance:Number(form.balance || 0),
        previous:Number(form.previous || 0)
      };
      setState(s => ({ ...s, accounts:item.id ? s.accounts.map(a => a.id === item.id ? acct : a) : [...s.accounts, acct] }));
    }

    if (editor.type === "transaction") {
      const tx = {
        id:item.id || safeId(),
        type:form.type,
        name:form.name || "Transaction",
        icon:form.icon || (form.type === "income" ? "💵" : "💳"),
        amount:Number(form.amount || 0),
        category:form.category,
        date:new Date(form.date).toISOString(),
        recurring:!!form.recurring
      };
      setState(s => ({ ...s, transactions:item.id ? s.transactions.map(t => t.id === item.id ? tx : t) : [...s.transactions, tx] }));
    }

    if (editor.type === "goal") {
      const goal = {
        id:item.id || safeId(),
        name:form.name || "Goal",
        icon:form.icon || "🎯",
        account:form.account || "Net Worth",
        color:form.color,
        current:Number(form.current || 0),
        target:Number(form.target || 0),
        deadline:form.deadline,
        open:item.open ?? true
      };
      setState(s => ({ ...s, goals:item.id ? s.goals.map(g => g.id === item.id ? goal : g) : [...s.goals, goal] }));
    }

    setEditor(null);
  };

  return (
    <div className="modal-backdrop">
      <div className="editor-modal">
        <div className="modal-head"><h2>{item.id ? "Edit" : "Add"} {editor.type}</h2><button onClick={()=>setEditor(null)}><X/></button></div>
        <label>Name<input value={form.name} onChange={e=>change("name", e.target.value)} /></label>
        <label>Icon / Emoji<input value={form.icon} onChange={e=>change("icon", e.target.value)} /></label>

        {editor.type === "account" && <>
          <label>Kind<select value={form.kind} onChange={e=>change("kind", e.target.value)}><option value="asset">Asset</option><option value="debt">Debt</option></select></label>
          <label>Current balance<input type="number" value={form.balance} onChange={e=>change("balance", e.target.value)} /></label>
          <label>Previous balance<input type="number" value={form.previous} onChange={e=>change("previous", e.target.value)} /></label>
        </>}

        {editor.type === "transaction" && <>
          <label>Type<select value={form.type} onChange={e=>change("type", e.target.value)}><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label>Amount<input type="number" value={form.amount} onChange={e=>change("amount", e.target.value)} /></label>
          <label>Category<input value={form.category} onChange={e=>change("category", e.target.value)} /></label>
          <label>Date<input type="date" value={form.date} onChange={e=>change("date", e.target.value)} /></label>
          <label className="checkbox"><input type="checkbox" checked={form.recurring} onChange={e=>change("recurring", e.target.checked)} /> Recurring</label>
        </>}

        {editor.type === "goal" && <>
          <label>Account / Metric<input value={form.account} onChange={e=>change("account", e.target.value)} /></label>
          <label>Current<input type="number" value={form.current} onChange={e=>change("current", e.target.value)} /></label>
          <label>Target<input type="number" value={form.target} onChange={e=>change("target", e.target.value)} /></label>
          <label>Deadline<input type="date" value={form.deadline} onChange={e=>change("deadline", e.target.value)} /></label>
          <label>Color<select value={form.color} onChange={e=>change("color", e.target.value)}><option value="green">Green</option><option value="purple">Purple</option><option value="red">Red</option></select></label>
        </>}

        <button className="primary full" onClick={save}>Save</button>
      </div>
    </div>
  );
}

function Card({ children, className="", onClick }) {
  return <section className={`card ${className}`} onClick={onClick}>{children}</section>;
}

function goalPct(g) {
  if (!g.target) return 0;
  return Math.max(0, Math.min(100, Number(g.current || 0) / Number(g.target || 1) * 100));
}

function upcomingTransactions(transactions, days) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return transactions
    .filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    })
    .sort((a,b)=>new Date(a.date) - new Date(b.date));
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function relativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d - start) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
}

function signedMoney(n) {
  const v = Number(n || 0);
  return `${v >= 0 ? "+" : "-"}${money(Math.abs(v))}`;
}

createRoot(document.getElementById("root")).render(<App />);
