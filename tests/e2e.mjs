import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campaign = process.argv.includes('--campaign');
const summaryOnly = process.argv.includes('--summary');
const output = path.join(root, 'output/playwright/v120');
const natural = process.argv.includes('--natural');
const profile=process.argv.find(a=>a.startsWith('--profile='))?.split('=')[1];
const expedition=process.argv.find(a=>a.startsWith('--expedition='))?.split('=')[1];
const character=process.argv.find(a=>a.startsWith('--character='))?.split('=')[1];
const villageOnly=process.argv.includes('--village');
const resultFile = campaign ? `campaign-${villageOnly?'village-':''}${expedition?expedition+'-':''}${profile||'all'}-results.json` : summaryOnly ? 'summary-results.json' : natural ? 'natural-results.json' : 'results.json';
const failureFile = campaign ? `campaign-${profile||'all'}-failure.json` : summaryOnly ? 'summary-failure.json' : natural ? 'natural-failure.json' : 'failure.json';
await mkdir(output, { recursive: true });
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css','.png':'image/png','.json':'application/json'};
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(target);
    res.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const targetURL=new URL(process.env.CURSED_TEST_URL || `http://127.0.0.1:${server.address().port}`);
if(campaign&&profile)targetURL.searchParams.set('naturalProfile',profile);
if(expedition)targetURL.searchParams.set('expedition',expedition);
if(character)targetURL.searchParams.set('character',character);
if(villageOnly)targetURL.searchParams.set('stopAfter','village');
const url=targetURL.href;
const session = `cursed-e2e-${process.pid}`;
const cli = path.join(root, 'node_modules/@playwright/cli/playwright-cli.js');
const config = {browser: {browserName:'chromium', launchOptions: {channel:process.platform === 'win32' ? 'chrome' : 'chromium'},
  contextOptions: {viewport:{width:1280,height:720}}}};
const configPath = path.join(output, 'browser-config.json');
await writeFile(configPath, JSON.stringify(config, null, 2));
async function run(args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, `-s=${session}`, ...args], {cwd:root, windowsHide:true});
    let text = '';
    child.stdout.on('data', d => {text += d;});
    child.stderr.on('data', d => {text += d; process.stderr.write(d);});
    child.on('error', reject);
    child.on('close', code => {
      if(code===0 && !text.includes('### Error')) resolve(text);
      else reject(new Error(`Browser command failed (${code}): ${args[0]}: ${text.slice(0,1000)}`));
    });
  });
}
const started = new Date().toISOString();
try {
  await run(['open',url,'--config',configPath]);
  await run(['snapshot']);
  const response = await run(['run-code','--filename',campaign ? 'tests/natural-campaign-browser.js' : summaryOnly ? 'tests/run-browser.js' : natural ? 'tests/natural-browser.js' : 'tests/e2e-browser.js']);
  const resultMatch = response.match(/### Result\s*\n([\s\S]*?)\n### Ran/);
  if (!resultMatch) throw new Error('Missing browser test result');
  const result = JSON.parse(resultMatch[1]);
  for(const file of natural || campaign || summaryOnly ? [] : ['tests/build-browser.js','tests/build-campaign.js','tests/world-browser.js','tests/run-browser.js','tests/expansion-browser.js','tests/scene-browser.js','tests/biome-browser.js','tests/combat-visual-browser.js']) {
    if(!result.passed)break;
    const response = await run(['run-code','--filename',file]);
    const match=response.match(/### Result\s*\n([\s\S]*?)\n### Ran/);
    if(!match)throw new Error('Missing build browser result');
    const build=JSON.parse(match[1]);
    result.checks.push(...build.checks);result.screenshots.push(...build.screenshots);result.errors.push(...build.errors);
    result.passed=build.passed;if(!build.passed)result.failure=build.failure;
  }
  await writeFile(path.join(output,resultFile),JSON.stringify({started,url,...result},null,2));
  if(campaign)console.log('Natural campaign report: '+JSON.stringify(result.results.map(r=>({profile:r.profile,state:r.state,theme:r.theme,time:r.time,hp:r.hp,level:r.level,wallSeconds:r.wallSeconds,weapons:r.weapons,summary:r.summary,timing:r.timing}))));
  if (!result.passed) throw new Error(result.failure || 'Browser assertions failed');
  await rm(path.join(output,failureFile),{force:true});
  if(!natural)for(const name of ['failure.png','build-failure.png','world-failure.png',...['orbit','projectile','summon'].map(id=>`campaign-${id}-failure.png`)])await rm(path.join(output,name),{force:true});
  console.log(`E2E passed: ${result.checks.length} checks; results and screenshots: ${output}`);
} catch (error) {
  console.error(String(error));
  await writeFile(path.join(output,failureFile),JSON.stringify({started,error:String(error)},null,2));
  process.exitCode = 1;
} finally {
  try { await run(['close']); } catch { /* Preserve the original failure. */ }
  await new Promise(resolve => server.close(resolve));
}
