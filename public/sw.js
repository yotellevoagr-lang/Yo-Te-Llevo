const CACHE_VERSION = 'ytl-pwa-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = [
  '/',
  '/tours',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PAGES_CACHE).then(async (cache) => {
      for (const url of PRECACHE_URLS) {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (response && response.ok) {
            await cache.put(url, response);
          }
        } catch {
          // Ignore individual precache failures
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key !== STATIC_CACHE &&
              key !== PAGES_CACHE &&
              key !== IMAGES_CACHE
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function fetchWithTimeout(request, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SW_TIMEOUT')), timeoutMs);
    fetch(request)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getNormalizedPageKey(urlObj) {
  return urlObj.origin + urlObj.pathname;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept AI chatbot API, Firebase Auth, Firestore RPCs, or Chrome extensions
  if (
    !url.protocol.startsWith('http') ||
    url.pathname.startsWith('/api/chat') ||
    url.pathname.startsWith('/api/auth') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('dolarapi.com')
  ) {
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;

  // 1. Next.js static chunks, CSS, JS, fonts, icons -> Cache First with network fallback
  if (
    isSameOrigin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/favicon.ico' ||
      /\.(?:js|css|woff2?|ttf|otf|eot)$/i.test(url.pathname))
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // Refresh in background
          fetch(request)
            .then((res) => {
              if (res && res.ok) cache.put(request, res.clone());
            })
            .catch(() => {});
          return cached;
        }
        try {
          const netRes = await fetch(request);
          if (netRes && netRes.ok) {
            await cache.put(request, netRes.clone());
          }
          return netRes;
        } catch {
          return new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  // Do not intercept Firebase Storage SDK metadata/API calls or video streams
  if (
    (url.hostname.includes('firebasestorage.googleapis.com') ||
      url.hostname.includes('firebasestorage.app')) &&
    request.destination !== 'image'
  ) {
    return;
  }

  // 2. Images (local, /_next/image, Firebase Storage images, etc.) -> Stale-While-Revalidate
  const isImageRequest =
    request.destination === 'image' ||
    (isSameOrigin && url.pathname.startsWith('/_next/image')) ||
    (isSameOrigin && /\.(?:png|jpg|jpeg|webp|gif|svg|avif)$/i.test(url.pathname));

  if (isImageRequest) {
    event.respondWith(
      caches.open(IMAGES_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((netRes) => {
            if (netRes && (netRes.ok || netRes.type === 'opaque')) {
              cache.put(request, netRes.clone());
            }
            return netRes;
          })
          .catch(() => null);

        if (cached) {
          return cached;
        }
        const netRes = await networkPromise;
        if (netRes) return netRes;
        return new Response('', { status: 404 });
      })
    );
    return;
  }

  // 3. Next.js RSC payloads (client-side Link navigation / prefetch)
  const isRscRequest =
    isSameOrigin &&
    (url.searchParams.has('_rsc') ||
      request.headers.get('RSC') === '1' ||
      request.headers.get('Next-Router-Prefetch') === '1');

  if (isRscRequest) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(async (cache) => {
        const rscKey = `${getNormalizedPageKey(url)}?_rsc_cached=1`;
        try {
          const netRes = await fetchWithTimeout(request, 3000);
          if (netRes && netRes.ok) {
            await cache.put(request, netRes.clone());
            await cache.put(rscKey, netRes.clone());
          }
          return netRes;
        } catch {
          const exactMatch = await cache.match(request);
          if (exactMatch) return exactMatch;
          const normalizedMatch = await cache.match(rscKey);
          if (normalizedMatch) return normalizedMatch;
          // Return error so Next.js router falls back to hard navigation (which hits the HTML document cache below)
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // 4. HTML Document Navigations (visited routes)
  if (request.mode === 'navigate' || (isSameOrigin && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(async (cache) => {
        const normalizedKey = getNormalizedPageKey(url);
        try {
          const netRes = await fetchWithTimeout(request, 3500);
          if (netRes && netRes.ok) {
            await cache.put(request, netRes.clone());
            await cache.put(normalizedKey, netRes.clone());
          }
          return netRes;
        } catch {
          // Serve cached visited route if available
          const cachedExact = await cache.match(request);
          if (cachedExact) return cachedExact;

          const cachedNormalized = await cache.match(normalizedKey);
          if (cachedNormalized) return cachedNormalized;

          // Never-visited route while offline -> serve /offline fallback page
          const offlineFallback = await cache.match('/offline');
          if (offlineFallback) return offlineFallback;

          return new Response(
            '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión - Yo Te Llevo</title></head><body style="font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center;background:#fafafa;color:#111"><h1>Sin conexión a internet</h1><p>Esta sección aún no fue visitada con conexión a internet.</p><a href="/" style="margin-top:16px;padding:10px 20px;background:#E95289;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Volver al Inicio</a></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        }
      })
    );
  }
});
