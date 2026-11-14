'use strict';

const cacheName = 'orbit-health-shell-v2';
const shell = ['./index.html', './styles.css', './model.js', './rad-data.js', './app.js'];
const assetUrls = new Set(shell.map((path) => new URL(path, self.registration.scope).href));
const entryUrl = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) =>
    cache.addAll(shell.map((path) => new Request(path, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('orbit-health-shell-') && key !== cacheName)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && (url.pathname === new URL(self.registration.scope).pathname ||
      url.pathname === new URL(entryUrl).pathname)) {
    event.respondWith(fetch(request).catch(() => caches.open(cacheName).then((cache) => cache.match(entryUrl))));
  } else if (assetUrls.has(request.url)) {
    event.respondWith(fetch(request).catch(() => caches.open(cacheName).then((cache) => cache.match(request))));
  }
});
