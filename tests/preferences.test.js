import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePreferences,preferencesURL,defaultPreferences,IMPACTS} from '../public/preferences.js';

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
