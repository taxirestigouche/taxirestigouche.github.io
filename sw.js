/* Taxi Restigouche — appli (service worker).
   Toujours la version la plus récente quand il y a Internet ; les pages déjà ouvertes restent disponibles sans réseau.
   Supabase, cartes et adresses ne passent jamais par le cache. */
var VERSION = 'taxi-v2';
var DE_BASE = ['./', 'index.html', 'client.html', 'chauffeur.html', 'centrale.html', 'hors-ligne.html', 'commun.css', 'commun.js', 'client.js', 'chauffeur.js', 'centrale.js', 'icones/icone-192.png', 'icones/icone-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(DE_BASE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (l) { return Promise.all(l.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function cachable(url) {
  if (url.origin === self.location.origin) return true;
  return /^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (!cachable(url)) return;
  e.respondWith(fetch(req).then(function (rep) {
    if (rep && (rep.ok || rep.type === 'opaque')) { var c = rep.clone(); caches.open(VERSION).then(function (k) { k.put(req, c); }); }
    return rep;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (r) { return r || (req.mode === 'navigate' ? caches.match('hors-ligne.html') : Response.error()); });
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (l) { if (l.length) return l[0].focus(); return self.clients.openWindow('./'); }));
});
