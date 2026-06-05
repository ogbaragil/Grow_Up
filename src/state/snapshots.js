import { monthKey } from "../lib/dates";
import { calculateGoalProgress, refineDebtPayoffCalcWithHistory } from "../lib/goals";
import { normalizeAccounts } from "./normalize";

export function enrichStateWithGoalSnapshotProgress(rawState) {
  try {
    const selectedMonth = rawState.selectedMonth || monthKey();
    const snapshot = rawState.monthSnapshots?.[selectedMonth];

    const accountsForMonth = snapshot?.accounts || rawState.accounts || [];
    const assets = accountsForMonth
      .filter(a => a.kind === "asset")
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    const debts = accountsForMonth
      .filter(a => a.kind === "debt")
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    const totalsForMonth = {
      assets,
      debts,
      net: assets - debts,
      prevNet: 0
    };

    const goalsWithProgress = (rawState.goals || []).map(goal => {
      let calc = calculateGoalProgress(goal, totalsForMonth, accountsForMonth);
      calc = refineDebtPayoffCalcWithHistory(goal, rawState, calc);

      const progress = Math.max(0, Math.min(100, Number(calc.progress || 0)));

      return {
        ...goal,
        progress,
        progressPercent: progress,
        calculatedCurrent: Number(calc.current || 0),
        calculatedTarget: Number(calc.target || goal.target || 0),
        calculatedRemaining: Number(calc.remaining || 0),
        progressSource: calc.sourceLabel || goal.account || "",
        progressGoalType: calc.goalType || goal.goalType || "",
        progressUpdatedAt: new Date().toISOString()
      };
    });

    const nextState = {
      ...rawState,
      goals: goalsWithProgress
    };

    if (snapshot) {
      nextState.monthSnapshots = {
        ...(rawState.monthSnapshots || {}),
        [selectedMonth]: {
          ...snapshot,
          goalProgress: goalsWithProgress.reduce((acc, goal) => {
            acc[goal.id] = {
              id: goal.id,
              name: goal.name,
              progress: goal.progress,
              progressPercent: goal.progressPercent,
              calculatedCurrent: goal.calculatedCurrent,
              calculatedTarget: goal.calculatedTarget,
              calculatedRemaining: goal.calculatedRemaining,
              progressSource: goal.progressSource,
              progressGoalType: goal.progressGoalType,
              updatedAt: goal.progressUpdatedAt
            };
            return acc;
          }, {})
        }
      };
    }

    return nextState;
  } catch (error) {
    console.error("Goal progress snapshot enrichment failed:", error);
    return rawState;
  }
}


export function createMonthlySnapshotState(currentState = {}) {
  const existingSnapshot = currentState.monthSnapshots?.[currentState.selectedMonth];
  const sourceAccounts = existingSnapshot?.accounts || currentState.accounts;
  const cleanAccounts = normalizeAccounts(sourceAccounts);

  const assets = cleanAccounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const debts = cleanAccounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const snapshot = {
    ...(existingSnapshot || {}),
    assets,
    debts,
    net: assets - debts,
    accounts: cleanAccounts,
    note: existingSnapshot?.note || "",
    createdAt: existingSnapshot?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return enrichStateWithGoalSnapshotProgress({
    ...currentState,
    accounts: cleanAccounts,
    monthSnapshots: {
      ...(currentState.monthSnapshots || {}),
      [currentState.selectedMonth]: snapshot
    }
  });
}


