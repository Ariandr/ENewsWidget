import {dayKey,addDays,periodDays,filterEvents} from './calendar.js';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let saved = {};
try { saved = JSON.parse(localStorage.getItem('calendar-preferences') || '{}'); } catch {}
const state = {view:'week',timezone:'Europe/Warsaw',theme:'auto',currency:'all',impact:'all',search:'',upcoming:false};
for (const key of Object.keys(state)) {
  if (typeof state[key] === 'boolean') state[key] = params.has(key) ? params.get(key) === 'true' : saved?.[key] === true;
  else state[key] = params.get(key) ?? saved?.[key] ?? state[key];
}
for (const id of ['timezone','theme','impact']) {
  if (![...$(id).options].some(o => o.value === state[id])) state[id] = id === 'timezone' ? 'Europe/Warsaw' : id === 'theme' ? 'auto' : 'all';
}
if (!['day','week'].includes(state.view)) state.view = 'week';
if (typeof state.search !== 'string') state.search = '';
state.anchor = dayKey(new Date(),state.timezone);
let data;
function persist() {
  const {anchor,...preferences} = state;
  try { localStorage.setItem('calendar-preferences',JSON.stringify(preferences)); } catch {}
}
function applyControls() {
  for (const key of ['timezone','theme','currency','impact','search']) $(key).value = state[key];
  $('upcoming').checked = state.upcoming;
  if (state.theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.theme;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.view === state.view)));
}
const dateLabel = (key, options) => new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',...options}).format(new Date(`${key}T12:00:00Z`));
function cell(tag,text,className) {
  const el = document.createElement(tag); el.textContent = text; if(className) el.className = className; return el;
}
function render() {
  applyControls(); persist();
  const days = periodDays(state.anchor,state.view);
  $('period').textContent = state.view === 'day' ? dateLabel(days[0],{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : `${dateLabel(days[0],{day:'numeric',month:'short'})} – ${dateLabel(days[6],{day:'numeric',month:'short',year:'numeric'})}`;
  if (!data) return;
  const now = Date.now(), today = dayKey(now,state.timezone);
  const visible = filterEvents(data.events,state,now);
  $('count').textContent = `${visible.length} event${visible.length === 1 ? '' : 's'} · ${state.timezone.replaceAll('_',' ')}`;
  const fragment = document.createDocumentFragment();
  let nextMarked = false;
  for (const day of days) {
    const entries = visible.filter(e => dayKey(e.date,state.timezone) === day);
    if (!entries.length) continue;
    const row = document.createElement('tr'); row.className = `day-row${day === today ? ' today' : ''}`;
    const heading = cell('th',dateLabel(day,{weekday:'long',day:'numeric',month:'long'})); heading.colSpan = 6; heading.scope = 'rowgroup';
    if (day === today) heading.append(cell('span','Today'));
    row.append(heading); fragment.append(row);
    for (const event of entries) {
      const tr = document.createElement('tr'); tr.className = 'event-row';
      if (!nextMarked && new Date(event.date).getTime() >= now) {tr.classList.add('next-event');nextMarked = true;}
      tr.append(cell('td',new Intl.DateTimeFormat('en-GB',{timeZone:state.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(event.date)),'time'));
      const currency = cell('td',''); currency.append(cell('span',event.country,'currency')); tr.append(currency);
      const impact = cell('td',''), label = cell('span','','impact-label');
      label.append(cell('i','',`dot ${['High','Medium','Low'].includes(event.impact) ? event.impact : ''}`),document.createTextNode(event.impact)); impact.append(label); tr.append(impact);
      tr.append(cell('td',event.title,'event-title'),cell('td',event.forecast || '—','numeric'),cell('td',event.previous || '—','numeric')); fragment.append(tr);
    }
  }
  $('events').replaceChildren(fragment);
  $('empty').hidden = visible.length !== 0;
  const available = data.events.map(e => dayKey(e.date,state.timezone)).sort();
  const outside = !available.length || days.at(-1) < available[0] || days[0] > available.at(-1);
  $('empty').textContent = outside ? 'No data available for this period. The free feed contains the current week only. Use Today to return.' : 'No matching events. Try another day or reset your filters.';
  const ageHours = (now-new Date(data.fetchedAt).getTime())/36e5;
  const updated = new Intl.DateTimeFormat('en-GB',{timeZone:state.timezone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(data.fetchedAt));
  $('updated').textContent = `${ageHours > 12 ? 'Possibly stale · ' : ''}Fetched ${updated} · Refresh target: 6h`;
}
for (const key of ['timezone','theme','currency','impact','search','upcoming']) {
  $(key).addEventListener(key === 'search' ? 'input' : 'change',() => {
    state[key] = key === 'upcoming' ? $(key).checked : $(key).value;
    if (key === 'timezone') state.anchor = dayKey(new Date(),state.timezone);
    render();
  });
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click',() => {state.view = button.dataset.view;render();}));
$('prev').onclick = () => {state.anchor = addDays(state.anchor,state.view === 'week' ? -7 : -1);render();};
$('next').onclick = () => {state.anchor = addDays(state.anchor,state.view === 'week' ? 7 : 1);render();};
$('today').onclick = () => {state.anchor = dayKey(new Date(),state.timezone);render();};
$('reset').onclick = () => {Object.assign(state,{currency:'all',impact:'all',search:'',upcoming:false});render();};
$('copy').onclick = async () => {
  const url = new URL(location.href);url.search = '';url.hash = '';
  for(const key of ['view','timezone','theme','currency','impact','search','upcoming']) url.searchParams.set(key,String(state[key]));
  try {await navigator.clipboard.writeText(url.href);$('copy-status').textContent = 'Copied · paste into Notion’s /embed block';}
  catch {$('copy-status').textContent = 'Copy this address:';const input = document.createElement('input');input.value = url.href;input.readOnly = true;$('copy-status').append(input);input.select();}
};
async function load() {
  try {
    const response = await fetch('./data/calendar.json',{cache:'no-cache'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.events) || !Number.isFinite(Date.parse(payload.fetchedAt)) || payload.events.some(e => !Number.isFinite(Date.parse(e.date)) || ['title','country','impact','forecast','previous'].some(k => typeof e[k] !== 'string'))) throw new Error('Invalid calendar data');
    data = payload;
    const currencies = [...new Set(data.events.map(e=>e.country))].filter(c=>c !== 'All').sort();
    $('currency').replaceChildren(new Option('All currencies','all'),...currencies.map(c=>new Option(c,c)));
    if (!currencies.includes(state.currency)) state.currency = 'all';
    render();
  } catch (error) {
    if (data) {$('updated').textContent = 'Refresh failed · showing previously loaded data';return;}
    $('count').textContent = 'Calendar unavailable';$('updated').textContent = 'Could not load calendar data';$('empty').hidden = false;
    $('empty').textContent = 'Calendar data could not be loaded. Reload to retry, or open Forex Factory below.';
    console.error(error);
  }
}
render();load();setInterval(load,300000);setInterval(()=>{if(data) render();},60000);
