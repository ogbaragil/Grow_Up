import React from "react";
import { Menu, Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { addMonths, canMoveToMonth, monthLabel } from "../lib/dates";

export function ScreenTitle({ title, sub, setMenuOpen, back, action }) {
  return (
    <section className="page-header">
      {back && <button className="round-nav-btn" onClick={back}><ArrowLeft size={24}/></button>}
      <div className="title-block">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="screen-title-action">{action}</div>}
      <button className="mini-menu-btn" onClick={() => setMenuOpen?.(true)} aria-label="Open menu"><Menu size={22}/></button>
    </section>
  );
}

export function MonthBar({ state, setState, thin=false, hasUnsaved=false }) {
  const nextMonth = addMonths(state.selectedMonth, 1);
  const nextBlocked = !canMoveToMonth(nextMonth);
  const hasSnapshot = !!state.monthSnapshots?.[state.selectedMonth];

  const move = (delta) => {
    const target = addMonths(state.selectedMonth, delta);
    if (!canMoveToMonth(target)) return;
    setState(s => ({ ...s, selectedMonth:target }));
  };

  // Status: unsaved changes > saved snapshot > no snapshot (past month) > current month
  const statusDot = hasUnsaved
    ? { icon:"●", color:"#fbbf24", title:"Unsaved changes" }
    : hasSnapshot
      ? { icon:"✓", color:"#86efac", title:"Snapshot saved" }
      : null;

  return (
    <div className={thin ? "month-bar thin" : "month-bar"}>
      <button onClick={()=>move(-1)} aria-label="Previous month"><ChevronLeft size={24}/></button>
      <strong>{monthLabel(state.selectedMonth)}</strong>
      {statusDot && (
        <span className="month-status-dot" title={statusDot.title} style={{color: statusDot.color}}>
          {statusDot.icon}
        </span>
      )}
      <button
        className={nextBlocked ? "blocked" : ""}
        disabled={nextBlocked}
        onClick={()=>move(1)}
        aria-label={nextBlocked ? "Future months are blocked" : "Next month"}
      >
        <ChevronRight size={24}/>
      </button>
    </div>
  );
}

export function EmptyState({ title, text, action, onClick, icon }) {
  return (
    <div className="empty-state-v2">
      <div className="empty-state-icon">{icon || "✦"}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="empty-state-btn" onClick={onClick}>
          <Plus size={18}/>{action}
        </button>
      )}
    </div>
  );
}



export function GoalRing({ pct, color, size = 56 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(1, pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="goal-ring-svg">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth={5}/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,.85)" strokeWidth={5}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dasharray .5s ease"}}
      />
    </svg>
  );
}

export function Card({ children, className="", onClick }) {
  return <section className={`card ${className}`} onClick={onClick}>{children}</section>;
}

