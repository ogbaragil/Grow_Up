export function historyRows(state) {
  return Object.entries(state.monthSnapshots || {})
    .map(([key, snap]) => ({ key, assets:Number(snap.assets||0), debts:Number(snap.debts||0), net:Number(snap.net||0), accounts:snap.accounts||[] }))
    .sort((a,b)=>b.key.localeCompare(a.key));
}
