import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Moon, Sun, Wallet, Target, Settings, LayoutDashboard, PiggyBank, TrendingUp, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import './styles.css';

const STORAGE_KEY = 'growup_pwa_state_v1';
const demoAccounts = [
  { id: crypto.randomUUID(), name: 'Retirement Account', category: 'asset', balance: 100000 },
  { id: crypto.randomUUID(), name: 'Savings Account', category: 'asset', balance: 50000 },
  { id: crypto.randomUUID(), name: 'Credit Card', category: 'debt', balance: 5000 },
  { id: crypto.randomUUID(), name: 'Personal Loan', category: 'debt', balance: 30000 },
];
const initialState = { onboarded:false, firstName:'', theme:'dark', accounts:[], goals:[] };
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n||0));

function App(){
  const [state,setState] = useState(()=>{ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState } catch { return initialState }});
  const [tab,setTab] = useState('dashboard');
  const [syncStatus,setSyncStatus] = useState('Local-first mode');
  useEffect(()=>localStorage.setItem(STORAGE_KEY, JSON.stringify(state)),[state]);
  useEffect(()=>{document.documentElement.dataset.theme=state.theme},[state.theme]);
  useEffect(()=>{ if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js') },[]);
  const totals = useMemo(()=>{
    const assets = state.accounts.filter(a=>a.category==='asset').reduce((s,a)=>s+Number(a.balance||0),0);
    const debts = state.accounts.filter(a=>a.category==='debt').reduce((s,a)=>s+Number(a.balance||0),0);
    return {assets, debts, netWorth: assets-debts};
  },[state.accounts]);
  const update = patch => setState(s=>({...s,...patch}));
  const seedDemo = () => update({ onboarded:true, firstName:'Gil', accounts:demoAccounts, goals:[{id:crypto.randomUUID(),name:'Achieve $150k Net Worth', targetAmount:150000, accountId:'NET_WORTH'}] });
  const saveSnapshot = async () => {
    if(!supabase){ setSyncStatus('Add Supabase variables in Cloudflare to enable cloud sync.'); return; }
    const { error } = await supabase.from('growup_snapshots').insert({ app_state: state });
    setSyncStatus(error ? `Supabase sync failed: ${error.message}` : 'Snapshot saved to Supabase.');
  };
  if(!state.onboarded) return <Onboarding update={update} seedDemo={seedDemo} />;
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span>GV</span><div><strong>Grow UP</strong><small>PWA starter</small></div></div><Nav tab={tab} setTab={setTab}/></aside>
    <main className="main"><header className="topbar"><div><p>Welcome back,</p><h1>{state.firstName || 'Gil'}</h1></div><button className="icon-btn" onClick={()=>update({theme:state.theme==='dark'?'light':'dark'})}>{state.theme==='dark'?<Sun/>:<Moon/>}</button></header>
      {tab==='dashboard' && <Dashboard totals={totals} accounts={state.accounts} goals={state.goals}/>} 
      {tab==='accounts' && <Accounts accounts={state.accounts} setAccounts={accounts=>update({accounts})}/>} 
      {tab==='goals' && <Goals goals={state.goals} setGoals={goals=>update({goals})} accounts={state.accounts}/>} 
      {tab==='settings' && <SettingsPanel state={state} update={update} saveSnapshot={saveSnapshot} syncStatus={syncStatus}/>} 
    </main>
  </div>
}
function Onboarding({update, seedDemo}){ const [name,setName]=useState(''); return <div className="onboarding"><div className="welcome-card"><div className="logo">GV</div><h1>Welcome to Grow UP</h1><p>Your personal finance companion for tracking assets, debts and goals.</p><button onClick={seedDemo}>Try Demo</button><div className="divider">or</div><input placeholder="Your first name" value={name} onChange={e=>setName(e.target.value)}/><button className="secondary" disabled={!name.trim()} onClick={()=>update({onboarded:true, firstName:name.trim()})}>Start with my data</button></div></div> }
function Nav({tab,setTab}){ const items=[['dashboard',LayoutDashboard],['accounts',Wallet],['goals',Target],['settings',Settings]]; return <nav>{items.map(([id,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={18}/>{id}</button>)}</nav> }
function Dashboard({totals,accounts,goals}){ return <section><div className="grid"><Metric icon={<PiggyBank/>} label="Assets" value={money(totals.assets)}/><Metric icon={<Wallet/>} label="Debts" value={money(totals.debts)}/><Metric icon={<TrendingUp/>} label="Net Worth" value={money(totals.netWorth)}/><Metric icon={<Target/>} label="Goals" value={goals.length}/></div><div className="panel"><h2>Quick overview</h2><p>You have {accounts.length} accounts and {goals.length} active goals. This starter keeps data in browser storage and includes an optional Supabase snapshot sync.</p></div></section> }
function Metric({icon,label,value}){ return <div className="metric"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div> }
function Accounts({accounts,setAccounts}){ const [name,setName]=useState(''); const [balance,setBalance]=useState(''); const [category,setCategory]=useState('asset'); const add=()=>{ if(!name.trim()) return; setAccounts([...accounts,{id:crypto.randomUUID(),name,category,balance:Number(balance||0)}]); setName(''); setBalance('');}; return <section className="panel"><h2>Accounts</h2><div className="form-row"><input placeholder="Account name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Balance" type="number" value={balance} onChange={e=>setBalance(e.target.value)}/><select value={category} onChange={e=>setCategory(e.target.value)}><option value="asset">Asset</option><option value="debt">Debt</option></select><button onClick={add}><Plus size={16}/>Add</button></div><div className="list">{accounts.map(a=><div className="list-row" key={a.id}><span>{a.name}<small>{a.category}</small></span><strong>{money(a.balance)}</strong><button className="ghost" onClick={()=>setAccounts(accounts.filter(x=>x.id!==a.id))}><Trash2 size={16}/></button></div>)}</div></section> }
function Goals({goals,setGoals,accounts}){ const [name,setName]=useState(''); const [target,setTarget]=useState(''); const [accountId,setAccountId]=useState('NET_WORTH'); const add=()=>{ if(!name.trim()) return; setGoals([...goals,{id:crypto.randomUUID(),name,targetAmount:Number(target||0),accountId}]); setName(''); setTarget('');}; return <section className="panel"><h2>Goals</h2><div className="form-row"><input placeholder="Goal name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Target amount" type="number" value={target} onChange={e=>setTarget(e.target.value)}/><select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="NET_WORTH">Net Worth</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button onClick={add}><Plus size={16}/>Add</button></div><div className="list">{goals.map(g=><div className="list-row" key={g.id}><span>{g.name}<small>{g.accountId==='NET_WORTH'?'Net Worth':'Account goal'}</small></span><strong>{money(g.targetAmount)}</strong><button className="ghost" onClick={()=>setGoals(goals.filter(x=>x.id!==g.id))}><Trash2 size={16}/></button></div>)}</div></section> }
function SettingsPanel({state,update,saveSnapshot,syncStatus}){ return <section className="panel"><h2>Settings</h2><p>Theme: {state.theme}</p><button onClick={()=>update({theme:state.theme==='dark'?'light':'dark'})}>Toggle theme</button><button onClick={saveSnapshot}>Save snapshot to Supabase</button><p className="status">{syncStatus}</p><button className="danger" onClick={()=>{localStorage.removeItem(STORAGE_KEY); location.reload();}}>Reset local data</button></section> }
createRoot(document.getElementById('root')).render(<App/>);
