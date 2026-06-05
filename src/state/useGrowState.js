import React, { useEffect, useState } from "react";
import { monthKey } from "../lib/dates";
import { EMPTY_STATE, normalizeGrowState } from "./normalize";

export const STORAGE_KEY = "growup_history_monthbar_v1";


export function useGrowState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeGrowState(JSON.parse(raw)) : EMPTY_STATE;
    } catch {
      return EMPTY_STATE;
    }
  });
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);
  return [state, setState];
}




