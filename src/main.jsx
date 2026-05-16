
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home, CreditCard, Repeat2, Target, Menu, Plus, Pencil, Trash2, Archive,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sun, Moon, TrendingUp,
  X, Save, DownloadCloud, RotateCcw, SlidersHorizontal, ArrowLeft
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { supabase } from "./supabaseClient";
import "./styles.css";

const STORAGE_KEY = "growup_history_monthbar_v1";

const money = (n) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0
}).format(Number(n || 0));

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const monthLabel = (key) => {
  const [y,m] = key.split("-").map(Number);
  return new Date(y, m-1, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });
};
const shortMonthLabel = (key) => {
  const [y,m] = key.split("-").map(Number);
  return new Date(y, m-1, 1).toLocaleDateString("en-US", { month:"short", year:"2-digit" }).replace(" ", " '");
};
const addMonths = (key, delta) => {
  const [y,m] = key.split("-").map(Number);
  const d = new Date(y, m-1+delta, 1);
  return monthKey(d);
};

const EMPTY_STATE = {
  firstName: "Gil",
  theme: "light",
  mode: "Real Mode",
  selectedMonth: monthKey(),
  accounts: [],
  transactions: [],
  goals: [],
  monthSnapshots: {}
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
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);
  return [state, setState];
}

function App() {
  const [state, setState] = useGrowState();
  const [tab, setTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [historyMetric, setHistoryMetric] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }, [state.theme]);

  const totals = useMemo(() => computeTotals(state), [state]);

  const update = (patch) => setState(s => ({ ...s, ...patch }));

  const saveSnapshot = async () => {
    let nextStateForSupabase = null;
    let selectedMonthForMessage = state.selectedMonth;

    setState(currentState => {
      selectedMonthForMessage = currentState.selectedMonth;

      const existingSnapshot = currentState.monthSnapshots?.[currentState.selectedMonth];

      // IMPORTANT:
      // Use the freshest available balances.
      // If the selected month already has a snapshot and the user edited it,
      // save from that snapshot's accounts. Otherwise save from live accounts.
      const sourceAccounts = existingSnapshot?.accounts || currentState.accounts;

      const cleanAccounts = sourceAccounts.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        kind: a.kind,
        balance: Number(a.balance || 0),
        previous: Number(a.previous || 0)
      }));

      const assets = cleanAccounts
        .filter(a => a.kind === "asset")
        .reduce((sum, a) => sum + Number(a.balance || 0), 0);

      const debts = cleanAccounts
        .filter(a => a.kind === "debt")
        .reduce((sum, a) => sum + Number(a.balance || 0), 0);

      const snapshot = {
        ...(existingSnapshot || {}),
        assets,
        debts,
        net: assets - debts,
        accounts: cleanAccounts,
        createdAt: existingSnapshot?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const next = {
        ...currentState,
        monthSnapshots: {
          ...(currentState.monthSnapshots || {}),
          [currentState.selectedMonth]: snapshot
        }
      };

      nextStateForSupabase = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    // Give React a tick to complete the state update before cloud sync.
    await new Promise(resolve => setTimeout(resolve, 0));

    if (!nextStateForSupabase) {
      alert("Could not save snapshot. Please try again.");
      return;
    }

    if (!supabase) {
      alert("Monthly snapshot saved locally. Supabase env vars are missing.");
      return;
    }

    const { error } = await supabase
      .from("growup_snapshots")
      .insert({ user_id:"gil", app_state:nextStateForSupabase });

    if (error) return alert(`Local snapshot saved, but Supabase sync failed: ${error.message}`);
    alert(`Snapshot saved for ${monthLabel(selectedMonthForMessage)}.`);
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

  const common = { state, setState, totals, setEditor, setMenuOpen, setHistoryMetric, saveSnapshot };

  return (
    <div className="app-shell">
      <main className="phone">
        {historyMetric ? (
          <HistoryPage {...common} metric={historyMetric} setHistoryMetric={setHistoryMetric} />
        ) : (
          <>
            {tab === "overview" && <Overview {...common} setTab={setTab} />}
            {tab === "assets" && <AssetsDebts {...common} />}
            {tab === "cash" && <CashFlow {...common} />}
            {tab === "goals" && <Goals {...common} />}
            {tab === "settings" && <Settings state={state} update={update} saveSnapshot={saveSnapshot} restoreSnapshot={restoreSnapshot} setMenuOpen={setMenuOpen} />}
            <BottomNav tab={tab} setTab={setTab} />
          </>
        )}
      </main>

      {menuOpen && (
        <MenuSheet state={state} setMenuOpen={setMenuOpen} setTab={setTab} update={update} saveSnapshot={saveSnapshot} restoreSnapshot={restoreSnapshot} />
      )}

      {editor && <EditorModal editor={editor} setEditor={setEditor} state={state} setState={setState} />}
    </div>
  );
}

function computeTotals(state) {
  const current = state.monthSnapshots?.[state.selectedMonth];
  const prevKey = addMonths(state.selectedMonth, -1);
  const prev = state.monthSnapshots?.[prevKey];

  const accountSource = current?.accounts || state.accounts;
  const assets = accountSource.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance || 0),0);
  const debts = accountSource.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance || 0),0);

  const prevAssets = prev ? Number(prev.assets || 0) : state.accounts.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.previous || 0),0);
  const prevDebts = prev ? Number(prev.debts || 0) : state.accounts.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.previous || 0),0);

  const income = state.transactions.filter(t => t.type === "income" && t.recurring).reduce((s,t)=>s+Number(t.amount || 0),0);
  const expenses = state.transactions.filter(t => t.type === "expense" && t.recurring).reduce((s,t)=>s+Number(t.amount || 0),0);

  return { assets, debts, net: assets-debts, prevAssets, prevDebts, prevNet: prevAssets-prevDebts, income, expenses };
}

function ScreenTitle({ title, sub, setMenuOpen, back }) {
  return (
    <section className="page-header">
      {back && <button className="round-nav-btn" onClick={back}><ArrowLeft size={24}/></button>}
      <div className="title-block">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <button className="mini-menu-btn" onClick={() => setMenuOpen?.(true)} aria-label="Open menu"><Menu size={22}/></button>
    </section>
  );
}

function MonthBar({ state, setState, thin=false }) {
  const move = (delta) => setState(s => ({ ...s, selectedMonth:addMonths(s.selectedMonth, delta) }));
  return (
    <div className={thin ? "month-bar thin" : "month-bar"}>
      <button onClick={()=>move(-1)}><ChevronLeft size={24}/></button>
      <strong>{monthLabel(state.selectedMonth)}</strong>
      <button onClick={()=>move(1)}><ChevronRight size={24}/></button>
    </div>
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

function Overview({ state, totals, setEditor, setTab, setMenuOpen, setHistoryMetric }) {
  const completedGoals = state.goals.filter(g => calculateGoalProgress(g, totals, getAccountsForSelectedMonth(state)).progress >= 100).length;
  const upcoming = upcomingTransactions(state.transactions, 7);
  const chartData = historyRows(state).slice().reverse().map(r => ({ m:shortMonthLabel(r.key), net:r.net }));

  return (
    <div className="screen">
      <ScreenTitle title={`Welcome, ${state.firstName}`} sub={`Here's your Snapshot for ${monthLabel(state.selectedMonth)}`} setMenuOpen={setMenuOpen} />
      <span className="mode-pill">{state.mode}</span>

      <div className="kpi-grid">
        <Kpi onClick={()=>setHistoryMetric("assets")} title="Total Assets" value={money(totals.assets)} sub={`${signedMoney(totals.assets - totals.prevAssets)} vs last month`} icon="💼" dot="green" />
        <Kpi onClick={()=>setHistoryMetric("debts")} title="Total Debts" value={money(totals.debts)} sub={`${signedMoney(totals.debts - totals.prevDebts)} vs last month`} icon="💳" dot="red" />
        <Kpi onClick={()=>setHistoryMetric("net")} title="Net Worth" value={money(totals.net)} sub={`${signedMoney(totals.net - totals.prevNet)} vs last month`} icon="$" dot="blue" />
        <Kpi title="Goals" value={`${completedGoals} / ${state.goals.length}`} sub="completed" icon="🎯" dot="purple" />
      </div>

      {state.accounts.length === 0 && state.goals.length === 0 && state.transactions.length === 0 && (
        <EmptyState title="Start building your snapshot" text="Add your first account, goal, or cash flow item. Nothing is hard-coded." action="Add account" onClick={()=>setEditor({ type:"account" })}/>
      )}

      <Card onClick={()=>setHistoryMetric("net")}>
        <div className="card-head">
          <span className="green-square"><TrendingUp size={22}/></span>
          <div><h2>Net Worth Trend</h2><p>Tap to view History</p></div>
          <ChevronDown className="muted-icon"/>
        </div>
        <div className="trend-box">
          <div><span>Current Net Worth</span><strong>{money(totals.net)}</strong></div>
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
          <div><span>Money In (monthly)</span><strong>{money(totals.income)}</strong></div>
          <div><span>Money Out (monthly)</span><strong>{money(totals.expenses)}</strong></div>
        </div>
        <div className="upcoming-head"><h3>Upcoming <span>· Next 7 days</span></h3><span>{upcoming.length} upcoming</span></div>
        {upcoming.length ? upcoming.slice(0,4).map(t => <CompactTxn key={t.id} t={t}/>) : <p className="muted">No upcoming transactions yet.</p>}
      </Card>
    </div>
  );
}

function Kpi({ title, value, sub, icon, dot, onClick }) {
  return (
    <button className="kpi" onClick={onClick}>
      <div className={`emoji-badge ${dot}`}>{icon}</div>
      <span className={`dot ${dot}`}></span>
      <p>{title}</p>
      <h2>{value}</h2>
      <small>{sub}</small>
    </button>
  );
}

function AssetsDebts({ state, setState, totals, setEditor, setMenuOpen, setHistoryMetric, saveSnapshot }) {
  const [editingBalances, setEditingBalances] = useState(false);
  const selectedSnapshot = state.monthSnapshots?.[state.selectedMonth];
  const prevSnapshot = state.monthSnapshots?.[addMonths(state.selectedMonth, -1)];

  const displayedAccounts = selectedSnapshot?.accounts || state.accounts;
  const accountsWithPrev = displayedAccounts.map(account => {
    const prevAccount = prevSnapshot?.accounts?.find(a => a.id === account.id);
    const previous = prevAccount ? Number(prevAccount.balance || 0) : Number(account.previous || 0);
    return { ...account, previous };
  });

  const assets = accountsWithPrev.filter(a => a.kind === "asset");
  const debts = accountsWithPrev.filter(a => a.kind === "debt");

  const updateBalance = (id, value) => {
    const numericValue = Number(value || 0);

    setState(s => {
      const existingSnapshot = s.monthSnapshots?.[s.selectedMonth];

      // If this month already has a snapshot, edit that snapshot directly.
      if (existingSnapshot) {
        const updatedAccounts = (existingSnapshot.accounts || s.accounts).map(a =>
          a.id === id ? { ...a, balance:numericValue } : a
        );

        const assets = updatedAccounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
        const debts = updatedAccounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);

        return {
          ...s,
          monthSnapshots: {
            ...s.monthSnapshots,
            [s.selectedMonth]: {
              ...existingSnapshot,
              accounts: updatedAccounts,
              assets,
              debts,
              net: assets - debts,
              updatedAt: new Date().toISOString()
            }
          }
        };
      }

      // If no snapshot exists yet, edit live account balances.
      // Previous movement still comes from prior month snapshot when available.
      const priorSnapshot = s.monthSnapshots?.[addMonths(s.selectedMonth, -1)];

      return {
        ...s,
        accounts: s.accounts.map(a => {
          if (a.id !== id) return a;
          const priorAccount = priorSnapshot?.accounts?.find(pa => pa.id === a.id);
          return {
            ...a,
            previous: priorAccount ? Number(priorAccount.balance || 0) : Number(a.previous || 0),
            balance:numericValue
          };
        })
      };
    });
  };

  const toggleBalanceEdit = () => {
    if (state.accounts.length === 0) {
      setEditor({ type:"account" });
      return;
    }
    setEditingBalances(value => !value);
  };

  return (
    <div className="screen">
      <ScreenTitle title="Assets & Debts" sub="Update balances month-to-month. Changes feed your Overview." setMenuOpen={setMenuOpen} />
      <MonthBar state={state} setState={setState} thin />

      {selectedSnapshot && (
        <div className="snapshot-banner">
          Historical snapshot · {editingBalances ? "editing enabled" : "locked"}
        </div>
      )}

      {state.accounts.length === 0 ? (
        <EmptyState title="No accounts yet" text="Add assets and debts to calculate net worth." action="Add account" onClick={()=>setEditor({ type:"account" })}/>
      ) : (
        <>
          <AccountGroup
            title={`Assets (${assets.length})`}
            sub="Enter this month's values; see last month + change."
            accounts={assets}
            updateBalance={updateBalance}
            readOnly={!!selectedSnapshot && !editingBalances}
          />
          <AccountGroup
            title={`Debts (${debts.length})`}
            sub="Enter this month's amounts owed; see last month + change."
            accounts={debts}
            updateBalance={updateBalance}
            readOnly={!!selectedSnapshot && !editingBalances}
          />
          <Card className="summary-list">
            <div onClick={()=>setHistoryMetric("assets")}><span>Assets (this month)</span><strong>{money(totals.assets)}</strong></div>
            <div onClick={()=>setHistoryMetric("debts")}><span>Debts (this month)</span><strong>{money(totals.debts)}</strong></div>
            <div className="bold" onClick={()=>setHistoryMetric("net")}><span>Net Worth</span><strong>{money(totals.net)}</strong></div>
            <button className="primary full" onClick={saveSnapshot}><Save size={18}/> Save {monthLabel(state.selectedMonth)} Snapshot</button>
          </Card>
        </>
      )}

      <button
        className={editingBalances ? "fab edit-active" : "fab"}
        onClick={toggleBalanceEdit}
        aria-label={editingBalances ? "Finish editing balances" : "Edit balances"}
        title={editingBalances ? "Done editing balances" : "Edit balances"}
      >
        {editingBalances ? <Save size={30}/> : <Pencil size={30}/>}
      </button>
    </div>
  );
}

function AccountGroup({ title, sub, accounts, updateBalance, readOnly }) {
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
              <span>
                Prev: {money(a.previous)} {delta < 0 ? "↓" : delta > 0 ? "↑" : "—"} {money(Math.abs(delta))}
              </span>
            </div>
            {readOnly ? (
              <div className="balance-display">{money(a.balance)}</div>
            ) : (
              <input value={a.balance} type="number" onChange={(e)=>updateBalance(a.id, e.target.value)} />
            )}
          </div>
        );
      })}
    </Card>
  );
}

function HistoryPage({ state, setState, totals, metric, setHistoryMetric, setMenuOpen }) {
  const rows = historyRows(state);
  const current = state.monthSnapshots?.[state.selectedMonth] || { assets:totals.assets, debts:totals.debts, net:totals.net, accounts:state.accounts };
  const titleMap = { net:"Net Worth", assets:"Total Assets", debts:"Total Debts" };

  return (
    <div className="screen">
      <ScreenTitle title="History" sub="Month-by-month financial summary." setMenuOpen={setMenuOpen} back={()=>setHistoryMetric(null)} />
      <MonthBar state={state} setState={setState} thin />

      <Card className="center-card">
        <p>{titleMap[metric]}</p>
        <h2 className={metric === "debts" ? "danger" : "success"}>{metric === "debts" ? "-" : ""}{money(current[metric] || 0)}</h2>
        <p>{titleMap[metric]} for {monthLabel(state.selectedMonth)}</p>
      </Card>

      <DonutCard title="What I Own" kind="asset" accounts={(current.accounts || []).filter(a=>a.kind==="asset")} />
      <DonutCard title="What I Owe" kind="debt" accounts={(current.accounts || []).filter(a=>a.kind==="debt")} />

      <Card className="history-table">
        <div className="table-head"><span>Month</span><span>Assets</span><span>Debts</span><span>Net · MoM</span></div>
        {rows.length ? rows.map((r, i) => {
          const prev = rows[i+1];
          const mom = prev ? r.net - prev.net : 0;
          return (
            <div className="history-row" key={r.key} onClick={()=>setState(s=>({...s, selectedMonth:r.key}))}>
              <span>{shortMonthLabel(r.key)}</span>
              <span>{money(r.assets)}</span>
              <span className="danger">-{money(r.debts)}</span>
              <span>
                <b className={r.net >= 0 ? "success":"danger"}>{money(r.net)}</b>
                <em className={mom >= 0 ? "mom good":"mom bad"}>{signedMoney(mom)} MoM</em>
              </span>
            </div>
          );
        }) : <p className="muted">No saved monthly snapshots yet. Save a snapshot from Assets & Debts.</p>}
      </Card>
    </div>
  );
}

function DonutCard({ title, kind, accounts }) {
  const total = accounts.reduce((s,a)=>s+Number(a.balance||0),0);
  const colors = kind === "asset" ? ["#3fa463","#63b77c","#91cda3","#c0e2ca"] : ["#e5292f","#ea5358","#f07d82","#f6a6a9"];
  const data = accounts.map((a, i)=>({ name:a.name, value:Number(a.balance||0), color:colors[i%colors.length] })).filter(d=>d.value>0);

  return (
    <Card className="donut-card">
      <h2>{title}</h2>
      {data.length ? (
        <div className="donut-layout">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={0}>
                  {data.map((d,i)=><Cell key={d.name} fill={d.color}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><b className={kind==="debt"?"danger":""}>{kind==="debt" ? "-" : ""}{money(total)}</b><span>total</span></div>
          </div>
          <div className="donut-legend">
            {data.map(d=>(
              <div key={d.name}><i style={{background:d.color}}></i><span>{d.name}</span><b className={kind==="debt"?"danger":""}>{kind==="debt" ? "-" : ""}{money(d.value)}</b></div>
            ))}
          </div>
        </div>
      ) : <p className="muted">No {kind === "asset" ? "assets" : "debts"} in this snapshot.</p>}
    </Card>
  );
}

function CashFlow({ state, totals, setEditor, setMenuOpen }) {
  const next7 = upcomingTransactions(state.transactions, 7);
  const recurringIncome = state.transactions.filter(t => t.recurring && t.type === "income");
  const recurringExpenses = state.transactions.filter(t => t.recurring && t.type === "expense");

  return (
    <div className="screen">
      <ScreenTitle title="Cash Flow" sub="See what's coming in and what's going out." setMenuOpen={setMenuOpen} />
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

function Goals({ state, setState, setEditor, setMenuOpen }) {
  const totals = computeTotals(state);
  const accountsForMonth = getAccountsForSelectedMonth(state);

  const toggle = (id) => setState(s => ({ ...s, goals:s.goals.map(g => g.id === id ? { ...g, open:!g.open } : g) }));
  const del = (id) => setState(s => ({ ...s, goals:s.goals.filter(g => g.id !== id) }));

  return (
    <div className="screen">
      <ScreenTitle title="Your Goals" sub="Big dreams? Let's make them happen — one goal at a time." setMenuOpen={setMenuOpen} />
      {state.goals.length ? state.goals.map(g => (
        <GoalCard
          key={g.id}
          g={g}
          totals={totals}
          accounts={accountsForMonth}
          toggle={toggle}
          del={del}
          setEditor={setEditor}
        />
      )) : (
        <EmptyState title="No goals yet" text="Add your first wealth goal and track progress." action="Add goal" onClick={()=>setEditor({ type:"goal" })}/>
      )}
      <button className="fab" onClick={()=>setEditor({ type:"goal" })}><Plus size={34}/></button>
    </div>
  );
}

function GoalCard({ g, totals, accounts, toggle, del, setEditor }) {
  const calc = calculateGoalProgress(g, totals, accounts);
  const pct = Math.round(calc.progress);
  const status = goalStatus(calc, g);

  return (
    <div className={`goal-card ${g.color || goalColorForType(g.goalType)} ${g.open ? "open":""}`}>
      <div className="goal-top" onClick={()=>toggle(g.id)}>
        <div className="goal-icon">{g.icon || goalIconForType(g.goalType)}</div>
        <div className="row-main">
          <h2>{g.name}</h2>
          <span>{goalTypeLabel(g.goalType)} · {calc.sourceLabel}</span>
        </div>
        <b>{pct}%</b>
        {g.open ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
      </div>
      {g.open && (
        <div className="goal-details">
          <div className="progress-line"><span>{money(calc.current)} / {money(calc.target)}</span><b>{pct}%</b></div>
          <div className="bar"><i style={{width:`${pct}%`}}></i></div>
          <dl>
            <dt>Goal type</dt><dd>{goalTypeLabel(g.goalType)}</dd>
            <dt>Target</dt><dd>{money(calc.target)}</dd>
            <dt>Current</dt><dd>{money(calc.current)}</dd>
            <dt>Remaining</dt><dd>{money(calc.remaining)}</dd>
            <dt>Deadline</dt><dd>{g.deadline ? new Date(g.deadline).toLocaleDateString("en-US", {month:"short", year:"numeric"}) : "—"}</dd>
          </dl>

          <div className={`pace-card ${status.kind}`}>
            <h3>{status.icon} {status.label}</h3>
            <span>{status.detail}</span>
            <p>{calc.monthlyNeeded > 0 ? `Need ${money(calc.monthlyNeeded)}/mo until deadline` : "No monthly pace needed."}</p>
          </div>

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

function Settings({ state, update, saveSnapshot, restoreSnapshot, setMenuOpen }) {
  return (
    <div className="screen">
      <ScreenTitle title="Settings" sub="Manage theme, local data, and Supabase snapshots." setMenuOpen={setMenuOpen} />
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
        <button onClick={saveSnapshot}><Save/> Save monthly snapshot</button>
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
          <label>Goal Type
            <select value={form.goalType} onChange={e=>change("goalType", e.target.value)}>
              <option value="netWorth">Net Worth Goal</option>
              <option value="accountGrowth">Account Growth Goal</option>
              <option value="debtPayoff">Debt Payoff Goal</option>
            </select>
          </label>

          {form.goalType === "netWorth" ? (
            <label>Metric<input value="Net Worth" disabled /></label>
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
          ) : (
            <>
              <label>Current Override<input type="number" value={form.current} onChange={e=>change("current", e.target.value)} placeholder="Only used if no account linked" /></label>
              <label>Target<input type="number" value={form.target} onChange={e=>change("target", e.target.value)} /></label>
            </>
          )}

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
  // Backward-compatible fallback for simple/manual goals.
  if (!g.target) return 0;
  return Math.max(0, Math.min(100, Number(g.current || 0) / Number(g.target || 1) * 100));
}

function getAccountsForSelectedMonth(state) {
  const snap = state.monthSnapshots?.[state.selectedMonth];
  return snap?.accounts || state.accounts || [];
}

function findAccount(accounts, goal) {
  if (!goal.accountId && !goal.account) return null;
  return accounts.find(a => a.id === goal.accountId || a.name === goal.account) || null;
}

function calculateGoalProgress(goal, totals, accounts) {
  const goalType = goal.goalType || inferGoalType(goal, accounts);
  const target = Number(goal.target || 0);
  const start = Number(goal.start || goal.startAmount || 0);
  const linkedAccount = findAccount(accounts, goal);

  let current = Number(goal.current || 0);
  let sourceLabel = goal.account || "Manual";

  if (goalType === "netWorth") {
    current = Number(totals.net || 0);
    sourceLabel = "Net Worth";
  }

  if (goalType === "accountGrowth") {
    current = linkedAccount ? Number(linkedAccount.balance || 0) : Number(goal.current || 0);
    sourceLabel = linkedAccount?.name || goal.account || "Manual account";
  }

  if (goalType === "debtPayoff") {
    current = linkedAccount ? Number(linkedAccount.balance || 0) : Number(goal.current || 0);
    sourceLabel = linkedAccount?.name || goal.account || "Manual debt";

    const originalDebt = start || Number(goal.originalDebt || current || 0);
    const paidOff = Math.max(0, originalDebt - current);
    const progress = originalDebt > 0 ? clamp((paidOff / originalDebt) * 100) : 0;
    const remaining = Math.max(0, current);
    return {
      goalType,
      current,
      target: 0,
      start: originalDebt,
      progress,
      remaining,
      sourceLabel,
      monthlyNeeded: monthlyNeeded(remaining, goal.deadline)
    };
  }

  const progress = target > 0 ? clamp((current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);

  return {
    goalType,
    current,
    target,
    start,
    progress,
    remaining,
    sourceLabel,
    monthlyNeeded: monthlyNeeded(remaining, goal.deadline)
  };
}

function inferGoalType(goal, accounts) {
  if (goal.account === "Net Worth" || goal.account === "NET_WORTH") return "netWorth";
  const linked = findAccount(accounts, goal);
  if (linked?.kind === "debt" || Number(goal.target || 0) === 0) return "debtPayoff";
  return "accountGrowth";
}

function clamp(n) {
  return Math.max(0, Math.min(100, Number(n || 0)));
}

function monthlyNeeded(remaining, deadline) {
  if (!deadline || remaining <= 0) return 0;
  const now = new Date();
  const end = new Date(deadline);
  if (end <= now) return remaining;
  const months = Math.max(1, ((end.getFullYear() - now.getFullYear()) * 12) + (end.getMonth() - now.getMonth()));
  return Math.ceil(remaining / months);
}

function goalStatus(calc, goal) {
  if (calc.progress >= 100) {
    return { kind:"complete", icon:"🎉", label:"Complete", detail:"Goal reached" };
  }

  if (!goal.deadline) {
    return { kind:"active", icon:"🎯", label:"Active", detail:"No deadline set" };
  }

  const need = calc.monthlyNeeded;
  if (need <= 0) {
    return { kind:"active", icon:"🎯", label:"Active", detail:"On track" };
  }

  return { kind:"active", icon:"📈", label:"In Progress", detail:`${Math.round(calc.progress)}% complete` };
}

function goalTypeLabel(type) {
  return {
    netWorth: "Net Worth Goal",
    accountGrowth: "Account Growth Goal",
    debtPayoff: "Debt Payoff Goal"
  }[type || "accountGrowth"] || "Goal";
}

function goalIconForType(type) {
  return {
    netWorth: "🎯",
    accountGrowth: "💼",
    debtPayoff: "⚡"
  }[type || "accountGrowth"] || "🎯";
}

function goalColorForType(type) {
  return {
    netWorth: "purple",
    accountGrowth: "green",
    debtPayoff: "red"
  }[type || "accountGrowth"] || "green";
}

function upcomingTransactions(transactions, days) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  }).sort((a,b)=>new Date(a.date)-new Date(b.date));
}

function historyRows(state) {
  return Object.entries(state.monthSnapshots || {})
    .map(([key, snap]) => ({ key, assets:Number(snap.assets||0), debts:Number(snap.debts||0), net:Number(snap.net||0), accounts:snap.accounts||[] }))
    .sort((a,b)=>b.key.localeCompare(a.key));
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
