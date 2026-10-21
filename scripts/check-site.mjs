import {readdir,readFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = new URL('../public/',import.meta.url);
const files = await readdir(root,{recursive:true});
const mount = new URL('https://example.github.io/calendar-widget/');
let references = 0;

async function checkReference(reference,source) {
  const resolved = new URL(reference,new URL(source,mount));
  if (resolved.origin !== mount.origin) {
    if (resolved.protocol !== 'https:') throw new Error(`${source}: non-HTTPS external reference ${reference}`);
    return;
  }
  if (!resolved.pathname.startsWith(mount.pathname)) throw new Error(`${source}: reference escapes the Pages repository path: ${reference}`);
  const relative = decodeURIComponent(resolved.pathname.slice(mount.pathname.length));
  const target = new URL(relative || 'index.html',root);
  if (!(await stat(target)).isFile()) throw new Error(`${source}: reference does not point to a file: ${reference}`);
  references++;
}

for (const file of files) {
  if (!/\.(?:html|js|css)$/.test(file)) continue;
  const source = await readFile(new URL(file,root),'utf8');
  if (file.endsWith('.html')) {
    for (const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) await checkReference(match[1],file);
  } else if (file.endsWith('.js')) {
    const result = spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,root))],{encoding:'utf8'});
    if (result.status !== 0) throw new Error(result.stderr || `Syntax check failed: ${file}`);
    for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) await checkReference(match[1],file);
  } else {
    for (const match of source.matchAll(/url\(["']?([^"')]+)["']?\)/g)) await checkReference(match[1],file);
  }
}
for (const page of ['index.html','settings.html']) await checkReference(`./${page}`,'index.html');
console.log(`Static site checks passed: JavaScript syntax and ${references} local references under /calendar-widget/.`);
