const CACHE_NAME = 'goodsleep-v9';
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
  '/blog/melatonin-dosage-for-adults',
  '/blog/how-to-sleep-on-a-plane',
  '/blog/why-do-i-talk-in-my-sleep',
  '/blog/sleep-paralysis-causes',
  '/blog/best-sleep-tracker',
  '/blog/foods-that-help-you-sleep',
  '/blog/best-sleep-position-for-back-pain',
  '/blog/how-to-sleep-with-lower-back-pain',
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
