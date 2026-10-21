export function dayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(date));
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function addDays(key, days) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0,10);
}
export function periodDays(anchor, view) {
  const start = view === 'day' ? anchor : addDays(anchor, -new Date(`${anchor}T12:00:00Z`).getUTCDay());
  return Array.from({length: view === 'day' ? 1 : 7}, (_,i) => addDays(start,i));
}
export function filterEvents(events, state, now = Date.now()) {
  const days = new Set(periodDays(state.anchor,state.view));
  return events.filter(e => days.has(dayKey(e.date,state.timezone)) &&
    (state.currency === 'all' || e.country === state.currency || e.country === 'All') &&
    (state.impact === 'all' || (state.impact === 'Medium+' ? ['Medium','High'].includes(e.impact) : e.impact === state.impact)) &&
    e.title.toLowerCase().includes(state.search.toLowerCase()) &&
    (!state.upcoming || new Date(e.date).getTime() >= now)
  ).sort((a,b) => new Date(a.date)-new Date(b.date));
}
