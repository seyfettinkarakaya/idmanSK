// analiz.js (13.12): geçmişle kıyas — Drive + telefon listesi, aynı set sayılma anahtarı, kıyas, rekor.
import assert from 'node:assert/strict';
import * as A from '../analiz.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', name); throw e; } };
const dr = (t0, b, tk, m, g, z = '', a = '') => ({ t: t0, b, n: tk, m, s: 'FR', u: 'Swim', a, h: '', g, z });
const drive = {
  sets: [dr('2026-10-20', 'MS', 1, 200, '04:02.4', 'EN3'), dr('2026-10-13', 'MS', 1, 200, '03:52.0', 'SP1'), dr('2026-10-06', 'MS', 1, 200, '04:00.0', 'EN3', 'Snorkel'), dr('2026-09-29', 'MS', 5, 200, '04:10.0', 'EN3'), dr('2026-09-22', 'MS', 1, 200, '04:05.0', 'EN3')],
  seans: [{ t: '2026-10-20', ts: 100, rpe: 7, havuz: 25 }, { t: '2026-10-13', ts: 200, rpe: 8, havuz: 25 }, { t: '2026-10-13', ts: 300, rpe: 4, havuz: 25 }, { t: '2026-09-29', ts: 400, rpe: 6, havuz: 25 }, { t: '2026-09-22', ts: 500, rpe: 6, havuz: 50 }],
};
const q = (extra = {}) => ({ mesafe: 200, stil: 'FR', tur: 'Swim', alet: '', tempo: 121.5, ortSn: 243, zone: 'EN3', havuz: 25, ...extra });

t('gecmisListe: süre ve tempo; havuz/RPE yalnız o gün tek seans varsa; aynı gün iki idmanda RPE karışmaz', () => {
  const L = A.gecmisListe(drive, []);
  assert.equal(L.length, 5);
  const o20 = L.find((x) => x.tarih === '2026-10-20');
  assert.deepEqual([o20.ortSn, Math.round(o20.tempo * 10) / 10, o20.havuz, o20.rpe], [242.4, 121.2, 25, 7]);
  const o13 = L.find((x) => x.tarih === '2026-10-13');
  assert.equal(o13.rpe, null, 'iki seans: RPE atanmaz');
  assert.equal(L[0].tarih, '2026-10-20', 'yeniden eskiye');
});

t('benzerMi: bölge, alet, havuz, mesafe; tekrar sayısı eşleşmeyi bozmaz', () => {
  const L = A.gecmisListe(drive, []);
  const g = A.benzerGecmis(L, q(), '2026-10-27');
  assert.deepEqual(g.map((x) => [x.tarih, x.tekrar]), [['2026-10-20', 1], ['2026-09-29', 5]], 'SP1 (farklı bölge), Snorkel (farklı alet) ve 50 m havuz dışarıda; 5×200 eşleşir');
  assert.equal(A.benzerGecmis(L, q({ havuz: 50 }), '2026-10-27').length, 1, '50 m havuzda yalnız 50 m kaydı');
  assert.equal(A.benzerGecmis(L, q({ mesafe: 100 }), '2026-10-27').length, 0);
  assert.equal(A.benzerGecmis(L, q({ alet: 'Snorkel' }), '2026-10-27').length, 1);
  // bölge yoksa tempo bandı (±6 sn/100)
  const L2 = A.gecmisListe({ sets: [dr('2026-10-20', 'MS', 1, 200, '04:02.4'), dr('2026-10-13', 'MS', 1, 200, '04:30.0')], seans: [] }, []);
  assert.equal(A.benzerGecmis(L2, q({ zone: '' }), '2026-10-27').length, 1, '4:02 yakın, 4:30 değil');
  assert.equal(A.benzerGecmis(L2, q({ zone: '', tempo: 0 }), '2026-10-27').length, 2, 'tempo bilinmiyorsa yapı eşleşir');
});

t('kiyas2 ve rekor2: geçen benzer set, fark (− hızlı), en hızlı; bugün ve sonrası dışarıda', () => {
  const L = A.gecmisListe(drive, []);
  const k = A.kiyas2(L, q({ ortSn: 240 }), '2026-10-27');
  assert.deepEqual([k.tarih, k.onceki, k.fark], ['2026-10-20', 242.4, -2.4]);
  assert.equal(A.kiyas2(L, q({ ortSn: 240 }), '2026-10-20').tarih, '2026-09-29', 'o günden önce');
  assert.deepEqual(A.rekor2(L, q({ ortSn: 240 }), '2026-10-27'), { onceki: 242.4 });
  assert.equal(A.rekor2(L, q({ ortSn: 250 }), '2026-10-27'), null);
  assert.equal(A.kiyas2([], q(), '2026-10-27'), null);
});

t('telefon geçmişi: Drive ile aynı kayıt tekrarlanmaz; yalnız telefonda olan eklenir', () => {
  const hist = [
    { id: 'a', tarih: '2026-10-20', seans: { rpe: 7, havuz: 25 }, setler: [{ tamamlandi: true, blok: 'MS', tekrar: 1, mesafe: 200, stil: 'FR', tur: 'Swim', gercek: '04:02.4' }] }, // Drive'da var
    { id: 'b', tarih: '2026-10-24', seans: { rpe: 6, havuz: 25 }, setler: [{ tamamlandi: true, blok: 'MS', tekrar: 1, mesafe: 200, stil: 'FR', tur: 'Swim', gercek: '04:01.0' }, { tamamlandi: false, blok: 'AS', tekrar: 4, mesafe: 50, stil: 'FR', tur: 'Swim', gercek: '' }] },
    { id: 'c', tur: 'salon', tarih: '2026-10-25', setler: [] },
  ];
  const L = A.gecmisListe(drive, hist);
  assert.equal(L.length, 6, '5 Drive + 1 yalnız telefonda');
  assert.deepEqual(L.filter((x) => x.kaynak === 'telefon').map((x) => [x.tarih, x.ortSn, x.rpe]), [['2026-10-24', 241, 6]]);
  assert.equal(A.gecmisListe(null, hist).length, 2, 'Drive yokken telefon geçmişi tek başına');
});

t('planlanan set önizlemesi: hedef tempo aynıysa eşleşir (gerçek performans düşük olsa da); farklı plan yoğunluğu karışmaz', () => {
  const L = A.gecmisListe({ sets: [{ ...dr('2026-10-20', 'MS', 1, 200, '04:30.0', 'EN2'), h: '04:16' }, { ...dr('2026-10-13', 'MS', 1, 200, '03:52.0', 'SP1'), h: '03:52' }], seans: [] }, []);
  const hedef = (sn) => ({ mesafe: 200, stil: 'FR', tur: 'Swim', alet: '', tempo: 0, zone: '', hedefTempo: (sn / 200) * 100 });
  assert.deepEqual(A.benzerGecmis(L, hedef(256), '2026-10-27').map((x) => x.tarih), ['2026-10-20'], 'Taban-1 (4:16 hedefli) gerçek 4:30 yüzülse de eşleşir');
  assert.deepEqual(A.benzerGecmis(L, hedef(232), '2026-10-27').map((x) => x.tarih), ['2026-10-13'], 'sprint planı karışmaz');
});

console.log(`analiz.js geçmiş kıyası testleri: TAMAM (${n})`);
