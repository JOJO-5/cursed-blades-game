import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const calls=new Map();let active=0,peak=0,mode='transient';
class FakeImage {
  set src(url){
    this.url=url;if(!url)return;
    const key=url.split('?')[0],attempt=(calls.get(key)||0)+1;calls.set(key,attempt);active++;peak=Math.max(peak,active);
    const load=this.onload,error=this.onerror;
    setTimeout(()=>{active--;this.complete=true;this.width=96;this.height=94;
      if(key.includes('hero')&&(mode==='permanent'||(mode==='transient'&&attempt===1)))error?.();else load?.();
    },mode==='late'&&key.includes('hero')&&attempt===1?30:1);
  }
  get src(){return this.url;}
}
const ctx=vm.createContext({console:{warn(){}},window:{},Image:FakeImage,setTimeout,clearTimeout});
vm.runInContext(readFileSync(new URL('../js/core.js',import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('Assets.retryDelayMs=1;Assets.attemptTimeoutMs=10');
const manifest={'player/hero':{},...Object.fromEntries(Array.from({length:20},(_,i)=>['props/item'+i,{}]))};
ctx.manifest=manifest;
await run('Assets.loadList(manifest)');
assert.deepEqual([...run('Assets.failed')],[],'A temporary 503 must recover automatically');
assert.equal(run('Assets.loaded'),21,'Retries cannot count the same resource twice');
assert.ok(peak<=8,'Image downloads must stay bounded');
calls.clear();active=0;peak=0;mode='permanent';
await run('Assets.loadList({"player/hero":{}})');
assert.deepEqual([...run('Assets.failed')],['player/hero'],'Permanent failure is reported once after bounded retries');
assert.equal(run('Assets.loaded'),1);
assert.equal(calls.get('assets/player/hero.png'),3);
calls.clear();mode='late';
await run('Assets.loadList({"player/hero":{}})');
await new Promise(resolve=>setTimeout(resolve,40));
assert.equal(run('Assets.loaded'),1,'A timed-out response cannot settle the resource twice');
assert.deepEqual([...run('Assets.failed')],[]);
calls.clear();mode='late';run('Assets.loadTimeoutMs=5;Assets.attemptTimeoutMs=100');
await run('Assets.loadList({"player/hero":{}})');
assert.deepEqual([...run('Assets.failed')],['player/hero'],'The total startup deadline must stop waiting');
assert.equal(run('Assets.loaded'),1);
await run('Assets.loadList({})');assert.equal(run('Assets.loaded'),0);assert.equal(run('Assets.total'),0);
console.log('Bounded asset loading, temporary recovery, permanent failure and late response handling passed.');
