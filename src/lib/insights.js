import { historyRows } from "./history";
import { addMonths, currentMonthKey, isFutureMonth, monthLabel } from "./dates";
import { calculateGoalProgress, estimateGoalCompletion, getAccountsForSelectedMonth, goalIconForType, refineDebtPayoffCalcWithHistory } from "./goals";
import { money } from "./money";
import { monthlyEquivalent, upcomingTransactions } from "./transactions";

export function buildGrowUpInsights(state, totals) {
  const latest = latestDashboardState(state);
  const latestTotals = computeTotals(latest);
  const accounts = getAccountsForSelectedMonth(latest);
  const assetAccounts = accounts.filter(a => a.kind === "asset" && Number(a.balance || 0) > 0);
  const debtAccounts = accounts.filter(a => a.kind === "debt" && Number(a.balance || 0) > 0);
  const topAsset = assetAccounts.slice().sort((a,b)=>Number(b.balance||0)-Number(a.balance||0))[0];

  const insights = [];

  const netChange = latestTotals.net - latestTotals.prevNet;
  if (latestTotals.prevNet) {
    insights.push({
      icon: netChange >= 0 ? "↗" : "↘",
      label: "Net Worth",
      title: `${netChange >= 0 ? "Up" : "Down"} ${money(Math.abs(netChange))}`,
      body: `${netChange >= 0 ? "Growth" : "Drop"} versus the previous month.`,
      tone: netChange >= 0 ? "gain" : "risk"
    });
  }

  if (topAsset && latestTotals.assets) {
    const pct = Math.round((Number(topAsset.balance || 0) / Math.max(1, latestTotals.assets)) * 100);
    insights.push({
      icon: "◔",
      label: "Concentration",
      title: `${topAsset.name} is ${pct}%`,
      body: "Your largest asset currently drives the biggest share of your wealth.",
      tone: "gold"
    });
  }

  if (debtAccounts.length) {
    const totalDebt = debtAccounts.reduce((s,a)=>s+Number(a.balance||0),0);
    const debtRatio = latestTotals.assets ? Math.round((totalDebt / Math.max(1, latestTotals.assets)) * 100) : 0;
    insights.push({
      icon: "!",
      label: "Debt Pressure",
      title: `${debtRatio}% debt ratio`,
      body: debtRatio <= 35 ? "Debt looks controlled relative to assets." : "Debt is taking a meaningful share of your balance sheet.",
      tone: debtRatio <= 35 ? "gain" : "risk"
    });
  }

  const activeGoals = (latest.goals || []).filter(g => !g.archived);
  if (activeGoals.length) {
    const accountsForMonth = getAccountsForSelectedMonth(latest);
    const goalScores = activeGoals.map(g => {
      let calc = calculateGoalProgress(g, latestTotals, accountsForMonth);
      calc = refineDebtPayoffCalcWithHistory(g, latest, calc);
      const forecast = estimateGoalCompletion(g, latest, calc, latestTotals);
      return { goal:g, calc, forecast };
    }).sort((a,b)=>Number(b.calc.progress||0)-Number(a.calc.progress||0));

    const best = goalScores[0];
    if (best) {
      insights.push({
        icon: "◎",
        label: "Goal Pace",
        title: `${best.goal.name} leads`,
        body: `${Math.round(best.calc.progress || 0)}% complete${best.forecast?.label ? ` · ${best.forecast.label}` : ""}.`,
        tone: "forecast"
      });
    }
  }

  const cashIn = latestTotals.income;
  const cashOut = latestTotals.expenses;
  if (cashIn || cashOut) {
    const surplus = cashIn - cashOut;
    insights.push({
      icon: surplus >= 0 ? "+" : "−",
      label: "Cash Flow",
      title: `${surplus >= 0 ? "Surplus" : "Shortfall"} ${money(Math.abs(surplus))}`,
      body: "Based on recurring and upcoming transactions currently entered.",
      tone: surplus >= 0 ? "gain" : "risk"
    });
  }

  return insights.slice(0, 5);
}


export function buildWealthTimelineItems(state, scenario = "balanced") {
  const latest = latestDashboardState(state);
  const totals = computeTotals(latest);
  const accounts = getAccountsForSelectedMonth(latest);
  const activeGoals = (latest.goals || []).filter(g => !g.archived);
  const now = new Date();
  const netWorth = Number(totals.net || 0);
  const prevNetWorth = Number(totals.prevNet || 0);
  const profile = state.profile || {};

  const scenarioConfig = {
    conservative: { label:"Conservative", multiplier:.65, annualReturn:.035 },
    balanced: { label:"Balanced", multiplier:1, annualReturn:.055 },
    aggressive: { label:"Aggressive", multiplier:1.35, annualReturn:.075 }
  }[scenario] || { label:"Balanced", multiplier:1, annualReturn:.055 };

  const history = historyRows(latest).slice().sort((a,b)=>a.key.localeCompare(b.key)).filter(r=>Number.isFinite(Number(r.net)));
  const growths = history.slice(-6).map((r,i,arr)=> i ? Number(r.net||0) - Number(arr[i-1].net||0) : null).filter(v=>Number.isFinite(v));
  const avgGrowth = growths.length ? growths.reduce((s,v)=>s+v,0)/growths.length : Math.max(0, netWorth - prevNetWorth);

  // Use profile income/expenses as fallback when no transactions exist
  const income = getProfileMonthlyIncome(state, totals);
  const out = getProfileMonthlyExpenses(state, totals);
  const cashSurplus = income - out;

  // Only project from real historical data — no surplus assumptions
  const hasHistory = growths.length >= 2;
  const monthlyAdd = hasHistory
    ? avgGrowth * scenarioConfig.multiplier
    : null;

  const monthlyReturn = Math.pow(1 + scenarioConfig.annualReturn, 1/12) - 1;

  const monthsTo = (target) => {
    if (monthlyAdd === null) return null;
    if (netWorth >= target) return 0;
    let projected = netWorth;
    for (let m=1; m<=720; m++) {
      projected = (projected * (1 + monthlyReturn)) + monthlyAdd;
      if (projected >= target) return m;
    }
    return null;
  };
  const futureDate = (months) => months === null || months === undefined ? null : new Date(now.getFullYear(), now.getMonth() + months, 1);
  const dateLabel = (date) => date ? date.toLocaleDateString("en-US", { month:"long", year:"numeric" }) : monthlyAdd === null ? "Add income & expenses for a forecast" : "Beyond 60 years";

  const rows = [{
    icon:"●",
    title:money(netWorth),
    label:"Current net worth",
    detail:monthLabel(latest.selectedMonth),
    tone:"now",
    category:"Today",
    sort:now.getTime()
  }];

  activeGoals.forEach(goal => {
    let calc = calculateGoalProgress(goal, totals, accounts);
    calc = refineDebtPayoffCalcWithHistory(goal, latest, calc);
    const forecast = estimateGoalCompletion(goal, latest, calc, totals);
    let d = forecast?.etaDate ? new Date(forecast.etaDate) : goal.deadline ? new Date(goal.deadline) : null;
    rows.push({
      icon: goal.icon || goalIconForType(goal.goalType),
      title: goal.name,
      label: forecast?.label || dateLabel(d),
      detail: `${Math.round(calc.progress || 0)}% complete`,
      tone: calc.progress >= 80 ? "gain" : goal.goalType === "debtPayoff" ? "risk" : "forecast",
      category:"Goal",
      sort: d ? d.getTime() : Number.MAX_SAFE_INTEGER - 10
    });
  });

  [
    { amount:100000, title:"First 100k", icon:"💎" },
    { amount:250000, title:"Quarter Million", icon:"🏛️" },
    { amount:500000, title:"Half Million", icon:"🚀" },
    { amount:1000000, title:"Millionaire", icon:"👑" }
  ].filter(m=>netWorth < m.amount).slice(0,3).forEach(m => {
    const d = futureDate(monthsTo(m.amount));
    rows.push({
      icon:m.icon,
      title:m.title,
      label:dateLabel(d),
      detail:`${money(m.amount)} target · ${scenarioConfig.label} case`,
      tone:"gold",
      category:"Wealth Milestone",
      sort:d ? d.getTime() : Number.MAX_SAFE_INTEGER - 8
    });
  });

  // Debt Free — purely historical, falls back to profile roughDebt
  const debts = accounts.filter(a=>a.kind==="debt" && Number(a.balance||0)>0);
  const totalDebt = debts.reduce((s,a)=>s+Number(a.balance||0),0);
  const profileDebt = Number(profile.roughDebt || 0);
  const effectiveDebt = totalDebt > 0 ? totalDebt : profileDebt;

  if (effectiveDebt > 0) {
    const snapKeys = Object.keys(state.monthSnapshots || {}).sort();
    let historicalMonthlyPaydown = null;
    if (snapKeys.length >= 2) {
      const oldest = state.monthSnapshots[snapKeys[0]];
      const newest = state.monthSnapshots[snapKeys[snapKeys.length - 1]];
      const oldestDebt = (oldest.accounts || []).filter(a=>a.kind==="debt").reduce((s,a)=>s+Number(a.balance||0),0);
      const newestDebt = (newest.accounts || []).filter(a=>a.kind==="debt").reduce((s,a)=>s+Number(a.balance||0),0);
      const totalReduction = oldestDebt - newestDebt;
      const monthsSpanned = Math.max(1, snapKeys.length - 1);
      const avgMonthly = totalReduction / monthsSpanned;
      if (avgMonthly > 0) historicalMonthlyPaydown = avgMonthly * scenarioConfig.multiplier;
    }
    const d = historicalMonthlyPaydown ? futureDate(Math.ceil(effectiveDebt / historicalMonthlyPaydown)) : null;
    rows.push({
      icon:"⚡",
      title:"Debt Free",
      label: historicalMonthlyPaydown ? dateLabel(d) : "Save 2+ snapshots for a forecast",
      detail: historicalMonthlyPaydown
        ? `${money(effectiveDebt)} remaining · ${money(historicalMonthlyPaydown)}/mo avg paydown`
        : `${money(effectiveDebt)} remaining · tracking begins once you save monthly snapshots`,
      tone:"risk",
      category:"Freedom",
      sort:d ? d.getTime() : Number.MAX_SAFE_INTEGER - 6
    });
  }

  // FIRE + age-aware Coast FIRE using profile data as fallback
  const monthlyExpenses = out;
  if (monthlyExpenses > 0) {
    const annualExpenses = monthlyExpenses * 12;
    const fireTarget = annualExpenses * 25;
    const age = Number(profile.age || 35);
    const retirementAge = Number(profile.retirementAge || 65);
    const yearsToRetirement = Math.max(1, retirementAge - age);
    const realReturn = 0.05;
    const coastFireTarget = Math.round(fireTarget / Math.pow(1 + realReturn, yearsToRetirement));
    const sourceLabel = out > 0 && totals.expenses > 0 ? "" : " · from profile";

    [
      { title:"Coast FIRE", icon:"🌤️", target: coastFireTarget,
        detail:`${money(coastFireTarget)} · age ${age}→${retirementAge} at 5% real return${sourceLabel}`, tone:"forecast" },
      { title:"FIRE", icon:"🔥", target: fireTarget,
        detail:`${money(fireTarget)} · 25× annual spend${sourceLabel}`, tone:"gain" }
    ].filter(m=>netWorth < m.target).forEach((m,i) => {
      const d = futureDate(monthsTo(m.target));
      rows.push({
        icon:m.icon, title:m.title, label:dateLabel(d), detail:m.detail,
        tone:m.tone, category:"Independence",
        sort:d ? d.getTime() : Number.MAX_SAFE_INTEGER - 4 + i
      });
    });
  }

  return rows.sort((a,b)=>a.sort-b.sort).slice(0,10);
}
export function timelineScenarioSummary(state, scenario = "balanced") {
  const latest = latestDashboardState(state);
  const totals = computeTotals(latest);
  const rows = buildWealthTimelineItems(state, scenario);
  const history = historyRows(latest).slice().sort((a,b)=>a.key.localeCompare(b.key)).filter(r=>Number.isFinite(Number(r.net)));
  const growths = history.slice(-6).map((r,i,arr)=> i ? Number(r.net||0) - Number(arr[i-1].net||0) : null).filter(v=>Number.isFinite(v));
  const avgGrowth = growths.length ? growths.reduce((s,v)=>s+v,0)/growths.length : Math.max(0, Number(totals.net||0)-Number(totals.prevNet||0));
  return { next: rows.find(r=>r.category !== "Today") || rows[0], avgGrowth, count: rows.length };
}


export function getProfileMonthlyExpenses(state, totals) {
  if (totals && totals.expenses > 0) return totals.expenses;
  const profileExpenses = (state.profile?.expenses || []);
  return profileExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
}

export function getProfileMonthlyIncome(state, totals) {
  if (totals && totals.income > 0) return totals.income;
  return Number(state.profile?.income || 0);
}

// ── Onboarding Wizard ────────────────────────────────────────────────────────
export function latestDashboardState(state) {
  const snapshotKeys = Object.keys(state.monthSnapshots || {}).filter(key => !isFutureMonth(key));
  const latestSnapshotKey = snapshotKeys.length ? snapshotKeys.sort().at(-1) : null;
  const selectedMonth = latestSnapshotKey || currentMonthKey();
  return { ...state, selectedMonth };
}

export function computeTotals(state) {
  const current = state.monthSnapshots?.[state.selectedMonth];
  const prevKey = addMonths(state.selectedMonth, -1);
  const prev = state.monthSnapshots?.[prevKey];

  const accountSource = current?.accounts || state.accounts;
  const assets = accountSource.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance || 0),0);
  const debts = accountSource.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance || 0),0);

  // Rule: if a previous month was not entered and saved, previous balances are zero.
  const prevAssets = prev ? Number(prev.assets || 0) : 0;
  const prevDebts = prev ? Number(prev.debts || 0) : 0;

  const income = state.transactions
    .filter(t => t.type === "income" && t.recurring)
    .reduce((s,t)=>s+monthlyEquivalent(t),0);

  const expenses = state.transactions
    .filter(t => t.type === "expense" && t.recurring)
    .reduce((s,t)=>s+monthlyEquivalent(t),0);

  return { assets, debts, net: assets-debts, prevAssets, prevDebts, prevNet: prevAssets-prevDebts, income, expenses };
}

export function sixMonthAnimationStart(state, fallbackValue) {
  const rows = historyRows(state).sort((a, b) => a.key.localeCompare(b.key));
  const selectedIndex = rows.findIndex(r => r.key === state.selectedMonth);

  if (selectedIndex >= 0) {
    const startIndex = Math.max(0, selectedIndex - 5);
    return Number(rows[startIndex]?.net || 0);
  }

  const latestSix = rows.slice(-6);
  if (latestSix.length) return Number(latestSix[0].net || 0);

  return Number(fallbackValue || 0);
}



export function selectSmartDashboardGoal(goals, dashboardState, dashboardTotals, accounts) {
  const activeGoals = (goals || []).filter(g => !g.archived);
  if (!activeGoals.length) return null;

  const enriched = activeGoals.map(goal => {
    let calc = calculateGoalProgress(goal, dashboardTotals, accounts);
    calc = refineDebtPayoffCalcWithHistory(goal, dashboardState, calc);
    const forecast = estimateGoalCompletion(goal, dashboardState, calc, dashboardTotals);

    const deadlineScore = goal.deadline
      ? Math.max(0, new Date(goal.deadline).getTime() - Date.now())
      : Number.MAX_SAFE_INTEGER;

    const offTrackScore = Math.max(0, 100 - Number(calc.progress || 0));
    const progressScore = Number(calc.progress || 0);

    return {
      goal,
      calc,
      forecast,
      deadlineScore,
      offTrackScore,
      progressScore
    };
  });

  const modes = [
    enriched.slice().sort((a,b)=>a.deadlineScore-b.deadlineScore)[0],
    enriched.slice().sort((a,b)=>b.offTrackScore-a.offTrackScore)[0],
    enriched.slice().sort((a,b)=>b.progressScore-a.progressScore)[0]
  ].filter(Boolean);

  const uniqueModes = [];
  const seen = new Set();

  for (const item of modes) {
    if (!seen.has(item.goal.id || item.goal.name)) {
      seen.add(item.goal.id || item.goal.name);
      uniqueModes.push(item);
    }
  }

  const rotationIndex = Math.floor(Date.now() / 8000) % uniqueModes.length;

  return uniqueModes[rotationIndex] || uniqueModes[0];
}


export function weightedThreeMonthMomentum(state, currentNet) {
  const rows = historyRows(state)
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .filter(r => Number.isFinite(Number(r.net)));

  if (rows.length < 2) return 0;

  const latest = Number(currentNet ?? rows.at(-1)?.net ?? 0);
  const comparisons = rows.slice(-4, -1).map((row, index, arr) => {
    const previous = Number(row.net || 0);
    if (!previous) return 0;
    const growth = ((latest - previous) / Math.abs(previous)) * 100;
    // Heavier weight on more recent months.
    const weights = [0.2, 0.3, 0.5];
    return growth * weights[Math.max(0, 3 - arr.length + index)];
  });

  const usedWeights = comparisons.length === 1 ? 0.5 : comparisons.length === 2 ? 0.8 : 1;
  const score = comparisons.reduce((sum, value) => sum + value, 0) / usedWeights;

  return Math.round(score);
}



export function upcomingTransactionsForDashboard(state, limit = 4) {
  return upcomingTransactions(state.transactions || [], 365)
    .map(txn => ({
      ...txn,
      dateObj: new Date(txn.occurrenceDate || txn.date)
    }))
    .filter(txn => txn.dateObj && !Number.isNaN(txn.dateObj.getTime()))
    .slice(0, limit);
}




