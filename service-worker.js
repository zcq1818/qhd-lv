// Service Worker for 秦皇岛旅游官网 - PWA offline support
// 策略：HTML 网络优先，静态资源 stale-while-revalidate
const CACHE_NAME = 'qhd-lv-v3';
const RUNTIME_CACHE = 'qhd-lv-runtime-v3';

// 需要预缓存的关键页面
const STATIC_ASSETS = [
  '/',
  '/attractions',
  '/map',
  '/itinerary',
  '/food',
  '/guide',
  '/blog',
  '/about',
  '/style.css',
  '/manifest.json',
  '/robots.txt'
];

// 安装：预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 预缓存关键资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => {
        return Promise.all(
          names.map((name) => {
            if (name !== CACHE_NAME && name !== RUNTIME_CACHE) {
              console.log('[SW] 删除旧缓存:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch 事件
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET / 跨域
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // 跳过 API 请求（不缓存）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => createOfflineResponse()));
    return;
  }

  // HTML 页面：网络优先（确保内容最新）
  if (request.headers.get('accept')?.includes('text/html') ||
      url.pathname === '/' ||
      !url.pathname.includes('.')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 图片：缓存优先 + 后台更新（stale-while-revalidate）
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // CSS/JS：stale-while-revalidate（立即返回缓存，后台更新）
  if (/\.(css|js)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 其他：网络优先
  event.respondWith(networkFirst(request));
});

// ===== 策略实现 =====

// 网络优先：先请求网络，失败时用缓存
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || caches.match('/');
  }
}

// Stale-while-revalidate：立即返回缓存，后台更新
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  // 后台更新（不阻塞响应）
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  // 立即返回缓存（如果有），否则等网络
  return cached || fetchPromise;
}

// 离线响应
function createOfflineResponse() {
  return new Response(
    JSON.stringify({ error: true, message: '离线模式：服务暂不可用' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

// 支持强制更新
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
