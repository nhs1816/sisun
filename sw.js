// 시선들 서비스 워커: 새 호를 놓치지 않도록 네트워크 우선, 오프라인이면 저장해 둔 사본으로 열어요.
const CACHE = "sisun-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./editions/index.js", "./editions/glossary.js",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 글꼴(Google Fonts): 한번 받으면 저장본 사용
  if (url.origin !== location.origin) {
    if (!/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // 앱 파일과 호 데이터: 네트워크 우선, 실패하면 저장본
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))));
});
