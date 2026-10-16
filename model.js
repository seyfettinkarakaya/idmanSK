// Sürüm 13 — yüzme + salon tek model: haftalık planlayıcı, ortak yük hedefi, sağlık bütçeleri, ortak periyot, ölçüm.
// Saf işlevler (DOM yok). Dayanak: kisit.js (Perthes sağ kalça, sağ omuz, sağ diz, MSI, haftada 3 gün, süre bütçeleri).
import { gunEkle, cakisma } from './yuk.js?v=13.7.0';

const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const haftaGunu = (t) => { const [y, m, d] = t.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

/** 4 haftalık ortak döngü (M5): yüzme ve salon aynı fazda. hafta: 0–3 (null: döngü kapalı → "Hacim" gibi davranılır). */
export const FAZLAR = [
  { ad: 'Hacim', yuzme: 'aerobik hacim (EN1–EN2), teknik', salon: 'stabilite + core + omuz önleyici, 3 × 12–15', yukKat: 1 },
  { ad: 'Hacim+', yuzme: 'eşik setleri artar (EN3)', salon: 'çekiş kuvveti (lat, kürek), 3–4 × 10–12', yukKat: 1.08 },
  { ad: 'Kuvvet', yuzme: 'hız ve kalite (SP1), hacim −%10', salon: 'kuvvet 3 × 6–8, dinlenme 2 dk; itişte omuz sınırı', yukKat: 1.12 },
  { ad: 'Dinlenme', yuzme: 'hacim −%40, yoğunluk aynı', salon: 'yalnız önleyici + mobilite', yukKat: 0.6 },
];
export const faz = (hafta) => FAZLAR[hafta == null ? 0 : ((hafta % 4) + 4) % 4];

const pazartesi = (t) => gunEkle(t, -((haftaGunu(t) + 6) % 7));
const adNorm = (s) => String(s || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, '');
const fazKod = (s) => String(s == null ? '' : s).trim().toUpperCase().replace(/^F(AZ)?[\s_-]*/, '');

/**
 * Bu haftanın fazı. Öncelik: faz takvimi (sporRef fazBilgi: { faz, ilk, son, ad, odak }) → içinde döngü
 * (kisit dongu_<faz>, yoksa Hacim · Hacim+ · Kuvvet · Dinlenme) ve yasaklar (kisit yasak_<faz>: SP, Kuvvet);
 * takvim yoksa Form ve denge'de elle başlatılan döngü (blokBas); o da yoksa varsayılan (Hacim).
 * → { kaynak: 'takvim'|'elle'|null, F (FAZLAR satırı, yasaklar uygulanmış), fazKod, fazAd, odak, hafta (fazın kaçıncı haftası, 1…),
 *     i (döngüdeki yeri, 0…), dongu: [ad], yasak: [] }
 */
export function fazDurumu({ bugun, takvim = [], K = {}, blokBas = null }) {
  const pzt = pazartesi(bugun);
  const satir = (takvim || []).find((r) => r && r.ilk && r.ilk <= bugun && (!r.son || bugun <= r.son));
  let kaynak = null, dongu = FAZLAR.map((f) => f.ad), i = 0, hafta = null, kod = '', yasak = [];
  if (satir) {
    kaynak = 'takvim';
    kod = fazKod(satir.faz);
    hafta = Math.floor((Date.parse(pzt) - Date.parse(pazartesi(satir.ilk))) / (7 * 86400000));
    yasak = ((K.fazYasak || {})[kod] || []).map(adNorm);
    const d = (K.dongu || {})[kod];
    if (d && d.length) dongu = d;
    if (yasak.includes('kuvvet')) dongu = dongu.map((x) => (adNorm(x) === 'kuvvet' ? 'Hacim+' : x));
    i = ((hafta % dongu.length) + dongu.length) % dongu.length;
    hafta += 1;
  } else if (blokBas) {
    kaynak = 'elle';
    const h = Math.floor((Date.parse(pzt) - Date.parse(blokBas)) / (7 * 86400000));
    i = ((h % 4) + 4) % 4;
  }
  const base = FAZLAR.find((f) => adNorm(f.ad) === adNorm(dongu[i])) || FAZLAR[0];
  const spYok = yasak.includes('sp');
  const F = spYok && base.ad === 'Kuvvet' ? { ...base, yuzme: 'eşik + aerobik kalite (bu fazda SP yok)' } : { ...base };
  F.spYok = spYok;
  return { kaynak, F, fazKod: kod, fazAd: satir ? satir.ad || `Faz ${kod}` : '', odak: satir ? satir.odak || '' : '', hafta, i, dongu, yasak };
}

/**
 * Haftalık yük hedefi (M3): normal hafta tabanı, artış en çok %10 (aradan dönüşte %20), yük hızlı arttıysa −%20.
 * gecen: geçen haftanın yükü, buHafta: bu hafta yapılan, normal: normal hafta, donus/oran: yuk.oranDurum.
 * → { hedef, kalan, metin }
 */
export function haftaHedefi({ gecen = 0, buHafta = 0, normal, donus = false, oran = null, fazKat = 1 }) {
  let hedef;
  if (oran && oran.durum === 'yuksek') hedef = Math.round(Math.max(gecen * 0.8, normal * 0.5));
  else if (donus) hedef = Math.round(Math.min(normal, Math.max(gecen * 1.2, normal * 0.5)));
  else hedef = Math.round(Math.min(normal * fazKat, Math.max(gecen * 1.1, normal * 0.7)));
  const metin = oran && oran.durum === 'yuksek' ? 'Yük hızlı arttı: bu hafta %20 az' : donus ? 'Aradan dönüş: geçen haftadan en çok %20 fazla' : 'Geçen haftadan en çok %10 fazla';
  return { hedef, kalan: Math.max(0, hedef - buHafta), metin };
}

/**
 * Sağlık bütçeleri (M4) — eklem başına haftalık sınır; ağrı (MSI ≥ 1) varsa sınır %20 daralır.
 * L: yuk.seanslar, salonSatir: [{ tarih, hareket, set }], normal: normal hafta yükü, msiBolge: { 'sag omuz': maxSon14, … }
 * → [{ ad, deger, sinir, birim, pay, durum: 'iyi'|'sinirda'|'asti', not }]
 */
export function saglikButceleri({ L = [], salonSatir = [], bugun, K, normal, msiBolge = {}, brAy = 0 }) {
  const bas7 = gunEkle(bugun, -6);
  const son7 = L.filter((s) => s.tarih >= bas7 && s.tarih <= bugun);
  const omuzAgri = Math.max(msiBolge['sag omuz'] || 0, msiBolge['sol omuz'] || 0) >= (K.msi.hafiflet || 1);
  const dizAgri = Math.max(msiBolge['sag diz'] || 0, msiBolge['sol diz'] || 0) >= (K.msi.hafiflet || 1);
  const kalcaAgri = (msiBolge.kalca || 0) >= (K.msi.hafiflet || 1);
  const omuz = Math.round(son7.reduce((a, s) => a + ((s.kas && s.kas.Omuz) || 0), 0));
  const omuzSinir = Math.round(normal * 0.35 * (omuzAgri ? 0.8 : 1));
  const dizSet = salonSatir.filter((r) => r.tarih >= bas7 && r.tarih <= bugun && /squat|lunge|step|split|leg extension|bulgarian/i.test(r.hareket)).reduce((a, r) => a + (Number(r.set) || 0), 0);
  const dizSinir = dizAgri ? 6 : 9;
  const brSinir = K.brAyMax * (kalcaAgri || dizAgri ? 0.5 : 1);
  const d = (deger, sinir) => (deger > sinir ? 'asti' : deger >= sinir * 0.8 ? 'sinirda' : 'iyi');
  return [
    { ad: 'Omuz', deger: omuz, sinir: omuzSinir, birim: 'yük', durum: d(omuz, omuzSinir), not: `Serbest/kelebek/pull + itiş setleri (son 7 gün)${omuzAgri ? ' · ağrı var: sınır %20 dar' : ''}` },
    { ad: 'Kalça', deger: brAy, sinir: brSinir, birim: '% BR', durum: d(brAy, brSinir), not: `Kurbağalama bu ay (Perthes)${kalcaAgri || dizAgri ? ' · ağrı var: sınır yarıya indi' : ''}` },
    { ad: 'Diz', deger: dizSet, sinir: dizSinir, birim: 'set', durum: d(dizSet, dizSinir), not: `Diz bükümlü kara setleri, ≤ 90° (son 7 gün)${dizAgri ? ' · ağrı var' : ''}` },
  ].map((b) => ({ ...b, pay: b.sinir ? Math.round((b.deger / b.sinir) * 100) : 0 }));
}

/**
 * Tek hafta planlayıcı (M1, M2, M7). Haftada K.gunHafta gün: Cuma akşam yüzme (sınırsız), diğerleri Sal/Çar/Per'den.
 * Yapılan ve planlı (tablodaki program) günler önce gelir; kalan yuvalara öneri. Salon, yüzmeye komşu olmayan
 * güne konur (omuz girişimi); olmuyorsa uyarı. Hazır olma "dinlen" ise bugünün önerisi sonraki boş yuvaya kayar.
 * → [{ tarih, gun, durum: 'yapildi'|'planli'|'oneri'|'bos', isler: [{ tur: 'yuzme'|'salon', ad, sure, yan, kaynak }], uyarilar: [] }]
 */
export function haftaPlani({ bugun, bas, K, L = [], yuzmePlan = [], salonPlan = [], hazirKarar = null, fazNo = null, hafiflet = false, F: Fp = null, planDk = {} }) {
  const F = Fp || faz(fazNo);
  const ayri = K.gunHaftaSalon != null; // yüzme ve salon günleri ayrı sayılır
  const gunler = Array.from({ length: 7 }, (_, i) => {
    const t = gunEkle(bas, i);
    const yap = L.filter((s) => s.tarih === t);
    const isler = yap.map((s) => ({ tur: s.tur, ad: s.tur === 'yuzme' ? `Yüzme ${s.metre ? `${s.metre} m` : ''}`.trim() : `Kara ${s.set || ''} set`.trim(), sure: s.dk, kaynak: 'yapildi' }));
    if (!yap.some((s) => s.tur === 'yuzme') && yuzmePlan.includes(t)) isler.push({ tur: 'yuzme', ad: 'Yüzme programı', sure: planDk[t] || 0, kaynak: 'program', yan: 'her aerobik blok sonunda omuz rahatlatma' });
    if (!yap.some((s) => s.tur === 'salon') && salonPlan.includes(t)) isler.push({ tur: 'salon', ad: 'Kara programı', kaynak: 'program', yan: 'önce önleyici ısınma' });
    return { tarih: t, gun: GUN[haftaGunu(t)], durum: yap.length ? 'yapildi' : isler.length ? 'planli' : 'bos', isler, uyarilar: [] };
  });
  const dolu = () => gunler.filter((g) => g.isler.length).length;
  const turVar = (tur) => gunler.some((g) => g.isler.some((x) => x.tur === tur));
  const butce = (t) => (haftaGunu(t) === 5 ? { sure: 0, yazi: 'akşam · sınırsız' } : { sure: K.sure.sabah || 80, yazi: `sabah ${K.sure.sabah || 80} / öğle ${K.sure.ogle || 65} dk` });
  // Bugün dinlen kararı: bugün öneri verme
  const bugunKapali = hazirKarar === 'dinlen' || hazirKarar === 'tibbi';
  const bos = (g) => !g.isler.length && g.tarih >= bugun && !(bugunKapali && g.tarih === bugun);
  const cuma = gunler.find((g) => haftaGunu(g.tarih) === 5);
  const yuzmeVar = (g) => g && g.isler.some((x) => x.tur === 'yuzme');
  const komsuYuzme = (g) => gunler.some((x) => Math.abs(gunler.indexOf(x) - gunler.indexOf(g)) === 1 && yuzmeVar(x));
  const komsuSalon = (g) => gunler.some((x) => Math.abs(gunler.indexOf(x) - gunler.indexOf(g)) === 1 && x.isler.some((i) => i.tur === 'salon'));
  const ekle = (g, is) => { g.isler.push(is); g.durum = 'oneri'; };
  if (ayri) return ayriPlan();
  if (dolu() < K.gunHafta && cuma && bos(cuma)) {
    ekle(cuma, { tur: 'yuzme', ad: `Yüzme · ${F.ad === 'Kuvvet' && !F.spYok ? 'hız + eşik' : F.ad === 'Dinlenme' ? 'hafif aerobik' : 'eşik + uzun aerobik'}`, sure: 0, butce: butce(cuma.tarih).yazi, kaynak: 'oneri', yan: 'her aerobik blok sonunda omuz rahatlatma' });
  }
  // Sal/Çar/Per yuvaları: önce salon (yüzmeye komşu olmayan gün tercih — omuz girişimi), sonra aerobik yüzme (salona komşu olmayan gün tercih)
  const aday = () => gunler.filter((g) => [2, 3, 4].includes(haftaGunu(g.tarih)) && bos(g));
  if (dolu() < K.gunHafta && !turVar('salon')) {
    const ad = aday();
    const g = ad.find((x) => !komsuYuzme(x)) || ad[0];
    if (g) ekle(g, { tur: 'salon', ad: `Kara · ${F.salon}`, sure: butce(g.tarih).sure, butce: butce(g.tarih).yazi, kaynak: 'oneri', yan: 'önleyici + core 15–20 dk' });
  }
  while (dolu() < K.gunHafta) {
    const ad = aday();
    const g = ad.find((x) => !komsuSalon(x)) || ad[0];
    if (!g) break;
    ekle(g, { tur: 'yuzme', ad: `Yüzme · ${F.yuzme}`, sure: butce(g.tarih).sure, butce: butce(g.tarih).yazi, kaynak: 'oneri', yan: 'her aerobik blok sonunda omuz rahatlatma' });
  }
  return bitir();

  /** Yüzme ve salon ayrı sayılırken: K.gunHafta yüzme günü (Cuma + Sal/Per/Çar), K.gunHaftaSalon salon günü (yüzme olmayan, yüzmeye komşu olmayan gün tercih). */
  function ayriPlan() {
    const say = (tur) => gunler.filter((g) => g.isler.some((x) => x.tur === tur)).length;
    const yIs = (g, ad) => ({ tur: 'yuzme', ad, sure: butce(g.tarih).sure, butce: butce(g.tarih).yazi, kaynak: 'oneri', yan: 'her aerobik blok sonunda omuz rahatlatma' });
    if (say('yuzme') < K.gunHafta && cuma && bos(cuma)) ekle(cuma, yIs(cuma, `Yüzme · ${F.ad === 'Kuvvet' && !F.spYok ? 'hız + eşik' : F.ad === 'Dinlenme' ? 'hafif aerobik' : 'eşik + uzun aerobik'}`));
    for (const gn of [2, 4, 3]) {
      if (say('yuzme') >= K.gunHafta) break;
      const g = gunler.find((x) => haftaGunu(x.tarih) === gn && bos(x));
      if (g) ekle(g, yIs(g, `Yüzme · ${F.yuzme}`));
    }
    while (say('salon') < K.gunHaftaSalon) {
      const ad = gunler.filter((g) => bos(g));
      const g = ad.find((x) => !komsuYuzme(x)) || ad[0];
      if (!g) break;
      ekle(g, { tur: 'salon', ad: `Kara · ${F.salon}`, sure: K.salonDk || 50, butce: `~${K.salonDk || 50} dk`, kaynak: 'oneri', yan: 'önleyici + core 15–20 dk' });
    }
    return bitir();
  }

  function bitir() {
  // Hafifletme (yük hızlı arttı / dinlenme haftası / bugün hafif)
  for (const g of gunler) {
    for (const x of g.isler) {
      if (x.kaynak === 'yapildi') continue;
      if (hafiflet) x.hafif = 'yük yüksek: %20 hafif';
      else if (g.tarih === bugun && hazirKarar === 'hafif') x.hafif = 'hazır olma: %20 hafif';
    }
    const sb = haftaGunu(g.tarih) === 5 ? 0 : K.sure.sabah || 80;
    for (const x of g.isler) if (x.kaynak === 'program' && x.tur === 'yuzme' && sb && x.sure > sb) g.uyarilar.push(`Program ~${x.sure} dk (son idmanlara göre): ${sb} dk bütçeyi aşıyor`);
    if (g.tarih === bugun && bugunKapali && !g.isler.some((x) => x.kaynak === 'yapildi')) g.uyarilar.push(hazirKarar === 'tibbi' ? 'Bugün idman yok: tıbbi değerlendirme' : 'Bugün dinlen (hazır olma); öneri sonraki güne kaydı');
  }
  // Girişim uyarıları (M2): salon günü ile ±1 gün uzun/eşik yüzme
  const yapilanL = L;
  for (const g of gunler) {
    const salon = g.isler.find((x) => x.tur === 'salon' && x.kaynak !== 'yapildi');
    if (!salon) continue;
    const plan = gunler.filter((x) => x.isler.some((i) => i.tur === 'yuzme' && i.kaynak !== 'yapildi')).map((x) => ({ tarih: x.tarih, metre: 2000 }));
    const c = cakisma(yapilanL, g.tarih, plan, salon.kaynak === 'oneri' && (F.ad === 'Hacim+' || F.ad === 'Kuvvet'));
    if (c) g.uyarilar.push(c.metin);
  }
  return gunler;
  }
}

/** Ölçüm zamanı (M10): son CSS testinden 28 gün geçtiyse ve döngü sonu ise test önerisi. */
export function olcumZamani({ bugun, sonCssTarih = null, fazNo = null }) {
  const out = [];
  const gun = sonCssTarih ? Math.round((Date.parse(bugun) - Date.parse(sonCssTarih)) / 86400000) : null;
  if (gun == null || gun >= 28) out.push(`CSS testi (400 + 200)${gun == null ? '' : `: son test ${gun} gün önce`}`);
  if (fazNo != null && ((fazNo % 4) + 4) % 4 === 3) out.push('Dinlenme haftası: kara idmanında tahmini 1RM ve ağrı (MSI) eğilimini gözden geçir');
  return out;
}

/**
 * Yüzmede gerçekleşen / planlanan süre oranı (son 5 seans, ortanca; 0,8–1,6): geçişler, molalar, omuz rahatlatma
 * plandaki tekrar × (hedef + dinlen)'e girmez. hist: telefondaki geçmiş kayıtları. Kayıt yoksa null.
 */
export function yuzmeSureOrani(hist = []) {
  const sn = (v) => { const m = /^(?:(\d+):)?(\d+):(\d{2})(?:[.,]\d+)?$/.exec(String(v || '').trim()); return m ? (Number(m[1]) || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0; };
  const o = (hist || []).filter((r) => r && r.tur !== 'salon' && r.seans && Array.isArray(r.setler))
    .sort((a, b) => (a.tarih < b.tarih ? 1 : -1)).slice(0, 5)
    .map((r) => {
      const plan = r.setler.filter((x) => x.tamamlandi).reduce((a, x) => a + (Number(x.yapilan) || Number(x.tekrar) || 1) * (sn(x.hedef) + sn(x.dinlen)), 0);
      const ger = sn(r.seans.sure);
      return plan > 0 && ger > 0 ? ger / plan : null;
    }).filter((v) => v).sort((a, b) => a - b);
  if (!o.length) return null;
  const m = o.length % 2 ? o[o.length >> 1] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2;
  return Math.max(0.8, Math.min(1.6, m));
}
