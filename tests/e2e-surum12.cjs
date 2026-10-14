// Sürüm 12 uçtan uca senaryoları (salon ve yüzme yenilikleri). Eski senaryolar e2e-senaryolar.cjs'te, değişmeden.
//   NODE_PATH=$(npm root -g) node tests/e2e-surum12.cjs [filtre]
const assert = require('assert');
const { runScenarios, D, sampleRef } = require('./harness.cjs');
const { Sheet } = require('./fakegas.cjs');

const S = [];
const sc = (name, fn) => S.push([name, fn]);
const txt = (s, sel) => s.page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());

/** 10 kas grubu adlarıyla örnek SalonTakip (kısıtlı hareketler dahil). */
function salonV12(extraIdman = []) {
  const IDMAN_H = ['Tarih', 'No', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Nabız', 'RPE', 'MSI', 'Açıklama'];
  const H = [
    ['Dumbbell Shoulder Press', 'Strength', 'Dumbbell', '—', 0.7, ''],
    ['Band External Rotation', 'Rehab', 'Band', '—', 0.8, ''],
    ['Goblet Squat', 'Strength', 'Dumbbell', '—', 0.65, ''],
    ['Box Jump', 'Power', 'Other', '—', 0.5, ''],
    ['Bodyweight Squat', 'Strength', 'Bodyweight', 0.7, 0.6, ''],
    ['Front Plank', 'Strength', 'Bodyweight', 0.6, 0.9, ''],
    ['Band Bent Over Row', 'Rehab', 'Band', '—', 0.75, ''],
  ];
  const E = [
    ['Dumbbell Shoulder Press', 'Shoulders', 0.8], ['Dumbbell Shoulder Press', 'Triceps', 0.2],
    ['Band External Rotation', 'Shoulders', 1], ['Goblet Squat', 'Legs', 0.7], ['Goblet Squat', 'Glutes', 0.3],
    ['Box Jump', 'Legs', 1], ['Bodyweight Squat', 'Legs', 0.7], ['Bodyweight Squat', 'Glutes', 0.3],
    ['Front Plank', 'Core', 1], ['Band Bent Over Row', 'Back', 0.7], ['Band Bent Over Row', 'Biceps', 0.2], ['Band Bent Over Row', 'Forearms', 0.1],
  ].map(([a, g, o]) => [a, g, g, '', o]);
  return {
    idman: new Sheet('idman', IDMAN_H, [
      ...extraIdman,
      [D('2026-09-20'), 1, 'Dumbbell Shoulder Press', 3, 10, 12.5, 128, 7.5, 0, ''],
      [D('2026-09-20'), 2, 'Band Bent Over Row', 3, 15, 15, 120, 7, 0, ''],
      [D('2026-09-16'), 1, 'Front Plank', 3, 45, 'Vücut', 110, 6, 0, 'Setler: 45-45-45 sn'],
    ]),
    H: new Sheet('H', ['Exercise', 'Goal Tag', 'Equipment', 'BW Coefficient', 'Swim Transfer Coefficient', 'Video'], H),
    hkEtki: new Sheet('hkEtki', ['Exercise', 'Muscle Group', 'Muscle', 'Kinetic Chain', 'Yük Etki Oranı'], E),
    ref: new Sheet('ref', ['Parametre', 'Değer -1', 'Değer - 2', 'Değer - 3'], [['BW', D('2025-01-01'), D('2026-12-31'), 82]]),
  };
}
exports.salonV12 = salonV12;
const PLAN_H = ['Tarih', 'Sıra', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Süre', 'Dinlen', 'Süperset', 'Not', 'Durum'];
/** 13.3: salon idmanı salonPlan'dan başlar — bugüne (23 Eylül) son idmanın değerleriyle plan yazar. */
function bugunPlanli(sh, rows) {
  sh.plan = new Sheet('plan', PLAN_H, rows || [
    [D('2026-09-23'), 1, 'Dumbbell Shoulder Press', 3, 10, 12.5, '', 90, '', '', ''],
    [D('2026-09-23'), 2, 'Band Bent Over Row', 3, 15, 15, '', 90, '', '', ''],
  ]);
  return sh;
}
exports.bugunPlanli = bugunPlanli;

async function toPlanList(s, gruplar) {
  const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan');
  for (const g of gruplar) await p.click(`[data-sp-grup="${g}"]`);
  await p.click('#sp-next');
}

sc('Kısıt: ağırlıklı squat ve zıplama listede gizli, gösterilince ⊘ + güvenli alternatif; dikkat notu; önleyici borç', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true }); const p = s.page;
  await toPlanList(s, ['Legs', 'Shoulders', 'Core']);
  const names = await p.$$eval('.sp-ex:not(.is-yasak)', (e) => e.map((x) => x.querySelector('.sp-m b').firstChild.textContent.trim()));
  assert.ok(!names.includes('Goblet Squat') && !names.includes('Box Jump'), JSON.stringify(names));
  assert.ok(names.includes('Bodyweight Squat'));
  assert.match(await txt(s, '[data-sp-ex="Bodyweight Squat"]'), /⚠ Derinlik en fazla 90°/);
  assert.match(await txt(s, '[data-sp-ex="Dumbbell Shoulder Press"]'), /Sağ omuz: ağrısız aralıkta/);
  assert.match(await txt(s, '.sp-borc'), /Omuz önleyici 0\/2.*Kalça stabilite 0\/1.*Core 0\/1/);
  assert.match(await txt(s, '[data-sp-ex="Band External Rotation"]'), /Önleyici: omuz önleyici borcu/);
  assert.match(await txt(s, '[data-sp-kg]'), /⊘ 2 hareket sağlık kısıtı nedeniyle gizlendi/);
  await p.click('[data-sp-kg]');
  const y = await p.$$eval('.sp-ex.is-yasak', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  assert.equal(y.length, 2);
  assert.ok(y.some((t) => /Goblet Squat.*ağırlıklı squat > 90°.*Yerine: Box Squat ≤ 90°/.test(t)), JSON.stringify(y));
  assert.ok(y.some((t) => /Box Jump.*zıplama yok/.test(t)));
  assert.equal(await p.$$eval('.sp-ex.is-yasak [data-sp-ex]', (e) => e.length), 0, 'yasaklı hareket seçilemez');
});

// 13.3 (bilinçli değişiklik): ana sayfa salon kartı yüzme kartı gibi salonPlan'dan; planlama salonPlan'a yazar ("Hazır plan" ve son idman şablonu yok).
sc('Ana sayfa salon kartı: bugünün salonPlan planı (metro + liste) → Planla → Plana yaz (yarın) → salonPlan; İdmanı aç → öneri sorulur, "plandaki değerlerle" başlar', async ({ launch }) => {
  const sh = bugunPlanli(salonV12());
  const s = await launch({ salonSheets: sh, ref: true, viewport: { width: 390, height: 844 } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /karaPlan/.test(document.getElementById('home-gym-go').textContent));
  assert.match(await txt(s, '#home-gym-go'), /Bugün · Çarşamba 23 Eylül\s*2 hareket · 6 set · ~\d+ dk\s*Dumbbell Shoulder Press\s*3×10 · 12,5 kg\s*Band Bent Over Row\s*3×15 · 15 kg\s*karaPlan · tablodan\s*İdmanı aç\s*Takvim\s*＋ Planla/);
  assert.equal(await p.$$eval('#home-gym-metro .metro circle', (c) => c.length), 2, 'durak = hareket');
  // Planla → Omuz → hareket → Plana yaz → Yarın
  await p.click('#home-gym-planla'); await s.waitScreen('salon-plan');
  await p.click('[data-sp-grup="Shoulders"]'); await p.click('#sp-next');
  await p.click('[data-sp-ex="Band External Rotation"]'); await p.click('[data-sp-ex="Dumbbell Shoulder Press"]');
  await p.click('#sp-next');
  assert.equal(await txt(s, '#sp-save'), 'Plana yaz');
  await p.click('#sp-save'); await s.waitModal('Hangi güne?'); await s.modalClick('Yarın');
  await s.waitScreen('salon-prog');
  assert.equal(await s.ls('ysk.salonPlan'), null, 'telefona yerel plan yazılmaz');
  assert.deepEqual(sh.plan.data.slice(1).filter((r) => r[2]).map((r) => [new Date(r[0]).getDate(), r[2]]), [[23, 'Dumbbell Shoulder Press'], [23, 'Band Bent Over Row'], [24, 'Band External Rotation'], [24, 'Dumbbell Shoulder Press']]);
  await p.click('#pg-back'); await s.waitScreen('home');
  assert.match(await txt(s, '#home-gym-go'), /Bugün · Çarşamba 23 Eylül/);
  await p.click('#home-gym-start'); await s.waitModal('Artış önerisi · 2 hareket');
  assert.match(await txt(s, '#modal-body'), /seçmediğin plandaki değerle başlar/);
  await s.modalClick('Hiçbiri · plandaki değerlerle'); await s.waitScreen('salon');
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  const ses = await s.ls('ysk.salonSession');
  assert.deepEqual(ses.hareketler.map((x) => [x.ad, x.agirlik, x.tekrar]), [['Dumbbell Shoulder Press', 12.5, 10], ['Band Bent Over Row', 15, 15]]);
  assert.equal(ses.programTarih, '2026-09-23');
  assert.match(await txt(s, '#sl-wheel .w-item.is-active .w-card'), /Hedef 3 × 10 · 12,5 kg.*öneri: \+2,5 kg/);
});

sc('Ana sayfa salon kartı: bugün plan yok → sıradaki gün ("Bu planla başla"), hiç plan yok → "＋ İdman planla"; planda zaten yüksek değer önerilmez', async ({ launch }) => {
  const sh = bugunPlanli(salonV12(), [[D('2026-09-25'), 1, 'Dumbbell Shoulder Press', 3, 10, 15, '', 90, '', '', ''], [D('2026-09-20'), 1, 'Front Plank', 3, 1, 'Vücut', 45, 60, '', '', '']]);
  const s = await launch({ salonSheets: sh, ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /karaPlan/.test(document.getElementById('home-gym-go').textContent));
  assert.match(await txt(s, '#home-gym-go'), /Cuma · 25 Eylül\s*1 hareket · 3 set.*Dumbbell Shoulder Press\s*3×10 · 15 kg\s*karaPlan · bugün plan yok, sıradaki gün\s*Bu planla başla\s*Takvim\s*＋ Bugün için planla/);
  await p.click('#home-gym-start'); await s.waitScreen('salon'); // 15 kg planda: +2,5 kg önerisi sorulmaz
  const ses = await s.ls('ysk.salonSession');
  assert.equal(ses.tarih, '2026-09-23'); assert.equal(ses.programTarih, '2026-09-25'); assert.equal(ses.hareketler[0].agirlik, 15);
  await s.close();
  const s2 = await launch({ salonSheets: salonV12(), ref: true }); const p2 = s2.page;
  await s2.waitScreen('home');
  await p2.waitForFunction(() => /Sırada kara planı yok/.test(document.getElementById('home-gym-go').textContent));
  assert.match(await txt(s2, '#home-gym-go'), /Plan yok\s*Sırada kara planı yok.*＋ İdman planla\s*Takvim/);
  assert.equal(await p2.isHidden('#home-gym-planla'), true);
  await p2.click('#home-gym-start'); await s2.waitScreen('salon-plan');
});
/** Haritadaki grubun merkezine dokunur (harita.js META). */
async function hmTap(s, view, g) {
  const p = s.page;
  const [m, w, h] = await p.evaluate(([v, gg]) => import('./harita.js?v=13.2.0').then((H) => [H.META[v].merkez[gg], H.META[v].w, H.META[v].h]), [view, g]);
  await p.$eval('#hm-wrap', (e) => e.scrollIntoView({ block: 'center' }));
  const r = await p.locator('#hm-wrap .kf').boundingBox();
  await p.mouse.click(r.x + (r.width * m[0]) / w, r.y + (r.height * m[1]) / h);
}

sc('Kas haritası: dokun → seç (renkler sabit, ✓), tekrar dokun → bırak; altta 1–5 ağırlık ve ✕; ön/arka sayaçları; tabloda olmayan grup uyarısı; liste aynı önceliği gösterir', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true, viewport: { width: 390, height: 844 } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan');
  await p.waitForSelector('#hm-wrap .kf');
  await p.waitForTimeout(300); // dokunma haritası yüklenir
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/hm1.png` });
  await hmTap(s, 'front', 'Omuz');
  await p.waitForSelector('[data-hm-row="Omuz"]');
  assert.match(await txt(s, '[data-hm-row="Omuz"]'), /Omuz.*son 4 hafta %.*hazır %/);
  assert.equal(await p.$$eval('[data-hm-row="Omuz"] .hm-w button.on', (e) => e.length), 3, 'varsayılan ağırlık 3');
  assert.match(await txt(s, '[data-sp-grup="Shoulders"]'), /ÖNCELİK ×3/, 'liste aynı önceliği gösterir');
  // Renkler sabit: seçilmeyen grup da renkli; seçilende ✓
  const op = await p.$$eval('#hm-wrap .kl', (e) => Object.fromEntries(e.map((x) => [x.dataset.g, x.style.opacity])));
  assert.equal(op['Göğüs'], '1', 'seçilmeyen grup griye dönmez');
  assert.equal(await txt(s, '#hm-wrap .kb[data-g="Omuz"]'), '✓');
  await p.click('[data-hm-w="Omuz|5"]');
  assert.match(await txt(s, '[data-sp-grup="Shoulders"]'), /ÖNCELİK ×5/);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/hm2.png` });
  await hmTap(s, 'front', 'Karın');
  assert.match(await txt(s, '[data-sp-grup="Core"]'), /ÖNCELİK ×3/);
  assert.match(await txt(s, '[data-hm-v="front"]'), /Ön2/);
  assert.match(await txt(s, '[data-hm-v="back"]'), /Arka1/, 'omuz arkada da görünür');
  // Tekrar dokun → bırak
  await hmTap(s, 'front', 'Karın');
  assert.equal(await p.$$eval('[data-hm-row="Karın"]', (e) => e.length), 0);
  assert.doesNotMatch(await txt(s, '[data-sp-grup="Core"]'), /ÖNCELİK/);
  await hmTap(s, 'front', 'Karın');
  await p.click('[data-hm-w="Karın|1"]');
  // Kalça yanı tabloda yok → uyarı, seçilmez
  await hmTap(s, 'front', 'Kalça yanı');
  await p.waitForFunction(() => /tabloda \(hkEtki\)/.test(document.getElementById('toast').textContent));
  // Arka yüz: Sırt
  await p.click('[data-hm-v="back"]');
  await p.waitForSelector('#hm-wrap .kf.back');
  await hmTap(s, 'back', 'Sırt');
  assert.match(await txt(s, '[data-sp-grup="Back"]'), /ÖNCELİK/);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/hm3.png`, fullPage: false });
  // ✕ → bırak
  await p.click('[data-hm-rm="Sırt"]');
  assert.doesNotMatch(await txt(s, '[data-sp-grup="Back"]'), /ÖNCELİK/);
  await p.click('#sp-next');
  const names = await p.$$eval('.sp-ex:not(.is-yasak)', (e) => e.map((x) => x.querySelector('.sp-m b').firstChild.textContent.trim()));
  assert.ok(names.includes('Dumbbell Shoulder Press') && names.includes('Front Plank') && !names.includes('Band Bent Over Row'), JSON.stringify(names));
  assert.ok(names.indexOf('Dumbbell Shoulder Press') < names.indexOf('Front Plank'), `omuz 5, karın 1 → omuz hareketi önde: ${JSON.stringify(names)}`);
});

const slPress = (s) => s.page.$eval('#sl-main', (b) => b.click());
/** Ana sayfadan salon idmanını başlatır (13.3: salonPlan'daki plan); artış önerisi sorulur (secim: modal düğmesi). */
async function gymBasla(s, secim = 'Seçilenleri uygula') {
  await s.page.click('#home-gym-start');
  await s.page.waitForSelector('#modal:not([hidden]), #screen-salon:not([hidden])');
  if (await s.page.isVisible('#modal')) await s.modalClick(secim);
  await s.waitScreen('salon');
}
exports.gymBasla = gymBasla;
/** Aktif hareketin n setini yapar (set 20 sn, dinlenme 70 sn). */
async function setler(s, n) {
  for (let k = 0; k < n; k++) { await slPress(s); await s.adv(20); await slPress(s); if (k < n - 1) await s.adv(70); }
}

sc('İdman: ısınma (kayda sayılmaz), set sırasında ağrı 1,5 → hafiflet; hareket sonu MSI ve not hazır; rekor; özet hacim + kaslar + rekor + kıyas', async ({ launch }) => {
  const s = await launch({ salonSheets: bugunPlanli(salonV12()), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => !document.getElementById('home-gym-go').hidden);
  await gymBasla(s);
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  // Isınma
  assert.match(await txt(s, '#sl-warm'), /Isınma 0\/4 kayda sayılmaz/);
  await p.click('#sl-warm'); await s.waitModal('Isınma · 6 dk');
  await p.click('[data-isn="0"]'); await p.click('[data-isn="1"]');
  await s.modalClick('Bitti');
  assert.equal(await p.isHidden('#sl-warm'), true);
  assert.deepEqual((await s.ls('ysk.salonSession')).isinma, { tamam: [0, 1], bitti: true });
  // Shoulder Press (öneri: 15 kg) 1. set sırasında ağrı 1,5 → hafiflet
  assert.match(await txt(s, '#sl-wheel .w-item.is-active .w-card'), /Dumbbell Shoulder Press.*15 kg/);
  await slPress(s); await s.adv(10);
  await p.click('#sl-wheel .w-item.is-active [data-sl-agri]'); await s.waitModal('Ağrı · Dumbbell Shoulder Press');
  await p.click('#modal-body [data-value="1.5"]'); await s.waitModal('MSI 1,5 · hafiflet');
  assert.match(await txt(s, '#modal-body'), /Kalan setler: 12,5 kg \(önce 15 kg\) · 8 tekrar/);
  await s.modalClick('Hafifleterek devam');
  let x = (await s.ls('ysk.salonSession')).hareketler[0];
  assert.deepEqual([x.agirlik, x.tekrar], [12.5, 8]);
  await s.adv(10); await slPress(s); await s.adv(70);
  await setler(s, 2);
  await p.waitForSelector('#sl-giris:not([hidden])');
  assert.equal(await p.getAttribute('#sg-body [data-sg="msi"][data-v="1.5"]', 'class'), 'is-on', 'set sırasındaki ağrı hazır gelir');
  assert.match(await p.inputValue('#sg-not'), /MSI 1,5 \(1\. set\) · hafifletildi: 12,5 kg \(önce 15 kg\) · 8 tekrar/);
  await p.click('#sg-save');
  // Row (bant): öneri +1 tekrar (13.2.0: bantta kg yok) → en çok tekrar rekoru
  await p.waitForFunction(() => document.querySelector('#sl-wheel .w-item.is-active .sl-ad').textContent.trim() === 'Band Bent Over Row');
  await p.waitForFunction(() => /^1\. set/.test(document.getElementById('sl-main-sub').textContent));
  await s.adv(3);
  await setler(s, 3);
  await p.waitForSelector('#sl-giris:not([hidden])');
  await p.click('#sg-save');
  await p.waitForFunction(() => /🏆 Rekor · Band Bent Over Row: En çok tekrar: 16 @ 15 kg/.test(document.getElementById('toast').textContent));
  await s.waitScreen('salon-ozet');
  const oz = await txt(s, '#so-body');
  assert.match(oz, /HACİM\s*1\.\d{3}\s*kg/);
  assert.match(oz, /ÇALIŞAN KASLAR.*Omuz.*Sırt/);
  assert.match(oz, /🏆 Rekor\s*Band Bent Over Row · En çok tekrar: 16 @ 15 kg\s*önceki 15/);
  assert.match(oz, /GEÇEN BENZER İDMANA GÖRE · 20 Eylül.*Hacim .* kg · geçen 1\.050 kg/);
  await p.click('#so-save'); await s.waitScreen('home');
  const I = s.envs.SALON.sheets.idman;
  assert.deepEqual(I.data.slice(1, 3).map((r) => [r[2], r[5], r[8]]), [['Dumbbell Shoulder Press', 12.5, 1.5], ['Band Bent Over Row', 15, '']]);
  assert.match(I.data[1][9], /hafifletildi/);
});

sc('İdman: set sırasında ağrı 2 → hareket durur (yapılan setle), hareket sonu MSI 2 ve "durduruldu" notu', async ({ launch }) => {
  const s = await launch({ salonSheets: bugunPlanli(salonV12()), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => !document.getElementById('home-gym-go').hidden);
  await gymBasla(s);
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  await setler(s, 1); await s.adv(70);
  await slPress(s); await s.adv(10);
  await p.click('#sl-wheel .w-item.is-active [data-sl-agri]'); await s.waitModal('Ağrı');
  await p.click('#modal-body [data-value="2"]');
  await p.waitForSelector('#sl-giris:not([hidden])');
  assert.match(await txt(s, '#sg-body'), /SETLER\s*10-10/);
  assert.equal(await p.$eval('#sg-body .sg-set b', (b) => getComputedStyle(b).whiteSpace), 'nowrap', 'SETLER bölünmez');
  assert.equal(await p.getAttribute('#sg-body [data-sg="msi"][data-v="2"]', 'class'), 'is-on');
  assert.match(await p.inputValue('#sg-not'), /MSI 2 \(2\. set\) · durduruldu/);
  assert.equal((await s.ls('ysk.salonSession')).hareketler[0].set, 2);
});

sc('Hareket bilgi kartı: planlamada ⓘ → Türkçe adımlar, yerel fotoğraf, kısıt; idman ayrıntısında mini vücut + son idmanlar grafiği + kart', async ({ launch }) => {
  const extra = [[D('2026-09-06'), 1, 'Dumbbell Shoulder Press', 3, 10, 10, 125, 7, 0, ''], [D('2026-08-30'), 1, 'Dumbbell Shoulder Press', 3, 8, 10, 125, 8, 0.5, '']];
  const s = await launch({ salonSheets: salonV12(extra), ref: true, viewport: { width: 390, height: 844 } }); const p = s.page;
  await toPlanList(s, ['Shoulders']);
  await p.click('[data-sp-info="Band External Rotation"]');
  await p.waitForSelector('#bilgi:not([hidden])');
  assert.equal(await txt(s, '#bi-title'), 'Bantla dış rotasyon');
  assert.match(await txt(s, '#bi-body'), /Band External Rotation.*ÇALIŞAN KAS\s*omuz.*✓ Kısıtlarına uygun.*NASIL YAPILIR.*Dirseği 90° bük.*SIK HATA.*Yüzmeye katkısı/);
  assert.equal(await p.getAttribute('#bi-media img', 'src'), 'img/hareket/External_Rotation_with_Band_0.webp');
  await p.waitForFunction(() => document.querySelector('#bi-media img').complete && document.querySelector('#bi-media img').naturalWidth > 0);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/bi1.png` });
  await p.click('#bi-close');
  assert.equal(await p.isHidden('#bilgi'), true);
  assert.deepEqual(await p.$$eval('.sp-ex.is-on', (e) => e.length), [0][0], 'ⓘ hareketi seçmez');
  // Goblet Squat: kısıtlı kart (⊘ + alternatif) — listeye yasaklıları göster, kartı plan dışında aç
  await p.click('[data-sp-ex="Dumbbell Shoulder Press"]'); await p.click('#sp-next'); await p.click('#sp-next');
  await s.waitScreen('salon'); await p.waitForSelector('#sl-wheel .w-item.is-active');
  await p.click('#sl-wheel .w-item.is-active .w-tag'); await p.waitForSelector('#sl-detail:not([hidden])');
  assert.match(await txt(s, '#sl-detail-body'), /SON 3 İDMAN · AĞIRLIK \(KG\)/);
  assert.equal(await p.$$eval('#sl-detail-body svg.hg circle.hit', (e) => e.length), 3);
  const titles = await p.$$eval('#sl-detail-body svg.hg circle.hit title', (e) => e.map((x) => x.textContent));
  assert.match(titles[0], /30\.08 · 10 kg · RPE 8 · MSI 0,5/);
  assert.match(titles[2], /20\.09 · 12,5 kg · RPE 7,5/);
  assert.equal(await p.$$eval('#sl-detail-body .dt-kas .kf.mini', (e) => e.length), 1);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/bi2.png` });
  await p.click('#sl-detail [data-bilgi]');
  await p.waitForSelector('#bilgi:not([hidden])');
  assert.equal(await txt(s, '#bi-title'), 'Dambıl omuz press');
  assert.match(await txt(s, '#bi-body'), /⚠ Sağ omuz: ağrısız aralıkta/);
});

sc('Süperset: planda bağla; set sonrası dinlenmeden sıradakine geçer, turun sonunda dinlenme; ısınma seti nota yazılır', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true }); const p = s.page;
  await toPlanList(s, ['Shoulders', 'Back']);
  await p.click('[data-sp-ex="Dumbbell Shoulder Press"]'); await p.click('[data-sp-ex="Band Bent Over Row"]');
  await p.click('#sp-next');
  await p.click('[data-sp-ss="0"]');
  assert.match(await txt(s, '[data-sp-ss="0"]'), /süperset · ayır/);
  await p.click('#sp-next'); await s.waitScreen('salon');
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  const ses0 = await s.ls('ysk.salonSession');
  assert.ok(ses0.hareketler[0].ss && ses0.hareketler[0].ss === ses0.hareketler[1].ss);
  const title = () => p.$eval('#sl-wheel .w-item.is-active .sl-ad', (e) => e.textContent.trim());
  // Isınma seti (kayda sayılmaz)
  await p.click('#sl-wheel .w-item.is-active .w-tag'); await p.waitForSelector('#sl-detail:not([hidden])');
  await p.click('#sl-detail [data-sl-isn]');
  assert.match(await txt(s, '#sl-detail [data-sl-isn]'), /Isınma seti · 1/);
  await p.click('#sl-detail .dt-hint');
  assert.match(await txt(s, '#sl-wheel .w-item.is-active .w-tag'), /ISINMA 1/);
  // A seti → B'ye geçer, dinlenme yok
  await slPress(s); await s.adv(20); await slPress(s); await s.adv(1);
  await p.waitForFunction(() => document.querySelector('#sl-wheel .w-item.is-active .sl-ad').textContent.trim() === 'Band Bent Over Row');
  const timerOf = (ad) => p.$$eval('#sl-wheel .w-item', (els, a) => { const e = els.find((x) => x.querySelector('.sl-ad') && x.querySelector('.sl-ad').textContent.trim() === a); const tm = e && e.querySelector('.w-timer'); return tm ? tm.textContent.replace(/\s+/g, ' ').trim() : ''; }, ad);
  assert.match(await timerOf('Dumbbell Shoulder Press'), /SÜPERSET · DİNLENME YOK.*sıradaki: Band Bent Over Row/);
  // B seti → A'ya döner, normal dinlenme
  await s.adv(2); await slPress(s); await s.adv(20); await slPress(s); await s.adv(3);
  await p.waitForFunction(() => document.querySelector('#sl-wheel .w-item.is-active .sl-ad').textContent.trim() === 'Dumbbell Shoulder Press');
  assert.match(await timerOf('Band Bent Over Row'), /DİNLENME · 2\. SETE/);
  assert.equal(await title(), 'Dumbbell Shoulder Press');
  // bitir ve kaydet: ısınma notu
  await s.adv(60);
  await p.click('#sl-back'); await s.waitModal('Kara idmanı'); await s.modalClick('İdmanı bitir ve kaydet');
  await s.waitScreen('salon-ozet'); await p.click('#so-save'); await s.waitScreen('home');
  const I = s.envs.SALON.sheets.idman;
  assert.match(I.data[1][9], /^Setler: 10\. Isınma 1 set/);
  assert.equal(I.data[2][9], 'Setler: 15');
});

// --- Yüzme ---------------------------------------------------------------------------------------
const refV12 = () => ({ ...sampleRef(), drill: new Sheet('drill', ['Ad', 'Video', 'Açıklama'], [['Açıklama 2', 'https://youtu.be/d2', 'örnek drill']]) });
/** Aktif setin n tekrarını yüzer (tekrar 60 sn, tekrar arası 20 sn, son tekrardan sonra 3 sn). */
async function tekrarlar(s, n) { for (let r = 0; r < n; r++) { await s.tap(60); await s.tap(r < n - 1 ? 20 : 3); } }

sc('Yüzme: drill videosu; set sonu kulaç + nabız (norm üstü uyarısı), aerobik blok sonunda omuz rahatlatma; özette SWOLF, bölgeler; eski sayfasına kulaç ve nabız', async ({ launch }) => {
  const s = await launch({ refSheets: refV12(), ref: true }); const p = s.page;
  await s.openToday();
  // 2. set (Drill) kartında ▶ Drill
  assert.equal(await p.$$eval('.w-item .w-card a.sl-vid', (e) => e.map((x) => x.getAttribute('href')).join()), 'https://youtu.be/d2');
  // 1. set (WU 1×200): set sonu → kulaç/nabız şeridi, omuz rahatlatma yok (WU aerobik blok değil)
  await tekrarlar(s, 1);
  await p.waitForSelector('#yz-ara:not([hidden])');
  assert.equal(await p.$$eval('#yz-ara .yz-rahat', (e) => e.length), 0);
  await p.click('#yz-ara [data-kn]'); await s.waitModal('kulaç ve nabız');
  await p.click('#modal-body [data-d="kulac:1"]'); await p.click('#modal-body [data-d="kulac:1"]');
  assert.match(await txt(s, '#modal-body'), /16.*teknik bozuluyor/);
  await p.click('#modal-body [data-d="nabiz:5"]');
  await s.modalClick('Kaydet');
  assert.match(await txt(s, '#yz-ara [data-kn]'), /Kulaç 16\/25 m · Nabız 145/);
  // 2. set (4×50 drill) ve 3. set (MS 4×100): MS bitince omuz rahatlatma (sonraki blok AS)
  await s.adv(20);
  await tekrarlar(s, 4); await s.adv(20);
  await tekrarlar(s, 4);
  await p.waitForSelector('#yz-ara .yz-rahat');
  assert.match(await txt(s, '#yz-ara .yz-rahat'), /Omuz rahatlatma · 60 sn/);
  await p.click('#yz-ara [data-rahat="yap"]');
  assert.equal(await p.$$eval('#yz-ara .yz-rahat', (e) => e.length), 0);
  assert.deepEqual(Object.values((await s.session()).yz.rahat), ['yap']);
  await s.finishToOzet();
  assert.match(await txt(s, '#oz-analiz'), /BÖLGELERDE SÜRE/);
  assert.match(await txt(s, '#oz-analiz'), /STRES PUANI.*STRES PUANI\s*\d+.*hız CSS'e göre %\d+/, '13.5 (B10)');
  const oz = await p.$$eval('.oz-set', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  assert.match(oz[0], /Kulaç 16\/25 m · SWOLF \d+ · Nabız 145.*⚠ Kulaç 16\/25 m \(norm 13–15\)/);
  await p.click('#oz-save'); await s.waitScreen('done');
  const eski = s.env.sheets.eski;
  const hdr = eski.data[0];
  const row = eski.data.slice(1).find((r) => r[hdr.indexOf('Blok')] === 'WU'); // Sıra sürüm 11'den beri boş yazılır
  assert.deepEqual([row[hdr.indexOf('Kulaç')], row[hdr.indexOf('Nabız')]], [16, 145]);
  const hist = (await s.ls('ysk.history'))[0];
  assert.equal(hist.setler[0].kulac, 16);
});

sc('Yüzme: ağrı ekranında kas haritası — omuza dokun → kişinin sağı/solu; liste aynı anahtarı gösterir; son 4 hafta özeti', async ({ launch }) => {
  const s = await launch({ ref: true, viewport: { width: 390, height: 844 }, storage: { 'ysk.history': [{ id: 'x', tarih: '2026-09-20', seans: { sure: '00:40:00', rpe: 6, msi: 'sag omuz 1' }, setler: [] }] } }); const p = s.page;
  await s.openToday();
  await s.tap(60); await s.tap(3);
  await p.click('#prog-back'); await s.waitModal('İdmanı bitir?'); await s.modalClick('İdmanı bitir ve kaydet');
  await s.waitScreen('rpe'); await p.click('#rpe-grid button[data-v="6"]'); await s.waitScreen('msi');
  await p.waitForSelector('#msi-harita .kf');
  await p.waitForTimeout(300);
  assert.match(await txt(s, '#msi-gecmis'), /SON 4 HAFTA\s*Sağ omuz · 1 seans · ort. 1 · en çok 1/);
  const r = await p.locator('#msi-harita .kf').boundingBox();
  // önden bakış: görüntünün solundaki omuz = kişinin sağ omzu (Omuz merkezi aynalanmış: x 56 / 230)
  await p.mouse.click(r.x + (r.width * 56) / 230, r.y + (r.height * 110) / 503);
  assert.match(await txt(s, '[data-bolge="sag omuz"]'), /Sağ omuz0,5/);
  await p.mouse.click(r.x + (r.width * 174) / 230, r.y + (r.height * 110) / 503);
  assert.equal((await p.locator('#msi-harita .kf').boundingBox()).y, r.y, 'dokununca harita kaymaz');
  await p.mouse.click(r.x + (r.width * 174) / 230, r.y + (r.height * 110) / 503);
  assert.match(await txt(s, '[data-bolge="sol omuz"]'), /Sol omuz1/);
  assert.equal(await p.$$eval('#msi-harita .msi-pin', (e) => e.length), 2);
  // karın: MSI yok uyarısı
  await p.mouse.click(r.x + (r.width * 114) / 230, r.y + (r.height * 194) / 503);
  await p.waitForFunction(() => /Bu bölge için MSI yok/.test(document.getElementById('toast').textContent));
  await p.click('#msi-next'); await s.waitScreen('ozet');
  assert.match(await txt(s, '#oz-msi'), /sağ omuz 0,5, sol omuz 1/);
});

sc('CSS testi: 400 + 200 → yeni CSS, sporRef css sayfasına yeni satır (eskiler durur), Ayarlar yeni değeri gösterir; derece tahmini', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.ref'));
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.match(await txt(s, '#pref-css-ref'), /idmanRef'ten: 2:00/);
  assert.match(await txt(s, '#pref-tahmin'), /Derece tahmini \(kaba, CSS'ten\): 100 FR 1:48 · 200 FR 3:48 · 400 FR 7:52/);
  const once = s.envs.REF.sheets.css.data.length;
  await p.click('#pref-css-test'); await s.waitModal('CSS testi');
  // varsayılan: 400 = 8:08, 200 = 3:54 → CSS 2:07; 400'ü 7:46'ya indir → (466 − 234) / 2 = 116 = 1:56
  for (let k = 0; k < 4; k++) await p.click('#modal-body [data-d="t400:-5"]');
  await p.click('#modal-body [data-d="t400:-1"]'); await p.click('#modal-body [data-d="t400:-1"]');
  assert.match(await txt(s, '#modal-body'), /400 M\s*7:46.*200 M\s*3:54.*YENİ CSS\s*1:56/);
  await s.modalClick("idmanRef'e yaz");
  await p.waitForFunction(() => /idmanRef'e yazıldı/.test(document.getElementById('toast').textContent));
  const css = s.envs.REF.sheets.css;
  assert.equal(css.data.length, once + 1, 'yalnızca bir satır eklendi');
  assert.equal(css.data[css.data.length - 1][2], 116);
  await p.waitForFunction(() => /idmanRef'ten: 1:56/.test(document.getElementById('pref-css-ref').textContent));
  assert.ok(s.net.calls.includes('addCss'));
});

sc('Yüzme ayrıntısı: aynı setin son seferleri tempo grafiği (CSS çizgisiyle)', async ({ launch }) => {
  const set = (tarih, gercek) => ({ id: tarih, tarih, seans: { sure: '00:40:00', rpe: 6, msi: '' }, setler: [{ blok: 'MS', tekrar: 4, mesafe: 100, stil: 'FR', tur: 'Swim', tamamlandi: true, gercek, yapilan: 4 }] });
  const s = await launch({ ref: true, storage: { 'ysk.history': [set('2026-09-16', '1:58.0'), set('2026-09-09', '2:01.0'), set('2026-09-02', '2:03.5')] } }); const p = s.page;
  await s.openToday();
  await s.goTo(2);
  await p.click('.w-item.is-active .w-card'); await p.waitForSelector('#detail:not([hidden])');
  assert.match(await txt(s, '#detail-body'), /SON 3 KEZ · ORT\. TEMPO \/100 M/);
  const t = await p.$$eval('#detail-body svg.hg circle.hit title', (e) => e.map((x) => x.textContent));
  assert.deepEqual(t.map((x) => x.slice(0, 5)), ['02.09', '09.09', '16.09']);
  assert.equal(await p.$$eval('#detail-body svg.hg line.ref', (e) => e.length), 1, 'CSS çizgisi');
});

// --- 12.5: ana sayfa haftalık şerit, Form ve denge, Haftanın özeti, takvim ekleri ---
const yz = (tarih, metre, rpe, msi = '', stil = 'FR') => ({ id: tarih, tarih, endedAt: Date.parse(`${tarih}T08:00:00`), seans: { sure: '01:00:00', rpe, msi }, setler: [{ blok: 'MS', tekrar: metre / 100, mesafe: 100, stil, tur: 'Swim', tamamlandi: true, gercek: '1:58.0', yapilan: metre / 100 }] });
const hist12 = () => [yz('2026-09-21', 2000, 6, 'sag omuz 1'), yz('2026-09-18', 2400, 7, '', 'BR'), yz('2026-09-16', 2200, 6), yz('2026-09-09', 2000, 5), yz('2026-09-02', 1800, 5), yz('2026-08-26', 1600, 5)];

sc('Ana sayfa: haftalık şerit (gün halkası, form, bugünün önerisi, kurbağalama) → Form ve denge (grafik, toparlanma, iskelet, blok başlat); takvimde ekler', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true, storage: { 'ysk.history': hist12() } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /bu hafta gün/.test(document.getElementById('home-week').textContent));
  const hw = await txt(s, '#home-week');
  assert.match(hw, /1\/3\s*bu hafta gün/);
  assert.match(hw, /BU HAFTA YÜK\s*%\d+\s*normalin altında/);
  assert.match(hw, /BUGÜN ÖNERİ/);
  assert.match(hw, /Kurbağalama bu ay %\d/);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/home.png`, fullPage: true });
  await p.click('[data-hw="form"]'); await s.waitScreen('form');
  const fm = await txt(s, '#fm-body');
  assert.match(fm, /BU HAFTA\s*%\d+\s*Normalin altında\s*1\/3 seans · 60 dk · yük 360 \/ 1\.170/);
  assert.match(fm, /SON 8 HAFTA/);
  assert.match(fm, /KAS YORGUNLUĞU/);
  assert.match(fm, /YÜZME YOĞUNLUĞU.*Kolay.*hedef ~%75/);
  assert.match(fm, /HAFTANIN İSKELETİ.*Pzt\s*Yüzme 60 dk.*Çar\s*Yüzme programı.*Per\s*Yüzme programı/);
  assert.match(fm, /4 HAFTALIK DÖNGÜ.*İsteğe bağlı/);
  assert.doesNotMatch(fm, /1\. hafta · Hacim/, 'döngü başlatılmadan hafta gösterilmez');
  if (process.env.SHOT) { await p.screenshot({ path: `${process.env.SHOT}/form1.png` }); await p.$eval('#fm-body', (e) => { e.scrollTop = 700; }); await p.screenshot({ path: `${process.env.SHOT}/form2.png` }); await p.$eval('#fm-body', (e) => { e.scrollTop = 1600; }); await p.screenshot({ path: `${process.env.SHOT}/form3.png` }); }
  assert.ok(await p.evaluate(() => document.getElementById('fm-body').scrollWidth <= document.getElementById('fm-body').clientWidth), 'yatay taşma yok');
  assert.equal(await p.$$eval('#fm-body svg.hy rect.by', (e) => e.length), 5, 'yüzme yapılan 5 hafta');
  assert.equal(await p.$$eval('#fm-body svg.hy line.ref', (e) => e.length), 1, 'normal hafta çizgisi');
  await p.click('[data-fm="blok"]');
  assert.equal((await s.ls('ysk.prefs')).blokBas, '2026-09-21');
  assert.match(await txt(s, '#fm-body'), /1\. hafta · Hacim/);
  await p.click('[data-fm="blokbitir"]');
  assert.equal((await s.ls('ysk.prefs')).blokBas, undefined);
  await p.click('#fm-back'); await s.waitScreen('home');
  await p.click('#home-swim'); await s.waitScreen('days');
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/takvim.png` });
  const ek = await p.$eval('#wk-track .wd[data-day="2026-09-21"]', (b) => ({ y: Boolean(b.querySelector('.wd-ek .wd-y i')), a: Boolean(b.querySelector('.wd-ek .wd-a')), cls: b.className }));
  assert.ok(ek.y && ek.a, JSON.stringify(ek));
  assert.ok(!/wd-ek/.test(ek.cls), 'gün düğmesinin sınıfları değişmez');
});

sc('Haftanın özeti: bu hafta (km, seans, ağrı, notlar) → önceki hafta (salon seti, kıyas); sonraki düğmesi bu haftada kapalı', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true, storage: { 'ysk.history': hist12() } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('#home-hafta'); await s.waitScreen('hafta');
  assert.match(await txt(s, '#hz-title'), /21 Eylül Pazartesi – 27 Eylül Pazar/);
  assert.equal(await p.isDisabled('#hz-next'), true);
  let b = await txt(s, '#hz-body');
  assert.match(b, /YÜZME\s*2\s*km/);
  assert.match(b, /SEANS\s*1\/3/);
  assert.match(b, /Sağ omuz: MSI en çok 1/);
  assert.match(b, /HAFTANIN NOTLARI.*Omuz önleyici 0\/2/);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/hafta.png` });
  await p.click('#hz-prev');
  assert.match(await txt(s, '#hz-title'), /14 Eylül/);
  assert.equal(await p.isDisabled('#hz-next'), false);
  b = await txt(s, '#hz-body');
  assert.match(b, /YÜZME\s*4,6\s*km/);
  assert.match(b, /KARA\s*9\s*set/);
  assert.match(b, /KURBAĞALAMA %52/);
  await p.click('#hz-next');
  assert.match(await txt(s, '#hz-title'), /21 Eylül/);
});

sc('Pazar: ana sayfada "Haftanın özeti hazır" → özet ekranı; Ayarlar\'da kaynak ve lisans notu', async ({ launch }) => {
  const s = await launch({ ref: true, time: '2026-09-27T10:00:00', viewport: { width: 320, height: 700 }, storage: { 'ysk.history': hist12() } }); const p = s.page;
  const tasma = () => p.evaluate(() => [...document.querySelectorAll('.screen:not([hidden]) .scroll')].some((e) => e.scrollWidth > e.clientWidth + 1) || document.documentElement.scrollWidth > 320);
  await s.waitScreen('home');
  await p.waitForSelector('[data-hw="hafta"]');
  assert.equal(await tasma(), false, '320 px ana sayfada taşma yok');
  await p.click('[data-hw="hafta"]'); await s.waitScreen('hafta');
  assert.match(await txt(s, '#hz-title'), /21 Eylül/);
  assert.equal(await tasma(), false, '320 px özette taşma yok');
  await p.click('#hz-back'); await s.waitScreen('home');
  await p.click('#home-form'); await s.waitScreen('form');
  assert.equal(await tasma(), false, '320 px Form ve denge ekranında taşma yok');
  await p.click('#fm-back'); await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.match(await txt(s, '#pref-lisans'), /free-exercise-db \(Unlicense.*SIL Open Font License/);
});

sc('Çakışma uyarısı (B5): dün uzun serbest yüzme + bugün omuz ağırlıklı salon planı → planlamada uyarı; omuz seçilmezse yok', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true, storage: { 'ysk.history': [yz('2026-09-22', 2000, 6)] } }); const p = s.page;
  await toPlanList(s, ['Core']);
  assert.equal(await p.$$eval('.sp-cak', (e) => e.length), 0);
  await p.click('#sp-back');
  await p.click('[data-sp-grup="Shoulders"]'); await p.click('#sp-next');
  assert.match(await txt(s, '.sp-cak'), /Ağır omuz kara idmanı \(bugün\) ile uzun yüzme \(dün\) art arda/);
});

sc('Form ve denge: uzun aradan sonra iki hafif yüzme → "yük hızlı arttı" uyarısı YOK, "aradan dönüş"; ana sayfada uyarı yok; yorgun kas yoksa harita yok', async ({ launch }) => {
  const eski = ['2026-06-02', '2026-06-04', '2026-06-09'].map((t) => yz(t, 2000, 6));
  const s = await launch({ ref: true, time: '2026-09-26T09:00:00', storage: { 'ysk.history': [...eski, yz('2026-09-23', 1600, 5), yz('2026-09-25', 1600, 5)] } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /BU HAFTA YÜK/.test(document.getElementById('home-week').textContent));
  const hw = await txt(s, '#home-week');
  assert.doesNotMatch(hw, /Yük hızlı/, hw);
  assert.match(hw, /2\/3\s*bu hafta gün.*BU HAFTA YÜK\s*%51\s*normalin altında/);
  await p.click('[data-hw="form"]'); await s.waitScreen('form');
  const fm = await txt(s, '#fm-body');
  assert.match(fm, /Aradan dönüş döneminde/);
  assert.doesNotMatch(fm, /dinlenme haftası/);
  assert.match(fm, /2\/3 seans · 120 dk · yük 600 \/ 1\.170/);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/form-donus.png` });
});

// 13.3 (bilinçli değişiklik): şablon salonVeri'deki son idman değil, salonPlan'daki plan; Kaydet → "Plana yaz" (salonPlan).
sc('Planı düzenle: Salon ekranında salonPlan günü → Düzenle → planın 3. adımı; değere dokun → set/ağırlık düzenle; çıkar; ＋ Hareket ekle; Plana yaz → salonPlan; idman ekranında düzenleme hâlâ çalışır', async ({ launch }) => {
  const sh = bugunPlanli(salonV12());
  const s = await launch({ salonSheets: sh, ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /karaPlan/.test(document.getElementById('home-gym-go').textContent));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  assert.match(await txt(s, '#ss-body'), /23 EYLÜL.*BUGÜN · 2 HAREKET.*Dumbbell Shoulder Press\s*3 × 10 · 12,5 kg.*Band Bent Over Row.*İdmanı aç\s*Düzenle\s*＋ Yeni idman planla/);
  assert.doesNotMatch(await txt(s, '#ss-body'), /SON İDMAN|Son idmanı/, 'salonVeri şablonu yok');
  await p.click('[data-ss="duzenle"][data-t="2026-09-23"]'); await s.waitScreen('salon-plan');
  assert.equal(await txt(s, '#sp-title'), 'Programı düzenle');
  assert.deepEqual(await p.$$eval('.sp-pl .sp-m b', (e) => e.map((x) => x.textContent)), ['Dumbbell Shoulder Press', 'Band Bent Over Row']);
  // Shoulder Press: set 3 → 4, ağırlık 12,5 → 10
  await p.click('[data-sp-ed="0"]'); await p.waitForSelector('#screen-salon-plan #sl-edit:not([hidden])');
  assert.match(await txt(s, '#se-tag'), /1\/2 · DÜZENLE/);
  await p.click('[data-se="set:1"]'); await p.click('[data-se="agirlik:-1"]');
  await p.click('#se-save');
  assert.match(await txt(s, '[data-sp-ed="0"]'), /4 × 10\s*10 kg/);
  // Row çıkar, sonra hareket ekle → 1. adım (seçim korunur)
  await p.click('[data-sp-rm="1"]');
  await p.click('[data-sp-add]');
  await p.waitForSelector('.sp-ex');
  assert.match(await txt(s, '[data-sp-ex="Dumbbell Shoulder Press"]'), /✓$/, 'plandaki hareket seçili');
  await p.click('[data-sp-ex="Band External Rotation"]');
  await p.click('#sp-next');
  const ad = await p.$$eval('.sp-pl .sp-m b', (e) => e.map((x) => x.textContent));
  assert.deepEqual(ad, ['Dumbbell Shoulder Press', 'Band External Rotation']);
  await p.click('#sp-save'); await s.waitScreen('salon-prog'); // gün belli: sorulmaz
  const pr = sh.plan.data.slice(1).filter((r) => r[2]);
  assert.deepEqual(pr.map((r) => r[2]), ['Dumbbell Shoulder Press', 'Band External Rotation']);
  assert.deepEqual([pr[0][3], pr[0][5]], [4, 10]);
  await p.click('#pg-back'); await s.waitScreen('salon-start');
  // İdmanda Düzenle (katman salon ekranına döner)
  await p.click('[data-ss="basla"][data-t="2026-09-23"]');
  await p.waitForSelector('#modal:not([hidden]), #screen-salon:not([hidden])');
  if (await p.isVisible('#modal')) await s.modalClick('Hiçbiri');
  await s.waitScreen('salon');
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  assert.deepEqual((await s.ls('ysk.salonSession')).hareketler.slice(0, 1).map((x) => [x.set, x.agirlik]), [[4, 10]]);
  await p.click('#sl-wheel .w-item.is-active .w-tag'); await p.waitForSelector('#sl-detail:not([hidden])');
  await p.click('#sl-detail [data-sact="edit"]');
  await p.waitForSelector('#screen-salon #sl-edit:not([hidden])');
  assert.match(await txt(s, '#se-title'), /Dumbbell Shoulder Press/);
});

sc('Hareket seçimi: "Nasıl yapılır" düğmesi büyük, uygulamadaki fotoğraf küçük resim olarak; dokun → bilgi kartı', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true }); const p = s.page;
  await toPlanList(s, ['Shoulders']);
  const b = '[data-sp-ex="Band External Rotation"] .sp-nasil';
  await p.waitForSelector(`${b} .sp-th.is-img img`);
  const r = await p.locator(b).boundingBox();
  assert.ok(r.height >= 40, `dokunma alanı ${r.height}`);
  assert.equal(await p.$$eval('.sp-ex', (e) => e.filter((x) => x.classList.contains('is-on')).length), 0);
  await p.click(b); await p.waitForSelector('#bilgi:not([hidden])');
  assert.match(await txt(s, "#bi-title"), /Bantla dış rotasyon/);
  assert.equal(await p.$$eval('.sp-ex.is-on', (e) => e.length), 0, 'nasıl düğmesi hareketi seçmez');
});

const only = process.argv[2];
if (require.main === module) runScenarios('Sürüm 12 senaryoları', only ? S.filter(([n]) => n.toLowerCase().includes(only.toLowerCase())) : S, 8150);
exports.toPlanList = toPlanList;
