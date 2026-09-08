const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {resolve} = require('node:path');
const vm = require('node:vm');

const scope = 'https://neurovendas.github.io/happy-coding/';
const prefix = `happy-coding:${scope}:`;
const current = `${prefix}v2`;
const source = readFileSync(resolve(__dirname, '../sw.js'), 'utf8');

function worker() {
  const listeners = {};
  const stores = new Map();
  const state = {skipped: false, claimed: false, network: async () => {throw Error('offline');}};
  const key = request => typeof request === 'string' ? request : request.url;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        addAll: async requests => {
          for (const request of requests) {
            const path = new URL(request.url).pathname.slice(new URL(scope).pathname.length);
            assert.ok(existsSync(resolve(__dirname, '..', path || 'index.html')), path);
            assert.equal(request.cache, 'reload');
            assert.equal(request.credentials, 'omit');
          }
          if (state.installError) throw Error('precache failed');
          for (const request of requests) entries.set(key(request), new Response(key(request)));
        },
        match: async request => entries.get(key(request))?.clone()
      };
    }
  };
  vm.runInNewContext(source, {
    URL, Request, Response, caches, fetch: request => state.network(request),
    self: {
      registration: {scope},
      addEventListener: (name, listener) => {listeners[name] = listener;},
      skipWaiting: async () => {state.skipped = true;},
      clients: {claim: async () => {state.claimed = true;}}
    }
  });
  return {
    state, stores,
    lifecycle(name) {
      let completion;
      listeners[name]({waitUntil: promise => {completion = promise;}});
      return completion;
    },
    request(path, options = {}) {
      let response;
      const request = {url: new URL(path, scope).href, method: 'GET', mode: 'cors', ...options};
      listeners.fetch({request, respondWith: promise => {response = promise;}});
      return response;
    }
  };
}

test('install caches existing shell files, including the optional AI module', async () => {
  const w = worker();
  await w.lifecycle('install');
  assert.ok(w.stores.get(current).has(`${scope}ai-local.js`));
  assert.equal(w.state.skipped, true);
});

test('a failed installation does not take over the active worker', async () => {
  const w = worker();
  w.state.installError = true;
  await assert.rejects(w.lifecycle('install'), /precache failed/);
  assert.equal(w.state.skipped, false);
});

test('activation deletes only older caches belonging to this exact scope', async () => {
  const w = worker();
  const keep = [current, 'happy-coding-v1', 'other-app-v1', 'happy-coding:https://neurovendas.github.io/other/:v1'];
  for (const name of [...keep, `${prefix}v1`]) w.stores.set(name, new Map());
  await w.lifecycle('activate');
  assert.deepEqual([...w.stores.keys()], keep);
  assert.equal(w.state.claimed, true);
});

test('offline navigation falls back to its own page, including links with tracking parameters', async () => {
  const w = worker();
  await w.lifecycle('install');
  const response = await w.request('./?utm_source=chatgpt.com', {mode: 'navigate'});
  assert.equal(await response.text(), `${scope}index.html`);
});

test('offline assets never receive HTML, even with another cache containing that asset', async () => {
  const w = worker();
  await w.lifecycle('install');
  assert.equal(await (await w.request('app.js')).text(), `${scope}app.js`);
  w.stores.get(current).delete(`${scope}app.js`);
  w.stores.set('other-app-v1', new Map([[`${scope}app.js`, new Response('wrong app')]]));
  assert.equal((await w.request('app.js')).type, 'error');
});

test('external, neighboring, API, unknown, query-bearing assets and writes bypass the cache', () => {
  const w = worker();
  for (const path of ['https://example.com/a.js', '../other/app.js', '../happy-coding-other/app.js', 'api/account', 'missing.js', 'app.js?token=private']) {
    assert.equal(w.request(path), undefined, path);
  }
  assert.equal(w.request('app.js', {method: 'POST'}), undefined);
});

test('fresh responses and HTTP errors never replace the offline shell', async () => {
  const w = worker();
  await w.lifecycle('install');
  for (const status of [200, 404, 500]) {
    w.state.network = async () => new Response('network', {status});
    assert.equal((await w.request('app.js')).status, status);
    assert.equal(await w.stores.get(current).get(`${scope}app.js`).clone().text(), `${scope}app.js`);
  }
});
