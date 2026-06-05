import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { EditorModal } from "./components/EditorModal";
import { BottomNav, MenuSheet } from "./components/nav";
import { useConfirm, useToast } from "./context/ToastContext";
import { AssetsDebts } from "./features/accounts";
import { AuthScreen } from "./features/auth";
import { UpgradeSheet } from "./features/billing";
import { CashFlow } from "./features/cashflow";
import { CompoundWealthPage, Goals } from "./features/goals";
import { HistoryPage } from "./features/history";
import { InsightsPage } from "./features/insights";
import { LandingPage } from "./features/landing";
import { DeleteAccountPage, LegalPage } from "./features/legal";
import { runGrowUpNotificationChecks } from "./features/notifications";
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

export function App() {
  const path = window.location.pathname;
  if (path === "/delete-account") return <DeleteAccountPage />;
  if (path === "/landingpage") return <LandingPage />;
  if (path === "/privacy") return <LegalPage type="privacy" />;
  if (path === "/terms") return <LegalPage type="terms" />;

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
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem("growup_demo_mode") === "true");
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
      const { error } = await supabase
        .from("growup_subscriptions")
        .upsert({
          user_id: session.user.id,
          status: "trialing",
          plan,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (!error) {
        await refreshSubscription();
        notify("✦ You're now on Grow UP Pro! Enjoy.", "success");
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        console.error("Upsert error:", JSON.stringify(error));
        notify("Error activating Pro: " + error.message, "error");
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
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setAuthLoading(false);
    });

    return () => data?.subscription?.unsubscribe?.();
  }, []);

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

  useEffect(() => {
    if (!demoMode) runGrowUpNotificationChecks(activeState);
  }, [demoMode, activeState]);
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

  const uploadSnapshotState = async (snapshotState, selectedMonthForMessage, { requireSession = true } = {}) => {
    if (requireSession && !session?.user?.id) {
      notify("Please sign in before backing up your data.", "error");
      return false;
    }

    if (!snapshotState) {
      notify("Could not save snapshot. Please try again.", "error");
      return false;
    }

    if (!supabase) {
      notify("Data backed up locally. Supabase env vars are missing.", "info");
      return false;
    }

    if (!session?.user?.id) return false;

    const { error } = await supabase
      .from("growup_snapshots")
      .insert({ user_id:session.user.id, app_state:snapshotState });

    if (error) {
      notify(`Local data saved, but cloud backup failed: ${error.message}`, "error");
      return false;
    }

    notify(`Data backed up for ${monthLabel(selectedMonthForMessage)}.`, "success");
    return true;
  };

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
    notify("Latest saved data restored.", "success");
  };

  const common = { state: activeState, setState: activeSetState, totals, setEditor, setMenuOpen, setHistoryMetric, setInsightsOpen, setTimelineOpen, saveSnapshot, autoSaveMonthSnapshot, displayName, isDemo: demoMode, notify, showConfirm, isPro, showUpgrade, requirePro };

  if (authLoading) {
    return (
      <div className="app-shell">
        <main className="phone auth-phone">
          <div className="auth-loading">
            <div className="app-icon large">GV</div>
            <h1>Grow UP</h1>
            <p>Checking your session…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!session && !demoMode) {
    return <AuthScreen enterDemoMode={enterDemoMode} />;
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
              <MinimalOverview {...common} setTab={setTab} isDemo={demoMode} isPro={isPro} showUpgrade={showUpgrade} />
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
        />
      )}
    </div>
  );
}

