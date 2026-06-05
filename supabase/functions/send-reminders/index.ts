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

// Mirrors src/lib/money.js — keep these two lists in sync.
const CURRENCY_OPTIONS: [string, string, string][] = [
  ["USD", "US Dollar", "$"],
  ["AUD", "Australian Dollar", "$"],
  ["GBP", "British Pound", "£"],
  ["EUR", "Euro", "€"],
  ["NGN", "Nigerian Naira", "₦"],
  ["CAD", "Canadian Dollar", "$"],
  ["NZD", "New Zealand Dollar", "$"],
  ["JPY", "Japanese Yen", "¥"],
  ["CNY", "Chinese Yuan", "¥"],
  ["INR", "Indian Rupee", "₹"],
  ["ZAR", "South African Rand", "R"],
  ["GHS", "Ghanaian Cedi", "₵"],
  ["KES", "Kenyan Shilling", "KSh"],
  ["CHF", "Swiss Franc", "CHF"],
  ["SGD", "Singapore Dollar", "$"],
  ["AED", "UAE Dirham", "د.إ"],
];

const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCY_OPTIONS.map(([code, , symbol]) => [code, symbol])
);

const isSupportedCurrency = (currency: string) =>
  CURRENCY_OPTIONS.some(([code]) => code === currency);

function userCurrency(state: any) {
  const currency = state?.currency;
  return isSupportedCurrency(currency) ? currency : "USD";
}

function money(value: number, currency = "USD") {
  const code = isSupportedCurrency(currency) ? currency : "USD";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  });

  // Intl falls back to ISO codes for currencies en-US has no symbol for
  // (e.g. "NGN 55"); substitute the currency part so users see ₦55 instead.
  const parts = formatter.formatToParts(Number(value || 0));
  return parts
    .map((part, i) => {
      if (part.type === "currency") return CURRENCY_SYMBOLS[code] || part.value;
      if (part.type === "literal") {
        const neighborIsCurrency =
          parts[i - 1]?.type === "currency" || parts[i + 1]?.type === "currency";
        if (neighborIsCurrency) return "";
      }
      return part.value;
    })
    .join("");
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isFutureMonth(key: string) {
  return key.localeCompare(monthKey(new Date())) > 0;
}

function latestDashboardState(state: any) {
  const snapshotKeys = Object.keys(state?.monthSnapshots || {}).filter((key) => !isFutureMonth(key));
  const latestSnapshotKey = snapshotKeys.length ? snapshotKeys.sort().at(-1) : null;
  const selectedMonth = latestSnapshotKey || state?.selectedMonth || monthKey(new Date());
  return { ...state, selectedMonth };
}

function getAccountsForSelectedMonth(state: any) {
  const selectedMonth = state?.selectedMonth || monthKey(new Date());
  return state?.monthSnapshots?.[selectedMonth]?.accounts || state?.accounts || [];
}

function computeTotals(state: any) {
  const current = state?.monthSnapshots?.[state?.selectedMonth];
  const accountSource = current?.accounts || state?.accounts || [];

  const assets = accountSource
    .filter((a: any) => a.kind === "asset")
    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

  const debts = accountSource
    .filter((a: any) => a.kind === "debt")
    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

  return {
    assets,
    debts,
    net: assets - debts,
  };
}

function normalizeAccountName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function accountNameAliases(name: string) {
  const normalized = normalizeAccountName(name);
  const aliases = new Set([normalized]);

  const map: Record<string, string[]> = {
    super: ["hesta super", "retirement fund", "superannuation"],
    "hesta super": ["super", "retirement fund", "superannuation"],
    fire: ["investment portfolio", "investments", "portfolio"],
    "investment portfolio": ["fire", "investments", "portfolio"],
    "personal loan": ["loan", "debt"],
    loan: ["personal loan", "debt"],
    "net worth": ["networth", "net"],
  };

  for (const [key, values] of Object.entries(map)) {
    if (normalized === key || values.includes(normalized)) {
      aliases.add(key);
      values.forEach((value) => aliases.add(value));
    }
  }

  return aliases;
}

function findGoalAccountInSnapshot(accounts: any[], goal: any) {
  if (!accounts?.length) return null;

  if (goal.accountId) {
    const byId = accounts.find((a: any) => a.id === goal.accountId);
    if (byId) return byId;
  }

  const aliases = accountNameAliases(goal.account);
  return accounts.find((a: any) => aliases.has(normalizeAccountName(a.name))) || null;
}

function inferGoalType(goal: any, accounts: any[]) {
  if (
    goal.goalType === "netWorth" ||
    goal.goalType === "netWorthGoal" ||
    goal.account === "Net Worth" ||
    goal.account === "NET_WORTH"
  ) {
    return "netWorth";
  }

  const linked = findGoalAccountInSnapshot(accounts, goal);

  if (goal.goalType === "debtPayoff" || linked?.kind === "debt" || Number(goal.target || 0) === 0) {
    return "debtPayoff";
  }

  return "accountGrowth";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function calculateGoalProgressLikeApp(goal: any, totals: any, accounts: any[]) {
  const explicitProgress =
    goal.progress ??
    goal.progressPercent ??
    goal.percent ??
    goal.percentage ??
    goal.progressPct ??
    goal.progressPercent;

  if (explicitProgress !== undefined && explicitProgress !== null && explicitProgress !== "") {
    return {
      goalType: goal.goalType || inferGoalType(goal, accounts),
      progress: clamp(Number(explicitProgress)),
      current: Number(goal.current || 0),
      target: Number(goal.target || 0),
      remaining: Math.max(0, Number(goal.target || 0) - Number(goal.current || 0)),
      sourceLabel: goal.account || "Manual",
    };
  }

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

  if (goalType === "accountGrowth" || goalType === "fire" || goalType === "savings") {
    current = linkedAccount ? Number(linkedAccount.balance || 0) : Number(goal.current || 0);
    sourceLabel = linkedAccount?.name || goal.account || "Manual account";
  }

  if (goalType === "debtPayoff") {
    current = linkedAccount ? Number(linkedAccount.balance || 0) : Number(goal.current || 0);
    sourceLabel = linkedAccount?.name || goal.account || "Manual debt";

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
    };
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

      <p>Hi,</p>

      <p>I'm Gil, founder of Grow UP.</p>

      <p>I built Grow UP to help people see their complete financial picture without spreadsheets, guesswork, or stress.</p>

      <p><strong>To help you get immediate value from the app, complete these 3 quick steps:</strong></p>

      <ol>
        <li>Add your assets and debts to see your net worth in one place.</li>
        <li>Add recurring transactions so you never miss important payments.</li>
        <li>Add a financial goal and track your progress automatically.</li>
      </ol>

      <p>Most users complete setup in under 5 minutes.</p>

      <p><strong>P.S.:</strong> What's the one thing you're hoping Grow UP helps you accomplish?</p>

      <p>Hit “Reply” and let me know. I read and respond to every email personally.</p>

      <p>Cheers,<br/>Gil</p>

      <p style="margin-top:28px">
        <a href="${APP_URL}" style="display:inline-block;background:#15181D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:800">Open Grow UP</a>
      </p>
    </div>
  `;
}

function transactionGoalEmailHtml(dueTransactions: any[], goalRows: any[], currency = "USD") {
  const transactionHtml = dueTransactions
    .map(({ txn, days }) => {
      const timing = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      return `
        <div style="padding:16px 0;border-bottom:1px solid #ECECEC">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6D706F;font-weight:800">Upcoming transaction</div>
          <strong>${txn.name}</strong> is due ${timing}.<br/>
          Amount: <strong>${money(txn.amount, currency)}</strong>
        </div>
      `;
    })
    .join("");

  const goalsHtml = goalRows.length
    ? goalRows
        .map(
          ({ goal, calc }) => `
            <div style="padding:12px 0;border-bottom:1px solid #F0F0F0">
              <strong>${goal.name}</strong><br/>
              <span style="color:#5f6561">${Math.round(calc.progress)}% complete · ${calc.sourceLabel}</span>
            </div>
          `
        )
        .join("")
    : `<p style="color:#5f6561">No active goals yet. Add at least one goal to see progress here.</p>`;

  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.65;color:#101214;max-width:620px;margin:0 auto;padding:28px">
      <h2 style="font-size:26px;letter-spacing:-0.03em;margin:0 0 10px">Upcoming money movement</h2>
      <p style="margin:0 0 18px;color:#5f6561">A recurring transaction is coming up. Here is a quick snapshot of where your goals are sitting too.</p>

      ${transactionHtml}

      <h3 style="font-size:22px;letter-spacing:-0.03em;margin:26px 0 8px">Goal snapshot</h3>
      ${goalsHtml}

      <p style="margin-top:24px">
        <a href="${APP_URL}" style="display:inline-block;background:#15181D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700">Open Grow UP</a>
      </p>
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
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend failed:", await res.text());
    return false;
  }

  return true;
}

async function patchPreference(userId: string, patch: Record<string, unknown>) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/growup_email_preferences?user_id=eq.${userId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        ...patch,
        updated_at: new Date().toISOString(),
      }),
    }
  );

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

function dueTransactionsForUser(pref: any, state: any) {
  const reminderDays = Number(pref.transaction_reminder_days || 1);
  const transactions = state?.transactions || [];

  return transactions
    .filter((txn: any) => txn.recurring && normalizeFrequency(txn.frequency) !== "oneOff")
    .map((txn: any) => {
      const due = nextDueDate(txn);
      const days = due ? daysUntil(due) : null;
      return { txn, due, days };
    })
    .filter((item: any) => item.days !== null && item.days >= 0 && item.days <= reminderDays)
    .slice(0, 5);
}

function goalSnapshotRows(state: any) {
  const latestState = latestDashboardState(state);
  const accounts = getAccountsForSelectedMonth(latestState);
  const totals = computeTotals(latestState);

  return (latestState.goals || [])
    .filter((goal: any) => !goal.archived)
    .map((goal: any) => ({
      goal,
      calc: calculateGoalProgressLikeApp(goal, totals, accounts),
    }))
    .sort((a: any, b: any) => Number(b.calc.progress || 0) - Number(a.calc.progress || 0))
    .slice(0, 5);
}

serve(async () => {
  const today = todayKey();

  const prefsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/growup_email_preferences?select=*`,
    { headers }
  );

  if (!prefsRes.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: await prefsRes.text() }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const prefs = await prefsRes.json();

  let welcomeSent = 0;
  let transactionEmailsSent = 0;
  let skipped = 0;

  for (const pref of prefs) {
    if (pref.welcome_email_sent !== true) {
      const ok = await sendEmail(
        pref.email,
        "Welcome to Grow UP",
        welcomeEmailHtml()
      );

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

    if (!state) {
      skipped++;
      continue;
    }

    const dueTransactions = dueTransactionsForUser(pref, state);

    // This is the key product rule:
    // no upcoming recurring transaction = no reminder email.
    if (dueTransactions.length === 0) {
      skipped++;
      continue;
    }

    const goalRows = goalSnapshotRows(state);

    const ok = await sendEmail(
      pref.email,
      "Upcoming transaction + goal snapshot",
      transactionGoalEmailHtml(dueTransactions, goalRows, userCurrency(state))
    );

    if (ok) {
      transactionEmailsSent++;

      await patchPreference(pref.user_id, {
        last_sent_date: today,
      });

      await delay();
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      welcomeSent,
      transactionEmailsSent,
      skipped,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
});
