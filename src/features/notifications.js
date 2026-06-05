import { supabase } from "../supabaseClient";
import { daysUntil } from "../lib/dates";
import { money } from "../lib/money";
import { nextTransactionDueDate, normalizeFrequency } from "../lib/transactions";

export function notificationPermissionStatus() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestGrowUpNotifications(setState, notify = () => {}) {
  if (!("Notification" in window)) {
    notify("Notifications are not supported by this browser.", "error");
    return false;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    setState(s => ({ ...s, notificationsEnabled: true }));
    new Notification("Grow UP notifications enabled", {
      body: "You’ll get reminders for recurring transactions and monthly balance updates."
    });
    return true;
  }

  setState(s => ({ ...s, notificationsEnabled: false }));
  notify("Notifications were not enabled. You can turn them on later in your browser settings.", "info");
  return false;
}

export function showGrowUpNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, { body });
  } catch {
    // Browser blocked it; fail silently.
  }
}

export function runGrowUpNotificationChecks(state) {
  if (!state?.notificationsEnabled) return;
  if (notificationPermissionStatus() !== "granted") return;

  const todayKey = new Date().toISOString().slice(0, 10);
  const sentKey = `growup_notifications_sent_${todayKey}`;

  if (localStorage.getItem(sentKey)) return;

  const recurring = (state.transactions || [])
    .filter(t => t.recurring && normalizeFrequency(t.frequency) !== "oneOff")
    .map(t => ({ txn:t, due:nextTransactionDueDate(t) }))
    .filter(item => item.due)
    .map(item => ({ ...item, days:daysUntil(item.due) }))
    .filter(item => item.days !== null && item.days >= 0 && item.days <= 2)
    .slice(0, 3);

  if (recurring.length) {
    const first = recurring[0];
    showGrowUpNotification(
      `${first.txn.name} is due ${first.days === 0 ? "today" : first.days === 1 ? "tomorrow" : "soon"}`,
      `${first.txn.type === "income" ? "Expected income" : "Expected expense"}: ${money(first.txn.amount, state.currency)}`
    );
  }

  const now = new Date();
  const isMonthEndWindow = now.getDate() >= 25 || now.getDate() <= 3;
  const balanceReminderKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  if (isMonthEndWindow && localStorage.getItem("growup_last_balance_reminder") !== balanceReminderKey) {
    showGrowUpNotification(
      "Update your monthly balances",
      "Refresh asset and debt balances so your net worth timeline stays accurate."
    );
    localStorage.setItem("growup_last_balance_reminder", balanceReminderKey);
  }

  localStorage.setItem(sentKey, "true");
}


export async function saveEmailReminderPreferences({ session, state, update, overrides = {}, notify = () => {} }) {
  const client = window.supabaseClient || window.supabase || (typeof supabase !== "undefined" ? supabase : null);

  if (!client) {
    notify("Supabase is not connected yet.", "error");
    return false;
  }

  const user = session?.user;

  if (!user?.id || !user?.email) {
    notify("Please sign in to enable email reminders.", "error");
    return false;
  }

  const nextPrefs = {
    emailRemindersEnabled: overrides.emailRemindersEnabled ?? state.emailRemindersEnabled ?? true,
    emailReminderDays: Number(overrides.emailReminderDays ?? state.emailReminderDays ?? 1),
    monthlyBalanceReminderDay: Number(overrides.monthlyBalanceReminderDay ?? state.monthlyBalanceReminderDay ?? 28),
    emailGoalReminders: overrides.emailGoalReminders ?? state.emailGoalReminders ?? true,
    emailMilestoneEmails: overrides.emailMilestoneEmails ?? state.emailMilestoneEmails ?? true
  };

  const payload = {
    user_id: user.id,
    email: user.email,
    enabled: Boolean(nextPrefs.emailRemindersEnabled),
    transaction_reminder_days: nextPrefs.emailReminderDays,
    monthly_balance_day: nextPrefs.monthlyBalanceReminderDay,
    goal_reminders: Boolean(nextPrefs.emailGoalReminders),
    milestone_emails: Boolean(nextPrefs.emailMilestoneEmails),
    updated_at: new Date().toISOString()
  };

  const { error } = await client
    .from("growup_email_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error(error);
    notify("Could not save email reminder preferences. Please check Supabase setup.", "error");
    return false;
  }

  update(nextPrefs);
  return true;
}

export async function loadEmailReminderPreferences({ session, update }) {
  const client = window.supabaseClient || window.supabase || (typeof supabase !== "undefined" ? supabase : null);

  if (!client || !session?.user?.id) return;

  const { data, error } = await client
    .from("growup_email_preferences")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) return;

  update({
    emailRemindersEnabled: Boolean(data.enabled),
    emailReminderDays: Number(data.transaction_reminder_days ?? 1),
    monthlyBalanceReminderDay: Number(data.monthly_balance_day ?? 28),
    emailGoalReminders: Boolean(data.goal_reminders),
    emailMilestoneEmails: Boolean(data.milestone_emails)
  });
}


// Returns monthly expenses from profile if no transactions set up yet,
// otherwise uses real transaction data. Callers get a consistent number either way.
