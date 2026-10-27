export const CURRENCIES = ['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','CNY','All'];
export const IMPACTS = ['High','Medium','Low','Holiday'];
export const TIMEZONES = ['Europe/Warsaw','UTC','Europe/London','America/New_York','Asia/Tokyo','Australia/Sydney'];
const KEY = 'calendar-preferences';
const MANUAL_KEY = 'calendar-manual-preferences';
const LEGACY_TIMEZONE_KEY = 'calendar-manual-timezone';

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

function readStorage(key,storage) {
  try { return (storage ?? localStorage).getItem(key); } catch { return null; }
}
function writeStorage(key,value,storage) {
  try { (storage ?? localStorage).setItem(key,value); return true; } catch { return false; }
}
function readJSON(key,storage) {
  try { return JSON.parse(readStorage(key,storage)); } catch { return null; }
}
function manualPreferences(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  const defaults = defaultPreferences(), clean = parsePreferences('',values), manual = {};
  const choices = {view:['week','day'],timezone:TIMEZONES,theme:['auto','light','dark'],currencies:CURRENCIES,impacts:IMPACTS};
  for (const key of Object.keys(defaults)) {
    if (!Object.hasOwn(values,key)) continue;
    const value = values[key];
    if (Array.isArray(defaults[key])) {
      if (!Array.isArray(value) || !value.every(item=>choices[key].includes(item))) continue;
    } else if (typeof value !== typeof defaults[key] || (choices[key] && !choices[key].includes(value))) continue;
    manual[key] = clean[key];
  }
  return manual;
}
function loadManualPreferences(storage) {
  const manual = manualPreferences(readJSON(MANUAL_KEY,storage));
  const legacyTimezone = readStorage(LEGACY_TIMEZONE_KEY,storage);
  if (!Object.hasOwn(manual,'timezone') && TIMEZONES.includes(legacyTimezone)) manual.timezone = legacyTimezone;
  return manual;
}
export function loadPreferences(query = location.search,storage) {
  const state = parsePreferences(query,readJSON(KEY,storage));
  return {...state,...loadManualPreferences(storage)};
}
export function savePreferences(state,storage) {
  const clean = parsePreferences('',state);
  return writeStorage(KEY,JSON.stringify(clean),storage);
}
export function saveManualPreferences(changes,storage) {
  const manual = manualPreferences(changes);
  if (!Object.keys(manual).length) return false;
  // Save only fields the user changed, so untouched settings still use the embed defaults.
  return writeStorage(MANUAL_KEY,JSON.stringify({...loadManualPreferences(storage),...manual}),storage);
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
