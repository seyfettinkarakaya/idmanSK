// Sürüm 13 uçtan uca senaryoları (videolar, salon programı, pratik öneriler, entegre model).
//   NODE_PATH=$(npm root -g) node tests/e2e-surum13.cjs [filtre]
const assert = require('assert');
const { runScenarios, D, sampleRef, prow, samplePlan } = require('./harness.cjs');
const { Sheet } = require('./fakegas.cjs');
const { salonV12, toPlanList, gymBasla, bugunPlanli } = require('./e2e-surum12.cjs');

const S = [];
const sc = (name, fn) => S.push([name, fn]);
const txt = (s, sel) => s.page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());
exports.S = S;

/** salonV12 + H'de bir harekete YouTube bağlantısı. */
function salonVideo(hVideo = {}) {
  const sh = salonV12();
  sh.H.data = sh.H.data.map((r, i) => (i && hVideo[r[0]] ? [...r.slice(0, 5), hVideo[r[0]]] : r));
  return sh;
}

sc('Video: hareket kartında uygulama listesinden gömülü video (sessiz, döngü, çerezsiz); YouTube bağlantısı; kapatınca durur; planlama kartında "▶ Video"', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true, viewport: { width: 390, height: 844 } }); const p = s.page;
  await toPlanList(s, ['Back']);
  assert.match(await txt(s, '[data-sp-ex="Band Bent Over Row"] .sp-nasil'), /▶ Video · nasıl yapılır/);
  await p.click('[data-sp-info="Band Bent Over Row"]'); await p.waitForSelector('#bilgi:not([hidden]) .bi-vid iframe');
  const src = await p.getAttribute('.bi-vid iframe', 'src');
  assert.match(src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/t7AwNxr_1vg\?/);
  assert.match(src, /mute=1/); assert.match(src, /loop=1/); assert.match(src, /autoplay=1/);
  assert.match(await txt(s, '.bi-vk'), /OPEX · uygulama listesinden · sessiz · döngü/);
  assert.equal(await p.getAttribute('.bi-vk a', 'href'), 'https://www.youtube.com/watch?v=t7AwNxr_1vg');
  assert.equal(await p.$$eval('#bi-media', (e) => e.length), 0, 'video varken fotoğraf yok');
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/v1.png` });
  await p.waitForFunction(() => true);
  assert.ok(s.net.video.some((u) => u.includes('t7AwNxr_1vg')));
  await p.click('#bi-close');
  assert.equal(await p.$$eval('#bi-body iframe', (e) => e.length), 0, 'kapatınca video durur');
  assert.equal(s.net.external.length, 0);
});

sc('Video: H sayfasındaki Video sütunu listeden önce gelir; listede olmayan harekette bilgi notu', async ({ launch }) => {
  const s = await launch({ salonSheets: salonVideo({ 'Band External Rotation': 'https://youtu.be/AbCdEfGhIjK?t=5' }), ref: true }); const p = s.page;
  await toPlanList(s, ['Shoulders']);
  await p.click('[data-sp-info="Band External Rotation"]'); await p.waitForSelector('#bilgi:not([hidden]) .bi-vid iframe');
  assert.match(await p.getAttribute('.bi-vid iframe', 'src'), /embed\/AbCdEfGhIjK\?.*start=5/);
  assert.match(await txt(s, '.bi-vk'), /H · Video sütunundan/);
  await p.click('#bi-close');
  await p.click('[data-sp-info="Dumbbell Shoulder Press"]'); await p.waitForSelector('#bilgi:not([hidden])');
  assert.match(await txt(s, '#bi-body'), /videosu yok: H sayfasının Video sütununa/);
  assert.equal(await p.$$eval('#bi-body iframe', (e) => e.length), 0);
});

sc('Video: çevrimdışıyken video yerine fotoğraf ve not; idman kartında "▶ Form" kartı açar; Ayarlar özeti', async ({ launch }) => {
  const s = await launch({ salonSheets: bugunPlanli(salonV12()), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => !document.getElementById('home-gym-go').hidden);
  await gymBasla(s);
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  await s.goTo(1, '#sl-wheel');
  assert.match(await txt(s, '#sl-wheel .w-item.is-active .w-card'), /Band Bent Over Row/);
  await p.click('#sl-wheel .w-item.is-active .sl-vform'); await p.waitForSelector('#bilgi:not([hidden]) .bi-vid iframe');
  await p.click('#bi-close');
  await p.context().setOffline(true);
  await p.click('#sl-wheel .w-item.is-active .sl-vform'); await p.waitForSelector('#bilgi:not([hidden])');
  assert.match(await txt(s, '#bi-body'), /📶 Çevrimdışı: video internet gelince oynar/);
  assert.equal(await p.$$eval('#bi-body iframe', (e) => e.length), 0);
  await p.context().setOffline(false);
  await p.click('#bi-close');
  assert.equal((await s.ls('ysk.salonSession')).events.length, 0, 'form videosu idmanı başlatmaz');
});

sc('Video: Ayarlar\'da kaynak özeti (61 hareket, OPEX 33) ve lisans notu', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.match(await txt(s, '#pref-video'), /uygulama listesinde 61 hareket \(OPEX 33, diğer 28\)/);
  assert.match(await txt(s, '#pref-lisans'), /YouTube'un kendi oynatıcısıyla/);
});

const PLAN_H = ['Tarih', 'Sıra', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Süre', 'Dinlen', 'Süperset', 'Not', 'Durum'];

sc('Salon programı: haftalık görünüm; boş güne planla → "Programa yaz" → SalonTakip plan sayfası açılır, gün kartında hareketler; Düzenle / Sil', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="prog"]'); await s.waitScreen('salon-prog');
  assert.match(await txt(s, '#pg-title'), /21 Eylül Pazartesi – 27 Eylül Pazar/);
  assert.match(await txt(s, '#pg-body'), /karaPlan sayfası gerekir/);
  assert.match(await txt(s, '[data-pg-gun="2026-09-23"]'), /Çarşamba.*🏊 yüzme/);
  await p.click('[data-pg="planla"][data-t="2026-09-24"]'); await s.waitScreen('salon-plan');
  await p.click('[data-sp-grup="Shoulders"]'); await p.click('#sp-next');
  await p.click('[data-sp-ex="Band External Rotation"]'); await p.click('[data-sp-ex="Dumbbell Shoulder Press"]');
  await p.click('#sp-next');
  assert.match(await txt(s, '#sp-body .sp-note'), /Plana yaz.*karaPlan.*\(24 Eylül/); // 13.3: "Programa yaz" → alt çubukta "Plana yaz"
  await p.click('#sp-save'); await s.waitScreen('salon-prog');
  const plan = s.envs.SALON.sheets.plan;
  assert.ok(plan, 'plan sayfası açıldı');
  assert.deepEqual(plan.data.slice(1).map((r) => [r[1], r[2]]), [[1, 'Band External Rotation'], [2, 'Dumbbell Shoulder Press']]);
  await p.waitForFunction(() => /2 hareket/.test(document.querySelector('[data-pg-gun="2026-09-24"]').textContent));
  assert.match(await txt(s, '[data-pg-gun="2026-09-24"]'), /Band External Rotation.*Dumbbell Shoulder Press/);
  assert.equal(s.envs.SALON.sheets.idman.data.length, 4, 'idman sayfasına yazılmadı');
  // Düzenle → bir hareket çıkar → yeniden yaz
  await p.click('[data-pg="duzenle"][data-t="2026-09-24"]'); await s.waitScreen('salon-plan');
  assert.equal(await txt(s, '#sp-title'), 'Programı düzenle');
  await p.click('[data-sp-rm="0"]');
  await p.click('#sp-save'); await s.waitScreen('salon-prog');
  await p.waitForFunction(() => /1 hareket/.test(document.querySelector('[data-pg-gun="2026-09-24"]').textContent));
  assert.equal(plan.data.slice(1).filter((r) => r[2]).length, 1);
  // Sil
  await p.click('[data-pg="sil"][data-t="2026-09-24"]'); await s.waitModal('Programı sil'); await s.modalClick('Sil');
  await p.waitForFunction(() => /Bu güne kara idmanı planla/.test(document.querySelector('[data-pg-gun="2026-09-24"]').textContent));
});

sc('Salon programı: bugünün programı tabloda varsa ana sayfa salon kartında (13.3: yüzme kartı gibi) → İdmanı aç programdaki değerlerle; süperset korunur', async ({ launch }) => {
  const sh = salonV12();
  sh.plan = new Sheet('plan', PLAN_H, [
    [D('2026-09-23'), 1, 'Band Bent Over Row', 4, 12, 20, '', 75, 'A', '', ''],
    [D('2026-09-23'), 2, 'Front Plank', 3, 1, 'Vücut', 45, 60, 'A', '', ''],
    [D('2026-09-25'), 1, 'Dumbbell Shoulder Press', 3, 10, 12.5, '', 90, '', '', ''],
  ]);
  const s = await launch({ salonSheets: sh, ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => !document.getElementById('home-gym-go').hidden && /karaPlan/.test(document.getElementById('home-gym-go').textContent));
  assert.match(await txt(s, '#home-gym-go'), /Bugün · Çarşamba 23 Eylül.*Band Bent Over Row\s*4×12 · 20 kg.*Front Plank\s*3×45 sn\s*karaPlan · tablodan/);
  await gymBasla(s, 'Hiçbiri'); // 13.3: planda artış önerisi sorulur; Hiçbiri → plandaki değerler
  const ses = await s.ls('ysk.salonSession');
  assert.equal(ses.programTarih, '2026-09-23');
  assert.deepEqual(ses.hareketler.map((x) => [x.ad, x.set, x.tekrar, x.agirlik, x.dinlen, x.sure]), [['Band Bent Over Row', 4, 12, 20, 75, 0], ['Front Plank', 3, 1, 'Vücut', 60, 45]]);
  assert.ok(ses.hareketler[0].ss && ses.hareketler[0].ss === ses.hareketler[1].ss, 'süperset');
});

// --- 13.3 pratik öneriler ---
const slPress = (s) => s.page.$eval('#sl-main', (b) => b.click());
async function setler(s, n) { for (let k = 0; k < n; k++) { await slPress(s); await s.adv(20); await slPress(s); if (k < n - 1) await s.adv(70); } }

sc('Hazır olma (P1): ana sayfada 10 sn kontrol → eklem MSI 2 → "dinlen" kararı; bugünün önerisi değişir; kayıt telefonda', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForSelector('[data-hw="hazir"]');
  assert.match(await txt(s, '[data-hw="hazir"]'), /Bugün nasılsın\? · 10 sn/);
  await p.click('[data-hw="hazir"]'); await s.waitModal('Bugün nasılsın?');
  await p.click('[data-hz="uyku"][data-v="4"]'); await p.click('[data-hz="eklem"][data-v="2"]');
  assert.match(await txt(s, '.hz-sonuc'), /Eklem ağrısı: bugün dinlen/);
  await s.modalClick('Kaydet');
  await p.waitForFunction(() => /Hazır olma %/.test(document.getElementById('home-week').textContent));
  assert.match(await txt(s, '#home-week'), /BUGÜN ÖNERİ\s*Eklem ağrısı: bugün dinlen.*Hazır olma %\d+ · Eklem ağrısı/);
  assert.deepEqual((await s.ls('ysk.hazir'))['2026-09-23'], { uyku: 4, agri: 1, enerji: 3, eklem: 2 });
});

sc('Dinlenme haftası (P10) ve haftalık set (P8): son kontrollerin çoğu yorgun → Form ve denge ile ana sayfada öneri; salonda kas grubu başına set', async ({ launch }) => {
  const hz = { '2026-09-16': { uyku: 2, agri: 4, enerji: 2, eklem: 0 }, '2026-09-18': { uyku: 3, agri: 3, enerji: 3, eklem: 0 }, '2026-09-19': { uyku: 2, agri: 3, enerji: 2, eklem: 0 } };
  const s = await launch({ salonSheets: salonV12(), ref: true, time: '2026-09-20T19:00:00', storage: { 'ysk.hazir': hz } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.waitForFunction(() => /Dinlenme haftası öner/.test(document.getElementById('home-week').textContent));
  await p.click('[data-hw="form"]'); await s.waitScreen('form');
  const fm = await txt(s, '#fm-body');
  assert.match(fm, /Dinlenme haftası öner: son kontrollerin çoğunda yorgunluk/);
  assert.match(fm, /HAFTALIK SET · KAS GRUBU.*Omuz\s*3\s*az.*Sırt\s*3\s*az.*Karın\s*3\s*az/);
});

sc('Harekete sabit not (P6) ve ağırlık adımı (P7): kartta not + 2 kg adım → idman kartında 📌 not, ± 2 kg', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true }); const p = s.page;
  await toPlanList(s, ['Back']);
  await p.click('[data-sp-info="Band Bent Over Row"]'); await p.waitForSelector('#bilgi:not([hidden]) .bi-not');
  assert.match(await txt(s, '.bi-not'), /Sabit not yok/);
  await p.click('[data-bi-act="not"]'); await s.waitModal('📌 Band Bent Over Row');
  await p.fill('#bi-not-ta', 'yeşil bant, ayaklar omuz genişliğinde');
  await s.modalClick('Kaydet');
  await p.waitForFunction(() => /yeşil bant/.test(document.querySelector('.bi-not').textContent));
  await p.click('[data-bi-adim="2"]');
  assert.deepEqual(await s.ls('ysk.hareketNot'), { 'Band Bent Over Row': { not: 'yeşil bant, ayaklar omuz genişliğinde', adim: 2 } });
  // Türkçe adımlar (exercises-dataset, MIT): benzer hareketten
  assert.match(await txt(s, '#bi-body'), /NASIL YAPILIR \(benzer hareketten: band standing rear delt row\)/);
  assert.match(await txt(s, '#bi-body'), /Türkçe adımlar: exercises-dataset \(MIT/);
  await p.click('#bi-close');
  await p.click('[data-sp-ex="Band Bent Over Row"]'); await p.click('#sp-next'); await p.click('#sp-next');
  await s.waitScreen('salon'); await p.waitForSelector('#sl-wheel .w-item.is-active');
  assert.match(await txt(s, '#sl-wheel .w-item.is-active .w-card'), /📌 yeşil bant/);
  const kg0 = (await s.ls('ysk.salonSession')).hareketler[0].agirlik;
  await p.click('#sl-wheel .w-item.is-active [data-sl-w="1"]');
  assert.equal((await s.ls('ysk.salonSession')).hareketler[0].agirlik, kg0 + 2);
});

sc('RIR (P2) ve son set türü (P5): hareket sonu girişinde RIR 2 → RPE 8; "düşürme" nota yazılır', async ({ launch }) => {
  const s = await launch({ salonSheets: bugunPlanli(salonV12()), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => !document.getElementById('home-gym-go').hidden);
  await gymBasla(s);
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  await setler(s, 3);
  await p.waitForSelector('#sl-giris:not([hidden])');
  await p.click('[data-sg-rir="2"]');
  assert.equal(await p.getAttribute('#sg-body [data-sg="rpe"][data-v="8"]', 'class'), 'is-on');
  await p.click('[data-sg-tur="düşürme seti"]');
  await p.click('#sg-save');
  const g = Object.values((await s.ls('ysk.salonSession')).giris)[0];
  assert.equal(g.rpe, 8);
  assert.match(g.not, /son set: düşürme seti · RIR 2/);
});

sc('Yer (P4): planlamada "Otel" → yalnızca bant / vücut ağırlığı hareketleri; seçim hatırlanır', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan');
  await p.click('[data-sp-yer="Otel"]');
  await p.click('[data-sp-grup="Shoulders"]'); await p.click('[data-sp-grup="Back"]'); await p.click('#sp-next');
  const names = await p.$$eval('.sp-ex:not(.is-yasak)', (e) => e.map((x) => x.querySelector('.sp-m b').firstChild.textContent.trim()));
  assert.ok(names.includes('Band External Rotation') && names.includes('Band Bent Over Row') && !names.includes('Dumbbell Shoulder Press'), JSON.stringify(names));
  assert.equal((await s.ls('ysk.prefs')).yer, 'Otel');
});

sc('Yedek (P12) ve bildirim ayarı (P11): Ayarlar\'dan JSON yedeği iner (anahtarlar hariç)', async ({ launch }) => {
  const s = await launch({ ref: true, storage: { 'ysk.hazir': { '2026-09-22': { uyku: 4, agri: 1, enerji: 4, eklem: 0 } } } }); const p = s.page;
  await s.waitScreen('home');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.match(await txt(s, '#pref-bildirim'), /bildirim: kapalı/);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#pref-yedek')]);
  assert.equal(dl.suggestedFilename(), 'idmansk-yedek-2026-09-23.json');
  const j = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  assert.equal(j.uygulama, 'idmanSK'); // 13.2.0: uygulama adı
  assert.ok(j.veriler['ysk.hazir'] && !j.veriler['ysk.config'], 'anahtarlar yedekte yok');
});

sc('Bu hafta (M1–M10): faz, yük hedefi, sağlık bütçesi, 7 gün planı; önerilen kara günü düzenlenip plan sayfasına yazılır', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true, rows: [] }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  assert.match(await txt(s, '[data-hw="buhafta"]'), /Bu hafta · yüzme \+ kara planı/);
  await p.click('[data-hw="buhafta"]'); await s.waitScreen('bu-hafta');
  const t = await txt(s, '#bh-body');
  assert.match(t, /DÖNGÜ KAPALI · varsayılan\s*Hacim/);
  assert.match(t, /HAFTALIK YÜK HEDEFİ.*kalan \d+/);
  assert.match(t, /SAĞLIK BÜTÇESİ · EKLEM\s*Omuz.*Kalça\s*0 \/ 10\s*% BR.*Diz\s*0 \/ 9\s*set/);
  // Çarşamba (bugün) salon, Perşembe aerobik yüzme, Cuma akşam yüzme; geçmiş günler boş
  assert.match(await txt(s, '[data-bh-gun="2026-09-23"]'), /Çarşamba.*öneri.*🏋 Kara · stabilite \+ core.*sabah 80 \/ öğle 65 dk/);
  assert.match(await txt(s, '[data-bh-gun="2026-09-24"]'), /Perşembe.*öneri.*🏊 Yüzme · aerobik hacim/);
  assert.match(await txt(s, '[data-bh-gun="2026-09-25"]'), /Cuma.*🏊 Yüzme · eşik \+ uzun aerobik.*akşam · sınırsız/);
  assert.doesNotMatch(await txt(s, '[data-bh-gun="2026-09-22"]'), /öneri/);
  assert.match(t, /ÖLÇÜM\s*📏 CSS testi/);
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/buhafta.png`, fullPage: true });
  // Önerilen kara günü → plan (düzenlenebilir) → Programa yaz
  await p.click('[data-bh="salon"][data-t="2026-09-23"]'); await s.waitScreen('salon-plan');
  assert.equal(await txt(s, '#sp-title'), 'Önerilen kara günü');
  const n = await p.$$eval('.sp-pl', (e) => e.length);
  assert.ok(n >= 3 && n <= 7, `hareket sayısı ${n}`);
  assert.match(await txt(s, '#sp-body .sp-note'), /Plana yaz.*\(23 Eylül/);
  await p.click('[data-sp-rm="0"]');
  await p.click('#sp-save'); await s.waitScreen('salon-prog');
  const plan = s.envs.SALON.sheets.plan;
  assert.equal(plan.data.slice(1).filter((r) => r[2]).length, n - 1);
  assert.equal(s.envs.SALON.sheets.idman.data.length, 4, 'idman sayfasına yazılmadı');
  // Bu hafta yeniden: Çarşamba artık "programda"
  await p.click('#pg-back'); await s.waitScreen('salon-start'); await p.click('#ss-back'); await s.waitScreen('home');
  await p.click('[data-hw="buhafta"]'); await s.waitScreen('bu-hafta');
  assert.match(await txt(s, '[data-bh-gun="2026-09-23"]'), /programda.*Kara programı/);
  assert.equal(await p.$$eval('[data-bh="salon"]', (e) => e.length), 0);
  assert.equal(s.net.external.length, 0);
});

sc('Bu hafta: hazır olma "dinlen" bugünü kapatır; yüzme programı 3 günü doldurunca salon uyarısı; döngü fazı salon planlamada görünür (M6, M7)', async ({ launch }) => {
  const s = await launch({ salonSheets: salonV12(), ref: true, storage: { 'ysk.hazir': { '2026-09-23': { uyku: 5, agri: 1, enerji: 5, eklem: 2 } }, 'ysk.prefs': { blokBas: '2026-09-14' } } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.click('[data-hw="buhafta"]'); await s.waitScreen('bu-hafta');
  const t = await txt(s, '#bh-body');
  assert.match(t, /DÖNGÜ · 2\. HAFTA\s*Hacim\+/);
  assert.match(await txt(s, '[data-bh-gun="2026-09-23"]'), /Bugün dinlen \(hazır olma\)/);
  assert.match(t, /Bu hafta kara günü yok/);
  await p.click('#bh-back'); await s.waitScreen('home');
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan');
  assert.match(await txt(s, '.sp-faz'), /Döngü · 2\. hafta Hacim\+ — kara: çekiş kuvveti/);
  // 13.5 (B5): döngü haftasının reçetesi ve geçen idmana göre öneri (3 × 10, RPE 7,5 → RIR 2,5)
  await p.click('[data-sp-grup="Shoulders"]'); await p.click('#sp-next');
  await p.click('[data-sp-ex="Dumbbell Shoulder Press"]'); await p.click('#sp-next');
  assert.match(await txt(s, '.sp-rc'), /hedef 3 × 10–12 · RIR 2 \(Hacim\+\) · aynı ağırlık, tekrarı artır/);
  // 13.6 (P3): planda aynı ana gruptan alternatif → tek dokunuşla değiştir
  assert.equal(await txt(s, '[data-sp-alt="0"]'), '⇄ yerine: Band External Rotation');
  await p.click('[data-sp-alt="0"]');
  await p.waitForFunction(() => document.querySelector('.sp-pl .sp-m b').textContent === 'Band External Rotation');
});

// --- 13.2.0 ---------------------------------------------------------------------------------
sc('13.2.0 faz takvimi (fazBilgi) + döngü/yasak (kisit) ve yüzme/salon ayrı günler: ana sayfa iki halka, Bu hafta, salon planlama notu, Form ve denge', async ({ launch }) => {
  const ref = sampleRef();
  ref.kisit = new Sheet('kisit', ['Kural', 'Değer', 'Açıklama'], [['gun_hafta_yuzme', 3, ''], ['gun_hafta_salon', 2, ''], ['salon_dk', 50, ''], ['salon_rpe', 5, ''],
    ['dongu_F1', 'Hacim, Hacim+, Hacim+, Dinlenme', ''], ['yasak_F1', 'SP, Kuvvet', '']]);
  ref.fazBilgi = new Sheet('fazBilgi', ['Sezon', 'Faz', 'Tarih_ilk', 'Tarih_son', 'Ad', 'Odak'], [['26-27', 'F1', D('2026-09-07'), D('2026-12-20'), 'Aerobik taban', 'omuz toleransı']]);
  const s = await launch({ salonSheets: salonV12(), ref: true, refSheets: ref, rows: [] }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.ref') && /kara gün/.test(document.getElementById('home-week').textContent));
  assert.match(await txt(s, '#home-week'), /0\/3\s*yüzme gün\s*0\/2\s*kara gün/);
  await p.click('[data-hw="buhafta"]'); await s.waitScreen('bu-hafta');
  const t = await txt(s, '#bh-body');
  assert.match(t, /AEROBİK TABAN \(F1\) · 3\. HAFTA\s*Hacim\+\s*🎯 omuz toleransı\s*⊘ bu fazda yok: SP, KUVVET/);
  assert.match(t, /GÜNLER \(3 yüzme \+ 2 kara;/);
  assert.match(await txt(s, '[data-bh-gun="2026-09-25"]'), /Cuma.*🏊 Yüzme · eşik \+ uzun aerobik/);
  assert.match(await txt(s, '[data-bh-gun="2026-09-24"]'), /Perşembe.*🏊 Yüzme/);
  assert.match(await txt(s, '[data-bh-gun="2026-09-27"]'), /Pazar.*🏋 Kara · çekiş kuvveti.*~50 dk/);
  await p.click('#bh-back'); await s.waitScreen('home');
  await p.click('#home-gym'); await s.waitScreen('salon-start');
  await p.click('[data-ss="plan"]'); await s.waitScreen('salon-plan');
  assert.match(await txt(s, '.sp-faz'), /Aerobik taban \(F1\) · 3\. hafta Hacim\+ — kara: çekiş kuvveti/);
  await p.click('#sp-back'); await s.waitScreen('salon-start'); await p.click('#ss-back'); await s.waitScreen('home');
  await p.click('#home-form'); await s.waitScreen('form');
  assert.match(await txt(s, '#fm-body'), /4 HAFTALIK DÖNGÜ\s*1\s*Hacim\s*2\s*Hacim\+\s*3\s*Hacim\+\s*4\s*Dinlenme\s*Aerobik taban \(F1\) · 3\. hafta · Hacim\+.*Bu fazda yok: SP, KUVVET/);
  assert.match(await txt(s, '#fm-body'), /Normal hafta = yüzme 3 seans × 65 dk × RPE 6 \+ kara 2 × 50 dk × RPE 5/);
});

sc('13.2.0 yüzme: geçerli CSS yoksa uyarı ve bölge yok; çok kısa tekrar sorulur; biten setin tekrar süresi idmanda düzeltilir, özete yansır', async ({ launch }) => {
  const s = await launch(); const p = s.page; // sporRef yok, elle CSS yok
  await s.openToday();
  await p.waitForFunction(() => /CSS girilmedi/.test(document.getElementById('toast').textContent));
  assert.strictEqual(await s.text('.w-item.is-active .w-pace'), 'Tempo 2:00/100', 'bölge yok (varsayılan CSS üretilmez)');
  await s.tap(30); await s.press();                                   // 1×200: 0:30 (hedef 4:00 → %20 = 0:48)
  await p.waitForFunction(() => /Çok kısa tekrar \(0:30\)/.test(document.getElementById('toast').textContent));
  await p.waitForTimeout(700);
  await s.adv(3); await s.goTo(0);
  await s.press(); await s.waitModal('Bu seti sıfırla?');
  await s.modalClick('Tekrar sürelerini düzelt'); await s.waitModal('tekrar süreleri');
  for (let k = 0; k < 6; k++) await p.click('#modal-body [data-dz="0:5"]');
  assert.match(await txt(s, '#modal-body'), /1\.\s*1:00/);
  await s.modalClick('Kaydet');
  assert.deepStrictEqual((await s.session()).form.edits, { 1: { 0: 60000 } });
  await s.finishToOzet();
  const notes = await p.$$eval('.oz-set', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ')));
  assert.match(notes[0], /ort\. 1:00/);
  assert.match(notes[0], /⚠ 1\. tekrar 1:00 \(düzeltildi\)/, 'kısa tekrar özette de işaretli');
});

// 13.3: plan salonPlan'dan (son idmanın değerleriyle); "Hiçbiri" plandaki değerlerle başlar.
sc('13.2.0 salon: artış önerisinde "Hiçbiri" plandaki değerlerle başlar; biten setlerin tekrarı ve ağırlığı sonradan düzeltilir', async ({ launch }) => {
  const s = await launch({ salonSheets: bugunPlanli(salonV12()), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /karaPlan/.test(document.getElementById('home-gym-go').textContent));
  await p.click('#home-gym-start'); await s.waitModal('Artış önerisi · 2 hareket');
  assert.match(await txt(s, '#modal-body'), /Dumbbell Shoulder Press\s*12,5 kg → 15 kg.*Band Bent Over Row\s*15 → 16 tekrar/);
  await s.modalClick('Hiçbiri'); await s.waitScreen('salon');
  let ses = await s.ls('ysk.salonSession');
  assert.deepEqual(ses.hareketler.map((x) => [x.ad, x.agirlik, x.tekrar, x._oneri || null]), [['Dumbbell Shoulder Press', 12.5, 10, null], ['Band Bent Over Row', 15, 15, null]]);
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  await setler(s, 2); await s.adv(5);
  await p.click('#sl-wheel .w-item.is-active .w-tag'); await p.waitForSelector('#sl-detail:not([hidden])');
  await p.click('#sl-detail [data-sl-dz]'); await s.waitModal('Dumbbell Shoulder Press · biten setler');
  await p.click('#modal-body [data-dz="0:-1"]'); await p.click('#modal-body [data-dz="kg:1"]');
  assert.match(await txt(s, '#modal-body'), /1\. set\s*9.*2\. set\s*10.*Ağırlık\s*15 kg/);
  await s.modalClick('Kaydet');
  ses = await s.ls('ysk.salonSession');
  assert.deepEqual([ses.reps[ses.hareketler[0]._k].slice(0, 2), ses.hareketler[0].agirlik], [[9, 10], 15]);
});

// --- 13.5 göstergeleri (örnek ekranlar) ---------------------------------------------------------
const yzKayit = (tarih, gercek = '01:38.0') => ({ id: `h${tarih}`, tarih, savedAt: 1, status: 'sent', endedAt: Date.parse(`${tarih}T08:00:00`),
  seans: { sure: '01:00:00', mesafe: 2000, rpe: 6, msi: '' },
  setler: [{ sira: 1, blok: 'MS', tekrar: 10, mesafe: 100, stil: 'FR', tur: 'Swim', hedef: '00:01:40', dinlen: '00:00:20', tamamlandi: true, gercek, yapilan: 10 }] });

sc('13.5 Form ve denge: B1 bu hafta / son 4 hafta (toplam, yüzme, kara), B9 monotoni, B17 form eğrisi + "kara yalnız yorgunluğa" ayarı, B11 faz hedefine göre bölge dağılımı', async ({ launch }) => {
  const hist = ['2026-08-25', '2026-08-28', '2026-09-01', '2026-09-04', '2026-09-08', '2026-09-11', '2026-09-15', '2026-09-18', '2026-09-21', '2026-09-22'].map((t) => yzKayit(t));
  const s = await launch({ salonSheets: salonV12(), ref: true, storage: { 'ysk.history': hist } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => localStorage.getItem('ysk.salon') && localStorage.getItem('ysk.ref'));
  await p.click('[data-hw="form"]'); await s.waitScreen('form');
  const t = await txt(s, '#fm-body');
  assert.match(t, /BU HAFTA \/ SON 4 HAFTA \(yük oranı\)\s*Toplam\s*[\d,]+×\s*Yüzme\s*[\d,]+×\s*Kara\s*(?:[\d,]+×|—)\s*Bu hafta toplam yük son 4 haftanın ortalamasından/);
  assert.doesNotMatch(t, /risk/i);
  assert.match(t, /YÜKÜN HAFTAYA DAĞILIMI \(son 7 gün\).*Monotoni\s*[\d,]+.*Zorlanma\s*[\d.]+\s*haftalık yük × monotoni/);
  assert.equal(await p.$$eval('.g-mono > div', (e) => e.length), 7);
  assert.match(t, /FORM EĞRİSİ · SON 6 HAFTA.*Kondisyon (↑ yükseliyor|→ dengeli|↓ düşüyor).*Kara yükü yalnız yorgunluğa sayılsın KAPALI/);
  assert.match(t, /BU HAFTA YOĞUNLUK · FAZ HEDEFİ \(Faz 1 varsayılanı\)\s*EN1 · kolay.*hedef 50.*EN3 · eşik.*hedef 12/);
  await p.click('[data-fm="karayorg"]');
  await p.waitForFunction(() => /yorgunluğa sayılsın AÇIK/.test(document.getElementById('fm-body').textContent));
  assert.equal((await s.ls('ysk.prefs')).karaYorgunluk, true);
});

sc('13.5 Ana sayfa ve Bu hafta: B7 hazır olma kişisel ortalamaya göre + 2 neden, B18 uzun kara arası uyarısı, B16 plan / yapılan uyumu ve uyarlama önerisi', async ({ launch }) => {
  const sh = salonV12();
  sh.idman.data = [sh.idman.data[0], [D('2026-09-01'), 1, 'Dumbbell Shoulder Press', 3, 10, 12.5, 128, 7.5, 0, '']];
  const H = {};
  for (let i = 1; i <= 10; i++) H[`2026-09-${String(23 - i).padStart(2, '0')}`] = { uyku: 4, agri: 1, enerji: 4, eklem: 0 };
  H['2026-09-23'] = { uyku: 2, agri: 1, enerji: 4, eklem: 0 };
  const rows = [...samplePlan(), prow('2026-09-22', 1, 'WU', 1, 200, 'Swim', '04:00', '00:20')];
  const s = await launch({ salonSheets: sh, ref: true, rows, storage: { 'ysk.hazir': H } }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => /Hazır olma/.test(document.getElementById('home-week').textContent));
  assert.match(await txt(s, '#home-week'), /Hazır olma %73 \(ortalaman %87\) · Ortalamanın altında: planı hafif tut · Uyku 2 \/ 5 · ortalaman 4/);
  await p.waitForFunction(() => /Son kara idmanı/.test(document.getElementById('home-gym-go').textContent));
  assert.match(await txt(s, '#home-gym-go'), /⚠ Son kara idmanı 22 gün önce\s*2 haftadan uzun ara/);
  await p.click('[data-hw="buhafta"]'); await s.waitScreen('bu-hafta');
  const t = await txt(s, '#bh-body');
  assert.match(t, /PLAN \/ YAPILAN.*Sal\s*Yüzme · yapılmadı.*Çar\s*Yüzme · planlı\s*bekliyor/);
  await p.click('[data-bh="uyarla"]'); await s.waitModal('Uyarlama önerisi');
  assert.match(await txt(s, '#modal-body'), /22 Eylül.*gününe al.*Uygulama tabloya yazmaz/);
});

sc('13.6 F7 çevrimdışı açılış: service worker uygulama dosyalarını önbelleğe alır; internet yokken sayfa yeniden yüklenince ana sayfa açılır', async ({ launch }) => {
  const s = await launch({ sw: true }); const p = s.page;
  await s.waitScreen('home');
  await p.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await p.waitForFunction(async () => {
    const k = (await caches.keys()).find((x) => x.startsWith('idmansk-'));
    return k && (await (await caches.open(k)).keys()).length >= 40;
  }, null, { timeout: 15000 });
  const ad = await p.evaluate(async () => (await caches.keys()).filter((x) => x.startsWith('idmansk-')));
  assert.deepEqual(ad, [`idmansk-${await p.evaluate(() => document.getElementById('app-version').textContent.replace('Sürüm ', ''))}`]);
  await s.ctx.setOffline(true);
  await p.reload();
  await s.waitScreen('home');
  assert.match(await txt(s, '#home-week'), /BU HAFTA YÜK|Bugün/);
  await s.ctx.setOffline(false);
});

sc('13.6 Görünüm: Ayarlar → tema (koyu / açık / sistem) ve yazı boyutu; tercih telefonda kalır, yeniden açılışta uygulanır; tutarlı simgeler', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  await s.waitScreen('home');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await p.$$eval('.icon-btn', (e) => e.filter((x) => x.textContent.trim() === '‹').length), 0, 'geri okları SVG');
  await p.click('#home-settings'); await s.waitScreen('setup');
  await p.click('#pref-tema [data-v="acik"]');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light');
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(243, 245, 248)');
  await p.click('#pref-yazi [data-v="1.12"]');
  assert.equal(await p.evaluate(() => document.documentElement.style.zoom), '1.12');
  assert.deepEqual((await s.ls('ysk.prefs')), { ...(await s.ls('ysk.prefs')), tema: 'acik', yazi: 1.12 });
  await p.reload(); await s.waitScreen('home');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light');
  await p.click('#home-settings'); await s.waitScreen('setup');
  assert.equal(await p.getAttribute('#pref-tema [data-v="acik"]', 'class'), 'is-on');
  await p.click('#pref-tema [data-v="koyu"]'); await p.click('#pref-yazi [data-v="1"]');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await p.evaluate(() => document.documentElement.style.zoom), '');
  assert.equal((await s.ls('ysk.prefs')).tema, null);
});

sc('13.9 Tekrarı iptal: yüzerken sol düğme İptal; onayla tekrar silinir (ilk tekrarda idman saati de), vazgeçince sürer; odak düzeni', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  assert.ok(!(await p.$eval('#wheel', (e) => e.classList.contains('is-focus'))), 'başlamadan odak yok');
  await s.press(); await s.adv(10);
  assert.ok(await p.$eval('#wheel', (e) => e.classList.contains('is-focus')), 'yüzerken odak');
  assert.strictEqual(await s.text('#btn-undo'), 'İptal');
  await p.click('#btn-undo'); await s.waitModal('1. tekrarı iptal et?');
  assert.ok((await s.text('.modal')).includes('idman saati de sıfırlanır'));
  await s.modalClick('Vazgeç, yüzüyorum');
  assert.deepStrictEqual(await s.events(), ['basla', 'cik0'], 'vazgeç: sürer');
  await p.click('#btn-undo'); await s.waitModal('1. tekrarı iptal et?'); await s.modalClick('Evet, iptal et');
  await p.waitForTimeout(300);
  assert.deepStrictEqual(await s.events(), [], 'ilk tekrar: idman da başlamamış sayılır');
  assert.strictEqual(await s.label(), 'YÜZ');
  assert.ok(await p.$eval('#prog-clock', (e) => e.classList.contains('is-idle')), 'idman saati sıfır');
  assert.ok(!(await p.$eval('#wheel', (e) => e.classList.contains('is-focus'))));
  await s.press(); await s.adv(30); await s.press(); // 1. set (1 tekrar) bitti
  await s.adv(15); await s.press(); await s.adv(40);    // 2. setin 1. tekrarı yanlışlıkla
  await p.click('#btn-undo'); await s.waitModal('1. tekrarı iptal et?');
  assert.ok((await s.text('.modal')).includes('dinlenme saati kaldığı yerden sürer'));
  await s.modalClick('Evet, iptal et'); await p.waitForTimeout(300);
  assert.deepStrictEqual(await s.events(), ['basla', 'cik0', 'geldim']);
  assert.strictEqual(await s.label(), 'YÜZ');
  assert.strictEqual(await s.text('#btn-undo'), 'Mola', 'dinlenmeye döndü');
});

sc('13.9 Yarıda kesilen idman: kalanlar planda kalır; aynı gün ikinci idman uyarı + onayla kaydedilir; yuzmeSeans Tarih saatli', async ({ launch }) => {
  const s = await launch(); const p = s.page;
  await s.openToday();
  await s.tap(60); await s.tap(5); // 1. set (1 × 200) bitti
  await s.finishToOzet();
  assert.ok(!(await p.$eval('#oz-kalan', (e) => e.hidden)));
  assert.match(await s.text('#oz-kalan'), /Yapılmayan 4 set planda kalsın/);
  await p.click('#oz-kalan');
  assert.ok(await p.$eval('#oz-kalan .cb', (e) => e.classList.contains('on')));
  await p.click('#oz-save'); await s.waitScreen('done');
  assert.match(await s.text('#done-text'), /4 set planda kaldı/);
  const bugun = () => s.env.sheets.Plan.data.slice(1).filter((r) => r[0] && r[0].toISOString && r[0].toISOString().slice(0, 10) === '2026-09-23').length;
  assert.strictEqual(bugun(), 4, 'kalan 4 set planda');
  const S = s.env.sheets.seans;
  assert.strictEqual(S.data.length - 1, 1);
  assert.ok(S.data[1][0].getUTCHours() || S.data[1][0].getUTCMinutes(), 'Seans Tarih saatli');
  // 13.12 (bilerek değişti): timestamp saniyeli ve açık 24 saat (HH) biçiminde yazılır
  assert.strictEqual(S.fmt[1][0], 'dd.mm.yyyy HH:mm:ss');
  assert.strictEqual(s.env.sheets.eski.data[1][0].getUTCHours(), 0, 'yuzmeVeri Tarih saatsiz');
  // ikinci parça: kalan setlerden biri yapılır
  await s.adv(5); await s.waitScreen('days');
  await p.waitForFunction(() => (JSON.parse(localStorage.getItem('ysk.dates')) || { dates: [] }).dates.some((d) => d.tarih === '2026-09-23'));
  await p.waitForTimeout(300);
  await p.click('#days-today-btn'); await s.waitScreen('program'); await p.waitForSelector('.w-item.is-active');
  assert.strictEqual(await s.title(), '4 × 50', 'plan kalan setlerle açılır');
  await s.adv(600);
  for (let i = 0; i < 4; i++) { await s.tap(65); await s.tap(15); }
  await s.finishToOzet();
  await p.click('#oz-save');
  await s.waitModal('Bugüne ait idman kaydı var');
  await s.modalClick('Özete dön');
  assert.strictEqual(await s.screen(), 'ozet');
  assert.strictEqual(S.data.length - 1, 1, 'onaysız yazılmaz');
  await p.click('#oz-save');
  await s.waitModal('Bugüne ait idman kaydı var');
  await s.modalClick('Evet, ikinci idman olarak kaydet');
  await s.waitScreen('done');
  assert.strictEqual(S.data.length - 1, 2, 'iki seans satırı');
  assert.strictEqual(s.env.sheets.eski.data.length - 1, 2, 'iki parça toplam 2 set');
  assert.strictEqual(bugun(), 0, 'işaretsiz: kalanlar plandan silinir');
});

const only = process.argv[2];
sc('13.11 Renk: ana sette bölge hapı + 7 kademeli ısı ölçeği; diğer blokta soluk bölge kodu; tekerlekte blok kodu; birincil düğme sarı; yazı boyutu En büyük', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  await s.openToday();
  // WU (200 m, hedef 4:00): ölçek yok, soluk bölge kodu
  // 13.12 (bilerek değişti): başlık = blok karesi + blok adı + bölge rozeti (.w-zb); eski .w-ztag hapı kalktı
  const wu = await p.$eval('.w-item.is-active', (n) => ({ pill: n.querySelector('.w-zb') && n.querySelector('.w-zb').className, meter: !!n.querySelector('.w-meter'), bk: n.querySelector('.w-blk').textContent }));
  assert.ok(wu.pill && /is-plain/.test(wu.pill) && !wu.meter && wu.bk === 'WU', JSON.stringify(wu));
  await s.goTo(2);
  const ms = await p.$eval('.w-item.is-active', (n) => ({ pill: n.querySelector('.w-zb b').textContent, cls: n.querySelector('.w-zb').className, on: [...n.querySelectorAll('.w-meter i')].filter((i) => i.classList.contains('on')).length, all: n.querySelectorAll('.w-meter i').length, bk: n.querySelector('.w-blk').textContent, name: n.querySelector('.w-hn b').textContent }));
  assert.equal(ms.all, 7, JSON.stringify(ms)); assert.equal(ms.on, 1, JSON.stringify(ms));
  assert.match(ms.cls, /\bz\d\b/, JSON.stringify(ms)); assert.equal(ms.bk, 'MS'); assert.equal(ms.name, 'ANA SET');
  assert.equal(ms.pill, await p.$eval('.w-item.is-active .w-meter i.on', (i) => ['REC', 'EN1', 'EN2', 'EN3', 'SP1', 'SP2', 'SP3'][Number(i.className.match(/z(\d)/)[1]) - 1]));
  // ana set kartının rengi bölgeden: tekerlek çizgisi/nokta rengi kartın --c değeri
  const c = await p.$eval('.w-item.is-active', (n) => n.style.getPropertyValue('--c'));
  assert.match(c, /^#[0-9A-F]{6}$/i);
  // birincil eylem sarı
  await s.goTo(0); await p.click('#prog-back'); await s.waitScreen('days');
  assert.equal(await p.$eval('#days-today-btn', (b) => getComputedStyle(b).backgroundColor), 'rgb(255, 210, 63)');
  // yazı boyutu: En büyük (1.4) seçilir, kalıcı
  await p.click('#days-back'); await s.waitScreen('home'); await p.click('#home-settings'); await s.waitScreen('setup');
  await p.click('#pref-yazi [data-v="1.4"]');
  assert.equal(await p.evaluate(() => document.documentElement.style.zoom), '1.4');
  assert.equal((await s.ls('ysk.prefs')).yazi, 1.4);
  await p.click('#pref-yazi [data-v="1"]');
});

sc('13.12 Düzeltme (yüzme): dinlenirken biten tekrar kutusuna dokun → süre ±5 sn, kutu ve özet düzeltilmiş; yüzerken kutular kilitli', async ({ launch }) => {
  const s = await launch({ ref: true }); const p = s.page;
  await s.openToday();
  await s.tap(240); await s.tap(20);           // 1. set bitti, 2. sete geçilir
  await p.waitForTimeout(800);
  await s.tap(65); await s.tap(5);              // 4×50: 1. tekrar yüzüldü (1:05) → dinlenme
  const box = '.w-item.is-active .w-reps [data-rep="0"]';
  assert.equal(await p.$eval(box + ' b', (b) => b.textContent.trim()), '1:05');
  await p.click(box); await s.waitModal('tekrar süreleri');
  await p.click('#modal [data-dz="0:5"]');
  await s.modalClick('Kaydet');
  await p.waitForSelector('#modal', { state: 'hidden' });
  assert.equal(await p.$eval(box + ' b', (b) => b.textContent.trim()), '1:10', 'kutu düzeltilmiş süreyi gösterir');
  assert.match(await p.$eval('.w-item.is-active .w-ri', (e) => e.textContent.replace(/\s+/g, ' ')), /SON TEKRAR1:10/, 'son tekrar bilgisi de düzeltmeyi kullanır');
  const ed = (await s.session()).form.edits;
  assert.deepEqual(Object.values(ed)[0], { 0: 70000 });
  await s.tap(0); await s.adv(5);               // 2. tekrar yüzülüyor: kutular kilitli
  const before = (await s.session()).form.edits;
  await p.click('.w-item.is-active .w-card', { position: { x: 30, y: 12 } }).catch(() => {});
  assert.deepEqual((await s.session()).form.edits, before, 'yüzerken düzeltme açılmaz');
});

sc('13.12 Düzeltme (kara): biten her set kutusu (önceki setler dahil) tekrar ve ağırlığı düzeltir; özete düzeltilmiş gider', async ({ launch }) => {
  const s = await launch({ salonSheets: bugunPlanli(salonV12()), ref: true }); const p = s.page;
  await s.waitScreen('home');
  await p.waitForFunction(() => !document.getElementById('home-gym-go').hidden);
  await gymBasla(s);
  await p.waitForSelector('#sl-wheel .w-item.is-active');
  await setler(s, 2);                            // iki set bitti
  const box1 = '#sl-wheel .w-item.is-active [data-sl-set$=":0"]';
  assert.equal(await p.$eval(box1 + ' b', (b) => b.textContent.trim()), '10');
  await p.click(box1); await s.waitModal('1. set');
  await p.click('#modal [data-sd="r:-1"]'); await p.click('#modal [data-sd="r:-1"]');
  await s.modalClick('Kaydet');
  await p.waitForSelector('#modal', { state: 'hidden' });
  assert.equal(await p.$eval(box1 + ' b', (b) => b.textContent.trim()), '8', '1. set (önceki set) 8 tekrar');
  assert.equal(await p.$eval('#sl-wheel .w-item.is-active [data-sl-set$=":1"] b', (b) => b.textContent.trim()), '10', '2. set aynı kaldı');
  const reps = Object.values((await s.ls('ysk.salonSession')).reps)[0];
  assert.equal(reps[0], 8); assert.ok(reps[1] == null, 'girilmeyen set planlanan tekrar sayılır');
});

sc('13.12 Ortak takvim (Y3): ana sayfanın üstünde hafta şeridi, yüzme/kara noktaları; güne dokun → o günün özeti; ok ile hafta; kartlarda Takvim düğmesi yok', async ({ launch }) => {
  const s = await launch({ salonSheets: bugunPlanli(salonV12()), ref: true }); const p = s.page;
  await s.waitScreen('home'); await p.waitForFunction(() => localStorage.getItem('ysk.salon'));
  await p.waitForFunction(() => /hareket/.test(document.getElementById('hcal-k').textContent));
  assert.equal(await p.$$eval('#hcal-wk .hcal-d', (e) => e.length), 7);
  assert.equal(await p.$eval('#hcal-wk .hcal-d.today', (e) => e.dataset.d), '2026-09-23');
  assert.equal(await p.$eval('#hcal-wk .hcal-d.sel', (e) => e.dataset.d), '2026-09-23', 'varsayılan seçim bugün');
  // bugün: yüzme + kara planlı → iki nokta
  assert.deepEqual(await p.$$eval('#hcal-wk .hcal-d.today .dts i', (e) => e.map((x) => x.className)), ['y plan', 'k plan']);
  assert.match(await txt(s, '#hcal-y'), /\d+ set · [\d.]+ m/);
  assert.match(await txt(s, '#hcal-k'), /2 hareket/);
  assert.equal(await p.$$eval('.home-card .hc-cal, #home-swim.hc-cal', (e) => e.length), 0, 'kartlarda ayrı Takvim düğmesi yok');
  // yarına dokun: yalnız yüzme planı var
  await p.click('#hcal-wk [data-d="2026-09-24"]');
  assert.match(await txt(s, '#hcal-dh'), /^Yarın/);
  assert.match(await txt(s, '#hcal-y'), /1 set · 400 m/);
  assert.equal(await txt(s, '#hcal-k'), 'Plan yok');
  // önceki hafta
  await p.click('#hcal-prev');
  assert.equal(await txt(s, '#hcal-title'), '14 Eylül – 20 Eylül');
  assert.equal(await p.$eval('#hcal-wk .hcal-d:last-child', (e) => e.dataset.d), '2026-09-20');
  await p.click('#hcal-next');
  assert.equal(await txt(s, '#hcal-title'), '21 Eylül – 27 Eylül');
  // yüzme satırı gün listesini açar
  await p.click('#home-swim'); await s.waitScreen('days');
});

sc('13.12 Geçmişle kıyas (Y4): kaynak Drive yuzmeVeri; aynı set = mesafe + stil + tür + alet + bölge (farklı bölge/alet karışmaz, tekrar sayısı fark etmez); trend sütunları', async ({ launch }) => {
  const { ESKI_H, D: Dd } = require('./fakegas.cjs');
  const eskiH = [...ESKI_H, 'Gerçek Zone'];
  const er = (t, tk, m, g, z, alet = '') => [Dd(t), 1, 'MS', tk, m, 'FR', 'Swim', '', '04:04', '01:00', alet, g, '', '', '', '', '', z];
  const eskiRows = [
    er('2026-09-16', 1, 200, '04:06.0', 'EN3'),               // eşleşir
    er('2026-09-09', 1, 200, '03:52.0', 'SP1'),               // farklı bölge (sprint): eşleşmez
    er('2026-09-02', 1, 200, '04:00.0', 'EN3', 'Snorkel'),    // farklı alet: eşleşmez
    er('2026-08-26', 5, 200, '04:08.0', 'EN3'),               // tekrar sayısı farklı ama aynı iş: eşleşir
  ];
  const rows = [prow('2026-09-23', 1, 'MS', 1, 200, 'Swim', '04:04', '01:00')];
  const s = await launch({ rows, eskiH, eskiRows, ref: true }); const p = s.page;
  await p.waitForFunction(() => { const g = JSON.parse(localStorage.getItem('ysk.gecmis') || 'null'); return g && g.sets.length === 4; });
  await s.openToday();
  await s.press(); await s.adv(243); await s.press();
  await s.waitScreen('rpe'); await p.click('#rpe-grid button[data-v="7"]'); await s.waitScreen('msi'); await p.click('#msi-none'); await s.waitScreen('ozet');
  const oz = await p.$eval('.oz-set', (e) => e.innerText.replace(/\s+/g, ' '));
  assert.match(oz, /Geçen \(16 Eylül[^)]*\): ort\. 4:06\.0/, oz);
  assert.match(oz, /↑ 2,7 sn hızlı/, oz);
  assert.ok(!/3:52/.test(oz) && !/Snorkel/.test(oz), 'farklı bölge ve alet karışmaz: ' + oz);
  assert.equal(await p.$$eval('.oz-tr div', (e) => e.length), 3, 'iki benzer geçmiş + bugün');
  assert.match(oz, /200 m · FR Swim · alet yok · EN3 · .*kaynak: Drive \(4 kayıt\)/, oz);
});

if (require.main === module) runScenarios('Sürüm 13 senaryoları', only ? S.filter(([n]) => n.toLowerCase().includes(only.toLowerCase())) : S, 8160);
