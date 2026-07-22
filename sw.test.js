const makeServiceWorkerEnv = require('service-worker-mock');

describe('Service Worker', () => {
  let warnMock;

  beforeEach(() => {
    Object.assign(global, makeServiceWorkerEnv());
    jest.resetModules();
    warnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnMock.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Install Event', () => {
    it('should pre-cache assets without halting if one fails (Promise.allSettled)', async () => {
      // Intercept cache.add calls to simulate a failure
      const originalCacheOpen = global.caches.open.bind(global.caches);

      let capturedCache;
      jest.spyOn(global.caches, 'open').mockImplementation(async (cacheName) => {
        const cache = await originalCacheOpen(cacheName);
        capturedCache = cache;
        jest.spyOn(cache, 'add').mockImplementation(async (url) => {
          if (url === '/contact') {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve(); // success for others
        });
        return cache;
      });

      // Instead of relying on `await self.trigger('install')` which doesn't seem to await the
      // actual install promise appropriately in this environment mock version, we intercept it.
      let installPromise;
      const originalAddEventListener = self.addEventListener.bind(self);
      self.addEventListener = (event, callback) => {
        if (event === 'install') {
          const evt = {
            waitUntil: (p) => { installPromise = p; }
          };
          // call it immediately
          callback(evt);
        } else {
          originalAddEventListener(event, callback);
        }
      };

      // Require service worker to bind listeners and trigger install immediately via our override
      require('./sw.js');

      // Wait for the install event to complete
      await installPromise;

      // Verify that console.warn was called for the failing asset
      expect(warnMock).toHaveBeenCalledWith('[SW] Failed to cache /contact:', expect.any(Error));

      // Verify other assets were attempted to be cached
      expect(capturedCache.add).toHaveBeenCalledWith('/');
      expect(capturedCache.add).toHaveBeenCalledWith('/about');
    });

    it('should call skipWaiting after successful installation', async () => {
      const originalCacheOpen = global.caches.open.bind(global.caches);
      jest.spyOn(global.caches, 'open').mockImplementation(async (cacheName) => {
        const cache = await originalCacheOpen(cacheName);
        jest.spyOn(cache, 'add').mockImplementation(() => Promise.resolve());
        return cache;
      });

      let installPromise;
      const originalAddEventListener = self.addEventListener.bind(self);
      self.addEventListener = (event, callback) => {
        if (event === 'install') {
          const evt = {
            waitUntil: (p) => { installPromise = p; }
          };
          callback(evt);
        } else {
          originalAddEventListener(event, callback);
        }
      };

      const skipWaitingSpy = jest.spyOn(self, 'skipWaiting');

      require('./sw.js');

      await installPromise;

      expect(skipWaitingSpy).toHaveBeenCalled();
    });
  });
});
