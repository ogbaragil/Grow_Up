import { supabase } from "../supabaseClient";

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
