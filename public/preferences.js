export const CURRENCIES = ['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','CNY','All'];
export const IMPACTS = ['High','Medium','Low','Holiday'];
export const TIMEZONES = ['Europe/Warsaw','UTC','Europe/London','America/New_York','Asia/Tokyo','Australia/Sydney'];
const KEY = 'calendar-preferences';

export function defaultPreferences() {
  return {view:'week',timezone:'Europe/Warsaw',theme:'auto',currencies:[...CURRENCIES],impacts:[...IMPACTS],search:'',upcoming:false,
    showHeader:false,showNavigation:true,showFilters:true,showSummary:false,showFooter:false,compact:true};
}

export function parsePreferences(query = '', saved = {}) {
  const params = new URLSearchParams(query), state = defaultPreferences();
  if (!saved || typeof saved !== 'object') saved = {};
  for (const key of Object.keys(state)) {
    if (Array.isArray(state[key])) continue;
    const value = params.has(key) ? params.get(key) : saved[key];
    if (typeof state[key] === 'boolean') {
      if (value !== undefined) state[key] = value === true || value === 'true';
    } else if (typeof value === 'string') state[key] = value;
  }
  for (const [key,legacy,choices] of [['currencies','currency',CURRENCIES],['impacts','impact',IMPACTS]]) {
    let value;
    if (params.has(key)) value = params.get(key).split(',').filter(Boolean);
    else if (params.has(legacy)) value = params.get(legacy);
    else value = saved[key] ?? saved[legacy];
    if (value === 'all' || value === undefined) value = choices;
    if (value === 'Medium+' && key === 'impacts') value = ['Medium','High'];
    if (typeof value === 'string') value = [value];
    if (Array.isArray(value)) state[key] = [...new Set(value.filter(v => choices.includes(v)))];
  }
  if (!['week','day'].includes(state.view)) state.view = 'week';
  if (!TIMEZONES.includes(state.timezone)) state.timezone = 'Europe/Warsaw';
  if (!['auto','light','dark'].includes(state.theme)) state.theme = 'auto';
  return state;
}

export function loadPreferences() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
  return parsePreferences(location.search,saved);
}
export function savePreferences(state) {
  const clean = parsePreferences('',state);
  try { localStorage.setItem(KEY,JSON.stringify(clean)); } catch {}
}
export function preferencesURL(path,state,base = location.href) {
  const url = new URL(path,base);
  url.search = ''; url.hash = '';
  for (const [key,value] of Object.entries(parsePreferences('',state))) url.searchParams.set(key,Array.isArray(value) ? value.join(',') : String(value));
  return url.href;
}
export function applyTheme(theme) {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
