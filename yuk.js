// Antrenman yükü ve toparlanma: saf işlevler (DOM yok).
// Seans yükü = RPE × dakika (Foster sRPE). Yüzme ve salon aynı ölçekte.
// Kaynaklar: telefondaki geçmiş (ysk.history: yüzme + salon kayıtları) ve SalonTakip "idman" geçmişi.
import { grupKey, haritaGruplari } from './grup.js?v=13.12.0';

/** "01:18:20", "18:20", "4:10" → saniye; geçersizse 0. */
export function sureSn(s) {
  const p = String(s == null ? '' : s).trim().split(':').map(Number);
  if (!p.length || p.some((x) => !Number.isFinite(x))) return 0;
  return p.reduce((a, x) => a * 60 + x, 0);
}

/** Yüzme kas katsayıları (stil → grup → pay); sporRef yuzmeKas sayfası bunların yerine geçer. Tahmindir. */
export const YUZME_KAS = {
  FR: { Omuz: 0.3, Sırt: 0.25, Triseps: 0.1, Karın: 0.15, Bacak: 0.1, Göğüs: 0.1 },
  BK: { Omuz: 0.25, Sırt: 0.25, Karın: 0.2, Bacak: 0.15, Kalça: 0.15 },
  BF: { Omuz: 0.3, Göğüs: 0.2, Sırt: 0.2, Karın: 0.2, Bacak: 0.1 },
  BR: { Bacak: 0.3, 'Kalça yanı': 0.2, Göğüs: 0.2, Omuz: 0.15, Karın: 0.15 },
  KICK: { Bacak: 0.6, Kalça: 0.2, Karın: 0.2 },
  PULL: { Omuz: 0.35, Sırt: 0.3, Triseps: 0.15, Göğüs: 0.1, Karın: 0.1 },
};

/** sporRef yuzmeKas satırları → katsayı tablosu (yoksa YUZME_KAS). */
export function yuzmeKatsayi(ref) {
  const rows = ref && Array.isArray(ref.yuzmeKas) ? ref.yuzmeKas : [];
  if (!rows.length) return YUZME_KAS;
  const out = JSON.parse(JSON.stringify(YUZME_KAS));
  const seen = new Set();
  for (const r of rows) {
    const s = String(r.stil || '').toUpperCase();
    if (!seen.has(s)) { out[s] = {}; seen.add(s); }
    out[s][grupKey(r.grup)] = Number(r.katsayi) || 0;
  }
  return out;
}

const STIL = { FR: 'FR', FREE: 'FR', SERBEST: 'FR', BK: 'BK', BACK: 'BK', SIRT: 'BK', BF: 'BF', FLY: 'BF', KELEBEK: 'BF', BR: 'BR', BREAST: 'BR', KURBAĞA: 'BR', KURBAGA: 'BR' };
/** Setin stil anahtarı: FR/BK/BF/BR, kick ve pull ayrı; karışık (IM) ve bilinmeyen 'FR'. */
export function setStil(set) {
  const tur = String((set && set.tur) || '').toLocaleLowerCase('tr');
  const alet = String((set && set.alet) || '').toLocaleLowerCase('tr');
  if (/kick|ayak|tekme/.test(tur)) return 'KICK';
  if (/pull|çekiş/.test(tur) || /pull|şamandıra|samandira|pb\b/.test(alet)) return 'PULL';
  return STIL[String((set && set.stil) || '').trim().toLocaleUpperCase('tr')] || 'FR';
}
/** Gerçek kulaç stili (kick/pull da kendi stiliyle sayılır) — kurbağalama payı için. */
export const kulacStili = (set) => STIL[String((set && set.stil) || '').trim().toLocaleUpperCase('tr')] || 'FR';

/** Setin yüzülen metresi (yapılan tekrar × mesafe; bilinmiyorsa tamamlandıysa tekrar × mesafe). */
export function setMetre(set) {
  const m = Number(set && set.mesafe) || 0;
  const n = set && set.yapilan != null ? Number(set.yapilan) || 0 : (set && set.tamamlandi ? Number(set.tekrar) || 1 : 0);
  return m * n;
}

/**
 * Seans listesi (yeniden eskiye değil, tarih sırasız): { tarih, ts, tur, dk, rpe, yuk, metre, stil: {FR: m…}, kas: {grup: yük} }.
 * hist: ysk.history kayıtları; salonGecmis: SalonTakip idman satırları; etkiPay(ad) → { tabloGrubu: pay }.
 * Aynı gün salon hem telefonda hem tabloda varsa tablodaki kullanılır.
 */
export function seanslar({ hist = [], salonGecmis = [], salonSeans = [], etkiPay = () => ({}), katsayi = YUZME_KAS } = {}) {
  const out = [];
  for (const r of hist) {
    if (!r || r.tur === 'salon') continue;
    const dk = (sureSn(r.seans && r.seans.sure) || (r.endedAt && r.startedAt ? (r.endedAt - r.startedAt) / 1000 : 0)) / 60;
    const rpe = r.seans && r.seans.rpe !== '' && r.seans.rpe != null ? Number(r.seans.rpe) : null;
    const stil = {};
    const kas = {};
    let metre = 0;
    for (const s of r.setler || []) {
      const m = setMetre(s);
      if (!m) continue;
      metre += m;
      const ks = kulacStili(s);
      stil[ks] = (stil[ks] || 0) + m;
    }
    const yuk = Math.round(dk * (rpe == null ? 5 : rpe));
    for (const s of r.setler || []) {
      const m = setMetre(s);
      if (!m || !metre) continue;
      const k = katsayi[setStil(s)] || katsayi.FR;
      const sum = Object.values(k).reduce((a, b) => a + b, 0) || 1;
      for (const [g, p] of Object.entries(k)) kas[g] = (kas[g] || 0) + yuk * (m / metre) * (p / sum);
    }
    out.push({ tarih: r.tarih, ts: r.endedAt || r.savedAt || 0, tur: 'yuzme', dk: Math.round(dk), rpe, rpeTahmini: rpe == null, yuk, metre, stil, kas, msi: (r.seans && r.seans.msi) || '' });
  }
  // Salon: tablodaki geçmiş günlere göre; telefonda olup tabloda olmayan günler telefondan.
  const byDate = {};
  for (const g of salonGecmis || []) (byDate[g.tarih] = byDate[g.tarih] || []).push({ hareket: g.hareket, set: g.set, tekrar: g.tekrar, rpe: g.rpe, sure: g.sure, msi: g.msi });
  // 13.4: seans özeti (karaSeans; yoksa telefondaki kayıt): gerçek süre ve idmanın geneli için RPE
  const ozet = {};
  for (const r of hist) if (r && r.tur === 'salon' && r.seans) ozet[r.tarih] = r.seans;
  for (const k of salonSeans || []) if (k && k.tarih) ozet[k.tarih] = k;
  for (const r of hist) {
    if (!r || r.tur !== 'salon' || byDate[r.tarih]) continue;
    byDate[r.tarih] = (r.hareketler || []).map((x) => ({ hareket: x.hareket, set: x.set, tekrar: x.tekrar, rpe: x.rpe === '' ? null : x.rpe, sure: x.sure, msi: x.msi === '' ? null : x.msi, _ts: r.endedAt }));
  }
  for (const [tarih, rows] of Object.entries(byDate)) {
    let sn = 0;
    const rpes = [];
    const kas = {};
    for (const x of rows) {
      const s = sureSn(x.sure);
      sn += s || (Number(x.set) || 1) * ((Number(x.tekrar) || 10) * 3 + 60);
      if (x.rpe != null && x.rpe !== '' && Number.isFinite(Number(x.rpe))) rpes.push(Number(x.rpe));
    }
    const oz = ozet[tarih];
    const ozSn = oz ? sureSn(oz.sure) : 0;
    const ozRpe = oz && oz.rpe !== '' && oz.rpe != null && Number.isFinite(Number(oz.rpe)) ? Number(oz.rpe) : null;
    const dk = (ozSn || sn) / 60;
    const rpe = ozRpe != null ? ozRpe : rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
    const yuk = Math.round(dk * (rpe == null ? 6 : rpe));
    const setTop = rows.reduce((a, x) => a + (Number(x.set) || 1), 0) || 1;
    for (const x of rows) {
      const pay = etkiPay(x.hareket);
      for (const [g, p] of Object.entries(pay)) {
        const hs = haritaGruplari(g);
        for (const h of hs) kas[h] = (kas[h] || 0) + yuk * ((Number(x.set) || 1) / setTop) * p / hs.length;
      }
    }
    out.push({ tarih, ts: (rows[0] && rows[0]._ts) || 0, tur: 'salon', dk: Math.round(dk), rpe: rpe == null ? null : Math.round(rpe * 10) / 10, rpeTahmini: rpe == null, yuk, set: setTop, kas, msiMax: Math.max(0, ...rows.map((x) => Number(x.msi) || 0)) });
  }
  return out.sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : a.ts - b.ts));
}

// --- tarih yardımcıları (YYYY-MM-DD, yerel gün) ---
export const gunEkle = (t, n) => { const [y, m, d] = t.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + n)); return x.toISOString().slice(0, 10); };
const fark = (a, b) => { const p = (t) => { const [y, m, d] = t.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 86400000); };

/** Günlük yük: { 'YYYY-MM-DD': yük } */
export function gunluk(liste) {
  const g = {};
  for (const s of liste) g[s.tarih] = (g[s.tarih] || 0) + s.yuk;
  return g;
}

/**
 * Form eğrisi (TrainingPeaks PMC mantığı): kondisyon = 42 günlük, yorgunluk = 7 günlük üstel ortalama; form = kondisyon − yorgunluk
 * (önceki günün değerleriyle). Son `gun` gün: [{ tarih, yuk, kondisyon, yorgunluk, form }].
 */
export function formEgrisi(g, bugun, gun = 56, gKond = null) { // 13.5 (B17): gKond verilirse kondisyon yalnız ondan (ör. kara yükü yalnız yorgunluğa)
  const dates = Object.keys(g).sort();
  const bas = dates.length ? (dates[0] < gunEkle(bugun, -gun) ? dates[0] : gunEkle(bugun, -gun)) : gunEkle(bugun, -gun);
  let ctl = 0, atl = 0;
  const out = [];
  for (let t = bas; t <= bugun; t = gunEkle(t, 1)) {
    const L = g[t] || 0;
    const form = ctl - atl;
    ctl += ((gKond ? gKond[t] || 0 : L) - ctl) / 42;
    atl += (L - atl) / 7;
    out.push({ tarih: t, yuk: L, kondisyon: Math.round(ctl), yorgunluk: Math.round(atl), form: Math.round(form) });
  }
  return out.slice(-gun - 1);
}

/**
 * Yük artış oranı: son 7 gün / son 28 günün haftalık ortalaması (akut/kronik). Veri azsa null.
 * taban (normal hafta yükü) verilirse payda en az o kadardır: aradan dönüşte iki hafif idman "yüksek" görünmez
 * (kronik yük ~0 iken oran anlamsız büyür; 4 hafta boşluk + 1 hafif hafta = 4).
 */
export function yukOrani(g, bugun, taban = 0) {
  let a = 0, c = 0, ilk = null;
  for (const [t, L] of Object.entries(g)) {
    const d = fark(t, bugun);
    if (d < 0) continue;
    if (d < 7) a += L;
    if (d < 28) c += L;
    if (!ilk || t < ilk) ilk = t;
  }
  if (!ilk || fark(ilk, bugun) < 14 || (!c && !taban)) return null;
  return Math.round((a / Math.max(c / 4, taban)) * 100) / 100;
}

/** Normal hafta yükü (plan): gün × ortalama seans dk × RPE (varsayılan 3 × 65 × 6 = 1170). */
export const normalHafta = (K) => Math.round(((K && K.gunHafta) || 3) * ((K && K.seansDk) || 65) * ((K && K.seansRpe) || 6)
  + (K && K.gunHaftaSalon ? K.gunHaftaSalon * (K.salonDk || 50) * (K.salonRpe || 5) : 0)); // salon ayrıysa onun payı eklenir

/** Son n ISO haftası (eskiden yeniye): [{ bas, yuzme, salon, top, dk, seans }] */
export function haftalar(liste, bugun, n = 8) {
  const [y, m, d] = bugun.split('-').map(Number);
  const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const pzt = gunEkle(bugun, -wd);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const bas = gunEkle(pzt, -7 * i), son = gunEkle(bas, 6);
    const w = liste.filter((s) => s.tarih >= bas && s.tarih <= son);
    const yz = w.filter((s) => s.tur === 'yuzme').reduce((a, s) => a + s.yuk, 0);
    const sl = w.filter((s) => s.tur === 'salon').reduce((a, s) => a + s.yuk, 0);
    out.push({ bas, yuzme: yz, salon: sl, top: yz + sl, dk: w.reduce((a, s) => a + (s.dk || 0), 0), seans: new Set(w.map((s) => s.tarih)).size });
  }
  return out;
}

/** Bu haftanın yükü normal haftaya göre: { pay (%), durum: 'az'|'normal'|'yuksek', metin } */
export function haftaDurumu(top, normal) {
  const pay = normal ? Math.round((top / normal) * 100) : 0;
  if (pay > 130) return { pay, durum: 'yuksek', metin: 'Normal haftanın üstünde' };
  if (pay >= 70) return { pay, durum: 'normal', metin: 'Normal hafta' };
  return { pay, durum: 'az', metin: 'Normalin altında' };
}

/** Oranın yorumu: { durum: 'dusuk'|'guvenli'|'sinirda'|'yuksek', metin } */
export function oranDurum(r, { donus = false } = {}) {
  if (r == null) return { durum: 'bilinmiyor', metin: 'En az 2 haftalık kayıt gerekli' };
  if (donus && r <= 1.3) return { durum: 'donus', metin: 'Aradan dönüş: yükü haftada en çok %20 artır' };
  if (r > 1.5) return { durum: 'yuksek', metin: 'Yük hızlı arttı: dinlenme haftası önerilir' };
  if (r > 1.3) return { durum: 'sinirda', metin: 'Sınırda (güvenli 0,8–1,3)' };
  if (r < 0.8) return { durum: 'dusuk', metin: 'Yük azaldı (dinlenme ya da ara)' };
  return { durum: 'guvenli', metin: 'Güvenli aralık (0,8–1,3)' };
}

/**
 * Kas toparlanması (tahmin): her seansın grup yükü 36 saat yarı ömürle söner; 400 yük = tam yorgun.
 * { grup: { toparlanma: 0–100, yuzme: pay, salon: pay } } — son 4 gün.
 */
export function toparlanma(liste, simdi = Date.now()) {
  const out = {};
  for (const s of liste) {
    const ts = s.ts || Date.parse(`${s.tarih}T18:00:00`);
    const h = (simdi - ts) / 3600000;
    if (h < 0 || h > 96) continue;
    const k = Math.pow(0.5, h / 36);
    for (const [g, v] of Object.entries(s.kas || {})) {
      const o = (out[g] = out[g] || { yorgunluk: 0, yuzme: 0, salon: 0 });
      o.yorgunluk += (v * k) / 400;
      o[s.tur] += v * k;
    }
  }
  for (const o of Object.values(out)) {
    const t = o.yuzme + o.salon || 1;
    o.toparlanma = Math.max(0, Math.round(100 * (1 - Math.min(1, o.yorgunluk))));
    o.yuzmePay = Math.round((o.yuzme / t) * 100);
    o.salonPay = 100 - o.yuzmePay;
  }
  return out;
}

/** Bir ayın (YYYY-MM) stil metreleri ve kurbağalama payı (%). */
export function stilAy(liste, ay) {
  const st = {};
  let top = 0;
  for (const s of liste) {
    if (s.tur !== 'yuzme' || !String(s.tarih).startsWith(ay)) continue;
    for (const [k, m] of Object.entries(s.stil || {})) { st[k] = (st[k] || 0) + m; top += m; }
  }
  return { stil: st, toplam: top, brOran: top ? Math.round(((st.BR || 0) / top) * 1000) / 10 : 0 };
}

/** ISO haftası (Pazartesi başlangıç) içindeki antrenman günleri (farklı tarih sayısı). */
export function haftaGunleri(liste, bugun, tur = null) {
  const [y, m, d] = bugun.split('-').map(Number);
  const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const pzt = gunEkle(bugun, -wd);
  const paz = gunEkle(pzt, 6);
  return new Set(liste.filter((s) => s.tarih >= pzt && s.tarih <= paz && (!tur || s.tur === tur)).map((s) => s.tarih)).size;
}

/**
 * Aynı gün / art arda çakışma (B5): ağır omuz salonu (omuz payı ≥ %30) ile uzun serbest/kürek yüzme (FR ≥ 1500 m)
 * tarihin bir gün öncesi–sonrası içinde. planli: [{ tarih, metre }] (programdaki yüzmeler); omuzPlan: bugünkü salon planı omuz ağırlıklı.
 * → { metin } ya da null
 */
export function cakisma(liste, tarih, planli = [], omuzPlan = false) {
  const gunler = [gunEkle(tarih, -1), tarih, gunEkle(tarih, 1)];
  const omuz = (t) => (t === tarih && omuzPlan) || liste.some((s) => s.tur === 'salon' && s.tarih === t && s.yuk > 0 && ((s.kas && s.kas.Omuz) || 0) >= 0.3 * s.yuk);
  const uzun = (t) => liste.some((s) => s.tur === 'yuzme' && s.tarih === t && ((s.stil && s.stil.FR) || 0) >= 1500) || planli.some((p) => p.tarih === t && p.metre >= 1500);
  const ad = (t) => (t === tarih ? 'bugün' : t < tarih ? 'dün' : 'yarın');
  for (const a of gunler) {
    if (!omuz(a)) continue;
    for (const b of gunler) {
      if ((a !== tarih && b !== tarih) || Math.abs(fark(a, b)) > 1 || !uzun(b)) continue;
      const ayni = a === b;
      return { metin: `Ağır omuz kara idmanı (${ad(a)}) ${ayni ? 've' : 'ile'} uzun yüzme (${ad(b)}) ${ayni ? 'aynı gün' : 'art arda'}: omuz yükü birikir — kara idmanında omuzu hafiflet ya da günleri ayır` };
    }
  }
  return null;
}
