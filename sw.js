// Luxy Inventory Service Worker
const CACHE_NAME = 'luxy-inventory-v1';
const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './styles.css',
    './manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate service worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategy: Cache static assets, network-first for APIs
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Strategy 1: Don't cache GET requests to external APIs (Google Apps Script)
    if (url.host.includes('script.google.com') ||
        url.host.includes('googleapis.com') ||
        url.host.includes('oauth2.googleapis.com')) {
        // Network only for APIs - always try to reach server
        event.respondWith(fetch(event.request));
        return;
    }

    // Strategy 2: Cache-first for static assets (index.html, app.js, styles.css)
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;  // Serve from cache if available
                    }
                    return fetch(event.request)
                        .then(response => {
                            // Cache the fetched response
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                            return response;
                        });
                })
                .catch(() => {
                    // Network failed, and not in cache
                    // For HTML pages, return empty offline message
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return new Response(
                            '<h1>Offline</h1><p>Cannot load page without internet.</p>',
                            { headers: { 'Content-Type': 'text/html' } }
                        );
                    }
                    throw new Error('Network request failed');
                })
        );
    }
});
