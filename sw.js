const CACHE_NAME = 'goodsleep-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/ashwagandha-calculator.html',
  '/bedtime-calculator.html',
  '/caffeine-calculator.html',
  '/chronotype.html',
  '/contact.html',
  '/dashboard.html',
  '/explore.html',
  '/how-much-sleep.html',
  '/how-to-fall-asleep-fast.html',
  '/insomnia.html',
  '/jet-lag-planner.html',
  '/kids-sleep-calculator.html',
  '/magnesium-glycinate.html',
  '/magnesium-type-quiz.html',
  '/melatonin-calculator.html',
  '/mouth-taping-guide.html',
  '/nap-calculator.html',
  '/polyphasic-sleep-planner.html',
  '/privacy.html',
  '/sleep-apnea-quiz.html',
  '/sleep-audit.html',
  '/sleep-by-age.html',
  '/sleep-calculator.html',
  '/sleep-debt-calculator.html',
  '/sleep-deprivation.html',
  '/sleep-divorce-quiz.html',
  '/sleep-hygiene.html',
  '/sleep-schedule.html',
  '/sleepy-girl-mocktail.html',
  '/steroid-sleep-calculator.html',
  '/weighted-blanket-calculator.html',
  '/styles.css',
  '/share-card.js',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/goodsleep-bear-chronotype.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only intercept same-origin GET requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  let cacheKey = url.pathname;

  // Clean URL logic: Map directories/root to index.html and extension-less paths to .html
  if (cacheKey === '/') {
    cacheKey = '/index.html';
  } else if (!cacheKey.includes('.')) {
    cacheKey += '.html';
  }

  const absoluteCacheUrl = new URL(cacheKey, self.location.origin).toString();

  event.respondWith(
    caches.match(absoluteCacheUrl).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch a fresh version in the background (stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(absoluteCacheUrl, networkResponse.clone());
            });
          }
        }).catch(err => {
          console.warn('Background sync failed:', err);
        });
        
        return cachedResponse;
      }

      // Fallback to network
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(absoluteCacheUrl, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(err => {
      // Critical fallback: if caches.match or network fetch fails inside our code,
      // return a direct fetch to the network to avoid breaking the page display.
      console.error('Service Worker fallback to network:', err);
      return fetch(event.request);
    })
  );
});
