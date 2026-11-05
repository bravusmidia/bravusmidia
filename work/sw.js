// BRAVUS WORK — Service Worker (offline do app + notificações)
const CACHE = 'bw-v1.0.4';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // dados do Supabase nunca ficam em cache
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
// Push vindo do servidor (Supabase Edge Function send-push)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: 'Bravus Work', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Bravus Work', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.key, data: { route: d.route || 'painel' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const route = (e.notification.data && e.notification.data.route) || 'painel';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if ('focus' in w) { w.navigate ? w.navigate('./#' + route) : 0; return w.focus(); } }
    return self.clients.openWindow('./#' + route);
  }));
});
