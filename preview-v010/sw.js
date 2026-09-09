'use strict';

// Bump the version whenever an offline shell file changes.
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `happy-coding:${SCOPE.href}:`;
const CACHE = `${CACHE_PREFIX}v15`;
const CORE = [
  './', './index.html', './styles.css', './original-overrides.css',
  './accessibility-pwa.css', './sync-hook.js', './app.js',
  './search-v010.js', './cloud-ai.js', './v010-cleanup.js', './community-v010.js', './v010.css',
  './account-sync.js', './account-entry.js', './public-feed.js', './browser-controls.js',
  './manifest.webmanifest', './icon.svg', './restored-theme.css',
  './community.css', './community.js', './safety-ui.js',
  './privacy.html', './community-guidelines.html'
].map(path => new URL(path, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE.map(url => new Request(url, {cache: 'reload', credentials: 'omit'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin ||
      !url.pathname.startsWith(SCOPE.pathname)) return;
  const navigation = request.mode === 'navigate';
  if (!navigation && !CORE.includes(url.href)) return;
  event.respondWith((async () => {
    try { return await fetch(request); }
    catch {
      const cache = await caches.open(CACHE);
      const fallback = navigation ? new URL('index.html', SCOPE).href : request;
      return await cache.match(fallback) || Response.error();
    }
  })());
});