import {dayKey,addDays,periodDays,filterEvents} from './calendar.js';
import {fetchCalendar,feedWarning,REFRESH_INTERVAL} from './feed.js';
import {loadPreferences,savePreferences,saveManualPreferences,preferencesURL,applyTheme,CURRENCIES,IMPACTS} from './preferences.js';
import {mountMultiSelect} from './multiselect.js';
const $ = id => document.getElementById(id);
const state = loadPreferences();
state.anchor = dayKey(new Date(),state.timezone);
let data;
let loading = false;
let refreshFailed = false;
let lastAttempt = 0;
const updateCurrencies = mountMultiSelect($('currencies'),{label:'Currencies',options:CURRENCIES,selected:state.currencies,onChange:values=>changePreferences({currencies:values})});
const updateImpacts = mountMultiSelect($('impacts'),{label:'Impact',options:IMPACTS,selected:state.impacts,onChange:values=>changePreferences({impacts:values})});
function changePreferences(changes) {
  Object.assign(state,changes);
  saveManualPreferences(changes);
  render();
}
function applyControls() {
  $('search').value = state.search;
  $('upcoming').checked = state.upcoming;
  updateCurrencies(state.currencies); updateImpacts(state.impacts);
  applyTheme(state.theme);
  for (const [id,key] of [['header','showHeader'],['navigation','showNavigation'],['filters','showFilters'],['summary','showSummary'],['footer','showFooter']]) $(id).hidden = !state[key];
  document.querySelector('.calendar').classList.toggle('compact',state.compact);
  $('settings-link').href = preferencesURL('./settings.html',state);
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.view === state.view)));
}
const dateLabel = (key, options) => new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',...options}).format(new Date(`${key}T12:00:00Z`));
function cell(tag,text,className) {
  const el = document.createElement(tag); el.textContent = text; if(className) el.className = className; return el;
}
function render() {
  applyControls(); savePreferences(state);
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
    const heading = cell('th',dateLabel(day,{weekday:'long',day:'numeric',month:'long'})); heading.colSpan = 7; heading.scope = 'rowgroup';
    if (day === today) heading.append(cell('span','Today'));
    row.append(heading); fragment.append(row);
    for (const event of entries) {
      const tr = document.createElement('tr'); tr.className = 'event-row';
      if (!nextMarked && new Date(event.date).getTime() >= now) {tr.classList.add('next-event');nextMarked = true;}
      tr.append(cell('td',new Intl.DateTimeFormat('en-GB',{timeZone:state.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(event.date)),'time'));
      const currency = cell('td',''); currency.append(cell('span',event.country,'currency')); tr.append(currency);
      const impact = cell('td',''), label = cell('span','','impact-label');
      label.append(cell('i','',`dot ${['High','Medium','Low'].includes(event.impact) ? event.impact : ''}`),document.createTextNode(event.impact)); impact.append(label); tr.append(impact);
      tr.append(cell('td',event.title,'event-title'),cell('td',event.actual || '—','numeric'),cell('td',event.forecast || '—','numeric'),cell('td',event.previous || '—','numeric')); fragment.append(tr);
    }
  }
  $('events').replaceChildren(fragment);
  $('empty').hidden = visible.length !== 0;
  const available = data.events.map(e => dayKey(e.date,state.timezone)).sort();
  const outside = !available.length || days.at(-1) < available[0] || days[0] > available.at(-1);
  $('empty').textContent = outside ? 'No data available for this period.' : 'No matching events.';
  const warning = feedWarning(data,refreshFailed,now);
  const updated = new Intl.DateTimeFormat('en-GB',{timeZone:state.timezone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(data.updatedAt));
  $('updated').textContent = `Updated ${updated}`;
  $('warning').hidden = !warning;
  $('warning').textContent = warning;
}
for (const key of ['search','upcoming']) {
  $(key).addEventListener(key === 'search' ? 'input' : 'change',() => {
    changePreferences({[key]:key === 'upcoming' ? $(key).checked : $(key).value});
  });
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click',() => changePreferences({view:button.dataset.view})));
$('prev').onclick = () => {state.anchor = addDays(state.anchor,state.view === 'week' ? -7 : -1);render();};
$('next').onclick = () => {state.anchor = addDays(state.anchor,state.view === 'week' ? 7 : 1);render();};
$('today').onclick = () => {state.anchor = dayKey(new Date(),state.timezone);render();};
$('reset').onclick = () => changePreferences({currencies:[...CURRENCIES],impacts:[...IMPACTS],search:'',upcoming:false});
async function load() {
  if (loading) return;
  loading = true;
  lastAttempt = Date.now();
  try {
    data = await fetchCalendar();
    refreshFailed = false;
    render();
  } catch (error) {
    refreshFailed = true;
    if (data) {render();return;}
    $('count').textContent = 'Calendar unavailable';$('updated').textContent = 'Could not load calendar data';$('empty').hidden = false;
    $('empty').textContent = 'Calendar unavailable. Reload to retry.';
    console.error(error);
  } finally {
    loading = false;
  }
}
function refreshIfDue() {
  if (!document.hidden && Date.now()-lastAttempt >= REFRESH_INTERVAL) load();
}
document.addEventListener('visibilitychange',refreshIfDue);
render();
if (!document.hidden) load();
setInterval(refreshIfDue,30000);
setInterval(()=>{if(data && !document.hidden) render();},60000);
