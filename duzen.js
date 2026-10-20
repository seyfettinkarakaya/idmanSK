// İdman anında plan düzenleme: değiştir / sonrasına ekle / sil, +1 tekrar.
//
// Saf modül (DOM yok). Düzenlenen plan seansta saklanır (session.setler). Her set
// ilk düzenlemede kalıcı bir anahtar (_k: notlar, düzeltmeler buna bağlı) ve planın
// özgün halini (_o) alır; idmanda eklenen setlerde _o yoktur (_yeni: true).
// Olaylar set indeksini taşıdığı için ekleme/silmede indeksler kaydırılır.

/** Düzenlenebilir alanlar (tabloya yazılan plan sütunları). */
export const FIELDS = ['blok', 'tekrar', 'mesafe', 'stil', 'tur', 'aciklama', 'hedef', 'dinlen', 'alet', 'etiket']; // 13.8: etiket (kendi sütununa yazılır, nota girmez)

const pick = (s) => Object.fromEntries(FIELDS.map((f) => [f, s[f] == null ? '' : s[f]]));

/** Setlere kalıcı anahtar ve özgün hal ekler (zaten varsa dokunmaz). keyOf(s, i): eski anahtar. */
export function keyed(setler, keyOf) {
  return setler.map((s, i) => (s._k ? s : { ...s, _k: keyOf(s, i), _o: pick(s) }));
}

let seq = 0;
/** İdmanda eklenen set: sırası yok, kalıcı anahtarı benzersiz. */
export function newSet(fields, now = Date.now()) {
  seq += 1;
  return { ...pick(fields), sira: null, _k: `e${now.toString(36)}${seq}`, _yeni: true };
}

/** Olaylardaki set indeksleri: at ve sonrası +d. */
function shift(events, at, d) {
  return events.map((e) => (e.set != null && e.set >= at ? { ...e, set: e.set + d } : e));
}

/** i. setin arkasına ekler. { setler, events, pos } döner. */
export function insertAfter({ setler, events, pos }, i, set) {
  const at = i + 1;
  return {
    setler: [...setler.slice(0, at), set, ...setler.slice(at)],
    events: shift(events, at, 1),
    pos: pos >= at ? pos + 1 : pos,
  };
}

/** Başlanmamış i. seti siler (olayı varsa hata). { setler, events, pos } döner. */
export function removeAt({ setler, events, pos }, i) {
  if (events.some((e) => e.set === i)) throw new Error('Başlanmış set silinemez.');
  if (setler.length < 2) throw new Error('Tek set silinemez.');
  const rest = events.map((e) => (e.set != null && e.set > i ? { ...e, set: e.set - 1 } : e));
  return {
    setler: [...setler.slice(0, i), ...setler.slice(i + 1)],
    events: rest,
    pos: pos > i ? pos - 1 : Math.min(pos, setler.length - 2),
  };
}

const short = (v) => String(v == null ? '' : v).replace(/^0(\d:)/, '$1').replace(/^00:/, '0:') || '—';
const same = (a, b) => String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim();

/** Özgün plana göre değişen alanlar ({ alan: yeni }) ya da null. */
export function changes(set) {
  if (!set || !set._o) return null;
  const out = {};
  for (const f of FIELDS) if (!same(set[f], set._o[f])) out[f] = set[f];
  return Object.keys(out).length ? out : null;
}

/** Not sütununa yazılan plan farkı: "Plan: 4×100 → 6×100, Hedef 1:30 → 1:25" ya da "idmanda eklendi". */
export function planNote(set) {
  if (!set) return '';
  if (set._yeni) return 'idmanda eklendi';
  const c = changes(set);
  if (!c) return '';
  const o = set._o;
  const parts = [];
  if ('tekrar' in c || 'mesafe' in c) parts.push(`${o.tekrar}×${o.mesafe} → ${set.tekrar}×${set.mesafe}`);
  const label = { stil: 'Stil', tur: 'Tür', hedef: 'Hedef', dinlen: 'Dinlen', alet: 'Alet', blok: 'Blok' };
  for (const f of ['stil', 'tur', 'hedef', 'dinlen', 'alet', 'blok']) {
    if (f in c) parts.push(`${label[f]} ${short(o[f])} → ${short(set[f])}`);
  }
  if ('aciklama' in c) parts.push('açıklama değişti');
  return parts.length ? `Plan: ${parts.join(', ')}` : ''; // yalnız etiket değiştiyse not yok
}

/** Tabloya giden set: özgün setlerde değişen alanlar, eklenen setlerde tüm alanlar. */
export function payloadFields(set) {
  if (set._yeni) return { eklendi: true, plan: pick(set) };
  const c = changes(set);
  return c ? { plan: c } : {};
}

/**
 * Düzenleme kısıtları. done: yapılan tekrar, started: tekrarı başladı mı,
 * finished: set bitti mi, swimming: şu an yüzülüyor mu (herhangi bir set).
 */
export function rules({ done, started, finished, swimming }) {
  return {
    canEdit: !swimming && !finished,
    canInsert: !swimming,
    canDelete: !swimming && !started,
    minTekrar: Math.max(1, done),
    // Başlamış sette mesafe/stil değişirse yapılan tekrarlar eski haliyle kalır, kalanı yeni set olur.
    splitFields: started ? ['mesafe', 'stil'] : [],
  };
}
