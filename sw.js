'use strict';
const VERSION = '20261012-copy-row-1806';
const BASE = new URL('./', self.registration.scope);
const PREFIX = 'measurement-drawing-' + encodeURIComponent(BASE.href) + '-';
const CACHE = PREFIX + VERSION;
const INDEX = new URL('index.html', BASE).href;
const ASSETS = ['index.html', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const ALLOWED = new Set(ASSETS.map(name => new URL(name, BASE).pathname));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      for (const name of ASSETS) {
        const url = new URL(name, BASE).href;
        const response = await fetch(new Request(url, {cache:'reload'}));
        if (!response.ok) throw new Error('Required asset unavailable: ' + name);
        await cache.put(url, response);
      }
      await self.skipWaiting();
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin) return;
  const isIndex = url.pathname === new URL(INDEX).pathname || url.pathname === BASE.pathname;
  if (![...url.searchParams.keys()].every(key => key === 'v')) return;
  if (!isIndex && !ALLOWED.has(url.pathname)) return;
  const canonical = isIndex ? INDEX : new URL(url.pathname, BASE.origin).href;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(new Request(request, {cache:'no-store'}));
      if (response.ok) {
        try { await cache.put(canonical, response.clone()); } catch (_) {}
      }
      return response;
    } catch (error) {
      const cached = await cache.match(canonical);
      if (cached) return cached;
      throw error;
    }
  })());
});
