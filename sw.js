/* =========================================================
   SALES PERFORMANCE HUB — FINAL SERVICE WORKER
   Developed by KAM AYON
   Build: FINAL-2026.09.15-4

   PURPOSE
   - Remove all old Sales Hub caches
   - Always prefer newest HTML / JS / CSS / config / data
   - Keep safe offline fallback
   - Prevent stale version on different phones
========================================================= */

'use strict';


/* =========================================================
   VERSION
========================================================= */

const SW_VERSION =
  'FINAL-2026.09.15-4';

const CACHE_NAME =
  'sph-final-' +
  SW_VERSION;


/* =========================================================
   OFFLINE SHELL
========================================================= */

const APP_SHELL = [
  './',

  './index.html',

  './styles.css?v=20260915-final-3',

  './config.js?v=20260915-final-3',

  './data.js?v=20260915-final-3',

  './app.js?v=20260915-final-3',

  './manifest.json?v=20260915-final',

  './icons/icon-192.png',

  './icons/icon-512.png',

  './icons/notification-96.png'
];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  'install',
  event => {

    event.waitUntil(
      (async () => {

        const cache =
          await caches.open(
            CACHE_NAME
          );


        /*
         * Do not use cache.addAll().
         *
         * If one optional file is missing,
         * addAll() would fail the entire
         * Service Worker installation.
         */

        await Promise.allSettled(
          APP_SHELL.map(
            async url => {

              try {

                const request =
                  new Request(
                    url,
                    {
                      cache:
                        'reload'
                    }
                  );


                const response =
                  await fetch(
                    request
                  );


                if (
                  response &&
                  response.ok
                ) {

                  await cache.put(
                    request,
                    response.clone()
                  );

                }

              } catch (error) {

                console.warn(
                  '[Sales Hub SW] Precache skipped:',
                  url,
                  error
                );

              }

            }
          )
        );


        /*
         * Activate this version immediately.
         */

        await self.skipWaiting();

      })()
    );

  }
);


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
  'activate',
  event => {

    event.waitUntil(
      (async () => {

        const keys =
          await caches.keys();


        /*
         * DELETE EVERY OLD SALES HUB CACHE.
         *
         * This is the key fix for:
         * Phone A = newest version
         * Phone B = old version
         */

        await Promise.all(
          keys.map(
            key => {

              if (
                key !==
                  CACHE_NAME &&
                (
                  key.startsWith(
                    'sph-'
                  ) ||

                  key.startsWith(
                    'sales-'
                  ) ||

                  key
                    .toLowerCase()
                    .includes(
                      'sales-performance'
                    )
                )
              ) {

                return caches.delete(
                  key
                );

              }

              return Promise.resolve(
                false
              );

            }
          )
        );


        /*
         * Immediately control existing
         * open tabs / installed PWA.
         */

        await self.clients.claim();


        /*
         * Inform currently open app pages
         * that the new Service Worker exists.
         */

        const clients =
          await self.clients.matchAll({
            type:
              'window',

            includeUncontrolled:
              true
          });


        clients.forEach(
          client => {

            client.postMessage({
              type:
                'SPH_VERSION_READY',

              version:
                SW_VERSION
            });

          }
        );

      })()
    );

  }
);


/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
  'fetch',
  event => {

    const request =
      event.request;


    /*
     * Never interfere with POST / write requests.
     */

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
     * IMPORTANT:
     *
     * Do NOT cache Google Apps Script,
     * OneSignal API,
     * CDN,
     * or other external services.
     *
     * Live database must always come
     * directly from the real backend.
     */

    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    /*
     * OneSignal has its own Service Worker
     * under /push/onesignal/.
     *
     * Do not interfere with it.
     */

    if (
      url.pathname.includes(
        '/push/onesignal/'
      )
    ) {

      return;

    }


    /*
     * PAGE NAVIGATION
     *
     * NETWORK FIRST.
     *
     * Always ask GitHub Pages for newest
     * index.html before using cache.
     */

    if (
      request.mode ===
        'navigate'
    ) {

      event.respondWith(
        navigationNetworkFirst_(
          request
        )
      );

      return;

    }


    /*
     * CODE / CONFIG FILES
     *
     * NETWORK FIRST + no-store.
     *
     * This prevents stale:
