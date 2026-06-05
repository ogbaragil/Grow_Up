import { historyRows } from "./history";
import { addMonths, currentMonthKey, monthDistance, monthLabel } from "./dates";

import { money } from "./money";

export function goalPct(g) {
  // Backward-compatible fallback for simple/manual goals.
  if (!g.target) return 0;
  return Math.max(0, Math.min(100, Number(g.current || 0) / Number(g.target || 1) * 100));
}

export function getAccountsForSelectedMonth(state) {
  const snap = state.monthSnapshots?.[state.selectedMonth];
  return snap?.accounts || state.accounts || [];
}

export function findAccount(accounts, goal) {
  if (!goal.accountId && !goal.account) return null;
  return accounts.find(a => a.id === goal.accountId || a.name === goal.account) || null;
}

export function calculateGoalProgress(goal, totals, accounts) {
  const goalType = goal.goalType || inferGoalType(goal, accounts);
  const target = Number(goal.target || 0);
  const start = Number(goal.start || goal.startAmount || 0);
  const linkedAccount = findGoalAccountInSnapshot(accounts, goal);

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

    // Debt payoff target is always zero debt.
    // If no starting debt was stored, use the largest known debt value from current/start fields.
    // Historical snapshot forecasting can refine this further in GoalCard.
    const originalDebt = Math.max(
      Number(start || 0),
      Number(goal.originalDebt || 0),
      Number(goal.target || 0),
      Number(current || 0)
    );

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

  if (goalType === "savings") {
    current = linkedAccount ? Number(linkedAccount.balance || 0) : Number(goal.current || 0);
    sourceLabel = linkedAccount?.name || goal.account || "Manual account";
    const progress = target > 0 ? clamp((current / target) * 100) : 0;
    const remaining = Math.max(0, target - current);
    return { goalType, current, target, start, progress, remaining, sourceLabel, monthlyNeeded: monthlyNeeded(remaining, goal.deadline) };
  }

  if (goalType === "fire") {
    current = Number(totals.net || 0);
    // Use the user's manually set target. Fall back to 25× expenses only if
    // no target has been set and expenses exist. Show 0 progress if neither.
    const manualTarget = Number(goal.target || 0);
    const expenseBased = Number(totals.expenses || 0) * 12 * 25;
    const fireTarget = manualTarget > 0 ? manualTarget : expenseBased > 0 ? expenseBased : 0;
    sourceLabel = "Financial Independence";
    if (fireTarget <= 0) {
      return { goalType, current, target: 0, start, progress: 0, remaining: 0, sourceLabel, monthlyNeeded: 0, noTarget: true };
    }
    const progress = clamp((current / fireTarget) * 100);
    const remaining = Math.max(0, fireTarget - current);
    return { goalType, current, target: fireTarget, start, progress, remaining, sourceLabel, monthlyNeeded: monthlyNeeded(remaining, goal.deadline) };
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

export function inferGoalType(goal, accounts) {
  if (goal.account === "Net Worth" || goal.account === "NET_WORTH") return "netWorth";
  const linked = findAccount(accounts, goal);
  if (linked?.kind === "debt" || Number(goal.target || 0) === 0) return "debtPayoff";
  return "accountGrowth";
}

export function clamp(n) {
  return Math.max(0, Math.min(100, Number(n || 0)));
}

export function monthlyNeeded(remaining, deadline) {
  if (!deadline || remaining <= 0) return 0;
  const now = new Date();
  const end = new Date(deadline);
  if (end <= now) return remaining;
  const months = Math.max(1, ((end.getFullYear() - now.getFullYear()) * 12) + (end.getMonth() - now.getMonth()));
  return Math.ceil(remaining / months);
}



export function normalizeAccountName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function accountNameAliases(name) {
  const normalized = normalizeAccountName(name);
  const aliases = new Set([normalized]);

  const map = {
    "personal loan": ["loan", "debt loan"],
    "credit card balance": ["credit card", "income tax debt", "tax debt"],
    "income tax debt": ["credit card balance", "tax debt"],
    "retirement fund": ["hesta super", "super", "retirement"],
    "investment portfolio": ["fire", "stocks", "investments"],
    "vehicle savings": ["tesla model 3", "car", "vehicle"],
    "emergency fund": ["lgds", "business asset", "cash reserve"]
  };

  Object.entries(map).forEach(([key, values]) => {
    if (normalized === key || values.includes(normalized)) {
      aliases.add(key);
      values.forEach(v => aliases.add(v));
    }
  });

  return aliases;
}

export function findGoalAccountInSnapshot(accounts, goal) {
  if (!accounts?.length) return null;

  if (goal.accountId) {
    const byId = accounts.find(a => a.id === goal.accountId);
    if (byId) return byId;
  }

  const normalizedGoalAccount = normalizeAccountName(goal.account);
  const byExactName = accounts.find(a => normalizeAccountName(a.name) === normalizedGoalAccount);
  if (byExactName) return byExactName;

  // Migration fallback for older saved goals/accounts that predate explicit account.subtype.
  const aliases = accountNameAliases(goal.account);
  return accounts.find(a => aliases.has(normalizeAccountName(a.name))) || null;
}

export function goalValueForSnapshot(goal, snapshot) {
  const accounts = snapshot?.accounts || [];
  const totals = {
    assets: Number(snapshot?.assets || 0),
    debts: Number(snapshot?.debts || 0),
    net: Number(snapshot?.net || 0)
  };

  const goalType = goal.goalType || inferGoalType(goal, accounts);

  if (goalType === "netWorth") return totals.net;

  const account = findGoalAccountInSnapshot(accounts, goal);
  if (!account) return null;

  return Number(account.balance || 0);
}

export function estimateGoalCompletion(goal, state, currentCalc, totals) {
  const rows = historyRows(state)
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(row => {
      const snapshot = state.monthSnapshots?.[row.key];
      return {
        key: row.key,
        value: goalValueForSnapshot(goal, snapshot)
      };
    })
    .filter(row => row.value !== null && Number.isFinite(row.value));

  if (rows.length < 2) {
    return {
      label: "Need more history",
      detail: "Save at least 2 monthly snapshots for a forecast.",
      monthlyRate: 0,
      kind: "neutral"
    };
  }

  const recent = rows.slice(-12);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const monthSpan = Math.max(1, monthDistance(first.key, last.key));
  const goalType = currentCalc.goalType || goal.goalType;

  let monthlyRate = 0;
  let remaining = Number(currentCalc.remaining || 0);

  if (goalType === "debtPayoff") {
    monthlyRate = (Number(first.value || 0) - Number(last.value || 0)) / monthSpan;

    if (monthlyRate <= 0) {
      const bestOlder = recent
        .slice(0, -1)
        .map(row => ({ ...row, drop: Number(row.value || 0) - Number(last.value || 0) }))
        .sort((a, b) => b.drop - a.drop)[0];

      if (bestOlder?.drop > 0) {
        monthlyRate = bestOlder.drop / Math.max(1, monthDistance(bestOlder.key, last.key));
      }
    }

    remaining = Number(currentCalc.remaining || 0);
  } else {
    monthlyRate = (Number(last.value || 0) - Number(first.value || 0)) / monthSpan;

    if (monthlyRate <= 0) {
      const bestOlder = recent
        .slice(0, -1)
        .map(row => ({ ...row, gain: Number(last.value || 0) - Number(row.value || 0) }))
        .sort((a, b) => b.gain - a.gain)[0];

      if (bestOlder?.gain > 0) {
        monthlyRate = bestOlder.gain / Math.max(1, monthDistance(bestOlder.key, last.key));
      }
    }

    remaining = Number(currentCalc.remaining || 0);
  }

  // Historical pace only — no surplus blending
  if (currentCalc.progress >= 100 || remaining <= 0) {
    return {
      label: "Already complete",
      detail: "Goal has been reached.",
      monthlyRate,
      kind: "complete"
    };
  }

  if (monthlyRate <= 0) {
    return {
      label: "No clear ETA",
      detail: "Historical data is flat or moving away from this goal.",
      monthlyRate,
      kind: "warning"
    };
  }

  const monthsToFinish = Math.ceil(remaining / monthlyRate);
  const completionKey = addMonths(state.selectedMonth || currentMonthKey(), monthsToFinish);

  return {
    label: monthLabel(completionKey),
    detail: `Based on ${money(monthlyRate)}/mo historical pace`,
    monthlyRate,
    monthsToFinish,
    kind: "active"
  };
}

export function refineDebtPayoffCalcWithHistory(goal, state, calc) {
  if ((calc.goalType || goal.goalType) !== "debtPayoff") return calc;

  const historicalValues = historyRows(state)
    .map(row => goalValueForSnapshot(goal, state.monthSnapshots?.[row.key]))
    .filter(value => value !== null && Number.isFinite(value))
    .map(Number);

  if (!historicalValues.length) return calc;

  const historicalStart = Math.max(...historicalValues, Number(calc.start || 0), Number(calc.current || 0));
  const current = Number(calc.current || historicalValues.at(-1) || 0);
  const paidOff = Math.max(0, historicalStart - current);
  const progress = historicalStart > 0 ? clamp((paidOff / historicalStart) * 100) : 0;

  return {
    ...calc,
    start: historicalStart,
    progress,
    remaining: Math.max(0, current),
    monthlyNeeded: monthlyNeeded(Math.max(0, current), goal.deadline)
  };
}

export function goalStatus(calc, goal) {
  if (calc.progress >= 100) {
    return { kind:"complete", icon:"🎉", label:"Complete!", detail:"Goal reached" };
  }
  if (calc.noTarget) {
    return { kind:"active", icon:"⚙️", label:"Set a target", detail:"Enter a target to track progress" };
  }

  const pct = Math.round(calc.progress || 0);
  const hasDeadline = !!goal.deadline;
  const need = calc.monthlyNeeded;

  if (!hasDeadline) {
    if (pct >= 75) return { kind:"complete", icon:"🔥", label:"Nearly there", detail:`${pct}% complete` };
    if (pct >= 40) return { kind:"active", icon:"📈", label:"On track", detail:`${pct}% complete` };
    return { kind:"active", icon:"🎯", label:"Started", detail:`${pct}% complete` };
  }

  const now = new Date();
  const deadline = new Date(goal.deadline);
  const monthsLeft = Math.max(0, (deadline.getFullYear()-now.getFullYear())*12+(deadline.getMonth()-now.getMonth()));

  if (monthsLeft <= 0) {
    return pct >= 100
      ? { kind:"complete", icon:"🎉", label:"Complete!", detail:"Deadline reached" }
      : { kind:"warning", icon:"⚠️", label:"Deadline passed", detail:`${pct}% complete at deadline` };
  }

  if (need <= 0) {
    return { kind:"complete", icon:"✅", label:"Ahead of pace", detail:`On track for ${deadline.toLocaleDateString("en-US",{month:"short",year:"numeric"})}` };
  }

  const monthlyRate = calc.monthlyRate || 0;
  if (monthlyRate > 0) {
    const ratio = monthlyRate / need;
    if (ratio >= 1.1) return { kind:"complete", icon:"🚀", label:"Ahead of pace", detail:`${Math.round(ratio*100-100)}% faster than needed` };
    if (ratio >= 0.8) return { kind:"active", icon:"✓", label:"On track", detail:`${money(need)}/mo needed` };
    return { kind:"warning", icon:"⚠️", label:"Behind pace", detail:`Need ${money(need)}/mo, tracking lower` };
  }

  return { kind:"active", icon:"⏳", label:"Tracking", detail:`${money(need)}/mo needed · ${monthsLeft}mo left` };
}

export function goalTypeLabel(type) {
  return {
    netWorth: "Net Worth Goal",
    accountGrowth: "Account Growth Goal",
    debtPayoff: "Debt Payoff Goal",
    savings: "Savings Goal",
    fire: "FIRE"
  }[type || "accountGrowth"] || "Goal";
}

export function goalIconForType(type) {
  return {
    netWorth: "🎯",
    accountGrowth: "💼",
    debtPayoff: "⚡",
    savings: "🏦",
    fire: "🔥"
  }[type || "accountGrowth"] || "🎯";
}

export function goalColorForType(type) {
  return {
    netWorth: "purple",
    accountGrowth: "green",
    debtPayoff: "red",
    savings: "blue",
    fire: "gold"
  }[type || "accountGrowth"] || "green";
}

