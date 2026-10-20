// Uçtan uca senaryolar: her biri temiz tarayıcı bağlamında, sahte Apps Script ile.
//   NODE_PATH=$(npm root -g) node tests/e2e-senaryolar.cjs [filtre]
const assert = require('assert');
const { runScenarios, prow, D, REF_API, SALON_API, KUT_API, sampleSalon, PLAN_H: HP, ESKI_H: HE } = require('./harness.cjs');
const { Sheet } = require('./fakegas.cjs');

const T23 = '2026-09-23';
const stripDetay = (r) => (r.ok ? { ...r, data: r.data.map(({ detay, ...d }) => d) } : r);

/** Bugünün programını açar, idmana başlar, ilk setten reps tekrar yüzer, seans sonu → özet. */
async function toOzet(s, reps = 1) {
  await s.openToday();
  for (let i = 0; i < reps; i++) { await s.tap(60); await s.tap(i < reps - 1 ? 20 : 3); }
  await s.finishToOzet();
}

const S = [];
const sc = (name, fn) => S.push([name, fn]);

// --- Su kilidi -----------------------------------------------------------------
sc('Hızlı açılış: program tarih listesiyle gelir, getPlan beklenmez', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.net.delay.getPlan = 4000;
  await s.waitScreen('home');
  await p.waitForFunction(() => /set/.test(document.getElementById('home-swim-meta').textContent));
  assert.ok((await s.ls('ysk.plans'))[T23], 'bugünün programı önbellekte');
  await p.click('#home-swim'); await s.waitScreen('days');
  await p.waitForFunction(() => !document.getElementById('days-today-bar').hidden);
  const t = Date.now();
  await p.click('#days-today-btn');
  await s.waitScreen('program', 1500);
  assert.ok(Date.now() - t < 1500, `program ${Date.now() - t} ms'de açıldı`);
  assert.strictEqual(await s.title(), '1 × 200');
  assert.strictEqual((await s.ls('ysk.dates')).dates.some((d) => d.detay), false, 'detay tarih önbelleğinde tutulmaz');
});

sc('Arka plan yenileme: plan değiştiyse ve başlanmadıysa güncellenir', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.net.delay.getPlan = 1500;
  await s.openToday();
  s.env.sheets.Plan.data.find((r) => r[1] === 1 && r[4] === 200)[4] = 300;
  await p.waitForFunction(() => /güncellendi/.test(document.getElementById('toast').textContent), null, { timeout: 5000 });
  assert.strictEqual(await s.title(), '1 × 300');
  assert.strictEqual((await s.ls('ysk.plans'))[T23].setler[0].mesafe, 300);
});

sc('Arka plan yenileme: seansa başlandıysa program korunur', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.net.delay.getPlan = 1500;
  await s.openToday();
  await s.tap(3);
  s.env.sheets.Plan.data.find((r) => r[1] === 1 && r[4] === 200)[4] = 300;
  await p.waitForTimeout(2500);
  assert.strictEqual(await s.title(), '1 × 200');
  assert.strictEqual((await s.ls('ysk.plans'))[T23].setler[0].mesafe, 200, 'önbellek de korunur');
  await p.reload(); await s.waitScreen('program');
  assert.strictEqual(await s.title(), '1 × 200');
});

sc('Eski Code.gs (detay yok): yaklaşan günler arka planda indirilir, açılış hızlı', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.net.override = (b) => (b.action === 'getDates' ? stripDetay(s.env.call(b)) : null);
  await p.evaluate(() => localStorage.removeItem('ysk.plans'));
  await p.reload();
  await p.waitForFunction(() => { const pl = JSON.parse(localStorage.getItem('ysk.plans') || '{}'); return pl['2026-09-23'] && pl['2026-09-24']; }, null, { timeout: 8000 });
  assert.ok(!(await s.ls('ysk.plans'))['2026-09-20'], 'geçmiş gün indirilmez');
  s.net.delay.getPlan = 4000;
  const t = Date.now();
  await s.openToday();
  assert.ok(Date.now() - t < 3000);
});

sc('Eski Code.gs + önbellek yok: program istekle yüklenir, çift dokunma tek istek', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.net.override = (b) => (b.action === 'getDates' ? stripDetay(s.env.call(b)) : null);
  s.net.delay.getPlan = 1200;
  await p.reload(); await s.waitScreen('home');
  await p.evaluate(() => localStorage.removeItem('ysk.plans'));
  await p.click('#home-swim'); await s.waitScreen('days');
  await p.waitForFunction(() => !document.getElementById('days-today-bar').hidden);
  await p.evaluate(() => { localStorage.removeItem('ysk.plans'); const b = document.getElementById('days-today-btn'); b.click(); b.click(); b.click(); });
  await s.waitScreen('program', 6000);
  await p.waitForTimeout(1500);
  const n = s.net.calls.filter((c) => c === 'getPlan').length;
  assert.ok(n <= 3, `getPlan ${n} kez (önceden indirme dahil)`);
  assert.strictEqual(await s.title(), '1 × 200');
});

// --- Bağlantı ve sunucu hataları ------------------------------------------------------------
sc('İlk açılış çevrimdışı ve önbellek yok: anlaşılır uyarı', async ({ launch }) => {
  const s = await launch({ }); const p = s.page;
  s.net.offline = true;
  await p.evaluate(() => { localStorage.removeItem('ysk.dates'); localStorage.removeItem('ysk.plans'); });
  await p.reload();
  await p.waitForFunction(() => document.getElementById('home-swim-tag').textContent === 'Bağlantı yok');
  assert.match(await p.textContent('#home-swim-meta'), /Bağlantı kurulamadı/);
  await p.click('#home-swim'); await s.waitScreen('days');
  await p.waitForSelector('.banner-err');
  assert.ok(await p.isHidden('#days-today-bar'));
});

sc('Çevrimdışı ama önbellek var: liste ve program açılır', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /set/.test(document.getElementById('home-swim-meta').textContent));
  s.net.offline = true;
  await p.reload();
  await s.openToday();
  assert.strictEqual(await s.title(), '1 × 200');
});

sc('Geçersiz anahtar (AUTH): ana sayfa ve takvimde yönlendirme', async ({ launch }) => {
  const s = await launch({ storage: { 'ysk.config': { apiUrl: 'https://script.google.com/macros/s/TEST/exec', token: 'yanlis' } } }); const p = s.page;
  await p.waitForFunction(() => document.getElementById('home-swim-tag').textContent === 'Bağlantı yok');
  assert.match(await p.textContent('#home-swim-meta'), /anahtar/i);
  await p.click('#home-swim'); await s.waitScreen('days');
  await p.waitForSelector('.banner-err');
  assert.match(await s.text('.banner-err'), /Ayarlardan anahtarı kontrol edin/);
});

sc('Kalıcı sunucu hatası: modal → forma dön → kuyruğa al', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.net.override = (b) => (b.action === 'finishSession' ? { ok: false, error: 'PLAN_MISMATCH', message: 'Sıra 9 bulunamadı.' } : null);
  await toOzet(s, 1);
  await p.click('#oz-save');
  await s.waitModal('Kaydedilemedi');
  assert.match(await p.textContent('#modal-body'), /Sıra 9 bulunamadı.*PLAN_MISMATCH/s);
  await s.modalClick('Özete dön');
  assert.strictEqual(await s.screen(), 'ozet');
  assert.deepStrictEqual(await s.ls('ysk.queue'), null);
  await p.click('#oz-save');
  await s.waitModal('Kaydedilemedi');
  await s.modalClick('Kuyruğa al');
  await s.waitScreen('done');
  assert.strictEqual(await p.textContent('#done-title'), 'Kaydedilemedi');
  assert.strictEqual((await s.ls('ysk.queue')).length, 1);
  assert.strictEqual((await s.ls('ysk.history'))[0].status, 'queued');
  assert.strictEqual(await s.session(), null);
});

sc('Geçici hata (LOCKED): otomatik kuyruk, bağlantıda gönderilir, geçmiş "Tabloda" olur', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.net.override = (b) => (b.action === 'finishSession' ? { ok: false, error: 'LOCKED', message: 'meşgul' } : null);
  await toOzet(s, 2);
  await p.click('#oz-save');
  await s.waitScreen('done');
  assert.strictEqual((await s.ls('ysk.queue')).length, 1);
  s.net.override = null;
  await p.click('#done-back');
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('ysk.queue')).length === 0, null, { timeout: 8000 });
  assert.strictEqual(s.env.sheets.eski.getLastRow(), 3);
  assert.strictEqual((await s.ls('ysk.history'))[0].status, 'sent');
  await s.waitScreen('days');
  await p.waitForFunction(() => /Bu gün için plan yok/.test(document.getElementById('days-hero').textContent));
  assert.match(await s.text('#days-hero'), /23 Eylül/, 'kayıttan sonra takvimde bugün seçili');
  assert.ok(!(await s.text('#days-list')).includes('23'), 'kaydedilen gün listeden kalkar');
});

sc('Zaten kayıtlı (DUPLICATE): seansı kapat → geçmişte "Zaten kayıtlıydı"', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await toOzet(s, 1);
  const sh = s.env.sheets.seans; sh._row(1); sh.data[1] = [new s.env.CDate(Date.UTC(2026, 8, 23)), '', 0, 25, '', '', ''];
  await p.click('#oz-save');
  await s.waitModal('Bu seans zaten kayıtlı');
  await s.modalClick('Seansı kapat');
  await s.waitScreen('days');
  assert.strictEqual((await s.ls('ysk.history'))[0].status, 'duplicate');
  assert.strictEqual(s.env.sheets.eski.getLastRow(), 1, 'ikinci kez yazılmaz');
});

sc('Sunucu hata ayrıntısı gizli, başvuru numarası görünür', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  s.env.sheets.seans.failOn = 'write';
  await toOzet(s, 1);
  await p.click('#oz-save'); // SERVER geçicidir → kuyruk
  await s.waitScreen('done');
  const q = await s.ls('ysk.queue');
  assert.strictEqual(q[0].lastError.code, 'SERVER');
  assert.match(q[0].lastError.message, /başvuru: [0-9a-f]{8}/);
  assert.ok(!/write failed/.test(q[0].lastError.message));
  assert.strictEqual(s.env.sheets.eski.getLastRow(), 1, 'geri alındı');
});

// --- Form ------------------------------------------------------------------------------------
sc('Uzun program (40 set) ve uzun açıklama: açılır, gezinilir, kırpılmaz', async ({ launch }) => {
  const rows = [];
  const long = 'Her 25 metrede nefes 3-5-7, son 25 hızlı; dönüşlerde su altı dolfin en az 5, kol çekişi tam, ayak vuruşu sürekli ve ritmik, baş nötr.';
  for (let i = 1; i <= 40; i++) rows.push(prow(T23, i, ['WU', 'PS', 'MS', 'AS', 'CD'][i % 5], 2, 50, 'Swim', '00:50', '00:10'));
  rows[3][7] = long;
  const s = await launch({ rows }); const p = s.page;
  await s.openToday();
  assert.strictEqual(await p.$$eval('#prog-bar .seg', (e) => e.length), 40);
  assert.match(await p.textContent('#prog-dist'), /\/4\.000$/);
  await s.goTo(3);
  const d = await p.$eval('.w-item.is-active .w-desc', (e) => ({ sh: e.scrollHeight, ch: e.clientHeight }));
  assert.ok(d.sh <= d.ch + 1, 'uzun açıklama kırpılmamalı');
  await s.goTo(12);
});

// --- Kronometre ---------------------------------------------------------------------------------
sc('Hafta takvimi: plansız gün, sonraki hafta, Bugün düğmesi', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.waitScreen('home'); await p.click('#home-swim'); await s.waitScreen('days');
  await p.waitForSelector('.wd[data-day="2026-09-25"]');
  await p.click('.wd[data-day="2026-09-25"]');
  assert.match(await s.text('#days-hero'), /Bu gün için plan yok/);
  assert.ok(await p.isHidden('#days-today-bar'));
  const wk = await s.center('#wk');
  await p.mouse.move(wk.x + 80, wk.y); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(wk.x + 80 - i * 20, wk.y);
  await p.mouse.up(); await p.waitForTimeout(400);
  assert.strictEqual(await p.textContent('#wk-title'), '28 Eyl – 4 Eki');
  assert.strictEqual(await p.textContent('#wk-sum'), 'Plan yok');
  await p.click('#wk-today');
  assert.strictEqual(await p.textContent('#wk-title'), 'Bu hafta');
  assert.match(await s.text('#days-hero'), /23 Eylül/);
});

// --- Kuyruk ve geçmiş -------------------------------------------------------------------------------
const qItem = (tarih) => ({ id: `${tarih}-1`, createdAt: 1, tries: 1, lastError: { code: 'NETWORK', message: 'Bağlantı kurulamadı.' }, payload: { tarih, seans: {}, setler: [] } });
const hRec = (tarih, status) => ({ id: `h-${tarih}`, tarih, savedAt: 1, status, seans: { sure: '00:40:00', mesafe: 1500 }, setler: [{ blok: 'WU', tekrar: 1, mesafe: 300, tamamlandi: true }, { blok: 'MS', tekrar: 4, mesafe: 300, tamamlandi: true }] });

sc('Kuyruk yönetimi: bekleyen kaydı silmek, geçmişte "Gönderilmedi"', async ({ launch }) => {
  const s = await launch({ offline: true, storage: { 'ysk.queue': [qItem('2026-09-20')], 'ysk.history': [hRec('2026-09-20', 'queued')] } }); const p = s.page;
  await s.waitScreen('home');
  assert.match(await p.textContent('#home-history-meta'), /1 kayıt · 1 gönderilmeyi bekliyor/);
  await p.click('#home-swim'); await p.waitForSelector('.banner-warn');
  await p.click('[data-act="queue-manage"]');
  await p.click('#modal-body .pick');
  await s.waitModal('Kayıt silinsin mi?');
  await s.modalClick('Evet, sil');
  assert.deepStrictEqual(await s.ls('ysk.queue'), []);
  await p.click('#days-back'); await p.click('#home-history'); await s.waitScreen('history');
  assert.match(await s.text('.hist-row'), /Gönderilmedi/);
});

sc('Geçmiş: gönderilmemiş kayıt uyarısı, "tabloya gidenleri sil" kuyruktakini bırakır', async ({ launch }) => {
  const hist = [hRec('2026-09-22', 'sent'), hRec('2026-09-21', 'duplicate'), hRec('2026-09-20', 'queued')];
  const s = await launch({ offline: true, storage: { 'ysk.queue': [qItem('2026-09-20')], 'ysk.history': hist } }); const p = s.page;
  await s.waitScreen('home');
  await p.click('#home-history'); await s.waitScreen('history');
  const rows = await p.$$eval('.hist-row', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  assert.strictEqual(rows.length, 3);
  assert.match(rows[0], /Tabloda 2\/2 set · 1\.500 m · 40:00/);
  assert.match(rows[1], /Zaten kayıtlıydı/); assert.match(rows[2], /Kuyrukta/);
  await p.click('.hist-row >> nth=2');
  await s.modalClick('Bu kaydı sil');
  await s.waitModal('Henüz gönderilmedi');
  await s.modalClick('Vazgeç');
  assert.strictEqual(await p.$$eval('.hist-row', (e) => e.length), 3);
  await p.click('#hist-clear');
  await s.modalClick('Tabloya gidenleri sil (2)');
  assert.strictEqual(await p.$$eval('.hist-row', (e) => e.length), 1);
  assert.strictEqual((await s.ls('ysk.queue')).length, 1, 'kuyruk etkilenmez');
  await p.click('#hist-clear');
  await s.modalClick('Tümünü sil (1)');
  await s.waitModal('Gönderilmemiş kayıt var');
  await s.modalClick('Yine de sil');
  await p.waitForSelector('#hist-list .empty');
  assert.ok(await p.isHidden('#hist-bar'));
});

// --- Ayarlar ---------------------------------------------------------------------------------------
sc('Ayarlar: adres doğrulama, CSS doğrulama/kapatma, tempo bölgesi gösterimi', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.waitScreen('home'); await p.click('#home-settings'); await s.waitScreen('setup');
  for (const [url, re] of [['http://script.google.com/macros/s/X/exec', /script\.google\.com/], ['https://script.google.com/macros/s/X/dev', /\/dev/], ['https://script.google.com/macros/s/X/exec?a=1', /script\.google\.com/]]) {
    await p.fill('#setup-url', url); await p.click('#setup-save');
    assert.match(await p.textContent('#setup-msg'), re, url);
  }
  await p.fill('#setup-url', 'https://script.google.com/a/macros/alan.com/s/X-y_z/exec'); await p.fill('#setup-token', '');
  await p.click('#setup-save');
  assert.match(await p.textContent('#setup-msg'), /anahtar boş/i);
  await p.fill('#pref-css', 'abc'); await p.press('#pref-css', 'Tab');
  assert.match(await p.textContent('#toast'), /dd:ss/);
  assert.strictEqual((await s.ls('ysk.prefs') || { css: 117 }).css, 117);
  await p.fill('#pref-css', '0:10'); await p.press('#pref-css', 'Tab');
  assert.strictEqual((await s.ls('ysk.prefs') || { css: 117 }).css, 117, 'makul olmayan CSS reddedilir');
  await p.fill('#pref-css', ''); await p.press('#pref-css', 'Tab');
  assert.strictEqual((await s.ls('ysk.prefs')).css, null);
  assert.strictEqual(await p.$$eval('#pref-zones .zone', (e) => e.length), 0);
  await p.click('#pref-ses-test');
  assert.deepStrictEqual(await p.evaluate(() => window.__beeps), [880]);
  await p.click('#setup-back'); await s.openToday();
  await s.goTo(2);
  assert.strictEqual(await s.text('.w-item.is-active .w-pace'), 'Tempo 1:30/100', 'CSS yokken bölge yazılmaz');
});

sc('Kurulum: ilk açılış, hatalı anahtar, anahtarı unut, yeniden bağlan', async ({ launch }) => {
  const s = await launch({ configured: false }); const p = s.page;
  await s.waitScreen('setup');
  assert.ok(await p.isHidden('#setup-back')); assert.ok(await p.isHidden('#setup-prefs'));
  await p.fill('#setup-url', 'https://script.google.com/macros/s/TEST/exec');
  await p.fill('#setup-token', 'yanlis'); await p.click('#setup-save');
  await p.waitForFunction(() => /anahtar hatalı/i.test(document.getElementById('setup-msg').textContent));
  await p.fill('#setup-token', 'secret'); await p.click('#setup-save');
  await s.waitScreen('home');
  await p.click('#home-settings');
  await p.click('#setup-forget'); await s.waitModal('Anahtarlar unutulsun mu?');
  await s.modalClick('Evet, unut');
  await p.waitForFunction(() => document.getElementById('setup-title').textContent === 'Kurulum');
  await p.reload(); await s.waitScreen('setup');
  await p.fill('#setup-url', 'https://script.google.com/macros/s/TEST/exec'); await p.fill('#setup-token', 'secret');
  await p.click('#setup-save'); await s.waitScreen('home');
});

// --- sporRef ------------------------------------------------------------------------------------
sc('sporRef: CSS güne/havuza/alete göre; 7 bölge; Ayarlar özeti; elle CSS gizli', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.ref'));
  await s.openToday();
  // WU 1×200 4:00 → 2:00/100, CSS 2:00 (25 m, 06.07–30.09) → EN3
  assert.strictEqual(await s.text('.w-item.is-active .w-pace'), 'Tempo 2:00/100 · EN3');
  assert.ok(await p.$('.w-item.is-active .w-pace b.zc.z4'));
  await s.goTo(1); // Drill: bölge yok (13.2.0: TEC etiketi)
  assert.strictEqual(await s.text('.w-item.is-active .w-pace'), 'Tempo 2:10/100 · TEC');
  await s.goTo(2); // 1:30/100, CSS 2:00 → fark −30 → SP3
  assert.strictEqual(await s.text('.w-item.is-active .w-pace'), 'Tempo 1:30/100 · SP3');
  await s.goTo(3); // Pull, alet "Şamandıra" = PB → CSS 1:52; 1:40 → fark −12 → SP2
  assert.strictEqual(await s.text('.w-item.is-active .w-pace'), 'Tempo 1:40/100 · SP2');
  await p.evaluate(() => { localStorage.setItem('ysk.prefs', JSON.stringify({ ses: true, css: 117, havuz: 50 })); localStorage.removeItem('ysk.session'); });
  await p.reload(); await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.ok(await p.isHidden('#pref-css-field'));
  assert.match(await s.text('#pref-css-ref'), /idmanRef'ten: 1:55 \/100 m 06\.07–30\.09 · 50 m/);
  assert.doesNotMatch(await s.text('#pref-css-ref'), /güncel değil/);
  assert.strictEqual(await p.$$eval('#pref-zones .zone', (e) => e.length), 7);
  assert.match(await s.text('#pref-zones .z4'), /EN3\s*Yüksek Aerobik\s*1:52 – 1:58/);
  assert.match(await s.text('#pref-zones .z1'), /REC\s*Toparlanma\s*2:16 ve üstü/);
  assert.match(await s.text('#pref-zones .z7'), /SP3\s*Yüksek Spriniti\s*1:36 altı/);
});

sc('sporRef: bugünü kapsayan CSS yoksa en son değer ve "güncel değil" uyarısı; bağlantı yokken önbellek', async ({ launch }) => {
  const s = await launch({ ref: true, time: '2026-10-05T07:00:00' }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.ref'));
  s.net.offline = true;
  await p.reload(); await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.match(await s.text('#pref-css-ref'), /2:00 .*CSS güncel değil/);
});

sc('sporRef beklenmeyen cevap verirse çökmez: idman açılır, Ayarlar sebebi yazar, elle CSS kullanılır', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  s.net.override = (b) => (b.action === 'getRef' ? { ok: true, data: { uygulama: 'başka betik' } } : null);
  await p.evaluate(() => { localStorage.removeItem('ysk.ref'); localStorage.setItem('ysk.prefs', JSON.stringify({ ses: true, css: 117, havuz: 25 })); }); // 13.2.0: varsayılan CSS yok, elle girilmiş
  await p.reload(); await s.waitScreen('home');
  await s.openToday();
  await s.goTo(2);
  assert.strictEqual(await s.text('.w-item.is-active .w-pace'), 'Tempo 1:30/100 · SP3', 'elle CSS 1:57 ile');
  await s.tap(30); await s.tap(3);
  assert.deepStrictEqual(s.errors, []);
  await p.evaluate(() => { localStorage.removeItem('ysk.session'); });
  await p.reload(); await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  await p.waitForFunction(() => /idmanRef okunamadı: idmanRef cevabı beklenen biçimde değil/.test(document.getElementById('pref-css-ref').textContent));
  assert.ok(await p.isVisible('#pref-css-field'), 'elle CSS alanı görünür');
  // Önbellekte geçerli veri varken: o kullanılır, uyarı yine yazılır
  s.net.override = null;
  await p.reload(); await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.ref'));
  s.net.override = (b) => (b.action === 'getRef' ? { ok: true, data: {} } : null);
  await p.reload(); await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  await p.waitForFunction(() => /idmanRef'ten: 2:00.*Son okuma başarısız/.test(document.getElementById('pref-css-ref').textContent));
  assert.deepStrictEqual(s.errors, []);
});

sc('Kurulum: 2 bağlantı (13.2: idman + idmanRef); isteğe bağlı boş geçilir; eksik/yanlış/aynı adres uyarısı', async ({ launch }) => {
  const s = await launch({ configured: false }); const p = s.page;
  await s.waitScreen('setup');
  assert.equal(await p.$$eval('#setup-salon-url', (e) => e.length), 0, 'ayrı salon bağlantısı yok');
  await p.fill('#setup-url', 'https://script.google.com/macros/s/TEST/exec'); await p.fill('#setup-token', 'secret');
  await p.fill('#setup-ref-url', REF_API);
  await p.click('#setup-save');
  assert.match(await s.text('#setup-msg'), /^idmanRef: anahtar boş/);
  await p.fill('#setup-ref-url', 'https://script.google.com/macros/s/TEST/exec'); await p.fill('#setup-ref-token', 'refkey');
  await p.click('#setup-save');
  assert.match(await s.text('#setup-msg'), /adresi farklı olmalı/);
  await p.fill('#setup-ref-url', REF_API); await p.fill('#setup-ref-token', 'yanlis');
  await p.click('#setup-save');
  await p.waitForFunction(() => /idmanRef: anahtar hatalı/.test(document.getElementById('setup-msg').textContent));
  assert.ok(await p.isVisible('#setup-back'), 'yüzme bağlandı: geri dönülebilir');
  await p.fill('#setup-ref-token', 'refkey'); await p.click('#setup-save');
  await s.waitScreen('home');
  const cfg = await s.ls('ysk.config');
  assert.deepStrictEqual(cfg.ref, { apiUrl: REF_API, token: 'refkey' });
  assert.strictEqual(cfg.salon, undefined);
  assert.ok(await s.ls('ysk.ref'), 'sporRef önbelleğe alındı');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.strictEqual(await p.inputValue('#setup-ref-token'), 'refkey');
  assert.ok(await p.isVisible('#pref-css-ref'));
});

sc('13.4 Kurulum: 3. bağlantı idmanKutuphane; kara kataloğu ve kas etkileri oradan gelir (idmanRef\'te yokken); yanlış anahtar uyarısı', async ({ launch }) => {
  const s = await launch({ salon: true, kut: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.kutuphane') && localStorage.getItem('ysk.salon'));
  assert.equal((await s.ls('ysk.ref')).data.katalog.length, 0, 'idmanRef\'te katalog yok');
  assert.deepStrictEqual((await s.ls('ysk.kutuphane')).data.katalog.map((k) => k.ad).slice(0, 2), ['Band Bent Over Row', 'Standard Pull-up']);
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan');
  await p.click('[data-sp-grup="Back"]'); await p.click('#sp-next');
  assert.ok(await p.$('[data-sp-ex="Band Bent Over Row"]'), 'katalog idmanKutuphane\'den');
  await p.click('#sp-back'); await p.click('#sp-back');
  await p.click('#ss-back'); await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.strictEqual(await p.inputValue('#setup-lib-url'), KUT_API);
  await p.fill('#setup-lib-token', 'yanlis'); await p.click('#setup-save');
  await p.waitForFunction(() => /idmanKutuphane: anahtar hatalı/.test(document.getElementById('setup-msg').textContent));
  await p.fill('#setup-lib-token', 'kutkey'); await p.click('#setup-save');
  await s.waitScreen('home');
  assert.deepStrictEqual((await s.ls('ysk.config')).kutuphane, { apiUrl: KUT_API, token: 'kutkey' });
});

// --- Düzen ---------------------------------------------------------------------------------------------

// --- Zamanlama modeli (ZAMANLAMA.md) ---------------------------------------------------------
// Örnek plan (harness): 0 WU 1×200 (4:00/0:20) · 1 PS 4×50 Drill (1:05/0:15) · 2 MS 4×100 (1:30/0:20)
//                       3 AS 2×100 Pull (1:40/0:20) · 4 CD 1×200 (4:30/—)
const col = (h) => ['Tarih', 'Sıra', 'Blok', 'Tekrar', 'Mesafe', 'Stil', 'Tür', 'Açıklama', 'Hedef', 'Dinlen', 'Alet', 'Gerçek', 'Kulaç', 'Nabız', 'RPE', 'MSI', 'Not'].indexOf(h);
const sec = (v) => Math.round(v * 86400 * 100) / 100;
const isOn = (p, sel) => p.$eval(sel, (e) => e.classList.contains('is-on'));

sc('Tam idman: 12 tekrar, otomatik set geçişi, son DUR idmanı bitirir, 3 dokunuşla kayıt', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  assert.strictEqual(await s.label(), 'YÜZ');
  assert.strictEqual(await s.sub(), 'İdman ve 1. tekrar başlar');
  let total = 0;
  const A = async (x) => { await s.adv(x); total += x + 0.25; };
  const plan = [[1, 240, 20], [4, 65, 15], [4, 90, 20], [2, 100, 20], [1, 270, 0]];
  for (let si = 0; si < plan.length; si++) {
    const [n, rep, rest] = plan[si];
    for (let r = 0; r < n; r++) {
      assert.strictEqual(await s.label(), 'YÜZ', `set ${si} tekrar ${r + 1} ${JSON.stringify(await s.events())} modal:${await p.isVisible('#modal')}`);
      await s.press(); await A(rep);
      assert.strictEqual(await s.label(), 'DUR');
      await s.press();
      if (si === plan.length - 1 && r === n - 1) break;
      await A(rest);
      if (r === n - 1) { await p.waitForTimeout(700); assert.strictEqual(await s.activeIdx(), si + 1, 'kart sonraki sete geçer'); }
    }
  }
  await s.waitScreen('rpe');
  assert.match(await p.textContent('#rpe-info'), /1\.200 m · 5 set/);
  await p.click('#rpe-grid button[data-v="7"]'); await s.waitScreen('msi');
  await p.click('#msi-none'); await s.waitScreen('ozet');
  assert.strictEqual(await p.textContent('#oz-mesafe'), '1.200');
  const notes = await p.$$eval('.oz-set', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  assert.strictEqual(notes.length, 5);
  assert.match(notes[1], /4 × 50 FR Drill ort\. 1:05\.\d ✓ Tekrarlar: 1:05, 1:05, 1:05, 1:05$/);
  assert.ok(!/Dinlenme/.test(notes.join()), 'plana uygun dinlenmede not önerilmez');
  await p.click('#oz-save'); await s.waitScreen('done');
  const eski = s.env.sheets.eski.data.slice(1);
  assert.deepStrictEqual(eski.map((r) => [r[col('Sıra')], r[col('Blok')]]), [['', 'WU'], ['', 'PS'], ['', 'MS'], ['', 'AS'], ['', 'CD']], 'Sıra boş, plan sırası');
  const g = eski.map((r) => sec(r[col('Gerçek')]));
  [240, 65, 90, 100, 270].forEach((x, i) => assert.ok(Math.abs(g[i] - x) < 0.6, `Gerçek ${i}: ${g[i]}`));
  assert.strictEqual(eski[0][col('Not')], '', 'tek tekrarlı sette tekrar notu yok');
  assert.match(eski[1][col('Not')], /^Tekrarlar: 1:05, 1:05, 1:05, 1:05$/);
  const se = s.env.sheets.seans.data[1];
  assert.ok(Math.abs(sec(se[1]) - total) < 5,  `süre ${sec(se[1])} ≈ ${total}`);
  assert.deepStrictEqual([se[2], se[3], se[4], se[5]], [1200, 25, 7, '']);
  const h = (await s.ls('ysk.history'))[0];
  assert.deepStrictEqual(h.setler.map((x) => x.yapilan), [1, 4, 4, 2, 1]);
});

sc('Dinlenme sayacı: 3-2-1 kısa + 0 uzun, eksiye kırmızı; ses düğmesi kapatınca çalmaz', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(60); // ilk YÜZ: idman + 1×200 başlar
  await s.press();       // DUR → set sonu dinlenmesi (Dinlen 0:20)
  await s.adv(16);
  assert.deepStrictEqual(await p.evaluate(() => window.__beeps), [660], 'DUR onay sesi');
  for (let i = 0; i < 12; i++) await p.clock.runFor(500);
  assert.deepStrictEqual(await p.evaluate(() => window.__beeps), [660, 880, 880, 880, 1320]);
  await p.waitForTimeout(700);
  const big = await p.$eval('.w-item.is-active .w-tbig', (e) => ({ t: e.textContent, c: e.className }));
  assert.match(big.t, /^−0:0\d$/); assert.match(big.c, /\br\b/);
  assert.strictEqual(await s.text('.w-item.is-active .w-tmode'), 'DİNLENME UZADI');
  await p.click('#btn-sound');
  assert.strictEqual(await s.text('#btn-sound'), 'Ses kapalı');
  assert.strictEqual((await s.ls('ysk.prefs')).ses, false);
  await s.tap(65); await s.press(); await s.adv(10);
  for (let i = 0; i < 12; i++) await p.clock.runFor(500);
  assert.deepStrictEqual(await p.evaluate(() => window.__beeps), [660, 880, 880, 880, 1320], 'ses kapalıyken bip yok');
});

sc('Çift dokunma koruması (2 sn) ve Geri al (5 sn)', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.press(); await p.clock.runFor(800); await s.press();
  assert.deepStrictEqual(await s.events(), ['basla', 'cik0'], '2 sn içindeki ikinci dokunuş yok sayılır');
  await s.adv(30); await s.press(); // DUR → set tamam, sonraki sete geçer
  await p.clock.runFor(300);
  assert.ok(await isOn(p, '#btn-undo'));
  await p.click('#btn-undo');
  assert.deepStrictEqual(await s.events(), ['basla', 'cik0']);
  assert.strictEqual(await s.label(), 'DUR');
  await p.waitForTimeout(800);
  assert.strictEqual(await s.activeIdx(), 0, 'yüzülen sete döner');
  await s.press(); await p.clock.runFor(300);
  assert.ok(await isOn(p, '#btn-undo'));
  await s.adv(6);
  assert.ok(!(await isOn(p, '#btn-undo')), '5 sn sonra söner');
});

sc('Yüzerken setler kaydırılamaz ve ‹ çalışmaz', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.press(); await p.clock.runFor(1000);
  const w = await s.center('#wheel');
  await p.mouse.move(w.x, w.y);
  for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 80); await p.waitForTimeout(300); }
  await p.mouse.move(w.x, w.y); await p.mouse.down(); await p.mouse.move(w.x, w.y - 200, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(500);
  assert.strictEqual(await s.activeIdx(), 0);
  await p.click('#prog-back');
  assert.match(await p.textContent('#toast'), /Yüzerken/);
  assert.ok(await p.isHidden('#modal'));
  assert.strictEqual(await s.screen(), 'program');
});

sc('Seti erken bitirme: dinlenirken kaydır → uyarı → YÜZ n/N; geri kaydırmak vazgeçer', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(240); await s.tap(20);
  await p.waitForTimeout(700);
  await s.tap(65); await s.tap(15); await s.tap(65); await s.tap(10); // 4×50: 2 tekrar
  await s.goTo(2);
  assert.match(await s.text('.w-item.is-active .w-banner'), /4 × 50 FR 2\/4'te kapanacak · 2 tekrar yapılmadı/);
  assert.strictEqual(await s.sub(), '4 × 100 FR Swim · 1. tekrar');
  await s.goTo(1);
  assert.strictEqual(await s.sub(), '3. tekrar başlar');
  assert.strictEqual(await p.$$eval('.w-item.is-active .w-banner', (e) => e.length), 0);
  await s.goTo(2);
  await s.tap(90);
  assert.deepStrictEqual((await s.events()).slice(-1), ['cik2']);
  assert.match(await p.$eval('.w-item >> nth=1', (e) => e.querySelector('.w-nm').textContent), /· 2\/4$/);
  await s.tap(3); // DUR
  await s.finishToOzet();
  const ps = await p.$eval('.oz-set >> nth=1', (e) => e.innerText.replace(/\s+/g, ' '));
  assert.match(ps, /✓ 2\/4 tekrar yapıldı/);
  await p.click('#oz-save'); await s.waitScreen('done');
  const eski = s.env.sheets.eski.data.slice(1);
  assert.strictEqual(eski.length, 3);
  assert.match(eski[1][col('Not')], /^Tekrarlar: 1:05, 1:05 \| 2\/4 tekrar yapıldı$/);
  assert.strictEqual(s.env.sheets.seans.data[1][2], 400, 'mesafe = yapılan tekrarlar');
});

sc('‹ paneli: devam et, takvime dön, idmanı bitir; RPE\'de İdmana dön', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(60); await s.tap(5);
  await p.click('#prog-back'); await s.waitModal('İdmanı bitir?');
  assert.match(await p.textContent('#modal-body'), /1 set tam · 200 m/);
  await s.modalClick('Devam et');
  assert.strictEqual(await s.screen(), 'program');
  await p.click('#prog-back'); await s.waitModal('İdmanı bitir?');
  await s.modalClick('Takvime dön');
  await s.waitScreen('days'); await p.waitForSelector('.banner-live');
  await p.click('[data-act="resume"]'); await s.waitScreen('program');
  await p.click('#prog-back'); await s.waitModal('İdmanı bitir?');
  await s.modalClick('İdmanı bitir ve kaydet');
  await s.waitScreen('rpe');
  await p.click('#rpe-back'); await s.waitScreen('program');
  assert.deepStrictEqual(await s.events(), ['basla', 'cik0', 'geldim'], 'yalnızca bitiş geri alınır');
  assert.strictEqual(await s.label(), 'YÜZ');
});

sc('Son setin son DUR\'u idmanı bitirir; "İdmana dön" son tekrarı geri getirir', async ({ launch }) => {
  const s = await launch({ rows: [prow(T23, 1, 'MS', 2, 100, 'Swim', '01:30', '00:20')] }); const p = s.page;
  await s.openToday();
  await s.tap(90); await s.tap(20); await s.tap(90);
  await s.press();
  await s.waitScreen('rpe');
  assert.ok(await p.isVisible('#rpe-undo'));
  await p.click('#rpe-undo'); await s.waitScreen('program');
  assert.strictEqual(await s.label(), 'DUR');
  assert.deepStrictEqual((await s.events()).slice(-1), ['cik0']);
  await s.adv(3); await s.press(); await s.waitScreen('rpe');
  await s.adv(6);
  assert.ok(await p.isHidden('#rpe-undo'), '5 sn sonra gizlenir');
});

sc('Şüpheli tekrar: işaretlenir, düzeltilir, ortalamaya yansır', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(240); await s.tap(20);
  await p.waitForTimeout(700);
  for (const [r, last] of [[65, 0], [64, 0], [150, 0], [66, 1]]) { await s.tap(r); await s.tap(last ? 3 : 15); }
  await s.finishToOzet();
  assert.match(await s.text('.oz-sus'), /3\. tekrar 2:30 — düzelt/);
  await p.click('.oz-sus');
  await p.waitForSelector('#ed-sheet:not([hidden])');
  assert.strictEqual(await p.textContent('#ed-val'), '1:05');
  await p.click('[data-step="1"]');
  assert.strictEqual(await p.textContent('#ed-apply'), '1:06 olarak düzelt');
  await p.click('#ed-apply');
  assert.ok(await p.isHidden('#ed-sheet'));
  assert.match(await s.text('.oz-sus'), /\(düzeltildi\)/);
  assert.match(await s.text('.oz-set >> nth=1'), /Tekrarlar: 1:05, 1:04, 1:06, 1:06/);
  await p.click('#oz-save'); await s.waitScreen('done');
  const g = sec(s.env.sheets.eski.data[2][col('Gerçek')]);
  assert.ok(Math.abs(g - 65.44) < 0.3, `ortalama ${g}`);
});

sc('Dinlenme notu: sapma varsa önerilir (işaretsiz), işaretlenince nota yazılır', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(240); await s.tap(20);
  await p.waitForTimeout(700);
  for (let i = 0; i < 4; i++) { await s.tap(65); await s.tap(i < 3 ? 30 : 40); }
  await p.waitForTimeout(700);
  await s.tap(90); await s.tap(3);
  await s.finishToOzet();
  const line = await p.$('.oz-set >> nth=1 >> button[data-line="rest"]');
  assert.match(await line.textContent(), /Dinlenme: 0:30, 0:30, 0:30 \(ort\. \+15 sn\) · Set sonu 0:4\d/);
  assert.ok(!(await line.$eval('.cb', (e) => e.classList.contains('on'))), 'varsayılan işaretsiz');
  await line.click();
  assert.ok(await p.$eval('.oz-set >> nth=1 >> button[data-line="rest"] .cb', (e) => e.classList.contains('on')));
  await p.click('#oz-save'); await s.waitScreen('done');
  assert.match(s.env.sheets.eski.data[2][col('Not')], /Tekrarlar: .* \| Dinlenme: 0:30, 0:30, 0:30 \(ort\. \+15 sn\) · Set sonu 0:4\d$/);
});

sc('Seans sonu: MSI bölge döngüsü, RPE, havuz, hazır ifade; havuz hatırlanır', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(60); await s.tap(3);
  await p.click('#prog-back'); await s.modalClick('İdmanı bitir ve kaydet');
  await s.waitScreen('rpe'); await p.click('#rpe-grid button[data-v="4"]');
  await s.waitScreen('msi');
  assert.ok(await p.isHidden('#msi-next'));
  for (let i = 0; i < 3; i++) await p.click('#msi-body button[data-bolge="sag omuz"]');
  for (let i = 0; i < 6; i++) await p.click('#msi-body button[data-bolge="bel"]');
  assert.strictEqual(await s.text('#msi-body button[data-bolge="sag omuz"] em'), '1,5');
  assert.strictEqual(await s.text('#msi-body button[data-bolge="bel"] em'), '—', 'döngü boşa döner');
  await p.click('#msi-next'); await s.waitScreen('ozet');
  assert.strictEqual(await p.textContent('#oz-msi'), 'sağ omuz 1,5');
  assert.strictEqual(await p.textContent('#oz-rpe'), '4');
  await p.click('#oz-havuz button[data-v="50"]');
  await p.click('#oz-chips button[data-chip="Yorgun"]');
  await p.fill('#oz-aciklama', 'kısa not');
  await p.click('#oz-rpe-box'); await s.waitScreen('rpe');
  await p.click('#rpe-grid button[data-v="6"]'); await s.waitScreen('msi');
  await p.click('#msi-next'); await s.waitScreen('ozet');
  assert.strictEqual(await p.inputValue('#oz-aciklama'), 'kısa not');
  await p.click('#oz-save'); await s.waitScreen('done');
  const r = s.env.sheets.seans.data[1];
  assert.deepStrictEqual([r[3], r[4], r[5], r[6]], [50, 6, 'sag omuz 1.5', 'Yorgun. kısa not']);
  assert.strictEqual((await s.ls('ysk.prefs')).havuz, 50);
});

sc('Yeniden açılış: yüzerken, dinlenirken ve özet ekranında kaldığı yerden', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(40);
  await p.reload(); await s.waitScreen('program'); await p.waitForTimeout(300);
  assert.strictEqual(await s.label(), 'DUR');
  assert.match(await p.textContent('.w-item.is-active .w-tbig'), /^0:4\d$/);
  await s.press(); await s.adv(5);
  await p.waitForTimeout(700);
  await p.reload(); await s.waitScreen('program'); await p.waitForTimeout(300);
  assert.strictEqual(await s.label(), 'YÜZ');
  assert.strictEqual(await s.activeIdx(), 1);
  assert.match(await p.textContent('.w-item.is-active .w-tbig'), /^0:1\d$/);
  await s.finishToOzet();
  await p.fill('#oz-aciklama', 'kalsın');
  await p.reload(); await s.waitScreen('ozet');
  assert.strictEqual(await p.inputValue('#oz-aciklama'), 'kalsın');
  assert.strictEqual(await p.textContent('#oz-rpe'), '7');
});

sc('Sürüm 9 seansı yeni modele taşınır (işaretler ve turlar korunur)', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /set/.test(document.getElementById('home-swim-meta').textContent));
  await p.evaluate(() => localStorage.setItem('ysk.session', JSON.stringify({
    tarih: '2026-09-23', startedAt: Date.now() - 600000, endedAt: null, done: { 1: true }, results: { 1: { gercek: '03:58.0' } },
    pos: 1, screen: 'stopwatch', form: null, sw: { running: false, segStart: null, segAcc: 0, laps: [61000], repStart: null, set: 0 },
  })));
  await p.reload(); await s.waitScreen('program');
  const ses = await s.session();
  assert.strictEqual(ses.v, 2);
  assert.deepStrictEqual(ses.events.map((e) => e.t), ['basla']);
  assert.strictEqual(await p.$$eval('.w-item.is-done', (e) => e.length), 1);
  assert.match(await p.textContent('#prog-clock'), /^10:0\d$/);
  await s.finishToOzet();
  await p.click('#oz-save'); await s.waitScreen('done');
  const e = s.env.sheets.eski.data.slice(1);
  assert.strictEqual(e.length, 1);
  assert.ok(Math.abs(sec(e[0][col('Gerçek')]) - 238) < 0.1);
  assert.strictEqual(e[0][col('Not')], 'Turlar: 01:01.0');
});

sc('Seans sürerken başka güne geçmek onay ister', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(60); await s.tap(3);
  await p.click('#prog-back'); await s.modalClick('Takvime dön');
  await s.waitScreen('days');
  await p.waitForSelector('.banner-live');
  await p.click('.day-row[data-tarih="2026-09-24"]');
  await p.click('#days-today-btn');
  await s.waitModal('Devam eden seans var');
  await s.modalClick('Vazgeç');
  assert.strictEqual((await s.session()).tarih, T23);
  await p.click('#days-today-btn');
  await s.waitModal('Devam eden seans var');
  await s.modalClick('Sil ve geç');
  await s.waitScreen('program');
  assert.strictEqual((await s.session()).tarih, '2026-09-24');
  assert.strictEqual(await s.title(), '1 × 400');
});

sc('Gezinme: tüm geri tuşları, seanssız ve seanslı dönüş', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.waitScreen('home');
  await p.click('#home-swim'); await s.waitScreen('days');
  await p.click('#days-back'); await s.waitScreen('home');
  await p.click('#home-history'); await s.waitScreen('history');
  await p.click('#hist-back'); await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.strictEqual(await p.textContent('#setup-title'), 'Ayarlar');
  await p.click('#setup-back'); await s.waitScreen('home');
  await p.click('#home-gym'); await s.waitScreen('setup'); // salon kurulmadı → Ayarlar
  await p.click('#setup-back'); await s.waitScreen('home');
  await s.openToday();
  await p.click('#prog-back'); await s.waitScreen('days');
  assert.strictEqual(await s.session(), null, 'başlanmamış seans silinir');
  await p.click('#days-today-btn'); await s.waitScreen('program');
  await s.tap(60); await s.tap(3);
  await p.click('#prog-back'); await s.modalClick('Takvime dön'); await s.waitScreen('days');
  await p.click('#days-back'); await s.waitScreen('home');
  assert.match(await p.textContent('#home-swim-tag'), /^Bugün · Çarşamba 23 Eylül DEVAM EDİYOR$/);
  assert.strictEqual(await p.textContent('#home-open-text'), 'Seansa devam et');
  await p.click('#home-swim'); await s.waitScreen('days'); // Takvim seansı sürdürmez, takvimi açar
  await p.waitForSelector('.banner-live');
  await p.click('#days-back'); await s.waitScreen('home');
  await p.click('#home-open'); await s.waitScreen('program');
  assert.deepStrictEqual(await s.events(), ['basla', 'cik0', 'geldim']);
});

sc('Ana sayfa: Yüzme kartında ilk planlı idman; İdmanı aç doğrudan girer, Takvim takvimi açar', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /set/.test(document.getElementById('home-swim-meta').textContent));
  assert.strictEqual(await p.textContent('#home-swim-tag'), 'Bugün · Çarşamba 23 Eylül');
  assert.match(await p.textContent('#home-swim-meta'), /^\d+ set · [\d.]+ m · \d+:\d\d( · ana set [\d.]+ m)?$/);
  assert.ok(await p.$('#home-swim-metro svg.metro'), 'blok renkli hat');
  assert.strictEqual(await p.textContent('#home-open-text'), 'İdmanı aç');
  assert.strictEqual(await p.$$eval('.home-card .hc-hd .hc-name', (e) => e.map((x) => x.textContent).join(',')), 'Yüzme,Kara');
  // Bölüm renkleri: Yüzme turkuaz, Salon amber
  const colors = await p.$$eval('.home-card', (e) => e.map((x) => getComputedStyle(x, '::before').backgroundColor));
  assert.deepStrictEqual(colors, ['rgb(45, 212, 191)', 'rgb(245, 165, 36)']);
  await p.click('#home-open'); await s.waitScreen('program');
  assert.match(await s.title(), /×/);
  await p.click('#prog-back'); await s.waitScreen('days'); await p.click('#days-back'); await s.waitScreen('home');
  await p.click('#home-swim'); await s.waitScreen('days');
  await p.click('#days-back');
  // Bugünün idmanı bitince yarınki gösterilir
  await toOzet(s, 1); await p.click('#oz-save'); await s.waitScreen('done'); await p.click('#done-back'); await s.waitScreen('days');
  await p.click('#days-back'); await s.waitScreen('home');
  await p.waitForFunction(() => /Yarın/.test(document.getElementById('home-swim-tag').textContent));
  assert.strictEqual(await p.textContent('#home-swim-tag'), 'Yarın · Perşembe 24 Eylül');
  await p.click('#home-open'); await s.waitScreen('program');
  assert.strictEqual((await s.session()).tarih, '2026-09-24');
});

sc('Seti sıfırla: SET TAMAM\'a dokununca onay; set silinir, yeniden yapılır; diğer setler korunur', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(240); await s.tap(20);          // 1×200 tamam → 4×50'ye geçer
  await p.waitForTimeout(700);
  await s.tap(65); await s.tap(15);                            // 4×50: 1 tekrar
  await s.goTo(0);
  assert.strictEqual(await s.label(), 'SET TAMAM');
  await s.press(); await s.waitModal('Bu seti sıfırla?');
  await s.modalClick('Vazgeç');
  assert.strictEqual(await s.label(), 'SET TAMAM');
  assert.strictEqual((await s.events()).length, 5);
  await s.press(); await s.waitModal('Bu seti sıfırla?');
  assert.match(await p.textContent('#modal-body'), /1\/1 tekrar/);
  await s.modalClick('Seti sıfırla');
  assert.deepStrictEqual(await s.events(), ['basla', 'cik1', 'geldim'], '1. setin olayları silinir, 2. set kalır');
  assert.strictEqual(await s.activeIdx(), 0);
  assert.strictEqual(await s.label(), 'YÜZ');
  assert.ok(!(await p.$eval('.w-item >> nth=0', (e) => e.classList.contains('is-done'))));
  assert.strictEqual((await p.textContent('#prog-dist')).replace(/\s/g, '').split('/')[0], '50');
  await s.tap(230); await s.tap(5);                            // seti yeniden yap
  const ses = await s.session();
  assert.strictEqual(ses.events.filter((e) => e.t === 'cik' && e.set === 0).length, 1);
  await s.finishToOzet();
  const notes = await p.$$eval('.oz-set', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ')));
  assert.match(notes[0], /ort\. 3:50/);
  assert.match(notes[1], /1\/4 tekrar yapıldı/);
});

sc('13.8 Etiket: plandan gelir (ayrıntı paneli, özet), idmanda Düzenle ile değişir; yuzmeVeri Etiket sütununa yazılır, Not\'a plan farkı girmez', async ({ launch }) => {
  const rows = [[...prow(T23, 1, 'WU', 1, 100, 'Swim', '02:00', '00:20'), 'Isınma'], [...prow(T23, 2, 'MS', 1, 100, 'Swim', '01:40', ''), 'Aerobik Taban -1']];
  const s = await launch({ rows, planH: [...HP, 'Etiket'], eskiH: [...HE, 'Etiket'] }); const p = s.page;
  await s.openToday();
  await p.click('#wheel .w-item.is-active .w-card'); await p.waitForSelector('#detail:not([hidden])');
  assert.match(await p.textContent('#detail'), /🏷 Isınma/);
  await p.click('#detail [data-dact="edit"]'); await p.waitForSelector('#eset:not([hidden])');
  assert.strictEqual(await p.inputValue('#eset-etiket'), 'Isınma');
  await p.fill('#eset-etiket', 'Isınma kolay');
  await p.click('#eset-save');
  await p.waitForFunction(() => document.getElementById('eset').hidden);
  assert.strictEqual((await s.session()).setler[0].etiket, 'Isınma kolay');
  await s.tap(120); await s.tap(20);                            // 1. set
  await p.waitForTimeout(700);
  await s.tap(50);                                              // 2. set yüzülüyor: Düzenle kapalı, etiket yazılabilir
  await p.click('#wheel .w-item.is-active .w-card'); await p.waitForSelector('#detail:not([hidden])');
  await p.click('#detail [data-dact="etiket"]'); await s.waitModal('etiket');
  await p.fill('#etk-in', 'Aerobik Taban -1 (hızlı)'); await s.modalClick('Kaydet');
  await s.adv(50); await s.press();                             // 2. set biter (son set → idman biter)
  await s.waitScreen('rpe'); await p.click('#rpe-grid button[data-v="7"]');
  await s.waitScreen('msi'); await p.click('#msi-none'); await s.waitScreen('ozet');
  assert.deepStrictEqual(await p.$$eval('.oz-etiket', (e) => e.map((x) => x.textContent)), ['🏷 Isınma kolay', '🏷 Aerobik Taban -1 (hızlı)']);
  await p.click('#oz-save'); await s.waitScreen('done');
  const E = s.env.sheets.eski.data;
  const ci = E[0].indexOf('Etiket');
  assert.deepStrictEqual(E.slice(1, 3).map((x) => x[ci]), ['Isınma kolay', 'Aerobik Taban -1 (hızlı)']);
  assert.doesNotMatch(E[1][col('Not')], /Plan:/, 'yalnız etiket değişince not yok');
});

sc('13.7 Mesafe düzelt: yüzerken ayrıntı panelinden, bitince sete dokunarak, özette; tempo ve toplam yeni mesafeyle; tabloya Mesafe + plan farkı notu', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(120);                                             // 1×200 yüzülüyor
  await p.click('#wheel .w-item.is-active .w-card'); await p.waitForSelector('#detail:not([hidden])');
  assert.match(await p.textContent('#detail'), /Mesafeyi düzelt \(yüzülen 200 m\)/);
  await p.click('#detail [data-dact="mesafe"]'); await s.waitModal('mesafe');
  await p.click('#modal-body [data-mz="100"]');
  assert.match(await p.textContent('#modal-body'), /Plan 200 m → 300 m/);
  await s.modalClick('Kaydet');
  assert.strictEqual((await s.session()).setler[0].mesafe, 300);
  assert.strictEqual(await s.label(), 'DUR', 'yüzme sürer');
  await s.tap(120);                                             // set biter (4:00)
  await p.waitForTimeout(700);
  assert.strictEqual((await p.textContent('#prog-dist')).replace(/\s/g, '').split('/')[0], '300');
  // Bitince: sete dokun → Mesafeyi düzelt → −25 (havuz boyu adımı)
  await s.goTo(0); await s.press(); await s.waitModal('Bu seti sıfırla?');
  await s.modalClick('Mesafeyi düzelt'); await s.waitModal('mesafe');
  await p.click('#modal-body [data-mz="-25"]'); await s.modalClick('Kaydet');
  assert.strictEqual((await s.session()).setler[0].mesafe, 275);
  await s.finishToOzet();
  assert.match(await p.textContent('.oz-mz'), /Mesafe 275 m · düzelt/);
  await p.click('.oz-mz'); await s.waitModal('mesafe');
  await p.click('#modal-body [data-mz="25"]'); await s.modalClick('Kaydet');
  await p.waitForFunction(() => /Mesafe 300 m/.test(document.querySelector('.oz-mz').textContent));
  assert.strictEqual((await p.textContent('#oz-mesafe')).replace(/\D/g, ''), '300');
  await p.click('#oz-save'); await s.waitScreen('done');
  const E = s.env.sheets.eski.data;
  const row = E[1];
  assert.strictEqual(row[col('Mesafe')], 300);
  assert.match(row[col('Not')], /Plan: 1×200 → 1×300/);
});

sc('Set kartı: stil · tür hazır kartta başlığın altında, boşluksuz; kartın alt satırı kesilmez (320–430 px)', async ({ launch }) => {
  const rows = [
    prow(T23, 1, 'WU', 1, 200, 'Swim', '04:45', '00:30'),
    prow(T23, 2, 'PS', 4, 50, 'Kick', '01:20', '00:15', 'Finn'),
    prow(T23, 3, 'MS', 1, 800, 'Swim', '18:40', '01:00'),
  ];
  rows[1][7] = 'Sağ/Sol rotasyon, omuz-çene hattı';
  for (const vp of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const s = await launch({ rows, viewport: vp }); const p = s.page;
    await s.openToday();
    await s.goTo(1);
    const m = await p.$eval('.w-item.is-active', (it) => {
      const r = (sel) => it.querySelector(sel).getBoundingClientRect();
      const card = r('.w-card'); const t = r('.w-title'); const sub = r('.w-sub'); const foot = r('.w-foot');
      return { sub: it.querySelector('.w-sub').textContent, small: !!it.querySelector('.w-title small'),
        gap: Math.round(sub.top - t.bottom), footOut: Math.round(foot.bottom - card.bottom), subLeft: Math.round(sub.left - t.left) };
    });
    const tag = `${vp.width}px ${JSON.stringify(m)}`;
    assert.strictEqual(m.sub, 'FR · Kick', tag);
    assert.ok(!m.small, `hazır kartta stil · tür başlığın içinde olmamalı: ${tag}`);
    assert.ok(m.gap >= -2 && m.gap <= 12, `başlık ile stil · tür arasında boşluk olmamalı: ${tag}`);
    assert.ok(m.footOut <= 1, `kartın alt satırı (tempo · mesafe) kesilmemeli: ${tag}`);
    // Yüzerken: stil · tür başlığın yanında
    await s.tap(5);
    assert.strictEqual(await p.textContent('.w-item.is-active .w-title small'), 'FR · Kick', vp.width + 'px yüzerken');
    await s.close();
  }
});

// --- Sürüm 10.4 -----------------------------------------------------------------------------------
const fitsCard = (p) => p.$eval('.w-item.is-active', (it) => {
  const card = it.querySelector('.w-card').getBoundingClientRect();
  const kids = [...it.querySelectorAll('.w-card > *')].filter((e) => e.getBoundingClientRect().height);
  const bottom = Math.max(...kids.map((e) => e.getBoundingClientRect().bottom));
  return Math.round(bottom - card.bottom);
});

sc('Çok tekrar (12×100): şerit, Tekrar 7/12, son 3 süre; set bilgisi görünür; kart taşmaz (375/430)', async ({ launch }) => {
  const rows = [prow(T23, 1, 'MS', 12, 100, 'Swim', '01:30', '00:20', 'Paletsiz'), prow(T23, 2, 'CD', 1, 200, 'Swim', '04:00', '')];
  rows[0][7] = 'Son 25 hızlı, dönüşte 5 dolfin';
  for (const vp of [{ width: 375, height: 667 }, { width: 430, height: 932 }]) {
    const s = await launch({ rows, viewport: vp }); const p = s.page;
    await s.openToday();
    for (let r = 0; r < 6; r++) { await s.tap(88 + r); await s.tap(20); }
    await s.tap(30); // 7. tekrar yüzülüyor
    const m = await p.$eval('.w-item.is-active', (it) => ({
      n: it.querySelectorAll('.w-strip i').length, ok: it.querySelectorAll('.w-strip i.ok').length, now: it.querySelectorAll('.w-strip i.now').length,
      boxes: it.querySelectorAll('.w-reps').length, rep: it.querySelector('.w-rep b').textContent, last: it.querySelector('.w-last3').textContent,
      info: it.querySelector('.w-info').textContent, desc: it.querySelector('.w-idesc').textContent,
    }));
    const tag = `${vp.width}px ${JSON.stringify(m)}`;
    assert.deepStrictEqual([m.n, m.ok, m.now, m.boxes], [12, 6, 1, 0], tag);
    assert.strictEqual(m.rep, 'Tekrar 7/12', tag);
    assert.strictEqual(m.last, 'Son: 1:31 · 1:32 · 1:33', tag);
    assert.strictEqual(m.info, 'Hedef 1:30 · Dinlen 0:20 · Alet Paletsiz', tag);
    assert.strictEqual(m.desc, 'Son 25 hızlı, dönüşte 5 dolfin', tag);
    assert.ok((await fitsCard(p)) <= 1, `yüzerken kart taşmamalı: ${tag} ${await fitsCard(p)}`);
    await s.press(); await s.adv(5); // dinlenme
    assert.strictEqual(await s.text('.w-item.is-active .w-rep b'), '7/12 bitti');
    assert.strictEqual(await p.$$eval('.w-item.is-active .w-strip i.rs', (e) => e.length), 1);
    assert.ok((await fitsCard(p)) <= 1, `dinlenirken kart taşmamalı: ${vp.width}px`);
    await s.close();
  }
});

sc('Set sonu dinlenmesi: sıradaki setin içeriği öne, sayaç küçük şerit; kart taşmaz', async ({ launch }) => {
  const rows = [prow(T23, 1, 'WU', 1, 200, 'Swim', '04:00', '01:00'), prow(T23, 2, 'AS', 6, 50, 'Kick', '01:20', '00:15', 'Finn'), prow(T23, 3, 'CD', 1, 200, 'Swim', '04:00', '')];
  rows[1][7] = 'Sağ/Sol rotasyon, omuz-çene hattı. Son 2 tekrar hızlı.';
  for (const vp of [{ width: 375, height: 667 }, { width: 430, height: 932 }]) {
    const s = await launch({ rows, viewport: vp }); const p = s.page;
    await s.openToday();
    await s.tap(240); await s.tap(12); // 1×200 bitti → set sonu dinlenmesi
    await p.waitForTimeout(800);
    assert.strictEqual(await s.activeIdx(), 1);
    const m = await p.$eval('.w-item.is-active', (it) => ({
      mode: it.dataset.mode, sub: it.querySelector('.w-sub').textContent, desc: it.querySelector('.w-desc').textContent,
      tiles: it.querySelectorAll('.w-tile').length, alet: it.querySelector('.w-foot').textContent.includes('Finn'),
      mini: !!it.querySelector('.w-timer.is-mini'), big: it.querySelector('.w-timer.is-mini .w-tbig').textContent,
      banner: it.querySelector('.w-banner').textContent,
    }));
    const tag = `${vp.width}px ${JSON.stringify(m)}`;
    assert.strictEqual(m.mode, 'next', tag);
    assert.strictEqual(m.sub, 'FR · Kick', tag);
    assert.match(m.desc, /^Sağ\/Sol rotasyon/, tag);
    assert.ok(m.mini, tag);
    const vis = await p.$eval('.w-item.is-active', (it) => (it.querySelector('.w-tiles').offsetParent ? it.querySelector('.w-foot').textContent : it.querySelector('.w-ninfo').textContent).replace(/\s+/g, ' '));
    assert.match(vis, /Finn/, `alet görünmeli: ${tag} ${vis}`);
    if (vp.width === 430) assert.strictEqual(m.tiles, 2);
    assert.match(m.big, /^0:4\d$/, tag);
    assert.match(m.banner, /1 × 200 FR bitti/, tag);
    assert.ok((await fitsCard(p)) <= 1, `kart taşmamalı: ${tag} ${await fitsCard(p)}`);
    assert.strictEqual(await s.label(), 'YÜZ');
    assert.strictEqual(await s.sub(), '6 × 50 FR Kick · 1. tekrar');
    await s.close();
  }
});

sc('Ayrıntı paneli: karta dokununca (yüzerken de) açılır, dokununca kapanır; zamanlama etkilenmez', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(30);
  const before = await s.events();
  await p.click('.w-item.is-active .w-card');
  await p.waitForSelector('#detail:not([hidden])');
  assert.match(await s.text('#detail'), /1 × 200[\s\S]*FR · Swim[\s\S]*Açıklama 1[\s\S]*HEDEF[\s\S]*4:00[\s\S]*DİNLEN[\s\S]*0:20/);
  await p.click('#detail');
  assert.ok(await p.isHidden('#detail'));
  assert.deepStrictEqual(await s.events(), before);
  assert.strictEqual(await s.label(), 'DUR');
});

sc('Metin boyu alana uyar: kısa açıklama büyür, uzun açıklama küçülür ya da "…" ile biter; alan sabit, taşma yok (320–430 px)', async ({ launch }) => {
  const LONG = Array.from({ length: 48 }, (_, k) => ['kol', 'çekişi', 'uzun', 'tut', 'dönüşte', 'beş', 'dolfin', 'nefes'][k % 8]).join(' ');
  const rows = [
    prow(T23, 1, 'WU', 1, 200, 'Swim', '04:00', '00:20'),
    prow(T23, 2, 'MS', 4, 100, 'Swim', '01:30', '00:20'),
  ];
  rows[0][7] = 'Rahat yüz';
  rows[1][7] = LONG;
  for (const [w, h] of [[320, 640], [375, 812], [430, 932]]) {
    const s = await launch({ rows, viewport: { width: w, height: h } }); const p = s.page;
    await s.openToday();
    await p.waitForTimeout(300);
    const m = () => p.$eval('.w-item.is-active', (n) => {
      const card = n.querySelector('.w-card'); const d = n.querySelector('.w-desc');
      const cr = card.getBoundingClientRect(); const dr = d.getBoundingClientRect();
      return { fs: parseFloat(getComputedStyle(d).fontSize), clamp: d.classList.contains('is-clamp'), dh: Math.round(dr.height),
        over: card.scrollHeight > card.clientHeight + 1, inside: dr.top >= cr.top - 1 && dr.bottom <= cr.bottom + 1,
        dOver: !d.classList.contains('is-clamp') && d.scrollHeight > d.clientHeight + 1, ch: Math.round(cr.height) };
    });
    const a = await m();
    await s.goTo(1);
    const b = await m();
    assert.ok(a.fs >= 24, `${w}px kısa metin büyür (eski sabit boy 22–25): ${a.fs}`);
    assert.ok(b.fs >= 13 && b.fs < a.fs, `${w}px uzun metin küçülür: ${b.fs}`);
    for (const x of [a, b]) {
      assert.ok(!x.over && x.inside && !x.dOver, `${w}px taşma yok ${JSON.stringify(x)}`);
    }
    assert.strictEqual(a.ch, b.ch, 'kart yüksekliği aynı');
    if (w === 320) assert.ok(b.clamp || b.fs <= 16, `dar ekranda uzun metin sıkışır: ${JSON.stringify(b)}`);
    // Ayrıntı panelinde tamamı (kesilmez)
    await p.click('.w-item.is-active .w-card'); await p.waitForSelector('#detail:not([hidden])');
    assert.ok(!(await p.$eval('.dt-desc', (d) => d.classList.contains('is-clamp'))));
    assert.match(await s.text('.dt-desc'), /nefes$/);
    await s.close();
  }
});

// --- Salon (salon.js) ---------------------------------------------------------------------------
const slText = (s, sel) => s.page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());
const slTitle = (s) => s.page.$eval('#sl-wheel .w-item.is-active .sl-ad', (e) => e.textContent.trim());
const slPress = (s) => s.page.$eval('#sl-main', (b) => b.click());
const slTap = async (s, sec) => { await slPress(s); if (sec) await s.adv(sec); };

/** 13.3: salon idmanı salonPlan'dan başlar — bugüne son idmanın değerleriyle plan. */
const salonPlanli = () => ({ ...sampleSalon(), karaSeans: new Sheet('karaSeans', ['Tarih', 'Süre', 'RPE', 'MSI', 'Yer', 'Açıklama']), plan: new Sheet('plan', ['Tarih', 'Sıra', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Süre', 'Dinlen', 'Süperset', 'Not', 'Durum'], [
  [D(T23), 1, 'Band Bent Over Row', 4, 20, 15, '', 90, '', '', ''],
  [D(T23), 2, 'Standard Pull-up', 3, 11, 'Vücut', '', 90, '', '', ''],
  [D('2026-09-26'), 1, 'Front Plank', 3, 1, 'Vücut', 45, 60, '', '', ''],
]) });

// 13.3 (bilinçli değişiklik): "son idmanı tekrarla" yerine salonPlan'daki bugünün planı; kayıttan sonra günün plan satırları silinir.
sc('Salon: kurulmadıysa Ayarlar; salonPlan içindeki bugünün planı → BAŞLA/BİTTİ, tekrar ±, hareket sonu nabız·RPE·MSI, özet, idman sayfasına yazılır', async ({ launch }) => {
  let s = await launch(); let p = s.page;
  await s.waitScreen('home');
  assert.strictEqual(await slText(s, '#home-gym-badge'), 'KURULMADI');
  await p.click('#home-gym'); await s.waitScreen('setup');
  await s.close();
  s = await launch({ salonSheets: salonPlanli(), ref: true }); p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.waitForFunction(() => /karaPlan · tablodan/.test(document.getElementById('home-gym-go').textContent));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  assert.match(await slText(s, '#ss-body'), /23 EYLÜL ÇARŞAMBA · BUGÜN · 2 HAREKET.*Band Bent Over Row\s*4 × 20 · 15 kg.*Standard Pull-up\s*3 × 11 · Vücut.*İdmanı aç.*26 EYLÜL.*Front Plank\s*3 × 45 sn.*Bu planla başla/);
  await p.click('[data-ss="basla"][data-t="2026-09-23"]');
  // 13.2.0: artış önerisi sorulur (sormadan uygulanmaz); bantta kg değil tekrar (+1); ⚠ (RPE 9,5) listede yok
  await s.waitModal('Artış önerisi · 1 hareket');
  assert.match(await slText(s, '#modal-body'), /Band Bent Over Row\s*20 → 21 tekrar/);
  await s.modalClick('Seçilenleri uygula'); await s.waitScreen('salon');
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  assert.strictEqual(await slTitle(s), 'Band Bent Over Row');
  assert.match(await slText(s, '#sl-wheel .w-item.is-active .w-card'), /Hedef 4 × 21 · 15 kg · Dinlen 1:30.*öneri uygulandı: \+1 tekrar geri al/);
  await p.click('#sl-wheel .w-item.is-active [data-sl-geri]');
  // Geri alındıktan sonra son yapılan gösterilir; öneri satırı +1 tekrar
  assert.match(await slText(s, '#sl-wheel .w-item.is-active .w-card'), /Hedef 4 × 20 · 15 kg · Dinlen 1:30.*öneri: \+1 tekrar/);
  assert.strictEqual(await p.getAttribute('#sl-wheel .w-item.is-active .sl-vid', 'href'), 'https://youtu.be/row1');
  assert.strictEqual(await slText(s, '#sl-main-label'), 'BAŞLA');
  assert.match(await slText(s, '#sl-main-sub'), /1\. set · idman başlar/);
  for (let k = 0; k < 4; k++) {
    await slTap(s, 30);
    assert.strictEqual(await slText(s, '#sl-main-label'), 'BİTTİ');
    if (k === 1) { await p.click('#sl-wheel .w-item.is-active [data-sl-rep="-1"]'); await p.click('#sl-wheel .w-item.is-active [data-sl-rep="-1"]'); }
    await slPress(s);
    if (k < 3) {
      await s.adv(3);
      assert.match(await slText(s, '#sl-wheel .w-item.is-active .w-timer'), new RegExp(`DİNLENME · ${k + 2}\\. SETE`));
      await s.adv(60);
    }
  }
  await p.waitForSelector('#sl-giris:not([hidden])');
  assert.match(await slText(s, '#sg-body'), /SETLER\s*20-18-20-20\s*ORT\.\s*19,5/);
  // 13.2.0: nabız boş başlar (ölçülmediyse yazılmaz); ilk dokunuş geçen değerden (123) başlatır
  assert.match(await slText(s, '#sg-body'), /—\s*ölçmediysen boş kalır · ± ile gir · geçen 123/);
  await p.click('[data-sg-hr="1"]'); await p.click('[data-sg-hr="1"]'); await p.click('[data-sg-hr="1"]');
  await p.click('[data-sg="rpe"][data-v="8"]');
  assert.match(await slText(s, '#sg-body'), /Zor, set sonlarında zorlanma\. \(idmanRef\)/);
  await p.click('[data-sg="msi"][data-v="0.5"]');
  assert.match(await slText(s, '#sg-body'), /Hafif his\./);
  await p.fill('#sg-not', 'Band yeşil');
  assert.match(await slText(s, '#sg-save-sub'), /sıradaki: Standard Pull-up/);
  await p.click('#sg-save');
  await p.waitForFunction(() => document.querySelector('#sl-wheel .w-item.is-active .sl-ad').textContent.trim() === 'Standard Pull-up');
  assert.match(await slText(s, '#sl-wheel .w-item.is-active .w-card'), /öneri: aynı ⚠/);
  await p.waitForFunction(() => /^1\. set/.test(document.getElementById('sl-main-sub').textContent)); // kaydırma bitti
  await s.adv(3); // çift dokunma koruması (2 sn) son BİTTİ'den sayılır
  // Pull-up: 1 set yapılır, sonra idman ‹ ile bitirilir (giriş yapılmadı → boş yazılır)
  await slTap(s, 40); await slPress(s); await s.adv(5);
  await p.click('#sl-back'); await s.waitModal('Kara idmanı');
  await s.modalClick('İdmanı bitir ve kaydet');
  await s.waitScreen('salon-ozet');
  assert.match(await slText(s, '#so-body'), /HAREKET\s*2\s*SET\s*5/);
  assert.match(await slText(s, '#so-body'), /1 harekette RPE\/MSI girilmedi/);
  // 13.4: idmanın geneli (karaSeans): RPE 7, MSI 0,5, yer Ev, not
  assert.match(await slText(s, '#so-seans'), /İDMANIN GENELİ.*RPE · tüm idman ne kadar zordu\? \(hareketlerin ortalaması 8\).*MSI.*YER\s*Salon\s*Ev\s*Otel/);
  assert.equal(await p.getAttribute('#so-seans [data-so="yer"][data-v="Salon"]', 'class'), 'is-on', 'yer varsayılanı Salon');
  await p.click('#so-seans [data-so="rpe"][data-v="7"]'); await p.click('#so-seans [data-so="msi"][data-v="0.5"]'); await p.click('#so-seans [data-so="yer"][data-v="Ev"]');
  await p.fill('#so-not', 'Kısa idman');
  assert.deepStrictEqual((await s.ls('ysk.salonSession')).seans, { yer: 'Ev', rpe: 7, msi: 0.5, not: 'Kısa idman' });
  await p.click('#so-save');
  await s.waitScreen('home');
  const I = s.envs.SALON.sheets.idman;
  assert.strictEqual(I.data[0][10], 'Süre');
  const rows = I.data.slice(1, 3).map((r) => r.slice(1, 10));
  assert.deepStrictEqual(rows, [
    [1, 'Band Bent Over Row', 4, 19.5, 15, 125, 8, 0.5, 'Setler: 20-18-20-20. Band yeşil'],
    [2, 'Standard Pull-up', 1, 11, 'Vücut', '', '', '', 'Setler: 11'],
  ]);
  assert.ok(I.data[1][0] instanceof s.envs.SALON.CDate && I.data[1][0].toISOString().startsWith('2026-09-23'));
  assert.deepStrictEqual(s.envs.SALON.sheets.plan.data.slice(1).filter((r) => r[2]).map((r) => r[2]), ['Front Plank'], 'günün plan satırları silindi');
  const KS = s.envs.SALON.sheets.karaSeans.data;
  assert.deepStrictEqual(KS[1].slice(2), [7, 0.5, 'Ev', 'Kısa idman'], 'karaSeans satırı');
  assert.ok(KS[1][1] * 86400 >= 4 * 30 + 3 * 63, 'idman süresi');
  const sure = Math.round(I.data[1][10] * 86400);
  assert.ok(sure >= 4 * 30 + 3 * 63 && sure < 4 * 31 + 3 * 64 + 3, `Row süresi ${sure}`);
  assert.strictEqual(await s.ls('ysk.salonSession'), null);
  const h = (await s.ls('ysk.history'))[0];
  assert.strictEqual(h.tur, 'salon'); assert.strictEqual(h.status, 'sent');
  await p.click('#home-history'); await s.waitScreen('history');
  assert.match(await slText(s, '.hist-row.is-salon'), /Kara · Çarşamba Tabloda 2 hareket · 5 set/);
});

sc('Salon planlama: dağılım, öncelik, puanlı liste (⚠ ağrı), sıra, plan → idman; Değiştir aynı gruptan; Sil + Geri al; süreli hareket kendiliğinden biter', async ({ launch }) => {
  const s = await launch({ salon: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan');
  // Son 4 hafta (26.08 sonrası): Sırt = (4×0,8 + 3×0,6) / 10 set
  assert.match(await slText(s, '[data-sp-grup="Back"]'), /Sırt.*son 4 hafta %50/);
  await p.click('[data-sp-grup="Back"]');
  assert.match(await slText(s, '[data-sp-grup="Back"]'), /ÖNCELİK/);
  await p.click('[data-sp-grup="Core"]'); await p.click('[data-sp-grup="Core"]');
  assert.match(await slText(s, '[data-sp-grup="Core"]'), /ÖNCELİK ×2/);
  assert.match(await slText(s, '#sp-next'), /Hareketleri getir · 4 uygun/);
  await p.click('#sp-next');
  const names = await p.$$eval('.sp-ex', (e) => e.map((x) => x.querySelector('.sp-m b').firstChild.textContent.trim()));
  // Plank: Core 1 × 2 × 0,9 · Lat: 0,9 × 0,85 · Row: 0,8 × 0,75 · Pull-up: 0,6 × 0,95
  assert.deepStrictEqual(names, ['Front Plank', 'Band Lat Pulldown', 'Band Bent Over Row', 'Standard Pull-up']);
  assert.match(await slText(s, '.sp-ex >> nth=3'), /⚠/, 'son seferde RPE 9,5');
  assert.match(await slText(s, '.sp-ex >> nth=0'), /^100\s*PUAN/);
  await p.click('[data-sp-ex="Band Bent Over Row"]'); await p.click('[data-sp-ex="Front Plank"]'); await p.click('[data-sp-ex="Band Lat Pulldown"]');
  await p.click('#sp-next');
  assert.match(await slText(s, '#sp-body'), /3 hareket · ~/);
  assert.match(await slText(s, '.sp-pl >> nth=0'), /Band Bent Over Row.*öneri: \+1 tekrar.*4 × 20.*15 kg/, '13.2.0: öneri gösterilir, sormadan uygulanmaz; bantta kg yok');
  assert.match(await slText(s, '.sp-pl >> nth=1'), /Front Plank.*3 × 30 sn.*Vücut/);
  await p.click('[data-sp-mv="1:-1"]');
  await p.click('#sp-next'); await s.waitScreen('salon');
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  let ses = await s.ls('ysk.salonSession');
  assert.deepStrictEqual(ses.hareketler.map((x) => x.ad), ['Front Plank', 'Band Bent Over Row', 'Band Lat Pulldown']);
  // Değiştir: Lat Pulldown yerine aynı gruptan (Sırt) puanlı liste
  await s.goTo(2, '#sl-wheel');
  await p.click('#sl-wheel .w-item.is-active .w-card');
  await p.waitForSelector('#sl-detail:not([hidden])');
  await p.click('#sl-detail [data-sact="swap"]');
  await s.waitModal('Band Lat Pulldown yerine');
  const opts = await p.$$eval('#modal-body .pick b', (e) => e.map((x) => x.textContent));
  // 13.6 (P3, bilinçli değişiklik): en üstte "ÖNERİLEN · AYNI KAS GRUBU" (aynı ana grup, kısıta uygun), altında tüm liste
  assert.deepStrictEqual(opts.map((x) => x.replace(/ ⚠$/, '')), ['⇄ Standard Pull-up', '100 · Standard Pull-up'], JSON.stringify(opts));
  assert.match(await s.text('#modal-body .pick-on small'), /aynı ana grup · kas örtüşmesi %\d+ · kısıta uygun/);
  await p.click('#modal-body .pick-on');
  await p.waitForFunction(() => document.querySelector('#sl-wheel .w-item.is-active .sl-ad').textContent.trim() === 'Standard Pull-up');
  // Sil + Geri al
  await p.click('#sl-wheel .w-item.is-active .w-card');
  await p.click('#sl-detail [data-sact="del"]');
  await p.waitForFunction(() => document.querySelectorAll('#sl-wheel .w-item').length === 2);
  await p.click('#toast .toast-act');
  await p.waitForFunction(() => document.querySelectorAll('#sl-wheel .w-item').length === 3);
  // Süreli hareket (Plank 30 sn): BAŞLA → geri sayım → kendiliğinden biter
  await s.goTo(0, '#sl-wheel');
  await slTap(s, 10);
  assert.match(await slText(s, '#sl-wheel .w-item.is-active .w-timer'), /1\. SET · SÜRE\s*0:2\d/);
  await s.adv(21);
  assert.strictEqual(await slText(s, '#sl-main-label'), 'BAŞLA', 'set kendiliğinden bitti');
  ses = await s.ls('ysk.salonSession');
  const ev = ses.events.filter((e) => e.t !== 'mola');
  assert.deepStrictEqual(ev.map((e) => e.t), ['set', 'bitti']);
  assert.strictEqual(ev[1].ts - ev[0].ts, 30000, 'bitiş = başlangıç + 30 sn');
  // Başlanan hareket silinemez / değiştirilemez
  await p.click('#sl-wheel .w-item.is-active .w-card');
  assert.ok(await p.isDisabled('#sl-detail [data-sact="del"]'));
  assert.ok(await p.isDisabled('#sl-detail [data-sact="swap"]'));
});

sc('Salon: bağlantı yokken kayıt kuyruğa alınır, bağlantı gelince saveSalon ile gönderilir', async ({ launch }) => {
  const s = await launch({ salonSheets: salonPlanli() }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="basla"][data-t="2026-09-23"]'); await s.waitModal('Artış önerisi'); await s.modalClick('Hiçbiri'); await s.waitScreen('salon'); // 13.2.0: öneri sorulur
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  await slTap(s, 20); await slPress(s); await s.adv(3);
  await p.click('#sl-back'); await s.modalClick('İdmanı bitir ve kaydet');
  await s.waitScreen('salon-ozet');
  s.net.offline = true;
  await p.click('#so-save');
  await s.waitScreen('home');
  assert.match(await slText(s, '#toast'), /kuyruğa alındı/);
  const q = await s.ls('ysk.queue');
  assert.strictEqual(q.length, 1); assert.strictEqual(q[0].tur, 'salon');
  assert.match(await slText(s, '#home-history-meta'), /1 gönderilmeyi bekliyor/);
  s.net.offline = false;
  await p.evaluate(() => window.dispatchEvent(new Event('online')));
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('ysk.queue') || '[]').length === 0, null, { timeout: 8000 });
  assert.ok(s.net.calls.includes('saveSalon'));
  assert.strictEqual(s.envs.SALON.sheets.idman.data[1][2], 'Band Bent Over Row');
  assert.strictEqual((await s.ls('ysk.history'))[0].status, 'sent');
});



// --- İdman anında düzenleme (duzen.js) ------------------------------------------------------
const openDet = async (s) => { await s.page.click('.w-item.is-active .w-card'); await s.page.waitForSelector('#detail:not([hidden])'); };
const dact = async (s, act) => { await openDet(s); await s.page.click(`#detail [data-dact="${act}"]`); };
const nSets = (s) => s.page.$$eval('.w-item', (e) => e.length);

sc('Düzenle / Sonrasına ekle / Sil (+ Geri al); tabloya plan farkı notu, eklenen set, Sıra boş', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.goTo(2);
  await dact(s, 'edit');
  await p.waitForSelector('#eset:not([hidden])');
  assert.match(await s.text('#eset-tag'), /MS · ANA SET · 3\/5 · DÜZENLE/);
  await p.click('[data-es="tekrar:1"]'); await p.click('[data-es="tekrar:1"]');
  await p.click('[data-es="hedef:-1"]');
  assert.strictEqual(await s.text('#eset-title'), '6 × 100 FR Swim');
  await p.click('#eset-save');
  await p.waitForSelector('#eset', { state: 'hidden' });
  assert.strictEqual(await s.title(), '6 × 100');
  assert.match(await s.text('#toast'), /Plan: 4×100 → 6×100, Hedef 1:30 → 1:25/);
  // Sonrasına ekle: düzenlenen setin kopyası; 2 × 100 BK
  await dact(s, 'add');
  assert.match(await s.text('#eset-tag'), /4\/6 · YENİ SET/);
  for (let k = 0; k < 4; k++) await p.click('[data-es="tekrar:-1"]');
  await p.click('[data-es-chip="stil"][data-v="BK"]');
  await p.click('#eset-save');
  await p.waitForFunction(() => document.querySelectorAll('.w-item').length === 6);
  assert.strictEqual(await s.activeIdx(), 3);
  assert.strictEqual(await s.title(), '2 × 100');
  // Sil + Geri al, sonra son seti (CD) sil
  await s.goTo(4);
  await dact(s, 'del');
  await p.waitForFunction(() => document.querySelectorAll('.w-item').length === 5);
  await p.click('#toast .toast-act');
  await p.waitForFunction(() => document.querySelectorAll('.w-item').length === 6);
  await s.goTo(5);
  await dact(s, 'del');
  await p.waitForFunction(() => document.querySelectorAll('.w-item').length === 5);
  // Kalıcılık: yeniden açınca düzenlenen plan
  await p.reload(); await s.waitScreen('program'); await p.waitForSelector('.w-item.is-active');
  assert.strictEqual(await nSets(s), 5);
  // WU tam, MS 1 tekrar, eklenen set 1 tekrar → erken bitir ve kaydet
  await s.goTo(0); await s.tap(60); await s.tap(5);
  await p.waitForTimeout(800); // set bitince kart kendiliğinden sonraki sete kayar
  await s.goTo(2); await s.tap(30); await s.tap(5);
  await s.goTo(3); await s.tap(30); await s.press();
  await s.finishToOzet();
  await p.click('#oz-save'); await s.waitScreen('done');
  const E = s.env.sheets.eski; const col = (k) => E.data[0].indexOf(k);
  const rows = E.data.slice(1).map((r) => [r[col('Sıra')], r[col('Blok')], r[col('Tekrar')], r[col('Mesafe')], r[col('Stil')], r[col('Not')]]);
  assert.strictEqual(rows.length, 3);
  assert.deepStrictEqual(rows[0], ['', 'WU', 1, 200, 'FR', '']);
  assert.deepStrictEqual(rows[1].slice(0, 5), ['', 'MS', 6, 100, 'FR']);
  assert.match(rows[1][5], /^Plan: 4×100 → 6×100, Hedef 1:30 → 1:25/);
  assert.deepStrictEqual(rows[2].slice(0, 5), ['', 'MS', 2, 100, 'BK']);
  assert.match(rows[2][5], /^idmanda eklendi/);
  assert.ok(Math.abs(E.data[2][col('Hedef')] * 86400 - 85) < 1e-6);
  assert.ok(!s.env.sheets.arsiv, '13.2: arşiv yok');
  const h = (await s.ls('ysk.history'))[0];
  assert.deepStrictEqual(h.setler.map((x) => x.tekrar), [1, 4, 6, 2, 2]);
});

sc('Düzenleme kısıtları: yüzerken sönük; +1 tekrar (Geri al); başlanan set silinmez, tekrar ≥ yapılan; mesafe değişirse yeni set', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.goTo(2);
  await s.tap(30); // MS 1. tekrar yüzülüyor
  await openDet(s);
  assert.ok(await p.isDisabled('#detail [data-dact="edit"]'));
  assert.ok(await p.isDisabled('#detail [data-dact="add"]'));
  assert.match(await s.text('#detail'), /Yüzerken düzenlenemez/);
  await p.click('#detail [data-dact="edit"]', { force: true });
  assert.ok(await p.isVisible('#detail'), 'sönük düğme paneli kapatmaz');
  await p.click('#detail .dt-title');
  await s.press(); // DUR → dinlenme
  await p.waitForSelector('.w-item.is-active .w-plus');
  await p.click('.w-item.is-active .w-plus');
  await p.waitForFunction(() => document.querySelector('.w-item.is-active .w-title').firstChild.textContent.trim() === '5 × 100');
  assert.match(await s.text('#toast'), /4 × 100 → 5 × 100/);
  await p.click('#toast .toast-act');
  await p.waitForFunction(() => document.querySelector('.w-item.is-active .w-title').firstChild.textContent.trim() === '4 × 100');
  await openDet(s);
  assert.ok(await p.isEnabled('#detail [data-dact="edit"]'));
  assert.ok(await p.isDisabled('#detail [data-dact="del"]'));
  await p.click('#detail [data-dact="edit"]');
  for (let k = 0; k < 5; k++) await p.click('[data-es="tekrar:-1"]');
  assert.strictEqual(await s.text('#eset-title'), '1 × 100 FR Swim', 'tekrar yapılandan aşağı inmez');
  assert.match(await s.text('#eset-body'), /en az 1 \(yapıldı\)|MESAFE/);
  for (let k = 0; k < 3; k++) await p.click('[data-es="tekrar:1"]');
  await p.click('[data-es="mesafe:-1"]'); await p.click('[data-es="mesafe:-1"]');
  assert.match(await s.text('#eset-body'), /kalanlar yeni set olarak eklenir/);
  await p.click('#eset-save');
  await s.waitModal('Yeni set olarak eklensin mi?');
  await s.modalClick('Yeni set olarak ekle');
  await p.waitForFunction(() => document.querySelectorAll('.w-item').length === 6);
  assert.strictEqual(await s.title(), '3 × 50');
  const ses = await s.session();
  assert.deepStrictEqual(ses.setler.map((x) => `${x.tekrar}×${x.mesafe}`), ['1×200', '4×50', '1×100', '3×50', '2×100', '1×200']);
  assert.deepStrictEqual(ses.events.filter((e) => e.set != null).map((e) => e.set), [2], 'olaylar MS setinde kalır');
  await s.goTo(2);
  await openDet(s);
  assert.ok(await p.isDisabled('#detail [data-dact="edit"]'), 'biten set düzenlenmez');
  assert.match(await s.text('#detail'), /Biten set düzenlenemez/);
});

sc('Mola: dinlenirken sol düğme Mola olur; saat, sayaç ve bipler durur; DEVAM ET; süreler moladan arınır', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(240); await s.press(); // 1×200, DUR → set sonu dinlenmesi (Dinlen 0:20)
  await p.clock.runFor(300);
  assert.strictEqual(await s.text('#btn-undo'), 'Geri al');
  await s.adv(6);
  assert.strictEqual(await s.text('#btn-undo'), 'Mola');
  const clock0 = await p.textContent('#prog-clock');
  await p.click('#btn-undo');
  await p.waitForSelector('#mola:not([hidden])');
  await s.adv(240);
  for (let i = 0; i < 6; i++) await p.clock.runFor(500);
  assert.strictEqual(await p.textContent('#mola-time'), '4:03');
  assert.strictEqual(await p.textContent('#prog-clock'), clock0, 'idman saati durur');
  assert.strictEqual(await p.textContent('#mola-idman'), clock0);
  assert.deepStrictEqual(await p.evaluate(() => window.__beeps), [660], 'molada bip yok');
  assert.match(await s.text('#mola-next'), /Sıradaki: 4 × 50 FR · 1\. tekrar/);
  await p.reload(); await s.waitScreen('program');
  await p.waitForSelector('#mola:not([hidden])', { timeout: 3000 });
  await p.click('#mola-devam');
  assert.ok(await p.isHidden('#mola'));
  assert.deepStrictEqual((await s.events()).slice(-2), ['mola', 'devam']);
  await s.adv(10); for (let i = 0; i < 12; i++) await p.clock.runFor(500);
  const bp = await p.evaluate(() => window.__beeps);
  assert.deepStrictEqual(bp, [880, 880, 880, 1320], 'dinlenme moladan sonra kaldığı yerden sayar (yeniden yüklemede bip kaydı sıfırlanır) ' + JSON.stringify(bp));
  await s.tap(65); await s.tap(3);
  // ‹ panelinden de mola verilir
  await p.click('#prog-back'); await s.waitModal('İdmanı bitir?');
  await s.modalClick('Mola ver');
  await p.waitForSelector('#mola:not([hidden])');
  await s.adv(60); await p.click('#mola-devam');
  await s.finishToOzet();
  const sure = await p.textContent('#oz-sure');
  assert.ok(/^0?5:[23]\d$/.test(sure), `süre moladan arınık olmalı (~5:30, molasız ~10:30): ${sure}`);
  const chip = await p.$('#oz-chips button[data-chip^="Mola"]');
  assert.match(await chip.textContent(), /^Mola 2× · 5:[01]\d$/);
  await chip.click();
  await p.click('#oz-save'); await s.waitScreen('done');
  assert.match(s.env.sheets.seans.data[1][6], /^Mola 2× · 5:[01]\d$/);
  const sonu = await s.ls('ysk.history');
  assert.ok(sonu.length === 1);
});

sc('Tek basışla başlangıç: ilk YÜZ idmanı başlatır; geri al ikisini birden siler', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  assert.strictEqual(await s.label(), 'YÜZ');
  await s.press(); await p.clock.runFor(300);
  assert.deepStrictEqual(await s.events(), ['basla', 'cik0']);
  assert.strictEqual(await s.label(), 'DUR');
  await p.click('#btn-undo');
  assert.deepStrictEqual(await s.events(), []);
  assert.strictEqual(await s.label(), 'YÜZ');
  assert.strictEqual(await p.textContent('#prog-clock'), '0:00');
  // Son tekrar alt yazısı
  await s.adv(3); await s.press(); await s.adv(5);
  assert.strictEqual(await s.sub(), 'Son tekrar · set biter');
});

sc('Düzen (salon): 320–430 px başlangıç, planlama, idman, giriş, özet; yatay taşma yok, kart içeriği karta sığar', async ({ launch }) => {
  for (const vp of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
    const s = await launch({ viewport: vp, salon: true }); const p = s.page;
    const check = async (name) => {
      await p.waitForTimeout(250);
      const r = await p.evaluate(() => {
        const W = document.documentElement.clientWidth; const bad = [];
        for (const el of document.querySelectorAll('.screen:not([hidden]) *')) {
          const b = el.getBoundingClientRect(); if (!b.width || el.closest('[hidden]')) continue;
          if (el.closest('.w-item:not(.is-active)')) continue;
          if (b.right > W + 1 || b.left < -1) bad.push(`${el.tagName}#${el.id}.${String(el.className).slice(0, 30)} ${Math.round(b.left)}-${Math.round(b.right)}`);
        }
        const card = document.querySelector('.screen:not([hidden]) .w-item.is-active .w-card');
        return { sw: document.documentElement.scrollWidth, bad: bad.slice(0, 3), over: card ? card.scrollHeight - card.clientHeight : 0 };
      });
      assert.ok(r.sw <= vp.width && !r.bad.length && r.over <= 1, `${vp.width}px ${name}: ${JSON.stringify(r)}`);
    };
    await s.waitScreen('home');
    await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
    await p.click('#home-gym'); await s.waitScreen('salon-start'); await check('salon başlangıç');
    await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan'); await check('planlama hedef');
    await p.click('#sp-next'); await check('planlama liste');
    await p.click('[data-sp-ex="Standard Pull-up"]'); await p.click('[data-sp-ex="Front Plank"]');
    await p.click('#sp-next'); await check('plan');
    await p.click('#sp-next'); await s.waitScreen('salon'); await p.waitForSelector('#sl-wheel .w-item.is-active'); await check('salon hazır');
    await slTap(s, 20); await check('salon set');
    await slPress(s); await s.adv(5); await check('salon dinlenme');
    await p.click('#sl-wheel .w-item.is-active .w-tag'); await p.waitForSelector('#sl-detail:not([hidden])'); await check('salon ayrıntı');
    await p.click('#sl-detail .dt-hint');
    for (let k = 0; k < 2; k++) { await s.adv(60); await slTap(s, 20); await slPress(s); }
    await p.waitForSelector('#sl-giris:not([hidden])'); await check('hareket sonu');
    await p.click('#sg-save');
    await p.click('#sl-back'); await s.modalClick('İdmanı bitir ve kaydet'); await s.waitScreen('salon-ozet'); await check('salon özet');
    await s.close();
  }
});

sc('Düzen: 320, 375 ve 430 px genişlikte tüm ekranlarda yatay taşma yok, düğmeler büyük', async ({ launch }) => {
  for (const vp of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
    const s = await launch({ viewport: vp }); const p = s.page;
    const check = async (name) => {
      await p.waitForTimeout(250);
      const r = await p.evaluate(() => {
        const W = document.documentElement.clientWidth; const bad = [];
        for (const el of document.querySelectorAll('.screen:not([hidden]) *')) {
          const b = el.getBoundingClientRect(); if (!b.width || getComputedStyle(el).visibility === 'hidden') continue;
          if (el.closest('.w-item:not(.is-active)') || el.closest('.wk-track')) continue;
          if (b.right > W + 1 || b.left < -1) bad.push(`${el.tagName}#${el.id}.${String(el.className).slice(0, 30)} ${Math.round(b.left)}-${Math.round(b.right)}`);
        }
        return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 3) };
      });
      assert.ok(r.sw <= vp.width && !r.bad.length, `${vp.width}px ${name}: ${JSON.stringify(r)}`);
    };
    await s.waitScreen('home'); await check('ana sayfa');
    await p.click('#home-history'); await s.waitScreen('history'); await check('geçmiş');
    await p.click('#hist-back'); await p.click('#home-settings'); await s.waitScreen('setup'); await check('ayarlar');
    await p.click('#setup-back'); await p.click('#home-swim'); await s.waitScreen('days'); await check('takvim');
    await p.click('#days-today-btn'); await s.waitScreen('program'); await check('program hazır');
    const btn = await p.$eval('#btn-main', (e) => e.getBoundingClientRect().height);
    assert.ok(btn >= 100, `büyük düğme ${btn}px`);
    const fit = await p.$eval('#btn-main-label', (e) => {
      const b = e.getBoundingClientRect(); const o = e.parentElement.getBoundingClientRect();
      return { t: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, in: b.left >= o.left && b.right <= o.right, fs: parseFloat(getComputedStyle(e).fontSize) };
    });
    assert.ok(fit.t === 'YÜZ' && fit.sw <= fit.cw + 1 && fit.in && fit.fs >= 18, `${vp.width}px düğme yazısı sığmalı: ${JSON.stringify(fit)}`);
    await s.press(); await p.waitForFunction(() => document.getElementById('btn-main-label').textContent === 'DUR');
    await s.adv(70); await check('program yüzerken');
    await s.press(); await p.waitForFunction(() => document.getElementById('btn-main-label').textContent !== 'DUR');
    await s.adv(30); await check('program dinlenme (eksi)');
    await p.click('#prog-back'); await s.modalClick('İdmanı bitir ve kaydet'); await s.waitScreen('rpe'); await check('RPE');
    await p.click('#rpe-grid button[data-v="7"]'); await s.waitScreen('msi'); await check('MSI');
    await p.click('#msi-body button[data-bolge="sag omuz"]'); await p.click('#msi-next'); await s.waitScreen('ozet'); await check('özet');
    await s.close();
  }
});

// ---------------------------------------------------------------------------------------------------------
const only = process.argv[2];
runScenarios('E2E senaryoları', only ? S.filter(([n]) => n.toLowerCase().includes(only.toLowerCase())) : S, 8130);
