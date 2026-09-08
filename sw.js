'use strict';

// Bump the version whenever an offline shell file changes.
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `happy-coding:${SCOPE.href}:`;
const CACHE = `${CACHE_PREFIX}v3`;
const CORE = [
  './', './index.html', './styles.css', './original-overrides.css',
  './accessibility-pwa.css', './app.js', './ai-local.js',
  './manifest.webmanifest', './icon.svg',
  './restored-theme.css', './community.css', './community.js'
].map(path => new URL(path, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Only this public, explicit shell is cached; never account/API responses.
    await cache.addAll(CORE.map(url => new Request(url, {cache: 'reload', credentials: 'omit'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    // Keep legacy/unrelated caches: they do not have a reliable scope marker.
    await self.clients.claim();
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
    try {
      // Network-first keeps the live site fresh. Never cache runtime responses.
      return await fetch(request);
    } catch {
      const cache = await caches.open(CACHE);
      const fallback = navigation ? new URL('index.html', SCOPE).href : request;
      const cached = await cache.match(fallback);
      // HTML is a fallback for pages only, never for JavaScript/CSS/images.
      return cached || Response.error();
    }
  })());
});
