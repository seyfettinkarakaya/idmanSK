// idmanSK — veri erişim katmanı.
//
// Arayüz kodu Apps Script'e, localStorage'a veya kuyruğa doğrudan dokunmaz;
// hepsi bu modülden geçer. Faz 2'de yeni veri kaynakları (Garmin vb.) buraya
// yeni fonksiyonlar olarak eklenir.

const KEYS = {
  config: 'ysk.config',
  dates: 'ysk.dates',
  plans: 'ysk.plans',
  session: 'ysk.session',
  queue: 'ysk.queue',
  history: 'ysk.history', // telefonda saklanan biten seanslar (elle silinir)
  prefs: 'ysk.prefs',
  kutuphane: 'ysk.kutuphane', // 13.4: idmanKutuphane (hareket kataloğu, kas etkileri)
  ref: 'ysk.ref',               // sporRef verisi (CSS, bölgeler, RPE/MSI tanımları)
  salon: 'ysk.salon',           // SalonTakip verisi (katalog, kas etkileri, geçmiş)
  salonSession: 'ysk.salonSession',
  salonPlan: 'ysk.salonPlan',   // kaydedilmiş salon planı (ana sayfada "Hazır plan"), yalnızca telefonda
  hazir: 'ysk.hazir',           // (sürüm 13) günlük hazır olma kontrolü { 'YYYY-MM-DD': { uyku, agri, enerji, eklem } }
  hareketNot: 'ysk.hareketNot', // (sürüm 13) harekete sabit not ve ağırlık adımı { ad: { not, adim } }
};

// Bağlantılar: her tablonun kendi Apps Script'i, adresi ve anahtarı vardır.
export const TARGETS = ['yuzme', 'salon', 'ref'];

const REQUEST_TIMEOUT_MS = 30000;
const SLOW_TIMEOUT_MS = 60000; // getSalon: salonVeri birleşik idman dosyasında

// Bu hatalar geçicidir: kayıt kuyruğa alınır ve sonra yeniden denenir.
const TRANSIENT_CODES = new Set(['NETWORK', 'HTTP', 'BAD_RESPONSE', 'LOCKED', 'SERVER', 'TIMEOUT']);

export class ApiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }

  get transient() {
    return TRANSIENT_CODES.has(this.code);
  }
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ayarlar (Apps Script adresi + token)
// ---------------------------------------------------------------------------

// Saklama biçimi: { apiUrl, token, salon: { apiUrl, token }, ref: { apiUrl, token } }
// (yüzme bağlantısı eski sürümlerle uyum için en üst düzeyde kalır).
function pick(c) {
  return {
    apiUrl: c && typeof c.apiUrl === 'string' ? c.apiUrl : '',
    token: c && typeof c.token === 'string' ? c.token : '',
  };
}

export function getConfig(target = 'yuzme') {
  const c = load(KEYS.config, null);
  if (!c || typeof c !== 'object') return pick(null);
  // 13.2: salon işlemleri de "idman" betiğinde (eski ayrı SalonTakip bağlantısı yok sayılır)
  return target === 'yuzme' || target === 'salon' ? pick(c) : pick(c[target]);
}

export function setConfig({ apiUrl, token }, target = 'yuzme') {
  const c = load(KEYS.config, null);
  const all = c && typeof c === 'object' ? c : {};
  const v = { apiUrl: String(apiUrl || '').trim(), token: String(token || '').trim() };
  if (target === 'salon') return; // salon ayrı bağlantı değil (idman betiği)
  if (target === 'yuzme') store(KEYS.config, { ...all, ...v, salon: undefined });
  else store(KEYS.config, { ...all, [target]: v.apiUrl || v.token ? v : undefined });
}

/** Adres ve anahtarı bu cihazdan siler (Anahtarı unut). Kayıtlar ve kuyruk kalır. */
export function clearConfig() {
  store(KEYS.config, null);
}

export function isConfigured(target = 'yuzme') {
  // Salon: girişler idman betiğinde, hareket kataloğu idmanRef'te → ikisi de gerekli
  if (target === 'salon') return isConfigured('yuzme') && isConfigured('ref');
  const c = getConfig(target);
  return Boolean(c.apiUrl && c.token);
}

// ---------------------------------------------------------------------------
// Tercihler (ses, CSS temposu)
// ---------------------------------------------------------------------------

// css: 100 m kritik yüzme hızı (sn); havuz: son seansın havuz uzunluğu (m)
const DEFAULT_PREFS = { ses: true, css: null, havuz: 25 }; // CSS varsayılanı yok: kullanıcı girer ya da sporRef

export function getPrefs() {
  const p = load(KEYS.prefs, null);
  const out = { ...DEFAULT_PREFS };
  if (p && typeof p === 'object') {
    if (typeof p.ses === 'boolean') out.ses = p.ses;
    if (p.css === null || (typeof p.css === 'number' && p.css > 0)) out.css = p.css;
    if (p.havuz === 25 || p.havuz === 50) out.havuz = p.havuz;
    if (p.yer === 'Ev' || p.yer === 'Otel') out.yer = p.yer; // yalnızca ayarlandıysa (sürüm 13)
    if (p.bildirim === true) out.bildirim = true;
    if (typeof p.blokBas === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.blokBas)) out.blokBas = p.blokBas; // yalnızca ayarlandıysa
    if (p.karaYorgunluk === true) out.karaYorgunluk = true; // 13.5 (B17): kara yükü yalnız yorgunluğa
    if (p.tema === 'acik' || p.tema === 'sistem') out.tema = p.tema; // 13.6: varsayılan koyu
    if ([0.9, 1.12, 1.25].includes(p.yazi)) out.yazi = p.yazi; // 13.6: yazı boyutu (varsayılan 1)
  }
  return out;
}

export function setPrefs(patch) {
  store(KEYS.prefs, { ...getPrefs(), ...patch });
}

// ---------------------------------------------------------------------------
// Apps Script çağrısı
// ---------------------------------------------------------------------------

async function call(action, body = {}, target = 'yuzme', timeoutMs = REQUEST_TIMEOUT_MS) {
  const { apiUrl, token } = getConfig(target);
  if (!apiUrl || !token) throw new ApiError('NO_CONFIG', 'Sunucu adresi veya anahtar tanımlı değil.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    // text/plain: CORS ön kontrolü (preflight) tetiklenmesin diye.
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, action, token }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') throw new ApiError('TIMEOUT', 'Sunucu zamanında cevap vermedi.');
    throw new ApiError('NETWORK', 'Bağlantı kurulamadı.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new ApiError('HTTP', `Sunucu hatası (${res.status}).`);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('BAD_RESPONSE', 'Sunucudan geçersiz cevap geldi. Adres doğru mu?');
  }
  if (!json || !json.ok) throw new ApiError((json && json.error) || 'UNKNOWN', json && json.message);
  return json.data;
}

// ---------------------------------------------------------------------------
// Tarihler ve program
// ---------------------------------------------------------------------------

/** Tarih listesini dizi olarak döndürür; tanınmayan biçimde null. */
function asDateList(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.dates)) return v.dates;
  return null;
}

/** { dates, fromCache, error } döner. Ağ yoksa son yüklenen liste kullanılır. */
export async function getDates() {
  try {
    const raw = await call('getDates');
    const list = asDateList(raw);
    if (!list) {
      throw new ApiError('BAD_RESPONSE', `Tarih listesi beklenmeyen biçimde geldi: ${JSON.stringify(raw).slice(0, 120)}`);
    }
    // Yeni Code.gs her günün tüm setlerini (detay) de gönderir: programlar
    // önbelleğe alınır, gün açılırken ayrı istek beklenmez. Detay tarih
    // listesinde tutulmaz (önbellek küçük kalsın).
    const dates = list.filter((d) => d && typeof d.tarih === 'string').map(({ detay, ...rest }) => rest);
    store(KEYS.dates, { dates, savedAt: Date.now() });
    prunePlans(dates.map((d) => d.tarih));
    cachePlansFrom(list);
    return { dates, fromCache: false, error: null };
  } catch (err) {
    const cached = getCachedDates();
    if (cached && err.transient) return { dates: cached, fromCache: true, error: err };
    throw err;
  }
}

export function getCachedDates() {
  const cached = load(KEYS.dates, null);
  return cached ? asDateList(cached.dates) : null;
}

/** getDates'in detay alanındaki programları önbelleğe yazar (devam eden seansın günü hariç). */
function cachePlansFrom(list) {
  const session = loadSession();
  const plans = loadPlans();
  let changed = false;
  for (const d of list) {
    if (!d || typeof d.tarih !== 'string' || !Array.isArray(d.detay) || !d.detay.length) continue;
    if (session && session.tarih === d.tarih) continue; // seansın programı seans boyunca sabit
    plans[d.tarih] = { tarih: d.tarih, setler: d.detay, savedAt: Date.now() };
    changed = true;
  }
  if (changed) store(KEYS.plans, plans);
}

/** Programı sunucudan alır; önbelleğe yazmaz. */
export async function fetchPlan(tarih) {
  const plan = await call('getPlan', { tarih });
  if (!plan || !Array.isArray(plan.setler)) {
    throw new ApiError('BAD_RESPONSE', `Program beklenmeyen biçimde geldi: ${JSON.stringify(plan).slice(0, 120)}`);
  }
  return plan;
}

export function storePlan(plan) {
  const plans = loadPlans();
  plans[plan.tarih] = { ...plan, savedAt: Date.now() };
  store(KEYS.plans, plans);
}

/** { plan, fromCache, error } döner. Ağ yoksa o günün son yüklenen kopyası kullanılır. */
export async function getPlan(tarih) {
  try {
    const plan = await fetchPlan(tarih);
    storePlan({ ...plan, tarih });
    return { plan, fromCache: false, error: null };
  } catch (err) {
    const cached = getCachedPlan(tarih);
    if (cached && err.transient) return { plan: cached, fromCache: true, error: err };
    throw err;
  }
}

export function getCachedPlan(tarih) {
  const p = loadPlans()[tarih];
  return p && Array.isArray(p.setler) ? p : null;
}

function loadPlans() {
  const plans = load(KEYS.plans, {});
  return plans && typeof plans === 'object' && !Array.isArray(plans) ? plans : {};
}

function prunePlans(keepDates) {
  const keep = new Set(keepDates);
  const session = loadSession();
  if (session) keep.add(session.tarih);
  const plans = loadPlans();
  for (const k of Object.keys(plans)) if (!keep.has(k)) delete plans[k];
  store(KEYS.plans, plans);
}

/** Kaydedilen (veya kuyruğa alınan) bir günü yerel listelerden çıkarır. */
/** 13.9: yalnızca günün program önbelleği (kalan setler sunucudan yeniden alınır; gün listede kalır). */
export function forgetPlan(tarih) {
  const plans = loadPlans();
  delete plans[tarih];
  store(KEYS.plans, plans);
}

export function forgetDate(tarih) {
  const dates = getCachedDates();
  if (dates) store(KEYS.dates, { dates: dates.filter((d) => d && d.tarih !== tarih), savedAt: Date.now() });
  else store(KEYS.dates, null); // bozuk önbellek: at, sunucudan yeniden yüklenir
  const plans = loadPlans();
  delete plans[tarih];
  store(KEYS.plans, plans);
}

// ---------------------------------------------------------------------------
// Devam eden seans
// ---------------------------------------------------------------------------

/**
 * Devam eden seans. Sürüm 10 biçimi: { v: 2, tarih, events: [...] }.
 * Eski biçim (done/results/sw) de kabul edilir; arayüz yeni modele taşır.
 */
export function loadSession() {
  const s = load(KEYS.session, null);
  if (!s || typeof s !== 'object' || typeof s.tarih !== 'string') return null;
  if (s.v === 2) {
    const okEvents = Array.isArray(s.events) && s.events.every((e) => e && typeof e.t === 'string' && typeof e.ts === 'number');
    return okEvents ? s : null;
  }
  const legacy = s.done && typeof s.done === 'object' && s.results && typeof s.results === 'object' &&
    s.sw && Array.isArray(s.sw.laps);
  return legacy ? s : null;
}

export function saveSession(session) {
  store(KEYS.session, session);
}

export function clearSession() {
  store(KEYS.session, null);
}

// ---------------------------------------------------------------------------
// Telefonda yapılmış idmanlar
//
// Biten her seans (gönderilen, kuyruğa alınan veya zaten kayıtlı çıkan) burada
// saklanır ve yalnızca kullanıcı "Yapılmış idmanlar" sayfasından silince gider.
// status: 'sent' | 'queued' | 'duplicate'
// ---------------------------------------------------------------------------

export function getHistory() {
  const h = load(KEYS.history, []);
  if (!Array.isArray(h)) return [];
  return h.filter((x) => x && typeof x.id === 'string' && typeof x.tarih === 'string'
    && (turOf(x) === 'salon' ? Array.isArray(x.hareketler) : Array.isArray(x.setler)));
}

/** Kayıt türü: 'salon' ya da 'yuzme' (eski kayıtlarda tur yok). */
const turOf = (x) => (x && x.tur === 'salon' ? 'salon' : 'yuzme');

/** Kaydı ekler; aynı gün ve türün eski kaydı varsa yerine geçer. Yazılamazsa false. */
export function addHistory(record) {
  const list = getHistory().filter((x) => !(x.tarih === record.tarih && turOf(x) === turOf(record)));
  list.push(record);
  list.sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0));
  return store(KEYS.history, list);
}

export function removeHistory(ids) {
  const drop = new Set(ids);
  store(KEYS.history, getHistory().filter((x) => !drop.has(x.id)));
}

function markHistory(tarih, status, tur = 'yuzme') {
  const list = getHistory();
  const x = list.find((r) => r.tarih === tarih && turOf(r) === tur);
  if (!x || x.status === 'sent') return;
  x.status = status;
  x.sentAt = Date.now();
  store(KEYS.history, list);
}

// ---------------------------------------------------------------------------
// Seans kaydı ve kuyruk
// ---------------------------------------------------------------------------

export function finishSession(payload) {
  return call('finishSession', payload);
}

export function getQueue() {
  const q = load(KEYS.queue, []);
  if (!Array.isArray(q)) return [];
  return q.filter((x) => x && typeof x.id === 'string' && x.payload && typeof x.payload.tarih === 'string');
}

export function enqueue(payload, error, tur = 'yuzme') {
  const queue = getQueue();
  queue.push({
    id: `${tur === 'salon' ? 's-' : ''}${payload.tarih}-${Date.now()}`,
    tur,
    payload,
    createdAt: Date.now(),
    tries: 0,
    lastError: error ? { code: error.code, message: error.message } : null,
  });
  store(KEYS.queue, queue);
}

/** 13.9: kuyruktaki kaydı aynı günün ikinci idmanı olarak işaretler (SAME_DAY onayı). */
export function markQueueIkinci(id) {
  const queue = getQueue();
  const q = queue.find((x) => x.id === id);
  if (!q) return false;
  q.payload = { ...q.payload, ikinci: true };
  q.lastError = null;
  store(KEYS.queue, queue);
  return true;
}

export function removeFromQueue(id) {
  store(KEYS.queue, getQueue().filter((q) => q.id !== id));
}

let flushing = null;

/**
 * Kuyruktaki kayıtları sırayla göndermeyi dener.
 * Başarılı ve DUPLICATE (zaten kaydedilmiş) olanlar kuyruktan çıkar.
 * Ağ hatasında durur. { sent, duplicates, remaining } döner.
 */
export function flushQueue() {
  if (flushing) return flushing;
  flushing = (async () => {
    const result = { sent: [], duplicates: [], remaining: 0 };
    for (const item of getQueue()) {
      const tur = turOf(item);
      if (!isConfigured(tur)) continue;
      try {
        const data = tur === 'salon' ? await saveSalon(item.payload) : await finishSession(item.payload);
        removeFromQueue(item.id);
        if (tur === 'yuzme') forgetDate(item.payload.tarih);
        markHistory(item.payload.tarih, 'sent', tur);
        result.sent.push({ tarih: item.payload.tarih, tur, data });
      } catch (err) {
        if (err.code === 'DUPLICATE') {
          removeFromQueue(item.id);
          if (tur === 'yuzme') forgetDate(item.payload.tarih);
          markHistory(item.payload.tarih, 'duplicate', tur);
          result.duplicates.push({ tarih: item.payload.tarih, tur });
          continue;
        }
        const queue = getQueue();
        const q = queue.find((x) => x.id === item.id);
        if (q) {
          q.tries += 1;
          q.lastError = { code: err.code, message: err.message };
          store(KEYS.queue, queue);
        }
        if (err.code === 'NETWORK' || err.code === 'TIMEOUT') break;
      }
    }
    result.remaining = getQueue().length;
    return result;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

// ---------------------------------------------------------------------------
// sporRef (salt okuma): CSS, bölgeler, RPE/MSI tanımları. Son başarılı cevap
// telefonda saklanır; bağlantı yoksa saklanan kullanılır.
// ---------------------------------------------------------------------------

const validRef = (d) => Boolean(d && Array.isArray(d.css) && Array.isArray(d.zones));
const validSalon = (d) => Boolean(d && Array.isArray(d.katalog) && Array.isArray(d.etki) && Array.isArray(d.gecmis));

/** Cevap beklenen biçimde değilse (yanlış betik, eski dağıtım) BAD_RESPONSE; önbelleğe yazılmaz. */
export async function getRef() {
  const data = await call('getRef', {}, 'ref');
  if (!validRef(data)) throw new ApiError('BAD_RESPONSE', 'idmanRef cevabı beklenen biçimde değil. Adres idmanRef betiğinin mi (idmanRef.gs), yeni sürüm dağıtıldı mı?');
  store(KEYS.ref, { data, savedAt: Date.now() });
  return data;
}

export function getCachedRef() {
  const r = load(KEYS.ref, null);
  return r && validRef(r.data) ? r : null;
}

/** CSS testi sonucu: sporRef css sayfasına yeni satır (SporRef.gs addCss; eski satırlara dokunmaz). */
export function addCss(payload) {
  return call('addCss', payload, 'ref');
}

// ---------------------------------------------------------------------------
// Salon (SalonTakip)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// idmanKutuphane (13.4, salt okuma): hareket kataloğu (karaHareket) ve kas etkileri (karaEtki)
// ---------------------------------------------------------------------------

const validKutuphane = (d) => Boolean(d && Array.isArray(d.katalog) && Array.isArray(d.etki));

export async function getKutuphane() {
  const data = await call('getKutuphane', {}, 'kutuphane');
  if (!validKutuphane(data)) throw new ApiError('BAD_RESPONSE', 'idmanKutuphane cevabı beklenen biçimde değil. Adres idmanKutuphane betiğinin mi (idmanKutuphane.gs)?');
  store(KEYS.kutuphane, { data, savedAt: Date.now() });
  return data;
}

export function getCachedKutuphane() {
  const r = load(KEYS.kutuphane, null);
  return r && validKutuphane(r.data) ? r : null;
}

export async function getSalon() {
  if (!getCachedRef() && isConfigured('ref')) await getRef().catch(() => {}); // vücut ağırlığı (eski sürümde katalog da) idmanRef'ten
  if (!getCachedKutuphane() && isConfigured('kutuphane')) await getKutuphane().catch(() => {}); // katalog + etkiler
  const data = await call('getSalon', {}, 'salon', SLOW_TIMEOUT_MS); // büyük idman dosyası + soğuk başlangıç
  if (!validSalon(data)) throw new ApiError('BAD_RESPONSE', 'Kara idmanı cevabı beklenen biçimde değil. Adres idman betiğinin mi (idman.gs), yeni sürüm dağıtıldı mı?');
  store(KEYS.salon, { data, savedAt: Date.now() });
  return refIle(data);
}

/**
 * 13.2: hareket kataloğu (salonHar), kas etkileri (salonHKEtki) ve vücut ağırlığı (bilgi BW) idmanRef'te;
 * idman betiği bunları boş gönderir → önbellekteki idmanRef verisiyle tamamlanır.
 */
function refIle(d) {
  const r = getCachedRef();
  const x = (r && r.data) || {};
  const kt = getCachedKutuphane();
  const y = (kt && kt.data) || {};
  // 13.4: katalog ve etkiler önce idmanKutuphane'den, yoksa idmanRef'ten (eski kurulum); BW idmanRef'ten
  const al = (k, ...src) => (Array.isArray(d[k]) && d[k].length ? d[k] : (src.find((o) => Array.isArray(o[k]) && o[k].length) || {})[k] || []);
  return { ...d, katalog: al('katalog', y, x), etki: al('etki', y, x), bw: al('bw', x) };
}

export function getCachedSalon() {
  const r = load(KEYS.salon, null);
  return r && validSalon(r.data) ? { ...r, data: refIle(r.data) } : null;
}

export function saveSalon(payload) {
  return call('saveSalon', payload, 'salon');
}

/** Salon programı (sürüm 13): bir günün planını SalonTakip "plan" sayfasına yazar (boş liste = günü siler). */
export function saveSalonProgram(tarih, hareketler) {
  return call('savePlan', { tarih, hareketler }, 'salon');
}

/** Salon programı: o günün salonPlan satırlarını siler (13.10.0; saveSalon da siler). */
export function salonProgramYapildi(tarih) {
  return call('planYapildi', { tarih }, 'salon');
}

export function loadSalonSession() {
  const s = load(KEYS.salonSession, null);
  return s && typeof s === 'object' && typeof s.tarih === 'string' && Array.isArray(s.hareketler) ? s : null;
}

export function saveSalonSession(s) {
  return store(KEYS.salonSession, s);
}

export function clearSalonSession() {
  store(KEYS.salonSession, null);
}

/** Kaydedilmiş plan: { kaydedildi (ms), oncelik: {grup: 1|2}, hareketler: [...] } ya da null. */
export function loadSalonPlan() {
  const p = load(KEYS.salonPlan, null);
  return p && typeof p === 'object' && Array.isArray(p.hareketler) && p.hareketler.length ? p : null;
}

export function saveSalonPlan(p) {
  return store(KEYS.salonPlan, p);
}

export function clearSalonPlan() {
  store(KEYS.salonPlan, null);
}

// ---------------------------------------------------------------------------
// Sürüm 13: hazır olma kontrolü, harekete sabit not / ağırlık adımı, yedek
// ---------------------------------------------------------------------------

const obje = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** Günlük hazır olma kayıtları (son 60 gün tutulur). */
export const getHazir = () => obje(load(KEYS.hazir, {}));
export function setHazir(tarih, kayit) {
  const h = getHazir();
  h[tarih] = kayit;
  const keys = Object.keys(h).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete h[k];
  store(KEYS.hazir, h);
}

/** Harekete sabit not ve ağırlık adımı: { not, adim } */
export const getHareketNot = (ad) => obje(obje(load(KEYS.hareketNot, {}))[ad]);
export function setHareketNot(ad, patch) {
  const all = obje(load(KEYS.hareketNot, {}));
  const cur = { ...obje(all[ad]), ...patch };
  for (const k of Object.keys(cur)) if (cur[k] === '' || cur[k] == null) delete cur[k];
  if (Object.keys(cur).length) all[ad] = cur; else delete all[ad];
  store(KEYS.hareketNot, all);
}

/** Telefondaki tüm idmanSK verisinin yedeği (bağlantı anahtarları hariç). */
export function yedek() {
  const out = { uygulama: 'idmanSK', tarih: new Date().toISOString(), veriler: {} };
  for (const [ad, key] of Object.entries(KEYS)) {
    if (ad === 'config') continue; // anahtarlar (token) yedeğe girmez
    const v = load(key, null);
    if (v != null) out.veriler[key] = v;
  }
  return out;
}
