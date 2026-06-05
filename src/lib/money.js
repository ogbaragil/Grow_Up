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
// Official signs per currency (third column of CURRENCY_OPTIONS). Intl falls
// back to ISO codes for currencies en-US has no symbol for (e.g. "NGN 55");
// we substitute the currency part so users see ₦55, GH₵55, د.إ55 instead.
export const CURRENCY_SYMBOLS = Object.fromEntries(CURRENCY_OPTIONS.map(([code,, symbol]) => [code, symbol]));

export const money = (n, currency = window.__GROWUP_ACTIVE_CURRENCY || "USD") => {
  const code = isSupportedCurrency(currency) ? currency : "USD";
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 });
  const parts = formatter.formatToParts(Number(n || 0));
  return parts
    .map((part, i) => {
      if (part.type === "currency") return CURRENCY_SYMBOLS[code] || part.value;
      // Drop the spacer Intl inserts between an ISO code and the number
      // ("NGN 55") so the substituted sign hugs the digits ("₦55").
      const neighborIsCurrency = parts[i - 1]?.type === "currency" || parts[i + 1]?.type === "currency";
      if (part.type === "literal" && part.value.trim() === "" && neighborIsCurrency) return "";
      return part.value;
    })
    .join("");
};

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

export function currencySign(currency) {
  return CURRENCY_SYMBOLS[currency] || "$";
}
