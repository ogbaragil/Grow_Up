import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { EditorModal } from "./components/EditorModal";
import { BottomNav, MenuSheet } from "./components/nav";
import { InstallPrompt } from "./components/InstallPrompt";
import { useConfirm, useToast } from "./context/ToastContext";
import { AssetsDebts } from "./features/accounts";
import { AuthLogo, AuthScreen, ResetPasswordScreen } from "./features/auth";
import { UpgradeSheet } from "./features/billing";
import { CashFlow } from "./features/cashflow";
import { CompoundWealthPage, Goals } from "./features/goals";
import { HistoryPage } from "./features/history";
import { InsightsPage } from "./features/insights";
import { DeleteAccountPage, LegalPage, SupportPage } from "./features/legal";
import { OnboardingTips, OnboardingWizard } from "./features/onboarding";
import { BackfillPrompt, MinimalOverview } from "./features/overview";
import { Settings } from "./features/settings";
import { WealthTimelinePage } from "./features/timeline";
import { addMonths, currentMonthKey, isFutureMonth, monthLabel } from "./lib/dates";
import { computeTotals } from "./lib/insights";
import { useMoney } from "./lib/money";
import { getUserDisplayName } from "./lib/user";
import { buildDemoState, readOnlyDemoAlert } from "./state/demo";
import { normalizeGrowState } from "./state/normalize";
import { createMonthlySnapshotState } from "./state/snapshots";
import { STORAGE_KEY, useGrowState } from "./state/useGrowState";

// Rough size of a user's data — used to detect a near-blank state about to
// shadow a rich cloud backup (e.g. fresh device, cleared storage).
function dataRichness(s) {
  if (!s) return 0;
  return (s.accounts?.length || 0)
    + (s.transactions?.length || 0)
    + (s.goals?.length || 0)
    + Object.keys(s.monthSnapshots || {}).length;
}

const stripVolatileForBackup = (s) => {
  const { lastBackupAt, showBackfillPrompt, ...rest } = s || {};
  return JSON.stringify(rest);
};

export function App() {
  const path = window.location.pathname;
  if (path === "/delete-account") return <DeleteAccountPage />;
  // Marketing/landing now lives at ogbara.com.au/growup (the in-app page is archived in src/_archive/landing.jsx).
  if (path === "/landingpage") { window.location.replace("https://ogbara.com.au/growup/"); return null; }
  if (path === "/privacy") return <LegalPage type="privacy" />;
  if (path === "/terms") return <LegalPage type="terms" />;
  if (path === "/support") return <SupportPage />;

  // "?auth=signup" / "?auth=signin" — set by landing page CTAs so visitors
  // land on the right tab of the auth screen.
  const authIntent = new URLSearchParams(window.location.search).get("auth");

  const [state, setState] = useGrowState();
  const [tab, setTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [historyMetric, setHistoryMetric] = useState(null);
  const [compoundOpen, setCompoundOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem("growup_demo_mode") === "true");
  const [cloudCheck, setCloudCheck] = useState("idle"); // idle | checking | done
  const stateRef = useRef(null);
  const backupTimerRef = useRef(null);
  const lastBackedUpJsonRef = useRef(null);
  const lastCloudRichnessRef = useRef(null);
  const downgradeApprovedRef = useRef(false);
  const notify = useToast();
  const showConfirm = useConfirm();
  const fmt = useMoney(state.currency);

  const [subscription, setSubscription] = useState(null);
  const [upgradeSheet, setUpgradeSheet] = useState(null); // null | reason string
  const isPro = subscription?.status === "active" || subscription?.status === "trialing" || demoMode;

  const showUpgrade = (reason = "general") => setUpgradeSheet(reason);

  const requirePro = (reason, action) => {
    if (isPro) { action(); } else { showUpgrade(reason); }
  };


  useEffect(() => {
    window.__GROWUP_ACTIVE_CURRENCY = state.currency;
    document.documentElement.dataset.theme = state.theme;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }, [state.theme, state.currency]);

  const refreshSubscription = async () => {
    if (!supabase || !session?.user?.id) return;
    const { data } = await supabase
      .from("growup_subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    setSubscription(data || null);
    return data;
  };

  // Load subscription on session change
  useEffect(() => {
    refreshSubscription();
  }, [session?.user?.id]);

  // Activate Pro on return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const plan = params.get("plan") || "monthly";

    if (checkoutStatus === "cancel") {
      notify("Checkout cancelled — you can upgrade any time.", "info");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (checkoutStatus !== "success") return;
    if (!supabase || !session?.user?.id) return;

    const activate = async () => {
      notify("Activating Pro…", "info");
      // Never write subscription status from the client — anyone could set
      // it from devtools. The verify-subscription edge function authenticates
      // the user, confirms the subscription with Stripe directly, and writes
      // the row using the service role.
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token;
      const { data, error } = await supabase.functions.invoke("verify-subscription", {
        body: { plan },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const verified = !error && data?.status && data.status !== "no_customer" && data.status !== "no_subscription";
      if (verified) {
        await refreshSubscription();
        notify("✦ You're now on Grow UP Pro! Enjoy.", "success");
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        console.error("Verification failed:", error ? JSON.stringify(error) : JSON.stringify(data));
        // Payment may still be settling — the Stripe webhook will activate
        // Pro shortly even if this immediate check missed it.
        notify("Payment received — Pro will activate within a minute. Pull to refresh if it doesn't.", "info");
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    activate();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      if (data.session) localStorage.setItem("growup_has_used", "true");
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession) localStorage.setItem("growup_has_used", "true");
      setAuthLoading(false);
      // The user arrived via a password reset email link — they're signed in
      // with a recovery token but still don't know their password. Show the
      // set-new-password screen before anything else.
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    return () => data?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    setCloudCheck("idle");
    downgradeApprovedRef.current = false;
    lastCloudRichnessRef.current = null;
    lastBackedUpJsonRef.current = null;
  }, [session?.user?.id]);

  // ── Auto-restore on sign-in ──
  // A fresh device (or cleared storage) boots with blank local state, which
  // would re-run onboarding and eventually shadow the user's real cloud data.
  // Before showing the wizard, pull the latest cloud snapshot if local is empty.
  useEffect(() => {
    if (!session?.user?.id || demoMode || !supabase) return;
    if (cloudCheck !== "idle") return;
    if (state.profileComplete || dataRichness(state) > 0) { setCloudCheck("done"); return; }

    setCloudCheck("checking");
    (async () => {
      try {
        const { data, error } = await supabase
          .from("growup_snapshots")
          .select("app_state, state")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const latest = data?.[0]?.app_state || data?.[0]?.state;
        if (!error && latest && dataRichness(latest) > 0) {
          const normalized = normalizeGrowState(latest);
          setState(normalized);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          lastCloudRichnessRef.current = dataRichness(normalized);
          lastBackedUpJsonRef.current = stripVolatileForBackup(normalized);
          notify("Welcome back — your data was restored from your cloud backup.", "success");
        }
      } catch (e) {
        console.error("Cloud restore check failed:", e);
      }
      setCloudCheck("done");
    })();
  }, [session?.user?.id, demoMode, cloudCheck, state.profileComplete]);

  useEffect(() => {
    if (isFutureMonth(state.selectedMonth)) {
      setState(s => ({ ...s, selectedMonth: currentMonthKey() }));
    }
  }, [state.selectedMonth, setState]);

  const demoState = useMemo(() => buildDemoState(), []);
  const activeState = demoMode ? demoState : state;
  const activeSetState = demoMode ? (() => readOnlyDemoAlert()) : setState;
  const totals = useMemo(() => computeTotals(activeState), [activeState]);
  const displayName = demoMode ? "Demo" : getUserDisplayName(session, state);

  const update = (patch) => setState(s => ({ ...s, ...patch }));

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  const enterDemoMode = () => {
    localStorage.setItem("growup_demo_mode", "true");
    setDemoMode(true);
    setMenuOpen(false);
  };

  const exitDemoMode = () => {
    localStorage.removeItem("growup_demo_mode");
    setDemoMode(false);
    setMenuOpen(false);
  };

  const uploadSnapshotState = async (snapshotState, selectedMonthForMessage, { requireSession = true, silent = false } = {}) => {
    if (requireSession && !session?.user?.id) {
      if (!silent) notify("Please sign in before backing up your data.", "error");
      return false;
    }

    if (!snapshotState) {
      if (!silent) notify("Could not save snapshot. Please try again.", "error");
      return false;
    }

    if (!supabase) {
      if (!silent) notify("Data backed up locally. Supabase env vars are missing.", "info");
      return false;
    }

    if (!session?.user?.id) return false;

    // ── Downgrade guard ──
    // Never silently make a much emptier state the "latest" backup — that's
    // the device-switch / cleared-storage scenario shadowing real data.
    const outgoing = dataRichness(snapshotState);
    const knownCloud = lastCloudRichnessRef.current;
    if (!downgradeApprovedRef.current && (knownCloud == null || outgoing < knownCloud)) {
      let cloudCount = knownCloud;
      if (cloudCount == null) {
        try {
          const { data } = await supabase
            .from("growup_snapshots")
            .select("app_state, state")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1);
          const latest = data?.[0]?.app_state || data?.[0]?.state;
          cloudCount = latest ? dataRichness(latest) : 0;
          lastCloudRichnessRef.current = cloudCount;
        } catch (e) {
          console.error("Backup pre-check failed:", e);
          cloudCount = 0;
        }
      }

      if (outgoing < cloudCount) {
        const ok = await showConfirm(
          `Heads up — your cloud backup holds more data than this device (${cloudCount} items vs ${outgoing}). ` +
          `Backing up now makes this smaller version your latest backup. Continue?`
        );
        if (!ok) {
          if (!silent) notify("Backup skipped — your cloud data is untouched. Use Restore in Settings to pull it down.", "info");
          return false;
        }
        downgradeApprovedRef.current = true;
      }
    }

    const { error } = await supabase
      .from("growup_snapshots")
      .insert({ user_id:session.user.id, app_state:snapshotState });

    if (error) {
      if (!silent) notify(`Local data saved, but cloud backup failed: ${error.message}`, "error");
      else console.error("Auto-backup failed:", error.message);
      return false;
    }

    lastCloudRichnessRef.current = outgoing;
    lastBackedUpJsonRef.current = stripVolatileForBackup(snapshotState);
    setState(s => ({ ...s, lastBackupAt: new Date().toISOString() }));

    if (!silent) notify(`Data backed up for ${monthLabel(selectedMonthForMessage)}.`, "success");
    return true;
  };

  // ── Silent auto-backup ──
  // Debounced cloud upload ~45s after the last change, plus a best-effort
  // flush when the tab is hidden. Covers transactions, goals, and settings
  // edits that previously only ever lived in localStorage.
  const runAutoBackup = async () => {
    const current = stateRef.current;
    if (!current || demoMode || !session?.user?.id || !supabase) return;
    if (!current.profileComplete) return;
    const json = stripVolatileForBackup(current);
    if (json === lastBackedUpJsonRef.current) return;
    await uploadSnapshotState(current, current.selectedMonth, { silent: true });
  };

  useEffect(() => {
    if (demoMode || !session?.user?.id || !supabase) return;
    if (!state.profileComplete) return;
    if (cloudCheck === "checking") return;
    const json = stripVolatileForBackup(state);
    if (json === lastBackedUpJsonRef.current) return;

    clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(runAutoBackup, 45000);
    return () => clearTimeout(backupTimerRef.current);
  }, [state, session?.user?.id, demoMode, cloudCheck]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(backupTimerRef.current);
        runAutoBackup();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [session?.user?.id, demoMode]);

  // Offer backfill exactly once: right after the user's FIRST current-month
  // snapshot, when no prior-month data exists yet. That's the moment a
  // backfill is both possible (accounts exist) and valuable (enables trends).
  const withBackfillOffer = (nextState, baseState) => {
    const hadSnapshots = Object.keys(baseState.monthSnapshots || {}).length > 0;
    const savedCurrentMonth = baseState.selectedMonth === currentMonthKey();
    const prevKey = addMonths(baseState.selectedMonth, -1);
    const hasPrev = Boolean(nextState.monthSnapshots?.[prevKey]);
    if (!hadSnapshots && savedCurrentMonth && !hasPrev && !nextState.backfillOffered) {
      return { ...nextState, showBackfillPrompt: true, backfillOffered: true };
    }
    return nextState;
  };

  const autoSaveMonthSnapshot = async (sourceState) => {
    if (demoMode) return readOnlyDemoAlert();

    const selectedMonthForMessage = sourceState?.selectedMonth || state.selectedMonth;
    const baseState = sourceState || state;
    const nextStateForSupabase = withBackfillOffer(createMonthlySnapshotState(baseState), baseState);

    setState(nextStateForSupabase);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStateForSupabase));

    await uploadSnapshotState(nextStateForSupabase, selectedMonthForMessage, { requireSession: true });
  };

  const saveSnapshot = async () => {
    if (demoMode) return readOnlyDemoAlert();

    const selectedMonthForMessage = state.selectedMonth;
    const nextState = withBackfillOffer(createMonthlySnapshotState(state), state);
    setState(nextState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    await uploadSnapshotState(nextState, selectedMonthForMessage, { requireSession: true });
  };

  const restoreSnapshot = async () => {
    if (demoMode) return readOnlyDemoAlert();
    if (!session?.user?.id) {
      notify("Please sign in before restoring your saved data.", "error");
      return;
    }

    if (!supabase) { notify("Supabase env vars are missing.", "error"); return; }
    if (!(await showConfirm("Restore your latest saved Grow UP data? This replaces local app data."))) return;

    const { data, error } = await supabase
      .from("growup_snapshots")
      .select("app_state, state, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending:false })
      .limit(1);

    if (error) { notify(`Restore failed: ${error.message}`, "error"); return; }
    const restored = data?.[0]?.app_state || data?.[0]?.state;
    if (!restored) { notify("No saved backup found for this account.", "info"); return; }

    const normalizedRestored = normalizeGrowState(restored);
    setState(normalizedRestored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRestored));
    lastCloudRichnessRef.current = dataRichness(normalizedRestored);
    lastBackedUpJsonRef.current = stripVolatileForBackup(normalizedRestored);
    notify("Latest saved data restored.", "success");
  };

  const common = { state: activeState, setState: activeSetState, totals, setEditor, setMenuOpen, setHistoryMetric, setInsightsOpen, setTimelineOpen, saveSnapshot, autoSaveMonthSnapshot, displayName, isDemo: demoMode, notify, showConfirm, isPro, showUpgrade, requirePro };

  if (authLoading) {
    return (
      <div className="app-shell">
        <main className="phone auth-phone">
          <div className="auth-loading">
            <AuthLogo />
            <h1>Grow UP</h1>
            <p>Checking your session…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!session && !demoMode) {
    // Logged-out visitors land directly on sign in / create account.
    // The marketing page stays reachable from the auth screen's "Learn more"
    // link and at the /landingpage route.
    return (
      <>
        <AuthScreen enterDemoMode={enterDemoMode} initialMode={authIntent === "signup" ? "signUp" : "signIn"} />
        <InstallPrompt show />
      </>
    );
  }

  if (passwordRecovery && session) {
    return <ResetPasswordScreen notify={notify} onDone={() => setPasswordRecovery(false)} />;
  }

  if (!demoMode && session && cloudCheck === "checking") {
    return (
      <div className="app-shell">
        <main className="phone auth-phone">
          <div className="auth-loading">
            <AuthLogo />
            <h1>Grow UP</h1>
            <p>Syncing your data…</p>
          </div>
        </main>
      </div>
    );
  }

  // Show onboarding wizard for new users who haven't completed profile setup
  if (!demoMode && !state.profileComplete) {
    return (
      <div className="app-shell">
        <main className="phone">
          <OnboardingWizard
            state={state}
            setState={setState}
            onComplete={() => {}}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="phone">
        {timelineOpen && isPro ? (
          <WealthTimelinePage state={activeState} setState={setState} setMenuOpen={setMenuOpen} setTimelineOpen={setTimelineOpen} setCompoundOpen={setCompoundOpen} setTab={setTab} />
        ) : timelineOpen && !isPro ? (
          <>{setTimelineOpen(false)}{showUpgrade("timeline")}</>
        ) : insightsOpen && isPro ? (
          <InsightsPage state={activeState} totals={totals} setMenuOpen={setMenuOpen} setInsightsOpen={setInsightsOpen} />
        ) : insightsOpen && !isPro ? (
          <>{setInsightsOpen(false)}{showUpgrade("insights")}</>
        ) : compoundOpen && isPro ? (
          <CompoundWealthPage setCompoundOpen={setCompoundOpen} setMenuOpen={setMenuOpen} state={activeState} setState={setState} totals={totals} />
        ) : compoundOpen && !isPro ? (
          <>{setCompoundOpen(false)}{showUpgrade("compound")}</>
        ) : historyMetric ? (
          <HistoryPage {...common} metric={historyMetric} setHistoryMetric={setHistoryMetric} />
        ) : (
          <>
            {tab === "overview" && !demoMode && (
              <OnboardingTips state={state} setState={setState} setTab={setTab} />
            )}

            {tab === "overview" && (
              <MinimalOverview {...common} setTab={setTab} isDemo={demoMode} isPro={isPro} showUpgrade={showUpgrade} exitDemoMode={exitDemoMode} />
            )}
            {tab === "assets" && <AssetsDebts {...common} />}
            {tab === "cash" && <CashFlow {...common} />}
            {tab === "goals" && <Goals {...common} setCompoundOpen={setCompoundOpen} />}
            {tab === "settings" && (
              <Settings
                state={activeState}
                update={update}
                saveSnapshot={saveSnapshot}
                restoreSnapshot={restoreSnapshot}
                setMenuOpen={setMenuOpen}
                session={session}
                displayName={displayName}
                signOut={signOut}
                isDemo={demoMode}
                enterDemoMode={enterDemoMode}
                exitDemoMode={exitDemoMode}
                isPro={isPro}
                showUpgrade={showUpgrade}
              />
            )}
            <BottomNav tab={tab} setTab={setTab} />
          </>
        )}
      </main>

      {menuOpen && (
        <MenuSheet
          state={activeState}
          setMenuOpen={setMenuOpen}
          setTab={setTab}
          setTimelineOpen={setTimelineOpen}
          setInsightsOpen={setInsightsOpen}
          setCompoundOpen={setCompoundOpen}
          setHistoryMetric={setHistoryMetric}
          tab={tab}
          update={update}
          saveSnapshot={saveSnapshot}
          restoreSnapshot={restoreSnapshot}
          session={session}
          displayName={displayName}
          signOut={signOut}
          isDemo={demoMode}
          enterDemoMode={enterDemoMode}
          exitDemoMode={exitDemoMode}
          isPro={isPro}
        />
      )}

      {!demoMode && editor && <EditorModal editor={editor} setEditor={setEditor} state={state} setState={setState} autoSaveMonthSnapshot={autoSaveMonthSnapshot} totals={totals} isPro={isPro} showUpgrade={showUpgrade} />}

      {state.showBackfillPrompt && (
        <BackfillPrompt state={activeState} setState={activeSetState} setTab={setTab} />
      )}

      {upgradeSheet !== null && (
        <UpgradeSheet
          reason={upgradeSheet}
          onClose={() => setUpgradeSheet(null)}
          session={session}
          notify={notify}
          refreshSubscription={refreshSubscription}
        />
      )}

      <InstallPrompt
        aboveNav
        show={
          tab === "overview" &&
          !timelineOpen && !insightsOpen && !compoundOpen && !historyMetric &&
          !menuOpen && !editor && upgradeSheet === null && !state.showBackfillPrompt
        }
      />
    </div>
  );
}

