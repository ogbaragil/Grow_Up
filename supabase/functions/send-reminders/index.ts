
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Grow UP <reminders@growupapp.app>";
const APP_URL = Deno.env.get("APP_URL") || "https://growupapp.app";

type Pref = {
  user_id: string;
  email: string;
  enabled: boolean;
  transaction_reminder_days?: number;
  monthly_balance_day?: number;
  goal_reminders?: boolean;
  milestone_emails?: boolean;
  welcome_email_sent?: boolean;
  last_sent_date?: string | null;
};

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(a: Date, b: Date) {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function nextTransactionDueDate(txn: any, from = new Date()) {
  if (!txn?.date) return null;
  const base = new Date(txn.date);
  if (Number.isNaN(base.getTime())) return null;

  const frequency = txn.frequency || (txn.recurring ? "monthly" : "once");
  let next = new Date(base);

  const advance = () => {
    if (frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (frequency === "fortnightly") next.setDate(next.getDate() + 14);
    else if (frequency === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
    else if (frequency === "once") return false;
    else next.setMonth(next.getMonth() + 1);
    return true;
  };

  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  while (next < today) {
    if (!advance()) return null;
  }

  return next;
}

function latestAppStateFromSnapshot(snapshot: any) {
  return snapshot?.app_state || snapshot?.state || null;
}

function totalsFromState(state: any) {
  const selectedMonth = state?.selectedMonth || monthKey();
  const current = state?.monthSnapshots?.[selectedMonth];
  const accounts = current?.accounts || state?.accounts || [];

  const assets = accounts
    .filter((a: any) => a.kind === "asset")
    .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

  const debts = accounts
    .filter((a: any) => a.kind === "debt")
    .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

  const prevMonth = new Date(`${selectedMonth}-01T00:00:00Z`);
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
  const prevKey = `${prevMonth.getUTCFullYear()}-${String(prevMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const prev = state?.monthSnapshots?.[prevKey];

  return {
    selectedMonth,
    assets,
    debts,
    net: assets - debts,
    prevNet: Number(prev?.net || 0),
    accounts,
    hasCurrentSnapshot: Boolean(state?.monthSnapshots?.[monthKey()]),
  };
}

function goalProgress(goal: any, totals: any) {
  if (!goal) return 0;

  if (goal.goalType === "netWorth") {
    return Math.min(100, Math.max(0, (totals.net / Math.max(1, Number(goal.target || 1))) * 100));
  }

  if (goal.goalType === "debtPayoff") {
    const debt = totals.accounts.find((a: any) => a.id === goal.accountId);
    const currentDebt = Number(debt?.balance ?? goal.current ?? 0);
    const start = Number(goal.start || currentDebt || 1);
    return Math.min(100, Math.max(0, ((start - currentDebt) / Math.max(1, start)) * 100));
  }

  if (goal.accountId) {
    const account = totals.accounts.find((a: any) => a.id === goal.accountId);
    const current = Number(account?.balance ?? goal.current ?? 0);
    return Math.min(100, Math.max(0, (current / Math.max(1, Number(goal.target || 1))) * 100));
  }

  return Math.min(100, Math.max(0, (Number(goal.current || 0) / Math.max(1, Number(goal.target || 1))) * 100));
}

function expectedGoalProgress(goal: any) {
  if (!goal?.deadline) return null;
  const deadline = new Date(goal.deadline);
  if (Number.isNaN(deadline.getTime())) return null;

  const created = goal.createdAt ? new Date(goal.createdAt) : new Date(new Date().getFullYear(), 0, 1);
  const now = new Date();

  const total = deadline.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();
  if (total <= 0) return null;

  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function buildWelcomeHtml() {
  return `
  <div style="font-family:Inter,Arial,sans-serif;line-height:1.65;color:#101214;max-width:620px;margin:0 auto;padding:28px">
    <h1 style="font-size:28px;letter-spacing:-0.04em;margin:0 0 18px">Welcome to Grow UP</h1>

    <p>Hey,</p>

    <p>My name is Gil — I'm the founder and CEO of Grow UP.</p>

    <p>We started Grow UP because managing money shouldn’t feel overwhelming. Most people know they want to build wealth, pay off debt, or feel more in control financially — but they’ve never had a simple system that brings everything together in one place.</p>

    <p><strong>Here are 3 tips to get started.</strong></p>

    <ol>
      <li>Add your Assets and Debts Accounts</li>
      <li>Add Important Recurring Transactions</li>
      <li>Add at least one goal</li>
    </ol>

    <p><strong>P.S.:</strong> Why did you sign up? What brought you here?</p>

    <p>Hit “Reply” and let me know. I read and reply to every email.</p>

    <p>Cheers,<br/>Gil</p>

    <p style="margin-top:28px">
      <a href="${APP_URL}" style="display:inline-block;background:#15181D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:800">Open Grow UP</a>
    </p>
  </div>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend failed", res.status, body);
    return false;
  }

  return true;
}

async function getPrefs(): Promise<Pref[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/growup_email_preferences?select=*`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function getLatestState(userId: string) {
  const url = `${SUPABASE_URL}/rest/v1/growup_snapshots?select=app_state,state,created_at&user_id=eq.${userId}&order=created_at.desc&limit=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const rows = await res.json();
  return latestAppStateFromSnapshot(rows?.[0]);
}

async function patchPref(userId: string, patch: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/growup_email_preferences?user_id=eq.${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

function reminderSections(pref: Pref, state: any) {
  const sections: { title: string; body: string; tone?: string }[] = [];
  if (!state) return sections;

  const today = new Date();
  const totals = totalsFromState(state);
  const reminderDays = Number(pref.transaction_reminder_days ?? 1);

  const dueTransactions = (state.transactions || [])
    .filter((t: any) => t.recurring || (t.frequency && t.frequency !== "once"))
    .map((txn: any) => {
      const due = nextTransactionDueDate(txn, today);
      return { txn, due, days: due ? daysBetween(today, due) : null };
    })
    .filter((item: any) => item.due && item.days !== null && item.days >= 0 && item.days <= reminderDays)
    .slice(0, 4);

  for (const item of dueTransactions) {
    sections.push({
      title: `${item.txn.name} is due ${item.days === 0 ? "today" : item.days === 1 ? "tomorrow" : `in ${item.days} days`}`,
      body: `${item.txn.type === "income" ? "Expected income" : "Expected expense"}: ${money(item.txn.amount)}.`,
      tone: item.txn.type === "income" ? "gain" : "risk",
    });
  }

  const monthlyDay = Number(pref.monthly_balance_day ?? 28);
  const isBalanceReminderDay = today.getDate() === monthlyDay || (monthlyDay === 31 && today.getDate() >= 28 && addDays(today, 1).getMonth() !== today.getMonth());
  if (isBalanceReminderDay && !totals.hasCurrentSnapshot) {
    sections.push({
      title: "Update your monthly balances",
      body: "Your current month asset/debt snapshot is missing. Update balances so net worth, insights, and Wealth Timeline stay accurate.",
      tone: "forecast",
    });
  }

  if (pref.goal_reminders) {
    const offTrack = (state.goals || [])
      .filter((g: any) => !g.archived && g.deadline)
      .map((goal: any) => {
        const actual = goalProgress(goal, totals);
        const expected = expectedGoalProgress(goal);
        return { goal, actual, expected };
      })
      .filter((g: any) => g.expected !== null && g.actual + 12 < g.expected)
      .slice(0, 2);

    for (const item of offTrack) {
      sections.push({
        title: `${item.goal.name} may be off track`,
        body: `Current progress is ${Math.round(item.actual)}%, while the timeline suggests closer to ${Math.round(item.expected)}%.`,
        tone: "risk",
      });
    }
  }

  if (pref.milestone_emails && totals.prevNet > 0) {
    const milestones = [100000, 250000, 500000, 1000000];
    const crossed = milestones.find((m) => totals.prevNet < m && totals.net >= m);
    if (crossed) {
      sections.push({
        title: `You crossed ${money(crossed)} net worth`,
        body: "Huge milestone. Your progress is compounding into something real.",
        tone: "gain",
      });
    }
  }

  const recurringExpenses = (state.transactions || [])
    .filter((t: any) => t.type === "expense" && (t.recurring || (t.frequency && t.frequency !== "once")));
  const recurringIncome = (state.transactions || [])
    .filter((t: any) => t.type === "income")
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const recurringExpenseTotal = recurringExpenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  if (recurringIncome > 0 && recurringExpenseTotal / recurringIncome >= 0.45) {
    sections.push({
      title: "Recurring expenses are taking a large share of income",
      body: `${money(recurringExpenseTotal)} in recurring expenses versus ${money(recurringIncome)} income. Worth reviewing subscriptions and fixed costs.`,
      tone: "forecast",
    });
  }

  return sections.slice(0, 6);
}

function buildReminderHtml(sections: { title: string; body: string; tone?: string }[]) {
  const cards = sections.map((s) => {
    const color = s.tone === "gain" ? "#2F8F5B" : s.tone === "risk" ? "#C96D4B" : "#5967E8";
    return `
      <div style="border:1px solid rgba(16,18,20,.08);border-radius:18px;padding:16px;margin:12px 0;background:#fff">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:${color};margin-bottom:6px">Grow UP signal</div>
        <h3 style="margin:0 0 8px;font-size:18px;letter-spacing:-.03em;color:#101214">${s.title}</h3>
        <p style="margin:0;color:#5f6561">${s.body}</p>
      </div>`;
  }).join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#101214;max-width:640px;margin:0 auto;padding:28px;background:#F5F3EF">
      <h1 style="font-size:28px;letter-spacing:-.04em;margin:0 0 8px">Your Grow UP reminders</h1>
      <p style="margin:0 0 18px;color:#5f6561">A quick read on what needs your attention.</p>
      ${cards}
      <p style="margin-top:24px">
        <a href="${APP_URL}" style="display:inline-block;background:#15181D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:800">Open Grow UP</a>
      </p>
    </div>`;
}

serve(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const prefs = await getPrefs();

  let welcomeSent = 0;
  let reminderSent = 0;
  let skipped = 0;

  for (const pref of prefs) {
    if (!pref.welcome_email_sent) {
      const ok = await sendEmail(pref.email, "Welcome to Grow UP", buildWelcomeHtml());
      if (ok) {
        welcomeSent++;
        await patchPref(pref.user_id, { welcome_email_sent: true });
      }
    }

    if (!pref.enabled) {
      skipped++;
      continue;
    }

    if (pref.last_sent_date === today) {
      skipped++;
      continue;
    }

    const state = await getLatestState(pref.user_id);
    const sections = reminderSections(pref, state);

    if (!sections.length) {
      skipped++;
      continue;
    }

    const ok = await sendEmail(pref.email, "Your Grow UP reminders", buildReminderHtml(sections));
    if (ok) {
      reminderSent++;
      await patchPref(pref.user_id, { last_sent_date: today });
    }
  }

  return new Response(JSON.stringify({ ok: true, welcomeSent, reminderSent, skipped }), {
    headers: { "Content-Type": "application/json" },
  });
});
