import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

describe('Service Worker Install Caching', () => {
  it('should not fail installation if a single asset fails to cache', async () => {
    const mockCache = {
      add: async (url) => {
        if (url === '/about') {
          throw new Error('Failed to fetch');
        }
        return Promise.resolve();
      }
    };

    const mockCaches = {
      open: async () => mockCache
    };

    let installCallback;
    const mockSelf = {
      addEventListener: (event, cb) => {
        if (event === 'install') {
          installCallback = cb;
        }
      },
      skipWaiting: () => Promise.resolve()
    };

    const warnings = [];
    const mockConsole = {
      warn: (...args) => warnings.push(args)
    };

    const code = fs.readFileSync('sw.js', 'utf8');
    const context = {
      self: mockSelf,
      caches: mockCaches,
      console: mockConsole,
      Promise: Promise,
      URL: URL
    };
    vm.createContext(context);
    vm.runInContext(code, context);

    assert.ok(installCallback);

    let waitPromise;
    const event = {
      waitUntil: (p) => {
        waitPromise = p;
      }
    };

    installCallback(event);
    await waitPromise;

    // Check if the warning was logged
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0][0], /Failed to precache asset during install: \/about/);
  });
});
