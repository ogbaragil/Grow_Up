import { DonutCard } from "./accounts";
import { money, signedMoney } from "../lib/money";
import { historyRows } from "../lib/history";
import React, { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Card, MonthBar, ScreenTitle } from "../components/ui";
import { monthLabel, shortMonthLabel } from "../lib/dates";


export function exportHistoryCSV(state) {
  const rows = historyRows(state);
  const header = "Month,Assets,Debts,Net Worth,Note";
  const lines = rows.map(r => {
    const note = (state.monthSnapshots?.[r.key]?.note || "").replace(/"/g, '""');
    return `${monthLabel(r.key)},${r.assets},${r.debts},${r.net},"${note}"`;
  });
  const csv = [header, ...lines].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = "growup-history.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function HistoryPage({ state, setState, totals, metric, setHistoryMetric, setMenuOpen }) {
  const rows = historyRows(state);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const current = state.monthSnapshots?.[state.selectedMonth] || { assets:totals.assets, debts:totals.debts, net:totals.net, accounts:state.accounts };
  const titleMap = { net:"Net Worth", assets:"Total Assets", debts:"Total Debts" };
  const currentNote = state.monthSnapshots?.[state.selectedMonth]?.note;

  // Build unique accounts list across all snapshots
  const allAccountsMap = new Map();
  Object.values(state.monthSnapshots || {}).forEach(snap => {
    (snap.accounts || []).forEach(a => {
      if (!allAccountsMap.has(a.id)) allAccountsMap.set(a.id, a);
    });
  });
  const allAccounts = Array.from(allAccountsMap.values());

  // Build chart data for selected account
  const selectedAccount = selectedAccountId ? allAccountsMap.get(selectedAccountId) : null;
  const accountChartData = selectedAccountId
    ? rows.slice().reverse().map(r => {
        const snap = state.monthSnapshots?.[r.key];
        const acc = (snap?.accounts || []).find(a => a.id === selectedAccountId);
        return acc ? { month: shortMonthLabel(r.key), balance: Number(acc.balance || 0) } : null;
      }).filter(Boolean)
    : [];

  return (
    <div className="screen">
      <ScreenTitle
        title="History"
        sub="Month-by-month financial summary."
        setMenuOpen={setMenuOpen}
        back={()=>setHistoryMetric(null)}
        action={rows.length > 0 ? <button className="secondary" style={{fontSize:"13px",padding:"8px 12px"}} onClick={() => exportHistoryCSV(state)}>Export CSV</button> : null}
      />
      <MonthBar state={state} setState={setState} thin />

      <Card className="center-card">
        <p>{titleMap[metric]}</p>
        <h2 className={metric === "debts" ? "danger" : "success"}>{metric === "debts" ? "-" : ""}{money(current[metric] || 0)}</h2>
        <p>{titleMap[metric]} for {monthLabel(state.selectedMonth)}</p>
      </Card>

      {currentNote && (
        <div className="snapshot-note-display">
          <p>{currentNote}</p>
        </div>
      )}

      <DonutCard title="What I Own" kind="asset" accounts={(current.accounts || []).filter(a=>a.kind==="asset")} />
      <DonutCard title="What I Owe" kind="debt" accounts={(current.accounts || []).filter(a=>a.kind==="debt")} />

      <Card>
        <h2>Account History</h2>
        {selectedAccount ? (
          <>
            <button className="account-history-back" onClick={() => setSelectedAccountId(null)}>← All accounts</button>
            <p style={{margin:"8px 0 0",fontWeight:900}}>{selectedAccount.icon || "💼"} {selectedAccount.name}</p>
            {accountChartData.length >= 2 ? (
              <div style={{height:"180px", marginTop:"12px"}}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={accountChartData}>
                    <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="balance" stroke={selectedAccount.kind === "debt" ? "var(--red)" : "var(--green)"} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="muted" style={{marginTop:"12px"}}>Not enough history for this account yet.</p>
            )}
          </>
        ) : (
          allAccounts.length ? allAccounts.map(a => (
            <div key={a.id} className="account-history-row" onClick={() => setSelectedAccountId(a.id)}>
              <span className={`round-icon ${a.kind === "debt" ? "debt" : "asset"}`} style={{width:"36px",height:"36px",fontSize:"18px"}}>{a.icon || (a.kind==="debt"?"💳":"💼")}</span>
              <span style={{flex:1,fontWeight:800,fontSize:"15px"}}>{a.name}</span>
              <span className={`kind-badge ${a.kind}`}>{a.kind}</span>
              <span style={{color:"var(--muted)",fontSize:"18px"}}>›</span>
            </div>
          )) : <p className="muted">No account data in snapshots yet.</p>
        )}
      </Card>

      <Card className="history-table">
        <div className="table-head"><span>Month</span><span>Assets</span><span>Debts</span><span>Net · MoM</span></div>
        {rows.length ? rows.map((r, i) => {
          const prev = rows[i+1];
          const mom = prev ? r.net - prev.net : 0;
          return (
            <div className="history-row" key={r.key} onClick={()=>setState(s=>({...s, selectedMonth:r.key}))}>
              <span>{shortMonthLabel(r.key)}</span>
              <span>{money(r.assets)}</span>
              <span className="danger">-{money(r.debts)}</span>
              <span>
                <b className={r.net >= 0 ? "success":"danger"}>{money(r.net)}</b>
                <em className={mom >= 0 ? "mom good":"mom bad"}>{signedMoney(mom)} MoM</em>
              </span>
            </div>
          );
        }) : <p className="muted">No saved monthly snapshots yet. Save a snapshot from Assets & Debts.</p>}
      </Card>
    </div>
  );
}

