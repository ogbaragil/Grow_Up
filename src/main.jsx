
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home, CreditCard, Repeat2, Target, Menu, Plus, Pencil, Trash2, Archive,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sun, Moon, RefreshCcw,
  TrendingUp, Wallet, PiggyBank, CircleDollarSign, SlidersHorizontal, X,
  Save, DownloadCloud, RotateCcw
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar
} from "recharts";
import { supabase } from "./supabaseClient";
import "./styles.css";

const STORAGE_KEY = "growup_faithful_state_v1";

const money = (n) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0
}).format(Number(n || 0));

const today = new Date();
const addDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
};
const relDate = (iso) => {
  const d = new Date(iso);
  const diff = Math.round((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
};

const seed = {
  firstName: "Gil",
  mode: "Real Mode",
  theme: "light",
  month: "May 2026",
  accounts: [
    { id: "a1", name: "Hesta Super", kind: "asset", icon: "💼", balance: 72726, previous: 72000 },
    { id: "a2", name: "Stocks", kind: "asset", icon: "📊", balance: 28000, previous: 56000 },
    { id: "a3", name: "Tesla Model 3", kind: "asset", icon: "🚗", balance: 28000, previous: 56000 },
    { id: "a4", name: "Business Asset", kind: "asset", icon: "👔", balance: 0, previous: 0 },
    { id: "d1", name: "Personal Loan", kind: "debt", icon: "💳", balance: 41474, previous: 30000 },
    { id: "d2", name: "Income Tax Debt", kind: "debt", icon: "🏦", balance: 6049, previous: 0 },
  ],
  transactions: [
    { id:"t1", type:"expense", name:"Etoro", icon:"🌱", amount:2500, date:addDays(today,1).toISOString(), recurring:false, category:"Investment" },
    { id:"t2", type:"expense", name:"Dinner With Kids", icon:"👧🏽", amount:100, date:addDays(today,2).toISOString(), recurring:false, category:"Family" },
    { id:"t3", type:"expense", name:"Rent", icon:"🏡", amount:2300, date:addDays(today,3).toISOString(), recurring:true, category:"Housing" },
    { id:"t4", type:"expense", name:"Gym", icon:"🏋️", amount:23, date:addDays(today,6).toISOString(), recurring:true, category:"Health" },
    { id:"t5", type:"income", name:"Salary", icon:"💵", amount:2950, date:addDays(today,11).toISOString(), recurring:true, category:"Work" },
    { id:"t6", type:"expense", name:"Allianz Car Insurance", icon:"🚗", amount:178, date:addDays(today,29).toISOString(), recurring:true, category:"Insurance" },
    { id:"t7", type:"expense", name:"Personal Loan Install", icon:"💳", amount:200, date:addDays(today,12).toISOString(), recurring:true, category:"Debt" },
    { id:"t8", type:"expense", name:"Fine, VIC", icon:"💳", amount:30, date:addDays(today,17).toISOString(), recurring:true, category:"Admin" },
    { id:"t9", type:"expense", name:"Recharge Work Mobile", icon:"📱", amount:80, date:addDays(today,17).toISOString(), recurring:true, category:"Phone" },
    { id:"t10", type:"expense", name:"Child Support", icon:"👧🏽", amount:550, date:addDays(today,22).toISOString(), recurring:true, category:"Family" },
  ],
  goals: [
    { id:"g1", name:"Hit 100k Net", account:"Net Worth", icon:"🎯", color:"purple", target:100000, current:81203, deadline:"2026-10-01", status:"active", open:true },
    { id:"g2", name:"Reach 100k in Super", account:"Hesta Super", icon:"$", color:"green", target:100000, current:73000, deadline:"2026-12-01", status:"active", open:false },
    { id:"g3", name:"Investment Milestone 2026", account:"Stocks", icon:"$", color:"green", target:100000, current:47000, deadline:"2026-12-31", status:"behind", open:false },
    { id:"g4", name:"Pay off loan", account:"Personal Loan", icon:"⚡", color:"red", target:0, current:32000, start:47000, deadline:"2026-06-01", status:"active", open:false },
    { id:"g5", name:"Invest Milestone 2025", account:"Stocks", icon:"$", color:"green", target:50000, current:50000, deadline:"2025-12-31", status:"complete", open:false },
  ],
  monthlyNetWorth: [
    { m:"Jun", net:28000 }, { m:"Jul", net:42000 }, { m:"Aug", net:47000 }, { m:"Sep", net:53000 },
    { m:"Oct", net:59000 }, { m:"Nov", net:65000 }, { m:"Dec", net:70000 }, { m:"Jan", net:76000 },
    { m:"Feb", net:82000 }, { m:"Mar", net:90000 }, { m:"Apr", net:81203 }, { m:"May", net:98000 },
  ]
};

function useGrowState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...seed, ...JSON.parse(raw) } : seed;
    } catch { return seed; }
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
  const dark = state.theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(()=>{});
  }, [state.theme]);

  const totals = useMemo(() => {
    const assets = state.accounts.filter(a=>a.kind==="asset").reduce((s,a)=>s+Number(a.balance||0),0);
    const debts = state.accounts.filter(a=>a.kind==="debt").reduce((s,a)=>s+Number(a.balance||0),0);
    const prevAssets = state.accounts.filter(a=>a.kind==="asset").reduce((s,a)=>s+Number(a.previous||0),0);
    const prevDebts = state.accounts.filter(a=>a.kind==="debt").reduce((s,a)=>s+Number(a.previous||0),0);
    const income = state.transactions.filter(t=>t.type==="income" && t.recurring).reduce((s,t)=>s+Number(t.amount||0),0) * 2.1668;
    const expenses = state.transactions.filter(t=>t.type==="expense" && t.recurring).reduce((s,t)=>s+Number(t.amount||0),0);
    return { assets, debts, net: assets-debts, prevAssets, prevDebts, prevNet: prevAssets-prevDebts, income, expenses };
  }, [state]);

  const update = (patch) => setState(s => ({...s, ...patch}));

  const saveSnapshot = async () => {
    if (!supabase) return alert("Supabase env vars are missing.");
    const { error } = await supabase.from("growup_snapshots").insert({
      user_id: "gil",
      app_state: state
    });
    if (error) return alert(`Supabase sync failed: ${error.message}`);
    alert("Snapshot saved to Supabase.");
  };

  const restoreSnapshot = async () => {
    if (!supabase) return alert("Supabase env vars are missing.");
    const ok = confirm("Restore the latest Supabase snapshot? This replaces local app data.");
    if (!ok) return;
    const { data, error } = await supabase
      .from("growup_snapshots")
      .select("app_state, state, created_at")
      .order("created_at", { ascending:false })
      .limit(1);
    if (error) return alert(`Restore failed: ${error.message}`);
    const restored = data?.[0]?.app_state || data?.[0]?.state;
    if (!restored) return alert("No snapshot found.");
    setState({...seed, ...restored});
    alert("Latest snapshot restored.");
  };

  const common = { state, setState, totals, setEditor };

  return (
    <div className="app-shell">
      <main className="phone">
        <TopChrome state={state} setTab={setTab} tab={tab} setMenuOpen={setMenuOpen} />
        <button className="floating-menu" onClick={()=>setMenuOpen(true)} aria-label="Menu"><Menu size={34}/></button>
        {tab === "overview" && <Overview {...common} setTab={setTab} />}
        {tab === "assets" && <AssetsDebts {...common} />}
        {tab === "cash" && <CashFlow {...common} />}
        {tab === "goals" && <Goals {...common} />}
        {tab === "settings" && <Settings state={state} update={update} saveSnapshot={saveSnapshot} restoreSnapshot={restoreSnapshot} />}
        <BottomNav tab={tab} setTab={setTab} />
      </main>
      {menuOpen && <MenuSheet state={state} setMenuOpen={setMenuOpen} setTab={setTab} update={update} saveSnapshot={saveSnapshot} restoreSnapshot={restoreSnapshot} />}
      {editor && <EditorModal editor={editor} setEditor={setEditor} state={state} setState={setState}/>}
    </div>
  );
}

function TopChrome({ state, setTab, tab }) {
  return (
    <header className="top-chrome">
      <div className="brand-row">
        <div className="app-icon">GV</div>
        <div>
          <div className="brand">Grow UP</div>
          <div className="subtitle">Personal finance PWA</div>
        </div>
      </div>
      <nav className="top-tabs">
        <button className={tab==="overview" ? "active":""} onClick={()=>setTab("overview")}><Home size={30}/></button>
        <button className={tab==="assets" ? "active":""} onClick={()=>setTab("assets")}><CreditCard size={30}/></button>
        <button className={tab==="cash" ? "active":""} onClick={()=>setTab("cash")}><Repeat2 size={30}/></button>
        <button className={tab==="goals" ? "active":""} onClick={()=>setTab("goals")}><Target size={30}/></button>
      </nav>
    </header>
  );
}

function ScreenTitle({ title, sub, state }) {
  return (
    <section className="screen-title">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </section>
  );
}

function Overview({ state, totals, setTab }) {
  const goalsDone = state.goals.filter(g=>goalPct(g)>=100).length;
  const upcoming = state.transactions
    .filter(t => (new Date(t.date)-today) >= 0 && (new Date(t.date)-today) <= 7*86400000)
    .sort((a,b)=>new Date(a.date)-new Date(b.date));

  return (
    <div className="screen">
      <ScreenTitle title={`Welcome, ${state.firstName}`} sub={`Here's your Snapshot for ${state.month}`} />
      <span className="mode-pill">{state.mode}</span>
      <div className="kpi-grid">
        <Kpi title="Total Assets" value={money(totals.assets)} sub={`${totals.assets-totals.prevAssets>=0?"+":""}${money(totals.assets-totals.prevAssets)} vs last month`} icon="💼" dot="green"/>
        <Kpi title="Total Debts" value={money(totals.debts)} sub={`${totals.debts-totals.prevDebts>=0?"+":""}${money(totals.debts-totals.prevDebts)} vs last month`} icon="💳" dot="red"/>
        <Kpi title="Net Worth" value={money(totals.net)} sub={`${totals.net-totals.prevNet>=0?"+":""}${money(totals.net-totals.prevNet)} vs last month`} icon="$" dot="blue"/>
        <Kpi title="Goals" value={`${goalsDone} / ${state.goals.length}`} sub="completed" icon="🎯" dot="purple"/>
      </div>
      <Card className="trend">
        <div className="card-head">
          <span className="green-square"><TrendingUp size={28}/></span>
          <div><h2>Net Worth Trend</h2><p>12-month overview</p></div>
          <ChevronDown className="muted-icon"/>
        </div>
        <div className="trend-box">
          <div><span>Current Net Worth</span><strong>{money(totals.net)}</strong></div>
          <div><span>Growth</span><strong className="success">+250.5%</strong></div>
        </div>
        <div className="chart-holder">
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={state.monthlyNetWorth}>
              <XAxis dataKey="m" hide/>
              <YAxis hide/>
              <Tooltip formatter={(v)=>money(v)} />
              <Line type="monotone" dataKey="net" stroke="#3fa463" strokeWidth={4} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="cash-card" onClick={()=>setTab("cash")}>
        <div className="card-head">
          <span className="blue-square"><Repeat2 size={28}/></span>
          <h2>Cash Flow</h2>
        </div>
        <div className="mini-pair">
          <div><span>Money In (monthly)</span><strong>{money(totals.income)}</strong></div>
          <div><span>Money Out (monthly)</span><strong>{money(totals.expenses)}</strong></div>
        </div>
        <div className="upcoming-head"><h3>Upcoming <span>· Next 7 days</span></h3><span>{money(0)} in · {money(upcoming.reduce((s,t)=>s+(t.type==="expense"?t.amount:0),0))} out</span></div>
        {upcoming.slice(0,4).map(t => <CompactTxn key={t.id} t={t}/>)}
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
  const [monthOffset, setMonthOffset] = useState(0);
  const updateBalance = (id, value) => {
    setState(s => ({...s, accounts:s.accounts.map(a=>a.id===id?{...a,balance:Number(value||0)}:a)}));
  };
  const assets = state.accounts.filter(a=>a.kind==="asset");
  const debts = state.accounts.filter(a=>a.kind==="debt");
  return (
    <div className="screen">
      <ScreenTitle title="Assets & Debts" sub="Update balances month-to-month. Changes feed your Overview." />
      <div className="month-switch"><ChevronLeft onClick={()=>setMonthOffset(monthOffset-1)}/><strong>{state.month}</strong><ChevronRight onClick={()=>setMonthOffset(monthOffset+1)}/></div>
      <AccountGroup title={`Assets (${assets.length})`} sub="Enter this month’s values; see last month + change." accounts={assets} updateBalance={updateBalance}/>
      <AccountGroup title={`Debts (${debts.length})`} sub="Enter this month’s amounts owed; see last month + change." accounts={debts} updateBalance={updateBalance}/>
      <Card className="summary-list">
        <div><span>Assets (this month)</span><strong>{money(totals.assets)}</strong></div>
        <div><span>Debts (this month)</span><strong>{money(totals.debts)}</strong></div>
        <div className="bold"><span>Net Worth</span><strong>{money(totals.net)}</strong></div>
      </Card>
      <button className="fab" onClick={()=>setEditor({type:"account"})}><Plus size={42}/></button>
    </div>
  );
}

function AccountGroup({ title, sub, accounts, updateBalance }) {
  return (
    <Card className="account-group">
      <h2>{title}</h2><p>{sub}</p>
      {accounts.map(a => {
        const delta = Number(a.balance||0) - Number(a.previous||0);
        return (
          <div className="account-row" key={a.id}>
            <div className={`round-icon ${a.kind==="debt"?"debt":"asset"}`}>{a.icon}</div>
            <div className="row-main">
              <strong>{a.name}</strong>
              <span>Prev: {money(a.previous)} {delta<0?"↓":delta>0?"↑":"—"} {money(Math.abs(delta))}</span>
            </div>
            <input value={a.balance} type="number" onChange={(e)=>updateBalance(a.id, e.target.value)} />
          </div>
        );
      })}
    </Card>
  );
}

function CashFlow({ state, setState, totals, setEditor }) {
  const next7 = state.transactions
    .filter(t => (new Date(t.date)-today) >= 0 && (new Date(t.date)-today) <= 7*86400000)
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const recurringIncome = state.transactions.filter(t=>t.recurring && t.type==="income");
  const recurringExpenses = state.transactions.filter(t=>t.recurring && t.type==="expense");
  return (
    <div className="screen">
      <ScreenTitle title="Cash Flow" sub="See what’s coming in and what’s going out." />
      <Card>
        <h2>Money In vs Out</h2>
        <div className="cash-totals">
          <div><span>Monthly Income</span><strong className="success">{money(totals.income)}</strong></div>
          <div><span>Monthly Expenses</span><strong className="danger">{money(totals.expenses)}</strong></div>
        </div>
        <div className="net-line"><span>Net</span><strong className={totals.income-totals.expenses >=0 ? "success":"danger"}>{money(totals.income-totals.expenses)}</strong></div>
      </Card>
      <Card>
        <div className="section-title"><h2>Next 7 Days <ChevronDown/></h2><b>{next7.length} upcoming</b></div>
        <p className="muted">{money(next7.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0))} in · {money(next7.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0))} out</p>
        {next7.map(t=><TransactionRow key={t.id} t={t} setEditor={setEditor}/>)}
      </Card>
      <TransactionGroup title={`Recurring Income (${recurringIncome.length})`} total={totals.income} color="success" txns={recurringIncome} setEditor={setEditor}/>
      <TransactionGroup title={`Recurring Expenses (${recurringExpenses.length})`} total={totals.expenses} color="danger" txns={recurringExpenses} setEditor={setEditor}/>
      <button className="fab" onClick={()=>setEditor({type:"transaction"})}><Plus size={42}/></button>
    </div>
  );
}

function TransactionGroup({ title, total, color, txns, setEditor }) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className={color}>Total Monthly: {money(total)}</p>
      {txns.map(t=><TransactionRow key={t.id} t={t} setEditor={setEditor} controls />)}
    </Card>
  )
}

function TransactionRow({ t, setEditor, controls=false }) {
  return (
    <div className="transaction-row">
      <div className={`round-icon ${t.type==="income"?"asset":"debt"}`}>{t.icon}</div>
      <div className="row-main">
        <strong>{t.name}</strong>
        <span>{fmtDate(t.date)} · {relDate(t.date)}</span>
      </div>
      <strong className={t.type==="income" ? "success":"danger"}>{t.type==="income" ? "+" : "-"}{money(t.amount)}</strong>
      {controls && <>
        <button className="icon-btn" onClick={()=>setEditor({type:"transaction", item:t})}><Pencil/></button>
        <button className="icon-btn" onClick={()=>setEditor({type:"deleteTransaction", item:t})}><Trash2/></button>
      </>}
    </div>
  );
}

function CompactTxn({ t }) {
  const d = new Date(t.date);
  return (
    <div className="compact-txn">
      <strong>{d.toLocaleString("en-US", { weekday:"short", day:"numeric", month:"short" })}</strong>
      <span>{t.icon}</span>
      <p>{t.name}</p>
      <b className={t.type==="income"?"success":"danger"}>{money(t.amount)} {t.type==="expense" ? "↓":"↑"}</b>
    </div>
  )
}

function Goals({ state, setState, totals, setEditor }) {
  const toggle = (id) => setState(s=>({...s, goals:s.goals.map(g=>g.id===id?{...g,open:!g.open}:g)}));
  const del = (id) => setState(s=>({...s, goals:s.goals.filter(g=>g.id!==id)}));
  return (
    <div className="screen">
      <ScreenTitle title="Your Goals" sub="Big dreams? Let’s make them happen — one goal at a time." />
      {state.goals.map(g => <GoalCard key={g.id} g={g} toggle={toggle} del={del} setEditor={setEditor}/>)}
      <button className="fab" onClick={()=>setEditor({type:"goal"})}><Plus size={42}/></button>
    </div>
  );
}

function goalPct(g) {
  if (g.target === 0 && g.start) {
    return Math.max(0, Math.min(100, ((g.start - g.current)/g.start)*100));
  }
  return Math.max(0, Math.min(100, (Number(g.current||0)/Number(g.target||1))*100));
}

function GoalCard({ g, toggle, del, setEditor }) {
  const pct = Math.round(goalPct(g));
  const remaining = g.target === 0 ? g.current : Math.max(0, g.target - g.current);
  return (
    <div className={`goal-card ${g.color || "green"} ${g.open ? "open":""}`}>
      <div className="goal-top" onClick={()=>toggle(g.id)}>
        <div className="goal-icon">{g.icon}</div>
        <div className="row-main">
          <h2>{g.name}</h2>
          <span>{g.account}</span>
        </div>
        <b>{pct}%</b>
        <span className={`status-dot ${g.status}`}></span>
        {g.open ? <ChevronUp/> : <ChevronDown/>}
      </div>
      {g.open && (
        <div className="goal-details">
          <div className="progress-line"><span>{money(g.current)} / {money(g.target)}</span><b>{pct}%</b></div>
          <div className="bar"><i style={{width:`${pct}%`}}></i></div>
          <dl>
            <dt>Target</dt><dd>{money(g.target)}</dd>
            <dt>Current balance</dt><dd>{money(g.current)}</dd>
            <dt>Remaining</dt><dd>{money(remaining)}</dd>
            <dt>Deadline</dt><dd>{new Date(g.deadline).toLocaleDateString("en-US", {month:"short", year:"numeric"})}</dd>
          </dl>
          <div className="pace-card"><h3>🎉 Ahead</h3><span>Pace finish: Sep 2026</span><p>Need {money(3800)}/mo · Pace {money(4800)}/mo</p></div>
          <div className="goal-actions">
            <button onClick={()=>setEditor({type:"goal", item:g})}><Pencil/>Edit</button>
            <button className="archive"><Archive/>Archive</button>
            <button className="delete" onClick={()=>del(g.id)}><Trash2/>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Settings({ state, update, saveSnapshot, restoreSnapshot }) {
  return (
    <div className="screen">
      <ScreenTitle title="Settings" sub="Manage theme, local data, and Supabase snapshots." />
      <Card>
        <h2>Appearance</h2>
        <p>Theme: {state.theme}</p>
        <button className="primary" onClick={()=>update({theme:state.theme==="light"?"dark":"light"})}>{state.theme==="light"?<Moon/>:<Sun/>} Toggle theme</button>
      </Card>
      <Card>
        <h2>Cloud backup</h2>
        <p>Save and restore snapshots manually. Restore never runs automatically.</p>
        <div className="button-row">
          <button className="primary" onClick={saveSnapshot}><Save/> Save snapshot</button>
          <button className="secondary" onClick={restoreSnapshot}><DownloadCloud/> Restore latest</button>
        </div>
      </Card>
      <Card>
        <h2>Danger zone</h2>
        <button className="danger-btn" onClick={()=>{ if(confirm("Reset local data?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }}}><RotateCcw/> Reset local data</button>
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
      {items.map(([id, Icon, label])=>(
        <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>
          <Icon size={31}/><span>{label}</span>
        </button>
      ))}
    </nav>
  )
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
        <button onClick={()=>update({theme:state.theme==="light"?"dark":"light"})}>{state.theme==="light"?<Moon/>:<Sun/>} Toggle theme</button>
        <button onClick={saveSnapshot}><Save/> Save snapshot to Supabase</button>
        <button onClick={restoreSnapshot}><DownloadCloud/> Restore latest from Supabase</button>
        <button onClick={()=>{setTab("settings");setMenuOpen(false)}}><SlidersHorizontal/> Settings</button>
      </div>
    </div>
  );
}

function EditorModal({ editor, setEditor, state, setState }) {
  if (editor.type === "deleteTransaction") {
    setState(s=>({...s, transactions:s.transactions.filter(t=>t.id!==editor.item.id)}));
    setTimeout(()=>setEditor(null), 0);
    return null;
  }

  const isTxn = editor.type==="transaction";
  const isGoal = editor.type==="goal";
  const isAcct = editor.type==="account";
  const item = editor.item || {};
  const [form, setForm] = useState({
    name:item.name || "",
    amount:item.amount || "",
    balance:item.balance || "",
    kind:item.kind || "asset",
    type:item.type || "expense",
    category:item.category || "",
    icon:item.icon || (isGoal ? "🎯" : isAcct ? "💼" : "💳"),
    date:item.date ? item.date.slice(0,10) : new Date().toISOString().slice(0,10),
    recurring:item.recurring || false,
    account:item.account || "Net Worth",
    current:item.current || "",
    target:item.target ?? "",
    deadline:item.deadline || "2026-12-31",
    color:item.color || "green"
  });
  const change = (k,v) => setForm(f=>({...f,[k]:v}));
  const save = () => {
    if (isTxn) {
      const tx = { id:item.id || crypto.randomUUID(), type:form.type, name:form.name || "Transaction", icon:form.icon, amount:Number(form.amount||0), date:new Date(form.date).toISOString(), recurring:!!form.recurring, category:form.category };
      setState(s=>({...s, transactions:item.id ? s.transactions.map(t=>t.id===item.id?tx:t) : [tx, ...s.transactions]}));
    }
    if (isAcct) {
      const acct = { id:item.id || crypto.randomUUID(), name:form.name || "Account", icon:form.icon, kind:form.kind, balance:Number(form.balance||0), previous:Number(form.balance||0) };
      setState(s=>({...s, accounts:item.id ? s.accounts.map(a=>a.id===item.id?acct:a) : [acct, ...s.accounts]}));
    }
    if (isGoal) {
      const goal = { id:item.id || crypto.randomUUID(), name:form.name || "Goal", account:form.account, icon:form.icon, color:form.color, target:Number(form.target||0), current:Number(form.current||0), deadline:form.deadline, status:"active", open:item.open ?? true };
      setState(s=>({...s, goals:item.id ? s.goals.map(g=>g.id===item.id?goal:g) : [goal, ...s.goals]}));
    }
    setEditor(null);
  };

  return (
    <div className="modal-backdrop">
      <div className="editor-modal">
        <div className="modal-head"><h2>{item.id ? "Edit" : "Add"} {isTxn?"Transaction":isAcct?"Account":"Goal"}</h2><button onClick={()=>setEditor(null)}><X/></button></div>
        <label>Name<input value={form.name} onChange={e=>change("name", e.target.value)} /></label>
        <label>Icon<input value={form.icon} onChange={e=>change("icon", e.target.value)} /></label>
        {isTxn && <>
          <label>Type<select value={form.type} onChange={e=>change("type", e.target.value)}><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label>Amount<input type="number" value={form.amount} onChange={e=>change("amount", e.target.value)} /></label>
          <label>Category<input value={form.category} onChange={e=>change("category", e.target.value)} /></label>
          <label>Date<input type="date" value={form.date} onChange={e=>change("date", e.target.value)} /></label>
          <label className="checkbox"><input type="checkbox" checked={form.recurring} onChange={e=>change("recurring", e.target.checked)} /> Recurring</label>
        </>}
        {isAcct && <>
          <label>Kind<select value={form.kind} onChange={e=>change("kind", e.target.value)}><option value="asset">Asset</option><option value="debt">Debt</option></select></label>
          <label>Balance<input type="number" value={form.balance} onChange={e=>change("balance", e.target.value)} /></label>
        </>}
        {isGoal && <>
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
  return <section className={`card ${className}`} onClick={onClick}>{children}</section>
}

createRoot(document.getElementById("root")).render(<App />);
