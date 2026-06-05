import { addMonthsClamped } from "./dates";

export function nextTransactionDueDate(txn, from = new Date()) {
  return getNextOccurrence(txn, from);
}

export function normalizeFrequency(frequency) {
  if (!frequency || frequency === "once") return "oneOff";
  return frequency;
}

export function monthlyEquivalent(transaction) {
  const amount = Number(transaction.amount || 0);
  // Task 9: ended transactions contribute nothing to monthly totals
  if (transaction.endsOn && new Date(transaction.endsOn) <= new Date()) return 0;
  const frequency = normalizeFrequency(transaction.frequency || (transaction.recurring ? "monthly" : "oneOff"));

  switch (frequency) {
    case "weekly":
      return amount * 52 / 12;
    case "fortnightly":
      return amount * 26 / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "oneOff":
    default:
      return 0;
  }
}

export function addFrequency(date, frequency) {
  const d = new Date(date);
  const normalizedFrequency = normalizeFrequency(frequency);

  switch (normalizedFrequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "fortnightly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      return addMonthsClamped(d, 1);
    case "quarterly":
      return addMonthsClamped(d, 3);
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return d;
  }

  return d;
}

export function getNextOccurrence(transaction, from = new Date()) {
  if (!transaction?.date) return null;

  const frequency = normalizeFrequency(transaction.frequency || (transaction.recurring ? "monthly" : "oneOff"));
  let occurrenceDate = new Date(transaction.date);
  if (Number.isNaN(occurrenceDate.getTime())) return null;

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (frequency === "oneOff" || !transaction.recurring) {
    return occurrenceDate >= start ? occurrenceDate : null;
  }

  let safety = 0;
  while (occurrenceDate < start && safety < 500) {
    occurrenceDate = addFrequency(occurrenceDate, frequency);
    safety += 1;
  }

  return occurrenceDate;
}

export function withNextOccurrence(transaction) {
  const occurrenceDate = getNextOccurrence(transaction);
  return occurrenceDate ? { ...transaction, occurrenceDate: occurrenceDate.toISOString(), displayDate: occurrenceDate.toISOString() } : transaction;
}

export function recurringCashflowTransactions(transactions, type) {
  return (transactions || [])
    .filter(t => t.recurring && t.type === type && normalizeFrequency(t.frequency) !== "oneOff")
    .map(withNextOccurrence)
    .sort((a, b) => new Date(a.occurrenceDate || a.date) - new Date(b.occurrenceDate || b.date));
}

export function upcomingTransactions(transactions, days) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const out = [];

  for (const transaction of transactions) {
    const frequency = normalizeFrequency(transaction.frequency || (transaction.recurring ? "monthly" : "oneOff"));
    let occurrenceDate = new Date(transaction.date);

    if (frequency === "oneOff" || !transaction.recurring) {
      if (occurrenceDate >= start && occurrenceDate <= end) {
        out.push({ ...transaction, occurrenceDate: occurrenceDate.toISOString() });
      }
      continue;
    }

    // Advance recurring item until it reaches the current window.
    let safety = 0;
    while (occurrenceDate < start && safety < 500) {
      occurrenceDate = addFrequency(occurrenceDate, frequency);
      safety += 1;
    }

    // Include all occurrences inside the selected window.
    while (occurrenceDate <= end && safety < 600) {
      // Task 9: stop if past endsOn date
      if (transaction.endsOn && occurrenceDate > new Date(transaction.endsOn)) break;
      out.push({
        ...transaction,
        occurrenceDate: occurrenceDate.toISOString(),
        displayDate: occurrenceDate.toISOString()
      });
      occurrenceDate = addFrequency(occurrenceDate, frequency);
      safety += 1;
    }
  }

  return out.sort((a,b)=>new Date(a.occurrenceDate || a.date)-new Date(b.occurrenceDate || b.date));
}

export function frequencyLabel(frequency) {
  return {
    oneOff: "one-off",
    weekly: "weekly",
    fortnightly: "fortnightly",
    monthly: "monthly",
    quarterly: "quarterly",
    yearly: "yearly"
  }[frequency || "monthly"] || "monthly";
}

