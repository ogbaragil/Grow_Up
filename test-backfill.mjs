// Run with: tsx test-backfill.mjs   (state layer is pure — no DOM needed)
import { createMonthlySnapshotState } from "./src/state/snapshots.js";
import { monthKey, addMonths } from "./src/lib/dates.js";

let pass = 0, fail = 0;
const assert = (cond, msg) => { cond ? pass++ : (fail++, console.error("FAIL:", msg)); };

const CURRENT = monthKey();
const PREV = addMonths(CURRENT, -1);

const liveAccounts = [
  { id: "a1", name: "Savings", kind: "asset", subtype: "savings", balance: 5000, previous: 0 },
  { id: "d1", name: "Card", kind: "debt", subtype: "credit_card", balance: 1200, previous: 0 },
];

// ── Scenario 1: BACKFILL — user is on PREV month, snapshot holds May values
// (4000 / 1500), live accounts hold today's values (5000 / 1200). Saving the
// past month must record the snapshot but must NOT touch live accounts.
const backfillState = {
  selectedMonth: PREV,
  accounts: liveAccounts,
  goals: [],
  monthSnapshots: {
    [PREV]: {
      accounts: [
        { id: "a1", name: "Savings", kind: "asset", subtype: "savings", balance: 4000 },
        { id: "d1", name: "Card", kind: "debt", subtype: "credit_card", balance: 1500 },
      ],
    },
  },
};
const afterBackfill = createMonthlySnapshotState(backfillState);
assert(afterBackfill.accounts.find(a => a.id === "a1").balance === 5000,
  "past-month save must not overwrite live asset balance (got " + afterBackfill.accounts.find(a => a.id === "a1").balance + ")");
assert(afterBackfill.accounts.find(a => a.id === "d1").balance === 1200,
  "past-month save must not overwrite live debt balance");
assert(afterBackfill.monthSnapshots[PREV].assets === 4000 && afterBackfill.monthSnapshots[PREV].debts === 1500,
  "past-month snapshot must store the backfilled values");
assert(afterBackfill.monthSnapshots[PREV].net === 2500, "past-month snapshot net computed");

// ── Scenario 2: CURRENT month save — live accounts must still sync (existing behavior preserved)
const currentState = { selectedMonth: CURRENT, accounts: liveAccounts, goals: [], monthSnapshots: {} };
const afterCurrent = createMonthlySnapshotState(currentState);
assert(afterCurrent.monthSnapshots[CURRENT].net === 3800, "current-month snapshot net = 5000-1200");
assert(afterCurrent.accounts.find(a => a.id === "a1").balance === 5000, "current-month save keeps live accounts in sync");

// ── Scenario 3: prevNet now real, not hardcoded 0
const withHistory = createMonthlySnapshotState({
  selectedMonth: CURRENT, accounts: liveAccounts, goals: [],
  monthSnapshots: { [PREV]: { net: 2500, accounts: [] } },
});
assert(withHistory.monthSnapshots[CURRENT].net === 3800, "current net with history");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
