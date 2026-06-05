import React, { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, EmptyState, MonthBar, ScreenTitle } from "../components/ui";
import { addMonths, currentMonthKey, isFutureMonth, monthLabel } from "../lib/dates";
import { money } from "../lib/money";
import { readOnlyDemoAlert } from "../state/demo";

export function AssetsDebts({ state, setState, totals, setEditor, setMenuOpen, setHistoryMetric, saveSnapshot, autoSaveMonthSnapshot, isDemo=false, showConfirm }) {
  const [editingBalances, setEditingBalances] = useState(false);
  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const [hasUnsavedBalances, setHasUnsavedBalances] = useState(false);
  const [noteStatus, setNoteStatus] = useState(null); // null | "saving" | "saved"
  const [showNoDataPopup, setShowNoDataPopup] = useState(false);
  const noteDebounceRef = useRef(null);
  const noteSavedTimerRef = useRef(null);
  const selectedSnapshot = state.monthSnapshots?.[state.selectedMonth];
  const prevSnapshot = state.monthSnapshots?.[addMonths(state.selectedMonth, -1)];

  const isPastMonth = !isFutureMonth(state.selectedMonth) && state.selectedMonth !== currentMonthKey();

  useEffect(() => {
    const snap = state.monthSnapshots?.[state.selectedMonth];
    const past = !isFutureMonth(state.selectedMonth) && state.selectedMonth !== currentMonthKey();
    if (past && !snap && !isDemo) {
      setShowNoDataPopup(true);
      setEditingBalances(false);
    } else {
      setShowNoDataPopup(false);
    }
  }, [state.selectedMonth]);

  const displayedAccounts = selectedSnapshot?.accounts || state.accounts;
  const accountsWithPrev = displayedAccounts.map(account => {
    const prevAccount = prevSnapshot?.accounts?.find(a => a.id === account.id);
    const previous = prevAccount ? Number(prevAccount.balance || 0) : 0;
    return { ...account, previous };
  });

  const assets = accountsWithPrev.filter(a => a.kind === "asset");
  const debts = accountsWithPrev.filter(a => a.kind === "debt");

  const updateBalance = (id, value) => {
    const numericValue = Number(value || 0);
    setHasUnsavedBalances(true);

    setState(s => {
      const existingSnapshot = s.monthSnapshots?.[s.selectedMonth];

      if (existingSnapshot) {
        const updatedAccounts = (existingSnapshot.accounts || s.accounts).map(a =>
          a.id === id ? { ...a, balance:numericValue } : a
        );

        const assets = updatedAccounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
        const debts = updatedAccounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);

        return {
          ...s,
          monthSnapshots: {
            ...s.monthSnapshots,
            [s.selectedMonth]: {
              ...existingSnapshot,
              accounts: updatedAccounts,
              assets,
              debts,
              net: assets - debts,
              updatedAt: new Date().toISOString()
            }
          }
        };
      }

      const priorSnapshot = s.monthSnapshots?.[addMonths(s.selectedMonth, -1)];

      return {
        ...s,
        accounts: s.accounts.map(a => {
          if (a.id !== id) return a;
          const priorAccount = priorSnapshot?.accounts?.find(pa => pa.id === a.id);
          return {
            ...a,
            previous: priorAccount ? Number(priorAccount.balance || 0) : 0,
            balance:numericValue
          };
        })
      };
    });
  };

  const updateNote = (value) => {
    setNoteStatus("saving");
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
    if (noteSavedTimerRef.current) clearTimeout(noteSavedTimerRef.current);
    noteDebounceRef.current = setTimeout(() => {
      setState(s => {
        const snap = s.monthSnapshots?.[s.selectedMonth];
        if (!snap) return s;
        return {
          ...s,
          monthSnapshots: {
            ...s.monthSnapshots,
            [s.selectedMonth]: { ...snap, note: value }
          }
        };
      });
      setNoteStatus("saved");
      noteSavedTimerRef.current = setTimeout(() => setNoteStatus(null), 2000);
    }, 600);
  };

  const openAddAccount = (kind) => {
    if (isDemo) return readOnlyDemoAlert();
    setAssetMenuOpen(false);
    setEditor({ type:"account", defaultKind:kind });
  };

  const toggleBalanceEdit = () => {
    if (isDemo) return readOnlyDemoAlert();
    setAssetMenuOpen(false);
    if (state.accounts.length === 0) {
      setEditor({ type:"account", defaultKind:"asset" });
      return;
    }
    setEditingBalances(value => !value);
  };

  const openLogHistory = () => {
    if (isDemo) return readOnlyDemoAlert();
    setAssetMenuOpen(false);
    setState(s => ({ ...s, selectedMonth: addMonths(s.selectedMonth, -1) }));
    setEditingBalances(true);
  };

  const saveAndClose = async () => {
    if (isDemo) return readOnlyDemoAlert();
    // Flush any pending note debounce before saving so the note isn't lost
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
      noteDebounceRef.current = null;
    }
    setAssetMenuOpen(false);
    setEditingBalances(false);
    setHasUnsavedBalances(false);
    await (autoSaveMonthSnapshot ? autoSaveMonthSnapshot(state) : saveSnapshot());
  };

  return (
    <div className="screen">
      <ScreenTitle title="Assets & Debts" sub="Update balances month-to-month. Changes feed your Overview." setMenuOpen={setMenuOpen} />
      <MonthBar state={state} setState={setState} thin hasUnsaved={hasUnsavedBalances} />

      {showNoDataPopup && (
        <div className="no-data-popup-backdrop" onClick={() => setShowNoDataPopup(false)}>
          <div className="no-data-popup" onClick={e => e.stopPropagation()}>
            <div className="no-data-popup-icon">📅</div>
            <h3>No saved data for<br />{monthLabel(state.selectedMonth)}</h3>
            <p>Do you want to log what your balances were this month?</p>
            <div className="no-data-popup-actions">
              <button
                className="primary"
                onClick={() => {
                  setShowNoDataPopup(false);
                  setEditingBalances(true);
                }}
              >Log entry</button>
              <button
                className="ghost"
                onClick={() => setShowNoDataPopup(false)}
              >Skip</button>
            </div>
          </div>
        </div>
      )}

      {isPastMonth && !selectedSnapshot && !editingBalances && (
        <div className="snapshot-banner info">
          No saved data for {monthLabel(state.selectedMonth)} — balances shown are your current values, not historical. Tap + to log this month's actual balances.
        </div>
      )}

      {isPastMonth && editingBalances && (
        <div className="snapshot-banner info">
          You're editing a past month — enter the balances as they were then and tap ✓ to save.
        </div>
      )}

      <div className={`snapshot-banner ${hasUnsavedBalances ? "unsaved" : "saved"}`}>
        {hasUnsavedBalances
          ? "Unsaved balance changes · tap the green check to save and back up"
          : selectedSnapshot
            ? `Snapshot saved for ${monthLabel(state.selectedMonth)} · ${editingBalances ? "editing enabled" : "locked"}`
            : isPastMonth
              ? `No snapshot saved for ${monthLabel(state.selectedMonth)}`
              : "Current month · changes save when you tap the green check"}
      </div>

      {selectedSnapshot && (
        <div className="month-note-card">
          <div className="month-note-label">
            <span>📝 Month note</span>
            {noteStatus && <span className={`note-save-status ${noteStatus}`}>{noteStatus === "saving" ? "Saving…" : "✓ Saved"}</span>}
          </div>
          <textarea
            key={state.selectedMonth}
            className="snapshot-note-textarea"
            placeholder="Add a note — a bonus, big purchase, or market event…"
            defaultValue={selectedSnapshot.note || ""}
            onChange={e => updateNote(e.target.value)}
          />
        </div>
      )}

      {state.accounts.length === 0 ? (
        <EmptyState icon="💼" title="No accounts yet" text="Add assets and debts to calculate net worth." action="Add account" onClick={()=>openAddAccount("asset")}/>
      ) : (
        <>
          <AccountGroup
            title={`Assets (${assets.length})`}
            sub="Enter this month's values; see last month + change."
            accounts={assets}
            updateBalance={updateBalance}
            readOnly={!!selectedSnapshot && !editingBalances}
            editingBalances={editingBalances}
            setEditor={setEditor}
            setState={setState}
            showConfirm={showConfirm}
          />
          <AccountGroup
            title={`Debts (${debts.length})`}
            sub="Enter this month's amounts owed; see last month + change."
            accounts={debts}
            updateBalance={updateBalance}
            readOnly={!!selectedSnapshot && !editingBalances}
            editingBalances={editingBalances}
            setEditor={setEditor}
            setState={setState}
            showConfirm={showConfirm}
          />
          <Card className="summary-list">
            <div onClick={()=>setHistoryMetric("assets")}><span>Assets (this month)</span><strong>{money(totals.assets)}</strong></div>
            <div onClick={()=>setHistoryMetric("debts")}><span>Debts (this month)</span><strong>{money(totals.debts)}</strong></div>
            <div className="bold" onClick={()=>setHistoryMetric("net")}><span>Net Worth</span><strong>{money(totals.net)}</strong></div>
          </Card>
        </>
      )}

      {assetMenuOpen && (
        <div className="asset-fab-menu">
          <button onClick={()=>openAddAccount("asset")}><span className="menu-icon green">+</span><b>Add Asset</b></button>
          <button onClick={()=>openAddAccount("debt")}><span className="menu-icon red">+</span><b>Add Debt</b></button>
          <button onClick={toggleBalanceEdit}><span className="menu-icon gray">✎</span><b>{editingBalances ? "Done Editing" : "Edit Balances"}</b></button>
          <button onClick={openLogHistory}><span className="menu-icon gray">📅</span><b>Log past month</b></button>
        </div>
      )}

      <button
        className={editingBalances || assetMenuOpen ? "fab edit-active" : "fab"}
        onClick={() => {
          if (editingBalances) {
            saveAndClose();
            return;
          }
          if (isDemo) return readOnlyDemoAlert();
          setAssetMenuOpen(value => !value);
        }}
        aria-label={editingBalances ? "Finish editing balances" : assetMenuOpen ? "Close asset actions" : "Open asset actions"}
      >
        {editingBalances ? (
          <Check size={30}/>
        ) : assetMenuOpen ? (
          <X size={34}/>
        ) : (
          <Plus size={34}/>
        )}
      </button>
    </div>
  );
}

export function AccountGroup({ title, sub, accounts, updateBalance, readOnly, editingBalances=false, setEditor, setState, showConfirm }) {
  const editAccount = (account) => {
    setEditor?.({ type:"account", item:account, defaultKind:account.kind });
  };

  const deleteAccount = async (account) => {
    if (!(await showConfirm?.(`Delete ${account.name}? This removes it from your account list and future live balances.`))) return;

    setState?.(s => {
      const nextAccounts = s.accounts.filter(a => a.id !== account.id);

      // Also remove from existing month snapshots so old reports stay consistent
      // with the user's explicit delete choice.
      const nextSnapshots = Object.fromEntries(
        Object.entries(s.monthSnapshots || {}).map(([key, snap]) => {
          const accounts = (snap.accounts || []).filter(a => a.id !== account.id);
          const assets = accounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
          const debts = accounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);
          return [key, { ...snap, accounts, assets, debts, net:assets - debts, updatedAt:new Date().toISOString() }];
        })
      );

      return {
        ...s,
        accounts: nextAccounts,
        monthSnapshots: nextSnapshots
      };
    });
  };

  return (
    <Card className="account-group">
      <h2>{title}</h2>
      <p>{sub}</p>
      {accounts.map(a => {
        const delta = Number(a.balance || 0) - Number(a.previous || 0);
        const deltaAbs = Math.abs(delta);
        const isUp = delta > 0;
        const isDown = delta < 0;
        return (
          <div className="account-row-v2" key={a.id}>
            <div className={`round-icon ${a.kind === "debt" ? "debt" : "asset"}`}>{a.icon || (a.kind==="debt" ? "💳" : "💼")}</div>
            <div className="account-row-v2-main">
              <strong className="account-row-v2-name">{a.name}</strong>
              <span className={`account-row-v2-delta ${isUp ? "up" : isDown ? "down" : "flat"}`}>
                {delta === 0 ? "No change" : isUp ? `↑ ${money(deltaAbs)}` : `↓ ${money(deltaAbs)}`}
                <span className="account-row-v2-delta-label"> from last month</span>
              </span>
            </div>
            <div className="account-actions-wrap">
              {readOnly ? (
                <div className="balance-display-v2"><strong>{money(a.balance)}</strong></div>
              ) : (
                <input className={editingBalances ? "balance-input editing" : "balance-input"} value={a.balance} type="number" onChange={(e)=>updateBalance(a.id, e.target.value)} />
              )}
              {editingBalances && (
                <div className="account-row-actions">
                  <button onClick={()=>editAccount(a)} aria-label={`Edit ${a.name}`}><Pencil size={16}/></button>
                  <button className="delete" onClick={()=>deleteAccount(a)} aria-label={`Delete ${a.name}`}><Trash2 size={16}/></button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

export function DonutCard({ title, kind, accounts }) {
  const total = accounts.reduce((s,a)=>s+Number(a.balance||0),0);
  const colors = kind === "asset" ? ["#3fa463","#63b77c","#91cda3","#c0e2ca"] : ["#e5292f","#ea5358","#f07d82","#f6a6a9"];
  const data = accounts.map((a, i)=>({ name:a.name, value:Number(a.balance||0), color:colors[i%colors.length] })).filter(d=>d.value>0);

  return (
    <Card className="donut-card">
      <h2>{title}</h2>
      {data.length ? (
        <div className="donut-layout">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={0}>
                  {data.map((d,i)=><Cell key={d.name} fill={d.color}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><b className={kind==="debt"?"danger":""}>{kind==="debt" ? "-" : ""}{money(total)}</b><span>total</span></div>
          </div>
          <div className="donut-legend">
            {data.map(d=>(
              <div key={d.name}><i style={{background:d.color}}></i><span>{d.name}</span><b className={kind==="debt"?"danger":""}>{kind==="debt" ? "-" : ""}{money(d.value)}</b></div>
            ))}
          </div>
        </div>
      ) : <p className="muted">No {kind === "asset" ? "assets" : "debts"} in this snapshot.</p>}
    </Card>
  );
}

