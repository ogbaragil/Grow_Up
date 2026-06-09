import React from "react";
import { Home, CreditCard, Repeat2, Target, TrendingUp, X, UploadCloud, DownloadCloud, SlidersHorizontal, Shield, FileText, FlaskConical, LogOut, Lightbulb, Calculator, Moon, ChevronRight, CheckCircle2 } from "lucide-react";
import { timeAgo } from "../lib/dates";
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
  const backupAgo = state?.lastBackupAt ? timeAgo(state.lastBackupAt) : null;
  const isDark = state?.theme === "dark";
  const close = () => setMenuOpen(false);
  // Clear any full-screen overlay page (Timeline / Insights / Compound) so that
  // navigating from the drawer actually takes effect instead of being shadowed
  // by an overlay that's still open.
  const closeOverlays = () => { setTimelineOpen?.(false); setInsightsOpen?.(false); setCompoundOpen?.(false); };

  return (
    <div className="sheet-backdrop" onClick={close}>
      <aside className="gu-drawer" onClick={(e)=>e.stopPropagation()}>
        {/* Header */}
        <div className="gu-drawer-head">
          <button className="gu-drawer-close" onClick={close} aria-label="Close menu"><X size={22}/></button>
          <img className="gu-drawer-avatar" src="/icons/growup-logo.png" alt="" />
          <div className="gu-drawer-meta">
            <h2>{displayName || "Grow UP"}</h2>
            {session?.user?.email && <p className="gu-drawer-email">{session.user.email}</p>}
            <span className={isPro ? "gu-plan-badge pro" : "gu-plan-badge"}>{isPro ? "Pro Plan" : "Free Plan"}</span>
            <div className="gu-sync">
              <CheckCircle2 size={16}/>
              <span>{backupAgo ? `Last synced ${backupAgo}` : "Cloud sync ready"}</span>
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="gu-drawer-label">Analysis</div>
        <button className="gu-drawer-row" onClick={()=>{ closeOverlays(); setInsightsOpen(true); close(); }}>
          <span className="gu-row-icon"><Lightbulb size={22}/></span>
          <span className="gu-row-text"><span className="gu-row-title">Insights</span></span>
          {!isPro && <span className="gu-pro-pill">PRO</span>}
          <ChevronRight className="gu-row-chev" size={20}/>
        </button>
        <button className="gu-drawer-row" onClick={()=>{ closeOverlays(); setTimelineOpen(true); close(); }}>
          <span className="gu-row-icon"><TrendingUp size={22}/></span>
          <span className="gu-row-text"><span className="gu-row-title">Wealth Timeline</span></span>
          {!isPro && <span className="gu-pro-pill">PRO</span>}
          <ChevronRight className="gu-row-chev" size={20}/>
        </button>
        <button className="gu-drawer-row" onClick={()=>{ closeOverlays(); setCompoundOpen(true); close(); }}>
          <span className="gu-row-icon"><Calculator size={22}/></span>
          <span className="gu-row-text"><span className="gu-row-title">Compound Wealth</span></span>
          {!isPro && <span className="gu-pro-pill">PRO</span>}
          <ChevronRight className="gu-row-chev" size={20}/>
        </button>

        {/* Utility */}
        <hr className="gu-drawer-divider" />
        <div className="gu-drawer-label">Utility</div>
        <button className="gu-drawer-row" onClick={()=>{ closeOverlays(); (isDemo ? exitDemoMode : enterDemoMode)(); }}>
          <span className="gu-row-icon"><FlaskConical size={22}/></span>
          <span className="gu-row-text"><span className="gu-row-title">{isDemo ? "Exit preview" : "Preview with sample data"}</span></span>
          <ChevronRight className="gu-row-chev" size={20}/>
        </button>

        {/* Account */}
        <hr className="gu-drawer-divider" />
        <div className="gu-drawer-label">Account</div>
        <div className="gu-drawer-card">
          <span className="gu-row-icon"><UploadCloud size={24}/></span>
          <div className="gu-card-text">
            <span className="gu-card-title">Back up data</span>
            <div className="gu-card-sub">{backupAgo ? `Last backup: ${backupAgo}` : "No backup yet"}</div>
          </div>
          <button className="gu-card-btn" disabled={isDemo} onClick={saveSnapshot}>Back up now</button>
        </div>
        <div className="gu-drawer-card">
          <span className="gu-row-icon"><DownloadCloud size={24}/></span>
          <div className="gu-card-text">
            <span className="gu-card-title">Restore from Cloud</span>
            <div className="gu-card-sub">
              {isDemo
                ? <span>Preview mode</span>
                : session
                  ? <><span>Cloud sync is connected</span><CheckCircle2 size={15}/></>
                  : <span>Sign in to enable sync</span>}
            </div>
          </div>
          <button className="gu-card-btn" disabled={isDemo} onClick={restoreSnapshot}>Restore</button>
        </div>

        {/* App */}
        <hr className="gu-drawer-divider" />
        <div className="gu-drawer-label">App</div>
        <div className="gu-drawer-row">
          <span className="gu-row-icon"><Moon size={22}/></span>
          <span className="gu-row-text">
            <span className="gu-row-title">Dark Mode</span>
            <span className="gu-row-sub">{isDark ? "On" : "Off"}</span>
          </span>
          <button
            className={isDark ? "gu-toggle on" : "gu-toggle"}
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            onClick={()=>update({ theme: isDark ? "light" : "dark" })}
          ><span className="gu-toggle-knob"/></button>
        </div>
        <button className="gu-drawer-row" onClick={()=>{ closeOverlays(); setTab("settings"); close(); }}>
          <span className="gu-row-icon"><SlidersHorizontal size={22}/></span>
          <span className="gu-row-text"><span className="gu-row-title">Settings</span></span>
          <ChevronRight className="gu-row-chev" size={20}/>
        </button>

        {/* Legal */}
        <hr className="gu-drawer-divider" />
        <div className="gu-drawer-label">Legal</div>
        <button className="gu-drawer-row" onClick={()=>{ window.location.href = "/privacy"; }}>
          <span className="gu-row-icon"><Shield size={22}/></span>
          <span className="gu-row-text"><span className="gu-row-title">Privacy Policy</span></span>
          <ChevronRight className="gu-row-chev" size={20}/>
        </button>
        <button className="gu-drawer-row" onClick={()=>{ window.location.href = "/terms"; }}>
          <span className="gu-row-icon"><FileText size={22}/></span>
          <span className="gu-row-text"><span className="gu-row-title">Terms</span></span>
          <ChevronRight className="gu-row-chev" size={20}/>
        </button>

        {/* Sign out */}
        {session && !isDemo && (
          <button className="gu-signout" onClick={signOut}>
            <span className="gu-row-icon"><LogOut size={22}/></span>
            <span className="gu-row-text">
              <span className="gu-row-title">Sign out</span>
              <span className="gu-row-sub">Sign out of Grow UP</span>
            </span>
            <ChevronRight className="gu-row-chev" size={20}/>
          </button>
        )}
      </aside>
    </div>
  );
}

// ── Quick-add presets ────────────────────────────────────────────────────────
