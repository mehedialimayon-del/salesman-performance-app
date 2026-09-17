'use strict';

/* =========================================================
   SALES PERFORMANCE HUB — SERVICE WORKER
   Build: sph-20260918-final-6
   Developed by KAM AYON
========================================================= */

const CACHE_VERSION = 'sph-20260918-final-6';
const RUNTIME_CACHE = 'sph-runtime-20260918-final-6';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=20260918-final-6',
  './config.js?v=20260918-final-6',
  './data.js?v=20260918-final-6',
  './app.js?v=20260918-final-6',
  './ayon-ai.js?v=20260918-final-6',
  './manifest.json?v=20260918-final-6',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/notification-96.png',
  './icons/ayon-avatar.jpg'
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isOneSignalPath(url) {
  return url.pathname.includes('/push/onesignal/');
}

function isAppAsset(url) {
  return /\.(?:js|css|json|html)$/i.test(url.pathname);
}

function isImage(url) {
  return /\.(?:png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname);
}

async function putIfOk(cache, request, response) {
  if (response && response.ok) {
    try {
      await cache.put(request, response.clone());
    } catch (_) {}
  }

  return response;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);

    await Promise.allSettled(
      APP_SHELL.map(async asset => {
        try {
          const request = new Request(asset, {
            cache: 'reload'
          });

          const response = await fetch(request);

          if (response.ok) {
            await cache.put(
              asset,
              response.clone()
            );
          }

        } catch (_) {
          // Missing optional asset must not block install.
        }
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(
          key =>
            key.startsWith('sph-') &&
            key !== CACHE_VERSION &&
            key !== RUNTIME_CACHE
        )
        .map(
          key =>
            caches.delete(key)
        )
    );

    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {

  if (
    event.data?.type ===
    'SKIP_WAITING'
  ) {
    self.skipWaiting();
  }

  if (
    event.data?.type ===
    'CLEAR_SPH_CACHE'
  ) {

    event.waitUntil((async () => {

      const keys =
        await caches.keys();

      await Promise.all(
        keys
          .filter(
            key =>
              key.startsWith('sph-')
          )
          .map(
            key =>
              caches.delete(key)
          )
      );

    })());
  }

});

self.addEventListener('fetch', event => {

  const request =
    event.request;

  if (
    request.method !==
    'GET'
  ) {
    return;
  }

  const url =
    new URL(
      request.url
    );

  /*
    Never touch external API requests
    or OneSignal worker traffic.
  */
  if (
    !isSameOrigin(url) ||
    isOneSignalPath(url)
  ) {
    return;
  }

  /*
    Page navigation:
    always try newest GitHub version first.
  */
  if (
    request.mode ===
    'navigate'
  ) {

    event.respondWith((async () => {

      const cache =
        await caches.open(
          CACHE_VERSION
        );

      try {

        const fresh =
          await fetch(
            new Request(
              request,
              {
                cache:
                  'no-store'
              }
            )
          );

        await putIfOk(
          cache,
          './index.html',
          fresh
        );

        return fresh;

      } catch (_) {

        return (
          await cache.match(
            './index.html',
            {
              ignoreSearch:
                true
            }
          ) ||

          await cache.match(
            './',
            {
              ignoreSearch:
                true
            }
          ) ||

          new Response(
            `<!doctype html>
            <html>
              <body
                style="
                  background:#080b0f;
                  color:white;
                  font-family:sans-serif;
                  padding:24px
                "
              >
                <h2>
                  Sales Performance Hub
                </h2>

                <p>
                  You are offline.
                  Please reconnect and reopen the app.
                </p>
              </body>
            </html>`,
            {
              headers: {
                'Content-Type':
                  'text/html; charset=utf-8'
              }
            }
          )
        );

      }

    })());

    return;
  }

  /*
    JS / CSS / JSON / HTML:
    Network-first prevents old phone cache
    from keeping an outdated build.
  */
  if (
    isAppAsset(url)
  ) {

    event.respondWith((async () => {

      const cache =
        await caches.open(
          CACHE_VERSION
        );

      try {

        const fresh =
          await fetch(
            new Request(
              request,
              {
                cache:
                  'no-store'
              }
            )
          );

        await putIfOk(
          cache,
          request,
          fresh
        );

        return fresh;

      } catch (_) {

        return (
          await cache.match(
            request,
            {
              ignoreSearch:
                true
            }
          ) ||
          Response.error()
        );

      }

    })());

    return;
  }

  /*
    Avatar/icons/images:
    cached for instant UI,
    updated silently in background.
  */
  if (
    isImage(url)
  ) {

    event.respondWith((async () => {

      const cache =
        await caches.open(
          RUNTIME_CACHE
        );

      const cached =
        await cache.match(
          request,
          {
            ignoreSearch:
              true
          }
        );

      const refresh =
        fetch(request)
          .then(
            response =>
              putIfOk(
                cache,
                request,
                response
              )
          )
          .catch(
            () => null
          );

      if (cached) {

        event.waitUntil(
          refresh
        );

        return cached;
      }

      const network =
        await refresh;

      return (
        network ||
        Response.error()
      );

    })());

  }

});
