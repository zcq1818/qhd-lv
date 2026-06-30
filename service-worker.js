// Service Worker for 秦皇岛旅游官网 - PWA offline support
const CACHE_NAME = 'qhd-lv-v1';
const RUNTIME_CACHE = 'qhd-lv-runtime-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/attractions.html',
  '/map.html',
  '/itinerary.html',
  '/food.html',
  '/guide.html',
  '/about.html',
  '/style.css',
  '/css/chat-widget.css',
  '/js/chat-widget.js',
  '/data/attractions.json',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml'
];

const IMAGE_ASSETS = [
  '/images/beidaihe-beach.png',
  '/images/geziwo-sunrise.jpg',
  '/images/laohushi.png',
  '/images/biluota.png',
  '/images/shanhaiguan.png',
  '/images/laolongtou.jpg',
  '/images/aranya-library.jpg',
  '/images/qhd-panorama.jpg'
];

// 安装事件：缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return caches.open(RUNTIME_CACHE);
      })
      .then((cache) => {
        // 并行缓存图片（不关心失败）
        IMAGE_ASSETS.forEach((url) => {
          cache.add(url).catch(() => {
            console.log('[SW] Skipped caching image:', url);
          });
        });
        return Promise.resolve();
      })
      .then(() => self.skipWaiting()) // 立即激活
  );
});

// 激活事件：清理过期缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // 立即接管
  );
});

// Fetch 事件：离线优先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 或非本站请求
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // API 请求：网络优先 + 超时降级
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((resolve) => {
          setTimeout(() => resolve(null), 5000); // 5 秒超时
        })
      ])
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
            return response;
          }
          return caches.match(request).then((cached) => cached || createOfflineResponse());
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || createOfflineResponse());
        })
    );
    return;
  }

  // 图片请求：缓存优先 + 网络后备
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              if (response && response.ok) {
                const clone = response.clone();
                caches.open(RUNTIME_CACHE)
                  .then((cache) => cache.put(request, clone))
                  .catch(() => {});
                return response;
              }
              return createPlaceholderImage();
            })
            .catch(() => createPlaceholderImage());
        })
    );
    return;
  }

  // 其他资源：先缓存后网络
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE)
                .then((cache) => cache.put(request, clone))
                .catch(() => {});
              return response;
            }
            return caches.match('/index.html');
          })
          .catch(() => caches.match('/index.html'));
      })
  );
});

// 创建离线 API 响应
function createOfflineResponse() {
  return new Response(
    JSON.stringify({ error: true, message: '离线模式：AI 服务暂不可用' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

// 创建占位图
function createPlaceholderImage() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <rect fill="#f0f0f0" width="400" height="300"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-size="16">
      图片加载中（离线）
    </text>
  </svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}

// 处理消息（支持强制更新）
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
