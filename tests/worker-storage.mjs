// Deterministic Cache API failure injection against the actual worker, not Safari emulation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import vm from 'node:vm';

const source=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
const origin='https://reference.example';
const shellIcon=JSON.parse(await readFile(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8')).icons.find(icon=>icon.sizes==='192x192').src;
const failure=()=>Promise.reject(new DOMException('Storage unavailable','QuotaExceededError'));
function worker({openFailure=false,readFailure=false,writeFailure=false,cleanupFailure=false,offline=false,opaque=false}={}) {
  const handlers={},state={writes:0,claimed:false,skipped:false,messages:[],fetches:0};
  const cache={
    match:async()=>{if(readFailure)return failure();return new Response('cached page');},
    put:async()=>{state.writes++;if(writeFailure)return failure();},
  };
  const self={location:{origin},addEventListener:(name,handler)=>handlers[name]=handler,
    skipWaiting:async()=>{state.skipped=true;},clients:{claim:async()=>{state.claimed=true;}}};
  vm.runInNewContext(source,{self,caches:{open:async()=>openFailure?failure():cache,
    keys:async()=>['visual-edit-shell-obsolete','unrelated-cache'],delete:async()=>cleanupFailure?failure():true},
    fetch:async()=>{state.fetches++;if(offline)throw new TypeError('Offline');
      if(opaque)return {ok:false,type:'opaque'};
      const response=new Response('fresh response');
      Object.defineProperty(response,'type',{value:'basic'});return response;},
    Response,URL,AbortController,setTimeout,clearTimeout});
  function dispatch(name,extra={}) {
    let pending;
    handlers[name]({waitUntil:p=>pending=p,respondWith:p=>pending=p,...extra});
    return pending;
  }
  const request=(path='/',mode='navigate')=>dispatch('fetch',{request:{method:'GET',url:origin+path,mode}});
  return {state,cache,dispatch,request};
}

test('a navigation returns fresh HTML when a cache write fails',async()=>{
  const w=worker({writeFailure:true});
  assert.equal(await (await w.request()).text(),'fresh response');assert.equal(w.state.writes,1);
});
test('unavailable storage still permits online navigation and shell assets',async()=>{
  const w=worker({openFailure:true});
  for(const [path,mode] of [['/','navigate'],[shellIcon,'no-cors'],['/images/image-0123456789abcdef.png','no-cors']])
    assert.equal(await (await w.request(path,mode)).text(),'fresh response');
});
test('unreadable cache entries fall back to online assets',async()=>{
  const w=worker({readFailure:true});
  for(const path of [shellIcon,'/images/image-0123456789abcdef.png'])
    assert.equal(await (await w.request(path,'no-cors')).text(),'fresh response');
});
test('offline navigation keeps its cached fallback',async()=>{
  assert.equal(await (await worker({offline:true}).request()).text(),'cached page');
});
test('offline navigation with unavailable or unreadable storage returns a useful 503',async()=>{
  for(const flags of [{openFailure:true},{readFailure:true}]) {
    const response=await worker({offline:true,...flags}).request();
    assert.equal(response.status,503);assert.match(await response.text(),/Reconnect/);
  }
});
test('logo quota failure preserves the network response; opaque images stay uncached',async()=>{
  const path='/images/image-0123456789abcdef.png';
  const w=worker({readFailure:true,writeFailure:true});
  assert.equal(await (await w.request(path,'no-cors')).text(),'fresh response');assert.equal(w.state.writes,1);
  const opaque=worker({readFailure:true,opaque:true});
  assert.equal((await opaque.request(path,'no-cors')).type,'opaque');assert.equal(opaque.state.writes,0);
});
test('installation remains strict on quota errors or opaque downloads',async()=>{
  for(const flags of [{writeFailure:true},{openFailure:true},{opaque:true}]) {
    const w=worker(flags);await assert.rejects(w.dispatch('install'));assert.equal(w.state.skipped,false);
  }
});
test('failed obsolete-cache cleanup does not block clients.claim',async()=>{
  const w=worker({cleanupFailure:true});await w.dispatch('activate');assert.equal(w.state.claimed,true);
});
test('offline status reports false when storage cannot be opened or read',async()=>{
  for(const flags of [{openFailure:true},{readFailure:true}]) {
    const w=worker(flags);
    await w.dispatch('message',{data:{type:'OFFLINE_STATUS'},ports:[{postMessage:message=>w.state.messages.push(message)}]});
    assert.equal(w.state.messages.length,1);assert.equal(w.state.messages[0].ready,false);
  }
});
test('explicit activation message extends the worker event lifetime',async()=>{
  const w=worker();const pending=w.dispatch('message',{data:{type:'ACTIVATE_UPDATE'}});
  assert.ok(pending instanceof Promise);await pending;assert.equal(w.state.skipped,true);
});
