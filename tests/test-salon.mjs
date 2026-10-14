// salon.js: olaylar → durum, tekrarlar, tabloya giden satırlar, geçmişten plan, ilerleme önerisi.
import assert from 'node:assert/strict';
import * as S from '../salon.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', name); throw e; } };
const plan = () => [S.hareket({ ad: 'Standard Pull-up', set: 3, tekrar: 10, agirlik: 'Vücut' }), S.hareket({ ad: 'Plank', set: 2, sure: 45, agirlik: '' }), S.hareket({ ad: 'Row', set: 2, tekrar: 12, agirlik: 15 })];

t('replay: set/bitti, durum, düğme', () => {
  const H = plan();
  let st = S.replay([], H);
  assert.deepEqual(S.mainAction(st, H, 0), { kind: 'set', h: 0, set: 1 });
  const ev = [{ t: 'set', ts: 1000, h: 0 }];
  st = S.replay(ev, H);
  assert.equal(st.phase, 'work'); assert.equal(st.basla, 1000);
  assert.deepEqual(S.mainAction(st, H, 1), { kind: 'bitti', h: 0, set: 1 });
  ev.push({ t: 'bitti', ts: 31000 }, { t: 'mola', ts: 40000 }, { t: 'devam', ts: 100000 }, { t: 'set', ts: 130000, h: 0 }, { t: 'bitti', ts: 160000 });
  st = S.replay(ev, H);
  assert.equal(S.doneSets(st, 0), 2); assert.equal(S.status(st, H, 0), 'suruyor');
  assert.equal(S.restMs(st, 170000), 10000);
  assert.equal(S.idmanMs(st, 170000), 169000 - 60000);
  assert.equal(S.hareketMs(st, 0), 159000);
  assert.deepEqual(S.mainAction({ ...st, mola: 1 }, H, 0), { kind: 'mola' });
  ev.push({ t: 'set', ts: 200000, h: 0 }, { t: 'bitti', ts: 230000 });
  st = S.replay(ev, H);
  assert.equal(S.status(st, H, 0), 'tamam');
  assert.deepEqual(S.mainAction(st, H, 0), { kind: 'yok', h: 0 });
});

t('payload: ortalama, Setler açıklaması, süre, Vücut, süreli hareket, başlanmayan atlanır', () => {
  const H = plan();
  const ses = S.newSession('2026-10-02', H);
  ses.events = [{ t: 'set', ts: 0, h: 0 }, { t: 'bitti', ts: 30000 }, { t: 'set', ts: 90000, h: 0 }, { t: 'bitti', ts: 120000 }, { t: 'set', ts: 180000, h: 0 }, { t: 'bitti', ts: 308000 },
    { t: 'set', ts: 400000, h: 1 }, { t: 'bitti', ts: 445000 }];
  ses.reps[H[0]._k] = [11, 9, 9];
  ses.reps[H[1]._k] = [null];
  ses.giris[H[0]._k] = { nabiz: 142, rpe: 9.5, msi: 1, not: 'Omuz hassas' };
  const st = S.replay(ses.events, H);
  const p = S.payload(ses, st);
  assert.equal(p.tarih, '2026-10-02');
  assert.equal(p.hareketler.length, 2);
  assert.deepEqual(p.hareketler[0], { hareket: 'Standard Pull-up', set: 3, tekrar: 9.67, agirlik: 'Vücut', nabiz: 142, rpe: 9.5, msi: 1, aciklama: 'Setler: 11-9-9. Omuz hassas', sure: '05:08' });
  assert.deepEqual(p.hareketler[1], { hareket: 'Plank', set: 1, tekrar: 45, agirlik: '', nabiz: '', rpe: '', msi: '', aciklama: 'Setler: 45 sn', sure: '00:45' });
  // 13.4: karaSeans — idman süresi (ilk setten son bitişe) ve seans RPE/MSI/yer/not
  const st2 = S.replay([...ses.events, { t: 'son', ts: 450000 }], H); // özet ekranında idman bitmiştir
  assert.deepEqual(S.payload(ses, st2).seans, { sure: '0:07:30', rpe: '', msi: '', yer: '', aciklama: '' });
  ses.seans = { rpe: 7, msi: 0.5, yer: 'Ev', not: ' iyi ' };
  assert.deepEqual(S.payload(ses, st2).seans, { sure: '0:07:30', rpe: 7, msi: 0.5, yer: 'Ev', aciklama: 'iyi' });
});

t('parseSetler / isTimed / fromHistory / lastWorkout', () => {
  assert.deepEqual(S.parseSetler('Setler: 11-9-9. not'), [11, 9, 9]);
  assert.equal(S.parseSetler('yok'), null);
  assert.ok(S.isTimed('Front Plank')); assert.ok(S.isTimed('X', 'Setler: 45-40 sn')); assert.ok(!S.isTimed('Row'));
  const g = [
    { tarih: '2026-06-02', no: '2', hareket: 'Standard Pull-up', set: 3, tekrar: 9.67, agirlik: 'Vücut', rpe: 9.5, msi: 1, aciklama: 'Setler: 11-9-9' },
    { tarih: '2026-06-02', no: '1', hareket: 'Band Row', set: 4, tekrar: 20, agirlik: 15, rpe: 7.5, msi: 0, aciklama: '' },
    { tarih: '2026-05-24', no: '1', hareket: 'Band Row', set: 4, tekrar: 15, agirlik: 15, rpe: 7.5, msi: 0, aciklama: '' },
  ];
  const w = S.lastWorkout(g);
  assert.equal(w.tarih, '2026-06-02');
  assert.deepEqual(w.hareketler.map((h) => [h.ad, h.set, h.tekrar, h.agirlik]), [['Band Row', 4, 20, 15], ['Standard Pull-up', 3, 11, 'Vücut']]);
  assert.equal(S.lastWorkout([]), null);
});

t('oneri: ilerleme, aynı ⚠, iki seferdir ağrı', () => {
  const g = [
    { tarih: '2026-06-02', hareket: 'Row', set: 4, tekrar: 12, agirlik: 15, rpe: 7.5, msi: 0 },
    { tarih: '2026-06-02', hareket: 'Pull', set: 3, tekrar: 9, agirlik: 'Vücut', rpe: 8, msi: 0.5 },
    { tarih: '2026-06-02', hareket: 'Dip', set: 3, tekrar: 8, agirlik: 'Vücut', rpe: 9.5, msi: 0 },
    { tarih: '2026-06-02', hareket: 'Press', set: 3, tekrar: 8, agirlik: 20, rpe: 7, msi: 1.5 },
    { tarih: '2026-05-20', hareket: 'Press', set: 3, tekrar: 8, agirlik: 20, rpe: 7, msi: 2 },
  ];
  assert.deepEqual([S.oneri(g, 'Row').text, S.oneri(g, 'Row').agirlik], ['+2,5 kg', 17.5]);
  assert.deepEqual([S.oneri(g, 'Pull').text, S.oneri(g, 'Pull').tekrar], ['+1 tekrar', 10]);
  assert.equal(S.oneri(g, 'Dip').text, 'aynı ⚠');
  const p = S.oneri(g, 'Press'); assert.equal(p.text, 'aynı ⚠'); assert.equal(p.agrili, true);
  assert.equal(S.oneri(g, 'Yok'), null);
});

t('planlama: dağılım, puan (öncelik × etki × aktarım, ağrı yarıya), süzgeç, plan hareketi, süre', () => {
  const d = {
    katalog: [
      { ad: 'Row', amac: 'Rehab', ekipman: 'Band', stc: 0.8 }, { ad: 'Pull', amac: 'Strength', ekipman: 'Bodyweight', stc: 1 },
      { ad: 'Fly', amac: 'Rehab', ekipman: 'Band', stc: 0.7 }, { ad: 'Squat', amac: 'Strength', ekipman: 'DB', stc: 0.4 }, { ad: 'Plank', amac: 'Strength', ekipman: 'Bodyweight', stc: null },
    ],
    etki: [
      { ad: 'Row', grup: 'Back', oran: 0.8 }, { ad: 'Row', grup: 'Arms', oran: 0.2 }, { ad: 'Pull', grup: 'Back', oran: 0.6 }, { ad: 'Pull', grup: 'Arms', oran: 0.4 },
      { ad: 'Fly', grup: 'Chest', oran: 1 }, { ad: 'Squat', grup: 'Legs', oran: 1 }, { ad: 'Plank', grup: 'Core', oran: 1 },
    ],
    gecmis: [
      { tarih: '2026-09-30', hareket: 'Row', set: 4, tekrar: 20, agirlik: 15, rpe: 7, msi: 0 },
      { tarih: '2026-09-30', hareket: 'Pull', set: 3, tekrar: 9, agirlik: 'Vücut', rpe: 9, msi: 2 },
      { tarih: '2026-08-01', hareket: 'Pull', set: 3, tekrar: 9, agirlik: 'Vücut', rpe: 9, msi: 1.5 },
      { tarih: '2026-08-01', hareket: 'Squat', set: 3, tekrar: 12, agirlik: 18, rpe: 7, msi: 0 },
    ],
  };
  assert.deepEqual(S.grupPay(d.etki, 'Row'), { Back: 0.8, Arms: 0.2 });
  const all = S.dagilim(d.gecmis, d.etki);
  assert.equal(Math.round(all.Back + all.Arms + all.Legs), 100);
  const son = S.dagilim(d.gecmis, d.etki, '2026-09-05');
  assert.equal(son.Legs, undefined); assert.equal(son.Back, 71.4); // (4×0,8 + 3×0,6) / 7
  assert.deepEqual(S.gruplar(d.etki), ['Arms', 'Back', 'Chest', 'Core', 'Legs']);
  const r = S.puanla(d, { oncelik: { Back: 2 } });
  assert.deepEqual(r.map((x) => x.ad), ['Row', 'Pull'], 'yalnız öncelikli grubu çalıştıranlar');
  assert.equal(r[0].puan, 100); assert.ok(r[1].oneri.agrili);
  assert.equal(S.puanla(d, { oncelik: { Back: 1 } })[1].puan, Math.round((0.6 * 1 * 0.5) / (0.8 * 0.8) * 100), 'ağrı: puan yarıya');
  assert.deepEqual(S.puanla(d, { amac: ['Rehab'] }).map((x) => x.ad), ['Row', 'Fly']);
  assert.deepEqual(S.puanla(d, { stcMin: 0.75 }).map((x) => x.ad), ['Row', 'Pull'], 'Pull ağrılı: 1 × 0,5 < 0,8');
  assert.deepEqual(S.puanla(d, { ekipman: ['DB'] }).map((x) => x.ad), ['Squat']);
  assert.deepEqual(S.puanla(d, { haric: ['Row', 'Pull', 'Squat'] }).map((x) => x.ad), ['Fly', 'Plank'], 'katsayısız 0,5');
  const row = S.planHareket(d, 'Row');
  assert.deepEqual([row.set, row.tekrar, row.agirlik], [4, 20, 17.5], 'ilerleme önerisi uygulanır');
  const pull = S.planHareket(d, 'Pull');
  assert.deepEqual([pull.tekrar, pull.agirlik], [9, 'Vücut'], '⚠: aynı değer');
  const pl = S.planHareket(d, 'Plank', { bodyweight: true });
  assert.deepEqual([pl.sure, pl.agirlik], [30, 'Vücut']);
  assert.equal(S.tahminSn([row, pl]), 4 * (20 * 3 + 60) + 3 * 60);
});

t('sürüm 12: öneri uygula / geri al, önleyici doz, rekor, hacim', () => {
  const gecmis = [
    { tarih: '2026-09-20', hareket: 'Press', set: 3, tekrar: 10, agirlik: 12.5, rpe: 7.5, msi: 0, aciklama: '' },
    { tarih: '2026-09-20', hareket: 'Pull', set: 3, tekrar: 9, agirlik: 'Vücut', rpe: 9.5, msi: 0, aciklama: 'Setler: 11-9-9' },
    { tarih: '2026-10-06', hareket: 'Band External Rotation', set: 3, tekrar: 12, agirlik: 'Vücut', rpe: 5, msi: 0, aciklama: '' },
    { tarih: '2026-10-05', hareket: 'Front Plank', set: 3, tekrar: 45, agirlik: 'Vücut', rpe: 6, msi: 0, aciklama: '' },
  ];
  const [press, pull] = S.oneriUygula(gecmis, [S.fromHistory(gecmis[0]), S.fromHistory(gecmis[1])]);
  assert.equal(press.agirlik, 15); assert.deepEqual(press._oneri, { text: '+2,5 kg', onceki: { tekrar: 10, agirlik: 12.5, sure: 0 } });
  assert.equal(pull._oneri, undefined, '⚠ (RPE 9,5): uygulanmaz');
  S.oneriGeriAl(press); assert.equal(press.agirlik, 12.5); assert.equal(press._oneri, undefined);
  assert.equal(S.onleyiciKat('Band External Rotation'), 'omuz');
  assert.equal(S.onleyiciKat('Mystery', { 'Kalça yanı': 0.6 }), 'kalca');
  assert.equal(S.onleyiciKat('Mystery', { Karın: 0.4 }), null, 'ana grup payı < 0,5');
  assert.equal(S.haftaBasi('2026-10-11'), '2026-10-05'); assert.equal(S.haftaBasi('2026-10-05'), '2026-10-05');
  const od = S.onleyiciDurum(gecmis, '2026-10-08');
  assert.deepEqual(od.map((o) => [o.key, o.yapilan, o.acik]), [['omuz', 1, true], ['kalca', 0, true], ['core', 1, false]]);
  assert.deepEqual(S.rekorlar(gecmis, { tarih: '2026-10-08', hareket: 'Press', set: 3, tekrar: 10, agirlik: 15, aciklama: '' }).map((r) => r.tur), ['agirlik']);
  assert.deepEqual(S.rekorlar(gecmis, { tarih: '2026-10-08', hareket: 'Press', set: 3, tekrar: 12, agirlik: 12.5, aciklama: '' }).map((r) => r.tur), ['tekrar', '1rm']);
  assert.deepEqual(S.rekorlar(gecmis, { tarih: '2026-10-08', hareket: 'Pull', set: 3, tekrar: 10, agirlik: 'Vücut', aciklama: 'Setler: 12-10-8' }).map((r) => r.metin), ['En çok tekrar: 12']);
  assert.deepEqual(S.rekorlar(gecmis, { tarih: '2026-10-08', hareket: 'Yeni', set: 3, tekrar: 10, agirlik: 5 }), [], 'ilk kez: rekor yok');
  assert.equal(S.birRM(100, 10), 133.3);
  assert.equal(S.hacim([{ set: 3, tekrar: 10, agirlik: 15 }, { set: 3, tekrar: 10, agirlik: 'Vücut' }]), 450);
});

t('13.6 alternatifler (P3): aynı ana grup, kas örtüşmesine göre sıra, ekipman ve kısıt süzgeci, hariç tutulanlar', () => {
  const d = {
    katalog: [{ ad: 'DB Press', ekipman: 'Dumbbell', stc: 0.7 }, { ad: 'Band Press', ekipman: 'Band', stc: 0.8 }, { ad: 'Pike Push-up', ekipman: 'Bodyweight', stc: 0.6 },
      { ad: 'Lateral Raise', ekipman: 'Dumbbell', stc: 0.5 }, { ad: 'Push-up', ekipman: 'Bodyweight', stc: 0.7 }, { ad: 'Row', ekipman: 'Band', stc: 0.8 }],
    etki: [['DB Press', 'Shoulders', 0.8], ['DB Press', 'Triceps', 0.2], ['Band Press', 'Shoulders', 0.7], ['Band Press', 'Triceps', 0.3], ['Pike Push-up', 'Shoulders', 0.6], ['Pike Push-up', 'Triceps', 0.4],
      ['Lateral Raise', 'Shoulders', 1], ['Push-up', 'Chest', 0.7], ['Push-up', 'Shoulders', 0.3], ['Row', 'Back', 1]].map(([ad, grup, oran]) => ({ ad, grup, oran })),
    gecmis: [],
  };
  const a = S.alternatifler(d, 'DB Press');
  assert.deepEqual(a.map((x) => x.ad), ['Band Press', 'Pike Push-up', 'Lateral Raise'], 'göğüs ağırlıklı Push-up ve sırt yok');
  assert.match(a[0].neden, /aynı ana grup · kas örtüşmesi %90 · kısıta uygun/);
  assert.deepEqual(S.alternatifler(d, 'DB Press', { ekipman: ['Band', 'Bodyweight'] }).map((x) => x.ad), ['Band Press', 'Pike Push-up']);
  assert.deepEqual(S.alternatifler(d, 'DB Press', { uygun: (ad) => ad !== 'Band Press', haric: ['Lateral Raise'] }).map((x) => x.ad), ['Pike Push-up']);
  assert.deepEqual(S.alternatifler(d, 'Yok'), []);
});

console.log(`salon.js testleri: TAMAM (${n})`);
