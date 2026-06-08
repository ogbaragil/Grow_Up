import { monthKey } from "../lib/dates";
import { normalizeAccountName } from "../lib/goals";
import { isSupportedCurrency } from "../lib/money";

export const ACCOUNT_SUBTYPE_OPTIONS = [
  ["super", "Retirement fund"],
  ["investment", "Investment"],
  ["savings", "Savings"],
  ["property", "Property"],
  ["emergency", "Emergency fund"],
  ["loan", "Loan"],
  ["credit_card", "Credit card"],
  ["other", "Other"]
];
export const ACCOUNT_SUBTYPE_VALUES = ACCOUNT_SUBTYPE_OPTIONS.map(([value]) => value);

export function inferAccountSubtype(account = {}) {
  if (ACCOUNT_SUBTYPE_VALUES.includes(account.subtype)) return account.subtype;
  const normalized = normalizeAccountName(account.name || "");
  if (/super|retirement/.test(normalized)) return "super";
  if (/invest|portfolio|stock|fire/.test(normalized)) return "investment";
  if (/property|house|home/.test(normalized)) return "property";
  if (/emergency|cash reserve/.test(normalized)) return "emergency";
  if (/credit card|card/.test(normalized)) return "credit_card";
  if (/loan|debt|tax/.test(normalized)) return "loan";
  if (/saving|hisa|cash/.test(normalized)) return "savings";
  return "other";
}

export function normalizeAccounts(accounts = []) {
  const list = Array.isArray(accounts) ? accounts : [];
  const hasCurrentModel = list.some(a => a?.kind === "asset" || a?.kind === "debt");
  const byId = new Map();

  for (const account of list) {
    if (!account) continue;

    // If the array contains current-model accounts, drop legacy category-only rows.
    // If an old backup only has category rows, migrate category -> kind instead.
    const kind =
      account.kind === "asset" || account.kind === "debt"
        ? account.kind
        : !hasCurrentModel && (account.category === "asset" || account.category === "debt")
          ? account.category
          : null;

    if (!kind) continue;

    const id = account.id || safeId();
    byId.set(id, {
      id,
      name: account.name || "Account",
      icon: account.icon || (kind === "asset" ? "🏦" : "💳"),
      kind,
      subtype: inferAccountSubtype(account),
      balance: Number(account.balance || 0),
      previous: Number(account.previous || 0)
    });
  }

  return Array.from(byId.values());
}

export function normalizeSnapshot(snapshot = {}) {
  const accounts = normalizeAccounts(snapshot.accounts || []);

  if (!accounts.length) {
    return { ...snapshot };
  }

  const assets = accounts
    .filter(a => a.kind === "asset")
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const debts = accounts
    .filter(a => a.kind === "debt")
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return {
    ...snapshot,
    accounts,
    assets,
    debts,
    net: assets - debts
  };
}

export function normalizeGrowState(rawState = {}) {
  const base = { ...EMPTY_STATE, ...rawState };
  base.currency = isSupportedCurrency(base.currency) ? base.currency : "USD";

  // Migration: existing users have no profileComplete in saved state.
  // Treat anyone with existing data as already set up so they skip the wizard.
  if (!rawState.profileComplete && (
    (rawState.accounts && rawState.accounts.length > 0) ||
    (rawState.monthSnapshots && Object.keys(rawState.monthSnapshots).length > 0) ||
    (rawState.goals && rawState.goals.length > 0) ||
    (rawState.transactions && rawState.transactions.length > 0)
  )) {
    base.profileComplete = true;
  }

  // Ensure profile always exists with safe defaults
  base.profile = {
    age: null, retirementAge: 65, income: null,
    expenses: [], primaryGoal: null, roughDebt: null,
    ...(rawState.profile || {})
  };

  const monthSnapshots = Object.fromEntries(
    Object.entries(base.monthSnapshots || {}).map(([key, snapshot]) => [
      key,
      normalizeSnapshot(snapshot || {})
    ])
  );

  const rootAccounts = normalizeAccounts(base.accounts || []);
  const selectedSnapshotAccounts = monthSnapshots?.[base.selectedMonth]?.accounts || [];
  const latestKey = Object.keys(monthSnapshots).sort().at(-1);
  const latestSnapshotAccounts = latestKey ? monthSnapshots[latestKey]?.accounts || [] : [];

  return {
    ...base,
    accounts: rootAccounts.length ? rootAccounts : selectedSnapshotAccounts.length ? selectedSnapshotAccounts : latestSnapshotAccounts,
    monthSnapshots
  };
}

export function safeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export const EMPTY_STATE = {
  firstName: "",
  theme: "light",
  emailRemindersEnabled: false,
  emailReminderDays: 1,
  monthlyBalanceReminderDay: 28,
  emailGoalReminders: true,
  emailMilestoneEmails: true,
  onboardingDismissed: false,
  firstSnapshotCelebrationDismissed: false,
  profileComplete: false,
  profile: {
    age: null,
    retirementAge: 65,
    income: null,
    expenses: [],        // [{ name, amount, icon }]
    primaryGoal: null,   // "debt" | "savings" | "house" | "fire" | "invest"
    roughDebt: null
  },
  mode: "Real Mode",
  currency: "USD",
  selectedMonth: monthKey(),
  accounts: [],
  transactions: [],
  goals: [],
  monthSnapshots: {}
};
