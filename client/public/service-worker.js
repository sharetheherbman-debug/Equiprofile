// Service Worker with proper caching strategy and offline data sync
// Version based on package.json version
// NOTE: Update CACHE_VERSION when deploying new versions to force cache refresh
// Version automatically synced from package.json via scripts/update-sw-version.js
// Runs as part of the build process (npm run build:sw)
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `equiprofile-v${CACHE_VERSION}`;
const DATA_CACHE_NAME = `equiprofile-data-v${CACHE_VERSION}`;
const SYNC_QUEUE_KEY = "equiprofile-sync-queue";

// API endpoints that should be cached for offline reading
const CACHEABLE_API_PATHS = [
  "/api/trpc/horses.list",
  "/api/trpc/feeding.listAll",
  "/api/trpc/health.list",
  "/api/trpc/training.list",
  "/api/trpc/weather.getCurrent",
  "/api/trpc/nutritionLogs.list",
  "/api/trpc/calendar.list",
  "/api/trpc/settings.get",
  // Lesson content — cached for offline reading
  "/api/trpc/student.listLessonPathways",
  "/api/trpc/student.listLessons",
  "/api/trpc/student.getLesson",
  "/api/trpc/student.getLessonProgress",
  "/api/trpc/student.getDailyScenarios",
  "/api/trpc/student.getAssignedLessons",
];

// Assets that should be cached (hashed assets only)
const STATIC_CACHE_URLS = [
  // Hashed assets will be cached on-demand with cache-first strategy
];

function fallbackHtmlResponse() {
  return new Response(
    '<!doctype html><html><head><meta charset="utf-8"><title>EquiProfile offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main style="font-family:system-ui,sans-serif;padding:2rem;max-width:36rem;margin:auto"><h1>EquiProfile is offline</h1><p>This page is not available from cache yet. Reconnect and try again.</p></main></body></html>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function fallbackPlainResponse(message) {
  return new Response(message, {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// Install service worker and prepare cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Take control immediately
        return self.skipWaiting();
      }),
  );
});

// Activate and clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      }),
  );
});

/**
 * Check if a request URL matches cacheable API paths
 */
function isCacheableAPI(pathname) {
  return CACHEABLE_API_PATHS.some((path) => pathname.startsWith(path));
}

// Fetch strategy: network-first for HTML and API, cache-first for hashed assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests — queue mutations for offline sync
  if (request.method !== "GET") {
    if (url.pathname.startsWith("/api/") && request.method === "POST") {
      event.respondWith(
        fetch(request.clone()).catch(async () => {
          // Queue failed mutation for later sync
          try {
            const body = await request.clone().text();
            await queueOfflineMutation(url.pathname, body);
          } catch (e) {
            console.warn("[SW] Failed to queue offline mutation:", e);
          }
          return new Response(
            JSON.stringify({ offline: true, queued: true }),
            {
              status: 202,
              headers: { "Content-Type": "application/json" },
            },
          );
        }),
      );
      return;
    }
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Cacheable API requests: network-first with data cache fallback
  if (url.pathname.startsWith("/api/") && isCacheableAPI(url.pathname)) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              try { cache.put(request, response.clone()); } catch (e) { /* ignore cache write errors */ }
            }
            return response;
          })
          .catch(() => {
            // Serve cached data when offline
            return cache.match(request).then((cached) => {
              if (cached) {
                return cached;
              }
              return new Response(
                JSON.stringify({ error: "Offline", offline: true }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" },
                },
              );
            });
          });
      }),
    );
    return;
  }

  // Non-cacheable API requests: always network
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Offline", offline: true }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    return;
  }

  // index.html and service-worker.js: always network-first, cache HTML for offline SPA navigation
  if (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname.includes("service-worker")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the HTML shell for offline SPA navigation
          if (response && response.status === 200 && !url.pathname.includes("service-worker")) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try { cache.put("/index.html", cloned); } catch (e) { /* ignore cache write errors */ }
            });
          }
          return response;
        })
        .catch(() => {
          // If offline and we have a cached version, use it
          return caches.match("/index.html").then((cached) => cached || fallbackHtmlResponse());
        }),
    );
    return;
  }

  // SPA navigation routes — serve cached index.html for offline access
  // This allows client-side routing to work offline for any visited pages
  if (
    request.mode === "navigate" &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/assets/") &&
    !url.pathname.includes(".")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match("/index.html").then((cached) => cached || fallbackHtmlResponse());
        }),
    );
    return;
  }

  // Hashed assets (/assets/*): cache-first with immutable strategy
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request).then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              try { cache.put(request, networkResponse.clone()); } catch (e) { /* ignore cache write errors */ }
            }
            return networkResponse;
          }).catch(() => fallbackPlainResponse("Asset unavailable offline"));
        });
      }),
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        // Try to serve from cache if offline
        return caches.match(request).then((cached) => cached || fallbackPlainResponse("Resource unavailable offline"));
      }),
  );
});

/**
 * Offline sync queue — stores failed mutations for retry when back online
 */
async function queueOfflineMutation(pathname, body) {
  try {
    const db = await openSyncDB();
    const tx = db.transaction("syncQueue", "readwrite");
    tx.objectStore("syncQueue").add({
      pathname,
      body,
      timestamp: Date.now(),
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    // Notify clients about queued item
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "OFFLINE_MUTATION_QUEUED", pathname });
    });
  } catch (e) {
    console.warn("[SW] Failed to queue mutation:", e);
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("EquiProfileSync", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Background sync — replay queued mutations when online
 */
self.addEventListener("sync", (event) => {
  if (event.tag === "equiprofile-sync") {
    event.waitUntil(replayOfflineMutations());
  }
});

async function replayOfflineMutations() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction("syncQueue", "readonly");
    const store = tx.objectStore("syncQueue");
    const allItems = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });

    for (const item of allItems) {
      try {
        const response = await fetch(item.pathname, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: item.body,
          credentials: "include",
        });

        if (response.ok) {
          // Remove from queue
          const deleteTx = db.transaction("syncQueue", "readwrite");
          deleteTx.objectStore("syncQueue").delete(item.id);
          await new Promise((resolve) => {
            deleteTx.oncomplete = resolve;
          });
        }
      } catch (e) {
        console.warn("[SW] Failed to replay mutation:", item.pathname, e);
      }
    }

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "OFFLINE_SYNC_COMPLETE" });
    });
  } catch (e) {
    console.warn("[SW] Background sync error:", e);
  }
}

// Handle push notifications
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("EquiProfile", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
