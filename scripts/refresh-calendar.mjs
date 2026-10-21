import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export function normalizeFeed(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('The export is empty or invalid; keeping existing data.');
  return rows.map((row,index) => {
    if (typeof row.title !== 'string' || !row.title.trim() || typeof row.country !== 'string' || typeof row.date !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || !['High','Medium','Low','Holiday','Non-Economic'].includes(row.impact)) throw new Error(`Invalid event at row ${index}; keeping existing data.`);
    return {title:row.title,country:row.country,date:row.date,impact:row.impact,forecast:String(row.forecast ?? ''),previous:String(row.previous ?? '')};
  }).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
}

async function main() {
  const source = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
  const inputIndex = process.argv.indexOf('--input');
  let rows;
  if(inputIndex !== -1) rows = JSON.parse(await readFile(process.argv[inputIndex+1],'utf8'));
  else {
    const response = await fetch(source,{signal:AbortSignal.timeout(30000),headers:{'Accept':'application/json'}});
    if(!response.ok) throw new Error(`Calendar export returned HTTP ${response.status}; keeping existing data.`);
    rows = await response.json();
  }
  const events = normalizeFeed(rows);
  const output = new URL('../public/data/calendar.json',import.meta.url);
  await mkdir(new URL('../public/data/',import.meta.url),{recursive:true});
  await writeFile(new URL(`${output.href}.tmp`),JSON.stringify({source,fetchedAt:new Date().toISOString(),events},null,2)+'\n');
  await rename(new URL(`${output.href}.tmp`),output);
  console.log(`Saved ${events.length} events.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});
