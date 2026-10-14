// Sürüm 13.5 göstergeleri (örnek ekranlar B1, B5, B7, B9, B10, B11, B16, B17, B18). Saf işlevler (DOM yok).

const gunNo = (t) => { const [y, m, d] = t.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
const fark = (a, b) => Math.round(gunNo(b) - gunNo(a));
const gunEkle = (t, n) => new Date((gunNo(t) + n) * 86400000).toISOString().slice(0, 10);
const yuvarla = (v, k = 100) => Math.round(v * k) / k;

// --- B1: bu hafta / son 4 hafta ------------------------------------------------------------

/** Oranın rengi: < 0,8 az · ≤ sarı yeşil · ≤ turuncu sarı · üstü turuncu. */
export function oranRengi(v, { sari = 1.3, turuncu = 1.5 } = {}) {
  if (v == null) return 'yok';
  if (v > turuncu) return 'turuncu';
  if (v > sari) return 'sari';
  if (v < 0.8) return 'az';
  return 'yesil';
}

/**
 * Son 7 gün (bugün dahil) / ondan önceki 28 günün haftalık ortalaması (son 7 gün paydada yok).
 * L: yuk.seanslar çıktısı. Toplam, yüzme, kara ayrı. Veri 14 günden azsa ya da payda 0 ise oran null.
 */
export function oranlar(L, bugun, esik) {
  const hesap = (tur) => {
    let a = 0, c = 0, ilk = null;
    for (const s of L || []) {
      if (tur && s.tur !== tur) continue;
      const d = fark(s.tarih, bugun);
      if (d < 0) continue;
      if (d < 7) a += s.yuk || 0; else if (d < 35) c += s.yuk || 0;
      if (!ilk || s.tarih < ilk) ilk = s.tarih;
    }
    const oran = !ilk || fark(ilk, bugun) < 14 || !c ? null : yuvarla(a / (c / 4));
    return { oran, renk: oranRengi(oran, esik), buHafta: Math.round(a), ort: Math.round(c / 4) };
  };
  const top = hesap(null), yuzme = hesap('yuzme'), kara = hesap('salon');
  let metin = 'Değerlendirme için en az 2 haftalık kayıt gerekli.';
  if (top.oran != null) {
    const p = Math.round((top.oran - 1) * 100);
    metin = p === 0 ? 'Bu hafta toplam yük son 4 haftanın ortalamasıyla aynı.' : `Bu hafta toplam yük son 4 haftanın ortalamasından %${Math.abs(p)} ${p > 0 ? 'fazla' : 'az'}.`;
    const ek = [['Yüzme', yuzme], ['Kara idmanı', kara]].filter(([, o]) => o.oran != null && Math.abs(o.oran - 1) >= 0.3)
      .map(([ad, o]) => `${ad} %${Math.abs(Math.round((o.oran - 1) * 100))} ${o.oran > 1 ? 'arttı' : 'azaldı'}.`);
    if (ek.length) metin += ` ${ek.join(' ')}`;
  }
  return { top, yuzme, kara, metin };
}

// --- B9: monotoni ve zorlanma (Foster) ----------------------------------------------------------

/** Son 7 günün günlük yükü: ortalama / standart sapma = monotoni; haftalık yük × monotoni = zorlanma. */
export function monotoni(g, bugun) {
  const gunler = [];
  for (let i = 6; i >= 0; i--) { const t = gunEkle(bugun, -i); gunler.push({ tarih: t, yuk: Math.round((g && g[t]) || 0) }); }
  const v = gunler.map((x) => x.yuk);
  const top = v.reduce((a, b) => a + b, 0);
  const ort = top / 7;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - ort) ** 2, 0) / 7);
  const mono = top && sd ? yuvarla(ort / sd, 10) : null;
  return { gunler, toplam: top, monotoni: mono, zorlanma: mono == null ? null : Math.round(top * mono), yuksek: mono != null && mono > 2 };
}

// --- B17: form eğrisi trendi ---------------------------------------------------------------

/** Son `gun` günde kondisyon ve yorgunluğun yönü (±%5 eşik): 'yukseliyor' | 'dusuyor' | 'dengeli'. */
export function trend(egri, gun = 14) {
  const yon = (k) => {
    if (!egri || egri.length <= gun) return null;
    const a = egri[egri.length - 1 - gun][k], b = egri[egri.length - 1][k];
    const p = (b - a) / Math.max(Math.abs(a), 1);
    return p > 0.05 ? 'yukseliyor' : p < -0.05 ? 'dusuyor' : 'dengeli';
  };
  return { kondisyon: yon('kondisyon'), yorgunluk: yon('yorgunluk') };
}

// --- B18: uzun kara arası --------------------------------------------------------------------

/** Son kara idmanından bu yana `esik` günden fazla geçtiyse { gun, son }; hiç kara yoksa ya da yakınsa null. */
export function karaArasi(L, bugun, esik = 14) {
  const son = (L || []).filter((s) => s.tur === 'salon' && s.tarih <= bugun).reduce((a, s) => (s.tarih > a ? s.tarih : a), '');
  if (!son) return null;
  const gun = fark(son, bugun);
  return gun > esik ? { gun, son } : null;
}

// --- B5: faza bağlı kuvvet reçetesi -----------------------------------------------------------

export const RECETE = {
  Hacim: { min: 12, max: 15, rir: '2–3', rirMin: 2, dinlen: 60 },
  'Hacim+': { min: 10, max: 12, rir: '2', rirMin: 2, dinlen: 75 },
  Kuvvet: { min: 6, max: 8, rir: '2', rirMin: 2, dinlen: 120 },
  Dinlenme: { min: 12, max: 15, rir: '4', rirMin: 3, dinlen: 60 },
};

/** Döngü haftasının adına göre reçete (ör. "Hacim+", "Kuvvet"); bilinmiyorsa null. */
export function receteOf(ad) {
  const a = String(ad || '').trim();
  if (RECETE[a]) return { ad: a, ...RECETE[a] };
  const k = Object.keys(RECETE).sort((x, y) => y.length - x.length).find((x) => a.toLocaleLowerCase('tr').startsWith(x.toLocaleLowerCase('tr')));
  return k ? { ad: k, ...RECETE[k] } : null;
}

/**
 * Geçen idmana göre reçete önerisi. son: { tekrar (en iyi set ya da ortalama), rpe } — RIR = 10 − RPE.
 * kgsiz: bant / vücut ağırlığı (kg yerine kademe). → { tip: 'artir' | 'tekrar' | 'aralik', metin }
 */
export function receteOneri(son, R, kgsiz = false) {
  if (!son || !R || !(Number(son.tekrar) > 0)) return null;
  const t = Number(son.tekrar);
  const rir = son.rpe != null && son.rpe !== '' && Number.isFinite(Number(son.rpe)) ? 10 - Number(son.rpe) : null;
  if (t >= R.max && (rir == null || rir >= R.rirMin)) {
    return { tip: 'artir', metin: `aralık doldu: ${kgsiz ? 'bandı bir kademe zorlaştır' : 'ağırlığı artır'}, ${R.min}'den başla` };
  }
  if (t < R.min) return { tip: 'aralik', metin: `aynı ağırlık, önce ${R.min}–${R.max} aralığına çık` };
  return { tip: 'tekrar', metin: rir != null && rir < R.rirMin ? `aynı ağırlık, RIR ${R.rir} kalacak şekilde tekrarı artır` : 'aynı ağırlık, tekrarı artır' };
}

// --- B7: hazır olma kişisel tabana göre ---------------------------------------------------------

/**
 * H: { 'YYYY-MM-DD': { uyku, agri, enerji, eklem } }; skorla(k) → { skor, karar, metin } (hazir.hazirSkor).
 * Son 28 günde (bugün hariç) en az 7 kontrol varsa karar senin ortalamana göre verilir; en etkili 2 neden döner.
 * Eklem kararları (dinlen / tıbbi) skordan bağımsız aynen kalır.
 */
export function hazirKisisel(H, bugun, skorla) {
  const k = H && H[bugun];
  if (!k) return null;
  const temel = skorla(k);
  const gecmis = Object.keys(H).filter((t) => t < bugun && fark(t, bugun) <= 28).map((t) => H[t]);
  if (gecmis.length < 7) return { ...temel, ort: null, nedenler: [] };
  const ortOf = (key, d) => gecmis.reduce((a, x) => a + (Number(x[key]) || d), 0) / gecmis.length;
  const ort = Math.round(gecmis.reduce((a, x) => a + skorla(x).skor, 0) / gecmis.length);
  const n = (v, d) => Number(v) || d;
  // olumsuz sapma (puan): uyku ve enerji düşükse, kas ağrısı yüksekse
  const sap = [
    { ad: 'Uyku', deger: n(k.uyku, 3), ort: ortOf('uyku', 3), kotu: ortOf('uyku', 3) - n(k.uyku, 3) },
    { ad: 'Enerji', deger: n(k.enerji, 3), ort: ortOf('enerji', 3), kotu: ortOf('enerji', 3) - n(k.enerji, 3) },
    { ad: 'Kas ağrısı', deger: n(k.agri, 1), ort: ortOf('agri', 1), kotu: n(k.agri, 1) - ortOf('agri', 1) },
  ].filter((x) => x.kotu >= 1).sort((a, b) => b.kotu - a.kotu);
  const nedenler = [];
  if ((Number(k.eklem) || 0) >= 1) nedenler.push({ ad: 'Eklem', deger: Number(k.eklem), metin: `MSI ${String(k.eklem).replace('.', ',')} · yalnız o eklem kısıtlanır` });
  for (const x of sap) if (nedenler.length < 2) nedenler.push({ ad: x.ad, deger: x.deger, ort: yuvarla(x.ort, 10), metin: `${x.deger} / 5 · ortalaman ${String(yuvarla(x.ort, 10)).replace('.', ',')}` });
  if (temel.karar === 'tibbi' || (temel.karar === 'dinlen' && (Number(k.eklem) || 0) >= 2)) return { ...temel, ort, nedenler }; // eklem kararı aynen
  const d = temel.skor - ort;
  let karar = 'tam', metin = 'Hazırsın: ortalamanın üstünde ya da ona yakın, plan aynen';
  if (d <= -25) { karar = 'dinlen'; metin = 'Ortalamanın çok altında: dinlen ya da hafif yüzme (REC/EN1)'; }
  else if (d <= -10) { karar = 'hafif'; metin = 'Ortalamanın altında: planı hafif tut'; }
  if (karar === 'tam' && temel.karar === 'hafif' && (Number(k.eklem) || 0) >= 1) { karar = 'hafif'; metin = temel.metin; }
  return { skor: temel.skor, karar, metin, ort, nedenler };
}

// --- B10: CSS tabanlı yüzme stres puanı ve RPE kayması ---------------------------------------------

/**
 * Tekrar süresinden stres (TrainingPeaks sTSS benzeri): her tekrar için yoğunluk = CSS temposu / tekrar temposu,
 * puan = süre (sa) × yoğunluk³ × 100; dinlenme sayılmaz. setler: [{ ad, mesafe, reps: [ms] }], css: sn / 100 m.
 */
export function stresPuani(setler, css) {
  if (!(css > 0)) return null;
  let top = 0;
  const satirlar = [];
  for (const s of setler || []) {
    const m = Number(s.mesafe) || 0;
    let p = 0, sure = 0;
    for (const ms of s.reps || []) {
      if (!(ms > 0) || !m) continue;
      const tempo = (ms / 1000) / (m / 100);
      const yo = css / tempo;
      p += (ms / 3600000) * yo ** 3 * 100;
      sure += ms;
    }
    if (!sure) continue;
    const ortTempo = (sure / 1000) / ((m * s.reps.filter((x) => x > 0).length) / 100);
    satirlar.push({ ad: s.ad, puan: Math.round(p), hiz: Math.round((css / ortTempo) * 100) });
    top += p;
  }
  return { puan: Math.round(top), satirlar: satirlar.sort((a, b) => b.puan - a.puan) };
}

/**
 * Aynı standart sette RPE kayması: gecmis [{ tarih, ortSn, rpe }] (yeniden eskiye); bugünkü ortSn ve seans RPE'si.
 * Tempo ±%3 içindeki son 4 kaydın RPE ortalamasıyla kıyas; |fark| ≥ 2 ise { fark, ortRpe, ortSn, metin }.
 */
export function rpeKaymasi(gecmis, ortSn, rpe) {
  if (!(ortSn > 0) || rpe == null || rpe === '') return null;
  const ayni = (gecmis || []).filter((g) => g.rpe != null && g.rpe !== '' && Math.abs(g.ortSn - ortSn) / ortSn <= 0.03).slice(0, 4);
  if (!ayni.length) return null;
  const ortRpe = ayni.reduce((a, g) => a + Number(g.rpe), 0) / ayni.length;
  const f = Math.round((Number(rpe) - ortRpe) * 10) / 10;
  if (Math.abs(f) < 2) return null;
  return { fark: f, ortRpe: yuvarla(ortRpe, 10), ortSn: ayni.reduce((a, g) => a + g.ortSn, 0) / ayni.length, metin: f > 0 ? `Aynı hızda RPE ${String(f).replace('.', ',')} arttı → yorgunluk işareti` : `Aynı hızda RPE ${String(-f).replace('.', ',')} azaldı → form iyi` };
}

// --- B11: yoğunluk dağılımı faz hedefine göre ----------------------------------------------------

/** Faz koduna göre hedef pay (%): F0–F1 aerobik taban, F2 eşik, F3 hız/kalite, F4+ yarış. */
export function bolgeHedefi(fazKod) {
  const k = Number(String(fazKod == null ? '' : fazKod).replace(/\D/g, ''));
  if (k === 2) return { EN1: 45, EN2: 30, EN3: 18, SP: 7 };
  if (k === 3) return { EN1: 40, EN2: 30, EN3: 20, SP: 10 };
  if (k >= 4) return { EN1: 50, EN2: 25, EN3: 15, SP: 10 };
  return { EN1: 50, EN2: 35, EN3: 12, SP: 3 };
}

const BOLGE_GRUP = (zone) => { const z = String(zone || '').toUpperCase(); return z.startsWith('SP') ? 'SP' : z.startsWith('EN3') ? 'EN3' : z.startsWith('EN2') ? 'EN2' : 'EN1'; };
const EKSIK_NOT = { EN1: 'kolay aerobik yüzme ekle', EN2: 'orta tempo (EN2) set ekle', EN3: 'sonraki yüzmeye eşik seti ekle (ör. 6×100 CSS)', SP: 'kısa hız tekrarları ekle (ör. 8×25)' };

/** reps: [{ ms, zone }] → { pay: { EN1, EN2, EN3, SP }, hedef, eksik: [{ grup, pay, hedef, metin }] } ya da null (veri yok). */
export function bolgeDagilimi(reps, hedef) {
  const by = { EN1: 0, EN2: 0, EN3: 0, SP: 0 };
  let top = 0;
  for (const r of reps || []) { if (!(r.ms > 0)) continue; by[BOLGE_GRUP(r.zone)] += r.ms; top += r.ms; }
  if (!top) return null;
  const pay = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round((v / top) * 100)]));
  const eksik = Object.keys(by).filter((k) => hedef[k] >= 3 && pay[k] < hedef[k] * 0.5)
    .map((k) => ({ grup: k, pay: pay[k], hedef: hedef[k], metin: `${k} eksik: ${EKSIK_NOT[k]}` }));
  return { pay, hedef, eksik };
}

// --- B16: plan / yapılan uyumu -----------------------------------------------------------------------

/**
 * Bu haftanın günleri: gunler [{ tarih, plan: [{ tur, dk }], yapilan: [{ tur, dk, planDk }] }].
 * Yapılan yüzme planlanan süreye göre ±%20 içinde yeşil, dışında sarı; planlı olup geçmişte yapılmayan kırmızı;
 * bugün ve sonrası planlı "bekliyor". Uyarlama: kaçan ilk yüzme için bugünden sonraki ilk boş gün.
 */
export function uyum(gunler, bugun) {
  const satirlar = gunler.map((g) => {
    const y = g.yapilan || [];
    if (y.length) {
      const yz = y.find((x) => x.tur === 'yuzme' && x.planDk > 0);
      const pay = yz ? Math.round((yz.dk / yz.planDk) * 100) : null;
      return { ...g, durum: pay == null || (pay >= 80 && pay <= 120) ? 'yesil' : 'sari', pay };
    }
    if ((g.plan || []).length) return { ...g, durum: g.tarih < bugun ? 'kirmizi' : 'bekliyor', pay: null };
    return { ...g, durum: 'bos', pay: null };
  });
  const kacan = satirlar.find((s) => s.durum === 'kirmizi');
  let uyarlama = null;
  if (kacan) {
    const bos = satirlar.find((s) => s.tarih >= bugun && s.durum === 'bos');
    if (bos) uyarlama = { kacan: kacan.tarih, hedef: bos.tarih, tur: (kacan.plan[0] || {}).tur || 'yuzme' };
  }
  return { satirlar, uyarlama };
}
