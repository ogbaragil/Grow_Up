import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Moon, Sun, Wallet, Target, Settings, LayoutDashboard, PiggyBank, TrendingUp, Trash2, Pencil, Archive, RotateCcw, X, Check } from 'lucide-react';
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

const initialState = { onboarded:false, firstName:'', theme:'dark', accounts:[], goals:[] };

function normalizeState(saved){
  const merged = { ...initialState, ...(saved || {}) };
  merged.accounts = Array.isArray(merged.accounts) ? merged.accounts.map(a => ({ archived:false, ...a, balance:Number(a.balance||0) })) : [];
  merged.goals = Array.isArray(merged.goals) ? merged.goals : [];
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
    return {assets, debts, netWorth: assets-debts};
  },[activeAccounts]);

  const update = patch => setState(s=>({...s,...patch}));
  const updateAccounts = accounts => update({ accounts });
  const seedDemo = () => update({ onboarded:true, firstName:'Gil', accounts:demoAccounts, goals:[{id:makeId(),name:'Achieve $750k Net Worth', targetAmount:750000, accountId:'NET_WORTH'}] });

  const saveSnapshot = async () => {
    if(!supabase){ setSyncStatus('Add Supabase variables in Cloudflare to enable cloud sync.'); return; }
    const { error } = await supabase.from('growup_snapshots').insert({ app_state: state });
    setSyncStatus(error ? `Supabase sync failed: ${error.message}` : `Snapshot saved to Supabase at ${new Date().toLocaleTimeString()}.`);
  };

  if(!state.onboarded) return <Onboarding update={update} seedDemo={seedDemo} />;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>GV</span><div><strong>Grow UP</strong><small>Personal finance PWA</small></div></div>
      <Nav tab={tab} setTab={setTab}/>
    </aside>
    <main className="main">
      <header className="topbar"><div><p>Welcome back,</p><h1>{state.firstName || 'Gil'}</h1></div><button className="icon-btn" onClick={()=>update({theme:state.theme==='dark'?'light':'dark'})}>{state.theme==='dark'?<Sun/>:<Moon/>}</button></header>
      {tab==='dashboard' && <Dashboard totals={totals} accounts={activeAccounts} archivedCount={archivedAccounts.length} goals={state.goals}/>} 
      {tab==='accounts' && <Accounts accounts={state.accounts} setAccounts={updateAccounts}/>} 
      {tab==='goals' && <Goals goals={state.goals} setGoals={goals=>update({goals})} accounts={activeAccounts}/>} 
      {tab==='settings' && <SettingsPanel state={state} update={update} saveSnapshot={saveSnapshot} syncStatus={syncStatus}/>} 
    </main>
  </div>
}

function Onboarding({update, seedDemo}){ 
  const [name,setName]=useState(''); 
  return <div className="onboarding"><div className="welcome-card"><div className="logo">GV</div><h1>Welcome to Grow UP</h1><p>Your personal finance companion for tracking assets, debts and goals.</p><button onClick={seedDemo}>Try Demo</button><div className="divider">or</div><input placeholder="Your first name" value={name} onChange={e=>setName(e.target.value)}/><button className="secondary" disabled={!name.trim()} onClick={()=>update({onboarded:true, firstName:name.trim()})}>Start with my data</button></div></div> 
}

function Nav({tab,setTab}){ 
  const items=[['dashboard',LayoutDashboard],['accounts',Wallet],['goals',Target],['settings',Settings]]; 
  return <nav>{items.map(([id,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={18}/>{id}</button>)}</nav> 
}

function Dashboard({totals,accounts,archivedCount,goals}){ 
  return <section>
    <div className="grid"><Metric icon={<PiggyBank/>} label="Assets" value={money(totals.assets)}/><Metric icon={<Wallet/>} label="Debts" value={money(totals.debts)}/><Metric icon={<TrendingUp/>} label="Net Worth" value={money(totals.netWorth)}/><Metric icon={<Target/>} label="Goals" value={goals.length}/></div>
    <div className="panel"><h2>Quick overview</h2><p>You have {accounts.length} active accounts and {goals.length} active goals. {archivedCount ? `${archivedCount} account${archivedCount>1?'s are':' is'} archived and excluded from totals.` : 'No archived accounts yet.'}</p></div>
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

function Goals({goals,setGoals,accounts}){ 
  const [name,setName]=useState(''); const [target,setTarget]=useState(''); const [accountId,setAccountId]=useState('NET_WORTH');
  const add=()=>{ if(!name.trim()) return; setGoals([...goals,{id:makeId(),name,targetAmount:Number(target||0),accountId}]); setName(''); setTarget('');}; 
  return <section className="panel"><h2>Goals</h2><div className="form-row"><input placeholder="Goal name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Target amount" type="number" value={target} onChange={e=>setTarget(e.target.value)}/><select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="NET_WORTH">Net Worth</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button onClick={add}><Plus size={16}/>Add</button></div><div className="list">{goals.map(g=><div className="list-row" key={g.id}><span>{g.name}<small>{g.accountId==='NET_WORTH'?'Net Worth':'Account goal'}</small></span><strong>{money(g.targetAmount)}</strong><button className="ghost" onClick={()=>setGoals(goals.filter(x=>x.id!==g.id))}><Trash2 size={16}/></button></div>)}</div></section> 
}

function SettingsPanel({state,update,saveSnapshot,syncStatus}){ 
  return <section className="panel"><h2>Settings</h2><p>Theme: {state.theme}</p><button onClick={()=>update({theme:state.theme==='dark'?'light':'dark'})}>Toggle theme</button><button onClick={saveSnapshot}>Save snapshot to Supabase</button><p className="status">{syncStatus}</p><button className="danger" onClick={()=>{localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('growup_pwa_state_v1'); location.reload();}}>Reset local data</button></section> 
}

createRoot(document.getElementById('root')).render(<App/>);
