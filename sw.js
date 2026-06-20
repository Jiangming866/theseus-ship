// Service Worker - 忒修斯之船
// 策略：HTML 文件 network-first（始终拿最新），其他资源 stale-while-revalidate

const CACHE_NAME = 'theseus-ship-v3';

// 安装时只预缓存标题页最小集合（~30KB），其余按需缓存
const PRE_CACHE = [
  '',                                      // index.html
  'font/HuiWenMingChao-subset.woff2',
  'images/title/bg.webp',
  'images/title/btn.webp',
  'images/title/illust.webp',
  'images/title/panel_bg.webp',
  'images/title/panel_btn.webp',
  'images/title/slot_bg.webp',
  'images/title/slot_btn.webp',
  'images/title/title.webp',
  'images/gallery_bg.webp',
  'images/gallery_slot1.webp',
  'images/gallery_slot2.webp',
  'images/gallery_slot3.webp',
  'images/gallery_slot4.webp',
  'images/gallery_slot5.webp',
  'images/grain.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 预缓存标题页资源...');
      return cache.addAll(PRE_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ).then(() => self.clients.claim())
    )
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // 跨域请求（如 Google Fonts）直接放行，不缓存
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  const isHTML = event.request.headers.get('accept')?.includes('text/html') ||
                 url.pathname === '/' || url.pathname.endsWith('.html');

  if (isHTML) {
    // HTML 文件：network-first，确保始终拿到最新版本
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || new Response('离线', { status: 503 })))
    );
    return;
  }

  // 其他资源：stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        fetchAndCache(event.request);
        return cached;
      }
      return fetchAndCache(event.request);
    }).catch(() => fetch(event.request))
  );
});

function fetchAndCache(request) {
  return fetch(request).then(response => {
    if (!response || response.status !== 200) return response;
    // 只缓存同源、basic 类型响应
    if (response.type !== 'basic') return response;
    const responseToCache = response.clone();
    caches.open(CACHE_NAME).then(cache => {
      cache.put(request, responseToCache);
    });
    return response;
  }).catch(() => {
    // 网络失败：尝试返回缓存
    return caches.match(request);
  });
}
