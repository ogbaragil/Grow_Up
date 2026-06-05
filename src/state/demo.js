import { currentMonthKey, monthKey } from "../lib/dates";

export const DEMO_STATE = {
  firstName: "Demo",
  theme: "light",
  selectedMonth: currentMonthKey(),
  accounts: [
    { id:"demo-super", name:"Retirement Fund", icon:"🏦", kind:"asset", subtype:"super", balance:75000, previous:72726 },
    { id:"demo-fire", name:"Investment Portfolio", icon:"🔥", kind:"asset", subtype:"investment", balance:34400, previous:28000 },
    { id:"demo-car", name:"Vehicle Savings", icon:"🚙", kind:"asset", subtype:"savings", balance:28000, previous:28000 },
    { id:"demo-business", name:"Emergency Fund", icon:"👔", kind:"asset", subtype:"emergency", balance:1500, previous:0 },
    { id:"demo-loan", name:"Personal Loan", icon:"💳", kind:"debt", subtype:"loan", balance:41274, previous:41474 },
    { id:"demo-tax", name:"Credit Card Balance", icon:"🏦", kind:"debt", subtype:"credit_card", balance:6049, previous:6049 }
  ],
  transactions: [
    { id:"demo-salary", type:"income", name:"Salary", icon:"💵", amount:6392, category:"Income", date:new Date(new Date().getFullYear(), new Date().getMonth(), 27).toISOString(), frequency:"monthly", recurring:true },
    { id:"demo-rent", type:"expense", name:"Rent", icon:"🏡", amount:2303, category:"Home", date:new Date(new Date().getFullYear(), new Date().getMonth(), 19).toISOString(), frequency:"monthly", recurring:true },
    { id:"demo-insurance", type:"expense", name:"Car Insurance", icon:"🚗", amount:178, category:"Insurance", date:new Date(new Date().getFullYear(), new Date().getMonth(), 14).toISOString(), frequency:"monthly", recurring:true },
    { id:"demo-gym", type:"expense", name:"Gym", icon:"🏋️", amount:23, category:"Health", date:new Date(new Date().getFullYear(), new Date().getMonth(), 22).toISOString(), frequency:"weekly", recurring:true }
  ],
  goals: [
    {
      id:"demo-goal-first100",
      name:"First $100K",
      icon:"💎",
      goalType:"netWorth",
      account:"Net Worth",
      color:"purple",
      target:100000,
      current:84200,
      deadline:"2027-02-01",
      open:false
    },

    {
      id:"demo-goal-portfolio",
      name:"250K Portfolio",
      icon:"📈",
      goalType:"accountGrowth",
      accountId:"demo-investments",
      account:"Investment Portfolio",
      color:"green",
      target:250000,
      current:146000,
      deadline:"2029-08-01",
      open:false
    },

    {
      id:"demo-goal-freedom",
      name:"Work Optional",
      icon:"🔥",
      goalType:"fire",
      account:"Financial Independence",
      color:"gold",
      target:750000,
      current:182000,
      deadline:"2036-01-01",
      open:false
    },

    {
      id:"demo-goal-debtfree",
      name:"Debt Free Life",
      icon:"⚡",
      goalType:"debtPayoff",
      accountId:"demo-loan",
      account:"Personal Loan",
      color:"red",
      start:48000,
      target:0,
      current:19200,
      deadline:"2028-03-01",
      open:false
    },

    {
      id:"demo-goal-property",
      name:"First Investment Property",
      icon:"🏡",
      goalType:"savings",
      account:"Property Deposit",
      color:"blue",
      target:120000,
      current:42000,
      deadline:"2029-11-01",
      open:false
    }
  ],
  monthSnapshots: {}
};

export function buildDemoState() {
  const now = new Date();
  const selectedMonth = monthKey(now);
  const snapshots = {};
  const baseAssets = [124426, 127626, 130176, 128726, 138900, 140200];
  const baseDebts = [48123, 47923, 47723, 47523, 47323, 46800];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const idx = 5 - i;
    const assetsTotal = baseAssets[idx] || 138900;
    const debtsTotal = baseDebts[idx] || 47323;

    const accounts = [
      { id:"demo-super", name:"Retirement Fund", icon:"🏦", kind:"asset", subtype:"super", balance:Math.round(assetsTotal * .54), previous:0 },
      { id:"demo-fire", name:"Investment Portfolio", icon:"🔥", kind:"asset", subtype:"investment", balance:Math.round(assetsTotal * .25), previous:0 },
      { id:"demo-car", name:"Vehicle Savings", icon:"🚙", kind:"asset", subtype:"savings", balance:28000, previous:0 },
      { id:"demo-business", name:"Emergency Fund", icon:"👔", kind:"asset", subtype:"emergency", balance:Math.max(0, assetsTotal - Math.round(assetsTotal * .54) - Math.round(assetsTotal * .25) - 28000), previous:0 },
      { id:"demo-loan", name:"Personal Loan", icon:"💳", kind:"debt", subtype:"loan", balance:Math.round(debtsTotal * .87), previous:0 },
      { id:"demo-tax", name:"Credit Card Balance", icon:"🏦", kind:"debt", subtype:"credit_card", balance:debtsTotal - Math.round(debtsTotal * .87), previous:0 }
    ];

    snapshots[key] = {
      assets: accounts.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance||0),0),
      debts: accounts.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance||0),0),
      net: accounts.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance||0),0) - accounts.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance||0),0),
      accounts,
      createdAt: d.toISOString(),
      updatedAt: d.toISOString()
    };
  }

  const latest = snapshots[selectedMonth] || Object.values(snapshots).at(-1);
  return {
    ...DEMO_STATE,
    selectedMonth,
    profileComplete: true,
    profile: { age: 34, retirementAge: 65, income: 6392, expenses: [], primaryGoal: "invest", roughDebt: 47323 },
    accounts: latest?.accounts || DEMO_STATE.accounts,
    monthSnapshots: snapshots
  };
}

export function readOnlyDemoAlert() {
  window.dispatchEvent(new CustomEvent("growup-toast", {
    detail: { message:"Demo Mode is read-only. Exit Demo Mode to edit, save, or restore your real data.", type:"info" }
  }));
}

