// Commonhall's service worker: alerts (Web Push) and an offline page. Plain JavaScript, served as /sw.js.
// The app registers it from the alerts button and the install card (src/components/alerts/).

const OFFLINE_CACHE = "commonhall-offline-v1";
const OFFLINE_URL = "/offline.html";
const ICON_URL = "/api/notifications/icon?size=192";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith("commonhall-offline-") && name !== OFFLINE_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// Pages only: when the network is gone, the offline page answers. Everything else goes straight to the network.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

function readAlert(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return { body: event.data ? event.data.text() : "" };
  }
}

self.addEventListener("push", (event) => {
  const alert = readAlert(event);
  const url = typeof alert.url === "string" && alert.url.startsWith("/") ? alert.url : "/";
  event.waitUntil(
    self.registration.showNotification(alert.title || "New activity", {
      body: alert.body || "",
      icon: ICON_URL,
      badge: ICON_URL,
      tag: alert.kind ? `${alert.kind}:${url}` : undefined,
      data: { url },
    }),
  );
});

// Tapping an alert opens its page: in an open window of the app when there is one, else a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) return open.navigate(target).then((client) => (client || open).focus());
      return self.clients.openWindow(target);
    }),
  );
});

// The browser replaced the subscription (keys rotated): register the new one, signed in as whoever was.
self.addEventListener("pushsubscriptionchange", (event) => {
  const options = event.oldSubscription ? event.oldSubscription.options : null;
  if (!options) return;
  event.waitUntil(
    self.registration.pushManager.subscribe(options).then((subscription) =>
      fetch("/api/notifications/devices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "webpush", subscription: subscription.toJSON() }),
      }),
    ),
  );
});
