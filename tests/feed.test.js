import test from 'node:test';
import assert from 'node:assert/strict';
import {FEED_URL,fetchCalendar,normalizePipAtlas,feedWarning} from '../public/feed.js';

const updated = '2026-10-21T16:07:00Z';
const event = {name:'GDP',currency:'USD',impact:'High',date:'2026-10-21T14:30:00-04:00',forecast:'2.2%',previous:'2.0%'};
const payload = {updated,events:[event]};

test('PipAtlas fields map to the existing calendar, retaining source offsets and optional actuals',()=>{
  assert.deepEqual(normalizePipAtlas({...payload,events:[{...event,actual:0}]}),{
    updatedAt:updated,stale:false,
    events:[{title:'GDP',country:'USD',impact:'High',date:event.date,forecast:'2.2%',previous:'2.0%',actual:'0'}],
  });
  const missing = normalizePipAtlas({updated,events:[{...event,currency:'ALL',forecast:null,previous:undefined}]}).events[0];
  assert.equal(missing.country,'All');
  assert.equal(missing.actual,'');
  assert.equal(missing.forecast,'');
  assert.equal(missing.previous,'');
  assert.equal(normalizePipAtlas({updated,events:[]}).events.length,0);
});

test('malformed dates, event fields and payloads are rejected instead of silently losing events',()=>{
  for (const invalid of [null,{}, {...payload,updated:'yesterday'}, {...payload,events:[null]},
    {...payload,events:[{...event,date:'2026-10-21T14:30:00'}]},
    {...payload,events:[{...event,impact:'Critical'}]},
    {...payload,events:[{...event,actual:{value:3}}]},
  ]) assert.throws(()=>normalizePipAtlas(invalid));
});

test('fetches the public API directly without credentials and validates its response',async()=>{
  const result = await fetchCalendar(async (url,options)=>{
    assert.equal(url,FEED_URL);
    assert.equal(options.mode,'cors');
    assert.equal(options.credentials,'omit');
    assert.ok(options.signal instanceof AbortSignal);
    return {ok:true,json:async()=>payload};
  });
  assert.equal(result.events[0].title,'GDP');
  await assert.rejects(fetchCalendar(async()=>({ok:false,status:429})),/HTTP 429/);
  await assert.rejects(fetchCalendar(async()=>{throw new TypeError('Failed to fetch');}),/Failed to fetch/);
  await assert.rejects(fetchCalendar(async()=>({ok:true,json:async()=>({events:[]})})),/Invalid PipAtlas/);
});

test('source staleness and refresh failures stay visible independently of data age',()=>{
  const data = normalizePipAtlas(payload), now = Date.parse(updated);
  assert.equal(feedWarning(data,false,now),'');
  assert.equal(feedWarning({...data,stale:true},false,now),'PipAtlas reports stale data');
  assert.equal(feedWarning(data,false,now+31*60000),'Possibly stale data');
  assert.equal(feedWarning(data,true,now),'Refresh failed · showing previously loaded data');
});
