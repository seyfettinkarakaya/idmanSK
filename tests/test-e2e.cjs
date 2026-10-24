const assert = require('assert');
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { Sheet, makeEnv, D, ESKI_H, SEANS_H } = require('./fakegas.cjs');

const ROOT = path.join(__dirname, '..');
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2' }[path.extname(p)] || 'text/plain';
  res.writeHead(200, { 'Content-Type': type }); res.end(fs.readFileSync(p));
});

(async () => {
  await new Promise(r => server.listen(8123, r));
  const H = ['Tarih','Sıra','Blok','Tekrar','Mesafe','Stil','Tür','Açıklama','Hedef','Dinlen','Alet','Gerçek','Kulaç','Nabız','RPE','MSI','Not'];
  const row = (t,s,b,tk,m,st,tur,a,h,d,al) => [D(t),s,b,tk,m,st,tur,a,h,d,al,'','','','','',''];
  const long = 'Her 25 metrede nefes düzeni 3-5-7, son 25 metre hızlı; dönüşlerde su altı dolfin vuruşu en az 5 adet olacak.';
  const rows = [];
  for (let i = 1; i <= 8; i++) rows.push(row('2026-09-23', i, ['WU','PS','MS','MS','MS','AS','CD','CD'][i-1], i%2?1:4, i%2?200:100, 'FR', ['Swim','Pull','Drill'][i%3], i===3? long : 'Rahat', '01:30', '00:20', i===2?'Şamandıra':''));
  rows.push(row('2026-09-24',1,'WU',1,400,'FR','Swim','','','',''));
  rows.push(row('2026-09-20',1,'WU',1,300,'FR','Swim','','','',''));
  const env = makeEnv({ Plan: new Sheet('Plan', H, rows), eski: new Sheet('eski', ESKI_H), seans: new Sheet('seans', SEANS_H) });

  let offline = false; let calls = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  // Dışarıya yalnızca Apps Script'e istek gitmeli (yazı tipleri depoda).
  const external = [];
  ctx.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost' && u.hostname !== 'script.google.com') external.push(r.url()); });
  // Ses: gerçek hoparlör yerine çalınan bip frekansları kaydedilir.
  await ctx.addInitScript(() => {
    window.__beeps = [];
    window.AudioContext = class {
      constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: (g) => g, start() { window.__beeps.push(this.frequency.value); }, stop() {} }; }
      createGain() { const noop = () => {}; return { gain: { setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop }; }
    };
  });
  await ctx.route('https://script.google.com/**', async route => {
    if (offline) return route.abort('internetdisconnected');
    const body = JSON.parse(route.request().postData()); calls.push(body.action);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env.call(body)) });
  });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type()==='error' && !/INTERNET_DISCONNECTED/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date('2026-09-23T07:00:00') });
  await page.goto('http://localhost:8123/');

  // Kurulum
  await page.waitForSelector('#screen-setup:not([hidden])');
  // 13.2.0: varsayılan CSS yok — bu senaryo elle girilmiş CSS 1:57 ile çalışır
  await page.evaluate(() => localStorage.setItem('ysk.prefs', JSON.stringify({ ses: true, css: 117, havuz: 25 })));
  await page.fill('#setup-url', 'https://script.google.com/macros/s/TEST/dev');
  await page.fill('#setup-token', 'secret');
  await page.click('#setup-save');
  assert.match(await page.textContent('#setup-msg'), /\/exec/);
  await page.fill('#setup-url', 'https://example.com/exec');
  await page.click('#setup-save');
  assert.match(await page.textContent('#setup-msg'), /script\.google\.com/);
  await page.fill('#setup-url', 'https://script.google.com/macros/s/TEST/exec');
  await page.fill('#setup-token', 'wrong');
  await page.click('#setup-save');
  await page.waitForFunction(() => /anahtar hatalı/i.test(document.getElementById('setup-msg').textContent));
  await page.fill('#setup-token', 'secret');
  await page.click('#setup-save');

  // Ana sayfa: Yüzme (sıradaki idman) · Salon (kurulmadı → Ayarlar)
  await page.waitForSelector('#screen-home:not([hidden])');
  await page.waitForFunction(() => /set/.test(document.getElementById('home-swim-meta').textContent));
  assert.strictEqual(await page.textContent('#home-date'), 'Çarşamba, 23 Eylül');
  assert.strictEqual(await page.textContent('#home-swim-tag'), 'Bugün · Çarşamba 23 Eylül');
  assert.strictEqual(await page.textContent('#home-swim-meta'), '8 set · 2.400 m · 36:40 · ana set 800 m');
  assert.strictEqual(await page.textContent('#home-open-text'), 'İdmanı aç');
  assert.strictEqual(await page.textContent('#home-history-meta'), 'Henüz kayıt yok');
  assert.strictEqual(await page.textContent('#home-gym-badge'), 'KURULMADI');
  await page.click('#home-gym');
  await page.waitForSelector('#screen-setup:not([hidden])');
  await page.click('#setup-back');
  await page.waitForSelector('#screen-home:not([hidden])');
  await page.click('#home-swim');

  // Gün seçimi
  await page.waitForSelector('#wk-track .wd');
  await page.waitForFunction(() => document.querySelector('#days-hero .hero-date'));
  const heroText = () => page.$eval('#days-hero', e => e.textContent.replace(/\s+/g, ' ').trim());
  const cal = await page.evaluate(() => ({
    title: document.getElementById('wk-title').textContent,
    sum: document.getElementById('wk-sum').textContent,
    cells: [...document.querySelectorAll('#wk-track .wd')].map(e => e.dataset.day + ':' + e.className),
    rows: [...document.querySelectorAll('.day-row')].map(e => e.dataset.tarih),
    cta: document.getElementById('days-cta-text').textContent,
  }));
  console.log('Takvim:', JSON.stringify(cal));
  assert.strictEqual(cal.title, 'Bu hafta'); assert.strictEqual(cal.sum, '2 idman · 2.800 m');
  assert.strictEqual(cal.cells.length, 7); assert.ok(cal.cells.includes('2026-09-23:wd on today has'));
  assert.ok(cal.cells.includes('2026-09-24:wd has')); assert.deepStrictEqual(cal.rows, ['2026-09-24']);
  assert.match(await heroText(), /BUGÜN.*36:40 hedef.*23 Eylül Çarşamba.*SET ?8.*MESAFE ?2\.400.*ANA SET ?800/);
  assert.strictEqual(cal.cta, 'Bugünün idmanını aç');
  // Güne dokunmak yalnızca seçer; idmana girmez
  await page.click('.day-row[data-tarih="2026-09-24"]');
  assert.match(await heroText(), /24 Eylül Perşembe/);
  assert.strictEqual(await page.textContent('#days-cta-text'), '24 Eylül idmanını aç');
  // Seçili olmayan günün çubukları gri (ana set en açık)
  const bars = await page.$$eval('.day-row[data-tarih="2026-09-23"] .mini-bar i', els => els.map(e => getComputedStyle(e).backgroundColor));
  assert.deepStrictEqual([...new Set(bars)].sort(), ['rgb(118, 130, 143)', 'rgb(155, 167, 179)', 'rgb(201, 210, 219)', 'rgb(79, 91, 103)'].sort());
  await page.click('.day-row[data-tarih="2026-09-23"]');
  assert.ok(await page.isVisible('#screen-days'));
  // Sağa kaydır → önceki hafta (geçmiş plan: 20 Eylül)
  const wk = await page.$eval('#wk', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(wk.x - 80, wk.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(wk.x - 80 + i * 20, wk.y); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(400);
  assert.strictEqual(await page.textContent('#wk-title'), '14 Eyl – 20 Eyl');
  assert.match(await heroText(), /GEÇMİŞ PLAN.*20 Eylül Pazar/);
  assert.ok(await page.isVisible('#wk-today'));
  await page.click('#wk-today');
  assert.strictEqual(await page.textContent('#wk-title'), 'Bu hafta');
  assert.match(await heroText(), /23 Eylül Çarşamba/);
  assert.ok(await page.isVisible('#days-today-btn'));
  await page.click('#days-today-btn');

  // Program ekranı
  await page.waitForSelector('#screen-program:not([hidden]) .w-item.is-active');
  await page.waitForTimeout(100);
  const info = await page.evaluate(() => {
    const a = document.querySelector('.w-item.is-active');
    const r = a.getBoundingClientRect(); const w = document.getElementById('wheel').getBoundingClientRect();
    const btns = [...document.querySelectorAll('#screen-program button')].filter(b => b.offsetParent).map(b => { const q = b.getBoundingClientRect(); return [b.id || b.textContent, Math.round(q.width), Math.round(q.height)]; });
    return { title: a.querySelector('.w-title').textContent, font: parseFloat(getComputedStyle(a.querySelector('.w-title')).fontSize), top: r.top, bottom: r.bottom, wTop: w.top, wBottom: w.bottom, btns, count: document.querySelectorAll('.w-item.is-done').length, tag: a.querySelector('.w-tag').textContent, dist: document.getElementById('prog-dist').textContent, docW: document.documentElement.scrollWidth };
  });
  console.log('Program:', JSON.stringify(info));
  assert.match(info.title, /^1 × 200/); assert.ok(info.font >= 40);
  assert.ok(info.top >= info.wTop && info.bottom <= info.wBottom, 'aktif kart tekerleğe sığmalı');
  for (const [n, w, h] of info.btns) assert.ok(w >= 60 && h >= 60, `dokunma hedefi küçük: ${n} ${w}x${h}`);
  assert.strictEqual(info.count, 0); assert.match(info.tag, /WU · ISINMA · 1\/8/); assert.ok(info.docW <= 440);
  // Üstte toplam hedef süre; kartta 4. satır set/yığımlı; blok renkli şerit
  const top = await page.evaluate(() => {
    const a = document.querySelector('.w-item.is-active');
    const card = a.querySelector('.w-card').getBoundingClientRect();
    const rows = [...document.querySelectorAll('.w-item')].filter(e => e !== a && e.style.visibility !== 'hidden' && e.getBoundingClientRect().top < document.getElementById('wheel').getBoundingClientRect().bottom).length;
    return {
      end: document.getElementById('prog-end').textContent,
      dist: document.getElementById('prog-dist').textContent,
      segs: [...document.querySelectorAll('#prog-bar .seg')].map(e => e.style.flexGrow),
      foot: a.querySelector('.w-foot').textContent.replace(/\s+/g, ' ').trim(),
      tm: a.querySelector('.w-ctm').textContent.replace(/\s+/g, ' ').trim(),
      cardShare: card.height / innerHeight,
      rowsBelow: rows,
    };
  });
  console.log('Üst/kart:', JSON.stringify(top));
  assert.strictEqual(top.end.trim(), '/36:40'); assert.strictEqual(top.dist.replace(/\s/g, ''), '0/2.400');
  assert.deepStrictEqual(top.segs, ['200', '400', '200', '400', '200', '400', '200', '400']);
  assert.strictEqual(top.foot, 'Tempo 0:45/100200 / 200 m'); // Pull: bölge yok assert.strictEqual(top.tm, '1:50+1:50');
  assert.ok(top.cardShare >= 0.5, 'aktif kart ekranın en az yarısı'); assert.ok(top.rowsBelow >= 2, 'altta en az 2 durak');

  const activeIdx = () => page.evaluate(() => [...document.querySelectorAll('.w-item')].findIndex(e => e.classList.contains('is-active')));
  const goTo = async (target) => {
    const r = await page.$eval('#wheel', e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    await page.mouse.move(r.x, r.y);
    for (let k = 0; k < 20; k++) {
      const cur = await activeIdx();
      if (cur === target) break;
      await page.mouse.wheel(0, cur > target ? -60 : 60);
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(400);
    assert.strictEqual(await activeIdx(), target);
  };
  // Tek zamanlayıcı: büyük düğme YÜZ → DUR → YÜZ (ilk YÜZ idmanı da başlatır); süreler dokunuş zamanlarından
  const label = () => page.textContent('#btn-main-label');
  // 24.10: fastForward'dan hemen sonraki runFor(250) ara sıra sayfa saatini geri alıyordu (harness.cjs adv ile aynı
  // kök neden): runFor'dan sonra da ölçülür, saat geri kaldıysa yeniden ilerletilir.
  const adv = async (sec) => {
    const want = sec * 1000; const t0 = await page.evaluate(() => Date.now());
    const gecen = async () => (await page.evaluate(() => Date.now())) - t0;
    for (let k = 0; k < 8; k++) {
      let done = await gecen();
      if (done < want - 20 && k > 0) { await page.waitForTimeout(40); done = await gecen(); }
      if (done >= want - 20) {
        await page.clock.runFor(250);
        if ((await gecen()) >= want - 20) return;
        continue;
      }
      if (k >= 2) await page.clock.runFor(want - done); else await page.clock.fastForward(want - done);
    }
    throw new Error(`adv(${sec}): sahte saat ilerlemedi`);
  };
  // Yük altında basış geç işlenebilir: düğme yazısı değişene dek (en çok 1,5 sn) beklenir.
  const tap = async (sec) => {
    const before = await label();
    await page.$eval('#btn-main', b => b.click());
    await page.waitForFunction((t) => document.getElementById('btn-main-label').textContent !== t, before, { timeout: 1500 }).catch(() => {});
    if (sec) await adv(sec);
  };
  const activeTitle = () => page.$eval('.w-item.is-active .w-title', e => e.firstChild.textContent.trim());
  // İdman başlamadan tekerlek serbest: sürükleyerek 3 set aşağı kaydır (atalet dahil)
  const wb = await page.$eval('#wheel', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
  await page.mouse.move(wb.x, wb.y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(wb.x, wb.y - i * 22); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(900);
  const idxAfterDrag = await activeIdx();
  console.log('Sürükleme sonrası aktif indeks:', idxAfterDrag);
  assert.ok(idxAfterDrag >= 2, 'sürükleme en az 2 set ilerletmeli');
  // Uzun açıklama kırpılmadan sarılıyor mu (3. set)?
  await goTo(2);
  const desc = await page.$eval('.w-item.is-active .w-desc', e => ({ sh: e.scrollHeight, ch: e.clientHeight }));
  assert.ok(desc.sh <= desc.ch + 1, 'açıklama kırpılmamalı');
  // 100 m tempo: hedef 1:30 / 200 m → 0:45, CSS 1:57'ye göre SP3 (ekipmansız Swim)
  assert.strictEqual((await page.textContent('.w-item.is-active .w-pace')).replace(/\s+/g, ' ').trim(), 'Tempo 0:45/100 · SP3');
  // 13.11 (bilerek değişti): tek bölge ısı rampası; SP3 metin rengi #F58BB0 (eski eflatun #E879F9)
  assert.strictEqual(await page.$eval('.w-item.is-active .w-pace b', e => getComputedStyle(e).color), 'rgb(245, 139, 176)');
  await goTo(0);

  assert.strictEqual(await label(), 'YÜZ');
  await tap(150); // ilk YÜZ: idman + 1 × 200
  assert.strictEqual(await label(), 'DUR');
  await tap(20);  // set tamam → kart 4 × 100'e geçer; set sonu dinlenmesi
  await page.waitForTimeout(900);
  assert.strictEqual(await activeIdx(), 1);
  assert.strictEqual(await activeTitle(), '4 × 100');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.w-item.is-done').length), 1);
  assert.strictEqual((await page.textContent('#prog-dist')).replace(/\s/g, ''), '200/2.400');
  // 4 × 100: tekrar süreleri 1:23.4, 1:24.6, 1:24.0, 1:24.0 (tap +0,25 sn ekler)
  const reps = [83.15, 84.35, 83.75, 83.75];
  for (let r = 0; r < reps.length; r++) {
    assert.strictEqual(await label(), 'YÜZ', `tekrar ${r + 1}`);
    await tap(reps[r]);
    await tap(r < 3 ? 19.75 : 5);
    if (r === 1) {
      // Yeniden yükleme → kaldığı yerden (dinlenme) devam
      await page.reload();
      await page.waitForSelector('#screen-program:not([hidden]) .w-item.is-active');
      await page.waitForTimeout(300);
      assert.strictEqual(await activeIdx(), 1);
      assert.strictEqual(await label(), 'YÜZ');
      assert.strictEqual(await page.$$eval('.w-item.is-active .w-reps div.ok', e => e.length), 2);
    }
  }
  await page.waitForTimeout(900);
  assert.strictEqual(await activeIdx(), 2, 'set tamamlanınca sıradaki sete geçer');
  assert.strictEqual((await page.textContent('#prog-dist')).replace(/\s/g, ''), '600/2.400');

  // ‹ → İdmanı bitir → RPE (tek dokunuş) → MSI → Özet
  await page.click('#prog-back');
  await page.waitForSelector('#modal:not([hidden]) >> text=İdmanı bitir?');
  await page.click('#modal-actions button:has-text("İdmanı bitir ve kaydet")');
  await page.waitForSelector('#screen-rpe:not([hidden])');
  assert.match(await page.textContent('#rpe-info'), /600 m/);
  await page.click('#rpe-grid button[data-v="8"]');
  await page.waitForSelector('#screen-msi:not([hidden])');
  for (let i = 0; i < 2; i++) await page.click('#msi-body button[data-bolge="sag omuz"]');
  await page.click('#msi-body button[data-bolge="bel"]');
  for (let i = 0; i < 6; i++) await page.click('#msi-body button[data-bolge="boyun"]'); // döngü boşa döner
  await page.click('#msi-next');
  await page.waitForSelector('#screen-ozet:not([hidden])');
  assert.strictEqual(await page.textContent('#oz-mesafe'), '600');
  assert.strictEqual(await page.textContent('#oz-rpe'), '8');
  const sure = await page.textContent('#oz-sure'); console.log('Süre:', sure);
  const ozNotes = await page.$$eval('.oz-set', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  console.log('Özet:', JSON.stringify(ozNotes));
  assert.strictEqual(ozNotes.length, 2);
  assert.match(ozNotes[1], /4 × 100.*ort\. 1:24\.0/);
  await page.fill('#oz-aciklama', 'Ana set iyi geçti');
  await page.click('#oz-havuz button[data-v="50"]');
  await page.click('#oz-save');
  await page.waitForSelector('#screen-done:not([hidden])');
  console.log('Onay:', await page.textContent('#done-text'));
  const eski = env.sheets.eski.data.slice(1);
  assert.deepStrictEqual(eski.map(r => [r[1], r[4]]), [['', 200], ['', 100]]); // Sıra boş (tablo doldurur)
  assert.ok(Math.abs(eski[1][11] * 86400 - 84) < 0.05, `Gerçek ${eski[1][11] * 86400}`);
  assert.match(eski[1][16], /^Tekrarlar: 1:2\d, 1:2\d, 1:2\d, 1:2\d$/);
  const seans = env.sheets.seans.data[1];
  assert.deepStrictEqual([seans[2], seans[3], seans[4], seans[5], seans[6]], [600, 50, 8, 'sag omuz 1; bel 0.5', 'Ana set iyi geçti']);
  assert.strictEqual(env.sheets.Plan.data.length, 3);
  assert.match(await page.textContent('#done-text'), /yuzmeVeri sayfasına yazıldı, 8 satır yuzmePlan'dan silindi.*telefonda da saklandı/); // 13.2: arşiv yok
  assert.ok(!env.sheets.arsiv);

  // Çevrimdışı: kuyruk
  // Kayıttan sonra sıradaki idmana değil, takvimde bugüne dönülür
  await page.click('#done-back');
  await page.waitForSelector('#screen-days:not([hidden])');
  await page.waitForFunction(() => /23 Eylül/.test(document.getElementById('days-hero').textContent));
  assert.match(await heroText(), /Bu gün için plan yok/);
  assert.ok(await page.isHidden('#days-today-bar'));
  await page.click('.day-row[data-tarih="2026-09-24"]');
  await page.waitForFunction(() => !document.getElementById('days-today-bar').hidden);
  await page.click('#days-today-btn');
  await page.waitForSelector('#screen-program:not([hidden]) .w-item.is-active');
  await tap(60); // ilk YÜZ
  offline = true;
  await page.reload(); // uçak modunda yeniden açılış (yüzerken)
  await page.waitForSelector('#screen-program:not([hidden]) .w-item.is-active');
  assert.strictEqual(await activeTitle(), '1 × 400');
  assert.strictEqual(await label(), 'DUR');
  await adv(300);
  await page.click('#btn-main'); // son setin son DUR'u idmanı bitirir
  await page.waitForSelector('#screen-rpe:not([hidden])');
  await page.click('#rpe-grid button[data-v="5"]');
  await page.waitForSelector('#screen-msi:not([hidden])');
  await page.click('#msi-none');
  await page.waitForSelector('#screen-ozet:not([hidden])');
  assert.strictEqual(await page.$eval('#oz-havuz button[data-v="50"]', e => e.classList.contains('is-on')), true, 'havuz hatırlanır');
  await page.click('#oz-save');
  await page.waitForSelector('#screen-done:not([hidden])');
  assert.strictEqual(await page.textContent('#done-title'), 'Kaydedilemedi');
  await page.click('#done-back');
  await page.waitForSelector('.banner-warn');
  offline = false;
  await page.reload();
  // Açılış ana sayfada; kuyruk arka planda gönderilir
  await page.waitForSelector('#screen-home:not([hidden])');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ysk.queue') || '[]').length === 0);
  assert.strictEqual(env.sheets.seans.data.length, 3);
  await page.waitForFunction(() => /2 kayıt$/.test(document.getElementById('home-history-meta').textContent));
  // Yapılmış idmanlar: ikisi de tabloda, telefonda duruyor
  await page.click('#home-history');
  await page.waitForSelector('#screen-history:not([hidden])');
  const hist = await page.$$eval('.hist-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  console.log('Geçmiş:', JSON.stringify(hist));
  assert.strictEqual(hist.length, 2);
  assert.match(hist[0], /^24 ?EYL Perşembe Tabloda 1\/1 set · 400 m · \d+:\d\d$/);
  assert.match(hist[1], /^23 ?EYL Çarşamba Tabloda 2\/8 set · 600 m · \d+:\d\d$/);
  await page.click('.hist-row >> nth=1');
  await page.waitForSelector('#modal:not([hidden]) .hd');
  assert.match(await page.textContent('#modal-body'), /Gerçek 01:24\.0 · Hedef 01:30/);
  await page.click('#modal-actions button:has-text("Kapat")');
  await page.click('#hist-back');
  await page.click('#home-swim');
  await page.waitForSelector('#screen-days:not([hidden])');
  await page.waitForTimeout(300);
  const left = await page.$eval('#days-hero .hero-date', e => e.textContent.replace(/\s+/g, ' ').trim());
  assert.strictEqual(left, '20 Eylül Pazar', 'gönderilen gün listeden kalkmalı; kalan tek plan seçilir');
  assert.deepStrictEqual(env.sheets.eski.data.slice(1).map(r => r[4]), [400, 200, 100]); // en yeni seans en üstte
  // Aynı seansı tekrar göndermek → DUPLICATE (sunucu tarafı)
  assert.strictEqual(env.call({ action: 'finishSession', tarih: '2026-09-24', seans: {}, setler: [] }).error, 'DUPLICATE');

  // Bozuk tarih önbelleği + kuyrukta bekleyen kayıt: gönderim takılmamalı, liste çizilmeli
  await page.evaluate(() => {
    localStorage.removeItem('ysk.session');
    localStorage.setItem('ysk.dates', JSON.stringify({ dates: { bozuk: true }, savedAt: 1 }));
    localStorage.setItem('ysk.queue', JSON.stringify([{ id: 'q1', createdAt: 1, tries: 0, lastError: null,
      payload: { tarih: '2026-09-20', seans: { sure: '00:30:00', mesafe: 300, havuz: 25, rpe: '', msi: '', aciklama: '' },
        setler: [{ sira: 1, tamamlandi: true, gercek: '', kulac: '', nabiz: '', rpe: '', msi: '', not: '' }] } }]));
  });
  await page.reload();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ysk.queue')).length === 0);
  await page.click('#home-swim');
  await page.waitForFunction(() => !document.querySelector('.banner-warn') && document.querySelector('#days-list').textContent.trim() !== '');
  assert.ok(env.sheets.seans.data.some((r, i) => i > 0 && r[2] === 300), 'kuyruktaki kayıt gönderilmeli');
  assert.match(await page.textContent('#days-list'), /Planlanmış idman yok/);
  await page.click('#days-back');
  await page.waitForFunction(() => document.getElementById('home-swim-tag').textContent === 'Planlanmış idman yok');
  assert.ok(await page.isHidden('#home-open'), 'planlı idman yoksa yalnız Takvim');
  await page.click('#home-swim');
  await page.waitForSelector('#screen-days:not([hidden])');

  // Zaten kayıtlı seans + bozuk önbellek: "Seansı kapat" ana sayfaya dönmeli
  const addRow = (sh, row) => { const i = sh.getLastRow(); sh._row(i); sh.data[i] = row; };
  addRow(env.sheets.Plan, ['2026-09-27', 1, 'WU', 1, 500, 'FR', 'Swim', '', '', '', '', '', '', '', '', '', '']);
  addRow(env.sheets.seans, ['2026-09-27', '', 0, 25, '', '', '']);
  await page.click('#days-refresh');
  await page.waitForFunction(() => /27 Eylül/.test(document.getElementById('days-hero').textContent) && !document.getElementById('days-today-bar').hidden);
  await page.click('#days-today-btn');
  await page.waitForSelector('#screen-program:not([hidden])');
  await page.evaluate(() => localStorage.setItem('ysk.dates', JSON.stringify({ dates: 'bozuk' })));
  await tap(60); await page.click('#btn-main'); // tek set: DUR idmanı bitirir
  await page.waitForSelector('#screen-rpe:not([hidden])');
  await page.click('#rpe-grid button[data-v="5"]');
  await page.click('#msi-none');
  await page.waitForSelector('#screen-ozet:not([hidden])');
  await page.click('#oz-save');
  await page.waitForSelector('#modal:not([hidden]) >> text=Bu seans zaten kayıtlı');
  await page.click('#modal-actions button:has-text("Seansı kapat")');
  await page.waitForSelector('#screen-days:not([hidden])');
  assert.strictEqual(await page.evaluate(() => localStorage.getItem('ysk.session')), null);
  await page.click('#days-back');
  await page.waitForSelector('#screen-home:not([hidden])');
  assert.strictEqual(await page.textContent('#app-version'), 'Sürüm 13.11.0');
  assert.match(await page.textContent('#home-history-meta'), /^3 kayıt$/);

  // Toplu silme: yalnızca telefondaki kopyalar gider
  const seansRows = env.sheets.seans.data.length;
  await page.click('#home-history');
  await page.waitForSelector('.hist-row');
  assert.match(await page.textContent('.hist-row >> nth=0'), /27[\s\S]*Zaten kayıtlıydı/);
  await page.click('#hist-clear');
  await page.click('#modal-actions button:has-text("Tümünü sil")');
  await page.waitForSelector('#hist-list .empty');
  assert.strictEqual(env.sheets.seans.data.length, seansRows);
  await page.click('#hist-back');

  // Ayarlar: tercihler ve anahtarı unut
  await page.click('#home-settings');
  await page.waitForSelector('#screen-setup:not([hidden])');
  assert.strictEqual(await page.textContent('#setup-title'), 'Ayarlar');
  assert.strictEqual(await page.inputValue('#pref-css'), '1:57');
  assert.strictEqual(await page.$$eval('#pref-zones .zone', e => e.length), 7);
  await page.fill('#pref-css', '1:50'); await page.press('#pref-css', 'Tab');
  assert.match(await page.textContent('#pref-zones .z4'), /1:47 – 1:53/);
  await page.click('#pref-ses button[data-v="0"]');
  assert.deepStrictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('ysk.prefs'))), { ses: false, css: 110, havuz: 50 });
  await page.click('#setup-forget');
  await page.click('#modal-actions button:has-text("Evet, unut")');
  await page.waitForFunction(() => document.getElementById('setup-title').textContent === 'Kurulum');
  assert.strictEqual(await page.inputValue('#setup-token'), '');
  assert.ok(await page.isHidden('#setup-back'));
  assert.strictEqual(await page.evaluate(() => localStorage.getItem('ysk.config')), null);
  assert.deepStrictEqual(external, [], 'dış istek olmamalı');

  // Dar ekran: yatay taşma olmamalı
  await page.setViewportSize({ width: 320, height: 568 });
  
  const narrow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth }));
  console.log('Dar ekran:', JSON.stringify(narrow));
  assert.ok(narrow.sw <= 320 && narrow.bw <= 320);
  assert.deepStrictEqual(errors, []);
  console.log('E2E testleri: TAMAM', calls.join(','));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
