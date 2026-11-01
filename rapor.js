// Rapor ve performans takibi (13.13): "idman Analitik" tablosundan (idmanAnalitik.gs getAnalitik) gelen görünen metinleri
// sayıya çevirir ve ekran modellerini kurar. Saf (DOM yok). Hesapları tablodaki formüller yapar; buradaki işler yalnız
// çevirme, sıralama, durum rengi ve ilerleme oranı.

/** "13,3" → 13.3; "+2,4" → 2.4; "-17" → -17; "0,00%" → 0; "%6,0" → 6; "–", "" → null. */
export function sayi(s) {
  const m = /^[+]?\s*(-?\d+(?:[.,]\d+)?)\s*%?$/.exec(String(s == null ? '' : s).trim().replace(/^%/, '').replace(/\s*(dk|sn|m|km|bpm)$/i, ''));
  return m ? Number(m[1].replace(',', '.')) : null;
}

/** "4:28" → 268; "0:22:31" → 1351; "2:06.4" → 126.4; "0:07:35.0" → 455; yoksa null. */
export function sure(s) {
  const m = /^(?:(\d+):)?(\d+):(\d{1,2}(?:[.,]\d+)?)$/.exec(String(s == null ? '' : s).trim());
  if (!m) return null;
  // iki parça (m:ss) ve üç parça (h:mm:ss) ayrımı: üç parçada ilk grup saat
  const parts = String(s).trim().split(':');
  const sec = Number(parts[parts.length - 1].replace(',', '.'));
  const min = Number(parts[parts.length - 2]);
  const hr = parts.length === 3 ? Number(parts[0]) : 0;
  return hr * 3600 + min * 60 + sec;
}

/** "27.10.2026" → "2026-10-27" ("2026-10-27" aynen); geçersiz → ''. */
export function tarihKey(s) {
  const t = String(s == null ? '' : s).trim();
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  return m ? t : '';
}

/** "2026-10-27" → "27.10" */
export const gunAy = (k) => (k ? `${k.slice(8, 10)}.${k.slice(5, 7)}` : '');

/** Durum metni → 'ok' (✓, "yolunda"), 'bad' (✗, "geride"), diğerleri 'wait' (bekliyor). */
export function durumOf(s) {
  const t = String(s == null ? '' : s).trim();
  if (/^✓|yolunda|tamam/i.test(t)) return 'ok';
  if (/^✗|geride|hedef dışı/i.test(t)) return 'bad';
  return 'wait';
}

const BIRIM = /^[a-zA-Zçğıöşü%]*$/;

/**
 * Hedef ilerleme oranı (0–1): yalnız eşik "≥ N birim" ya da "N birim" ise ve güncel değer aynı birimle başlıyorsa
 * ("40 dk" ↔ "37,3 dk", "≥ 10" ↔ "test 9,7"); aksi halde null (yanlış yüzde göstermek yerine çubuk yok).
 */
export function ilerleme(esik, guncel) {
  const e = /^\s*(?:≥\s*)?(\d+(?:[.,]\d+)?)\s*([a-zA-Zçğıöşü%]*)\s*$/.exec(String(esik == null ? '' : esik));
  if (!e) return null;
  const g = /^\s*(?:test\s+)?(\d+(?:[.,]\d+)?)\s*([a-zA-Zçğıöşü%]*)(?:\s|$)/i.exec(String(guncel == null ? '' : guncel));
  if (!g || !BIRIM.test(g[2]) || g[2] !== e[2]) return null;
  const N = Number(e[1].replace(',', '.'));
  const G = Number(g[1].replace(',', '.'));
  return N > 0 ? Math.max(0, Math.min(1, G / N)) : null;
}

/** Hedefler sayfası → { items, ozet: { ok, bad, wait } }. */
export function hedefModel(rows) {
  const items = (rows || []).map((r) => ({ ...r, durumKod: durumOf(r.durum), oran: ilerleme(r.esik, r.guncel) }));
  const ozet = { ok: 0, bad: 0, wait: 0 };
  for (const x of items) ozet[x.durumKod]++;
  return { items, ozet };
}

/** Geride kalan hedefler: ana sayfa uyarısı için [{ hedef, guncel }]. */
export const uyarilar = (rows) => (rows || []).filter((r) => durumOf(r.durum) === 'bad').map((r) => ({ hedef: r.hedef, guncel: r.guncel }));

/** durum sayfası → haftalık satırlar (sayı) + en yüksek km + kara seansı olmayan haftalar. */
export function haftaModel(rows) {
  const list = (rows || []).map((r) => ({
    hafta: r.hafta, baslangic: r.baslangic, tip: r.tip, yuzme: sayi(r.yuzme), ara: sayi(r.ara), kara: sayi(r.kara), ev: sayi(r.ev),
    esikhiz: sayi(r.esikhiz), msi: sayi(r.msi), km: sayi(r.km), fren: r.fren,
  }));
  return { list, maxKm: Math.max(0, ...list.map((x) => x.km || 0)), karasiz: list.filter((x) => x.kara === 0).map((x) => x.hafta) };
}

/** Hedefler sayfasındaki KN-1 eşiği: "Ort. nabız < 161 · kulaç ≤ 13,2" → { ort: 161, kulac: 13.2 } (okunamazsa alanlar null). */
export function knEsik(hedefRows) {
  const r = (hedefRows || []).find((x) => /kontrol noktas/i.test(x.hedef || ''));
  if (!r) return { ort: null, kulac: null };
  const o = /nabız\s*[<≤]\s*(\d+(?:[.,]\d+)?)/i.exec(r.esik || '');
  const k = /kulaç\s*[<≤]\s*(\d+(?:[.,]\d+)?)/i.exec(r.esik || '');
  return { ort: o ? Number(o[1].replace(',', '.')) : null, kulac: k ? Number(k[1].replace(',', '.')) : null };
}

/** KN sayfası → { noktalar: [{ ad, seri: [{ tarih, sureSn, sure, ort, max, kulac, dort }] }], son } (KN-1, KN-2, KN-3). */
export function knModel(rows) {
  const noktalar = [1, 2, 3].map((n) => ({
    ad: `KN-${n}`,
    seri: (rows || []).map((r) => ({
      tarih: tarihKey(r.tarih), sure: r[`k${n}sure`], sureSn: sure(r[`k${n}sure`]), ort: sayi(r[`k${n}ort`]), max: sayi(r[`k${n}max`]),
      kulac: sayi(r[`k${n}kulac`]), dort: sayi(r[`k${n}dort`]),
    })).filter((x) => x.sureSn != null || x.ort != null),
  }));
  return { noktalar, son: (rows || []).length ? rows[rows.length - 1] : null };
}

/** Kesintisiz + KV → { satirlar, enUzunDk, hedefDk, kv }. */
export function kesintisizModel(rows, kvRows, hedefRows) {
  const satirlar = (rows || []).map((r) => ({
    tarih: tarihKey(r.tarih), mesafe: sayi(r.mesafe), sureSn: sure(r.sure), sure: r.sure, tempo: r.tempo, hedef: r.hedef, fark: sayi(r.fark),
    max: sayi(r.max), ort: sayi(r.ort), kulac: sayi(r.kulac), rpe: sayi(r.rpe),
  })).filter((x) => x.sureSn != null);
  const hedefRow = (hedefRows || []).find((x) => /kesintisiz/i.test(x.hedef || ''));
  const hd = hedefRow ? /(\d+(?:[.,]\d+)?)\s*dk/i.exec(hedefRow.esik || '') : null;
  return {
    satirlar,
    enUzunDk: satirlar.length ? Math.max(...satirlar.map((x) => x.sureSn)) / 60 : null,
    hedefDk: hd ? Number(hd[1].replace(',', '.')) : null,
    kv: (kvRows || []).map((r) => ({ tarih: tarihKey(r.tarih), set: r.set, hedef: r.hedef, tempo: r.tempo, fark: sayi(r.fark), kulac: sayi(r.kulac), ort: sayi(r.ort), swolf: sayi(r.swolf), dswolf: sayi(r.dswolf), rpe: sayi(r.rpe) })),
  };
}

/** derece (+ Test) → etiket rekorları (fark = son − en iyi, sn) ve CSS geçmişi (tarih sırasıyla; hedef CSS hedefler sayfasından). */
export function rekorModel(derece, testRows, hedefRows) {
  const etiketler = ((derece && derece.etiketler) || []).filter((x) => x.etiket).map((x) => {
    const eb = sure(x.eniyi); const sn = sure(x.son);
    return { etiket: x.etiket, alet: x.alet, sayi: sayi(x.sayi), eniyi: x.eniyi, eniyiTarih: x.eniyitarih, son: x.son, sonTarih: x.sontarih, ilk: x.ilk, fark: eb != null && sn != null ? Math.round((sn - eb) * 10) / 10 : null };
  });
  const css = ((derece && derece.css) || []).map((x) => ({ tarih: tarihKey(x.tarih), css: sure(x.css), yontem: x.yontem, girdi: x.girdi, not: x.not })).filter((x) => x.css != null && x.tarih).sort((a, b) => (a.tarih < b.tarih ? -1 : 1));
  const h = (hedefRows || []).find((x) => /^\s*\d*\s*·?\s*css/i.test(x.hedef || ''));
  const m = h ? /(\d+(?:[.,]\d+)?)/.exec(h.esik || '') : null;
  return { etiketler, css, hedefCss: m ? Number(m[1].replace(',', '.')) : null, testler: (testRows || []).filter((x) => x.tarih) };
}

/** sezon + model → sayısal satırlar. */
export function sezonModel(sezon, model) {
  return {
    sezonlar: (sezon || []).map((r) => ({ sezon: r.sezon, seans: sayi(r.seans), km: sayi(r.km), hafta: sayi(r.hafta), seanshafta: sayi(r.seanshafta), ms: sayi(r.ms), ara14: sayi(r.ara14) })),
    maxKm: Math.max(0, ...(sezon || []).map((r) => sayi(r.km) || 0)),
    model: (model || []).map((r) => ({ donem: r.donem, hafta: r.hafta, seanshafta: sayi(r.seanshafta), kmhafta: sayi(r.kmhafta), ms: sayi(r.ms), seans: sayi(r.seans) })),
  };
}

/** bolge → sezon başına pay (%): kolay, orta, esik, hiz, tec, aletli (toplamı tek çubuk). */
export function bolgeModel(rows) {
  return (rows || []).map((r) => ({ sezon: r.sezon, ms: sayi(r.ms), kolay: sayi(r.kolay) || 0, orta: sayi(r.orta) || 0, esik: sayi(r.esik) || 0, hiz: sayi(r.hiz) || 0, tec: sayi(r.tec) || 0, aletli: sayi(r.aletli) || 0, esikhiz: sayi(r.esikhiz) }));
}

/** Kara sayfası → barfiks setleri (sayı dizisi), ortalama, toplam. */
export function karaModel(rows) {
  return (rows || []).map((r) => ({
    tarih: tarihKey(r.tarih), yer: r.yer, sure: r.sure, rpe: sayi(r.rpe), setler: String(r.setler || '').split('-').map(Number).filter((n) => Number.isFinite(n)), ort: sayi(r.ort), dort: r.dort, toplam: sayi(r.toplam), test: r.test,
  })).filter((x) => x.setler.length);
}
