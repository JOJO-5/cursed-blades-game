import { readFile, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root,'output/site');
if (destination !== path.resolve(root,'output','site') || !destination.startsWith(root + path.sep)) {
  throw new Error('Invalid staging destination');
}
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
const {version} = JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const commit = process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid build commit');
const index = await readFile(path.join(root,'index.html'),'utf8');
await writeFile(path.join(destination,'index.html'),index.replace(/\?v=[^"&]+/g,`?v=${version}.${commit.slice(0,12)}`));
await writeFile(path.join(destination,'build-info.json'),JSON.stringify({version,commit,builtAt:new Date().toISOString()},null,2));
for (const name of ['css','js']) await cp(path.join(root,name),path.join(destination,name),{recursive:true});
const manifest = JSON.parse(await readFile(path.join(root,'assets/manifest.json'),'utf8'));
await mkdir(path.join(destination,'assets'),{recursive:true});
await writeFile(path.join(destination,'assets/manifest.json'),JSON.stringify(manifest));
for(const key of Object.keys(manifest)) {
  const relative=`assets/${key}.png`, target=path.resolve(destination,relative);
  if(!target.startsWith(destination+path.sep)) throw new Error(`Invalid resource path: ${key}`);
  await mkdir(path.dirname(target),{recursive:true});
  await cp(path.join(root,relative),target);
}
console.log(`Static site staged with ${Object.keys(manifest).length} runtime assets: ${destination}`);
