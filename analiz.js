// Yüzme analizi: saf işlevler (DOM yok). Telefondaki geçmiş (ysk.history) kayıtları üzerinde çalışır.
// Süreler ms, tempo sn/100 m.

/** "1:31.2", "1:31", "91.2" → saniye; geçersizse null. */
export function lapSn(s) {
  const m = /^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/.exec(String(s == null ? '' : s).trim());
  if (!m) return null;
  return (Number(m[1]) || 0) * 60 + Number(m[2].replace(',', '.'));
}

/** Set imzası (aynı set türünü bulmak için): "4×100 FR swim". */
export const setImza = (s) => `${Number(s.tekrar) || 1}×${Number(s.mesafe) || 0} ${String(s.stil || '').trim().toUpperCase()} ${String(s.tur || '').trim().toLowerCase()}`.trim();

/** SWOLF (25 m başına): süre (sn) + kulaç. ms: tekrar süresi, mesafe: m, kulac25: 25 m'de kulaç. */
export function swolf(ms, mesafe, kulac25) {
  if (!(ms > 0) || !(mesafe > 0) || !(kulac25 > 0)) return null;
  return Math.round((ms / 1000) * (25 / mesafe) + kulac25);
}
/** Kulaç başına mesafe (m). */
export const kulacBasi = (kulac25) => (kulac25 > 0 ? Math.round((25 / kulac25) * 100) / 100 : null);

/** Bölgelerde süre: [{ ms, n, zone }] → [{ n, zone, ms, pay (%) }] (n artan). */
export function bolgeSureleri(reps) {
  const by = {};
  let top = 0;
  for (const r of reps || []) {
    if (!(r.ms > 0) || r.n == null) continue;
    const o = (by[r.n] = by[r.n] || { n: r.n, zone: r.zone, ms: 0 });
    o.ms += r.ms; top += r.ms;
  }
  return Object.values(by).sort((a, b) => a.n - b.n).map((o) => ({ ...o, pay: top ? Math.round((o.ms / top) * 100) : 0 }));
}

/** Kolay / eşik / hız payları: n ≤ 3 kolay (REC, EN1, EN2), 4 eşik (EN3), ≥ 5 hız (SP). */
export function denge(bolgeler) {
  const t = { kolay: 0, esik: 0, hiz: 0 };
  let top = 0;
  for (const b of bolgeler) { const k = b.n <= 3 ? 'kolay' : b.n === 4 ? 'esik' : 'hiz'; t[k] += b.ms; top += b.ms; }
  return top ? { kolay: Math.round((t.kolay / top) * 100), esik: Math.round((t.esik / top) * 100), hiz: Math.round((t.hiz / top) * 100) } : { kolay: 0, esik: 0, hiz: 0 };
}

/**
 * Aynı setin geçmişi (yeniden eskiye): [{ tarih, ortSn (tekrar ortalaması), tempo (sn/100) }]. hist: ysk.history.
 * Yalnızca süresi olan (gercek dolu) ve tamamlanan setler; önce tarihi verilen gün hariç.
 */
export function setGecmisi(hist, imza, once = '9999') {
  const out = [];
  for (const r of hist || []) {
    if (!r || r.tur === 'salon' || !(r.tarih < once)) continue;
    for (const s of r.setler || []) {
      if (!s.tamamlandi || setImza(s) !== imza) continue;
      const sn = lapSn(s.gercek);
      if (sn == null || !(Number(s.mesafe) > 0)) continue;
      out.push({ tarih: r.tarih, ortSn: sn, tempo: (sn / Number(s.mesafe)) * 100 });
    }
  }
  return out.sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0));
}

/** Geçen aynı setle kıyas: { tarih, onceki (sn), fark (sn; − = daha hızlı) } ya da null. */
export function kiyas(hist, imza, tarih, ortSn) {
  const g = setGecmisi(hist, imza, tarih)[0];
  return g && ortSn > 0 ? { tarih: g.tarih, onceki: g.ortSn, fark: Math.round((ortSn - g.ortSn) * 10) / 10 } : null;
}

/** Rekor: aynı setin en hızlı ortalaması mı ({ onceki }) ya da null (ilk kez değilse ve daha hızlıysa). */
export function setRekor(hist, imza, tarih, ortSn) {
  const g = setGecmisi(hist, imza, tarih);
  if (!g.length || !(ortSn > 0)) return null;
  const best = Math.min(...g.map((x) => x.ortSn));
  return ortSn < best ? { onceki: best } : null;
}

/** "sag omuz 1; bel 0.5" → { 'sag omuz': 1, bel: 0.5 } */
export function msiParse(s) {
  const out = {};
  for (const p of String(s || '').split(';')) {
    const m = /^\s*(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/.exec(p);
    if (m) out[m[1].trim()] = Number(m[2].replace(',', '.'));
  }
  return out;
}

/** Ağrı geçmişi (yüzme seansları, from tarihinden beri): { bölge: { n (seans), ort, max } } */
export function agriGecmisi(hist, from = '') {
  const by = {};
  for (const r of hist || []) {
    if (!r || r.tur === 'salon' || (from && r.tarih < from)) continue;
    for (const [k, v] of Object.entries(msiParse(r.seans && r.seans.msi))) {
      if (!(v > 0)) continue;
      const o = (by[k] = by[k] || { n: 0, top: 0, max: 0 });
      o.n += 1; o.top += v; o.max = Math.max(o.max, v);
    }
  }
  for (const o of Object.values(by)) { o.ort = Math.round((o.top / o.n) * 10) / 10; delete o.top; }
  return by;
}

/** CSS testi: 400 ve 200 m süreleri (sn) → CSS (sn/100 m, 0,1 hassas) ya da null. */
export function cssTesti(t400, t200) {
  if (!(t400 > 0) || !(t200 > 0) || t400 <= t200 * 1.5 || t400 >= t200 * 3) return null;
  // 200 m fark / süre farkı = hız (m/sn) → 100 m süresi = (t400 − t200) / 2
  return Math.round(((t400 - t200) / 2) * 10) / 10;
}

/**
 * Derece tahmini (kaba): CSS ≈ uzun mesafe eşik temposu. 400 ≈ (CSS − 2) × 4, 200 ≈ (CSS − 6) × 2, 100 ≈ CSS − 12 (sn).
 * Eğitimli ustalar yüzücüsü için yaklaşık; test ve yarış dereceleri girildikçe düzelmesi beklenir.
 */
export function dereceTahmini(css) {
  if (!(css > 0)) return null;
  return { 100: Math.round(css - 12), 200: Math.round((css - 6) * 2), 400: Math.round((css - 2) * 4) };
}

/** Açıklamadaki drill adı → sporRef drill satırı ({ ad, video }) ya da null (en uzun ad önce). */
export function drillBul(aciklama, drills) {
  const t = String(aciklama || '').toLocaleLowerCase('tr');
  const list = (drills || []).filter((d) => d && d.ad).sort((a, b) => b.ad.length - a.ad.length);
  return list.find((d) => t.includes(String(d.ad).toLocaleLowerCase('tr'))) || null;
}

/** Aerobik blok (omuz rahatlatma bu blokların sonunda): ana set ve ek set. */
export const aerobikBlok = (blok) => ['MS', 'AS'].includes(String(blok || '').trim().toUpperCase());

/**
 * Eşik setleri hedefin sürekli altında mı (CSS testi önerisi)? Son `gun` gündeki EN3 setleri:
 * en az 3 set, ortalama tempo CSS'ten ≥ 2 sn hızlı ve seans RPE ≤ 6.
 * hist kayıtlarında setin bölgesi yok: tempo CSS ± 3 içindeyse eşik sayılır.
 */
export function cssTestiZamani(hist, css, bugun, gun = 21) {
  if (!(css > 0)) return null;
  const sinir = (() => { const [y, m, d] = bugun.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - gun)).toISOString().slice(0, 10); })();
  const t = [];
  for (const r of hist || []) {
    if (!r || r.tur === 'salon' || r.tarih < sinir) continue;
    const rpe = r.seans && r.seans.rpe !== '' && r.seans.rpe != null ? Number(r.seans.rpe) : null;
    for (const s of r.setler || []) {
      const sn = lapSn(s.gercek);
      if (!s.tamamlandi || sn == null || !(Number(s.mesafe) >= 100) || /drill|kick|pull|scull|\btest\b/i.test(s.tur || '') || String(s.alet || '').trim()) continue;
      const tempo = (sn / Number(s.mesafe)) * 100;
      if (tempo >= css - 6 && tempo <= css + 3) t.push({ tempo, rpe });
    }
  }
  if (t.length < 3) return null;
  const ort = t.reduce((a, x) => a + x.tempo, 0) / t.length;
  const rpes = t.map((x) => x.rpe).filter((x) => x != null);
  const rpeOrt = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  return css - ort >= 2 && (rpeOrt == null || rpeOrt <= 6) ? { setSayisi: t.length, ortTempo: Math.round(ort * 10) / 10, rpe: rpeOrt } : null;
}

// --- 13.12: geçmişle kıyas Drive kayıtlarından (getGecmis) + telefon geçmişi ------------------------

/** Planlanan tekrar süresi ("04:04") → hedef tempo (sn/100 m); yoksa 0. */
const hedefTempo = (h, m) => { const sn = lapSn(h); return sn != null && Number(m) > 0 ? (sn / Number(m)) * 100 : 0; };
const norm = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
/** Sayfada bölge yoksa tempo bu bantta (sn/100 m) aynı sayılır. */
const TEMPO_BANT = 6;

/**
 * Drive (getGecmis: { sets, seans }) ve telefon geçmişini (ysk.history) tek düz listeye çevirir:
 * { tarih, ts, id, blok, tekrar, mesafe, stil, tur, alet, zone, ortSn (tekrar ort.), tempo (sn/100 m), havuz, rpe, kaynak }.
 * Aynı kayıt iki yerde varsa Drive kalır. Havuz ve RPE yalnız o gün tek seans varsa atanır (aynı gün iki idmanda karışmaz).
 */
export function gecmisListe(drive, hist) {
  const out = [];
  const seansBy = {};
  for (const x of (drive && drive.seans) || []) (seansBy[x.t] = seansBy[x.t] || []).push(x);
  const tekSeans = (t) => (seansBy[t] && seansBy[t].length === 1 ? seansBy[t][0] : null);
  for (const r of (drive && drive.sets) || []) {
    const sn = lapSn(r.g);
    if (sn == null || !(Number(r.m) > 0)) continue;
    const ses = tekSeans(r.t);
    out.push({ tarih: r.t, ts: ses && ses.ts ? ses.ts : null, id: null, blok: r.b, tekrar: Number(r.n) || 1, mesafe: Number(r.m), stil: r.s, tur: r.u, alet: r.a || '', zone: r.z || '', ortSn: sn, tempo: (sn / Number(r.m)) * 100, hedefTempo: hedefTempo(r.h, r.m), havuz: ses && ses.havuz ? ses.havuz : null, rpe: ses && ses.rpe != null ? ses.rpe : null, kaynak: 'drive' });
  }
  const key = (x) => [x.tarih, norm(x.blok), x.tekrar, x.mesafe, norm(x.stil), norm(x.tur), norm(x.alet), Math.round(x.ortSn * 10)].join('|');
  const seen = new Set(out.map(key));
  for (const r of hist || []) {
    if (!r || r.tur === 'salon') continue;
    for (const s of r.setler || []) {
      if (!s.tamamlandi) continue;
      const sn = lapSn(s.gercek);
      if (sn == null || !(Number(s.mesafe) > 0)) continue;
      const x = { tarih: r.tarih, ts: null, id: r.id || null, blok: s.blok, tekrar: Number(s.tekrar) || 1, mesafe: Number(s.mesafe), stil: s.stil, tur: s.tur, alet: s.alet || '', zone: s.zone || '', ortSn: sn, tempo: (sn / Number(s.mesafe)) * 100, hedefTempo: hedefTempo(s.hedef, s.mesafe), havuz: r.seans && r.seans.havuz ? Number(r.seans.havuz) : null, rpe: r.seans && r.seans.rpe != null ? r.seans.rpe : null, kaynak: 'telefon' };
      if (!seen.has(key(x))) out.push(x);
    }
  }
  return out.sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0));
}

/**
 * Aynı set mi? q: { mesafe, stil, tur, alet, tempo (sn/100), zone, havuz }.
 * Mesafe, stil, tür, alet aynı; havuz boyu (ikisi de biliniyorsa) aynı; bölge (ikisi de varsa) aynı, yoksa tempo ±6 sn/100 m.
 * Tekrar sayısı eşleşmeyi bozmaz (4×200 ile 5×200 kıyaslanır; tempo 100 m başınadır).
 */
export function benzerMi(a, q) {
  if (Number(a.mesafe) !== Number(q.mesafe)) return false;
  if (norm(a.stil) !== norm(q.stil) || norm(a.tur) !== norm(q.tur) || norm(a.alet) !== norm(q.alet)) return false;
  if (a.havuz && q.havuz && Number(a.havuz) !== Number(q.havuz)) return false;
  // planlanan set önizlemesi (q.hedefTempo): aynı plan yoğunluğu (hedef tempo ±3 sn/100 m); biri bilinmiyorsa yalnız yapı
  if (q.hedefTempo > 0 && a.hedefTempo > 0) return Math.abs(a.hedefTempo - q.hedefTempo) <= 3;
  if (!(q.tempo > 0)) return true;
  if (a.zone && q.zone) return norm(a.zone) === norm(q.zone);
  return Math.abs(a.tempo - q.tempo) <= TEMPO_BANT;
}

/** Benzer geçmiş setler (yeniden eskiye), verilen günden önce; en çok n. */
export function benzerGecmis(liste, q, once = '9999', n = 99) {
  return (liste || []).filter((x) => x.tarih < once && benzerMi(x, q)).slice(0, n);
}

/** Geçen benzer setle kıyas: { tarih, onceki (sn), fark (sn; − = daha hızlı), tekrar } ya da null. */
export function kiyas2(liste, q, once) {
  const g = benzerGecmis(liste, q, once, 1)[0];
  return g && q.ortSn > 0 ? { tarih: g.tarih, onceki: g.ortSn, fark: Math.round((q.ortSn - g.ortSn) * 10) / 10, tekrar: g.tekrar } : null;
}

/** Rekor: en hızlı ortalamadan da hızlı mı ({ onceki }) ya da null (ilk kez değilse). */
export function rekor2(liste, q, once) {
  const g = benzerGecmis(liste, q, once);
  if (!g.length || !(q.ortSn > 0)) return null;
  const best = Math.min(...g.map((x) => x.ortSn));
  return q.ortSn < best ? { onceki: best } : null;
}
