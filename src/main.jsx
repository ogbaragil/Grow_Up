import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Moon, Sun, Wallet, Target, Settings, LayoutDashboard, PiggyBank, TrendingUp, Trash2, Pencil, Archive, RotateCcw, X, Check, ReceiptText, CalendarDays, Flag } from 'lucide-react';
import { supabase } from './supabaseClient';
import './styles.css';

const STORAGE_KEY = 'growup_pwa_state_v2';

const makeId = () => crypto.randomUUID();
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n||0));

const demoAccounts = [
  { id: makeId(), name: 'Retirement Account', category: 'asset', balance: 100000, archived: false },
  { id: makeId(), name: 'Savings Account', category: 'asset', balance: 50000, archived: false },
  { id: makeId(), name: 'Brokerage Account', category: 'asset', balance: 454000, archived: false },
  { id: makeId(), name: 'Credit Card', category: 'debt', balance: 5000, archived: false },
  { id: makeId(), name: 'Personal Loan', category: 'debt', balance: 75000, archived: false },
];

const initialState = { onboarded:false, firstName:'', theme:'dark', accounts:[], goals:[], transactions:[] };

function normalizeState(saved){
  const merged = { ...initialState, ...(saved || {}) };
  merged.accounts = Array.isArray(merged.accounts) ? merged.accounts.map(a => ({ archived:false, ...a, balance:Number(a.balance||0) })) : [];
  merged.goals = Array.isArray(merged.goals) ? merged.goals.map(g => ({ deadline:'', status:'active', ...g, targetAmount:Number(g.targetAmount||0), currentAmount:g.currentAmount==null?'':Number(g.currentAmount||0) })) : [];
  merged.transactions = Array.isArray(merged.transactions) ? merged.transactions.map(t => ({ type:'expense', date:new Date().toISOString().slice(0,10), category:'General', note:'', ...t, amount:Number(t.amount||0) })) : [];
  return merged;
}

function App(){
  const [state,setState] = useState(()=>{
    try {
      const v2 = localStorage.getItem(STORAGE_KEY);
      const v1 = localStorage.getItem('growup_pwa_state_v1');
      return normalizeState(JSON.parse(v2 || v1) || initialState);
    } catch { return initialState }
  });
  const [tab,setTab] = useState('dashboard');
  const [syncStatus,setSyncStatus] = useState('Local-first mode');

  useEffect(()=>localStorage.setItem(STORAGE_KEY, JSON.stringify(state)),[state]);
  useEffect(()=>{document.documentElement.dataset.theme=state.theme},[state.theme]);
  useEffect(()=>{ if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js') },[]);

  const activeAccounts = useMemo(()=>state.accounts.filter(a=>!a.archived),[state.accounts]);
  const archivedAccounts = useMemo(()=>state.accounts.filter(a=>a.archived),[state.accounts]);
  const totals = useMemo(()=>{
    const assets = activeAccounts.filter(a=>a.category==='asset').reduce((s,a)=>s+Number(a.balance||0),0);
    const debts = activeAccounts.filter(a=>a.category==='debt').reduce((s,a)=>s+Number(a.balance||0),0);
    const income = state.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0);
    const expenses = state.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount||0),0);
    return {assets, debts, netWorth: assets-debts, income, expenses, cashFlow: income-expenses};
  },[activeAccounts,state.transactions]);

  const update = patch => setState(s=>({...s,...patch}));
  const updateAccounts = accounts => update({ accounts });
  const seedDemo = () => update({ onboarded:true, firstName:'Gil', accounts:demoAccounts, goals:[{id:makeId(),name:'Achieve $750k Net Worth', targetAmount:750000, accountId:'NET_WORTH'}], transactions:[{id:makeId(),type:'income',description:'Paycheck',category:'Salary',amount:4500,date:new Date().toISOString().slice(0,10),accountId:'',note:'Demo income'},{id:makeId(),type:'expense',description:'Groceries',category:'Food',amount:142,date:new Date().toISOString().slice(0,10),accountId:'',note:'Demo expense'}] });

  const saveSnapshot = async () => {
    if(!supabase){ setSyncStatus('Add Supabase variables in Cloudflare to enable cloud sync.'); return; }
    const { error } = await supabase.from('growup_snapshots').insert({ app_state: state });
    setSyncStatus(error ? `Supabase sync failed: ${error.message}` : `Snapshot saved to Supabase at ${new Date().toLocaleTimeString()}.`);
  };

  const restoreLatestSnapshot = async () => {
    if(!supabase){ setSyncStatus('Add Supabase variables in Cloudflare to enable cloud sync.'); return; }
    const confirmed = confirm('Restore your latest Supabase snapshot? This will replace the data currently stored on this device.');
    if(!confirmed) return;

    const { data, error } = await supabase
      .from('growup_snapshots')
      .select('app_state,state,created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if(error){
      setSyncStatus(`Supabase restore failed: ${error.message}`);
      return;
    }

    const snapshot = data?.app_state || data?.state;
    if(!snapshot){
      setSyncStatus('No Supabase snapshot found yet. Save a snapshot first.');
      return;
    }

    const restored = normalizeState(snapshot);
    setState(restored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    setSyncStatus(`Restored latest Supabase snapshot from ${new Date(data.created_at).toLocaleString()}.`);
  };

  if(!state.onboarded) return <Onboarding update={update} seedDemo={seedDemo} />;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>GV</span><div><strong>Grow UP</strong><small>Personal finance PWA</small></div></div>
      <Nav tab={tab} setTab={setTab}/>
    </aside>
    <main className="main">
      <header className="topbar"><div><p>Welcome back,</p><h1>{state.firstName || 'Gil'}</h1></div><button className="icon-btn" onClick={()=>update({theme:state.theme==='dark'?'light':'dark'})}>{state.theme==='dark'?<Sun/>:<Moon/>}</button></header>
      {tab==='dashboard' && <Dashboard totals={totals} accounts={activeAccounts} archivedCount={archivedAccounts.length} goals={state.goals} transactions={state.transactions} setTab={setTab}/>}  
      {tab==='accounts' && <Accounts accounts={state.accounts} setAccounts={updateAccounts}/>} 
      {tab==='transactions' && <Transactions transactions={state.transactions} setTransactions={transactions=>update({transactions})} accounts={activeAccounts}/>} 
      {tab==='goals' && <Goals goals={state.goals} setGoals={goals=>update({goals})} accounts={activeAccounts}/>} 
      {tab==='settings' && <SettingsPanel state={state} update={update} saveSnapshot={saveSnapshot} restoreLatestSnapshot={restoreLatestSnapshot} syncStatus={syncStatus}/>} 
    </main>
  </div>
}

function Onboarding({update, seedDemo}){ 
  const [name,setName]=useState(''); 
  return <div className="onboarding"><div className="welcome-card"><div className="logo">GV</div><h1>Welcome to Grow UP</h1><p>Your personal finance companion for tracking assets, debts and goals.</p><button onClick={seedDemo}>Try Demo</button><div className="divider">or</div><input placeholder="Your first name" value={name} onChange={e=>setName(e.target.value)}/><button className="secondary" disabled={!name.trim()} onClick={()=>update({onboarded:true, firstName:name.trim()})}>Start with my data</button></div></div> 
}

function Nav({tab,setTab}){ 
  const items=[['dashboard',LayoutDashboard],['accounts',Wallet],['transactions',ReceiptText],['goals',Target],['settings',Settings]]; 
  return <nav>{items.map(([id,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={18}/>{id}</button>)}</nav> 
}

function Dashboard({totals,accounts,archivedCount,goals,transactions,setTab}){ 
  const recent = [...transactions].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
  return <section>
    <div className="grid"><Metric icon={<PiggyBank/>} label="Assets" value={money(totals.assets)}/><Metric icon={<Wallet/>} label="Debts" value={money(totals.debts)}/><Metric icon={<TrendingUp/>} label="Net Worth" value={money(totals.netWorth)}/><Metric icon={<ReceiptText/>} label="Cash Flow" value={money(totals.cashFlow)}/></div>
    <div className="panel"><div className="section-head"><div><h2>Quick overview</h2><p>You have {accounts.length} active accounts, {goals.length} active goals, and {transactions.length} transactions. {archivedCount ? `${archivedCount} account${archivedCount>1?'s are':' is'} archived and excluded from totals.` : 'No archived accounts yet.'}</p></div><button className="secondary small-btn" onClick={()=>setTab('transactions')}>Add transaction</button></div></div>
    <div className="panel"><div className="section-head"><div><h2>Goal summary</h2><p>Track the next milestone you are working toward.</p></div><button className="secondary small-btn" onClick={()=>setTab('goals')}>View goals</button></div><div className="list">{goals.length===0 && <div className="empty">No goals yet.</div>}{goals.slice(0,3).map(g=>{const pct=Math.min(100, Math.round(((Number(g.currentAmount)||0)/(Number(g.targetAmount)||1))*100)); return <div className="list-row" key={g.id}><span>{g.name}<small>{pct}% complete · {g.deadline ? `Due ${g.deadline}` : 'No deadline'}</small><span className="progress-track"><span style={{width:`${pct}%`}} /></span></span><strong>{money(g.currentAmount || 0)} / {money(g.targetAmount)}</strong></div>})}</div></div>
    <div className="panel"><div className="section-head"><div><h2>Recent transactions</h2><p>Your latest income and expenses.</p></div><button className="secondary small-btn" onClick={()=>setTab('transactions')}>View all</button></div><div className="list">{recent.length===0 && <div className="empty">No transactions yet.</div>}{recent.map(t=><div className={`list-row transaction-row ${t.type==='income'?'income-row':'expense-row'}`} key={t.id}><span>{t.description}<small>{t.date} · {t.category || 'General'} · {t.type}</small></span><strong className={t.type==='income'?'good':'bad'}>{t.type==='income'?'+':'-'}{money(t.amount)}</strong></div>)}</div></div>
  </section> 
}
function Metric({icon,label,value}){ return <div className="metric"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div> }

function AccountForm({onSave,onCancel,initial}){
  const [name,setName]=useState(initial?.name || '');
  const [balance,setBalance]=useState(initial?.balance ?? '');
  const [category,setCategory]=useState(initial?.category || 'asset');
  const valid = name.trim().length >= 2 && Number.isFinite(Number(balance || 0));
  const submit = (e) => {
    e.preventDefault();
    if(!valid) return;
    onSave({ name:name.trim(), category, balance:Number(balance || 0) });
  };
  return <form className="form-row account-form" onSubmit={submit}>
    <input placeholder="Account name" value={name} onChange={e=>setName(e.target.value)}/>
    <input placeholder="Balance" inputMode="decimal" type="number" value={balance} onChange={e=>setBalance(e.target.value)}/>
    <select value={category} onChange={e=>setCategory(e.target.value)}><option value="asset">Asset</option><option value="debt">Debt</option></select>
    <button disabled={!valid} type="submit"><Check size={16}/>{initial?'Save':'Add'}</button>
    {onCancel && <button className="ghost" type="button" onClick={onCancel}><X size={16}/>Cancel</button>}
  </form>
}

function Accounts({accounts,setAccounts}){ 
  const [editingId,setEditingId]=useState(null); 
  const [showArchived,setShowArchived]=useState(false);
  const visible = showArchived ? accounts : accounts.filter(a=>!a.archived);
  const activeCount = accounts.filter(a=>!a.archived).length;
  const archivedCount = accounts.length - activeCount;
  const add = payload => setAccounts([...accounts,{id:makeId(), archived:false, ...payload}]);
  const patch = (id,payload) => setAccounts(accounts.map(a=>a.id===id?{...a,...payload}:a));
  const archive = id => patch(id,{archived:true});
  const restore = id => patch(id,{archived:false});
  const removeForever = id => setAccounts(accounts.filter(a=>a.id!==id));
  return <section className="panel"><div className="section-head"><div><h2>Accounts</h2><p>Create, edit, archive, restore, or delete accounts. Dashboard totals only use active accounts.</p></div><button className="secondary small-btn" onClick={()=>setShowArchived(!showArchived)}>{showArchived?'Hide archived':'Show archived'} ({archivedCount})</button></div>
    <AccountForm onSave={add}/>
    <div className="list">
      {visible.length === 0 && <div className="empty">No {showArchived?'':'active '}accounts yet.</div>}
      {visible.map(a=> editingId===a.id ?
        <div className="edit-card" key={a.id}><AccountForm initial={a} onSave={payload=>{patch(a.id,payload); setEditingId(null)}} onCancel={()=>setEditingId(null)}/></div>
        : <div className={`list-row ${a.archived?'muted-row':''}`} key={a.id}>
          <span>{a.name}<small>{a.category}{a.archived?' · archived':''}</small></span>
          <strong>{money(a.balance)}</strong>
          <div className="row-actions">
            <button className="ghost" title="Edit" onClick={()=>setEditingId(a.id)}><Pencil size={16}/></button>
            {a.archived ? <button className="ghost" title="Restore" onClick={()=>restore(a.id)}><RotateCcw size={16}/></button> : <button className="ghost" title="Archive" onClick={()=>archive(a.id)}><Archive size={16}/></button>}
            <button className="ghost danger-text" title="Delete forever" onClick={()=>confirm(`Delete ${a.name} forever?`) && removeForever(a.id)}><Trash2 size={16}/></button>
          </div>
        </div>)}
    </div>
  </section> 
}


function TransactionForm({onSave,onCancel,initial,accounts}){
  const [type,setType]=useState(initial?.type || 'expense');
  const [description,setDescription]=useState(initial?.description || '');
  const [category,setCategory]=useState(initial?.category || (initial?.type === 'income' ? 'Salary' : 'General'));
  const [amount,setAmount]=useState(initial?.amount ?? '');
  const [date,setDate]=useState(initial?.date || new Date().toISOString().slice(0,10));
  const [accountId,setAccountId]=useState(initial?.accountId || '');
  const [note,setNote]=useState(initial?.note || '');
  const valid = description.trim().length >= 2 && Number(amount) > 0;
  const submit = e => {
    e.preventDefault();
    if(!valid) return;
    onSave({ type, description:description.trim(), category:category.trim() || 'General', amount:Number(amount), date, accountId, note:note.trim() });
  };
  return <form className="form-row transaction-form tx-form-v2" onSubmit={submit}>
    <select value={type} onChange={e=>{setType(e.target.value); if(!category || category==='General' || category==='Salary') setCategory(e.target.value==='income'?'Salary':'General')}}><option value="income">Income</option><option value="expense">Expense</option></select>
    <input placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)}/>
    <input placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)}/>
    <input placeholder="Amount" inputMode="decimal" type="number" value={amount} onChange={e=>setAmount(e.target.value)}/>
    <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
    <select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">No account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <input placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
    <button disabled={!valid} type="submit"><Check size={16}/>{initial?'Save':'Add'}</button>
    {onCancel && <button className="ghost" type="button" onClick={onCancel}><X size={16}/>Cancel</button>}
  </form>
}

function Transactions({transactions,setTransactions,accounts}){
  const [editingId,setEditingId]=useState(null);
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0);
  const expenses = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount||0),0);
  const filtered = transactions.filter(t=>{
    const matchesType = filter==='all' || t.type===filter;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [t.description,t.category,t.note].some(v=>String(v||'').toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });
  const sorted = [...filtered].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const add = payload => setTransactions([{id:makeId(), ...payload}, ...transactions]);
  const patch = (id,payload) => setTransactions(transactions.map(t=>t.id===id?{...t,...payload}:t));
  const remove = id => setTransactions(transactions.filter(t=>t.id!==id));
  const accountName = id => accounts.find(a=>a.id===id)?.name || 'No account';
  return <section className="panel"><div className="section-head"><div><h2>Transactions</h2><p>Add income and expenses. Cash flow updates automatically on the dashboard.</p></div></div>
    <div className="mini-grid"><Metric icon={<TrendingUp/>} label="Income" value={money(income)}/><Metric icon={<Wallet/>} label="Expenses" value={money(expenses)}/><Metric icon={<ReceiptText/>} label="Net Cash Flow" value={money(income-expenses)}/></div>
    <TransactionForm onSave={add} accounts={accounts}/>
    <div className="filter-bar"><input placeholder="Search description, category, or note" value={search} onChange={e=>setSearch(e.target.value)}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All transactions</option><option value="income">Income only</option><option value="expense">Expenses only</option></select></div>
    <div className="list">
      {sorted.length===0 && <div className="empty">No matching transactions. Add one above or clear filters.</div>}
      {sorted.map(t=> editingId===t.id ?
        <div className="edit-card" key={t.id}><TransactionForm initial={t} accounts={accounts} onSave={payload=>{patch(t.id,payload); setEditingId(null)}} onCancel={()=>setEditingId(null)}/></div>
        : <div className={`list-row transaction-row ${t.type==='income'?'income-row':'expense-row'}`} key={t.id}>
          <span>{t.description}<small>{t.date} · {t.category || 'General'} · {accountName(t.accountId)} · {t.type}{t.note ? ` · ${t.note}` : ''}</small></span>
          <strong className={t.type==='income'?'good':'bad'}>{t.type==='income'?'+':'-'}{money(t.amount)}</strong>
          <div className="row-actions"><button className="ghost" title="Edit" onClick={()=>setEditingId(t.id)}><Pencil size={16}/></button><button className="ghost danger-text" title="Delete" onClick={()=>confirm(`Delete ${t.description}?`) && remove(t.id)}><Trash2 size={16}/></button></div>
        </div>)}
    </div>
  </section>
}


function GoalForm({onSave,onCancel,initial,accounts,totals}){
  const [name,setName]=useState(initial?.name || '');
  const [target,setTarget]=useState(initial?.targetAmount ?? '');
  const [current,setCurrent]=useState(initial?.currentAmount ?? '');
  const [deadline,setDeadline]=useState(initial?.deadline || '');
  const [accountId,setAccountId]=useState(initial?.accountId || 'NET_WORTH');
  const [status,setStatus]=useState(initial?.status || 'active');
  const valid = name.trim().length >= 2 && Number(target) > 0;
  const accountCurrent = accountId === 'NET_WORTH' ? totals.netWorth : Number(accounts.find(a=>a.id===accountId)?.balance || 0);
  const submit = e => {
    e.preventDefault();
    if(!valid) return;
    onSave({ name:name.trim(), targetAmount:Number(target), currentAmount: current === '' ? accountCurrent : Number(current), deadline, accountId, status });
  };
  return <form className="form-row goal-form-v2" onSubmit={submit}>
    <input placeholder="Goal name" value={name} onChange={e=>setName(e.target.value)}/>
    <input placeholder="Target amount" type="number" inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)}/>
    <input placeholder={`Current (${money(accountCurrent)})`} type="number" inputMode="decimal" value={current} onChange={e=>setCurrent(e.target.value)}/>
    <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/>
    <select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="NET_WORTH">Net Worth</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <select value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Active</option><option value="completed">Completed</option><option value="paused">Paused</option></select>
    <button disabled={!valid} type="submit"><Check size={16}/>{initial?'Save':'Add'}</button>
    {onCancel && <button className="ghost" type="button" onClick={onCancel}><X size={16}/>Cancel</button>}
  </form>
}

function Goals({goals,setGoals,accounts}){
  const [editingId,setEditingId]=useState(null);
  const [filter,setFilter]=useState('active');
  const totals = useMemo(()=>{
    const assets = accounts.filter(a=>a.category==='asset').reduce((s,a)=>s+Number(a.balance||0),0);
    const debts = accounts.filter(a=>a.category==='debt').reduce((s,a)=>s+Number(a.balance||0),0);
    return { assets, debts, netWorth: assets-debts };
  },[accounts]);
  const add = payload => setGoals([{id:makeId(), ...payload}, ...goals]);
  const patch = (id,payload) => setGoals(goals.map(g=>g.id===id?{...g,...payload}:g));
  const remove = id => setGoals(goals.filter(g=>g.id!==id));
  const visible = goals.filter(g=>filter==='all' || (g.status || 'active')===filter);
  const goalStats = useMemo(()=>{
    const active = goals.filter(g=>(g.status || 'active')==='active');
    const completed = goals.filter(g=>(g.status || 'active')==='completed');
    const avg = goals.length ? Math.round(goals.reduce((s,g)=>s+Math.min(100, ((Number(g.currentAmount)||0)/(Number(g.targetAmount)||1))*100),0)/goals.length) : 0;
    return { active: active.length, completed: completed.length, avg };
  },[goals]);
  const accountLabel = id => id==='NET_WORTH' ? 'Net Worth' : accounts.find(a=>a.id===id)?.name || 'Account goal';
  const progress = g => Math.min(100, Math.max(0, Math.round(((Number(g.currentAmount)||0)/(Number(g.targetAmount)||1))*100)));
  const monthlyNeeded = g => {
    if(!g.deadline) return null;
    const now = new Date(); const due = new Date(g.deadline + 'T00:00:00');
    const months = Math.max(1, Math.ceil((due - now) / (1000*60*60*24*30.4375)));
    const remaining = Math.max(0, Number(g.targetAmount||0) - Number(g.currentAmount||0));
    return remaining / months;
  };
  return <section className="panel"><div className="section-head"><div><h2>Goals</h2><p>Set financial targets, track progress, and estimate what you need monthly to stay on pace.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="active">Active goals</option><option value="completed">Completed</option><option value="paused">Paused</option><option value="all">All goals</option></select></div>
    <div className="mini-grid"><Metric icon={<Target/>} label="Active Goals" value={goalStats.active}/><Metric icon={<Check/>} label="Completed" value={goalStats.completed}/><Metric icon={<Flag/>} label="Average Progress" value={`${goalStats.avg}%`}/></div>
    <GoalForm onSave={add} accounts={accounts} totals={totals}/>
    <div className="list">
      {visible.length===0 && <div className="empty">No {filter==='all'?'':filter} goals yet.</div>}
      {visible.map(g=> editingId===g.id ?
        <div className="edit-card" key={g.id}><GoalForm initial={g} accounts={accounts} totals={totals} onSave={payload=>{patch(g.id,payload); setEditingId(null)}} onCancel={()=>setEditingId(null)}/></div>
        : <div className={`list-row goal-row ${g.status==='completed'?'completed-row':''}`} key={g.id}>
          <span><strong>{g.name}</strong><small>{accountLabel(g.accountId)} · {(g.status || 'active')} {g.deadline ? `· Due ${g.deadline}` : '· No deadline'}{monthlyNeeded(g) !== null ? ` · ${money(monthlyNeeded(g))}/mo needed` : ''}</small><span className="progress-track"><span style={{width:`${progress(g)}%`}} /></span></span>
          <strong>{progress(g)}%<small>{money(g.currentAmount || 0)} / {money(g.targetAmount)}</small></strong>
          <div className="row-actions"><button className="ghost" title="Edit" onClick={()=>setEditingId(g.id)}><Pencil size={16}/></button><button className="ghost" title="Mark complete" onClick={()=>patch(g.id,{status:g.status==='completed'?'active':'completed'})}><Check size={16}/></button><button className="ghost danger-text" title="Delete" onClick={()=>confirm(`Delete ${g.name}?`) && remove(g.id)}><Trash2 size={16}/></button></div>
        </div>)}
    </div>
  </section>
}


function SettingsPanel({state,update,saveSnapshot,restoreLatestSnapshot,syncStatus}){ 
  return <section className="panel"><h2>Settings</h2><p>Theme: {state.theme}</p><button onClick={()=>update({theme:state.theme==='dark'?'light':'dark'})}>Toggle theme</button><button onClick={saveSnapshot}>Save snapshot to Supabase</button><button onClick={restoreLatestSnapshot}>Restore latest from Supabase</button><p className="status">{syncStatus}</p><button className="danger" onClick={()=>{localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('growup_pwa_state_v1'); location.reload();}}>Reset local data</button></section> 
}

createRoot(document.getElementById('root')).render(<App/>);
