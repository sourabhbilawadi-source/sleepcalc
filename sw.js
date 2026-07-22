const CACHE_NAME = 'goodsleep-v12';
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
  '/muscle-recovery-sleep-calculator',
  '/nap-calculator',
  '/new-parent-sleep-sync',
  '/polyphasic-sleep-planner',
  '/privacy',
  '/shift-work-sleep-calculator',
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
  '/sleep-stages',
  '/circadian-rhythm',
  '/sleep-disorders',
  '/cpap-guide',
  '/melatonin',
  '/sleep-positions',
  '/pregnancy-sleep',
  '/teen-sleep',
  '/menopause-sleep',
  '/alcohol-sleep',
  '/exercise-sleep',
  '/bedroom-environment',
  '/sleep-stages-by-age',
  '/blog/how-long-does-caffeine-last',
  '/blog/what-is-rem-sleep',
  '/blog/how-to-stop-snoring',
  '/blog/melatonin-dosage',
  '/blog/how-to-sleep-on-a-plane',
  '/blog/why-do-i-talk-in-my-sleep',
  '/blog/sleep-paralysis',
  '/blog/best-sleep-tracker',
  '/blog/foods-that-help-you-sleep',
  '/blog/sleep-position-back-pain',
  '/blog/how-to-sleep-with-lower-back-pain',
  '/blog/sleepytime-tea-vs-melatonin',
  '/blog/zzzquil-vs-melatonin',
  '/blog/polyphasic-vs-biphasic-sleep',
  '/blog/best-white-noise-machines',
  '/blog/best-sleep-masks',
  '/blog/best-magnesium-supplements',
  '/styles.css',
  '/share-card.js',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/goodsleep-bear-chronotype.png'
];

// Install Event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Instead of cache.addAll which fails completely if one file fails,
      // we add them individually and catch errors
      return Promise.allSettled(
        ASSETS.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err);
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

  // Network-First strategy
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      // If network request succeeds, cache the new version and return it
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          const cleanUrl = new URL(event.request.url);
          cleanUrl.search = '';
          cache.put(cleanUrl.pathname, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // If network fails (offline), fall back to the cache
      return caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback to home page if navigating and offline
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
