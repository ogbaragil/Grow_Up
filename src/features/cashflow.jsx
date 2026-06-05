import React, { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Card, ScreenTitle } from "../components/ui";
import { formatDate, relativeDate } from "../lib/dates";
import { money, signedMoney } from "../lib/money";
import { frequencyLabel, monthlyEquivalent, recurringCashflowTransactions, upcomingTransactions } from "../lib/transactions";

export const ENVELOPE_COLORS = [
  "#3fa463","#5cb85c","#8bc34a","#cddc39",
  "#ffc107","#ff9800","#ff5722","#f44336",
  "#e91e63","#9c27b0","#42a5f5","#607d8b"
];

export function SpendingEnvelopeCard({ recurringExpenses, totalExpenses, totalIncome }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [showSurplus, setShowSurplus] = useState(true);

  const surplus = Math.max(0, totalIncome - totalExpenses);

  // Build envelope rows sorted by amount desc
  const envelopes = recurringExpenses
    .map(t => ({ name: t.name, icon: t.icon || "💳", amount: monthlyEquivalent(t) }))
    .filter(e => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (envelopes.length < 1) return null;

  const total = envelopes.reduce((s, e) => s + e.amount, 0);

  const pieData = [
    ...envelopes.map((e, i) => ({
      name: e.name,
      value: e.amount,
      color: ENVELOPE_COLORS[i % ENVELOPE_COLORS.length],
      icon: e.icon
    })),
    ...(showSurplus && surplus > 0 ? [{ name: "Surplus", value: surplus, color: "var(--green)", icon: "✨" }] : [])
  ];

  const onPieClick = (_, index) => setActiveIndex(activeIndex === index ? null : index);

  return (
    <Card>
      <div className="envelope-header">
        <div>
          <h2>Spending by Envelope</h2>
          <p className="muted" style={{fontSize:13,margin:"2px 0 0"}}>Total monthly expenses: <strong>{money(total)}</strong></p>
        </div>
        <button
          className={`envelope-surplus-toggle ${showSurplus ? "active" : ""}`}
          onClick={() => setShowSurplus(v => !v)}
          title={showSurplus ? "Hide surplus" : "Show surplus"}
        >
          {showSurplus ? "✨ With surplus" : "Expenses only"}
        </button>
      </div>

      <div className="envelope-chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              innerRadius={0}
              outerRadius={90}
              paddingAngle={1.5}
              startAngle={90}
              endAngle={-270}
              onClick={onPieClick}
            >
              {pieData.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                  stroke={activeIndex === i ? "#fff" : "transparent"}
                  strokeWidth={activeIndex === i ? 3 : 0}
                  style={{cursor:"pointer", transition:"opacity .2s"}}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [money(value), name]}
              contentStyle={{borderRadius:12, border:"1px solid var(--line)", background:"var(--card)", color:"var(--text)", fontSize:13}}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="envelope-legend">
        {pieData.map((entry, i) => {
          const pct = Math.round((entry.value / (total + (showSurplus ? surplus : 0))) * 100);
          const isActive = activeIndex === i;
          return (
            <div
              key={entry.name}
              className={`envelope-legend-row ${isActive ? "active" : ""}`}
              onClick={() => setActiveIndex(activeIndex === i ? null : i)}
            >
              <div className="envelope-legend-left">
                <span className="envelope-dot" style={{background: entry.color}}/>
                <span className="envelope-name">{entry.icon} {entry.name}</span>
              </div>
              <span className="envelope-pct">{pct}%</span>
              <span className="envelope-amount">{money(entry.value)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function CashFlow({ state, setState, totals, setEditor, setMenuOpen }) {
  const [lookAhead, setLookAhead] = useState(7);
  const next = upcomingTransactions(state.transactions, lookAhead);
  const recurringIncome = recurringCashflowTransactions(state.transactions, "income");
  const recurringExpenses = recurringCashflowTransactions(state.transactions, "expense");

  // Income vs expenses summary
  const income = Number(totals.income || 0);
  const expenses = Number(totals.expenses || 0);

  if (state.transactions.length === 0) {
    return (
      <div className="screen">
        <ScreenTitle title="Cash Flow" sub="See what's coming in and what's going out." setMenuOpen={setMenuOpen} />
        <Card>
          <h2>Your cash flow, at a glance</h2>
          <p className="muted">Add recurring income and expenses to see your monthly surplus, upcoming bills, and a breakdown of where your money goes.</p>
          <div style={{margin:"18px 0 6px"}}>
            {[
              { icon:"💵", name:"Salary", sub:"monthly · income", amount:"+$5,000", income:true },
              { icon:"🏡", name:"Rent", sub:"monthly · expense", amount:"-$1,800", income:false },
              { icon:"📱", name:"Phone plan", sub:"monthly · expense", amount:"-$45", income:false }
            ].map(ex => (
              <div key={ex.name} className="transaction-row" style={{opacity:0.6}}>
                <div className={`round-icon ${ex.income ? "asset" : "debt"}`}>{ex.icon}</div>
                <div className="row-main">
                  <strong>{ex.name}</strong>
                  <span>{ex.sub}</span>
                </div>
                <strong className={ex.income ? "success" : "danger"}>{ex.amount}</strong>
              </div>
            ))}
          </div>
          <button className="primary full" style={{marginTop:"8px"}} onClick={()=>setEditor({ type:"transaction" })}>Add your first transaction</button>
        </Card>
        <button className="fab" onClick={()=>setEditor({ type:"transaction" })}><Plus size={34}/></button>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenTitle title="Cash Flow" sub="See what's coming in and what's going out." setMenuOpen={setMenuOpen} />

      {(income > 0 || expenses > 0) && (
        <Card>
          <div className="cf-income-header">
            <span className="cf-income-label">Monthly income</span>
            <strong className="cf-income-value">{money(income)}</strong>
          </div>
          <div className="donut-layout">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={[
                    expenses > 0 && { name:"Expenses", value:expenses, color:"#E05C2E" },
                    (income - expenses) > 0 && { name:"Surplus", value:income - expenses, color:"#3B82F6" },
                  ].filter(Boolean)} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {[
                      expenses > 0 && { color:"#E05C2E" },
                      (income - expenses) > 0 && { color:"#3B82F6" },
                    ].filter(Boolean).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <b>{money(income)}</b>
                <span>income</span>
              </div>
            </div>
            <div className="donut-legend">
              <div><i style={{background:"#E05C2E"}}></i><span>Expenses</span><b className="danger">-{money(expenses)}</b></div>
              <div><i style={{background:"#3B82F6"}}></i><span>Surplus</span><b style={{color:"#1D4ED8"}}>{signedMoney(income - expenses)}</b></div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="lookahead-pills">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              className={lookAhead === d ? "lookahead-pill active" : "lookahead-pill"}
              onClick={() => setLookAhead(d)}
            >{d} days</button>
          ))}
        </div>
        <div className="section-title"><h2>Next {lookAhead} Days <ChevronDown size={20}/></h2><b>{next.length} upcoming</b></div>
        {next.length ? next.map(t => <TransactionRow key={t.id + (t.occurrenceDate||"")} t={t} setEditor={setEditor}/>) : <p className="muted">No upcoming transactions in this window.</p>}
      </Card>

      <TransactionGroup title={`Recurring Income (${recurringIncome.length})`} total={totals.income} color="success" txns={recurringIncome} setEditor={setEditor} setState={setState}/>
      <TransactionGroup title={`Recurring Expenses (${recurringExpenses.length})`} total={totals.expenses} color="danger" txns={recurringExpenses} setEditor={setEditor} setState={setState}/>

      {recurringExpenses.length >= 1 && (
        <SpendingEnvelopeCard
          recurringExpenses={recurringExpenses}
          totalExpenses={totals.expenses}
          totalIncome={totals.income}
        />
      )}

      <button className="fab" onClick={()=>setEditor({ type:"transaction" })}><Plus size={34}/></button>
    </div>
  );
}

export function TransactionGroup({ title, total, color, txns, setEditor, setState }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div className="section-title" style={{cursor:"pointer"}} onClick={() => setOpen(v => !v)}>
        <div>
          <h2>{title}</h2>
          <p className={color} style={{margin:"2px 0 0",fontSize:"14px"}}>Total Monthly: {money(total)}</p>
        </div>
        {open ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
      </div>
      {open && (
        <div style={{marginTop:"12px"}}>
          {txns.length ? txns.map(t => <TransactionRow key={t.id} t={t} setEditor={setEditor} setState={setState} controls />) : <p className="muted">None yet.</p>}
        </div>
      )}
    </Card>
  );
}

export function TransactionRow({ t, setEditor, setState, controls=false }) {
  const del = () => {
    if (setState) setState(s => ({ ...s, transactions: s.transactions.filter(x => x.id !== t.id) }));
  };
  return (
    <div className="transaction-row">
      <div className={`round-icon ${t.type === "income" ? "asset" : "debt"}`}>{t.icon || (t.type==="income" ? "💵" : "💳")}</div>
      <div className="row-main">
        <strong>{t.name}</strong>
        <span>{formatDate(t.occurrenceDate || t.date)} · {relativeDate(t.occurrenceDate || t.date)} · {frequencyLabel(t.frequency || (t.recurring ? "monthly" : "oneOff"))}{t.endsOn ? ` · ends ${formatDate(t.endsOn)}` : ""}</span>
      </div>
      <strong className={t.type === "income" ? "success" : "danger"}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</strong>
      {controls && (
        <div className="txn-row-actions">
          <button className="icon-btn" onClick={()=>setEditor({ type:"transaction", item:t })}><Pencil size={18}/></button>
          <button className="icon-btn danger" onClick={del}><Trash2 size={18}/></button>
        </div>
      )}
    </div>
  );
}

export function CompactTxn({ t }) {
  const d = new Date(t.occurrenceDate || t.displayDate || t.date);
  return (
    <div className="compact-txn">
      <strong>{d.toLocaleString("en-US", { weekday:"short", day:"numeric", month:"short" })}</strong>
      <span>{t.icon || "💳"}</span>
      <p>{t.name}</p>
      <b className={t.type === "income" ? "success" : "danger"}>{money(t.amount)} {t.type === "expense" ? "↓" : "↑"}</b>
    </div>
  );
}



