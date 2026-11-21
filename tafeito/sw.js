// TáFeito — service worker (funciona offline e mostra notificações)
const CACHE = 'tafeito-v29';
const ARQUIVOS = ['./', './index.html', './styles.css', './app.js', './config.js', './manifest.webmanifest',
  './lib/supabase.js', './icons/icon-192.png', './icons/icon-512.png', './icons/3d/lista.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// rede primeiro (sempre a versão mais nova); sem internet, usa o cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const mesmoSite = url.origin === location.origin;
  const cdn = url.hostname === 'cdn.jsdelivr.net';
  if (!mesmoSite && !cdn) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});

// push do servidor: chega mesmo com o app fechado
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: 'TáFeito', corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'TáFeito', {
    body: d.corpo || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    tag: (d.tag || 'tafeito') + '-' + Date.now(), vibrate: [200, 100, 200], data: { url: './' }
  }));
});

// se o navegador trocar/cancelar a inscrição de avisos, recadastra sozinho (o app avisa o servidor ao abrir)
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    try {
      const chave = e.oldSubscription && e.oldSubscription.options && e.oldSubscription.options.applicationServerKey;
      if (chave) await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });
    } catch (err) { }
    const cs = await self.clients.matchAll({ includeUncontrolled: true });
    cs.forEach(c => c.postMessage({ tipo: 'push-mudou' }));
  })());
});
