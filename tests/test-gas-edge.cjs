// idman.gs (yüzme) uç durum testleri (sahte SpreadsheetApp).
//   node tests/test-gas-edge.cjs
const assert = require('assert');
const { Sheet, makeEnv, D, ESKI_H, SEANS_H } = require('./fakegas.cjs');

const H = ['Tarih', 'Sıra', 'Blok', 'Tekrar', 'Mesafe', 'Stil', 'Tür', 'Açıklama', 'Hedef', 'Dinlen', 'Alet', 'Gerçek', 'Kulaç', 'Nabız', 'RPE', 'MSI', 'Not'];
const row = (t, s, b, tk, m, h = '', d = '', extra = {}) => {
  const o = { Tarih: typeof t === 'string' && /^\d{4}/.test(t) ? D(t) : t, 'Sıra': s, Blok: b, Tekrar: tk, Mesafe: m, Stil: 'FR', 'Tür': 'Swim', 'Açıklama': '', Hedef: h, Dinlen: d, Alet: '', ...extra };
  return H.map((k) => (k in o ? o[k] : ''));
};
const env = (rows, opts = {}) => makeEnv({
  Plan: new Sheet('Plan', opts.planH || H, rows),
  eski: new Sheet('eski', opts.eskiH || ESKI_H),
  seans: new Sheet('seans', opts.seansH || SEANS_H),
  ...(opts.extra || {}),
}, opts.token);
const fin = (tarih, setler, seans = { sure: '00:30:00', mesafe: 100, havuz: 25, rpe: 5, msi: '', aciklama: '' }) => ({ action: 'finishSession', tarih, seans, setler });
let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', name); throw e; } };

// --- Kimlik ve istek ---------------------------------------------------------------
test('token: yanlış, eksik, farklı uzunluk, sayı; token tanımsızsa hepsi reddedilir', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 200)]);
  for (const token of ['yanlis', '', undefined, 12345, null, 'secret ', 'SECRET']) {
    const r = JSON.parse(e.ctx.doPost({ postData: { contents: JSON.stringify({ action: 'getDates', token }) } }).s);
    assert.strictEqual(r.error, 'AUTH', String(token));
  }
  const e2 = env([], { token: null });
  assert.strictEqual(e2.call({ action: 'getDates' }).error, 'AUTH', 'Script Properties boşsa kimse giremez');
});

test('bozuk JSON, boş gövde, bilinmeyen işlem', () => {
  const e = env([]);
  assert.strictEqual(JSON.parse(e.ctx.doPost({ postData: { contents: '{bozuk' } }).s).error, 'BAD_REQUEST');
  assert.strictEqual(JSON.parse(e.ctx.doPost({}).s).error, 'AUTH');
  const r = e.call({ action: 'silHepsini' });
  assert.strictEqual(r.error, 'UNKNOWN_ACTION'); assert.ok(!/silHepsini/.test(r.message), 'istek içeriği geri yansıtılmaz');
  assert.strictEqual(JSON.parse(e.ctx.doGet().s).ok, true);
});

test('tarih doğrulaması', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 200)]);
  for (const tarih of ['29.09.2026', '2026-9-29', '', null, 20260929, '2026-09-29T00:00'])
    assert.strictEqual(e.call({ action: 'getPlan', tarih }).error, 'BAD_REQUEST', String(tarih));
});

// --- getDates / getPlan ----------------------------------------------------------------
test('boş Plan sayfası → boş liste; eksik sayfa → NO_SHEET', () => {
  assert.deepStrictEqual(env([]).call({ action: 'getDates' }).data, []);
  const e = makeEnv({ eski: new Sheet('eski', ESKI_H), seans: new Sheet('seans', SEANS_H) });
  assert.strictEqual(e.call({ action: 'getDates' }).error, 'NO_SHEET');
});

test('getDates detay = getPlan setleri (Sıra sırasıyla); boş satır ve tarihsiz satır atlanır', () => {
  const e = env([
    row('2026-09-29', 3, 'CD', 1, 200, '04:00'),
    row('', '', '', '', ''),
    row('not bir tarih', 1, 'WU', 1, 100),
    row('2026-09-29', 1, 'WU', 1, 400, '06:00', '00:30'),
    row('2026-09-29', 2, 'MS', 4, 100, '01:40', '00:20', { Alet: 'Palet' }),
  ]);
  const d = e.call({ action: 'getDates' }).data;
  assert.strictEqual(d.length, 1);
  assert.deepStrictEqual(d[0].detay, e.call({ action: 'getPlan', tarih: '2026-09-29' }).data.setler);
  assert.deepStrictEqual(d[0].detay.map((s) => s.sira), [1, 2, 3]);
  assert.strictEqual(d[0].detay[1].alet, 'Palet');
  assert.strictEqual(d[0].toplamMesafe, 1000);
  assert.strictEqual(d[0].hedefSure, 390 + 4 * 120 + 240);
});

test('Sıra boş/metin olan setler sona, satır sırasıyla', () => {
  const e = env([row('2026-09-29', '', 'CD', 1, 100), row('2026-09-29', 2, 'MS', 1, 100), row('2026-09-29', 'x', 'AS', 1, 100), row('2026-09-29', 1, 'WU', 1, 100)]);
  assert.deepStrictEqual(e.call({ action: 'getPlan', tarih: '2026-09-29' }).data.setler.map((s) => s.blok), ['WU', 'MS', 'CD', 'AS']);
});

test('isteğe bağlı sütunlar yoksa boş değer; Tarih yoksa MISSING_COLUMN', () => {
  const planH = ['Tarih', 'Sıra', 'Mesafe'];
  const e = makeEnv({ Plan: new Sheet('Plan', planH, [[D('2026-09-29'), 1, 300]]), eski: new Sheet('eski', ESKI_H), seans: new Sheet('seans', SEANS_H) });
  const s = e.call({ action: 'getPlan', tarih: '2026-09-29' }).data.setler[0];
  assert.deepStrictEqual(s, { sira: 1, blok: '', tekrar: 1, mesafe: 300, stil: '', tur: '', aciklama: '', hedef: '', dinlen: '', alet: '' });
  const e2 = makeEnv({ Plan: new Sheet('Plan', ['Gün', 'Sıra'], []), eski: new Sheet('eski', ESKI_H), seans: new Sheet('seans', SEANS_H) });
  assert.strictEqual(e2.call({ action: 'getDates' }).error, 'MISSING_COLUMN');
});

test('başlık normalleştirme: büyük/küçük, boşluk, Türkçe karakter', () => {
  const planH = [' TARİH ', 'SIRA', 'blok', 'TEKRAR', 'mesafe', 'stıl', 'TUR', 'açıklama', 'HEDEF', 'dinlen', 'ALET'];
  const e = makeEnv({ Plan: new Sheet('Plan', planH, [[D('2026-09-29'), 1, 'WU', 2, 50, 'BK', 'Drill', 'x', '01:00', '00:15', 'Palet']]), eski: new Sheet('eski', ESKI_H), seans: new Sheet('seans', SEANS_H) });
  const s = e.call({ action: 'getPlan', tarih: '2026-09-29' }).data.setler[0];
  assert.deepStrictEqual([s.blok, s.tekrar, s.mesafe, s.stil, s.tur, s.hedef, s.alet], ['WU', 2, 50, 'BK', 'Drill', '01:00', 'Palet']);
});

test('metin tarih biçimleri (gg.aa.yyyy, g/a/yyyy, yyyy-a-g) ve sayısal metin', () => {
  const e = env([row('29.09.2026', 1, 'WU', '2', '100,0'), row('1/10/2026', 1, 'WU', 1, 100), row('2026-10-3', 1, 'WU', 1, 100)]);
  assert.deepStrictEqual(e.call({ action: 'getDates' }).data.map((d) => d.tarih), ['2026-09-29', '2026-10-01', '2026-10-03']);
  assert.strictEqual(e.call({ action: 'getDates' }).data[0].toplamMesafe, 200);
});

test('süre metinleri sadeleşir (0:01:30 → 01:30, 1:2 → 01:02, 00:22.7)', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 100, '0:01:30', '1:2'), row('2026-09-29', 2, 'WU', 1, 100, '00:22.7', '1:05:00')]);
  const s = e.call({ action: 'getPlan', tarih: '2026-09-29' }).data.setler;
  assert.deepStrictEqual([s[0].hedef, s[0].dinlen, s[1].hedef, s[1].dinlen], ['01:30', '01:02', '00:22.7', '01:05:00']);
});

// --- finishSession ------------------------------------------------------------------------
test('eksik seans/setler alanları BAD_REQUEST, hiçbir şey yazılmaz', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 100)]);
  assert.strictEqual(e.call({ action: 'finishSession', tarih: '2026-09-29', setler: [] }).error, 'BAD_REQUEST');
  assert.strictEqual(e.call({ action: 'finishSession', tarih: '2026-09-29', seans: {} }).error, 'BAD_REQUEST');
  assert.strictEqual(e.sheets.eski.getLastRow(), 1); assert.strictEqual(e.sheets.Plan.getLastRow(), 2);
});

test('aynı Sıra iki kez gelirse bir kez yazılır; tamamlanmayan yazılmaz', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 100), row('2026-09-29', 2, 'MS', 1, 100)]);
  const r = e.call(fin('2026-09-29', [{ sira: 1, tamamlandi: true }, { sira: 1, tamamlandi: true }, { sira: 2, tamamlandi: 'true' }]));
  assert.strictEqual(r.data.yazilanSet, 1, '"true" metni tamamlandı sayılmaz');
});

test('sonuç alanları: süre biçimi, sayı, geçersiz metin korunur', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 100)]);
  e.call(fin('2026-09-29', [{ sira: 1, tamamlandi: true, gercek: '1:02:03.5', kulac: '14', nabiz: 'yüksek', rpe: 7, msi: 'bel 1', not: '  not  ' }]));
  const E = e.sheets.eski; const r = E.data[1]; const c = (k) => ESKI_H.indexOf(k);
  assert.ok(Math.abs(r[c('Gerçek')] * 86400 - 3723.5) < 1e-6); assert.strictEqual(E.fmt[1][c('Gerçek')], '[h]:mm:ss.0');
  assert.strictEqual(r[c('Kulaç')], 14); assert.strictEqual(r[c('Nabız')], 'yüksek'); assert.strictEqual(E.fmt[1][c('Nabız')], '@');
  assert.strictEqual(r[c('Not')], 'not');
});

test('seans: havuz boşsa 25, süre biçimleri, sütun sırası karışık', () => {
  const seansH = ['Açıklama', 'Havuz', 'Tarih', 'Süre', 'MSI', 'RPE', 'Mesafe', 'Ekstra'];
  const e = env([row('2026-09-29', 1, 'WU', 1, 100)], { seansH });
  e.call(fin('2026-09-29', [], { sure: '45:30', mesafe: '1800', havuz: '', rpe: '', msi: '', aciklama: 'a' }));
  const r = e.sheets.seans.data[1];
  assert.strictEqual(r[1], 25); assert.ok(Math.abs(r[3] * 86400 - 2730) < 1e-6); assert.strictEqual(r[6], 1800); assert.strictEqual(r[5], ''); assert.strictEqual(r[7], '');
});

test('yinelenen tarih seans sayfasındaysa da DUPLICATE (set yazılmamış seans)', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 100)]);
  e.sheets.seans.data.push([D('2026-09-29'), '', 0, 25, '', '', '']);
  e.sheets.seans.data[1][0] = new e.CDate(Date.UTC(2026, 8, 29));
  e.sheets.seans.fmt.push(e.sheets.seans.data[1].map(() => 'X'));
  assert.strictEqual(e.call(fin('2026-09-29', [{ sira: 1, tamamlandi: true }])).error, 'DUPLICATE');
  assert.strictEqual(e.sheets.eski.getLastRow(), 1);
});

test('eski yazımı hatası: hiçbir sayfa değişmez', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 100)]);
  e.sheets.eski.failOn = 'write';
  const r = e.call(fin('2026-09-29', [{ sira: 1, tamamlandi: true }]));
  assert.strictEqual(r.error, 'SERVER'); assert.ok(!/write failed/.test(r.message));
  assert.strictEqual(e.sheets.eski.getLastRow(), 1); assert.strictEqual(e.sheets.seans.getLastRow(), 1); assert.strictEqual(e.sheets.Plan.getLastRow(), 2);
  assert.ok(!e.sheets.arsiv, 'arsiv oluşmaz');
});

test('kilit alınamazsa LOCKED, hiçbir şey yazılmaz', () => {
  const e = env([row('2026-09-29', 1, 'WU', 1, 100)]);
  e.ctx.LockService.getDocumentLock = () => ({ tryLock: () => false, releaseLock() {} });
  assert.strictEqual(e.call(fin('2026-09-29', [{ sira: 1, tamamlandi: true }])).error, 'LOCKED');
  assert.strictEqual(e.sheets.eski.getLastRow(), 1);
});

test('13.2: arşiv yok — eski arsiv sayfası olsa da dokunulmaz; günün plan satırları silinir, diğer günler kalır', () => {
  const arsiv = new Sheet('arsiv', ['Not', 'Sıra', 'Tarih', 'Blok', 'Fazla']);
  const e = env([row('2026-09-29', 2, 'MS', 1, 100), row('2026-09-30', 1, 'WU', 1, 100), row('2026-09-29', 1, 'WU', 1, 100, '', '', { Not: 'plan notu' })], { extra: { arsiv } });
  assert.ok(e.call(fin('2026-09-29', [{ sira: 1, tamamlandi: true }])).ok);
  assert.strictEqual(arsiv.getLastRow(), 1, 'arsiv\'e yazılmaz');
  assert.strictEqual(e.sheets.Plan.getLastRow(), 2, 'yalnız 30 Eylül kalır');
});

test('Plan satırları ardışık olmasa da hepsi silinir', () => {
  const rows = [];
  for (let i = 1; i <= 6; i++) rows.push(row(i % 2 ? '2026-09-29' : '2026-10-01', i, 'WU', 1, 100));
  const e = env(rows);
  const r = e.call(fin('2026-09-29', []));
  assert.strictEqual(r.data.silinenSet, 3); assert.ok(!('arsivlenenSet' in r.data));
  assert.ok(e.sheets.Plan.data.slice(1).filter((x) => x.some((v) => v !== '')).every((x) => x[1] % 2 === 0));
});

test('büyük plan: 200 set, sıra ve toplamlar doğru', () => {
  const rows = [];
  for (let i = 200; i >= 1; i--) rows.push(row('2026-09-29', i, 'MS', 2, 50, '00:50', '00:10'));
  const e = env(rows);
  const d = e.call({ action: 'getDates' }).data[0];
  assert.strictEqual(d.setSayisi, 200); assert.strictEqual(d.toplamMesafe, 20000); assert.strictEqual(d.hedefSure, 200 * 2 * 60);
  assert.deepStrictEqual(d.detay.slice(0, 3).map((s) => s.sira), [1, 2, 3]);
  const setler = d.detay.map((s) => ({ sira: s.sira, tamamlandi: true }));
  const r = e.call(fin('2026-09-29', setler));
  assert.strictEqual(r.data.yazilanSet, 200); assert.strictEqual(r.data.silinenSet, 200);
});

test('13.2.1: havuzSeans sayfası yoksa setler havuzVeri\'ye yazılır, plan silinir; yineleme havuzVeri\'den yakalanır', () => {
  const e = makeEnv({ Plan: new Sheet('Plan', H, [row('2026-09-29', 1, 'WU', 1, 100), row('2026-09-29', 2, 'MS', 1, 100)]), eski: new Sheet('eski', ESKI_H) });
  const r = e.call(fin('2026-09-29', [{ sira: 1, tamamlandi: true }, { sira: 2, tamamlandi: true }]));
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(r.data.yazilanSet, 2); assert.strictEqual(r.data.silinenSet, 2);
  assert.strictEqual(e.sheets.eski.getLastRow(), 3);
  assert.ok(!e.sheets.seans, 'havuzSeans oluşturulmaz');
  assert.strictEqual(e.call(fin('2026-09-29', [])).error, 'DUPLICATE');
});

test('13.8 Etiket: plandan okunur (sütun yoksa alan yok), değişmeyen sette plandan kopyalanır, idmanda değişen/eklenen sette yazılır', () => {
  const HE = [...H, 'Etiket'];
  const rowE = (t, s, b, tk, m, et) => [...row(t, s, b, tk, m), et];
  const e = makeEnv({
    Plan: new Sheet('Plan', HE, [rowE('2026-10-13', 1, 'MS', 5, 200, 'Aerobik Taban -1'), rowE('2026-10-13', 2, 'MS', 1, 200, 'Aerobik Taban -2'), rowE('2026-10-13', 3, 'CD', 1, 200, '')]),
    eski: new Sheet('eski', [...ESKI_H, 'Etiket']),
    seans: new Sheet('seans', SEANS_H),
  });
  const g = e.call({ action: 'getPlan', tarih: '2026-10-13' }).data.setler;
  assert.deepStrictEqual(g.map((x) => x.etiket), ['Aerobik Taban -1', 'Aerobik Taban -2', '']);
  assert.ok(!('etiket' in env([row('2026-10-13', 1, 'WU', 1, 100)]).call({ action: 'getPlan', tarih: '2026-10-13' }).data.setler[0]), 'eski tablo: alan yok');
  const r = e.call(fin('2026-10-13', [
    { sira: 1, tamamlandi: true, gercek: '04:28.0' },
    { sira: 2, tamamlandi: true, gercek: '04:17.0', plan: { etiket: 'Eşik' } },
    { sira: null, eklendi: true, tamamlandi: true, gercek: '01:00.0', plan: { blok: 'AS', tekrar: 1, mesafe: 50, stil: 'FR', tur: 'Swim', aciklama: '', hedef: '01:00', dinlen: '', alet: '', etiket: 'Bonus' } },
  ]));
  assert.ok(r.ok, JSON.stringify(r));
  const E = e.sheets.eski.data;
  const ci = E[0].indexOf('Etiket');
  assert.deepStrictEqual(E.slice(1, 4).map((x) => x[ci]), ['Aerobik Taban -1', 'Eşik', 'Bonus']);
});

console.log(`idman.gs uç durum testleri: TAMAM (${n} senaryo)`);
