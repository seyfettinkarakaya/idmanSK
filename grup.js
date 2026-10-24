// Kas grupları: tablodaki (hkEtki "Muscle Group") adlar → uygulamanın 10 grubu.
// Saf işlevler (DOM yok). Renkler kas haritasıyla (tasarim/v27) aynı.
// Eski adlar (Back, Chest, Core, Abs, Legs, Glutes, Shoulders, Arms) çalışmaya devam eder.

/** Haritadaki 10 grup, gösterim sırası. */
export const GRUPLAR = [
  { key: 'Omuz', renk: '#F4C430', kas: 'Deltoid: ön, yan, arka' },
  { key: 'Göğüs', renk: '#3D6FE8', kas: 'Büyük ve küçük göğüs' },
  { key: 'Biseps', renk: '#E5423A', kas: 'Kolun ön yüzü' },
  { key: 'Triseps', renk: '#33B5F0', kas: 'Kolun arka yüzü' },
  { key: 'Ön kol', renk: '#FF8FB1', kas: 'Bilek ve kavrama kasları' },
  { key: 'Sırt', renk: '#3DB24B', kas: 'Kanat, trapez, romboid, bel' },
  { key: 'Karın', renk: '#1EC6B8', kas: 'Core: düz ve yan karın' },
  { key: 'Kalça', renk: '#D946EF', kas: 'Gluteus (kalça kasları)' },
  { key: 'Kalça yanı', renk: '#A8D838', kas: 'Kalça fleksörü ve abdüktör' },
  { key: 'Bacak', renk: '#F5862A', kas: 'Ön/arka uyluk, baldır' },
];
const BY_KEY = Object.fromEntries(GRUPLAR.map((g) => [g.key, g]));

/** Eski "Arms" grubu: haritada üç gruba yayılır. */
export const KOL = { key: 'Kol', renk: '#FB923C', kas: 'Biseps, triseps, ön kol', harita: ['Biseps', 'Triseps', 'Ön kol'] };

// Tablo adı (küçük harf) → grup anahtarı
const ALIAS = {
  shoulders: 'Omuz', shoulder: 'Omuz', deltoids: 'Omuz', delts: 'Omuz', omuz: 'Omuz',
  chest: 'Göğüs', pecs: 'Göğüs', 'göğüs': 'Göğüs',
  biceps: 'Biseps', biseps: 'Biseps',
  triceps: 'Triseps', triseps: 'Triseps',
  forearms: 'Ön kol', forearm: 'Ön kol', 'ön kol': 'Ön kol', grip: 'Ön kol',
  back: 'Sırt', 'upper back': 'Sırt', lats: 'Sırt', 'lower back': 'Sırt', traps: 'Sırt', 'sırt': 'Sırt',
  core: 'Karın', abs: 'Karın', abdominals: 'Karın', obliques: 'Karın', 'karın': 'Karın',
  glutes: 'Kalça', gluteus: 'Kalça', 'kalça': 'Kalça',
  hip: 'Kalça yanı', hips: 'Kalça yanı', abductors: 'Kalça yanı', adductors: 'Kalça yanı', 'hip flexors': 'Kalça yanı', 'kalça yanı': 'Kalça yanı',
  legs: 'Bacak', quadriceps: 'Bacak', quads: 'Bacak', hamstrings: 'Bacak', calves: 'Bacak', bacak: 'Bacak',
  arms: 'Kol', kol: 'Kol',
};

const low = (s) => String(s == null ? '' : s).trim().toLocaleLowerCase('tr');

/** Tablodaki grup adı → anahtar (Omuz … Bacak, eski "Arms" → Kol); bilinmiyorsa adın kendisi. */
export function grupKey(name) {
  const k = ALIAS[low(name)] || ALIAS[low(name).replace(/\s+/g, ' ')];
  return k || String(name == null ? '' : name).trim();
}

const info = (key) => BY_KEY[key] || (key === 'Kol' ? KOL : null);

/** Türkçe gösterim adı ("Sırt", "Kalça yanı"); bilinmeyen ad olduğu gibi. */
export const grupAd = (name) => { const i = info(grupKey(name)); return i ? i.key : String(name || ''); };

/** Grup rengi; bilinmeyen grup gri. */
export const grupRenk = (name) => { const i = info(grupKey(name)); return i ? i.renk : '#94A3B8'; };

/** Kas açıklaması (bilgi panelleri için). */
export const grupKas = (name) => { const i = info(grupKey(name)); return i ? i.kas : ''; };

/** Haritada boyanacak gruplar (Kol → Biseps, Triseps, Ön kol; bilinmeyen → []). */
export function haritaGruplari(name) {
  const k = grupKey(name);
  if (k === 'Kol') return KOL.harita.slice();
  return BY_KEY[k] ? [k] : [];
}

/** { tabloAdı: pay } → { haritaGrubu: pay } (Kol üçe bölünür, aynı grup toplanır). */
export function haritaPay(pay) {
  const out = {};
  for (const [g, p] of Object.entries(pay || {})) {
    const hs = haritaGruplari(g);
    for (const h of hs) out[h] = (out[h] || 0) + p / hs.length;
  }
  return out;
}

/** Bilinen grupların gösterim sırası (GRUPLAR, sonra Kol, sonra bilinmeyenler alfabetik). */
export function sirala(names) {
  const order = (n) => { const k = grupKey(n); const i = GRUPLAR.findIndex((g) => g.key === k); return i >= 0 ? i : k === 'Kol' ? 10 : 11; };
  return [...names].sort((a, b) => order(a) - order(b) || String(a).localeCompare(String(b), 'tr'));
}
