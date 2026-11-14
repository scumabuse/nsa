'use strict';

const cacheName = 'orbit-health-shell-v71';
const shell = ['./index.html', './styles.css', './model.js', './rad-data.js', './app.js', './bodymap.js', './bodymap.css', './checkin.js', './space-models.js'];
shell.push('./mission-history.js');
shell.push('./anatomy-3d.js', './vendor/three.module.min.js', './vendor/three.core.min.js', './vendor/SVGLoader.js');
shell.push('./vendor/GLTFLoader.js', './vendor/DRACOLoader.js', './vendor/utils/BufferGeometryUtils.js',
  './vendor/utils/SkeletonUtils.js', './vendor/draco/gltf/draco_decoder.wasm', './vendor/draco/gltf/draco_wasm_wrapper.js',
  './anatomy/anatomy-skin.glb', './anatomy/anatomy-organs.glb', './anatomy/overview-skeleton.glb');
shell.push('./planet-maps/moon-relief.webp', './planet-maps/mars-relief.webp', './pavlodar-crest.png', './language.js', './nasa-logo.svg', './assistant.js');
for (const name of ['earth_daymap', 'earth_clouds', 'saturn', 'moon', 'mars']) {
  shell.push('./planet-maps/' + name + '.jpg');
}
const assetUrls = new Set(shell.map((path) => new URL(path, self.registration.scope).href));
const entryUrl = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) =>
    cache.addAll(shell.map((path) => new Request(path, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
