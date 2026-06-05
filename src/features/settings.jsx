import { getCurrentAge } from "../lib/user";
import { createPortalSession } from "../config";
import { CURRENCY_OPTIONS } from "../lib/money";
import React from "react";
import { DownloadCloud, FileText, LogOut, Moon, RotateCcw, Save, Shield, Sun } from "lucide-react";
import { Card, ScreenTitle } from "../components/ui";
import { useConfirm, useToast } from "../context/ToastContext";
import { requestGrowUpNotifications, saveEmailReminderPreferences } from "./notifications";
import { STORAGE_KEY } from "../state/useGrowState";

export function Settings({ state, update, saveSnapshot, restoreSnapshot, setMenuOpen, session, displayName, signOut, isDemo=false, enterDemoMode, exitDemoMode, isPro=false, showUpgrade}) {
  // Pulled from context instead of props: App's render site historically
  // omitted these, which made every handler below throw on undefined and
  // silently no-op (including Reset local data).
  const notify = useToast();
  const showConfirm = useConfirm();
  const [portalLoading, setPortalLoading] = React.useState(false);
  const currentAge = getCurrentAge(state.profile);
  // Prefill for users who onboarded with a static age before birth month existed:
  // approximate their birth as (this year − age), current month.
  const birthDefault = state.profile?.birth
    || (currentAge ? `${new Date().getFullYear() - currentAge}-${String(new Date().getMonth() + 1).padStart(2, "0")}` : "");
  return (
    <div className="screen">
      <ScreenTitle title="Settings" sub="Your account, preferences, and data." setMenuOpen={setMenuOpen} />

      {/* ── PROFILE ────────────────────────────────────────── */}
      <div className="settings-section-label">Your Profile</div>

      <Card className="settings-profile-card">
        <div className="settings-profile-row">
          <div className="settings-profile-avatar">{(displayName || "?")[0].toUpperCase()}</div>
          <div>
            <strong className="settings-profile-name">{displayName || "there"}</strong>
            <span className="settings-profile-email">{session?.user?.email || "Not signed in"}</span>
          </div>
        </div>
        <div className="settings-profile-fields">
          <label>Birth month &amp; year{currentAge ? <span className="field-caption"> · age {currentAge}</span> : null}
            <input type="month" defaultValue={birthDefault} max={new Date().toISOString().slice(0, 7)}
              onChange={e => update({ profile: { ...(state.profile||{}), birth: e.target.value || null, age: null }})} />
          </label>
          <label>Desired retirement age
            <input type="number" defaultValue={state.profile?.retirementAge || 65} placeholder="e.g. 65" min="40" max="99"
              onChange={e => update({ profile: { ...(state.profile||{}), retirementAge: Number(e.target.value)||65 }})} />
          </label>
        </div>
        <small className="field-caption" style={{marginTop:8,display:"block"}}>Powers your FIRE number and Wealth Timeline projections.</small>
        <button className="settings-signout-btn" onClick={signOut}><LogOut size={16}/> Sign out</button>
      </Card>

      {/* ── PREFERENCES ────────────────────────────────────── */}
      <div className="settings-section-label">Preferences</div>

      <Card>
        <div className="settings-row-head">
          <div>
            <h2>Push Notifications</h2>
            <p>Get reminded when bills are due and to update your monthly balances.</p>
          </div>
          <button
            className={`settings-action-btn ${state.notificationsEnabled ? "primary-tint" : ""}`}
            onClick={async () => {
              if (state.notificationsEnabled) {
                update({ notificationsEnabled: false });
                notify("Push notifications turned off.", "info");
              } else {
                await requestGrowUpNotifications(s => update(s(state)), notify);
              }
            }}
          >
            {state.notificationsEnabled ? "On" : "Enable"}
          </button>
        </div>
        {state.notificationsEnabled && (
          <p style={{fontSize:12,color:"var(--green)",fontWeight:800,margin:0}}>✓ You'll be notified about upcoming transactions and monthly balance reminders.</p>
        )}
      </Card>

      <Card>
        <div className="settings-row-head">
          <div>
            <h2>Subscription</h2>
            <p>{isPro ? "Grow UP Pro — active" : "Free plan · 3 accounts, 2 goals, 5 transactions"}</p>
          </div>
          {isPro ? (
            <button
              className="settings-action-btn"
              disabled={portalLoading}
              onClick={async () => {
                if (isDemo) return;
                setPortalLoading(true);
                const url = await createPortalSession(session);
                setPortalLoading(false);
                if (url) {
                  window.open(url, "_blank", "noopener,noreferrer");
                } else {
                  notify("Couldn't open the billing portal — please try again or contact support.", "error");
                }
              }}
            >{portalLoading ? "Opening…" : "Manage"}</button>
          ) : (
            <button className="settings-action-btn primary-tint" onClick={() => showUpgrade?.("general")}>Upgrade</button>
          )}
        </div>
      </Card>

      <Card>
        <div className="settings-row-head">
          <div>
            <h2>Currency</h2>
            <p>Used across all balances and reports.</p>
          </div>
        </div>
        <label>Display currency
          <select value={state.currency || "USD"} onChange={e=>{ const currency=e.target.value; const nextState={...state,currency}; localStorage.setItem(STORAGE_KEY,JSON.stringify(nextState)); update({currency}); }}>
            {CURRENCY_OPTIONS.map(([code, name, symbol]) => (
              <option key={code} value={code}>{symbol} {name} ({code})</option>
            ))}
          </select>
        </label>
      </Card>

      <Card>
        <div className="settings-row-head">
          <div>
            <h2>Appearance</h2>
            <p>Light or dark — your call.</p>
          </div>
          <button className="settings-theme-btn" onClick={()=>update({ theme:state.theme==="light"?"dark":"light" })}>
            {state.theme === "light" ? <><Moon size={16}/> Dark</> : <><Sun size={16}/> Light</>}
          </button>
        </div>
      </Card>

      <Card>
        <h2>Email Reminders</h2>
        <p>Transaction alerts, monthly balance nudges, goal deadlines, and milestone moments.</p>
        <div className="email-reminder-card">
          <div className="email-reminder-main">
            <div>
              <strong>{state.emailRemindersEnabled ? "Enabled" : "Off"}</strong>
              <span>{session?.user?.email || "Sign in to enable"}</span>
            </div>
            <button type="button" className={state.emailRemindersEnabled ? "secondary" : "primary"} onClick={async()=>{ const next=!state.emailRemindersEnabled; const saved=await saveEmailReminderPreferences({session,state,update,overrides:{emailRemindersEnabled:next},notify}); if(saved&&next) notify("Email reminders enabled.","success"); }}>
              {state.emailRemindersEnabled ? "Turn off" : "Enable"}
            </button>
          </div>
          <div className="email-reminder-grid">
            <label><span>Transaction reminder</span>
              <select value={state.emailReminderDays??1} onChange={async e=>{ await saveEmailReminderPreferences({session,state,update,overrides:{emailRemindersEnabled:true,emailReminderDays:Number(e.target.value)},notify}); }}>
                <option value={0}>Due day</option><option value={1}>1 day before</option><option value={2}>2 days before</option><option value={7}>1 week before</option>
              </select>
            </label>
            <label><span>Monthly balance day</span>
              <select value={state.monthlyBalanceReminderDay??28} onChange={async e=>{ await saveEmailReminderPreferences({session,state,update,overrides:{emailRemindersEnabled:true,monthlyBalanceReminderDay:Number(e.target.value)},notify}); }}>
                <option value={25}>25th</option><option value={28}>28th</option><option value={30}>30th</option><option value={31}>Last day</option>
              </select>
            </label>
          </div>
          <div className="email-reminder-toggles">
            <button type="button" className={state.emailGoalReminders?"active":""} onClick={async()=>{ await saveEmailReminderPreferences({session,state,update,overrides:{emailRemindersEnabled:true,emailGoalReminders:!state.emailGoalReminders}}); }}><span>{state.emailGoalReminders?"✓":"○"}</span>Goal reminders</button>
            <button type="button" className={state.emailMilestoneEmails?"active":""} onClick={async()=>{ await saveEmailReminderPreferences({session,state,update,overrides:{emailRemindersEnabled:true,emailMilestoneEmails:!state.emailMilestoneEmails}}); }}><span>{state.emailMilestoneEmails?"✓":"○"}</span>Milestone emails</button>
          </div>
        </div>
      </Card>

      {/* ── DATA & PRIVACY ─────────────────────────────────── */}
      <div className="settings-section-label">Data & Privacy</div>

      <Card>
        <div className="settings-row-head">
          <div>
            <h2>Cloud Backup</h2>
            <p>Keep your data safe and restore anytime.</p>
          </div>
        </div>
        <div className="settings-action-row">
          <button className="settings-action-btn primary-tint" disabled={isDemo} onClick={saveSnapshot}><Save size={16}/> Back up now</button>
          <button className="settings-action-btn" disabled={isDemo} onClick={restoreSnapshot}><DownloadCloud size={16}/> Restore</button>
        </div>
      </Card>

      <Card>
        <div className="settings-row-head">
          <div>
            <h2>Preview Mode</h2>
            <p>Explore Grow UP with sample data.</p>
          </div>
          <button className={`settings-action-btn ${isDemo ? "danger-tint" : "secondary-tint"}`} onClick={isDemo ? exitDemoMode : enterDemoMode}>
            {isDemo ? "Exit preview" : "Enter preview"}
          </button>
        </div>
      </Card>

      <Card>
        <div className="settings-row-head">
          <div>
            <h2>Legal</h2>
          </div>
        </div>
        <div className="settings-legal-row">
          <a href="/privacy"><Shield size={14}/> Privacy Policy</a>
          <a href="/terms"><FileText size={14}/> Terms of Service</a>
        </div>
      </Card>

      <Card className="settings-danger-card">
        <h2>Danger Zone</h2>
        <p>Permanently wipe all local data. This cannot be undone.</p>
        <button className="settings-danger-btn" disabled={isDemo} onClick={async()=>{ if(await showConfirm("Reset local data? This cannot be undone.")) {
          // Remove every app-owned key (state blob, demo flag, notification
          // dedupe keys, etc.) while leaving the auth session intact.
          Object.keys(localStorage)
            .filter(key => key.startsWith("growup_"))
            .forEach(key => localStorage.removeItem(key));
          location.reload();
        }}}>
          <RotateCcw size={16}/> Reset local data
        </button>
      </Card>
    </div>
  );
}

