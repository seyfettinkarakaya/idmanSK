// idmanRef.gs (eski SporRef.gs + salon referansları) ve idman.gs salon işlemleri (eski Salon.gs) testleri (sahte SpreadsheetApp).
//   node tests/test-gas-salon.cjs
const assert = require('assert');
const { Sheet, makeEnv, D } = require('./fakegas.cjs');

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', name); throw e; } };

// --- sporRef -----------------------------------------------------------------------
const refEnv = (extra = {}) => makeEnv({
  zone: new Sheet('zone', ['Zone', 'Alt Sınır', 'Üst Sınır', 'Tür', 'Açıklama'], [
    ['SP3', -999, '−19', 'PACE', 'not'], ['SP2', '−19', '−9', 'PACE', ''], ['EN3', '−3', 3, 'PACE', ''], ['TEC', '', '', 'OZEL', ''], ['SP3', 198, 999, 'HR', ''],
  ]),
  css: new Sheet('css', ['Tarih_ilk', 'Tarih_son', 'CSS (sn)', 'Alet', 'Havuz', 'Kaynak'], [
    [D('2026-07-06'), D('2026-08-31'), 122, '', 25, ''], [D('2026-07-06'), D('2026-08-31'), 111, 'Finn', 25, ''], [D('2026-07-06'), D('2026-08-31'), 123, '', 50, ''], ['', '', '', '', '', ''],
  ]),
  bilgi: new Sheet('bilgi', ['Kısaltma', 'Tam Adı', 'Açıklama', 'Açıklama.2'], [['Max Nabız', 198, 'Saha Max Nabız', ''], ['EN3', 'Endurance 3', 'Yüksek Aerobik', 'CSS-centered']]),
  alet: new Sheet('alet', ['Kod', 'Ad', 'Açıklama'], [['PB', 'Pullbuoy', 'Pulboy'], ['Finn', 'Finn', 'Ayak paleti']]),
  RPE: new Sheet('RPE', ['1–2 — Çok kolay.'], [['3–4 — Kolay.'], ['10 — Maksimal.']]),
  MSI: new Sheet('MSI', ['0 — Ağrı yok.'], [['0,5 — Hafif his.']]),
  fazBilgi: new Sheet('fazBilgi', ['Sezon', 'Faz', 'Tarih_ilk', 'Tarih_son', 'Ad', 'Odak'], [['26-27', 'Faz-0', D('2026-09-29'), D('2026-10-09'), '', '']]),
  ...extra,
}, 'secret', 'idmanRef.gs');

test('sporRef getRef: bölgeler (Unicode eksi), CSS, bilgi, alet, RPE/MSI (başlıksız), faz', () => {
  const r = refEnv().call({ action: 'getRef' });
  assert.ok(r.ok, JSON.stringify(r));
  const d = r.data;
  assert.deepStrictEqual(d.zones[0], { zone: 'SP3', alt: -999, ust: -19, tur: 'PACE', ad: '' });
  assert.deepStrictEqual(d.zones[1], { zone: 'SP2', alt: -19, ust: -9, tur: 'PACE', ad: '' });
  assert.strictEqual(d.zones[3].alt, null, 'TEC sınırsız');
  assert.strictEqual(d.zones[4].tur, 'HR');
  assert.deepStrictEqual(d.css, [
    { ilk: '2026-07-06', son: '2026-08-31', css: 122, alet: '', havuz: 25 },
    { ilk: '2026-07-06', son: '2026-08-31', css: 111, alet: 'Finn', havuz: 25 },
    { ilk: '2026-07-06', son: '2026-08-31', css: 123, alet: '', havuz: 50 },
  ]);
  assert.strictEqual(d.bilgi['Max Nabız'].ad, 198 + '');
  assert.deepStrictEqual(d.alet.map((a) => a.kod), ['PB', 'Finn']);
  assert.deepStrictEqual(d.rpe, ['1–2 — Çok kolay.', '3–4 — Kolay.', '10 — Maksimal.']);
  assert.deepStrictEqual(d.msi, ['0 — Ağrı yok.', '0,5 — Hafif his.']);
  assert.deepStrictEqual(d.faz[0], { sezon: '26-27', faz: 'Faz-0', ilk: '2026-09-29', son: '2026-10-09', ad: '', odak: '' });
});

test('sporRef: eksik sayfalar boş döner; yanlış anahtar AUTH; yazma işlemi yok', () => {
  const e = makeEnv({}, 'secret', 'idmanRef.gs');
  const r = e.call({ action: 'getRef' });
  assert.deepStrictEqual(r.data, { zones: [], css: [], bilgi: {}, alet: [], rpe: [], msi: [], faz: [], katalog: [], etki: [], bw: [] });
  assert.strictEqual(JSON.parse(e.ctx.doPost({ postData: { contents: JSON.stringify({ action: 'getRef', token: 'x' }) } }).s).error, 'AUTH');
  assert.strictEqual(e.call({ action: 'finishSession' }).error, 'UNKNOWN_ACTION');
  assert.strictEqual(e.call({ action: 'saveSalon' }).error, 'UNKNOWN_ACTION');
});

test('sporRef (sürüm 12): kisit, yuzmeKas, drill sayfaları varsa okunur; güvenli video', () => {
  const r = refEnv({
    kisit: new Sheet('kisit', ['Kural', 'Değer', 'Açıklama'], [['br_ay_max', 10, 'Kurbağalama ayda en çok %'], ['tani', 'Sağ kalça · Perthes', 'Koşu yok'], ['', 5, '']]),
    yuzmeKas: new Sheet('yuzmeKas', ['Stil', 'Grup', 'Katsayı'], [['fr', 'Omuz', '0,3'], ['FR', 'Sırt', 0.25], ['BR', 'Bacak', ''], ['', 'Omuz', 1]]),
    drill: new Sheet('drill', ['Ad', 'Video', 'Açıklama'], [['Catch-up', 'https://youtu.be/cu', 'tek kol'], ['Fist', 'http://kotu.example', '']]),
  }).call({ action: 'getRef' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepStrictEqual(r.data.kisit, [{ kural: 'br_ay_max', deger: 10, aciklama: 'Kurbağalama ayda en çok %' }, { kural: 'tani', deger: 'Sağ kalça · Perthes', aciklama: 'Koşu yok' }]);
  assert.deepStrictEqual(r.data.yuzmeKas, [{ stil: 'FR', grup: 'Omuz', katsayi: 0.3 }, { stil: 'FR', grup: 'Sırt', katsayi: 0.25 }]);
  assert.deepStrictEqual(r.data.drill.map((d) => d.video), ['https://youtu.be/cu', '']);
});

test('sporRef addCss: css sayfasının sonuna satır ekler, eski satırlar aynen; geçersiz CSS ve tarih reddedilir', () => {
  const e = refEnv();
  const before = e.sheets.css.data.map((r) => r.slice());
  const r = e.call({ action: 'addCss', tarih: '2026-10-06', css: 116, alet: '', havuz: 25 });
  assert.ok(r.ok, JSON.stringify(r));
  const sh = e.sheets.css;
  assert.deepStrictEqual(sh.data.slice(0, 4).map((x) => x.map(String)), before.slice(0, 4).map((x) => x.map(String)), 'eski satırlar değişmez');
  const row = sh.data[r.data.satir - 1];
  assert.ok(row[0] instanceof e.CDate && row[0].toISOString().startsWith('2026-10-06'));
  assert.deepStrictEqual(row.slice(1), ['', 116, '', 25, 'idmanSK CSS testi']);
  const g = e.call({ action: 'getRef' }).data.css;
  assert.deepStrictEqual(g[g.length - 1], { ilk: '2026-10-06', son: '', css: 116, alet: '', havuz: 25 });
  assert.strictEqual(e.call({ action: 'addCss', tarih: '2026-10-06', css: 20 }).error, 'BAD_REQUEST');
  assert.strictEqual(e.call({ action: 'addCss', tarih: '06.10.2026', css: 116 }).error, 'BAD_REQUEST');
});

test('getRef salonHar (eski H): isteğe bağlı Kısıt / Alternatif / Görsel yalnızca doluysa eklenir', () => {
  const e = makeEnv({
    H: new Sheet('H', ['Exercise', 'Goal Tag', 'Equipment', 'BW Coefficient', 'Swim Transfer Coefficient', 'Video', 'Kısıt', 'Alternatif', 'Görsel'], [
      ['Goblet Squat', 'Strength', 'Dumbbell', '—', 0.65, '', 'squat>90', 'Box Squat', 'Goblet_Squat'],
      ['Dead Bug', 'Strength', 'Bodyweight', 0.5, 0.8, '', '', '', ''],
    ]),
  }, 'secret', 'idmanRef.gs');
  const k = e.call({ action: 'getRef' }).data.katalog;
  assert.deepStrictEqual(k[0], { ad: 'Goblet Squat', amac: 'Strength', ekipman: 'Dumbbell', bw: null, stc: 0.65, video: '', kisit: 'squat>90', alternatif: 'Box Squat', gorsel: 'Goblet_Squat' });
  assert.deepStrictEqual(Object.keys(k[1]), ['ad', 'amac', 'ekipman', 'bw', 'stc', 'video']);
});

// --- Salon -------------------------------------------------------------------------
const IDMAN_H = ['Tarih', 'No', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Nabız', 'RPE', 'MSI', 'Açıklama'];
const salonEnv = (opts = {}) => makeEnv({
  idman: new Sheet('idman', opts.idmanH || IDMAN_H, opts.idman || [
    [D('2026-06-02'), 1, 'Band Bent Over Row', 4, 20, 15, 123, 7.5, 0, ''],
    [D('2026-06-02'), 2, 'Standard Pull-up', 3, 9.666666667, 'Vücut', 142, 9.5, 1, 'Setler: 11-9-9'],
    [D('2026-05-24'), 1, 'Band Bent Over Row', 4, 15, 15, '-', 7.5, 0, ''],
  ]),
}, 'secret', 'idman.gs');
/** idmanRef: salonHar (H), salonHKEtki (hkEtki), bilgi BW satırı (eski SalonTakip!ref). */
const salonRefEnv = () => makeEnv({
  H: new Sheet('H', ['Exercise', 'Goal Tag', 'Equipment', 'BW Coefficient', 'Swim Transfer Coefficient', 'Gemini STC', 'Chat GPT STC', 'Video'], [
    ['Band Bent Over Row', 'Rehab', 'Band', '—', 0.75, 0.65, 0.85, 'https://youtu.be/abc'],
    ['Standard Pull-up', 'Strength', 'Bodyweight', 0.95, 0.95, 0.9, 1, 'javascript:alert(1)'],
  ]),
  hkEtki: new Sheet('hkEtki', ['Exercise', 'Muscle Group', 'Muscle', 'Kinetic Chain', 'Yük Etki Oranı', 'Notlar'], [
    ['Band Bent Over Row', 'Back', 'Rhomboids', 'Upper Pull', 0.3, ''], ['Standard Pull-up', 'Back', 'Latissimus Dorsi', 'Upper Pull', '0,5', ''], ['Standard Pull-up', 'Biceps', 'Biceps', 'Upper Pull', 0.2, ''],
  ]),
  bilgi: new Sheet('bilgi', ['Kısaltma', 'Tam Adı', 'Açıklama', 'Açıklama.2'], [['EN3', 'Endurance 3', '', ''], ['BW', D('2025-01-01'), D('2026-12-31'), 90]]),
}, 'secret', 'idmanRef.gs');

test('getRef katalog/etki/BW (idmanRef) + getSalon geçmiş (idman salonVeri; katalog boş)', () => {
  const r = salonEnv().call({ action: 'getSalon' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepStrictEqual([r.data.katalog, r.data.etki, r.data.bw], [[], [], []], 'katalog idmanRef\'ten gelir');
  const rr = salonRefEnv().call({ action: 'getRef' });
  assert.ok(rr.ok, JSON.stringify(rr));
  assert.ok(!('BW' in rr.data.bilgi) && rr.data.bilgi.EN3, 'BW satırı bilgi listesine girmez');
  const d = { ...rr.data, gecmis: r.data.gecmis };
  assert.deepStrictEqual(d.katalog[0], { ad: 'Band Bent Over Row', amac: 'Rehab', ekipman: 'Band', bw: null, stc: 0.75, video: 'https://youtu.be/abc' });
  assert.strictEqual(d.katalog[1].video, '', 'youtube dışı adres kabul edilmez');
  assert.strictEqual(d.katalog[1].bw, 0.95);
  assert.deepStrictEqual(d.etki.map((x) => [x.ad, x.grup, x.oran]), [['Band Bent Over Row', 'Back', 0.3], ['Standard Pull-up', 'Back', 0.5], ['Standard Pull-up', 'Biceps', 0.2]]);
  assert.deepStrictEqual(d.bw, [{ ilk: '2025-01-01', son: '2026-12-31', kg: 90 }]);
  assert.strictEqual(d.gecmis.length, 3);
  assert.strictEqual(d.gecmis[1].agirlik, 'Vücut');
  assert.strictEqual(d.gecmis[1].tekrar, 9.666666667);
  assert.strictEqual(d.gecmis[2].nabiz, null, '"-" nabız boş sayılır');
  assert.strictEqual(d.gecmis[0].sure, '', 'Süre sütunu yoksa boş');
});

test('saveSalon: en üste A–J sırasıyla, K=Süre başlığı açılır, sayılar sayı, Vücut metin, tarih gerçek tarih', () => {
  const e = salonEnv();
  const r = e.call({ action: 'saveSalon', tarih: '2026-10-03', hareketler: [
    { hareket: 'Standard Pull-up', set: 3, tekrar: 29 / 3, agirlik: 'Vücut', nabiz: 142, rpe: 9.5, msi: 1, aciklama: 'Setler: 11-9-9. Omuz hassas', sure: '05:08' },
    { hareket: 'Band Bent Over Row', set: 4, tekrar: 20, agirlik: 15, nabiz: '', rpe: 7.5, msi: 0, aciklama: '', sure: '04:10' },
  ] });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(r.data.yazilan, 2);
  const sh = e.sheets.idman;
  assert.strictEqual(sh.data[0][10], 'Süre');
  const a = sh.data[1];
  assert.ok(a[0] instanceof e.CDate && a[0].toISOString().startsWith('2026-10-03'));
  assert.deepStrictEqual(a.slice(1, 10), [1, 'Standard Pull-up', 3, 9.67, 'Vücut', 142, 9.5, 1, 'Setler: 11-9-9. Omuz hassas']);
  assert.ok(Math.abs(a[10] * 86400 - 308) < 1e-6, 'süre gün kesri');
  assert.strictEqual(sh.fmt[1][10], '[h]:mm:ss');
  assert.deepStrictEqual(sh.data[2].slice(1, 9), [2, 'Band Bent Over Row', 4, 20, 15, '', 7.5, 0]);
  assert.strictEqual(sh.data[3][0].toISOString().slice(0, 10), '2026-06-02', 'eski satırlar aşağı kayar');
  // Geçmişte süre okunur
  const g = e.call({ action: 'getSalon' }).data.gecmis;
  assert.strictEqual(g[0].tarih, '2026-10-03');
});

test('saveSalon: aynı tarih DUPLICATE, boş liste BAD_REQUEST, bozuk tarih BAD_REQUEST, K doluysa MISSING_COLUMN', () => {
  const e = salonEnv();
  assert.strictEqual(e.call({ action: 'saveSalon', tarih: '2026-06-02', hareketler: [{ hareket: 'X', set: 1, tekrar: 1 }] }).error, 'DUPLICATE');
  assert.strictEqual(e.call({ action: 'saveSalon', tarih: '2026-10-03', hareketler: [] }).error, 'BAD_REQUEST');
  assert.strictEqual(e.call({ action: 'saveSalon', tarih: '03.10.2026', hareketler: [{ hareket: 'X' }] }).error, 'BAD_REQUEST');
  const e2 = salonEnv({ idmanH: [...IDMAN_H, 'Başka'], idman: [] });
  assert.strictEqual(e2.call({ action: 'saveSalon', tarih: '2026-10-03', hareketler: [{ hareket: 'X', set: 1, tekrar: 1 }] }).error, 'MISSING_COLUMN');
  const e3 = salonEnv({ idmanH: [...IDMAN_H, 'Süre'], idman: [] });
  assert.ok(e3.call({ action: 'saveSalon', tarih: '2026-10-03', hareketler: [{ hareket: 'X', set: 1, tekrar: 1, sure: '1:00' }] }).ok, 'var olan Süre başlığı kullanılır');
});

test('saveSalon: yazma hatasında satırlar geri alınır', () => {
  const e = salonEnv();
  e.sheets.idman.failOn = 'write';
  const r = e.call({ action: 'saveSalon', tarih: '2026-10-03', hareketler: [{ hareket: 'X', set: 1, tekrar: 1 }] });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(e.sheets.idman.data.length, 4, 'eklenen boş satır silindi');
});

test('savePlan / planYapildi (sürüm 13): plan sayfası yoksa açılır, gün satırları yenilenir, getSalon plan döner; idman dokunulmaz', () => {
  const e = salonEnv();
  const g0 = e.call({ action: 'getSalon' }).data;
  assert.ok(!('plan' in g0), 'plan sayfası yokken cevap eskisi gibi');
  const idman0 = JSON.stringify(e.sheets.idman.data);
  let r = e.call({ action: 'savePlan', tarih: '2026-10-07', hareketler: [{ hareket: 'Band Lat Pulldown', set: 4, tekrar: 20, agirlik: 15, dinlen: 60 }, { hareket: 'Deadbug', set: 3, tekrar: 40, agirlik: 'Vücut', ss: 'A', not: 'yavaş' }] });
  assert.ok(r.ok); assert.deepStrictEqual(r.data, { yazilan: 2, silinen: 0 });
  assert.deepStrictEqual(e.sheets.plan.data[0], ['Tarih', 'Sıra', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Süre', 'Dinlen', 'Süperset', 'Not', 'Durum']);
  e.call({ action: 'savePlan', tarih: '2026-10-09', hareketler: [{ hareket: 'Push-up (Standard)', set: 3, tekrar: 15, agirlik: 'Vücut' }] });
  r = e.call({ action: 'savePlan', tarih: '2026-10-07', hareketler: [{ hareket: 'Band Seated Row', set: 4, tekrar: 15, agirlik: 15 }] });
  assert.deepStrictEqual(r.data, { yazilan: 1, silinen: 2 }, 'aynı gün yenilenir');
  const plan = e.call({ action: 'getSalon' }).data.plan;
  assert.deepStrictEqual(plan.map((x) => [x.tarih, x.sira, x.hareket, x.agirlik, x.durum]), [['2026-10-07', 1, 'Band Seated Row', 15, ''], ['2026-10-09', 1, 'Push-up (Standard)', 'Vücut', '']]);
  // 13.2.1 (bilinçli değişiklik): planYapildi artık "yapıldı" işaretlemez, günün satırlarını siler (havuz gibi).
  assert.deepStrictEqual(e.call({ action: 'planYapildi', tarih: '2026-10-07' }).data, { silinen: 1 });
  assert.deepStrictEqual(e.call({ action: 'getSalon' }).data.plan.map((x) => x.tarih), ['2026-10-09']);
  assert.strictEqual(JSON.stringify(e.sheets.idman.data), idman0, 'idman sayfası değişmedi');
  assert.deepStrictEqual(e.call({ action: 'savePlan', tarih: '2026-10-09', hareketler: [] }).data, { yazilan: 0, silinen: 1 }, 'boş plan = günü sil');
  assert.strictEqual(e.call({ action: 'savePlan', tarih: '7.10.2026', hareketler: [] }).error, 'BAD_REQUEST');
  assert.strictEqual(salonEnv().call({ action: 'planYapildi', tarih: '2026-10-07' }).data.silinen, 0, 'sayfa yoksa bir şey yapmaz');
});

test('13.2.1: saveSalon sonrası günün salonPlan satırları silinir, diğer günler kalır; plan sayfası yoksa sorun yok', () => {
  const e = salonEnv();
  e.call({ action: 'savePlan', tarih: '2026-10-07', hareketler: [{ hareket: 'Band Seated Row', set: 4, tekrar: 15, agirlik: 15 }, { hareket: 'Deadbug', set: 3, tekrar: 10, agirlik: 'Vücut' }] });
  e.call({ action: 'savePlan', tarih: '2026-10-09', hareketler: [{ hareket: 'Push-up (Standard)', set: 3, tekrar: 15, agirlik: 'Vücut' }] });
  const r = e.call({ action: 'saveSalon', tarih: '2026-10-07', hareketler: [{ hareket: 'Band Seated Row', set: 1, tekrar: 15, agirlik: 15, sure: '03:00' }] });
  assert.ok(r.ok, JSON.stringify(r)); assert.deepStrictEqual(r.data, { yazilan: 1, silinenPlan: 2 });
  assert.deepStrictEqual(e.call({ action: 'getSalon' }).data.plan.map((x) => x.tarih), ['2026-10-09']);
  assert.ok(e.call({ action: 'getSalon' }).data.gecmis.some((x) => x.tarih === '2026-10-07'), 'salonVeri\'ye yazıldı');
  const r2 = salonEnv().call({ action: 'saveSalon', tarih: '2026-10-07', hareketler: [{ hareket: 'X', set: 1, tekrar: 1, sure: '01:00' }] });
  assert.ok(r2.ok); assert.deepStrictEqual(r2.data, { yazilan: 1, silinenPlan: 0 });
});

test('13.2 yeni sayfa adları (eşleme yok): idman havuzPlan/havuzVeri/havuzSeans/salonVeri/salonPlan; idmanRef salonHar/salonHKEtki/bilgi BW/faz', () => {
  const PH = ['Tarih', 'Sıra', 'Blok', 'Tekrar', 'Mesafe', 'Stil', 'Tür', 'Açıklama', 'Hedef', 'Dinlen', 'Alet', 'Gerçek', 'Kulaç', 'Nabız', 'RPE', 'MSI', 'Not'];
  const e = makeEnv({
    havuzPlan: new Sheet('havuzPlan', PH, [[D('2026-10-10'), 1, 'WU', 1, 200, 'FR', 'Swim', '', '00:04:00', '', '', '', '', '', '', '', '']]),
    havuzVeri: new Sheet('havuzVeri', PH), havuzSeans: new Sheet('havuzSeans', ['Tarih', 'Süre', 'Mesafe', 'Havuz', 'RPE', 'MSI', 'Açıklama']),
    salonVeri: new Sheet('salonVeri', IDMAN_H, [[D('2026-10-04'), 1, 'Band Bent Over Row', 4, 20, 15, '', 8, 0, '']]),
  }, 'secret', 'idman.gs', { alias: false });
  assert.strictEqual(e.call({ action: 'getDates' }).data[0].tarih, '2026-10-10');
  assert.strictEqual(e.call({ action: 'getSalon' }).data.gecmis.length, 1);
  const f = e.call({ action: 'finishSession', tarih: '2026-10-10', seans: { sure: '00:30:00', mesafe: 200, havuz: 25, rpe: 6, msi: '', aciklama: '' }, setler: [{ sira: 1, tamamlandi: true, gercek: '03:58.2' }] });
  assert.ok(f.ok, JSON.stringify(f));
  assert.deepStrictEqual([e.sheets.havuzVeri.getLastRow(), e.sheets.havuzSeans.getLastRow(), e.sheets.havuzPlan.getLastRow()], [2, 2, 1]);
  assert.ok(e.call({ action: 'savePlan', tarih: '2026-10-11', hareketler: [{ hareket: 'Dead Bug', set: 3, tekrar: 10 }] }).ok);
  assert.ok(e.sheets.karaPlan, '13.4 (bilinçli değişiklik): plan sayfası yoksa güncel adla (karaPlan) açılır');
  const r = makeEnv({
    salonHar: new Sheet('salonHar', ['Exercise', 'Goal Tag', 'Equipment', 'BW Coefficient', 'Swim Transfer Coefficient'], [['Dead Bug', 'Strength', 'Bodyweight', 0.5, 0.8]]),
    salonHKEtki: new Sheet('salonHKEtki', ['Exercise', 'Muscle Group', 'Muscle', 'Kinetic Chain', 'Yük Etki Oranı'], [['Dead Bug', 'Core', 'Rectus Abdominis', 'Stability', 1]]),
    bilgi: new Sheet('bilgi', ['Kısaltma', 'Tam Adı', 'Açıklama', 'Açıklama.2'], [['BW', D('2026-01-01'), D('2026-12-31'), 82]]),
    faz: new Sheet('faz', ['Sezon', 'Faz', 'Tarih_ilk', 'Tarih_son', 'Ad', 'Odak'], [['26-27', 'F1', D('2026-10-12'), D('2026-12-20'), 'Aerobik taban', '']]),
  }, 'secret', 'idmanRef.gs', { alias: false }).call({ action: 'getRef' }).data;
  assert.deepStrictEqual([r.katalog[0].ad, r.etki[0].grup, r.bw[0].kg, r.faz[0].faz, Object.keys(r.bilgi).length], ['Dead Bug', 'Core', 82, 'F1', 0]);
});

test('13.4 güncel adlar (eşleme yok): yuzmePlan/yuzmeVeri/yuzmeSeans, karaVeri/karaPlan; karaSeans varsa seans satırı yazılır ve getSalon döner; yoksa atlanır', () => {
  const PH = ['Tarih', 'Sıra', 'Blok', 'Tekrar', 'Mesafe', 'Stil', 'Tür', 'Açıklama', 'Hedef', 'Dinlen', 'Alet', 'Gerçek', 'Kulaç', 'Nabız', 'RPE', 'MSI', 'Not'];
  const KH = ['Tarih', 'No', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Nabız', 'RPE', 'MSI', 'Açıklama', 'Süre'];
  const mk = (seans) => makeEnv({
    yuzmePlan: new Sheet('yuzmePlan', PH, [[D('2026-10-14'), 1, 'WU', 1, 200, 'FR', 'Swim', '', '00:04:00', '', '', '', '', '', '', '', '']]),
    yuzmeVeri: new Sheet('yuzmeVeri', PH),
    yuzmeSeans: new Sheet('yuzmeSeans', ['Tarih', 'Süre', 'Mesafe', 'Havuz', 'RPE', 'MSI', 'Açıklama']),
    karaVeri: new Sheet('karaVeri', KH),
    karaPlan: new Sheet('karaPlan', ['Tarih', 'Sıra', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Süre', 'Dinlen', 'Süperset', 'Not', 'Durum'], [[D('2026-10-14'), 1, 'Dead Bug', 3, 10, 'Vücut', '', 60, '', '', '']]),
    ...(seans ? { karaSeans: new Sheet('karaSeans', ['Tarih', 'Süre', 'RPE', 'MSI', 'Yer', 'Açıklama']) } : {}),
  }, 'secret', 'idman.gs', { alias: false });
  const e = mk(true);
  assert.strictEqual(e.call({ action: 'getDates' }).data.length, 1);
  assert.ok(e.call({ action: 'finishSession', tarih: '2026-10-14', seans: { sure: '00:30:00', mesafe: 200, rpe: 5 }, setler: [{ sira: 1, tamamlandi: true }] }).ok);
  assert.deepStrictEqual([e.sheets.yuzmeVeri.getLastRow(), e.sheets.yuzmeSeans.getLastRow(), e.sheets.yuzmePlan.getLastRow()], [2, 2, 1]);
  const r = e.call({ action: 'saveSalon', tarih: '2026-10-14', hareketler: [{ hareket: 'Dead Bug', set: 3, tekrar: 10, agirlik: 'Vücut', sure: '04:00' }], seans: { sure: '0:52:30', rpe: 7, msi: 0.5, yer: 'Salon', aciklama: 'iyi' } });
  assert.ok(r.ok, JSON.stringify(r)); assert.deepStrictEqual(r.data, { yazilan: 1, silinenPlan: 1 });
  const ks = e.sheets.karaSeans.data[1];
  assert.deepStrictEqual([ks[2], ks[3], ks[4], ks[5]], [7, 0.5, 'Salon', 'iyi']);
  assert.strictEqual(Math.round(ks[1] * 86400), 52 * 60 + 30);
  const g = e.call({ action: 'getSalon' }).data;
  assert.deepStrictEqual(g.seans.map((x) => [x.tarih, x.rpe, x.msi, x.yer]), [['2026-10-14', 7, 0.5, 'Salon']]);
  assert.ok(g.seans[0].sure, 'süre metni');
  // karaSeans yoksa seans atlanır, idman yine yazılır
  const e2 = mk(false);
  const r2 = e2.call({ action: 'saveSalon', tarih: '2026-10-14', hareketler: [{ hareket: 'Dead Bug', set: 3, tekrar: 10, sure: '04:00' }], seans: { sure: '0:40:00', rpe: 6 } });
  assert.ok(r2.ok); assert.ok(!('seans' in e2.call({ action: 'getSalon' }).data));
  // karaSeans yazılamazsa karaVeri de geri alınır
  const e3 = mk(true);
  e3.sheets.karaSeans.failOn = 'write';
  const r3 = e3.call({ action: 'saveSalon', tarih: '2026-10-14', hareketler: [{ hareket: 'Dead Bug', set: 3, tekrar: 10, sure: '04:00' }], seans: { sure: '0:40:00', rpe: 6 } });
  assert.strictEqual(r3.ok, false);
  assert.strictEqual(e3.sheets.karaVeri.data.slice(1).filter((x) => x.some((v) => v !== '')).length, 0, 'karaVeri geri alındı');
  assert.strictEqual(e3.sheets.karaPlan.getLastRow(), 2, 'plan silinmedi');
});

test('13.9 karaSeans Tarih başlangıç saatiyle (karaVeri saatsiz); başlangıç yoksa yalnız gün', () => {
  const PH = ['Tarih', 'Sıra', 'Blok', 'Tekrar', 'Mesafe', 'Stil', 'Tür', 'Açıklama', 'Hedef', 'Dinlen', 'Alet', 'Gerçek', 'Kulaç', 'Nabız', 'RPE', 'MSI', 'Not'];
  const KH = ['Tarih', 'No', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Nabız', 'RPE', 'MSI', 'Açıklama', 'Süre'];
  const mk = (seans) => makeEnv({
    yuzmePlan: new Sheet('yuzmePlan', PH, [[D('2026-10-14'), 1, 'WU', 1, 200, 'FR', 'Swim', '', '00:04:00', '', '', '', '', '', '', '', '']]),
    yuzmeVeri: new Sheet('yuzmeVeri', PH),
    yuzmeSeans: new Sheet('yuzmeSeans', ['Tarih', 'Süre', 'Mesafe', 'Havuz', 'RPE', 'MSI', 'Açıklama']),
    karaVeri: new Sheet('karaVeri', KH),
    karaPlan: new Sheet('karaPlan', ['Tarih', 'Sıra', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Süre', 'Dinlen', 'Süperset', 'Not', 'Durum'], [[D('2026-10-14'), 1, 'Dead Bug', 3, 10, 'Vücut', '', 60, '', '', '']]),
    ...(seans ? { karaSeans: new Sheet('karaSeans', ['Tarih', 'Süre', 'RPE', 'MSI', 'Yer', 'Açıklama']) } : {}),
  }, 'secret', 'idman.gs', { alias: false });
  const e = mk(true);
  const t = Date.UTC(2026, 9, 14, 18, 20, 5);
  const r = e.call({ action: 'saveSalon', tarih: '2026-10-14', hareketler: [{ hareket: 'Dead Bug', set: 3, tekrar: 10, sure: '04:00' }], seans: { sure: '0:40:00', rpe: 6, baslangic: t } });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(e.sheets.karaSeans.data[1][0].getTime(), t);
  assert.strictEqual(e.sheets.karaSeans.fmt[1][0], 'dd.mm.yyyy hh:mm');
  assert.strictEqual(e.sheets.karaVeri.data[1][0].getUTCHours(), 0, 'karaVeri saatsiz');
  assert.deepStrictEqual(e.call({ action: 'getSalon' }).data.seans.map((x) => x.tarih), ['2026-10-14'], 'okurken gün');
});

test('13.4 idmanKutuphane.gs: karaHareket + karaEtki (A1 boş → A sütunu hareket), karaKas okunmaz; eski adlar da tanınır; token ve bilinmeyen işlem', () => {
  const e = makeEnv({
    karaHareket: new Sheet('karaHareket', ['Exercise', 'Goal Tag', 'Equipment', 'BW Coefficient', 'Swim Transfer Coefficient', 'Gemini STC', 'Chat GPT STC'], [
      ['Ab Wheel Rollout', 'Strength', 'Bodyweight', 0.85, 0.925, 0.9, 0.95], ['Band Bent Over Row', 'Rehab', 'Band', '—', 0.75, 0.65, 0.85], ['', '', '', '', '', '', '']]),
    karaKas: new Sheet('karaKas', ['Muscle Group', 'Muscle', 'Kinetic Chain'], [['Back', 'Erector Spinae', 'Mobility']]),
    karaEtki: new Sheet('karaEtki', ['', 'Muscle Group', 'Muscle', 'Kinetic Chain', 'Yük Etki Oranı', 'Notlar'], [
      ['Ab Wheel Rollout', 'Back', 'Erector Spinae', 'Posterior Chain', 0.15, 'Eksantrik'], ['Ab Wheel Rollout', 'Core', 'Rectus Abdominis (Upper)', 'Anterior Core', 0.3, 'Ana itici'], ['X', 'Core', '', '', '', '']]),
  }, 'kutkey', 'idmanKutuphane.gs', { alias: false });
  const r = e.call({ action: 'getKutuphane' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepStrictEqual(r.data.katalog, [
    { ad: 'Ab Wheel Rollout', amac: 'Strength', ekipman: 'Bodyweight', bw: 0.85, stc: 0.925, video: '' },
    { ad: 'Band Bent Over Row', amac: 'Rehab', ekipman: 'Band', bw: null, stc: 0.75, video: '' }]);
  assert.deepStrictEqual(r.data.etki.map((x) => [x.ad, x.grup, x.oran]), [['Ab Wheel Rollout', 'Back', 0.15], ['Ab Wheel Rollout', 'Core', 0.3]], 'oranı boş satır atlanır');
  assert.strictEqual(e.call({ action: 'getKutuphane', token: 'yanlis' }).error, 'AUTH');
  assert.strictEqual(e.call({ action: 'saveSalon' }).error, 'UNKNOWN_ACTION', 'yazma işlemi yok');
  const old = makeEnv({ salonHar: new Sheet('salonHar', ['Exercise', 'Equipment'], [['Dead Bug', 'Bodyweight']]), salonHKEtki: new Sheet('salonHKEtki', ['Exercise', 'Muscle Group', 'Yük Etki Oranı'], [['Dead Bug', 'Core', 1]]) }, 'k', 'idmanKutuphane.gs', { alias: false });
  assert.deepStrictEqual(old.call({ action: 'getKutuphane' }).data.etki.map((x) => x.ad), ['Dead Bug']);
  assert.deepStrictEqual(makeEnv({}, 'k', 'idmanKutuphane.gs', { alias: false }).call({ action: 'getKutuphane' }).data, { katalog: [], etki: [] });
});

console.log(`idman (salon) / idmanRef betik testleri: TAMAM (${n} senaryo)`);
