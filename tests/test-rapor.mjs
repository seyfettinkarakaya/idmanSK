// rapor.js (13.13): Analitik metinlerini sayıya çevirir, ekran modellerini kurar. Veri, idmanAnalitik.gs'nin sahte tablodaki çıktısıdır.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as R from '../rapor.js';

const require = createRequire(import.meta.url);
const { makeEnv } = require('./fakegas.cjs');
const { analitikSheets } = require('./analitik-ornek.cjs');
const raw = makeEnv(analitikSheets(), 'secret', 'idmanAnalitik.gs', { alias: false }).call({ action: 'getAnalitik' }).data;

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', name); throw e; } };

t('sayi ve sure: Türkçe ondalık, işaret, yüzde, birim; m:ss ve h:mm:ss', () => {
  assert.equal(R.sayi('13,3'), 13.3); assert.equal(R.sayi('+2,4'), 2.4); assert.equal(R.sayi('-17'), -17);
  assert.equal(R.sayi('0,00%'), 0); assert.equal(R.sayi('%6,0'), 6); assert.equal(R.sayi('37,3 dk'), 37.3);
  assert.equal(R.sayi('–'), null); assert.equal(R.sayi(''), null); assert.equal(R.sayi('abc'), null); assert.equal(R.sayi(undefined), null);
  assert.equal(R.sure('4:28'), 268); assert.equal(R.sure('0:22:31'), 1351); assert.equal(R.sure('2:06.4'), 126.4); assert.equal(R.sure('0:07:35.0'), 455);
  assert.equal(R.sure('2:06,4'), 126.4); assert.equal(R.sure('1:04:06'), 3846); assert.equal(R.sure('12'), null); assert.equal(R.sure(''), null);
  assert.equal(R.tarihKey('27.10.2026'), '2026-10-27'); assert.equal(R.tarihKey('2026-10-27'), '2026-10-27'); assert.equal(R.tarihKey('x'), '');
  assert.equal(R.gunAy('2026-10-27'), '27.10');
});

t('hedefModel: durum rengi ✓/✗/bekliyor; ilerleme yalnız eşik ve güncel aynı birimde; özet sayıları', () => {
  assert.deepEqual(['✓', '✓ yolunda', '✗', 'bekliyor', '', '25.12 sonrası'].map(R.durumOf), ['ok', 'ok', 'bad', 'wait', 'wait', 'wait']);
  assert.equal(R.ilerleme('40 dk', '37,3 dk'), 37.3 / 40);
  assert.equal(R.ilerleme('≥ 10', 'test 9,7'), 0.97);
  assert.equal(R.ilerleme('≥ 30 / 12 hafta · ara ≤ 14 gün', '8 seans'), null, 'karmaşık eşik: yanlış yüzde göstermek yerine yok');
  assert.equal(R.ilerleme('≤ %9', 'faz %6,0'), null, 'üst sınır hedefinde oran yok');
  assert.equal(R.ilerleme('40 dk', '2 saat'), null);
  assert.equal(R.ilerleme('40 dk', '50 dk'), 1, 'en çok 1');
  const m = R.hedefModel(raw.hedefler);
  assert.deepEqual(m.ozet, { ok: 4, bad: 1, wait: 4 });
  assert.equal(m.items[7].oran, 37.3 / 40);
  assert.equal(m.items[6].oran, 0.97);
  assert.deepEqual(R.uyarilar(raw.hedefler), [{ hedef: '2 · Kara seansı', guncel: '1/2 hafta · bu hafta 0' }]);
});

t('haftaModel: sayılar, en yüksek km, kara seansı olmayan haftalar', () => {
  const m = R.haftaModel(raw.durum);
  assert.deepEqual(m.list.map((x) => [x.hafta, x.km, x.yuzme, x.ara, x.kara, x.esikhiz]), [['5', 4.3, 2, 2, 1, 0], ['6', 6.6, 3, 4, 1, 9.09], ['7', 5.4, 2, 4, 0, 7.41], ['8', 7.2, 3, 4, 1, 2.78], ['9', 7.5, 3, 5, 0, 8]]);
  assert.equal(m.maxKm, 7.5); assert.deepEqual(m.karasiz, ['7', '9']);
});

t('knModel ve knEsik: üç nokta, süre sn, nabız ve kulaç serisi; eşik hedefler sayfasından', () => {
  const m = R.knModel(raw.kn);
  assert.deepEqual(m.noktalar.map((x) => x.ad), ['KN-1', 'KN-2', 'KN-3']);
  assert.deepEqual(m.noktalar[0].seri.map((x) => [x.tarih, x.sureSn, x.ort, x.kulac]), [['2026-10-13', 268, 162, 13.3], ['2026-10-20', 267, 164, 13], ['2026-10-27', 267, 156, 13.3]]);
  assert.equal(m.noktalar[2].seri[2].dort, -15);
  assert.deepEqual(R.knEsik(raw.hedefler), { ort: 161, kulac: 13.2 });
  assert.deepEqual(R.knEsik([]), { ort: null, kulac: null });
});

t('kesintisizModel: süre sn, en uzun dk, hedef dk hedefler sayfasından; KV', () => {
  const m = R.kesintisizModel(raw.kesintisiz, raw.kv, raw.hedefler);
  assert.equal(m.satirlar.length, 5);
  assert.deepEqual(m.satirlar.map((x) => [x.mesafe, Math.round(x.sureSn / 60 * 10) / 10, x.ort]), [[1000, 22.5, 177], [1200, 27.6, 172], [1600, 36.6, 148], [1600, 36.6, 163], [1600, 37.3, 142]]);
  assert.ok(Math.abs(m.enUzunDk - 37.3167) < 0.01); assert.equal(m.hedefDk, 40);
  assert.deepEqual(m.kv.map((x) => [x.set, x.fark, x.swolf, x.dswolf]), [['12×100', -8.4, 47.2, 0], ['8×150', -1, 47.3, 0.1]]);
  assert.equal(R.kesintisizModel([], [], []).enUzunDk, null);
});

t('rekorModel: etiket farkı (son − en iyi), CSS geçmişi tarih sırasıyla, hedef CSS; Test boşken testler yok', () => {
  const m = R.rekorModel(raw.derece, raw.test, raw.hedefler);
  assert.deepEqual(m.etiketler.map((x) => [x.etiket, x.sayi, x.fark]), [['CSS 400', 5, 27], ['CSS 200', 3, 5.3], ['Derece 100', 30, 13]]);
  assert.deepEqual(m.css.map((x) => [x.tarih, x.css]), [['2026-05-26', 124], ['2026-08-20', 122.3], ['2026-10-09', 126.4]]);
  assert.equal(m.hedefCss, 123); assert.deepEqual(m.testler, []);
});

t('sezonModel, bolgeModel, karaModel', () => {
  const s = R.sezonModel(raw.sezon, raw.model);
  assert.deepEqual(s.sezonlar.map((x) => [x.sezon, x.km, x.seanshafta, x.ms]), [['2024', 401.1, 1.88, 42], ['2025', 113.8, 1, 37], ['2026', 231.1, 2.21, 51], ['26-27', 31, 2.6, 52]]);
  assert.equal(s.maxKm, 401.1); assert.deepEqual(s.model.map((x) => x.kmhafta), [9.3, 6.6]);
  const b = R.bolgeModel(raw.bolge);
  assert.deepEqual([b[2].sezon, b[2].kolay, b[2].orta, b[2].esik, b[2].hiz, b[2].esikhiz], ['26-27', 22, 64, 6, 7, 14]);
  const k = R.karaModel(raw.kara);
  assert.deepEqual(k.map((x) => [x.tarih, x.setler, x.ort, x.toplam]), [['2026-10-04', [10, 7, 5], 7.3, 22], ['2026-10-10', [11, 9, 9], 9.7, 29], ['2026-10-25', [9, 9, 9], 9, 27]]);
});

t('boş ve eksik veri: modeller çökmez', () => {
  assert.deepEqual(R.hedefModel(undefined), { items: [], ozet: { ok: 0, bad: 0, wait: 0 } });
  assert.equal(R.haftaModel([]).maxKm, 0); assert.deepEqual(R.knModel([]).noktalar[0].seri, []);
  assert.deepEqual(R.rekorModel(undefined, undefined, undefined).etiketler, []); assert.deepEqual(R.bolgeModel(null), []); assert.deepEqual(R.karaModel(null), []);
});

console.log(`rapor.js testleri: TAMAM (${n})`);
