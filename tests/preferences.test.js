import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePreferences,preferencesURL,defaultPreferences,loadPreferences,savePreferences,saveManualPreferences,CURRENCIES,IMPACTS} from '../public/preferences.js';

function memoryStorage() {
  const values = new Map();
  return {getItem:key=>values.get(key) ?? null,setItem:(key,value)=>values.set(key,value)};
}

test('old links and saved filters migrate to independent selections',()=>{
  const encoded = parsePreferences('?currency=USD&impact=Medium%2B');
  assert.deepEqual(encoded.currencies,['USD']);
  assert.deepEqual(encoded.impacts,['Medium','High']);
  assert.deepEqual(parsePreferences('',{impact:'High',currency:'EUR'}).impacts,['High']);
});
test('empty selections and table-only layout survive embed URL and settings round trips',()=>{
  const initial = {...defaultPreferences(),currencies:[],impacts:[],showHeader:false,showNavigation:false,showFilters:false,showSummary:false,showFooter:false};
  const link = preferencesURL('./settings.html',initial,'https://user.github.io/widget/index.html');
  assert.equal(new URL(link).pathname,'/widget/settings.html');
  const parsed = parsePreferences(new URL(link).search);
  assert.deepEqual(parsed,initial);
  const widget = preferencesURL('./index.html',parsed,link);
  assert.equal(new URL(widget).pathname,'/widget/index.html');
  assert.deepEqual(parsePreferences(new URL(widget).search),initial);
});
test('URL selections override saved settings and malformed values are sanitized',()=>{
  const state = parsePreferences('?currencies=USD,JPY,USD&impacts=Low,High&showHeader=false',{currencies:['EUR'],showHeader:true});
  assert.deepEqual(state.currencies,['USD','JPY']);
  assert.deepEqual(state.impacts,['Low','High']);
  assert.equal(state.showHeader,false);
  const invalid = parsePreferences('?timezone=bad&theme=invalid&currencies=oops',null);
  assert.equal(invalid.timezone,'Europe/Warsaw');
  assert.equal(invalid.theme,'auto');
  assert.deepEqual(invalid.currencies,[]);
  assert.deepEqual(invalid.impacts,IMPACTS);
});

test('manual New York time zone survives reopening the original Warsaw embed',()=>{
  const storage = memoryStorage();
  const source = '?timezone=Europe%2FWarsaw&theme=dark&currencies=USD';
  const initial = loadPreferences(source,storage);
  assert.equal(initial.timezone,'Europe/Warsaw');
  const settings = {...initial,timezone:'America/New_York'};
  assert.equal(savePreferences(settings,storage),true);
  assert.equal(saveManualPreferences({timezone:settings.timezone},storage),true);

  // Notion reopens its original source URL, even after navigating within the iframe.
  const reopened = loadPreferences(source,storage);
  assert.equal(reopened.timezone,'America/New_York');
  assert.equal(reopened.theme,'dark');
  assert.deepEqual(reopened.currencies,['USD']);
  const settingsURL = preferencesURL('./settings.html',reopened,'https://user.github.io/widget/index.html');
  assert.equal(new URL(settingsURL).searchParams.get('timezone'),'America/New_York');
  const calendarURL = preferencesURL('./index.html',loadPreferences(new URL(settingsURL).search,storage),settingsURL);
  assert.equal(new URL(calendarURL).searchParams.get('timezone'),'America/New_York');
  assert.equal(loadPreferences(new URL(calendarURL).search,storage).timezone,'America/New_York');

  // Rendering another URL or saving filters must not replace the explicit choice.
  savePreferences(parsePreferences('?timezone=Asia%2FTokyo&search=GDP'),storage);
  assert.equal(loadPreferences(source,storage).timezone,'America/New_York');
  assert.equal(saveManualPreferences({timezone:'Europe/London'},storage),true);
  assert.equal(loadPreferences(source,storage).timezone,'Europe/London');
});

test('URL time zone remains the default until a valid manual selection is saved',()=>{
  const storage = memoryStorage();
  savePreferences({...defaultPreferences(),timezone:'Asia/Tokyo'},storage);
  assert.equal(loadPreferences('?timezone=UTC',storage).timezone,'UTC');
  assert.equal(loadPreferences('',storage).timezone,'Asia/Tokyo');
  assert.equal(saveManualPreferences({timezone:'invalid'},storage),false);
  assert.equal(loadPreferences('?timezone=UTC',storage).timezone,'UTC');
  storage.setItem('calendar-manual-timezone','invalid');
  assert.equal(loadPreferences('?timezone=UTC',storage).timezone,'UTC');
  saveManualPreferences({timezone:'America/New_York'},storage);
  storage.setItem('calendar-preferences','invalid json');
  assert.equal(loadPreferences('?timezone=Europe%2FWarsaw',storage).timezone,'America/New_York');
});

test('a copied New York embed link works with cleared or blocked browser storage',()=>{
  const settings = {...defaultPreferences(),timezone:'America/New_York'};
  const embed = preferencesURL('./index.html',settings,'https://user.github.io/widget/settings.html');
  const query = new URL(embed).search;
  assert.equal(loadPreferences(query,memoryStorage()).timezone,'America/New_York');
  const blockedStorage = {getItem(){throw new Error('Storage blocked');},setItem(){throw new Error('Storage blocked');}};
  assert.equal(loadPreferences(query,blockedStorage).timezone,'America/New_York');
  assert.equal(savePreferences(settings,blockedStorage),false);
  assert.equal(saveManualPreferences({timezone:settings.timezone},blockedStorage),false);
});

test('all manually changed settings take priority over the original embed parameters',()=>{
  const storage = memoryStorage();
  const sourceState = {...defaultPreferences(),theme:'dark',currencies:['USD'],impacts:['High'],search:'CPI'};
  const source = new URL(preferencesURL('./index.html',sourceState,'https://user.github.io/widget/')).search;
  const manual = {view:'day',timezone:'America/New_York',theme:'light',currencies:['EUR','JPY'],impacts:['Low','Holiday'],search:'GDP',upcoming:true,
    showHeader:true,showNavigation:false,showFilters:false,showSummary:true,showFooter:true,compact:false};
  for (const [key,value] of Object.entries(manual)) assert.equal(saveManualPreferences({[key]:value},storage),true);
  assert.deepEqual(loadPreferences(source,storage),manual);
  // A background render of the original embed must not turn URL defaults into manual choices.
  savePreferences(sourceState,storage);
  assert.deepEqual(loadPreferences(source,storage),manual);
  const settings = preferencesURL('./settings.html',loadPreferences(source,storage),'https://user.github.io/widget/');
  assert.deepEqual(loadPreferences(new URL(settings).search,storage),manual);
});

test('changing one field leaves untouched fields controlled by the embed URL',()=>{
  const storage = memoryStorage();
  const initial = loadPreferences('?theme=light&timezone=UTC&currencies=USD&showFooter=false',storage);
  savePreferences(initial,storage);
  saveManualPreferences({theme:'dark'},storage);
  savePreferences({...initial,theme:'dark'},storage);
  const reopened = loadPreferences('?theme=light&timezone=Asia%2FTokyo&currencies=EUR&showFooter=true',storage);
  assert.equal(reopened.theme,'dark');
  assert.equal(reopened.timezone,'Asia/Tokyo');
  assert.deepEqual(reopened.currencies,['EUR']);
  assert.equal(reopened.showFooter,true);
});

test('empty selections, cleared search and unchecked settings override nonempty URL defaults',()=>{
  const storage = memoryStorage();
  const source = '?currencies=USD&impacts=High&search=GDP&upcoming=true&showHeader=true&showNavigation=true&showFilters=true&showSummary=true&showFooter=true&compact=true';
  const manual = {currencies:[],impacts:[],search:'',upcoming:false,showHeader:false,showNavigation:false,showFilters:false,showSummary:false,showFooter:false,compact:false};
  saveManualPreferences({currencies:['EUR'],impacts:['Low'],search:'CPI',showHeader:true},storage);
  saveManualPreferences(manual,storage);
  const reopened = loadPreferences(source,storage);
  for (const [key,value] of Object.entries(manual)) assert.deepEqual(reopened[key],value,key);
  // Reset filters is another explicit choice, including all currencies and impacts.
  saveManualPreferences({currencies:CURRENCIES,impacts:IMPACTS,search:'',upcoming:false},storage);
  assert.deepEqual(loadPreferences(source,storage).currencies,CURRENCIES);
  assert.deepEqual(loadPreferences(source,storage).impacts,IMPACTS);
  assert.equal(loadPreferences(source,storage).showHeader,false);
});

test('legacy manual timezone survives migration and invalid manual fields fall back to URL defaults',()=>{
  const storage = memoryStorage();
  storage.setItem('calendar-manual-timezone','America/New_York');
  storage.setItem('calendar-manual-preferences','invalid json');
  assert.equal(loadPreferences('?timezone=UTC',storage).timezone,'America/New_York');
  saveManualPreferences({theme:'dark'},storage);
  assert.equal(loadPreferences('?timezone=UTC',storage).timezone,'America/New_York');
  saveManualPreferences({timezone:'Europe/London'},storage);
  assert.equal(loadPreferences('?timezone=UTC',storage).timezone,'Europe/London');
  storage.setItem('calendar-manual-preferences',JSON.stringify({theme:'invalid',showFooter:'false',currencies:['oops'],anchor:'2000-01-01',search:'GDP'}));
  const recovered = loadPreferences('?theme=light&showFooter=true&currencies=EUR&search=CPI',storage);
  assert.equal(recovered.theme,'light');
  assert.equal(recovered.showFooter,true);
  assert.deepEqual(recovered.currencies,['EUR']);
  assert.equal(recovered.search,'GDP');
  assert.equal(Object.hasOwn(recovered,'anchor'),false);
});
