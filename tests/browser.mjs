// Dependency-free Chromium/CDP harness. Requires Node 22+ and Chromium.
import {spawn, execFileSync} from 'node:child_process';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

export const repo = fileURLToPath(new URL('../', import.meta.url));
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export const baseline = process.env.OLD_REVISION || '746988f5781dced727f59a37dcd0f61bdf349db6';
export const gitFile = (revision, file) => execFileSync('git', ['-C', repo, 'show', `${revision}:${file}`], {maxBuffer: 30 * 1024 * 1024});
export async function assets() {
  const files = new Map();
  async function walk(dir) {
    for (const entry of await readdir(path.join(repo, 'dist', dir), {withFileTypes: true})) {
      const relative = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) await walk(relative);
      else files.set('/' + relative, await readFile(path.join(repo, 'dist', relative)));
    }
  }
  await walk('');
  return files;
}
export async function browser(handler) {
  const timers = new Set();
  const later = (fn, ms) => {
    const timer = setTimeout(() => {timers.delete(timer); fn();}, ms);
    timers.add(timer);
  };
  const server = http.createServer((req, res) => handler(req, res, later));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = await mkdtemp(path.join(tmpdir(), 'reference-regression-'));
  const executable = process.env.CHROMIUM || '/usr/bin/chromium';
  const chrome = spawn(executable, [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank',
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  let startupError, startupLog = '';
  chrome.on('error', error => {startupError = error;});
  chrome.stderr.on('data', chunk => {startupLog = (startupLog + chunk.toString()).slice(-8000);});
  let ws, sequence = 0;
  const pending = new Map(), exceptions = [], navigations = [];
  async function close() {
    for (const timer of timers) clearTimeout(timer);
    for (const item of pending.values()) {clearTimeout(item.timer); item.reject(Error('Browser closed'));}
    pending.clear();
    ws?.close();
    chrome.kill('SIGTERM');
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await pause(250);
    await rm(profile, {recursive: true, force: true});
  }
  try {
    let port;
    // Allow a bounded 30 seconds for a cold runner; fail immediately if launch failed.
    for (let i = 0; i < 600; i++) {
      if (startupError || chrome.exitCode !== null || chrome.signalCode !== null) break;
      try {port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; if (/^\d+$/.test(port)) break;}
      catch (error) {if (error.code !== 'ENOENT') throw error;}
      await pause(50);
    }
    assert.ok(port && /^\d+$/.test(port), `Chromium did not start (${executable}; ${startupError?.message || chrome.signalCode || (chrome.exitCode !== null ? 'exit '+chrome.exitCode : '30s startup timeout')})\n${startupLog}`);
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {ws.addEventListener('open', resolve, {once: true}); ws.addEventListener('error', reject, {once: true});});
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const item = pending.get(message.id);
        if (!item) return;
        clearTimeout(item.timer); pending.delete(message.id);
        if (message.error) item.reject(Error(JSON.stringify(message.error)));
        else item.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
      else if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) navigations.push(message.params.frame.url);
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {pending.delete(id); reject(Error('CDP timeout: ' + method));}, 20000);
      pending.set(id, {resolve, reject, timer}); ws.send(JSON.stringify({id, method, params}));
    });
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const until = async (expression, label) => {
      for (let i = 0; i < 200; i++) {
        try {if (await evaluate(expression)) return;}
        catch (error) {if (!/context|navigat/i.test(error.message)) throw error;}
        await pause(50);
      }
      throw Error(label || expression);
    };
    const navigate = async (pathname = '/', reload = false) => {
      const previous = await evaluate('performance.timeOrigin'), start = Date.now();
      if (reload) await call('Page.reload');
      else await call('Page.navigate', {url: origin + pathname});
      await until(`performance.timeOrigin!==${previous}`, 'Navigation did not commit');
      await until("document.readyState==='complete'&&document.querySelectorAll('.source').length===58", 'Page did not finish loading');
      await evaluate('document.fonts.ready.then(()=>true)');
      return Date.now() - start;
    };
    await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
    return {origin, call, evaluate, until, navigate, close, exceptions, navigations};
  } catch (error) {await close(); throw error;}
}
import {gzipSync} from 'node:zlib';
const gzipCache = new WeakMap();
export function serve(files, req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const key = pathname === '/' ? '/index.html' : pathname, body = files.get(key);
  if (!body) {res.writeHead(404); res.end(); return;}
  res.setHeader('Cache-Control', 'no-store');
  const ext = path.extname(key);
  const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.ico':'image/x-icon','.ttf':'font/ttf'};
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  if (req.headers['accept-encoding']?.includes('gzip') && ['.html','.js','.json','.svg','.webmanifest','.ico','.ttf'].includes(ext)) {
    let gz = gzipCache.get(body);
    if (!gz) { gz = gzipSync(body); gzipCache.set(body, gz); }
    res.setHeader('Content-Encoding', 'gzip');
    res.end(gz);
    return;
  }
  res.end(body);
}
export async function report(name, result) {
  const directory = process.env.RESULTS_DIR || path.join(tmpdir(), 'reference-regression-results');
  const {mkdir} = await import('node:fs/promises');
  await mkdir(directory, {recursive: true});
  await writeFile(path.join(directory, name + '.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`${name}: ${result.passed ? 'PASS' : 'FAIL'} — ${path.join(directory, name + '.json')}`);
}
