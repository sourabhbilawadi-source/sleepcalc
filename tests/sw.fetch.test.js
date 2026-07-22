const fs = require('fs');
const path = require('path');

// Read the SW code
const swCode = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');

describe('Service Worker - Fetch Event', () => {
  let addEventListenerMock;
  let fetchMock;
  let cachesMock;
  let cacheMock;
  let fetchHandler;

  beforeEach(() => {
    // Reset state
    addEventListenerMock = jest.fn((event, handler) => {
      if (event === 'fetch') {
        fetchHandler = handler;
      }
    });

    fetchMock = jest.fn();
    global.fetch = fetchMock;

    cacheMock = {
      put: jest.fn(),
      add: jest.fn(),
      match: jest.fn()
    };

    cachesMock = {
      open: jest.fn().mockResolvedValue(cacheMock),
      match: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      delete: jest.fn()
    };
    global.caches = cachesMock;

    global.self = {
      addEventListener: addEventListenerMock,
      location: {
        origin: 'https://example.com'
      },
      skipWaiting: jest.fn(),
      clients: {
        claim: jest.fn()
      }
    };

    // Evaluate the service worker script
    eval(swCode);
  });

  it('should ignore non-GET requests', () => {
    const event = {
      request: {
        method: 'POST',
        url: 'https://example.com/api/data'
      },
      respondWith: jest.fn()
    };

    fetchHandler(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it('should ignore cross-origin requests', () => {
    const event = {
      request: {
        method: 'GET',
        url: 'https://another-domain.com/api/data'
      },
      respondWith: jest.fn()
    };

    fetchHandler(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it('should use network first, then cache on success', async () => {
    const networkResponse = {
      status: 200,
      clone: jest.fn().mockReturnValue('cloned-response')
    };
    fetchMock.mockResolvedValue(networkResponse);

    const event = {
      request: {
        method: 'GET',
        url: 'https://example.com/page?query=123'
      },
      respondWith: jest.fn(promise => promise)
    };

    // Wait for the handler's promise to resolve
    const respondPromise = new Promise(resolve => {
        event.respondWith = jest.fn(promise => {
            resolve(promise);
        });
    });

    fetchHandler(event);
    const result = await respondPromise;

    expect(fetchMock).toHaveBeenCalledWith(event.request);
    expect(result).toBe(networkResponse);

    // Check if caching logic was called correctly
    // Need a small delay to let the inner caches.open promise resolve
    await new Promise(process.nextTick);

    expect(networkResponse.clone).toHaveBeenCalled();
    expect(cachesMock.open).toHaveBeenCalledWith('goodsleep-v12');
    expect(cacheMock.put).toHaveBeenCalledWith('/page', 'cloned-response');
  });

  it('should fall back to cache when network fails', async () => {
    fetchMock.mockRejectedValue(new Error('Network failure'));

    const cachedResponse = { data: 'cached-data' };
    cachesMock.match.mockResolvedValue(cachedResponse);

    const event = {
      request: {
        method: 'GET',
        url: 'https://example.com/page',
        mode: 'cors'
      },
      respondWith: jest.fn()
    };

    const respondPromise = new Promise(resolve => {
        event.respondWith = jest.fn(promise => resolve(promise));
    });

    fetchHandler(event);
    const result = await respondPromise;

    expect(fetchMock).toHaveBeenCalledWith(event.request);
    expect(cachesMock.match).toHaveBeenCalledWith(event.request, { ignoreSearch: true });
    expect(result).toBe(cachedResponse);
  });

  it('should fallback to / if network fails, cache misses, and mode is navigate', async () => {
    fetchMock.mockRejectedValue(new Error('Network failure'));

    // First match returns undefined (cache miss)
    // Second match returns home page fallback
    const homePageResponse = { data: 'home-page' };
    cachesMock.match.mockImplementation((req) => {
        if (req === '/') return Promise.resolve(homePageResponse);
        return Promise.resolve(undefined);
    });

    const event = {
      request: {
        method: 'GET',
        url: 'https://example.com/page',
        mode: 'navigate'
      },
      respondWith: jest.fn()
    };

    const respondPromise = new Promise(resolve => {
        event.respondWith = jest.fn(promise => resolve(promise));
    });

    fetchHandler(event);
    const result = await respondPromise;

    expect(fetchMock).toHaveBeenCalledWith(event.request);
    expect(cachesMock.match).toHaveBeenCalledWith(event.request, { ignoreSearch: true });
    expect(cachesMock.match).toHaveBeenCalledWith('/');
    expect(result).toBe(homePageResponse);
  });
});
