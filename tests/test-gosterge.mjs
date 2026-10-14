// gosterge.js (13.5: B1, B5, B7, B9, B10, B11, B16, B17, B18) birim testleri.
import assert from 'node:assert/strict';
import * as G from '../gosterge.js';
import * as Y from '../yuk.js';
import { hazirSkor } from '../hazir.js';

let n = 0;
const t = (ad, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', ad); throw e; } };

t('B1 oranlar: son 7 gün / önceki 4 haftanın ortalaması; yüzme, kara ayrı; renk; az veri', () => {
  const L = [];
  for (let i = 1; i <= 4; i++) { L.push({ tarih: Y.gunEkle('2026-10-14', -7 * i - 1), tur: 'yuzme', yuk: 400 }); L.push({ tarih: Y.gunEkle('2026-10-14', -7 * i - 2), tur: 'salon', yuk: 200 }); }
  L.push({ tarih: '2026-10-13', tur: 'yuzme', yuk: 360 }, { tarih: '2026-10-12', tur: 'salon', yuk: 300 });
  const o = G.oranlar(L, '2026-10-14');
  assert.deepEqual([o.top.oran, o.yuzme.oran, o.kara.oran], [1.1, 0.9, 1.5]);
  assert.deepEqual([o.top.renk, o.yuzme.renk, o.kara.renk], ['yesil', 'yesil', 'sari']);
  assert.match(o.metin, /^Bu hafta toplam yük son 4 haftanın ortalamasından %10 fazla\. Kara idmanı %50 arttı\.$/);
  assert.equal(G.oranRengi(1.6), 'turuncu'); assert.equal(G.oranRengi(0.5), 'az'); assert.equal(G.oranRengi(1.35, { sari: 1.4, turuncu: 1.6 }), 'yesil');
  assert.equal(G.oranlar([{ tarih: '2026-10-13', tur: 'yuzme', yuk: 100 }], '2026-10-14').top.oran, null);
});

t('B9 monotoni: düzenli dağılım düşük, her gün aynı yük yüksek; boş hafta null', () => {
  const g = { '2026-10-08': 300, '2026-10-10': 330, '2026-10-12': 360, '2026-10-13': 420 };
  const m = G.monotoni(g, '2026-10-14');
  assert.equal(m.gunler.length, 7); assert.equal(m.toplam, 1410);
  assert.ok(m.monotoni > 0 && m.monotoni < 2 && !m.yuksek, JSON.stringify(m));
  const her = {}; for (let i = 0; i < 7; i++) her[Y.gunEkle('2026-10-14', -i)] = 300 + (i % 2) * 10;
  assert.ok(G.monotoni(her, '2026-10-14').yuksek);
  assert.equal(G.monotoni({}, '2026-10-14').monotoni, null);
});

t('B17 trend + formEgrisi gKond: kara yükü yalnız yorgunluğa', () => {
  const g = {}, gy = {};
  for (let i = 0; i < 60; i++) { const tt = Y.gunEkle('2026-10-14', -i); g[tt] = i < 30 ? 500 : 200; gy[tt] = i < 30 ? 300 : 200; }
  const e = Y.formEgrisi(g, '2026-10-14', 42);
  assert.deepEqual(G.trend(e), { kondisyon: 'yukseliyor', yorgunluk: 'dengeli' });
  const e2 = Y.formEgrisi(g, '2026-10-14', 42, gy);
  assert.ok(e2.at(-1).kondisyon < e.at(-1).kondisyon && e2.at(-1).yorgunluk === e.at(-1).yorgunluk, 'kondisyon karasız, yorgunluk aynı');
  assert.deepEqual(G.trend(e.slice(0, 5)), { kondisyon: null, yorgunluk: null });
});

t('B18 karaArasi: 14 günden uzun ara uyarı, yakınsa ya da hiç yoksa null', () => {
  assert.deepEqual(G.karaArasi([{ tarih: '2026-09-28', tur: 'salon' }, { tarih: '2026-10-10', tur: 'yuzme' }], '2026-10-14'), { gun: 16, son: '2026-09-28' });
  assert.equal(G.karaArasi([{ tarih: '2026-10-05', tur: 'salon' }], '2026-10-14'), null);
  assert.equal(G.karaArasi([{ tarih: '2026-10-05', tur: 'yuzme' }], '2026-10-14'), null);
});

t('B5 reçete: döngü haftasına göre; aralık dolunca artır (bantta kademe), altta aralığa çık, RIR', () => {
  assert.deepEqual(G.receteOf('Hacim+'), { ad: 'Hacim+', min: 10, max: 12, rir: '2', rirMin: 2, dinlen: 75 });
  assert.equal(G.receteOf('Kuvvet haftası').ad, 'Kuvvet'); assert.equal(G.receteOf('?'), null);
  const R = G.receteOf('Hacim');
  assert.match(G.receteOneri({ tekrar: 15, rpe: 7 }, R, true).metin, /bandı bir kademe zorlaştır, 12'den başla/);
  assert.match(G.receteOneri({ tekrar: 15, rpe: 7 }, R, false).metin, /ağırlığı artır/);
  assert.equal(G.receteOneri({ tekrar: 15, rpe: 9 }, R).tip, 'tekrar', 'RIR 1: artırma yok');
  assert.match(G.receteOneri({ tekrar: 12, rpe: 9 }, R).metin, /RIR 2–3 kalacak/);
  assert.equal(G.receteOneri({ tekrar: 8, rpe: 6 }, R).tip, 'aralik');
  assert.equal(G.receteOneri(null, R), null);
});

t('B7 hazır olma kişisel taban: 7+ kontrolde ortalamaya göre karar ve 2 neden; azsa eski karar', () => {
  const H = {};
  for (let i = 1; i <= 10; i++) H[Y.gunEkle('2026-10-14', -i)] = { uyku: 4, agri: 1, enerji: 4, eklem: 0 };
  H['2026-10-14'] = { uyku: 2, agri: 2, enerji: 3, eklem: 1 };
  const r = G.hazirKisisel(H, '2026-10-14', (k) => hazirSkor(k));
  assert.equal(r.ort, 87); assert.equal(r.skor, 60); assert.equal(r.karar, 'dinlen', JSON.stringify(r));
  assert.deepEqual(r.nedenler.map((x) => x.ad), ['Eklem', 'Uyku']);
  const az = { '2026-10-13': { uyku: 4, agri: 1, enerji: 4 }, '2026-10-14': { uyku: 3, agri: 1, enerji: 3 } };
  const r2 = G.hazirKisisel(az, '2026-10-14', (k) => hazirSkor(k));
  assert.equal(r2.ort, null); assert.equal(r2.karar, hazirSkor(az['2026-10-14']).karar);
  assert.equal(G.hazirKisisel(az, '2026-10-15', (k) => hazirSkor(k)), null);
  const H3 = { ...H, '2026-10-14': { uyku: 4, agri: 1, enerji: 4, eklem: 2 } };
  assert.equal(G.hazirKisisel(H3, '2026-10-14', (k) => hazirSkor(k)).karar, 'dinlen', 'eklem MSI 2 kararı aynen');
});

t('B10 stres puanı (CSS temposuna göre, dinlenme yok) ve RPE kayması', () => {
  const s = G.stresPuani([{ ad: 'MS 4×100', mesafe: 100, reps: [120000, 120000, 120000, 120000] }, { ad: 'WU 1×200', mesafe: 200, reps: [300000] }], 120);
  assert.equal(s.satirlar[0].ad, 'MS 4×100'); assert.equal(s.satirlar[0].hiz, 100);
  assert.equal(s.satirlar[0].puan, 13, '8 dk × 1³ × 100 / 60');
  assert.equal(s.satirlar[1].hiz, 80);
  assert.equal(G.stresPuani([], 0), null);
  const gec = [{ tarih: '2026-09-30', ortSn: 270, rpe: 6 }, { tarih: '2026-09-23', ortSn: 271, rpe: 6 }, { tarih: '2026-09-10', ortSn: 300, rpe: 4 }];
  assert.match(G.rpeKaymasi(gec, 271, 8).metin, /RPE 2 arttı → yorgunluk/);
  assert.equal(G.rpeKaymasi(gec, 271, 7), null);
  assert.equal(G.rpeKaymasi(gec, 271, ''), null);
});

t('B11 bölge dağılımı faz hedefine göre; eksik bölge uyarısı', () => {
  const h = G.bolgeHedefi('1');
  assert.deepEqual(h, { EN1: 50, EN2: 35, EN3: 12, SP: 3 }); assert.equal(G.bolgeHedefi(3).SP, 10);
  const d = G.bolgeDagilimi([{ ms: 5500, zone: 'EN1' }, { ms: 500, zone: 'REC' }, { ms: 3500, zone: 'EN2' }, { ms: 400, zone: 'EN3' }, { ms: 100, zone: 'SP1' }], h);
  assert.deepEqual(d.pay, { EN1: 60, EN2: 35, EN3: 4, SP: 1 });
  assert.deepEqual(d.eksik.map((x) => x.grup), ['EN3', 'SP']);
  assert.match(d.eksik[0].metin, /EN3 eksik: sonraki yüzmeye eşik seti/);
  assert.equal(G.bolgeDagilimi([], h), null);
});

t('B16 uyum: ±%20 yeşil, dışı sarı, kaçan kırmızı, gelecek bekliyor; uyarlama ilk boş güne', () => {
  const u = G.uyum([
    { tarih: '2026-10-12', plan: [{ tur: 'yuzme' }], yapilan: [{ tur: 'yuzme', dk: 74, planDk: 75 }] },
    { tarih: '2026-10-13', plan: [], yapilan: [] },
    { tarih: '2026-10-14', plan: [{ tur: 'yuzme' }], yapilan: [{ tur: 'yuzme', dk: 50, planDk: 75 }] },
    { tarih: '2026-10-16', plan: [{ tur: 'yuzme' }], yapilan: [] },
    { tarih: '2026-10-17', plan: [{ tur: 'salon' }], yapilan: [] },
    { tarih: '2026-10-18', plan: [], yapilan: [] },
  ], '2026-10-17');
  assert.deepEqual(u.satirlar.map((s) => [s.durum, s.pay]), [['yesil', 99], ['bos', null], ['sari', 67], ['kirmizi', null], ['bekliyor', null], ['bos', null]]);
  assert.deepEqual(u.uyarlama, { kacan: '2026-10-16', hedef: '2026-10-18', tur: 'yuzme' });
});

console.log(`gosterge.js testleri: TAMAM (${n})`);
