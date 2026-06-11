// Custom service worker extension — merged by next-pwa at build time
// Handles: background sync for task status updates + push notification clicks

import { BackgroundSyncPlugin } from "workbox-background-sync";
import { registerRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";

// ── Background sync: task status PATCH (when offline) ───────────────────────
const bgSyncPlugin = new BackgroundSyncPlugin("task-status-queue", {
  maxRetentionTime: 24 * 60, // retry up to 24 hours
});

registerRoute(
  ({ url, request }) =>
    url.pathname.match(/\/tasks\/\d+\/status$/) && request.method === "PATCH",
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  "PATCH"
);

// ── Push notification click handler ─────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data ?? {};
  const url = data.url ?? "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// ── Push message handler ─────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Construire", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Construire", {
      body: payload.body ?? "",
      icon: payload.icon ?? "/icons/icon-192x192.png",
      badge: payload.badge ?? "/icons/icon-192x192.png",
      data: payload.data ?? {},
      vibrate: [200, 100, 200],
      tag: `task-${payload.data?.taskId ?? "generic"}`,
      renotify: true,
    })
  );
});
