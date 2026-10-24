// idmanSK service worker (13.6, F7): uygulama dosyaları önbellekte, internet yokken de açılır.
// Yalnızca bu sitenin dosyaları önbelleğe alınır; Apps Script (tablo) istekleri ve YouTube hiç dokunulmadan ağa gider.
const SURUM = '13.11.0';
const AD = 'idmansk-';
const ONBELLEK = AD + SURUM;
const MODULLER = ['app.js', 'data.js', 'wheel.js', 'zaman.js', 'ref.js', 'duzen.js', 'salon.js', 'grup.js', 'kisit.js', 'yuk.js', 'harita.js',
  'bilgi.js', 'analiz.js', 'video.js', 'hazir.js', 'videolar.js', 'model.js', 'gosterge.js', 'adimlar.js', 'hareketdb.js'];
const CEKIRDEK = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  `style.css?v=${SURUM}`, `fonts/fonts.css?v=${SURUM}`, ...MODULLER.map((m) => `${m}?v=${SURUM}`),
  'fonts/archivo-var-latin-ext.woff2', 'fonts/archivo-var-latin.woff2', 'fonts/barlow-condensed-600-latin-ext.woff2', 'fonts/barlow-condensed-600-latin.woff2', 'fonts/barlow-condensed-700-latin-ext.woff2', 'fonts/barlow-condensed-700-latin.woff2', 'fonts/barlow-condensed-800-latin-ext.woff2', 'fonts/barlow-condensed-800-latin.woff2',
  'img/kas/back.webp', 'img/kas/back_bacak.png', 'img/kas/back_gri.webp', 'img/kas/back_hit.png', 'img/kas/back_kalca.png', 'img/kas/back_kalcayani.png', 'img/kas/back_omuz.png', 'img/kas/back_onkol.png', 'img/kas/back_sirt.png', 'img/kas/back_triseps.png', 'img/kas/front.webp', 'img/kas/front_bacak.png', 'img/kas/front_biseps.png', 'img/kas/front_gogus.png', 'img/kas/front_gri.webp', 'img/kas/front_hit.png', 'img/kas/front_kalcayani.png', 'img/kas/front_karin.png', 'img/kas/front_omuz.png', 'img/kas/front_onkol.png'];

self.addEventListener('install', (e) => {
  // Biri inmese de diğerleri önbelleğe girsin (addAll tek hatada hepsini bırakır)
  e.waitUntil(caches.open(ONBELLEK).then((c) => Promise.all(CEKIRDEK.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(AD) && k !== ONBELLEK).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // tablo (Apps Script), YouTube, dış görseller: ağ
  if (req.mode === 'navigate') {
    // Sayfa: önce ağ (yeni sürüm gelsin), yoksa önbellekteki sayfa
    e.respondWith(fetch(req).then((r) => { const k = r.clone(); caches.open(ONBELLEK).then((c) => c.put('index.html', k)); return r; })
      .catch(() => caches.match('index.html').then((r) => r || caches.match('./'))));
    return;
  }
  // Dosyalar (adlarında sürüm var): önce önbellek, yoksa ağdan alıp önbelleğe yaz
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && r.type === 'basic') { const k = r.clone(); caches.open(ONBELLEK).then((c) => c.put(req, k)); }
    return r;
  })));
});
