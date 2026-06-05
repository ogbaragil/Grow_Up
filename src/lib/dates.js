

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
export const monthLabel = (key) => {
  const [y,m] = key.split("-").map(Number);
  return new Date(y, m-1, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });
};
export const shortMonthLabel = (key) => {
  const [y,m] = key.split("-").map(Number);
  return new Date(y, m-1, 1).toLocaleDateString("en-US", { month:"short", year:"2-digit" }).replace(" ", " '");
};
export const addMonths = (key, delta) => {
  const [y,m] = key.split("-").map(Number);
  const d = new Date(y, m-1+delta, 1);
  return monthKey(d);
};

export const currentMonthKey = () => monthKey(new Date());
export const isFutureMonth = (key) => key.localeCompare(currentMonthKey()) > 0;
export const canMoveToMonth = (key) => !isFutureMonth(key);

export function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.ceil((target - start) / (1000 * 60 * 60 * 24));
}

export function monthDistance(startKey, endKey) {
  const [sy, sm] = startKey.split("-").map(Number);
  const [ey, em] = endKey.split("-").map(Number);
  return ((ey - sy) * 12) + (em - sm);
}


export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function addMonthsClamped(date, months) {
  const original = new Date(date);
  const targetMonth = original.getMonth() + months;
  const target = new Date(original);
  target.setDate(1);
  target.setMonth(targetMonth);
  target.setDate(Math.min(original.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

export function relativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d - start) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
}


export function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!iso || Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}
