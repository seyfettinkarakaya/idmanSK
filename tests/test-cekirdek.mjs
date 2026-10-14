// Sürüm 12 çekirdeği: grup.js (10 kas grubu), kisit.js (sağlık kısıtları), yuk.js (yük, form, toparlanma).
//   node tests/test-cekirdek.mjs
import assert from 'node:assert/strict';
import * as G from '../grup.js';
import * as K from '../kisit.js';
import * as Y from '../yuk.js';
import * as BI from '../bilgi.js';
import * as A from '../analiz.js';
import * as V from '../video.js';
import * as HZ from '../hazir.js';
import { VIDEOLAR } from '../videolar.js';
import * as M from '../model.js';
import * as S from '../salon.js';
import * as Z from '../zaman.js';
import * as R from '../ref.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', name); throw e; } };

t('grup: tablo adları → 10 grup, eski adlar, bilinmeyen gri', () => {
  assert.equal(G.grupAd('Back'), 'Sırt');
  assert.equal(G.grupAd('Biceps'), 'Biseps');
  assert.equal(G.grupAd('Forearms'), 'Ön kol');
  assert.equal(G.grupAd('Hip'), 'Kalça yanı');
  assert.equal(G.grupAd('Core'), 'Karın');
  assert.equal(G.grupAd('Abs'), 'Karın');
  assert.equal(G.grupAd('Legs'), 'Bacak');
  assert.equal(G.grupAd(' glutes '), 'Kalça');
  assert.equal(G.grupAd('Arms'), 'Kol');
  assert.equal(G.grupAd('Neck'), 'Neck');
  assert.equal(G.grupRenk('Neck'), '#94A3B8');
  assert.equal(G.grupRenk('Triceps'), '#33B5F0');
  assert.deepEqual(G.haritaGruplari('Arms'), ['Biseps', 'Triseps', 'Ön kol']);
  assert.deepEqual(G.haritaGruplari('Neck'), []);
  const p = G.haritaPay({ Back: 0.7, Arms: 0.3 });
  assert.equal(p['Sırt'], 0.7); assert.ok(Math.abs(p.Biseps - 0.1) < 1e-9);
  assert.deepEqual(G.sirala(['Legs', 'Neck', 'Shoulders', 'Arms']), ['Shoulders', 'Legs', 'Arms', 'Neck']);
});

t('kısıt: varsayılanlar; sporRef satırları geçersizleri atlayarak yerine geçer', () => {
  const v = K.kurallar(null);
  assert.equal(v.brAyMax, 10); assert.equal(v.kaynak, 'varsayılan'); assert.equal(v.tanilar.length, 3);
  const c = K.kurallar({ kisit: [
    { kural: 'tani', deger: 'Sağ kalça', aciklama: 'koşu yok' }, { kural: 'br_ay_max', deger: 8 }, { kural: 'squat_derinlik', deger: 'abc' },
    { kural: 'MSI_dur', deger: '1,5' }, { kural: 'sure_ogle', deger: 60 }, { kural: 'kulac_yuzus', deger: '12–14' }, { kural: 'omuz_rahatlatma', deger: 'hayır' },
    { kural: 'yasak', deger: 'Koşu; Jump' },
  ] });
  assert.deepEqual(c.tanilar, [{ ad: 'Sağ kalça', kural: 'koşu yok' }]);
  assert.equal(c.brAyMax, 8); assert.equal(c.squatDerinlik, 90, 'geçersiz değer: varsayılan');
  assert.equal(c.msi.dur, 1.5); assert.equal(c.sure.ogle, 60); assert.deepEqual(c.kulac.yuzus, [12, 14]);
  assert.equal(c.omuzRahatlatma, false); assert.deepEqual(c.yasak, ['koşu', 'jump']); assert.equal(c.kaynak, 'sporRef');
});

t('kısıt: hareket durumları (Perthes, omuz, elle kısıt, sözcük başı eşleşme)', () => {
  const h = (ad, ekipman = 'Dumbbell', extra = {}) => K.hareketKisit({ ad, ekipman, ...extra });
  assert.equal(h('Crunch').durum, 'uygun', '"run" Crunch\'ı yakalamaz');
  assert.equal(h('Treadmill Running').durum, 'yasak');
  assert.match(h('Box Jump').neden[0], /zıplama/);
  const g = h('Goblet Squat');
  assert.equal(g.durum, 'yasak'); assert.equal(g.alternatif, 'Box Squat ≤ 90°');
  assert.equal(h('Goblet Squat', 'Dumbbell', { alternatif: 'Glute Bridge' }).alternatif, 'Glute Bridge');
  assert.equal(h('Bodyweight Squat', 'Bodyweight').durum, 'dikkat');
  assert.equal(h('Box Squat', 'Barbell').durum, 'dikkat');
  assert.match(h('Dumbbell Shoulder Press').notlar[0], /omuz/i);
  assert.equal(h('Hip Thrust', 'Barbell', { kisit: 'yasak: diz' }).durum, 'yasak');
  assert.equal(h('Hip Thrust', 'Barbell', { kisit: 'yavaş' }).durum, 'dikkat');
});

t('kısıt: MSI kararı, hafifletme, süre bütçesi, kulaç normu', () => {
  assert.deepEqual([0, 0.5, 1, 1.5, 2, 3].map((v) => K.msiKarar(v).seviye), ['devam', 'gozlem', 'hafiflet', 'hafiflet', 'dur', 'tibbi']);
  assert.deepEqual(K.hafiflet({ tekrar: 10, agirlik: 15, sure: 0 }), { tekrar: 8, agirlik: 12.5, sure: 0 });
  assert.deepEqual(K.hafiflet({ tekrar: 1, agirlik: 'Vücut', sure: 45 }), { tekrar: 1, agirlik: 'Vücut', sure: 35 });
  assert.equal(K.hafiflet({ tekrar: 8, agirlik: 40, sure: 0 }).agirlik, 35, '%10 ile 2,5 adımın büyüğü');
  assert.deepEqual(K.sureButcesi(new Date(2026, 9, 6, 7, 30)), { dk: 80, dilim: 'sabah', gun: 'Sal' });
  assert.deepEqual(K.sureButcesi(new Date(2026, 9, 8, 12, 30)), { dk: 65, dilim: 'ogle', gun: 'Per' });
  assert.deepEqual(K.sureButcesi(new Date(2026, 9, 9, 19, 0)), { dk: null, dilim: 'aksam', gun: 'Cum' });
  assert.equal(K.kulacNormu({ tur: 'Drill' }).tur, 'drill');
  assert.equal(K.kulacNormu({ tur: 'Swim', alet: 'Şamandıra' }).tur, 'pull');
  assert.equal(K.kulacDurum(16, { tur: 'Swim' }).durum, 'yuksek');
  assert.equal(K.kulacDurum(14, { tur: 'Swim' }).durum, 'norm');
  assert.equal(K.kulacDurum(0, { tur: 'Swim' }), null);
});

const swim = (tarih, sure, rpe, setler, endedAt) => ({ tarih, seans: { sure, rpe }, setler, endedAt });
t('yük: yüzme + salon seansları, telefon/tablo birleşimi, kas yükü', () => {
  const hist = [
    swim('2026-10-06', '01:20:00', 6, [{ mesafe: 200, yapilan: 4, stil: 'FR', tur: 'Swim' }, { mesafe: 50, yapilan: 4, stil: 'BR', tur: 'Swim' }, { mesafe: 50, yapilan: 4, stil: 'FR', tur: 'Kick' }], Date.UTC(2026, 9, 6, 8)),
    { tur: 'salon', tarih: '2026-10-08', endedAt: 1, hareketler: [{ hareket: 'Row', set: 3, tekrar: 10, rpe: 8, sure: '05:00', msi: '' }] },
    { tur: 'salon', tarih: '2026-10-01', hareketler: [{ hareket: 'Eski', set: 3, tekrar: 10, rpe: 9, sure: '05:00' }] },
  ];
  const salonGecmis = [{ tarih: '2026-10-01', hareket: 'Row', set: 4, tekrar: 12, rpe: 7, sure: '10:00', msi: 1 }];
  const etkiPay = (ad) => (ad === 'Row' ? { Back: 0.8, Arms: 0.2 } : {});
  const L = Y.seanslar({ hist, salonGecmis, etkiPay });
  assert.deepEqual(L.map((s) => [s.tarih, s.tur]), [['2026-10-01', 'salon'], ['2026-10-06', 'yuzme'], ['2026-10-08', 'salon']]);
  const y = L[1];
  assert.equal(y.dk, 80); assert.equal(y.yuk, 480); assert.equal(y.metre, 1200);
  assert.deepEqual(y.stil, { FR: 1000, BR: 200 });
  const kas = Object.values(y.kas).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(kas - 480) < 1e-6, 'kas yükleri seans yükünü paylaştırır');
  assert.ok(y.kas.Bacak > y.kas.Triseps, 'kick ve BR bacağa yazılır');
  assert.equal(L[0].yuk, 70, 'tablodaki gün (10 dk × RPE 7) telefondakinin yerine geçer');
  assert.equal(L[0].msiMax, 1);
  assert.ok(Math.abs(L[2].kas['Sırt'] - 40 * 0.8) < 1e-9 && Math.abs(L[2].kas.Biseps - 40 * 0.2 / 3) < 1e-9, 'Arms üç gruba bölünür');
});

t('13.4 yük: karaSeans (ya da telefondaki seans özeti) varsa gerçek süre × idman RPE; yoksa hareket toplamı × ortalama', () => {
  const salonGecmis = [{ tarih: '2026-10-01', hareket: 'Row', set: 4, tekrar: 12, rpe: 7, sure: '10:00', msi: 1 }, { tarih: '2026-10-02', hareket: 'Row', set: 4, tekrar: 12, rpe: 7, sure: '10:00' }];
  const hist = [{ tur: 'salon', tarih: '2026-10-03', endedAt: 1, hareketler: [{ hareket: 'Row', set: 3, tekrar: 10, rpe: 8, sure: '05:00' }], seans: { sure: '0:40:00', rpe: 6, msi: '', yer: 'Ev', aciklama: '' } }];
  const salonSeans = [{ tarih: '2026-10-01', sure: '0:50:00', rpe: 8, msi: 0, yer: 'Salon' }, { tarih: '2026-10-02', sure: '0:45:00', rpe: null }];
  const L = Y.seanslar({ hist, salonGecmis, salonSeans });
  const by = Object.fromEntries(L.map((x) => [x.tarih, x]));
  assert.deepEqual([by['2026-10-01'].dk, by['2026-10-01'].rpe, by['2026-10-01'].yuk], [50, 8, 400], 'karaSeans: 50 dk × RPE 8');
  assert.deepEqual([by['2026-10-02'].dk, by['2026-10-02'].rpe, by['2026-10-02'].yuk], [45, 7, 315], 'RPE boşsa hareket ortalaması, süre seanstan');
  assert.deepEqual([by['2026-10-03'].dk, by['2026-10-03'].rpe, by['2026-10-03'].yuk], [40, 6, 240], 'telefondaki seans özeti');
  assert.equal(Y.seanslar({ salonGecmis }).find((x) => x.tarih === '2026-10-01').yuk, 70, 'seans yoksa eskisi gibi');
});

t('yük: form eğrisi, oran, toparlanma, BR payı, haftalık gün', () => {
  const g = {};
  for (let i = 0; i < 28; i++) g[Y.gunEkle('2026-09-10', i)] = i % 2 ? 0 : 400;
  const f = Y.formEgrisi(g, '2026-10-07', 20);
  assert.equal(f.length, 21); assert.equal(f[f.length - 1].tarih, '2026-10-07');
  assert.ok(f[f.length - 1].kondisyon > 0 && f[f.length - 1].yorgunluk > 0);
  assert.equal(Y.yukOrani({ '2026-10-01': 100 }, '2026-10-07'), null, '2 haftadan az veri');
  const r = Y.yukOrani(g, '2026-10-07');
  assert.ok(r > 0.8 && r < 1.3, String(r));
  assert.equal(Y.oranDurum(1.6).durum, 'yuksek'); assert.equal(Y.oranDurum(1.35).durum, 'sinirda'); assert.equal(Y.oranDurum(null).durum, 'bilinmiyor');
  const now = Date.UTC(2026, 9, 7, 8);
  const tp = Y.toparlanma([{ tarih: '2026-10-06', ts: Date.UTC(2026, 9, 6, 8), tur: 'yuzme', kas: { Omuz: 300 } }, { tarih: '2026-10-06', ts: Date.UTC(2026, 9, 6, 20), tur: 'salon', kas: { Omuz: 100 } }, { tarih: '2026-09-01', ts: 1, tur: 'salon', kas: { Bacak: 900 } }], now);
  assert.ok(tp.Omuz.toparlanma > 30 && tp.Omuz.toparlanma < 70, JSON.stringify(tp.Omuz));
  assert.ok(tp.Omuz.yuzmePay > 60);
  assert.equal(tp.Bacak, undefined, '4 günden eski yok sayılır');
  assert.deepEqual(Y.stilAy([{ tur: 'yuzme', tarih: '2026-10-06', stil: { FR: 900, BR: 100 } }, { tur: 'yuzme', tarih: '2026-09-30', stil: { BR: 500 } }], '2026-10'), { stil: { FR: 900, BR: 100 }, toplam: 1000, brOran: 10 });
  assert.equal(Y.haftaGunleri([{ tarih: '2026-10-05' }, { tarih: '2026-10-06' }, { tarih: '2026-10-06' }, { tarih: '2026-10-12' }], '2026-10-08'), 2);
  assert.equal(Y.sureSn('01:18:20'), 4700); assert.equal(Y.sureSn('4:10'), 250); assert.equal(Y.sureSn(''), 0);
  assert.equal(Y.yuzmeKatsayi({ yuzmeKas: [{ stil: 'fr', grup: 'Shoulders', katsayi: 0.5 }] }).FR.Omuz, 0.5);
});

t('bilgi: hareket adı eşleştirme (ekipman sözcüğü içerik sayılmaz, eşik), Görsel sütunu, kas yoğunluğu', () => {
  const db = [['External_Rotation_with_Band', 'External Rotation with Band'], ['Back_Flyes_-_With_Bands', 'Back Flyes - With Bands'], ['Dumbbell_Flyes', 'Dumbbell Flyes'],
    ['Pullups', 'Pullups'], ['Plank', 'Plank'], ['Push_Up_to_Side_Plank', 'Push Up to Side Plank'], ['Wide-Grip_Lat_Pulldown', 'Wide-Grip Lat Pulldown'], ['Crunches', 'Crunches']];
  assert.equal(BI.eslestir('Band External Rotation', db), 'External_Rotation_with_Band');
  assert.equal(BI.eslestir('Standard Pull-up', db), 'Pullups');
  assert.equal(BI.eslestir('Front Plank', db), 'Plank');
  assert.equal(BI.eslestir('Band Lat Pulldown', db), 'Wide-Grip_Lat_Pulldown');
  assert.equal(BI.eslestir('Band Chest Fly', db), null, 'göğüs fly sırt fly\'ına eşleşmez; ekipman da farklı → emin değil');
  assert.equal(BI.eslestir('Dumbbell Chest Fly', db), 'Dumbbell_Flyes');
  assert.equal(BI.eslestir('Side Plank Abduction', db), null, 'emin değilse eşleştirmez');
  assert.equal(BI.eslestir('Band Bent Over Row', db, 'Crunches'), 'Crunches', 'Görsel sütunu önce');
  assert.equal(BI.eslestir('', db), null);
  assert.deepEqual([...BI.sozcukler('Chin-Ups with Bands')], ['chinup', 'band']);
  assert.deepEqual([...BI.sozcukler('Deadbug')], [...BI.sozcukler('Dead Bug')], 'Deadbug = Dead Bug');
  assert.deepEqual(BI.kasYogunluk(['shoulders'], ['triceps', 'shoulders', 'lats']), { Triseps: 0.45, Omuz: 1, 'Sırt': 0.45 });
});
t('analiz: tempo, SWOLF, bölge payları, aynı setle kıyas ve rekor, ağrı geçmişi, CSS testi, tahmin, drill, test zamanı', () => {
  assert.equal(A.lapSn('1:31.2'), 91.2); assert.equal(A.lapSn('58'), 58); assert.equal(A.lapSn('x'), null);
  assert.equal(A.setImza({ tekrar: 4, mesafe: 100, stil: 'fr', tur: 'Swim' }), '4×100 FR swim');
  assert.equal(A.swolf(91000, 100, 14), 37); assert.equal(A.kulacBasi(14), 1.79); assert.equal(A.swolf(0, 100, 14), null);
  const b = A.bolgeSureleri([{ ms: 3000, n: 3, zone: 'EN2' }, { ms: 1000, n: 4, zone: 'EN3' }, { ms: 1000, n: 3, zone: 'EN2' }, { ms: 5, n: null }]);
  assert.deepEqual(b.map((x) => [x.zone, x.pay]), [['EN2', 80], ['EN3', 20]]);
  assert.deepEqual(A.denge([{ n: 2, ms: 6 }, { n: 4, ms: 3 }, { n: 6, ms: 1 }]), { kolay: 60, esik: 30, hiz: 10 });
  const set = (gercek, tarih) => ({ tarih, setler: [{ tekrar: 4, mesafe: 100, stil: 'FR', tur: 'Swim', tamamlandi: true, gercek }], seans: { rpe: 5, msi: '' } });
  const hist = [set('1:33.0', '2026-09-29'), set('1:35.0', '2026-09-22'), { tur: 'salon', tarih: '2026-09-30' }];
  assert.deepEqual(A.kiyas(hist, '4×100 FR swim', '2026-10-06', 91), { tarih: '2026-09-29', onceki: 93, fark: -2 });
  assert.deepEqual(A.setRekor(hist, '4×100 FR swim', '2026-10-06', 91), { onceki: 93 });
  assert.equal(A.setRekor(hist, '4×100 FR swim', '2026-10-06', 94), null);
  assert.deepEqual(A.msiParse('sag omuz 1; bel 0.5'), { 'sag omuz': 1, bel: 0.5 });
  const ag = A.agriGecmisi([{ tarih: '2026-10-01', seans: { msi: 'sag omuz 1' } }, { tarih: '2026-10-03', seans: { msi: 'sag omuz 0.5; bel 1' } }, { tarih: '2026-08-01', seans: { msi: 'sag diz 2' } }], '2026-09-08');
  assert.deepEqual(ag, { 'sag omuz': { n: 2, max: 1, ort: 0.8 }, bel: { n: 1, max: 1, ort: 1 } });
  assert.equal(A.cssTesti(456, 224), 116, '7:36 ve 3:44 → 1:56'); assert.equal(A.cssTesti(456, 400), null, 'mantıksız süreler');
  assert.equal(A.cssTesti(477, 224), 126.5);
  assert.deepEqual(A.dereceTahmini(117), { 100: 105, 200: 222, 400: 460 });
  assert.equal(A.drillBul('4×50 Catch-up drill, snorkel', [{ ad: 'Catch-up', video: 'v' }, { ad: 'Fist', video: 'f' }]).video, 'v');
  assert.equal(A.drillBul('serbest', [{ ad: 'Fist' }]), null);
  assert.ok(A.aerobikBlok('ms') && !A.aerobikBlok('CD'));
  const esik = [set('1:53.0', '2026-10-01'), set('1:54.0', '2026-10-03'), set('1:52.0', '2026-10-05')];
  assert.deepEqual(A.cssTestiZamani(esik, 117, '2026-10-06'), { setSayisi: 3, ortTempo: 113, rpe: 5 });
  assert.equal(A.cssTestiZamani(esik, 114, '2026-10-06'), null, 'hedefin 2 sn altında değil');
});

t('yuk.cakisma: ağır omuz salonu + uzun yüzme aynı gün / art arda (B5)', () => {
  const sal = (tarih, omuz) => ({ tur: 'salon', tarih, yuk: 300, kas: { Omuz: omuz, Karın: 300 - omuz } });
  const yz = (tarih, fr) => ({ tur: 'yuzme', tarih, yuk: 300, stil: { FR: fr } });
  assert.match(Y.cakisma([sal('2026-09-22', 150), yz('2026-09-23', 2000)], '2026-09-23').metin, /Ağır omuz kara idmanı \(dün\) ile uzun yüzme \(bugün\) art arda/);
  assert.equal(Y.cakisma([sal('2026-09-22', 30), yz('2026-09-23', 2000)], '2026-09-23'), null, 'omuz payı düşük');
  assert.equal(Y.cakisma([sal('2026-09-21', 150), yz('2026-09-23', 2000)], '2026-09-23'), null, 'iki gün ara');
  assert.equal(Y.cakisma([yz('2026-09-23', 1000)], '2026-09-23', [], true), null, 'kısa yüzme');
  assert.match(Y.cakisma([], '2026-09-23', [{ tarih: '2026-09-23', metre: 2400 }], true).metin, /\(bugün\) ve uzun yüzme \(bugün\) aynı gün/);
  assert.match(Y.cakisma([], '2026-09-23', [{ tarih: '2026-09-24', metre: 2400 }], true).metin, /\(yarın\) art arda/);
});

t('yuk: normal hafta tabanlı oran (aradan dönüş), haftalar, hafta durumu', () => {
  // 3 ay önce kayıt, son 4 haftada yalnızca bu hafta 2 hafif seans (300 + 300)
  const g = { '2026-06-02': 400, '2026-09-23': 300, '2026-09-25': 300 };
  assert.equal(Y.yukOrani(g, '2026-09-26'), 4, 'tabansız: kronik ~0 → 4 (eski hata)');
  assert.equal(Y.yukOrani(g, '2026-09-26', 1170), 0.51, 'normal hafta tabanı: 600 / 1170');
  assert.equal(Y.oranDurum(0.51, { donus: true }).durum, 'donus');
  assert.equal(Y.oranDurum(1.6, { donus: true }).durum, 'yuksek', 'dönüşte de çok hızlı artış uyarılır');
  assert.equal(Y.normalHafta({ gunHafta: 3, seansDk: 65, seansRpe: 6 }), 1170);
  const L = [{ tur: 'yuzme', tarih: '2026-09-23', yuk: 300, dk: 60 }, { tur: 'salon', tarih: '2026-09-25', yuk: 200, dk: 40 }, { tur: 'yuzme', tarih: '2026-09-15', yuk: 400, dk: 70 }];
  const H = Y.haftalar(L, '2026-09-26', 3);
  assert.deepEqual(H.map((x) => [x.bas, x.yuzme, x.salon, x.seans]), [['2026-09-07', 0, 0, 0], ['2026-09-14', 400, 0, 1], ['2026-09-21', 300, 200, 2]]);
  assert.deepEqual(Y.haftaDurumu(500, 1170), { pay: 43, durum: 'az', metin: 'Normalin altında' });
  assert.equal(Y.haftaDurumu(1200, 1170).durum, 'normal'); assert.equal(Y.haftaDurumu(1600, 1170).durum, 'yuksek');
});

t('video: YouTube adresi, gömme adresi, H önceliği, liste (büyük/küçük harf), özet', () => {
  assert.deepEqual(V.ytAyir('https://www.youtube.com/watch?v=MDAk3N1wEfI'), { id: 'MDAk3N1wEfI', bicim: 'w', bas: 0 });
  assert.deepEqual(V.ytAyir('https://youtube.com/shorts/fpU6PrR0Urg?si=x'), { id: 'fpU6PrR0Urg', bicim: 's', bas: 0 });
  assert.deepEqual(V.ytAyir('https://youtu.be/MDAk3N1wEfI?t=42'), { id: 'MDAk3N1wEfI', bicim: 'w', bas: 42 });
  assert.equal(V.ytAyir('https://www.youtube.com/watch?v=MDAk3N1wEfI&t=1m5s').bas, 65);
  assert.equal(V.ytAyir('https://evil.example/watch?v=MDAk3N1wEfI'), null, 'yalnız YouTube');
  assert.equal(V.ytAyir(''), null);
  const g = V.gommeAdresi({ id: 'MDAk3N1wEfI', bas: 3, bit: 15 });
  assert.ok(g.startsWith('https://www.youtube-nocookie.com/embed/MDAk3N1wEfI?'));
  assert.match(g, /mute=1/); assert.match(g, /loop=1/); assert.match(g, /playlist=MDAk3N1wEfI/); assert.match(g, /start=3/); assert.match(g, /end=15/); assert.match(g, /autoplay=1/);
  assert.equal(V.izleAdresi({ id: 'fpU6PrR0Urg', bicim: 's' }), 'https://www.youtube.com/shorts/fpU6PrR0Urg');
  const L = { 'Band Lat Pulldown': ['MDAk3N1wEfI', 'w', 'OPEX', 0, 0] };
  assert.equal(V.videoBul('band lat pulldown', '', L).kaynak, 'OPEX');
  assert.equal(V.videoBul('Band Lat Pulldown', 'https://youtu.be/AAAAAAAAAAA', L).nereden, 'tablo', 'H önce');
  assert.equal(V.videoBul('Band Lat Pulldown', 'https://vimeo.com/1', L).nereden, 'liste', 'geçersiz H → liste');
  assert.equal(V.videoBul('Yok', '', L), null);
  const o = V.ozet(VIDEOLAR);
  assert.equal(o.toplam, 61); assert.equal(o.opex, 33);
  assert.equal(V.videoBul('DB Pullover (Lat Focus)', '', VIDEOLAR).id, '7ee9w2zYFr0');
});

t('hazir: skor ve karar (eklem MSI eşikleri), dinlenme haftası, haftalık set, plan uyumu, ağırlık adımı', () => {
  assert.deepEqual(HZ.hazirSkor({ uyku: 5, agri: 1, enerji: 5, eklem: 0 }), { skor: 100, karar: 'tam', metin: 'Hazırsın: plan aynen' });
  assert.equal(HZ.hazirSkor({ uyku: 3, agri: 3, enerji: 3, eklem: 0 }).karar, 'hafif', 'skor 60');
  assert.equal(HZ.hazirSkor({ uyku: 1, agri: 5, enerji: 2, eklem: 0 }).karar, 'dinlen');
  assert.equal(HZ.hazirSkor({ uyku: 5, agri: 1, enerji: 5, eklem: 1 }).karar, 'hafif', 'MSI 1 → hafiflet');
  assert.equal(HZ.hazirSkor({ uyku: 5, agri: 1, enerji: 5, eklem: 2 }).karar, 'dinlen', 'MSI 2 → dur');
  assert.equal(HZ.hazirSkor({ uyku: 5, agri: 1, enerji: 5, eklem: 3 }).karar, 'tibbi');
  assert.deepEqual(HZ.dinlenmeOnerisi({ oran: { durum: 'guvenli' } }), { oner: false, nedenler: [] });
  assert.deepEqual(HZ.dinlenmeOnerisi({ oran: { durum: 'yuksek' } }).nedenler, ['yük hızlı arttı']);
  assert.ok(HZ.dinlenmeOnerisi({ hazirlar: [{ karar: 'hafif' }, { karar: 'dinlen' }, { karar: 'tam' }, { karar: 'hafif' }] }).oner);
  assert.deepEqual(HZ.dinlenmeOnerisi({ msiler: [0, 0.5, 1, 1.5] }).nedenler, ['ağrı (MSI) artıyor']);
  assert.equal(HZ.dinlenmeOnerisi({ msiler: [1.5, 1, 0.5] }).oner, false, 'azalan ağrı');
  const pay = (ad) => ({ Row: { 'Sırt': 0.8, Biseps: 0.2 }, Press: { Omuz: 0.8, Triseps: 0.2 } })[ad];
  assert.deepEqual(HZ.haftalikSet([{ tarih: '2026-09-21', hareket: 'Row', set: 4 }, { tarih: '2026-09-23', hareket: 'Press', set: 3 }, { tarih: '2026-09-14', hareket: 'Row', set: 9 }], '2026-09-21', '2026-09-27', pay), { 'Sırt': 4, Omuz: 3 });
  assert.equal(HZ.setDurum('Omuz', 14).durum, 'fazla'); assert.equal(HZ.setDurum('Sırt', 14).durum, 'iyi'); assert.equal(HZ.setDurum('Bacak', 4).durum, 'az');
  assert.deepEqual(HZ.planUyumu(['a', 'b', 'c', 'c'], ['a', 'c', 'x']), { planli: 3, yapilan: 2, pay: 67 });
  assert.equal(HZ.planUyumu([], ['a']).pay, null);
  assert.equal(HZ.adimaYuvarla(13, 2), 14); assert.equal(HZ.adimaYuvarla(16.25, 2.5), 17.5); assert.equal(HZ.adimaYuvarla(11, 1.25), 11.25);
});

t('model: faz döngüsü, haftalık hedef, sağlık bütçeleri', () => {
  assert.equal(M.faz(null).ad, 'Hacim'); assert.equal(M.faz(2).ad, 'Kuvvet'); assert.equal(M.faz(7).ad, 'Dinlenme'); assert.equal(M.faz(-1).ad, 'Dinlenme');
  assert.deepEqual(M.haftaHedefi({ gecen: 1000, buHafta: 300, normal: 1170 }), { hedef: 1100, kalan: 800, metin: 'Geçen haftadan en çok %10 fazla' });
  assert.equal(M.haftaHedefi({ gecen: 1170, normal: 1170 }).hedef, 1170, 'normalin üstüne çıkmaz (faz 1)');
  assert.equal(M.haftaHedefi({ gecen: 1170, normal: 1170, fazKat: 1.12 }).hedef, 1287, 'kuvvet fazı');
  assert.equal(M.haftaHedefi({ gecen: 0, normal: 1170 }).hedef, 819, 'taban normalin %70i');
  assert.equal(M.haftaHedefi({ gecen: 300, normal: 1170, donus: true }).hedef, 585, 'dönüş: normalin yarısı');
  assert.equal(M.haftaHedefi({ gecen: 1500, normal: 1170, oran: { durum: 'yuksek' } }).hedef, 1200, 'yük yüksek: −%20');
  assert.equal(M.haftaHedefi({ gecen: 1000, buHafta: 2000, normal: 1170 }).kalan, 0);
  const KK = K.kurallar(null);
  const L = [{ tarih: '2026-09-29', tur: 'yuzme', yuk: 400, kas: { Omuz: 300 } }, { tarih: '2026-09-20', tur: 'yuzme', yuk: 400, kas: { Omuz: 300 } }];
  const satir = [{ tarih: '2026-09-30', hareket: 'Split Squat', set: 3 }, { tarih: '2026-09-30', hareket: 'Band Row', set: 4 }];
  const b = M.saglikButceleri({ L, salonSatir: satir, bugun: '2026-10-01', K: KK, normal: 1170, brAy: 9 });
  assert.deepEqual(b.map((x) => [x.ad, x.deger, x.sinir, x.durum]), [['Omuz', 300, 410, 'iyi'], ['Kalça', 9, 10, 'sinirda'], ['Diz', 3, 9, 'iyi']]);
  const a = M.saglikButceleri({ L, salonSatir: satir, bugun: '2026-10-01', K: KK, normal: 1170, brAy: 9, msiBolge: { 'sag omuz': 1, 'sag diz': 1 } });
  assert.deepEqual(a.map((x) => [x.sinir, x.durum]), [[328, 'sinirda'], [5, 'asti'], [6, 'iyi']], 'ağrıda sınırlar daralır');
});

t('model: hafta planı — Cuma yüzme, salon yüzmeye komşu olmayan güne, yapılan/planlı önce, hazır olma, ölçüm', () => {
  const KK = K.kurallar(null);
  const ozet = (P) => P.map((g) => `${g.gun.slice(0, 3)}:${g.isler.map((x) => x.tur[0]).join('')}`).join(' ');
  // Pazartesi, boş hafta: Sal salon, Per yüzme, Cum yüzme
  let P = M.haftaPlani({ bugun: '2026-09-28', bas: '2026-09-28', K: KK });
  assert.equal(ozet(P), 'Paz: Sal:s Çar: Per:y Cum:y Cum: Paz:');
  assert.equal(P[4].isler[0].butce, 'akşam · sınırsız'); assert.equal(P[1].isler[0].butce, 'sabah 80 / öğle 65 dk');
  assert.ok(P.every((g) => !g.uyarilar.length), 'girişim yok');
  // Salı yapılan salon + Çarşamba programda yüzme → yalnız Cuma önerisi
  P = M.haftaPlani({ bugun: '2026-09-30', bas: '2026-09-28', K: KK, L: [{ tarih: '2026-09-29', tur: 'salon', dk: 50, set: 12, yuk: 300, kas: {} }], yuzmePlan: ['2026-09-30'] });
  assert.deepEqual(P.map((g) => g.durum), ['bos', 'yapildi', 'planli', 'bos', 'oneri', 'bos', 'bos']);
  // Perşembe, hiç yapılmamış: salon Perşembe'ye mecbur (Cuma yüzme komşu) → girişim uyarısı yalnız kuvvet fazında
  P = M.haftaPlani({ bugun: '2026-10-01', bas: '2026-09-28', K: KK, fazNo: 2 });
  assert.equal(ozet(P), 'Paz: Sal: Çar: Per:s Cum:y Cum: Paz:');
  assert.match(P[3].uyarilar.join(), /art arda/);
  // Bugün dinlen: bugün öneri yok, uyarı var; hafif: işaret
  P = M.haftaPlani({ bugun: '2026-09-29', bas: '2026-09-28', K: KK, hazirKarar: 'dinlen' });
  assert.equal(P[1].isler.length, 0); assert.match(P[1].uyarilar[0], /dinlen/);
  assert.equal(ozet(P), 'Paz: Sal: Çar:s Per:y Cum:y Cum: Paz:', 'bugün kapalı: salon Çarşamba');
  P = M.haftaPlani({ bugun: '2026-09-29', bas: '2026-09-28', K: KK, hazirKarar: 'hafif' });
  assert.match(P[1].isler[0].hafif, /hazır olma/);
  assert.match(M.haftaPlani({ bugun: '2026-09-28', bas: '2026-09-28', K: KK, hafiflet: true })[4].isler[0].hafif, /yük yüksek/);
  assert.match(M.haftaPlani({ bugun: '2026-09-28', bas: '2026-09-28', K: KK, fazNo: 3 })[1].isler[0].ad, /önleyici \+ mobilite/);
  assert.deepEqual(M.olcumZamani({ bugun: '2026-10-01', sonCssTarih: '2026-09-20' }), []);
  assert.deepEqual(M.olcumZamani({ bugun: '2026-10-01', sonCssTarih: '2026-08-20', fazNo: 3 }), ['CSS testi (400 + 200): son test 42 gün önce', 'Dinlenme haftası: kara idmanında tahmini 1RM ve ağrı (MSI) eğilimini gözden geçir']);
});

t('13.2.0: kisit — yüzme/kara gün ayrımı, döngü ve yasak satırları; normal hafta', () => {
  const KK = K.kurallar({ kisit: [{ kural: 'gun_hafta_yuzme', deger: 3 }, { kural: 'gun_hafta_salon', deger: 2 }, { kural: 'salon_dk', deger: 50 }, { kural: 'salon_rpe', deger: 5 },
    { kural: 'döngü_F1', deger: 'Hacim, Hacim+, Hacim+, Dinlenme' }, { kural: 'yasak_F1', deger: 'SP, Kuvvet' }] });
  assert.deepEqual([KK.gunHafta, KK.gunHaftaSalon, KK.salonDk, KK.salonRpe], [3, 2, 50, 5]);
  assert.deepEqual(KK.dongu['1'], ['Hacim', 'Hacim+', 'Hacim+', 'Dinlenme']); assert.deepEqual(KK.fazYasak['1'], ['SP', 'Kuvvet']);
  assert.equal(Y.normalHafta(KK), 1170 + 500);
  assert.equal(Y.normalHafta(K.kurallar(null)), 1170, 'ayrım yoksa eskisi gibi');
  assert.equal(K.kurallar(null).gunHaftaSalon, null);
  const L = [{ tarih: '2026-09-22', tur: 'yuzme' }, { tarih: '2026-09-23', tur: 'salon' }, { tarih: '2026-09-23', tur: 'yuzme' }];
  assert.deepEqual([Y.haftaGunleri(L, '2026-09-24'), Y.haftaGunleri(L, '2026-09-24', 'yuzme'), Y.haftaGunleri(L, '2026-09-24', 'salon')], [2, 2, 1]);
});

t('13.2.0: faz takvimi + döngü + yasak; elle döngü; hafta planında ayrı yüzme/salon', () => {
  const KK = K.kurallar({ kisit: [{ kural: 'dongu_F1', deger: 'Hacim, Hacim+, Hacim+, Dinlenme' }, { kural: 'yasak_F1', deger: 'SP, Kuvvet' }, { kural: 'gun_hafta_salon', deger: 2 }] });
  const takvim = [{ faz: 'F1', ilk: '2026-10-12', son: '2026-12-20', ad: 'Aerobik taban', odak: 'omuz toleransı' }];
  let f = M.fazDurumu({ bugun: '2026-10-28', takvim, K: KK });
  assert.deepEqual([f.kaynak, f.hafta, f.i, f.F.ad, f.fazAd], ['takvim', 3, 2, 'Hacim+', 'Aerobik taban']);
  f = M.fazDurumu({ bugun: '2026-11-04', takvim, K: KK });
  assert.equal(f.F.ad, 'Dinlenme');
  const K2 = K.kurallar({ kisit: [{ kural: 'yasak_F1', deger: 'SP, Kuvvet' }] });
  f = M.fazDurumu({ bugun: '2026-10-26', takvim, K: K2 });
  assert.deepEqual([f.dongu.join(), f.F.ad], ['Hacim,Hacim+,Hacim+,Dinlenme', 'Hacim+'], 'yasak Kuvvet → Hacim+');
  assert.equal(M.fazDurumu({ bugun: '2026-10-05', takvim, K: KK }).kaynak, null, 'takvim dışı, elle yok');
  assert.deepEqual([M.fazDurumu({ bugun: '2026-09-23', takvim: [], K: KK, blokBas: '2026-09-14' }).kaynak, M.fazDurumu({ bugun: '2026-09-23', blokBas: '2026-09-14' }).F.ad], ['elle', 'Hacim+']);
  // Ayrı: 3 yüzme (Cuma + Sal + Per) + 2 salon (yüzmeye komşu olmayan gün önce)
  const P = M.haftaPlani({ bugun: '2026-09-28', bas: '2026-09-28', K: KK, F: f.F });
  assert.equal(P.map((g) => `${g.gun.slice(0, 3)}:${g.isler.map((x) => x.tur[0]).join('')}`).join(' '), 'Paz:s Sal:y Çar: Per:y Cum:y Cum: Paz:s');
  // Programdaki yüzme süresi bütçeyi aşarsa uyarı
  const P2 = M.haftaPlani({ bugun: '2026-09-28', bas: '2026-09-28', K: K.kurallar(null), yuzmePlan: ['2026-09-29'], planDk: { '2026-09-29': 95 } });
  assert.match(P2[1].uyarilar.join(), /~95 dk.*80 dk bütçeyi aşıyor/);
});

t('13.2.0: artış önerisi bantta tekrar; öneri listesi; öğrenen salon süresi; kısa tekrar; yüzme süre oranı; Scull/Test', () => {
  const g = [{ tarih: '2026-09-20', hareket: 'Band Row', set: 4, tekrar: 20, agirlik: 15, rpe: 7.5, msi: 0, aciklama: '' },
    { tarih: '2026-09-20', hareket: 'Press', set: 3, tekrar: 10, agirlik: 12.5, rpe: 7, msi: 0, aciklama: '' }];
  assert.deepEqual([S.oneri(g, 'Band Row', { ekipman: 'Band' }).text, S.oneri(g, 'Band Row', { ekipman: 'Band' }).tekrar], ['+1 tekrar', 21]);
  assert.equal(S.oneri(g, 'Band Row').text, '+2,5 kg', 'ekipman bilinmezse eskisi gibi');
  const L = [S.fromHistory(g[0]), S.fromHistory(g[1])];
  const ol = S.oneriListesi(g, L, (ad) => (ad === 'Band Row' ? 'Band' : 'Dumbbell'));
  assert.deepEqual(ol.map((x) => [x.ad, x.text]), [['Band Row', '+1 tekrar'], ['Press', '+2,5 kg']]);
  assert.equal(L[0].agirlik, 15, 'liste değişmez (sormadan uygulanmaz)');
  assert.deepEqual(S.tahminOgren(L, g), { sn: S.tahminSn(L), ogrenilen: 0 }, 'Süre yoksa formül');
  const g2 = g.map((r) => ({ ...r, sure: r.hareket === 'Band Row' ? '07:15' : '' }));
  const o = S.tahminOgren(L, g2);
  assert.equal(o.ogrenilen, 2, 'kendi kaydı + diğerine genel oran');
  assert.equal(o.sn, Math.round(435 + S.tahminSn([L[1]]) * (435 / S.tahminSn([L[0]]))));
  assert.deepEqual(Z.suspects([90000, 2300], 90000), [1], 'hedefin %20sinden kısa tekrar şüpheli (1–2 tekrarda da)');
  assert.deepEqual(Z.suspects([90000, 2300]), [], 'hedef yoksa eskisi gibi');
  const hist = [{ tarih: '2026-09-20', seans: { sure: '00:55:00' }, setler: [{ tamamlandi: true, yapilan: 4, tekrar: 4, hedef: '01:30', dinlen: '00:20' }, { tamamlandi: true, yapilan: 1, tekrar: 1, hedef: '30:00', dinlen: '' }] }];
  assert.equal(M.yuzmeSureOrani(hist), Math.min(1.6, 3300 / (4 * 110 + 1800)));
  assert.equal(M.yuzmeSureOrani([]), null);
  assert.ok(R.isDrill({ tur: 'Scull' }) && R.isTest({ tur: 'Test' }) && !R.isTest({ tur: 'Swim' }));
});

console.log(`çekirdek testleri: TAMAM (${n})`);
