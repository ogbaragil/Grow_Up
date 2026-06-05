import React, { useCallback } from "react";

export const CURRENCY_OPTIONS = [
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
  ["AED", "UAE Dirham", "د.إ"]
];

export const isSupportedCurrency = (currency) => CURRENCY_OPTIONS.some(([code]) => code === currency);
export const money = (n, currency = window.__GROWUP_ACTIVE_CURRENCY || "USD") => new Intl.NumberFormat("en-US", {
  style: "currency", currency: isSupportedCurrency(currency) ? currency : "USD", maximumFractionDigits: 0
}).format(Number(n || 0));

export function useMoney(currency) {
  return useCallback((n) => money(n, currency), [currency]);
}

export function compactMoney(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 10000) return `$${Math.round(n).toLocaleString("en-US")}`;
  if (Math.abs(n) >= 1000) return `$${(n/1000).toFixed(1)}k`;
  return money(n);
}


export function signedMoney(n) {
  const v = Number(n || 0);
  return `${v >= 0 ? "+" : "-"}${money(Math.abs(v))}`;
}

