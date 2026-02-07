// Luxy Inventory Service Worker
const CACHE_NAME = 'luxy-inventory-v2';
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
                            `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Luxy Inventory - Offline</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
  .offline-card { text-align: center; background: white; padding: 3rem 2rem; border-radius: 16px; box-shadow: 0 10px 15px rgba(0,0,0,0.1); max-width: 400px; width: 100%; }
  .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #0f172a; }
  p { color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
  button { background: #3b82f6; color: white; border: none; padding: 0.875rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
  button:active { background: #2563eb; }
</style>
</head>
<body>
<div class="offline-card">
  <div class="offline-icon">📡</div>
  <h1>You're Offline</h1>
  <p>Connect to the internet to load Luxy Inventory. Once loaded, the app works offline for checkouts.</p>
  <button onclick="location.reload()">Try Again</button>
</div>
</body>
</html>`,
                            { headers: { 'Content-Type': 'text/html' } }
                        );
                    }
                    throw new Error('Network request failed');
                })
        );
    }
});
