// TáFeito mudou para tafeito.bravusmidia.com.br — este service worker apaga a versão antiga guardada no aparelho.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.map(c => caches.delete(c))))
    .then(() => self.registration.unregister())
    .then(() => self.clients.matchAll())
    .then(cs => cs.forEach(c => c.navigate(c.url)))
));
