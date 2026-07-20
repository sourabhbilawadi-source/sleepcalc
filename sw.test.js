const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert');

class ExtendableEvent {
  constructor(type) {
    this.type = type;
    this.promises = [];
  }
  waitUntil(promise) {
    this.promises.push(promise);
  }
}

class FetchEvent extends ExtendableEvent {
  constructor(request) {
    super('fetch');
    this.request = request;
  }
  respondWith(promise) {
    this.responsePromise = promise;
  }
}

test('Service Worker Tests', async (t) => {
  let listeners = {};
  let cacheStorage = {};
  let globalFetchMock = async (request) => ({ status: 200, clone: () => ({ status: 200 }) });

  // Reset the global state before each subtest
  t.beforeEach(() => {
    listeners = {};
    cacheStorage = {};
    globalFetchMock = async (request) => ({ status: 200, clone: () => ({ status: 200 }) });

    global.self = {
      addEventListener: (event, callback) => {
        listeners[event] = callback;
      },
      skipWaiting: async () => {},
      clients: {
        claim: async () => {}
      },
      location: {
        origin: 'http://localhost'
      }
    };

    global.caches = {
      open: async (name) => {
        if (!cacheStorage[name]) {
          cacheStorage[name] = new Map();
        }
        const cacheMap = cacheStorage[name];
        return {
          add: async (url) => {
            if (url.includes('fail')) throw new Error('Simulated cache add failure');
            cacheMap.set(url, 'simulated-response-for-add');
          },
          put: async (url, response) => {
            cacheMap.set(url, response);
          }
        };
      },
      keys: async () => Object.keys(cacheStorage),
      delete: async (name) => {
        const deleted = name in cacheStorage;
        delete cacheStorage[name];
        return deleted;
      },
      match: async (request, options) => {
        const url = typeof request === 'string' ? request : request.url;
        const parsedUrl = new URL(url, 'http://localhost');
        const searchKey = options?.ignoreSearch ? parsedUrl.pathname : parsedUrl.pathname + parsedUrl.search;

        for (const cache of Object.values(cacheStorage)) {
          if (cache.has(searchKey)) return cache.get(searchKey);
          if (cache.has(url)) return cache.get(url);
          // the sw code uses cache.put(cleanUrl.pathname, responseToCache)
          // match without ignoring search query parameters might fail if search is different
          // but SW uses { ignoreSearch: true } in caches.match
        }
        return undefined;
      }
    };

    global.fetch = async (request) => {
      return globalFetchMock(request);
    };

    // Load and evaluate sw.js
    const swCode = fs.readFileSync('./sw.js', 'utf8');
    eval(swCode);
  });

  await t.test('Install Event - precaches assets and skips waiting', async () => {
    assert.ok(listeners.install, 'install listener should be registered');

    let skipWaitingCalled = false;
    global.self.skipWaiting = async () => {
      skipWaitingCalled = true;
    };

    const event = new ExtendableEvent('install');
    listeners.install(event);

    // Wait for all promises in waitUntil to resolve
    await Promise.all(event.promises);

    assert.ok(skipWaitingCalled, 'skipWaiting should be called');

    // goodsleep-v12 is CACHE_NAME
    const keys = await global.caches.keys();
    assert.ok(keys.includes('goodsleep-v12'), 'Cache should be created');

    assert.ok(cacheStorage['goodsleep-v12'].has('/'), '/ should be cached');
    assert.ok(cacheStorage['goodsleep-v12'].has('/about'), '/about should be cached');
  });

  await t.test('Install Event - handles single asset failure without halting', async () => {
    // Replace cache.add logic just for this test
    const originalOpen = global.caches.open;
    let failedPrecache = false;
    global.caches.open = async (name) => {
      const cache = await originalOpen(name);
      return {
        ...cache,
        add: async (url) => {
          if (url === '/about') {
            failedPrecache = true;
            throw new Error('Simulated cache add failure');
          }
          await cache.put(url, 'res');
        }
      };
    };

    const event = new ExtendableEvent('install');
    listeners.install(event);
    await Promise.all(event.promises);

    assert.ok(failedPrecache, 'A precache should have failed');
    assert.ok(cacheStorage['goodsleep-v12'].has('/'), 'Other assets should still be cached');
    assert.strictEqual(cacheStorage['goodsleep-v12'].has('/about'), false, 'Failed asset should not be cached');
  });

  await t.test('Activate Event - deletes old caches and claims clients', async () => {
    cacheStorage['old-cache-v1'] = new Map();
    cacheStorage['goodsleep-v12'] = new Map();

    let clientsClaimCalled = false;
    global.self.clients.claim = async () => {
      clientsClaimCalled = true;
    };

    const event = new ExtendableEvent('activate');
    listeners.activate(event);
    await Promise.all(event.promises);

    assert.ok(clientsClaimCalled, 'clients.claim should be called');
    const keys = await global.caches.keys();
    assert.deepStrictEqual(keys, ['goodsleep-v12'], 'Old caches should be deleted');
  });

  await t.test('Fetch Event - ignores non-GET requests', async () => {
    const event = new FetchEvent({ method: 'POST', url: 'http://localhost/api' });
    listeners.fetch(event);

    assert.strictEqual(event.responsePromise, undefined, 'Should not respond with anything');
  });

  await t.test('Fetch Event - ignores cross-origin requests', async () => {
    const event = new FetchEvent({ method: 'GET', url: 'http://example.com/api' });
    listeners.fetch(event);

    assert.strictEqual(event.responsePromise, undefined, 'Should not respond with anything');
  });

  await t.test('Fetch Event - Network First Strategy (Network Success)', async () => {
    const request = { method: 'GET', url: 'http://localhost/test-url?param=1' };
    const event = new FetchEvent(request);

    globalFetchMock = async (req) => {
      return {
        status: 200,
        clone: () => 'simulated-cloned-response'
      };
    };

    listeners.fetch(event);

    const response = await event.responsePromise;
    assert.strictEqual(response.status, 200, 'Should return network response');

    // Check if it was cached without query string
    assert.strictEqual(cacheStorage['goodsleep-v12'].get('/test-url'), 'simulated-cloned-response', 'Should cache the response without search params');
  });

  await t.test('Fetch Event - Network First Strategy (Network Failure, Cache Hit)', async () => {
    const request = { method: 'GET', url: 'http://localhost/cached-url' };
    const event = new FetchEvent(request);

    cacheStorage['goodsleep-v12'] = new Map();
    cacheStorage['goodsleep-v12'].set('/cached-url', 'simulated-cached-response');

    globalFetchMock = async (req) => {
      throw new Error('Offline');
    };

    listeners.fetch(event);

    const response = await event.responsePromise;
    assert.strictEqual(response, 'simulated-cached-response', 'Should return cached response on network failure');
  });

  await t.test('Fetch Event - Network First Strategy (Network Failure, Cache Miss, Navigate Fallback)', async () => {
    const request = { method: 'GET', url: 'http://localhost/uncached-page', mode: 'navigate' };
    const event = new FetchEvent(request);

    cacheStorage['goodsleep-v12'] = new Map();
    cacheStorage['goodsleep-v12'].set('/', 'simulated-home-page-response');

    globalFetchMock = async (req) => {
      throw new Error('Offline');
    };

    listeners.fetch(event);

    const response = await event.responsePromise;
    assert.strictEqual(response, 'simulated-home-page-response', 'Should return fallback home page response for navigation request');
  });

  await t.test('Fetch Event - Network First Strategy (Network Failure, Cache Miss, Non-navigate Fallback)', async () => {
    const request = { method: 'GET', url: 'http://localhost/uncached-asset.js', mode: 'no-cors' };
    const event = new FetchEvent(request);

    cacheStorage['goodsleep-v12'] = new Map();
    cacheStorage['goodsleep-v12'].set('/', 'simulated-home-page-response');

    globalFetchMock = async (req) => {
      throw new Error('Offline');
    };

    listeners.fetch(event);

    const response = await event.responsePromise;
    assert.strictEqual(response, undefined, 'Should return undefined for non-navigation offline cache miss');
  });
});
