self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Lyvora",
      body: event.data ? event.data.text() : "Yeni bildirimin var.",
    };
  }

  const title = data.title || "Lyvora";
  const options = {
    body: data.body || "Yeni bildirimin var.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: data.url || "/",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});