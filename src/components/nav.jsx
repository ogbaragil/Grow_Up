import React from "react";
import { Home, CreditCard, Repeat2, Target, Sun, Moon, TrendingUp, X, Save, DownloadCloud, SlidersHorizontal, Shield, FileText, FlaskConical, LogOut, Lightbulb, Calculator } from "lucide-react";
import { Goals } from "../features/goals";
import { Settings } from "../features/settings";

export function BottomNav({ tab, setTab }) {
  const items = [
    ["overview", Home, "Overview"],
    ["assets", CreditCard, "Accounts"],
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


export function MenuSheet({ state, setMenuOpen, setTab, update, saveSnapshot, restoreSnapshot, session, displayName, signOut, isDemo=false, enterDemoMode, exitDemoMode, setTimelineOpen, setInsightsOpen, setCompoundOpen, tab, isPro=false }) {
  const navClass = (name) => tab === name ? "active" : undefined;
  return (
    <div className="sheet-backdrop" onClick={()=>setMenuOpen(false)}>
      <div className="menu-sheet app-drawer" onClick={(e)=>e.stopPropagation()}>
        <div className="sheet-head"><div className="app-icon drawer-logo"><img src="/icons/growup-logo.png" alt="Grow UP" /></div><div><h2>{displayName || "Grow UP"}</h2><p>{session?.user?.email || "Personal finance PWA"}</p></div><button onClick={()=>setMenuOpen(false)}><X/></button></div>

        <div className="drawer-section-label">Navigate</div>
        <button className={navClass("overview")} onClick={()=>{setTab("overview");setMenuOpen(false)}}><Home/> Overview</button>
        <button className={navClass("assets")} onClick={()=>{setTab("assets");setMenuOpen(false)}}><CreditCard/> Assets & Debts</button>
        <button className={navClass("cash")} onClick={()=>{setTab("cash");setMenuOpen(false)}}><Repeat2/> Cash Flow</button>
        <button className={navClass("goals")} onClick={()=>{setTab("goals");setMenuOpen(false)}}><Target/> Wealth Goals</button>

        <div className="drawer-section-label">Tools</div>
        <button onClick={()=>{setInsightsOpen(true); setMenuOpen(false)}}><Lightbulb/> Insights{!isPro && <span className="pro-lock">PRO</span>}</button>
        <button onClick={()=>{setTimelineOpen(true); setMenuOpen(false)}}><TrendingUp/> Wealth Timeline{!isPro && <span className="pro-lock">PRO</span>}</button>
        <button onClick={()=>{setCompoundOpen(true); setMenuOpen(false)}}><Calculator/> Compound Wealth{!isPro && <span className="pro-lock">PRO</span>}</button>
        <button onClick={()=>update({ theme:state.theme === "light" ? "dark" : "light" })}>{state.theme === "light" ? <Moon/> : <Sun/>} Toggle theme</button>
        <button onClick={isDemo ? exitDemoMode : enterDemoMode}><FlaskConical/> {isDemo ? "Exit preview" : "Preview with sample data"}</button>

        <div className="drawer-section-label">Account</div>
        <button className="drawer-caution" disabled={isDemo} onClick={saveSnapshot}><Save/> Back up data</button>
        <button className="drawer-caution" disabled={isDemo} onClick={restoreSnapshot}><DownloadCloud/> Restore from Cloud</button>
        <button onClick={()=>{setTab("settings");setMenuOpen(false)}}><SlidersHorizontal/> Settings</button>
        <button onClick={()=>{ window.location.href = "/privacy"; }}><Shield/> Privacy Policy</button>
        <button onClick={()=>{ window.location.href = "/terms"; }}><FileText/> Terms</button>
        {session && !isDemo && <button className="menu-danger" onClick={signOut}><LogOut/> Sign out</button>}
      </div>
    </div>
  );
}

// ── Quick-add presets ────────────────────────────────────────────────────────
