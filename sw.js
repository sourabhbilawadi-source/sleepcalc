const CACHE_NAME = 'goodsleep-v4';
const ASSETS = [
  '/',
  '/about',
  '/ashwagandha-calculator',
  '/bedtime-calculator',
  '/caffeine-calculator',
  '/chronotype',
  '/contact',
  '/dashboard',
  '/explore',
  '/how-much-sleep',
  '/how-to-fall-asleep-fast',
  '/insomnia',
  '/jet-lag-planner',
  '/kids-sleep-calculator',
  '/magnesium-glycinate',
  '/magnesium-type-quiz',
  '/melatonin-calculator',
  '/mouth-taping-guide',
  '/nap-calculator',
  '/polyphasic-sleep-planner',
  '/privacy',
  '/sleep-apnea-quiz',
  '/sleep-audit',
  '/sleep-by-age',
  '/sleep-calculator',
  '/sleep-debt-calculator',
  '/sleep-deprivation',
  '/sleep-divorce-quiz',
  '/sleep-hygiene',
  '/sleep-schedule',
  '/sleepy-girl-mocktail',
  '/steroid-sleep-calculator',
  '/weighted-blanket-calculator',
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
      // Precache each asset individually so that a single failure doesn't halt the installation
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`Failed to precache asset during install: ${url}`, err);
          });
        })
      );
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
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch a fresh version in the background (stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              const cleanUrl = new URL(event.request.url);
              cleanUrl.search = '';
              cache.put(cleanUrl.pathname, networkResponse.clone());
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
            const cleanUrl = new URL(event.request.url);
            cleanUrl.search = '';
            cache.put(cleanUrl.pathname, responseToCache);
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
