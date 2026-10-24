// Uçtan uca testler için ortak düzenek: statik sunucu, sahte Apps Script,
// ağ denetimi (çevrimdışı, gecikme, cevap değiştirme), sahte ses.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { Sheet, makeEnv, D, ESKI_H, SEANS_H } = require('./fakegas.cjs');

const ROOT = path.join(__dirname, '..');
const API = 'https://script.google.com/macros/s/TEST/exec';
const REF_API = 'https://script.google.com/macros/s/REF/exec';
const SALON_API = 'https://script.google.com/macros/s/SALON/exec';
const KUT_API = 'https://script.google.com/macros/s/KUT/exec';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function startServer(port) {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'text/plain' }); res.end(fs.readFileSync(p));
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

const PLAN_H = ['Tarih', 'Sıra', 'Blok', 'Tekrar', 'Mesafe', 'Stil', 'Tür', 'Açıklama', 'Hedef', 'Dinlen', 'Alet', 'Gerçek', 'Kulaç', 'Nabız', 'RPE', 'MSI', 'Not'];
/** Plan satırı: [tarih, sıra, blok, tekrar, mesafe, tür, hedef, dinlen, alet] */
const prow = (t, s, b, tk, m, tur = 'Swim', h = '01:30', d = '00:20', alet = '') => [D(t), s, b, tk, m, 'FR', tur, 'Açıklama ' + s, h, d, alet, '', '', '', '', '', ''];

/** Standart örnek: bugün (23 Eyl) 5 set, yarın 1 set, geçmiş 1 set. */
function samplePlan() {
  return [
    prow('2026-09-23', 1, 'WU', 1, 200, 'Swim', '04:00', '00:20'),
    prow('2026-09-23', 2, 'PS', 4, 50, 'Drill', '01:05', '00:15'),
    prow('2026-09-23', 3, 'MS', 4, 100, 'Swim', '01:30', '00:20'),
    prow('2026-09-23', 4, 'AS', 2, 100, 'Pull', '01:40', '00:20', 'Şamandıra'),
    prow('2026-09-23', 5, 'CD', 1, 200, 'Swim', '04:30', ''),
    prow('2026-09-24', 1, 'WU', 1, 400, 'Swim', '08:00', ''),
    prow('2026-09-20', 1, 'WU', 1, 300, 'Swim', '06:00', ''),
  ];
}

/** Örnek sporRef: 06.07–30.09 CSS 2:00 (25 m), 1:55 (50 m); Pullbuoy 1:52 ("Şamandıra" = PB). */
function sampleRef() {
  return {
    zone: new Sheet('zone', ['Zone', 'Alt Sınır', 'Üst Sınır', 'Tür', 'Türkçe Adı'], [
      ['SP3', -999, '−19', 'PACE', 'Yüksek Spriniti'], ['SP2', '−19', '−9', 'PACE', 'Maksimal Spriniti'], ['SP1', '−9', '−3', 'PACE', 'Eşik Spriniti'],
      ['EN3', '−3', 3, 'PACE', 'Yüksek Aerobik'], ['EN2', 3, 11, 'PACE', 'Orta Aerobik'], ['EN1', 11, 21, 'PACE', 'Düşük Aerobik'], ['REC', 21, 999, 'PACE', 'Toparlanma'],
      ['REC', 0, 150, 'HR', ''],
    ]),
    css: new Sheet('css', ['Tarih_ilk', 'Tarih_son', 'CSS (sn)', 'Alet', 'Havuz'], [
      [D('2026-05-01'), D('2026-07-05'), 125, '', 25], [D('2026-07-06'), D('2026-09-30'), 120, '', 25],
      [D('2026-07-06'), D('2026-09-30'), 115, '', 50], [D('2026-07-06'), D('2026-09-30'), 112, 'PB', 25],
    ]),
    alet: new Sheet('alet', ['Kod', 'Ad', 'Açıklama'], [['PB', 'Pullbuoy', 'Pulboy'], ['Şamandıra', 'Pullbuoy', '']]),
    RPE: new Sheet('RPE', ['1–2 — Çok kolay.'], [['7–8 — Zor, set sonlarında zorlanma.'], ['9 — Çok zor.'], ['10 — Maksimal.']]),
    MSI: new Sheet('MSI', ['0 — Ağrı yok.'], [['0,5 — Hafif his.'], ['1 — Belirgin ağrı.']]),
  };
}

/** Örnek SalonTakip: 4 hareket (Plank süreli), son idman 20 Eylül (Row + Pull-up). */
function sampleSalon(extraIdman = []) {
  const IDMAN_H = ['Tarih', 'No', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Nabız', 'RPE', 'MSI', 'Açıklama'];
  return {
    idman: new Sheet('idman', IDMAN_H, [
      ...extraIdman,
      [D('2026-09-20'), 1, 'Band Bent Over Row', 4, 20, 15, 123, 7.5, 0, ''],
      [D('2026-09-20'), 2, 'Standard Pull-up', 3, 9.666666667, 'Vücut', 142, 9.5, 1, 'Setler: 11-9-9'],
      [D('2026-09-01'), 1, 'Band Chest Fly', 3, 15, 10, '', 7, 0, ''],
    ]),
    H: new Sheet('H', ['Exercise', 'Goal Tag', 'Equipment', 'BW Coefficient', 'Swim Transfer Coefficient', 'Video'], [
      ['Band Bent Over Row', 'Rehab', 'Band', '—', 0.75, 'https://youtu.be/row1'],
      ['Standard Pull-up', 'Strength', 'Bodyweight', 0.95, 0.95, ''],
      ['Band Chest Fly', 'Rehab', 'Band', '—', 0.7, ''],
      ['Front Plank', 'Strength', 'Bodyweight', 0.6, 0.9, ''],
      ['Band Lat Pulldown', 'Rehab', 'Band', '—', 0.85, ''],
    ]),
    hkEtki: new Sheet('hkEtki', ['Exercise', 'Muscle Group', 'Muscle', 'Kinetic Chain', 'Yük Etki Oranı'], [
      ['Band Bent Over Row', 'Back', 'Rhomboids', 'Upper Pull', 0.8], ['Band Bent Over Row', 'Arms', 'Biceps', 'Upper Pull', 0.2],
      ['Standard Pull-up', 'Back', 'Latissimus Dorsi', 'Upper Pull', 0.6], ['Standard Pull-up', 'Arms', 'Biceps', 'Upper Pull', 0.4],
      ['Band Chest Fly', 'Chest', 'Pectoralis', 'Upper Push', 1], ['Front Plank', 'Core', 'Rectus Abdominis', 'Stability', 1],
      ['Band Lat Pulldown', 'Back', 'Latissimus Dorsi', 'Upper Pull', 0.9], ['Band Lat Pulldown', 'Arms', 'Biceps', 'Upper Pull', 0.1],
    ]),
    ref: new Sheet('ref', ['Parametre', 'Değer -1', 'Değer - 2', 'Değer - 3'], [['BW', D('2025-01-01'), D('2026-12-31'), 90]]),
  };
}

/** Eski SalonTakip!ref BW satırları → idmanRef!bilgi (Kısaltma = BW, ilk, son, kg). */
function bilgiBw(refSheet, bilgi) {
  const rows = refSheet.data.slice(1).filter((r) => String(r[0]).toUpperCase() === 'BW').map((r) => ['BW', r[1], r[2], r[3]]);
  const b = bilgi || new Sheet('bilgi', ['Kısaltma', 'Tam Adı', 'Açıklama', 'Açıklama.2']);
  b.data.push(...rows);
  return b;
}

async function launch(opts = {}) {
  // 13.2: iki betik — idman.gs (yüzme + salon girişleri: havuzPlan/havuzVeri/havuzSeans, salonVeri/salonPlan) ve
  // idmanRef.gs (bölgeler, CSS, … + salonHar/salonHKEtki/bilgi BW). Test kurguları eski sayfa adlarıyla yazılır (fakegas ALIAS).
  const salonSheets = opts.salonSheets || (opts.salon ? sampleSalon() : null);
  const giris = { Plan: new Sheet('Plan', opts.planH || PLAN_H, opts.rows || samplePlan()), eski: new Sheet('eski', opts.eskiH || ESKI_H), seans: new Sheet('seans', SEANS_H) }; // 13.8: planH / eskiH (ör. Etiket sütunu)
  const refSheets = { ...(opts.refSheets || sampleRef()) };
  if (salonSheets) {
    giris.idman = salonSheets.idman;
    if (salonSheets.plan) giris.plan = salonSheets.plan;
    if (salonSheets.karaSeans) giris.karaSeans = salonSheets.karaSeans; // 13.4
    // 13.4: opts.kut → katalog ve etkiler idmanKutuphane'de (karaHareket / karaEtki); yoksa eski kurulum gibi idmanRef'te
    if (salonSheets.H && !opts.kut) refSheets.H = salonSheets.H;
    if (salonSheets.hkEtki && !opts.kut) refSheets.hkEtki = salonSheets.hkEtki;
    if (salonSheets.ref) refSheets.bilgi = bilgiBw(salonSheets.ref, refSheets.bilgi);
  }
  const env = makeEnv(giris);
  const envs = { TEST: env, REF: makeEnv(refSheets, 'refkey', 'idmanRef.gs') };
  if (salonSheets) envs.SALON = { sheets: env.sheets, CDate: env.CDate }; // salon artık idman betiğinde
  if (opts.kut && salonSheets) envs.KUT = makeEnv({ karaHareket: salonSheets.H, karaEtki: salonSheets.hkEtki }, 'kutkey', 'idmanKutuphane.gs', { alias: false });
  const net = { offline: Boolean(opts.offline), delay: {}, override: null, calls: [], external: [] };
  const browser = opts.browser;
  // 13.6: service worker yalnız kendi testinde (opts.sw); diğerlerinde istekler doğrudan sahte sunucuya gitsin
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 440, height: 956 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: opts.sw ? 'allow' : 'block', reducedMotion: opts.motion ? 'no-preference' : 'reduce' }); // 13.6: animasyonlar testte kapalı (opts.motion ile açık)
  // YouTube gömme (sürüm 13): gerçek ağa çıkmaz, sahte sayfa döner; dış istek sayılmaz, adresleri net.video'da
  net.video = [];
  ctx.on('request', (r) => { const u = new URL(r.url()); if (u.hostname === 'www.youtube-nocookie.com') { net.video.push(r.url()); return; } if (u.hostname !== 'localhost' && u.hostname !== 'script.google.com') net.external.push(r.url()); });
  await ctx.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title><body style="background:#000"></body>' }));
  await ctx.addInitScript(() => {
    window.__beeps = [];
    window.AudioContext = class {
      constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: (g) => g, start() { window.__beeps.push(this.frequency.value); }, stop() {} }; }
      createGain() { const f = () => {}; return { gain: { setValueAtTime: f, exponentialRampToValueAtTime: f }, connect: f }; }
    };
  });
  await ctx.route('https://script.google.com/**', async (route) => {
    const body = JSON.parse(route.request().postData());
    net.calls.push(body.action);
    if (net.offline) return route.abort('internetdisconnected');
    const ms = net.delay[body.action] || 0;
    if (ms) await new Promise((r) => setTimeout(r, ms));
    let out = net.override && net.override(body);
    if (out === 'abort') return route.abort('internetdisconnected');
    if (!out) {
      const e = envs[(/\/s\/([^/]+)\/exec/.exec(route.request().url()) || [])[1]];
      out = e ? JSON.parse(e.ctx.doPost({ postData: { contents: JSON.stringify(body) } }).s) : { ok: false, error: 'NOT_FOUND', message: 'yok' };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(opts.time || '2026-09-23T07:00:00') });
  await page.goto(`http://localhost:${opts.port}/`);
  if (opts.configured !== false) {
    const cfg = { apiUrl: API, token: 'secret' };
    if (opts.ref || salonSheets) cfg.ref = { apiUrl: REF_API, token: 'refkey' }; // salon kataloğu idmanRef'te
    if (opts.kut) cfg.kutuphane = { apiUrl: KUT_API, token: 'kutkey' };
    await page.evaluate((c) => localStorage.setItem('ysk.config', JSON.stringify(c)), cfg);
    if (opts.storage) await page.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, opts.storage);
    await page.reload();
  }
  const h = helpers(page);
  return { env, envs, net, ctx, page, errors, port: opts.port, ...h, close: () => ctx.close() };
}

function helpers(page) {
  const h = {
    screen: () => page.evaluate(() => { const s = [...document.querySelectorAll('.screen')].find((e) => !e.hidden); return s && s.id.replace('screen-', ''); }),
    waitScreen: (name, timeout = 8000) => page.waitForSelector(`#screen-${name}:not([hidden])`, { timeout }),
    text: (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()),
    ls: (k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), k),
    session: () => page.evaluate(() => JSON.parse(localStorage.getItem('ysk.session'))),
    /** Aktif kartın başlığı (stil·tür eki olmadan): "4 × 100" */
    title: () => page.$eval('.w-item.is-active .w-title', (e) => e.firstChild.textContent.trim()),
    /** Büyük düğmeye dokunur, sonra saati sec saniye ilerletir (2 sn korumasını aşmak için). */
    // Büyük düğmeye basış sayfa içinde eşzamanlı yapılır: Playwright'ın fare tıklaması sahte saatle
    // birlikte ara sıra saat ileri alındıktan sonra işleniyor ve olayın zaman damgası kayıyordu.
    async press() { await page.$eval('#btn-main', (b) => b.click()); },
    async tap(sec = 0) { await h.press(); if (sec) await h.adv(sec); },
    // Playwright'ın sahte saati fastForward'u ara sıra uygulamıyor (sayfa saati ilerlemiyor):
    // sayfanın gördüğü zaman istenen kadar ilerleyene dek tekrar edilir.
    // 24.10: kök neden — fastForward'dan hemen sonra gelen runFor(250) ara sıra sayfa saatini geri alıyordu
    // (adv sonrası ölçüm yalnız ~250 ms ilerlemiş; çift dokunma koruması sonraki basışı yutuyor: tam idman
    // 'DUR !== YÜZ'). Bu yüzden runFor'dan SONRA da ölçülür; saat geri kaldıysa yeniden ilerletilir.
    async adv(sec) {
      const want = sec * 1000;
      const t0 = await page.evaluate(() => Date.now());
      const gecen = async () => (await page.evaluate(() => Date.now())) - t0;
      for (let k = 0; k < 8; k++) {
        let done = await gecen();
        if (done < want - 20 && k > 0) { // önceki ileri alma geç uygulanmış olabilir: biraz bekle, yeniden ölç
          await page.waitForTimeout(40);
          done = await gecen();
        }
        if (done >= want - 20) {
          await page.clock.runFor(250); // zamanlayıcılar (arayüz tikleri) işlensin
          if ((await gecen()) >= want - 20) return;
          continue;
        }
        if (k >= 2) await page.clock.runFor(want - done); // fastForward uygulanmıyorsa kesin ama yavaş yol
        else await page.clock.fastForward(want - done);
      }
      throw new Error(`adv(${sec}): sahte saat ilerlemedi`);
    },
    label: () => page.textContent('#btn-main-label'),
    sub: () => page.textContent('#btn-main-sub'),
    events: () => page.evaluate(() => JSON.parse(localStorage.getItem('ysk.session')).events.map((e) => e.t + (e.set != null ? e.set : ''))),
    /** Seans sonuna (RPE → Ağrı yok → Özet) ‹ ile erken bitirerek gider. */
    async finishToOzet(rpe = 7) {
      await page.click('#prog-back');
      await h.waitModal('İdmanı bitir?');
      await h.modalClick('İdmanı bitir ve kaydet');
      await h.waitScreen('rpe');
      await page.click(`#rpe-grid button[data-v="${rpe}"]`);
      await h.waitScreen('msi');
      await page.click('#msi-none');
      await h.waitScreen('ozet');
    },
    activeIdx: (sel = '#wheel') => page.evaluate((w) => [...document.querySelectorAll(`${w} .w-item`)].findIndex((e) => e.classList.contains('is-active')), sel),
    center: (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }),
    async tapAt(p) { await page.mouse.click(p.x, p.y); },
    async modalClick(label) { await page.click(`#modal-actions button:has-text("${label}")`); },
    async waitModal(title) { await page.waitForSelector(`#modal:not([hidden]) >> text=${title}`, { timeout: 8000 }); },
    async openToday() {
      await h.waitScreen('home');
      await page.click('#home-swim');
      await h.waitScreen('days');
      await page.waitForFunction(() => !document.getElementById('days-today-bar').hidden);
      await page.click('#days-today-btn');
      await h.waitScreen('program');
      await page.waitForSelector('.w-item.is-active');
    },
    async goTo(target, sel = '#wheel') {
      const r = await h.center(sel);
      await page.mouse.move(r.x, r.y);
      for (let k = 0; k < 20 && (await h.activeIdx(sel)) !== target; k++) {
        await page.mouse.wheel(0, (await h.activeIdx(sel)) > target ? -60 : 60);
        await page.waitForTimeout(420);
      }
      await page.waitForTimeout(350);
      if ((await h.activeIdx(sel)) !== target) throw new Error(`tekerlek ${target}. sete gelmedi`);
    },
    async hold(sel, ms) {
      const p = await h.center(sel);
      await page.mouse.move(p.x, p.y); await page.mouse.down();
      await page.clock.runFor(ms); await page.mouse.up();
    },
  };
  return h;
}

/** Senaryoları sırayla çalıştırır; her biri temiz bir tarayıcı bağlamında. */
async function runScenarios(title, scenarios, port) {
  const server = await startServer(port);
  const browser = await chromium.launch();
  const t0 = Date.now();
  let failed = 0;
  for (const [name, fn] of scenarios) {
    const t = Date.now();
    let s;
    try {
      await fn({ launch: (o = {}) => launch({ ...o, browser, port }).then((x) => (s = x)) });
      if (s && s.errors.length) throw new Error('Sayfa hataları: ' + s.errors.join(' | '));
      if (s && s.net.external.length) throw new Error('Dış istek: ' + s.net.external.join(', '));
      console.log(`  ✓ ${name} (${((Date.now() - t) / 1000).toFixed(1)} sn)`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${name}\n    ${(e && e.stack || e).toString().split('\n').slice(0, 4).join('\n    ')}`);
    } finally {
      if (s) await s.close().catch(() => {});
    }
  }
  await browser.close(); server.close();
  console.log(`${title}: ${scenarios.length - failed}/${scenarios.length} senaryo geçti (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
  if (failed) process.exit(1);
}

module.exports = { PLAN_H, ESKI_H, launch, runScenarios, prow, samplePlan, sampleRef, sampleSalon, API, REF_API, SALON_API, KUT_API, D };
