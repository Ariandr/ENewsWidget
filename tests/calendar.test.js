import test from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,addDays,periodDays,filterEvents} from '../public/calendar.js';
import {normalizeFeed} from '../scripts/refresh-calendar.mjs';

test('Warsaw date conversion handles midnight and the DST transition',()=>{
  assert.equal(dayKey('2026-10-24T22:30:00Z','Europe/Warsaw'),'2026-10-25');
  assert.equal(dayKey('2026-10-25T23:30:00Z','Europe/Warsaw'),'2026-10-26');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  assert.deepEqual(periodDays('2026-10-21','week'),['2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24']);
});
test('filters combine currency, impact, search and upcoming time',()=>{
  const events = [
    {title:'GDP',country:'USD',impact:'High',date:'2026-10-21T14:00:00Z'},
    {title:'GDP',country:'EUR',impact:'High',date:'2026-10-21T15:00:00Z'},
    {title:'GDP',country:'USD',impact:'Low',date:'2026-10-21T16:00:00Z'},
    {title:'GDP',country:'USD',impact:'Medium',date:'2026-10-21T17:00:00Z'},
    {title:'Meetings',country:'All',impact:'Medium',date:'2026-10-21T18:00:00Z'}
  ];
  const state = {anchor:'2026-10-21',view:'day',timezone:'Europe/Warsaw',currency:'USD',impact:'Medium+',search:'gDp',upcoming:true};
  assert.deepEqual(filterEvents(events,state,Date.parse('2026-10-21T15:30:00Z')),[events[3]]);
  assert.deepEqual(filterEvents(events,{...state,search:''},Date.parse('2026-10-21T15:30:00Z')),[events[3],events[4]]);
  assert.deepEqual(filterEvents(events,{...state,anchor:'2026-10-22'}),[]);
});
test('bad upstream data cannot overwrite a valid calendar',()=>{
  assert.throws(()=>normalizeFeed([]));
  assert.throws(()=>normalizeFeed([{title:'GDP',country:'USD',date:'not a date',impact:'High'}]));
  assert.throws(()=>normalizeFeed([{title:'GDP',country:'USD',date:'2026-10-21T12:00:00',impact:'High'}]));
  assert.deepEqual(normalizeFeed([{title:'GDP',country:'USD',date:'2026-10-21T12:00:00Z',impact:'High'}])[0],{title:'GDP',country:'USD',date:'2026-10-21T12:00:00Z',impact:'High',forecast:'',previous:''});
});
