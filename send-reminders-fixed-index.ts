import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Grow UP <support@lgds.com.au>";
const APP_URL = Deno.env.get("APP_URL") || "https://growupapp.app";

const delay = () => new Promise((resolve) => setTimeout(resolve, 700));

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

function money(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedMonth(state: any) {
  return state?.selectedMonth || monthKey();
}

function getAccountsForSelectedMonth(state: any) {
  const selectedMonth = getSelectedMonth(state);
  return state?.monthSnapshots?.[selectedMonth]?.accounts || state?.accounts || [];
}

function computeTotalsFromState(state: any) {
  const selectedMonth = getSelectedMonth(state);
  const snapshot = state?.monthSnapshots?.[selectedMonth];

  if (snapshot && typeof snapshot.assets !== "undefined" && typeof snapshot.debts !== "undefined") {
    return {
      assets: Number(snapshot.assets || 0),
      debts: Number(snapshot.debts || 0),
      net: Number(snapshot.net ?? (Number(snapshot.assets || 0) - Number(snapshot.debts || 0))),
    };
  }

  const accounts = getAccountsForSelectedMonth(state);
  const assets = accounts
    .filter((a: any) => a.kind === "asset")
    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const debts = accounts
    .filter((a: any) => a.kind === "debt")
    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

  return { assets, debts, net: assets - debts };
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function calculateGoalProgressLikeApp(goal: any, state: any, totals: any, accounts: any[]) {
  if (!goal) return { progress: 0, currentValue: 0, targetValue: 0 };

  const explicitProgress =
    goal.progress ??
    goal.percent ??
    goal.percentage ??
    goal.progressPct ??
    goal.progressPercent;

  if (explicitProgress !== undefined && explicitProgress !== null && explicitProgress !== "") {
    return {
      progress: clampPct(Number(explicitProgress)),
      currentValue: Number(goal.current || 0),
      targetValue: Number(goal.target || 0),
    };
  }

  const target = Number(goal.target || 0);

  if (goal.goalType === "netWorth" || goal.account === "Net Worth") {
    const currentValue = Number(totals.net || 0);
    return {
      progress: target > 0 ? clampPct((currentValue / target) * 100) : 0,
      currentValue,
      targetValue: target,
    };
  }

  if (goal.goalType === "debtPayoff") {
    const linkedDebt = accounts.find((a: any) => a.id === goal.accountId);
    const currentDebt = Number(linkedDebt?.balance ?? goal.current ?? 0);
    const startDebt = Number(goal.start || goal.original || goal.initial || Math.max(currentDebt, 1));
    const paidOff = Math.max(0, startDebt - currentDebt);
    return {
      progress: startDebt > 0 ? clampPct((paidOff / startDebt) * 100) : 0,
      currentValue: paidOff,
      targetValue: startDebt,
      currentDebt,
    };
  }

  if (goal.accountId) {
    const linkedAccount = accounts.find((a: any) => a.id === goal.accountId);
    const currentValue = Number(linkedAccount?.balance ?? goal.current ?? 0);
    return {
      progress: target > 0 ? clampPct((currentValue / target) * 100) : 0,
      currentValue,
      targetValue: target,
    };
  }

  const currentValue = Number(goal.current || 0);
  return {
    progress: target > 0 ? clampPct((currentValue / target) * 100) : 0,
    currentValue,
    targetValue: target,
  };
}

function daysUntil(dateString: string) {
  const today = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function expectedGoalProgress(goal: any) {
  if (!goal?.deadline) return null;

  const deadline = new Date(goal.deadline);
  if (Number.isNaN(deadline.getTime())) return null;

  const now = new Date();
  const created =
    goal.created_at ||
    goal.createdAt ||
    goal.started_at ||
    goal.startDate ||
    `${now.getFullYear()}-01-01`;

  const start = new Date(created);
  if (Number.isNaN(start.getTime())) return null;

  const totalTime = deadline.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  if (totalTime <= 0) return null;

  return clampPct((elapsed / totalTime) * 100);
}

function normalizeFrequency(frequency: string | null | undefined) {
  if (!frequency || frequency === "once") return "oneOff";
  return frequency;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(date: Date, months: number) {
  const original = new Date(date);
  const target = new Date(original);
  target.setDate(1);
  target.setMonth(original.getMonth() + months);
  target.setDate(Math.min(original.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

function advanceDueDate(date: Date, frequency: string) {
  const next = new Date(date);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "fortnightly") next.setDate(next.getDate() + 14);
  else if (frequency === "quarterly") return addMonthsClamped(next, 3);
  else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
  else if (frequency === "monthly") return addMonthsClamped(next, 1);
  return next;
}

function nextDueDate(txn: any) {
  if (!txn?.date) return null;

  let next = new Date(txn.date);
  if (Number.isNaN(next.getTime())) return null;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const frequency = normalizeFrequency(txn.frequency || (txn.recurring ? "monthly" : "oneOff"));

  if (frequency === "oneOff" || !txn.recurring) {
    return next >= start ? next.toISOString().slice(0, 10) : null;
  }

  let safety = 0;
  while (next < start && safety < 500) {
    next = advanceDueDate(next, frequency);
    safety += 1;
  }

  return next.toISOString().slice(0, 10);
}

function welcomeEmailHtml() {
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
      <p style="margin-top:28px"><a href="${APP_URL}" style="display:inline-block;background:#15181D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:800">Open Grow UP</a></p>
    </div>
  `;
}

function insightEmailHtml(signals: string[]) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.65;color:#101214;max-width:620px;margin:0 auto;padding:28px">
      <h2 style="font-size:26px;letter-spacing:-0.03em;margin:0 0 18px">Your Grow UP Insights</h2>
      ${signals.map((signal) => `<div style="padding:16px 0;border-bottom:1px solid #ECECEC">${signal}</div>`).join("")}
      <p style="margin-top:24px"><a href="${APP_URL}" style="display:inline-block;background:#15181D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700">Open Grow UP</a></p>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    console.error("Resend failed:", await res.text());
    return false;
  }

  return true;
}

async function patchPreference(userId: string, patch: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/growup_email_preferences?user_id=eq.${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    console.error("Preference patch failed:", await res.text());
    return false;
  }

  return true;
}

async function getUserState(userId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/growup_snapshots?user_id=eq.${userId}&order=created_at.desc&limit=1&select=app_state,state,created_at`,
    { headers }
  );

  if (!res.ok) {
    console.error("State fetch failed:", await res.text());
    return null;
  }

  const rows = await res.json();
  return rows?.[0]?.app_state || rows?.[0]?.state || null;
}

function buildSignals(pref: any, state: any) {
  const signals: string[] = [];
  if (!state) return signals;

  const today = new Date();
  const reminderDays = Number(pref.transaction_reminder_days || 1);
  const transactions = state.transactions || [];
  const goals = state.goals || [];
  const accounts = getAccountsForSelectedMonth(state);
  const totals = computeTotalsFromState(state);

  for (const txn of transactions) {
    if (!txn.recurring || normalizeFrequency(txn.frequency) === "oneOff") continue;
    const due = nextDueDate(txn);
    if (!due) continue;
    const days = daysUntil(due);
    if (days === null) continue;

    if (days >= 0 && days <= reminderDays) {
      signals.push(
        `<strong>${txn.name}</strong> is due ${
          days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`
        }. Amount: <strong>${money(txn.amount)}</strong>.`
      );
    }
  }

  const monthlyReminderDay = Number(pref.monthly_balance_day || 28);
  if (today.getUTCDate() === monthlyReminderDay) {
    signals.push("Your monthly balance update is due. Update your asset and debt balances so your Wealth Timeline stays accurate.");
  }

  if (pref.goal_reminders) {
    for (const goal of goals.filter((g: any) => !g.archived && g.deadline)) {
      const deadlineDays = daysUntil(goal.deadline);
      if (deadlineDays === null || deadlineDays < 0) continue;

      const calc = calculateGoalProgressLikeApp(goal, state, totals, accounts);
      const progress = calc.progress;
      const expected = expectedGoalProgress(goal);
      if (expected === null || expected < 20) continue;

      if (progress + 15 < expected) {
        signals.push(
          `<strong>${goal.name}</strong> may be off track. Current progress is about <strong>${Math.round(progress)}%</strong>, but expected progress is closer to <strong>${Math.round(expected)}%</strong>.`
        );
      }
    }
  }

  if (pref.milestone_emails) {
    const netWorth = Number(totals.net || 0);
    const milestones = [100000, 250000, 500000, 1000000];
    const reached = milestones.find((m) => netWorth >= m && pref.last_milestone_sent !== String(m));

    if (reached) {
      signals.push(`Milestone reached: your net worth has crossed <strong>${money(reached)}</strong>. Huge progress.`);
      pref.__milestoneToUpdate = String(reached);
    }
  }

  const income = transactions
    .filter((t: any) => t.type === "income")
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const recurringExpenses = transactions
    .filter((t: any) => t.type === "expense" && t.recurring && normalizeFrequency(t.frequency) !== "oneOff")
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  if (income > 0 && recurringExpenses / income >= 0.45) {
    signals.push(
      `Recurring expenses are taking a large share of income: <strong>${money(recurringExpenses)}</strong> recurring expenses vs <strong>${money(income)}</strong> income.`
    );
  }

  return signals;
}

serve(async () => {
  const today = todayKey();

  const prefsRes = await fetch(`${SUPABASE_URL}/rest/v1/growup_email_preferences?select=*`, { headers });

  if (!prefsRes.ok) {
    return new Response(JSON.stringify({ ok: false, error: await prefsRes.text() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prefs = await prefsRes.json();

  let welcomeSent = 0;
  let signalEmailsSent = 0;
  let skipped = 0;

  for (const pref of prefs) {
    if (pref.welcome_email_sent !== true) {
      const ok = await sendEmail(pref.email, "Welcome to Grow UP", welcomeEmailHtml());

      if (ok) {
        welcomeSent++;
        await patchPreference(pref.user_id, {
          welcome_email_sent: true,
          last_welcome_sent_at: new Date().toISOString(),
        });
        await delay();
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

    const state = await getUserState(pref.user_id);
    const signals = buildSignals(pref, state);

    if (signals.length === 0) {
      skipped++;
      continue;
    }

    const ok = await sendEmail(pref.email, "Your Grow UP Insights", insightEmailHtml(signals));

    if (ok) {
      signalEmailsSent++;
      const patch: Record<string, unknown> = { last_sent_date: today };

      if (pref.__milestoneToUpdate) {
        patch.last_milestone_sent = pref.__milestoneToUpdate;
      }

      await patchPreference(pref.user_id, patch);
      await delay();
    }
  }

  return new Response(JSON.stringify({ ok: true, welcomeSent, signalEmailsSent, skipped }), {
    headers: { "Content-Type": "application/json" },
  });
});
