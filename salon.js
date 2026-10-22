// Salon idmanı: saf mantık (DOM yok). Seans bir olay listesidir:
//   { t: 'set', ts, h }   h. hareketin bir sonraki seti başlar (ilk set idmanı da başlatır)
//   { t: 'bitti', ts }    süren set biter, dinlenme başlar
//   { t: 'mola', ts } / { t: 'devam', ts }  mola (yalnızca dinlenirken)
//   { t: 'son', ts }      idman biter
// Set tekrarları ayrıca tutulur (session.reps[k] = [11, 9, 9]); girilmeyen set planlanan tekrar sayılır.
// Hareket sonu girişi (nabız, RPE, MSI, not) session.giris[k].

export const VUCUT = 'Vücut';
export const RPE_DEGERLER = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
export const MSI_DEGERLER = [0, 0.5, 1, 1.5, 2, 3];

/** Süreli (tekrar yerine saniye) hareket: adına ya da geçmiş açıklamasına ("… sn") göre. */
export function isTimed(ad, aciklama = '') {
  return /plank|hold|hang|wall sit|carry|isometric|l-sit|hollow|side bridge/i.test(String(ad || ''))
    || /Setler:[^.]*\bsn\b/i.test(String(aciklama || ''));
}

let seq = 0;
const newKey = () => { seq += 1; return `h${Date.now().toString(36)}${seq}`; };

/** Plan hareketi: { ad, set, tekrar, agirlik, dinlen (sn), sure (sn/set, süreliyse), _k }. */
export function hareket({ ad, set = 3, tekrar = 10, agirlik = '', dinlen = 90, sure = 0 }) {
  return { ad: String(ad || '').trim(), set: Math.max(1, Number(set) || 1), tekrar: Math.max(1, Math.round(Number(tekrar) || 1)), agirlik: agirlik === VUCUT ? VUCUT : (agirlik === '' || agirlik == null ? '' : Number(agirlik)), dinlen: Number(dinlen) || 0, sure: Number(sure) || 0, _k: newKey() };
}

export function newSession(tarih, hareketler) {
  return { v: 1, tarih, hareketler, events: [], pos: 0, reps: {}, giris: {}, screen: 'salon' };
}

/** "Setler: 11-9-9" → [11, 9, 9]; yoksa null. */
export function parseSetler(aciklama) {
  const m = /Setler:\s*([\d.,]+(?:\s*-\s*[\d.,]+)*)/i.exec(String(aciklama || ''));
  return m ? m[1].split('-').map((x) => Number(x.trim().replace(',', '.'))) : null;
}

/** Olay listesi → durum. */
export function replay(events, hareketler) {
  const per = hareketler.map(() => ({ sets: [] }));
  const st = { phase: 'idle', basla: null, son: null, cur: null, per, last: null, lastBitti: null, mola: null, molaMs: 0, molaN: 0, restMola: 0 };
  const closeMola = (ts) => {
    if (st.mola == null) return;
    const d = Math.max(0, ts - st.mola);
    st.molaMs += d;
    st.restMola += d;
    st.mola = null;
  };
  for (const e of events) {
    st.last = e;
    if (e.t === 'mola') { if (st.phase === 'rest' && st.mola == null) { st.mola = e.ts; st.molaN += 1; } continue; }
    if (e.t === 'devam') { closeMola(e.ts); continue; }
    closeMola(e.ts);
    if (e.t === 'set') {
      if (!(e.h >= 0 && e.h < per.length)) continue;
      if (st.basla == null) st.basla = e.ts;
      per[e.h].sets.push({ bas: e.ts, bit: null });
      st.cur = e.h;
      st.phase = 'work';
      st.restMola = 0;
    } else if (e.t === 'bitti') {
      if (st.cur == null) continue;
      const s = per[st.cur].sets[per[st.cur].sets.length - 1];
      if (!s || s.bit != null) continue;
      s.bit = e.ts;
      st.lastBitti = e.ts;
      st.restMola = 0;
      st.phase = 'rest';
    } else if (e.t === 'son') {
      st.son = e.ts;
      st.phase = 'done';
    }
  }
  return st;
}

export const doneSets = (st, h) => st.per[h].sets.filter((s) => s.bit != null).length;

/** 'bekliyor' | 'suruyor' | 'tamam' | 'eksik' */
export function status(st, hareketler, h) {
  const d = doneSets(st, h);
  if (!st.per[h].sets.length) return 'bekliyor';
  if (d >= hareketler[h].set) return 'tamam';
  if (st.cur === h && st.phase !== 'done') return 'suruyor';
  return 'eksik';
}

/** Büyük düğme: { kind: 'set'|'bitti'|'mola'|'yok', h, set } */
export function mainAction(st, hareketler, pos) {
  if (st.phase === 'done') return { kind: 'yok' };
  if (st.mola != null) return { kind: 'mola' };
  if (st.phase === 'work') return { kind: 'bitti', h: st.cur, set: st.per[st.cur].sets.length };
  if (doneSets(st, pos) >= hareketler[pos].set) return { kind: 'yok', h: pos };
  return { kind: 'set', h: pos, set: doneSets(st, pos) + 1 };
}

/** Bir hareketin set tekrarları (biten setler): girilen ya da planlanan. */
export function repsOf(session, st, h) {
  const x = session.hareketler[h];
  const saved = session.reps[x._k] || [];
  const plan = x.sure || x.tekrar;
  return st.per[h].sets.filter((s) => s.bit != null).map((_, j) => (saved[j] != null ? saved[j] : plan));
}

/** Hareket süresi (ms): ilk set başı → son set sonu (gerçek geçen süre). */
export function hareketMs(st, h) {
  const done = st.per[h].sets.filter((s) => s.bit != null);
  return done.length ? done[done.length - 1].bit - st.per[h].sets[0].bas : 0;
}

/** İdman süresi (ms), mola düşülür. */
export function idmanMs(st, now) {
  if (st.basla == null) return 0;
  const end = st.son != null ? st.son : now;
  const open = st.mola != null ? Math.max(0, end - st.mola) : 0;
  return Math.max(0, end - st.basla - st.molaMs - open);
}

/** Dinlenme geçen süre (ms), mola düşülür. */
export function restMs(st, now) {
  if (st.phase !== 'rest' || st.lastBitti == null) return 0;
  const open = st.mola != null ? Math.max(0, now - st.mola) : 0;
  return Math.max(0, now - st.lastBitti - st.restMola - open);
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const fmtN = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/** Tabloya giden hareketler: yalnızca en az bir seti biten hareketler, uygulamadaki sırayla. */
export function payload(session, st) {
  const out = [];
  session.hareketler.forEach((x, h) => {
    const reps = repsOf(session, st, h);
    if (!reps.length) return;
    const g = session.giris[x._k] || {};
    const setler = `Setler: ${reps.map(fmtN).join('-')}${x.sure ? ' sn' : ''}`;
    const isn = (session.isinmaSet || {})[x._k];
    out.push({
      hareket: x.ad,
      set: reps.length,
      tekrar: Math.round(avg(reps) * 100) / 100,
      agirlik: x.agirlik === '' ? '' : x.agirlik,
      nabiz: g.nabiz == null ? '' : g.nabiz,
      rpe: g.rpe == null ? '' : g.rpe,
      msi: g.msi == null ? '' : g.msi,
      aciklama: [setler, isn ? `Isınma ${isn} set` : '', String(g.not || '').trim()].filter(Boolean).join('. '),
      sure: mmss(hareketMs(st, h)),
    });
  });
  const sn = Math.round(idmanMs(st, Date.now()) / 1000);
  const ks = session.seans || {};
  const sure = `${Math.floor(sn / 3600)}:${String(Math.floor((sn % 3600) / 60)).padStart(2, '0')}:${String(sn % 60).padStart(2, '0')}`;
  // 13.4: karaSeans satırı — gerçek idman süresi (mola düşülür) ve idmanın geneli için RPE / MSI / yer / not
  const seans = { sure, rpe: ks.rpe == null ? '' : ks.rpe, msi: ks.msi == null ? '' : ks.msi, yer: ks.yer || '', aciklama: String(ks.not || '').trim() };
  if (st.basla != null) seans.baslangic = st.basla; // 13.9: karaSeans Tarih saatli
  return { tarih: session.tarih, hareketler: out, seans };
}

/** Geçmişin son idmanı (en yeni tarih) → plan hareketleri. */
export function lastWorkout(gecmis) {
  if (!Array.isArray(gecmis) || !gecmis.length) return null;
  const tarih = gecmis.reduce((a, r) => (r.tarih > a ? r.tarih : a), '');
  const rows = gecmis.filter((r) => r.tarih === tarih).sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0));
  return { tarih, rows, hareketler: rows.map(fromHistory) };
}

/** Geçmiş satırı → plan hareketi (son yapılan değerler). */
export function fromHistory(r) {
  const timed = isTimed(r.hareket, r.aciklama);
  const reps = parseSetler(r.aciklama);
  const t = Math.round(reps && reps.length ? Math.max(...reps) : Number(r.tekrar) || 10);
  return hareket({ ad: r.hareket, set: r.set || (reps ? reps.length : 3), tekrar: timed ? 1 : t, sure: timed ? t : 0, agirlik: r.agirlik == null ? '' : r.agirlik, dinlen: timed ? 60 : 90 });
}

/** Hareketin geçmiş satırları, yeniden eskiye. */
export const historyOf = (gecmis, ad) => (gecmis || []).filter((r) => r.hareket === ad).sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0));

/**
 * İlerleme önerisi (son sefere göre). { text, warn, tekrar, agirlik } — tekrar/agirlik önerilen değer.
 * RPE ≤ 8 ve MSI ≤ 0,5 → +2,5 kg (ağırlıklıysa) ya da +1 tekrar; RPE ≥ 9,5 ya da MSI ≥ 1,5 → aynı + ⚠.
 * Son iki idmanda MSI ≥ 1,5 → ⚠ (puanı düşer, gizlenmez).
 */
/** Kg ilerlemesi anlamsız ekipman (bant, vücut ağırlığı): öneri tekrar artışıdır. */
export const kgsizEkipman = (e) => /band|bant|bodyweight|vücut|vucut/i.test(String(e || ''));

export function oneri(gecmis, ad, { ekipman = '' } = {}) {
  const h = historyOf(gecmis, ad);
  if (!h.length) return null;
  const r = h[0];
  const msi = Number(r.msi) || 0;
  const rpe = r.rpe == null ? null : Number(r.rpe);
  const agrili2 = h.length >= 2 && (Number(h[0].msi) || 0) >= 1.5 && (Number(h[1].msi) || 0) >= 1.5;
  const base = fromHistory(r);
  const res = { tarih: r.tarih, rpe, msi, warn: agrili2 || msi >= 1.5 || (rpe != null && rpe >= 9.5), agrili: agrili2, tekrar: base.tekrar, sure: base.sure, agirlik: base.agirlik, text: 'aynı' };
  if (res.warn) res.text = 'aynı ⚠';
  else if (rpe != null && rpe <= 8 && msi <= 0.5) {
    if (typeof base.agirlik === 'number' && base.agirlik > 0 && !kgsizEkipman(ekipman)) { res.agirlik = base.agirlik + 2.5; res.text = '+2,5 kg'; }
    else if (base.sure) { res.sure = base.sure + 5; res.text = '+5 sn'; }
    else { res.tekrar = base.tekrar + 1; res.text = '+1 tekrar'; }
  }
  return res;
}

// ---------------------------------------------------------------------------
// Planlama: kas grubu dağılımı ve hareket puanı
// ---------------------------------------------------------------------------

/** Hareketin kas gruplarına payı (hkEtki oranları, toplamı 1). { grup: pay } */
export function grupPay(etki, ad) {
  const by = {};
  let sum = 0;
  for (const e of etki || []) {
    if (e.ad !== ad || !(Number(e.oran) > 0)) continue;
    by[e.grup] = (by[e.grup] || 0) + Number(e.oran);
    sum += Number(e.oran);
  }
  if (sum > 0) for (const g of Object.keys(by)) by[g] /= sum;
  return by;
}

/** Kas grubu dağılımı (%; set sayısıyla ağırlıklı). from verilirse o tarihten sonrası. */
export function dagilim(gecmis, etki, from = '') {
  const tot = {};
  let all = 0;
  for (const r of gecmis || []) {
    if (from && r.tarih < from) continue;
    const sets = Number(r.set) || 1;
    for (const [g, p] of Object.entries(grupPay(etki, r.hareket))) {
      tot[g] = (tot[g] || 0) + p * sets;
      all += p * sets;
    }
  }
  const out = {};
  for (const g of Object.keys(tot)) out[g] = all ? Math.round((tot[g] / all) * 1000) / 10 : 0;
  return out;
}

/** Katalogdaki tüm kas grupları (hkEtki'de geçen), alfabetik. */
export const gruplar = (etki) => [...new Set((etki || []).map((e) => e.grup).filter(Boolean))].sort();

/**
 * Hareket listesi, puana göre. oncelik: { grup: ağırlık } (boşsa tüm gruplar 1).
 * Puan = Σ(öncelik × etki payı) × yüzme aktarım katsayısı (yoksa 0,5); son iki idmanda
 * MSI ≥ 1,5 olan hareketin puanı yarıya iner (gizlenmez). 0–100'e ölçeklenir.
 * Süzgeçler: amac[], ekipman[] (boşsa hepsi), stcMin.
 */
export function puanla(d, { oncelik = {}, amac = [], ekipman = [], stcMin = 0, haric = [] } = {}) {
  const any = Object.values(oncelik).some((v) => v > 0);
  const rows = [];
  for (const k of d.katalog || []) {
    if (haric.includes(k.ad)) continue;
    if (amac.length && !amac.includes(k.amac)) continue;
    if (ekipman.length && !ekipman.includes(k.ekipman)) continue;
    const stc = k.stc == null ? 0.5 : k.stc;
    if (stc < stcMin) continue;
    const pay = grupPay(d.etki, k.ad);
    const hedef = Object.entries(pay).reduce((a, [g, p]) => a + p * (any ? (oncelik[g] || 0) : 1), 0);
    if (any && hedef <= 0) continue;
    const o = oneri(d.gecmis, k.ad);
    const ham = hedef * stc * (o && o.agrili ? 0.5 : 1);
    rows.push({ ad: k.ad, amac: k.amac, ekipman: k.ekipman, stc: k.stc, video: k.video, pay, ham, oneri: o, son: historyOf(d.gecmis, k.ad)[0] || null });
  }
  const max = Math.max(0, ...rows.map((r) => r.ham));
  for (const r of rows) r.puan = max ? Math.round((r.ham / max) * 100) : 0;
  return rows.sort((a, b) => b.ham - a.ham || a.ad.localeCompare(b.ad));
}

/**
 * 13.6 (P3): aynı ana kas grubunu çalıştıran, kısıta uygun ve ekipmanı olan alternatifler.
 * Benzerlik = kas payı örtüşmesi (her gruptaki küçük payların toplamı) × yüzme aktarımı; ağrılı geçmiş yarım puan.
 * opts: { haric: [ad], ekipman: [izinli ekipman] (boş = hepsi), uygun: (ad) => bool (kısıt), n }
 * → [{ ad, ekipman, benzer (0–100), neden }]
 */
export function alternatifler(d, ad, { haric = [], ekipman = [], uygun = () => true, n = 3 } = {}) {
  if (!d) return [];
  const p0 = grupPay(d.etki, ad);
  const ana = Object.entries(p0).sort((a, b) => b[1] - a[1])[0];
  if (!ana) return [];
  const out = [];
  for (const k of d.katalog || []) {
    if (k.ad === ad || haric.includes(k.ad)) continue;
    if (ekipman.length && !ekipman.includes(k.ekipman)) continue;
    const p = grupPay(d.etki, k.ad);
    if (!(p[ana[0]] > 0)) continue;
    const ust = Object.entries(p).sort((a, b) => b[1] - a[1])[0][0];
    if (ust !== ana[0]) continue; // ana grubu aynı olmalı
    if (!uygun(k.ad)) continue;
    const ortak = Object.keys(p0).reduce((a, g) => a + Math.min(p0[g], p[g] || 0), 0);
    const o = oneri(d.gecmis, k.ad);
    const stc = k.stc == null ? 0.5 : k.stc;
    out.push({ ad: k.ad, ekipman: k.ekipman, skor: ortak * (0.5 + stc / 2) * (o && o.agrili ? 0.5 : 1), benzer: Math.round(ortak * 100) });
  }
  return out.sort((a, b) => b.skor - a.skor || a.ad.localeCompare(b.ad)).slice(0, n)
    .map(({ skor, ...x }) => ({ ...x, neden: `aynı ana grup · kas örtüşmesi %${x.benzer} · kısıta uygun${ekipman.length ? ' · ekipman var' : ''}` }));
}

/** Plan hareketi: son yapılan değerler + ilerleme önerisi (⚠ varsa aynı). uygula: false → yalnız son değerler. */
export function planHareket(d, ad, { bodyweight = false, uygula = true, ekipman = '' } = {}) {
  const last = historyOf(d.gecmis, ad)[0];
  const x = last ? fromHistory(last) : hareket({ ad, set: 3, tekrar: 10, sure: isTimed(ad) ? 30 : 0, agirlik: bodyweight ? VUCUT : '' });
  if (isTimed(ad) && !x.sure) { x.sure = 30; x.tekrar = 1; }
  return uygula ? uygulaOneri(x, oneri(d.gecmis, ad, { ekipman })) : x;
}

/** Öneriyi plan hareketine uygular (⚠ ya da "aynı" ise dokunmaz); geri almak için x._oneri = { text, onceki }. */
export function uygulaOneri(x, o) {
  if (!o || o.warn || o.text === 'aynı') return x;
  const onceki = { tekrar: x.tekrar, agirlik: x.agirlik, sure: x.sure };
  x.tekrar = o.tekrar; x.agirlik = o.agirlik; if (o.sure) x.sure = o.sure;
  if (x.tekrar !== onceki.tekrar || x.agirlik !== onceki.agirlik || x.sure !== onceki.sure) x._oneri = { text: o.text, onceki };
  return x;
}

/** Son idmanı tekrarlarken: her harekete geçmişe göre öneri uygulanır (kopyalar). */
export const oneriUygula = (gecmis, hareketler, ekipmanOf = () => '') => hareketler.map((h) => uygulaOneri({ ...h }, oneri(gecmis, h.ad, { ekipman: ekipmanOf(h.ad) })));

/** Uygulanabilir artış önerileri (⚠ ve "aynı" hariç): [{ i, ad, text, o }] — idman başında sorulur. */
export function oneriListesi(gecmis, hareketler, ekipmanOf = () => '') {
  return hareketler.map((h, i) => ({ i, ad: h.ad, o: oneri(gecmis, h.ad, { ekipman: ekipmanOf(h.ad) }) }))
    .filter((x) => x.o && !x.o.warn && x.o.text !== 'aynı').map((x) => ({ ...x, text: x.o.text }));
}

/** Uygulanan öneriyi geri alır (önceki değerler). */
export function oneriGeriAl(x) {
  if (!x._oneri) return x;
  Object.assign(x, x._oneri.onceki);
  delete x._oneri;
  return x;
}

/** Süre tahmini (sn): set × (tekrar × 3 sn + 60 sn); süreli harekette set × (süre + 30 sn). */
export const tahminSn = (list) => list.reduce((a, x) => a + x.set * (x.sure ? x.sure + 30 : x.tekrar * 3 + 60), 0);

const sureSn = (v) => { const m = /^(?:(\d+):)?(\d+):(\d{2})(?:[.,]\d+)?$/.exec(String(v || '').trim()); return m ? (Number(m[1]) || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0; };

/**
 * Gerçekleşen sürelerden öğrenen tahmin: idman satırlarının Süre sütunu (hareketin ilk set başı → son set sonu)
 * formül tahminiyle kıyaslanır. Hareketin son 5 kaydının oranı, yoksa tüm hareketlerin ortanca oranı (0,5–2 arası).
 * Süre sütunu boşsa formül. → { sn, ogrenilen: n (oranı geçmişten gelen hareket sayısı) }
 */
export function tahminOgren(list, gecmis = []) {
  const oran = (r) => {
    const gs = sureSn(r.sure);
    if (!gs || !(Number(r.set) > 0)) return null;
    const timed = isTimed(r.hareket, r.aciklama);
    const f = tahminSn([{ set: Number(r.set), tekrar: Number(r.tekrar) || 1, sure: timed ? Number(r.tekrar) || 30 : 0 }]);
    return f ? gs / f : null;
  };
  const tum = (gecmis || []).map((r) => ({ r, o: oran(r) })).filter((x) => x.o);
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[b.length >> 1] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };
  const genel = med(tum.map((x) => x.o));
  const kis = (v) => Math.max(0.5, Math.min(2, v));
  let n = 0;
  const sn = list.reduce((a, x) => {
    const kendi = tum.filter((y) => y.r.hareket === x.ad).sort((p, q) => (p.r.tarih < q.r.tarih ? 1 : -1)).slice(0, 5).map((y) => y.o);
    const o = kendi.length ? med(kendi) : genel;
    if (o != null) n += 1;
    return a + tahminSn([x]) * (o == null ? 1 : kis(o));
  }, 0);
  return { sn: Math.round(sn), ogrenilen: n };
}

// ---------------------------------------------------------------------------
// Sürüm 12: önleyici doz (haftalık en az), rekor, hacim
// ---------------------------------------------------------------------------

/** Yüzücü için haftalık önleyici kategoriler. grup: haritadaki grup anahtarları (grup.js). */
export const ONLEYICI = [
  { key: 'omuz', ad: 'Omuz önleyici', hedef: 2, grup: [], re: /external rotation|internal rotation|face pull|pull[- ]?apart|\by[- ]?t[- ]?w\b|scap|rotator|dislocat|prone [ytw]\b/i },
  { key: 'kalca', ad: 'Kalça stabilite', hedef: 1, grup: ['Kalça yanı'], re: /abduct|clam|monster|lateral walk|side plank|hip hike|glute med/i },
  { key: 'core', ad: 'Core', hedef: 1, grup: ['Karın'], re: /plank|dead bug|pallof|bird dog|hollow|crunch|\bab\b/i },
];

/** Hareketin önleyici kategorisi ('omuz' | 'kalca' | 'core' | null). hpay: haritadaki grup payları. */
export function onleyiciKat(ad, hpay = {}) {
  for (const o of ONLEYICI) if (o.re.test(String(ad || ''))) return o.key;
  const ana = Object.entries(hpay).sort((a, b) => b[1] - a[1])[0];
  if (ana && ana[1] >= 0.5) for (const o of ONLEYICI) if (o.grup.includes(ana[0])) return o.key;
  return null;
}

/** Pazartesi (YYYY-MM-DD). */
export function haftaBasi(tarih) {
  const [y, m, d] = tarih.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/**
 * Bu haftanın önleyici durumu: [{ key, ad, hedef, yapilan, acik }]. Bir gün içinde kategori bir kez sayılır.
 * rows: [{ tarih, hareket }] (tablo geçmişi + bugünün idmanı); hpayOf(ad) → haritadaki grup payları.
 */
export function onleyiciDurum(rows, bugun, hpayOf = () => ({})) {
  const bas = haftaBasi(bugun);
  const gun = {};
  for (const r of rows || []) {
    if (!r || r.tarih < bas || r.tarih > bugun) continue;
    const k = onleyiciKat(r.hareket, hpayOf(r.hareket));
    if (k) (gun[k] = gun[k] || new Set()).add(r.tarih);
  }
  return ONLEYICI.map((o) => { const y = gun[o.key] ? gun[o.key].size : 0; return { key: o.key, ad: o.ad, hedef: o.hedef, yapilan: y, acik: y < o.hedef }; });
}

/** Tahmini 1 tekrar maksimum (Epley): ağırlık × (1 + tekrar/30); ağırlık yoksa null. */
export const birRM = (kg, tekrar) => (typeof kg === 'number' && kg > 0 && tekrar > 0 ? Math.round(kg * (1 + tekrar / 30) * 10) / 10 : null);

/** Satırın en iyi tekrarı / süresi ("Setler: 11-9-9" varsa en büyüğü). */
const enIyi = (r) => { const s = parseSetler(r.aciklama); return s && s.length ? Math.max(...s) : Number(r.tekrar) || 0; };

/**
 * Bugünkü hareket satırı (payload satırı) geçmişe göre rekor mu? [{ tur, metin, onceki }]
 * tur: 'agirlik' (en ağır), 'tekrar' (aynı ya da daha ağır ağırlıkta en çok tekrar), 'sure', '1rm'.
 */
export function rekorlar(gecmis, x) {
  const h = (gecmis || []).filter((r) => r.hareket === x.hareket && r.tarih < x.tarih);
  if (!h.length) return [];
  const out = [];
  const kg = typeof x.agirlik === 'number' ? x.agirlik : null;
  const best = enIyi(x);
  const timed = isTimed(x.hareket, x.aciklama);
  const kgs = h.map((r) => (typeof r.agirlik === 'number' ? r.agirlik : null)).filter((v) => v != null);
  if (kg != null && kgs.length && kg > Math.max(...kgs)) out.push({ tur: 'agirlik', metin: `En ağır: ${fmtN(kg)} kg × ${fmtN(best)}`, onceki: `${fmtN(Math.max(...kgs))} kg` });
  else if (timed) {
    const prev = Math.max(...h.map(enIyi));
    if (best > prev) out.push({ tur: 'sure', metin: `En uzun: ${fmtN(best)} sn`, onceki: `${fmtN(prev)} sn` });
  } else {
    const ayni = h.filter((r) => (kg == null ? typeof r.agirlik !== 'number' : typeof r.agirlik === 'number' && r.agirlik >= kg));
    if (ayni.length) {
      const prev = Math.max(...ayni.map(enIyi));
      if (best > prev) out.push({ tur: 'tekrar', metin: `En çok tekrar: ${fmtN(best)}${kg != null ? ` @ ${fmtN(kg)} kg` : ''}`, onceki: `${fmtN(prev)}` });
    }
  }
  const rm = birRM(kg, best);
  const prevRm = Math.max(0, ...h.map((r) => birRM(typeof r.agirlik === 'number' ? r.agirlik : null, enIyi(r)) || 0));
  if (rm && prevRm && rm > prevRm && !out.some((o) => o.tur === 'agirlik')) out.push({ tur: '1rm', metin: `Tahmini 1RM: ${fmtN(rm)} kg`, onceki: `${fmtN(prevRm)} kg` });
  return out;
}

/** Hacim (kg): Σ set × tekrar × ağırlık (yalnızca kilolu hareketler). */
export const hacim = (rows) => Math.round((rows || []).reduce((a, r) => a + (typeof r.agirlik === 'number' ? (Number(r.set) || 0) * (Number(r.tekrar) || 0) * r.agirlik : 0), 0));
