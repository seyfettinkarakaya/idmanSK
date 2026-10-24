// idmanSK — arayüz. Veriye yalnızca data.js üzerinden erişir.

import * as data from './data.js?v=13.11.0';
import { Wheel } from './wheel.js?v=13.11.0';
import * as zaman from './zaman.js?v=13.11.0';
import * as ref from './ref.js?v=13.11.0';
import * as duzen from './duzen.js?v=13.11.0';
import * as salon from './salon.js?v=13.11.0';
import * as grup from './grup.js?v=13.11.0';
import * as kisit from './kisit.js?v=13.11.0';
import * as yuk from './yuk.js?v=13.11.0';
import * as harita from './harita.js?v=13.11.0';
import * as bilgi from './bilgi.js?v=13.11.0';
import * as analiz from './analiz.js?v=13.11.0';
import * as video from './video.js?v=13.11.0';
import * as hazir from './hazir.js?v=13.11.0';
import { VIDEOLAR } from './videolar.js?v=13.11.0';
import * as model from './model.js?v=13.11.0';
import * as gosterge from './gosterge.js?v=13.11.0';

// Telefonun güncel kodu çalıştırıp çalıştırmadığını görmek için ekranda gösterilir.
export const APP_VERSION = '13.11.0';

const $ = (id) => document.getElementById(id);

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// key: seans sayfasına yazılan metin; label: ekranda görünen.
const MSI_BOLGELER = [
  { key: 'sag omuz', label: 'Sağ omuz' },
  { key: 'sol omuz', label: 'Sol omuz' },
  { key: 'sag diz', label: 'Sağ diz' },
  { key: 'sol diz', label: 'Sol diz' },
  { key: 'kalca', label: 'Kalça' },
  { key: 'bel', label: 'Bel' },
  { key: 'boyun', label: 'Boyun' },
];

const SCREENS = ['setup', 'home', 'days', 'history', 'program', 'rpe', 'msi', 'ozet', 'done', 'salon-start', 'salon', 'salon-ozet', 'salon-plan', 'form', 'hafta', 'salon-prog', 'bu-hafta'];
const WAKE_SCREENS = new Set(['program', 'rpe', 'msi', 'ozet', 'salon']); // salon: dinlenme sayacı görünür kalsın

const state = {
  screen: null,
  plan: null,     // { tarih, setler }
  session: null,  // data.saveSession ile saklanan devam eden seans
  wheel: null,
  dates: null,
  datesInfo: {},
  datesAt: 0,       // tarih listesinin sunucudan son alındığı an
  datesLoading: null,
  zst: null,       // zaman.replay önbelleği (her olayda sıfırlanır)
  beep: null,       // { key, marks } — çıkış sesleri bir kez çalsın
  prefs: null,      // data.getPrefs() önbelleği (her karede localStorage okunmasın)
  ticker: null,
  doneTimer: null,
  edit: null,       // şüpheli tekrar düzeltme paneli
  saving: false,
  rpeTimer: null,
  sentDates: new Set(), // bu açılışta kuyruktan gönderilen günler
  selDate: null,    // gün seçiminde seçili gün (YYYY-MM-DD)
  selKeep: false,   // kullanıcı bir gün seçtiyse yenilemede korunur
  weekStart: null,  // gösterilen haftanın pazartesisi
  suppressDayClick: false,
  opening: false,   // program sunucudan yükleniyor (çift dokunmaya karşı)
  homeNext: null,   // ana sayfadaki "İdmanı aç" düğmesinin açacağı gün
  eset: null,       // set düzenleme ekranı { mode, i, d, r, orig }
  ref: undefined,   // sporRef önbelleği (undefined: henüz okunmadı)
  zones: null,      // ref.paceZones önbelleği
};

// ---------------------------------------------------------------------------
// Biçimlendirme
// ---------------------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, '0');

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtDateTR(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${AYLAR[m - 1]} ${GUNLER[date.getDay()]}`;
}

const fmtNum = (n) => Number(n || 0).toLocaleString('tr-TR');
/** Tahmini süre: "~45 dk" / "~1 sa 47 dk". */
const fmtSure = (sn) => { const dk = Math.round((Number(sn) || 0) / 60); return dk >= 60 ? `~${Math.floor(dk / 60)} sa${dk % 60 ? ` ${dk % 60} dk` : ''}` : `~${dk} dk`; };

function fmtHMS(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor(t / 60) % 60)}:${pad2(t % 60)}`;
}

function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const mm = pad2(Math.floor(t / 60) % 60);
  return h ? `${h}:${mm}:${pad2(t % 60)}` : `${mm}:${pad2(t % 60)}`;
}

/** Gerçek alanına yazılan süre: "01:23.4" (bir saati aşarsa "1:02:03.4"). */
function fmtLap(ms) {
  const tenths = Math.round(Math.max(0, ms) / 100);
  const s = Math.floor(tenths / 10);
  const h = Math.floor(s / 3600);
  const body = `${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}.${tenths % 10}`;
  return h ? `${h}:${body}` : body;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

/**
 * CSP satır içi style özniteliğine izin vermez: renk ve oranlar HTML'e
 * data-bg / data-grow / data-glow olarak yazılır, burada CSSOM ile uygulanır.
 */
function paint(root) {
  for (const el of root.querySelectorAll('[data-bg],[data-grow]')) {
    if (el.dataset.bg) el.style.background = el.dataset.bg;
    if (el.dataset.grow) el.style.flexGrow = el.dataset.grow;
    if (el.dataset.glow) el.style.setProperty('--g', el.dataset.glow);
  }
  return root;
}

const setDist = (s) => (Number(s.tekrar) || 1) * (Number(s.mesafe) || 0);

// Blok renkleri (13.11): soğuk → sıcak → soğuk akış — ısınma krem, hazırlık gül, yardımcı set somon, soğuma açık mavi.
// Ana set (MS) tek renk taşımaz: hedef temposunun bölgesine göre ısı rampasını alır (ZONE_FILL, n: 1 REC … 7 SP3).
// ink: dolgu üzerindeki yazı rengi.
const BLOKLAR = {
  WU: { ad: 'Isınma', renk: '#E8D9B5', ink: '#1F1A0C' },
  PS: { ad: 'Hazırlık', renk: '#EBB4B4', ink: '#2A1010' },
  MS: { ad: 'Ana set', renk: '#E4572E', ink: '#0B0F14' },
  AS: { ad: 'Yardımcı set', renk: '#E59A84', ink: '#2B120A' },
  CD: { ad: 'Soğuma', renk: '#A9C4E3', ink: '#0C1A2B' },
};
const BLOK_DIGER = { ad: '', renk: '#7B8794', ink: '#0B0F14' };
const ZONE_FILL = { 1: '#A9BDD0', 2: '#F4B860', 3: '#EE8434', 4: '#E4572E', 5: '#C1272D', 6: '#8E1B2A', 7: '#5E0F1C' };
const blokOf = (s) => {
  const key = String(s.blok || '').trim().toUpperCase();
  const b = BLOKLAR[key] || BLOK_DIGER;
  if (key !== 'MS' || !s.hedef || !s.mesafe) return b;
  const sec = parseSec(s.hedef);
  const z = sec ? zoneOf(pacePer100(sec, s.mesafe), s) : null;
  return z && ZONE_FILL[z.n] ? { ...b, renk: ZONE_FILL[z.n], zone: z } : b;
};

/** "01:30", "1:02:03", "00:22.7" → saniye; boş/geçersiz → 0. */
function parseSec(v) {
  const m = String(v || '').trim().match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?(?:[.,](\d+))?$/);
  if (!m) return 0;
  const frac = m[4] ? Number(`0.${m[4]}`) : 0;
  return m[3] !== undefined
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + frac
    : Number(m[1]) * 60 + Number(m[2]) + frac;
}

/** Saniye → "2:30" veya "1:05:00". */
function fmtDur(sec) {
  const t = Math.round(sec);
  const h = Math.floor(t / 3600);
  const mm = Math.floor(t / 60) % 60;
  return h ? `${h}:${pad2(mm)}:${pad2(t % 60)}` : `${mm}:${pad2(t % 60)}`;
}

/** Plan'daki "Set Süre" ile aynı hesap: tekrar × (hedef + dinlen). */
const setTime = (s) => (Number(s.tekrar) || 1) * (parseSec(s.hedef) + parseSec(s.dinlen));

/** Her set için yığımlı mesafe ve süre (program sırasıyla). */
function cumulative(sets) {
  let d = 0;
  let t = 0;
  return sets.map((s) => {
    d += setDist(s);
    t += setTime(s);
    return { dist: d, time: t };
  });
}

function setTitle(s) {
  const tekrar = Number(s.tekrar) || 1;
  const stil = s.stil ? ` ${s.stil}` : '';
  return `${tekrar} × ${s.mesafe}${stil}`;
}

const setKey = (s, i) => s._k || (s.sira == null || s.sira === '' ? `i${i}` : String(s.sira));

// ---------------------------------------------------------------------------
// 100 m tempo ve CSS bölgeleri
//
// sporRef bağlıysa CSS idman gününe, havuza ve alete göre `css` sayfasından,
// bölgeler `zone` sayfasından (PACE; CSS farkı sn/100 m, alt ≤ fark < üst) gelir.
// Bağlı değilse Ayarlar'daki elle girilen CSS ve varsayılan 7 bölge kullanılır.
// Drill/kick setlerinde ve CSS'i olmayan aletlerde bölge gösterilmez.
// ---------------------------------------------------------------------------

/** Saniye/100 m; mesafe yoksa null. */
const pacePer100 = (sec, mesafe) => (sec > 0 && Number(mesafe) > 0 ? (sec / Number(mesafe)) * 100 : null);

/** Tercihler; değişince refreshPrefs() ile tazelenir. */
const prefs = () => state.prefs || (state.prefs = data.getPrefs());
const refreshPrefs = () => { state.prefs = data.getPrefs(); };

/** sporRef önbelleği (getRef cevabı) ya da null. */
const okRef = (r) => (r && Array.isArray(r.css) && Array.isArray(r.zones) ? r : null);
const sporRef = () => (state.ref === undefined ? (state.ref = okRef((data.getCachedRef() || {}).data)) : okRef(state.ref));
const zones = () => state.zones || (state.zones = ref.paceZones(sporRef()));

/** Setin CSS'i: { css, stale, kaynak } ya da null. */
function cssOf(set) {
  if (ref.isDrill(set) || ref.isTest(set)) return null;
  const r = sporRef();
  if (r && r.css.length) {
    const c = ref.cssFor(r, { tarih: (state.plan && state.plan.tarih) || todayKey(), havuz: Number(set.havuz) || prefs().havuz, alet: set.alet });
    // Tarihi kapsayan satır yoksa eski değerle bölge üretilmez (uyarı: cssUyarisi)
    return c && !c.stale ? { ...c, kaynak: 'ref' } : null;
  }
  if (String(set.alet || '').trim() || /pull/i.test(String(set.tur || ''))) return null;
  return prefs().css ? { css: prefs().css, stale: false, kaynak: 'elle' } : null;
}

/** { n, zone, ad } ya da null. */
function zoneOf(pace, set) {
  const c = cssOf(set);
  return c ? ref.zoneFor(pace, c.css, zones()) : null;
}

/** "1:35 EN2" gibi: tempo + bölge, bölge renginde. */
function paceHtml(sec, set) {
  const pace = pacePer100(sec, set.mesafe);
  if (!pace) return '';
  const z = zoneOf(pace, set);
  const etiket = z ? z.zone : ref.isDrill(set) ? 'TEC' : ref.isTest(set) ? 'TEST' : '';
  return `<b class="${z ? `zc z${z.n}` : ''}">${fmtDur(pace)}</b><small>/100${etiket ? ` · ${esc(etiket)}` : ''}</small>`;
}

/** Geçerli CSS yoksa uyarı metni (bölge verilmez; varsayılan CSS üretilmez), varsa ''. */
function cssUyarisi(tarih = todayKey()) {
  const r = sporRef();
  if (r && r.css.length) {
    const c = ref.cssFor(r, { tarih, havuz: prefs().havuz, alet: '' });
    if (!c) return 'idmanRef css sayfasında ekipmansız CSS satırı yok: tempo bölgesi gösterilmiyor.';
    if (c.stale) return `idmanRef css sayfasında bu tarihi kapsayan satır yok (son: ${c.son || c.ilk}): tempo bölgesi gösterilmiyor. Güncel CSS satırı ekle.`;
    return '';
  }
  return prefs().css ? '' : "CSS girilmedi: Ayarlar'dan CSS gir ya da idmanRef bağla; o zamana kadar tempo bölgesi gösterilmiyor.";
}

/** sporRef'i arka planda tazeler; bölge önbelleğini sıfırlar. */
async function refreshRef() {
  if (data.isConfigured('kutuphane')) data.getKutuphane().catch(() => {}); // 13.4: katalog arka planda tazelenir
  if (!data.isConfigured('ref')) return;
  try {
    state.ref = okRef(await data.getRef());
    state.zones = null;
    if (state.screen === 'setup') renderPrefs();
    if (state.screen === 'program') refreshAllItems();
    state.refErr = null;
  } catch (err) {
    // Bağlantı yoksa önbellek kullanılır; yanlış/eski betik ise Ayarlar'da yazılır.
    state.refErr = err.code === 'BAD_RESPONSE' || err.code === 'AUTH' || err.code === 'UNKNOWN_ACTION' ? err.message : null;
    if (state.screen === 'setup') renderPrefs();
  }
}

// ---------------------------------------------------------------------------
// Ekran geçişleri, ekran kilidi, bildirimler
// ---------------------------------------------------------------------------

function show(name) {
  state.screen = name;
  for (const s of SCREENS) $(`screen-${s}`).hidden = s !== name;
  if (WAKE_SCREENS.has(name)) wake.acquire();
  else wake.release();
  if (name !== 'program') stopTicker();
}

const wake = {
  lock: null,
  wanted: false,
  async acquire() {
    this.wanted = true;
    if (!('wakeLock' in navigator) || (this.lock && !this.lock.released)) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
      this.lock.addEventListener('release', () => { this.lock = null; });
    } catch {
      // Desteklenmiyor veya reddedildi: sessizce devam et.
    }
  },
  release() {
    this.wanted = false;
    if (this.lock) this.lock.release().catch(() => {});
    this.lock = null;
  },
};

let toastTimer = null;
function toast(text, ms = 2600) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/** Düğmeli bildirim (Geri al gibi); ms sonra kendiliğinden kapanır. */
function toastAction(text, label, fn, ms = 5000) {
  const el = $('toast');
  el.innerHTML = `<span>${esc(text)}</span><button class="toast-act">${esc(label)}</button>`;
  el.hidden = false;
  el.querySelector('button').addEventListener('click', () => {
    el.hidden = true;
    clearTimeout(toastTimer);
    fn();
  }, { once: true });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/**
 * Büyük düğmeli diyalog. actions: [{ label, value, cls }].
 * Gövdede data-value taşıyan bir elemana dokunmak da diyaloğu o değerle kapatır.
 */
function modal({ title, body = '', actions = [] }) {
  return new Promise((resolve) => {
    const root = $('modal');
    $('modal-title').textContent = title || '';
    const bodyEl = $('modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else bodyEl.replaceChildren(body);
    const actionsEl = $('modal-actions');
    actionsEl.replaceChildren(...actions.map((a) => {
      const b = document.createElement('button');
      b.className = `btn btn-block ${a.cls || ''}`;
      b.textContent = a.label;
      b.dataset.value = String(a.value);
      return b;
    }));
    const values = new Map(actions.map((a) => [String(a.value), a.value]));
    const onClick = (e) => {
      const t = e.target.closest('[data-value]');
      if (!t || !root.contains(t)) return;
      root.removeEventListener('click', onClick);
      root.hidden = true;
      const v = t.dataset.value;
      resolve(values.has(v) ? values.get(v) : v);
    };
    root.addEventListener('click', onClick);
    root.hidden = false;
  });
}

// ---------------------------------------------------------------------------
// Seans durumu
// ---------------------------------------------------------------------------

function newSession(tarih) {
  return { v: 2, tarih, events: [], pos: 0, screen: 'program', form: null, legacy: null };
}

/**
 * Sürüm 9 ve öncesinin seansı (işaretler + kronometre) yeni modele taşınır:
 * işaretli setler "tamamlandı, süre yok" olarak korunur, kaydedilmemiş turlar nota eklenir.
 */
function migrateSession(s) {
  if (s.v === 2) return s;
  const results = JSON.parse(JSON.stringify(s.results || {}));
  const w = s.sw;
  const plan = data.getCachedPlan(s.tarih);
  if (w && Array.isArray(w.laps) && w.laps.length && w.set != null && plan && plan.setler[w.set]) {
    const k = setKey(plan.setler[w.set], w.set);
    const r = results[k] || (results[k] = {});
    const t = `Turlar: ${w.laps.map(fmtLap).join(', ')}`;
    r.not = r.not ? `${r.not} | ${t}` : t;
  }
  return {
    v: 2,
    tarih: s.tarih,
    events: s.startedAt ? [{ t: 'basla', ts: s.startedAt }] : [],
    pos: s.pos || 0,
    screen: 'program',
    form: null,
    legacy: { done: { ...(s.done || {}) }, results },
  };
}

function persist() {
  if (state.session) data.saveSession(state.session);
}

function hasProgress(s) {
  return Boolean(s && ((s.events && s.events.length) || s.setler || (s.legacy && Object.keys(s.legacy.done || {}).length)));
}

const sessionStarted = (s) => Boolean(s && s.events && s.events.some((e) => e.t === 'basla'));

/** 13.9: silme onayında yapılmış tekrar sayısı (kaydetmeden silmeye karşı açık uyarı). */
function yapilanUyari(s) {
  const n = s && Array.isArray(s.events) ? s.events.filter((e) => e.t === 'geldim').length : 0;
  return n ? `<p class="msg err">⚠ Bu seansta ${n} tekrar yapıldı. Kaydetmek için önce “Devam et” → idmanı bitir → Kaydet.</p>` : '';
}

/**
 * Seansı cihazdan kaldırır. Hata fırlatmaz: kullanıcıyı hiçbir ekranda kilitlememeli.
 * kalan: günün planında set kaldı (13.9) — gün listede ve seçili kalır, programı sunucudan tazelenir.
 */
function endSessionLocally(kalan = false) {
  const tarih = state.session && state.session.tarih;
  state.session = null;
  state.plan = null;
  state.zst = null;
  // Biten gün listeden kalkar; gün seçimi yeniden en uygun güne otursun.
  state.selDate = null;
  state.selKeep = false;
  data.clearSession();
  try {
    if (tarih && kalan) {
      data.forgetPlan(tarih);
      state.selDate = tarih;
      state.selKeep = true;
    } else if (tarih) data.forgetDate(tarih);
  } catch (err) {
    console.error(err);
  }
  state.dates = data.getCachedDates();
  state.datesAt = 0; // bir sonraki açılışta sunucudan yeniden alınır
}

// ---------------------------------------------------------------------------
// Kurulum
// ---------------------------------------------------------------------------

const CONN = [
  { target: 'yuzme', url: 'setup-url', token: 'setup-token', ad: 'idman' },
  { target: 'ref', url: 'setup-ref-url', token: 'setup-ref-token', ad: 'idmanRef' },
  { target: 'kutuphane', url: 'setup-lib-url', token: 'setup-lib-token', ad: 'idmanKutuphane' }, // 13.4
];

function showSetup(canGoBack) {
  const configured = data.isConfigured();
  for (const k of CONN) {
    const c = data.getConfig(k.target);
    $(k.url).value = c.apiUrl;
    $(k.token).value = c.token;
  }
  $('setup-back').hidden = !canGoBack;
  $('setup-msg').hidden = true;
  $('setup-title').textContent = configured ? 'Ayarlar' : 'Kurulum';
  $('setup-forget').hidden = !configured;
  $('setup-prefs').hidden = !configured;
  renderPrefs();
  show('setup');
}

/** Web uygulaması adresi: script.google.com/…/exec (Workspace hesapları: /a/macros/alan/s/…). */
const EXEC_URL = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/|macros\/)s\/[\w-]+\/exec\/?$/;

/** Adres/anahtar denetimi; hata metni ya da ''. Boş isteğe bağlı bağlantı geçerlidir. */
function checkConn(k, apiUrl, token) {
  if (!apiUrl && !token && k.target !== 'yuzme') return '';
  if (/\/dev\/?$/.test(apiUrl)) return `${k.ad}: bu bir test (/dev) adresi. "Dağıtımları yönet"ten /exec ile biten adresi kopyalayın.`;
  if (!EXEC_URL.test(apiUrl)) return `${k.ad}: adres https://script.google.com/macros/s/…/exec biçiminde olmalı.`;
  if (!token) return `${k.ad}: anahtar boş olmamalı.`;
  return '';
}

const connError = (k, err) => (err.code === 'AUTH'
  ? `${k.ad}: anahtar hatalı. O tablonun Script Properties'indeki TOKEN ile aynı olmalı.`
  : `${k.ad}: bağlanılamadı (${err.message})`);

async function saveSetup() {
  const msg = $('setup-msg');
  const fail = (text) => {
    msg.textContent = text;
    msg.hidden = false;
  };
  const vals = CONN.map((k) => ({ k, apiUrl: $(k.url).value.trim(), token: $(k.token).value.trim() }));
  const bad = vals.map((v) => checkConn(v.k, v.apiUrl, v.token)).filter(Boolean);
  if (bad.length) return fail(bad.join(' '));
  // Aynı adres iki tabloya girilmesin (her tablonun kendi betiği var).
  const urls = vals.filter((v) => v.apiUrl).map((v) => v.apiUrl.replace(/\/$/, ''));
  if (new Set(urls).size !== urls.length) return fail('Her bağlantının adresi farklı olmalı: her tablonun kendi Apps Script\'i var.');
  for (const v of vals) data.setConfig({ apiUrl: v.apiUrl, token: v.token }, v.k.target);
  state.ref = undefined;
  state.zones = null;
  const btn = $('setup-save');
  btn.disabled = true;
  btn.textContent = 'Bağlanıyor…';
  try {
    const [yuzme, refR, kutR] = await Promise.allSettled([data.getDates(), data.isConfigured('ref') ? data.getRef() : null, data.isConfigured('kutuphane') ? data.getKutuphane() : null]);
    const [salonR] = await Promise.allSettled([data.isConfigured('salon') && yuzme.status === 'fulfilled' ? data.getSalon() : null]); // katalog için idmanRef önce
    const errs = [];
    if (yuzme.status === 'fulfilled') {
      state.dates = yuzme.value.dates;
      state.datesAt = Date.now();
      state.datesInfo = { offline: yuzme.value.fromCache };
    } else {
      errs.push(connError(CONN[0], yuzme.reason));
    }
    if (refR.status === 'rejected') errs.push(connError(CONN[1], refR.reason));
    if (kutR.status === 'rejected') errs.push(connError(CONN[2], kutR.reason));
    if (salonR.status === 'rejected') errs.push(connError({ ad: 'Kara (idman)' }, salonR.reason));
    if (refR.status === 'fulfilled') { state.ref = okRef(refR.value); state.refErr = null; } else if (refR.reason) state.refErr = refR.reason.message;
    if (!errs.length) return showHome();
    fail(`${errs.join(' ')} Ayarlar kaydedildi; sol üstten ana sayfaya geçebilirsiniz.`);
    $('setup-back').hidden = false;
    $('setup-forget').hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kaydet ve bağlan';
  }
}

async function forgetKey() {
  const ok = await modal({
    title: 'Anahtarlar unutulsun mu?',
    body: '<p>Üç bağlantının adresi ve anahtarı bu telefondan silinir; yeniden girmeden tabloya bağlanılamaz.</p><p class="muted">Yapılmış idmanlar ve gönderilmeyi bekleyen kayıtlar silinmez.</p>',
    actions: [{ label: 'Evet, unut', value: true, cls: 'btn-danger' }, { label: 'Vazgeç', value: false }],
  });
  if (!ok) return;
  data.clearConfig();
  state.dates = null;
  state.datesAt = 0;
  state.ref = undefined;
  state.zones = null;
  showSetup(false);
  toast('Adres ve anahtar silindi.');
}

// --- Tercihler: çıkış sesi ve CSS temposu -----------------------------------

const dm = (k) => (k ? `${k.slice(8, 10)}.${k.slice(5, 7)}` : '…');

function renderPrefs() {
  refreshPrefs();
  const p = prefs();
  for (const b of $('pref-ses').children) b.classList.toggle('is-on', (b.dataset.v === '1') === p.ses);
  for (const b of $('pref-tema').children) b.classList.toggle('is-on', b.dataset.v === (p.tema || 'koyu'));
  for (const b of $('pref-yazi').children) b.classList.toggle('is-on', Number(b.dataset.v) === (p.yazi || 1));
  // sporRef bağlıysa CSS oradan (bugün, son havuz, aletsiz); elle girilen alan gizlenir.
  const r = data.isConfigured('ref') ? sporRef() : null;
  const fromRef = Boolean(r && r.css.length);
  const c = fromRef ? ref.cssFor(r, { tarih: todayKey(), havuz: p.havuz, alet: '' }) : null;
  const refErr = data.isConfigured('ref') && state.refErr;
  $('pref-css-field').hidden = fromRef;
  $('pref-css-note').hidden = fromRef;
  $('pref-css-ref').hidden = !fromRef && !refErr;
  if (refErr && !fromRef) {
    $('pref-css-ref').innerHTML = `<em>idmanRef okunamadı: ${esc(refErr)}</em><small>CSS şimdilik aşağıdaki elle girilen değerden.</small>`;
  } else if (fromRef) {
    $('pref-css-ref').innerHTML = c
      ? `idmanRef'ten: <b>${fmtDur(c.css)}</b> /100 m <span>${dm(c.ilk)}–${dm(c.son)} · ${c.havuz} m</span>${c.stale ? '<em>CSS güncel değil: bugünü kapsayan satır yok — tempo bölgesi gösterilmiyor. idmanRef css sayfasına güncel satır ekle.</em>' : ''}${refErr ? `<em>Son okuma başarısız: ${esc(refErr)} Kayıtlı değerler kullanılıyor.</em>` : ''}<small>Aletli setlerde alete göre ayrı CSS kullanılır; aleti tabloda olmayan sette bölge gösterilmez.</small>`
      : 'idmanRef\'te aletsiz CSS satırı yok.';
  } else if (document.activeElement !== $('pref-css')) {
    $('pref-css').value = p.css ? fmtDur(p.css) : '';
  }
  const css = fromRef ? c && c.css : p.css;
  const tah = css ? analiz.dereceTahmini(css) : null;
  $('pref-bildirim').textContent = `Dinlenme bitince bildirim: ${prefs().bildirim ? 'açık' : 'kapalı'}`;
  { const o = video.ozet(VIDEOLAR); $('pref-video').textContent = `Hareket videoları: uygulama listesinde ${o.toplam} hareket (OPEX ${o.opex}, diğer ${o.diger}). H sayfasının Video sütunu doluysa o önce gelir. Video kartta sessiz ve döngüde oynar; internet yoksa fotoğraf gösterilir.`; }
  $('pref-tahmin').innerHTML = tah ? `Derece tahmini (kaba, CSS'ten): 100 FR <b>${fmtDur(tah[100])}</b> · 200 FR <b>${fmtDur(tah[200])}</b> · 400 FR <b>${fmtDur(tah[400])}</b>` : '';
  $('pref-zones').innerHTML = css
    ? zones().map((z) => {
      const lo = z.alt === -Infinity ? '' : fmtDur(css + z.alt);
      const hi = z.ust === Infinity ? '' : fmtDur(css + z.ust);
      const range = !hi ? `${lo} ve üstü` : !lo ? `${hi} altı` : `${lo} – ${hi}`;
      return `<div class="zone z${z.n}"><b>${esc(z.zone)}</b><span>${esc(z.ad)}</span><em>${range}</em></div>`;
    }).join('')
    : '';
}

function onPrefsClick(e) {
  const b = e.target.closest('#pref-ses button[data-v]');
  if (b) {
    data.setPrefs({ ses: b.dataset.v === '1' });
    renderPrefs();
    if (b.dataset.v === '1') audio.unlock();
  }
}

function onCssChange() {
  const v = $('pref-css').value.trim();
  if (!v) {
    data.setPrefs({ css: null });
  } else {
    const sec = parseSec(v);
    if (!sec || sec < 40 || sec > 300) {
      toast('CSS dd:ss biçiminde olmalı (ör. 1:57).');
      return;
    }
    data.setPrefs({ css: sec });
    $('pref-css').value = fmtDur(sec);
  }
  renderPrefs();
}

// ---------------------------------------------------------------------------
// Gün seçimi: hafta takvimi
//
// Üstte haftanın 7 günü; sağa/sola kaydırınca hafta değişir. Bir güne (ya da
// alttaki gün satırlarına) dokunmak yalnızca seçer; idmana yalnızca alttaki
// "… idmanını aç" düğmesiyle girilir.
// ---------------------------------------------------------------------------

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const keyOf = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
const addDays = (k, n) => {
  const dt = parseKey(k);
  dt.setDate(dt.getDate() + n);
  return keyOf(dt);
};
/** Haftanın pazartesisi. */
const mondayOf = (k) => addDays(k, -((parseKey(k).getDay() + 6) % 7));

/**
 * Tarih listesini sunucudan tazeler (son 30 sn içinde alındıysa force olmadan
 * tekrar istemez). Liste gönderimi beklemez; kuyrukta olan veya az önce
 * gönderilen günler visibleDates() ile gizlenir.
 */
function loadDates(force = false) {
  if (!state.dates) state.dates = data.getCachedDates();
  if (state.datesLoading) return state.datesLoading;
  if (!force && state.datesAt && Date.now() - state.datesAt < 30000) return Promise.resolve();
  state.datesInfo = { loading: true };
  rerenderDates();
  flushQueue();
  state.datesLoading = (async () => {
    try {
      const r = await data.getDates();
      state.dates = r.dates;
      state.datesInfo = { offline: r.fromCache };
      state.datesAt = Date.now();
      if (!r.fromCache) prefetchPlans();
    } catch (err) {
      state.datesInfo = { error: err };
    } finally {
      state.datesLoading = null;
    }
    rerenderDates();
  })();
  return state.datesLoading;
}

function rerenderDates() {
  if (state.screen === 'days') renderDays();
  else if (state.screen === 'home') renderHome();
}

function showDays(force = false) {
  show('days');
  if (!state.dates) state.dates = data.getCachedDates();
  renderDays();
  return loadDates(force);
}

/** Kuyrukta bekleyen (kaydedilmiş ama gönderilmemiş) günler listede görünmez. */
function visibleDates() {
  const hidden = new Set([...data.getQueue().filter((q) => turOf(q) === 'yuzme').map((q) => q.payload.tarih), ...state.sentDates]);
  return (state.dates || []).filter((d) => !hidden.has(d.tarih));
}

/** Seçim yoksa bugün; bugün plan yoksa en yakın planlı gün (önce ileri). */
function ensureSelection(byDate) {
  const today = todayKey();
  if (state.selDate && (byDate.has(state.selDate) || state.selKeep)) return;
  const keys = [...byDate.keys()].sort();
  let pick = today;
  if (!byDate.has(today) && keys.length) {
    pick = keys.find((k) => k >= today) || keys[keys.length - 1];
  }
  state.selDate = pick;
  state.weekStart = mondayOf(pick);
}

/** Gün kartı önizlemesi için setler: sunucudan (yeni Code.gs) ya da cihazdaki programdan. */
function previewSets(d) {
  if (d && Array.isArray(d.setler) && d.setler.length) return d.setler;
  const plan = d && data.getCachedPlan(d.tarih);
  if (!plan) return null;
  return plan.setler.map((s) => ({ blok: s.blok, mesafe: setDist(s), sure: setTime(s) }));
}

function hedefSureOf(d) {
  if (d && d.hedefSure) return d.hedefSure;
  const sets = previewSets(d);
  return sets ? sets.reduce((a, s) => a + (s.sure || 0), 0) : 0;
}

const blokRenk = (b) => blokOf(typeof b === 'object' ? b : { blok: b }).renk;

/** Günün programı küçük bir metro hattı olarak (blok renginde, mesafeye oranlı). */
function metroSvg(sets) {
  const W = 360;
  const tot = sets.reduce((a, s) => a + Math.max(1, s.mesafe || 0), 0) || 1;
  let x = 0;
  const segs = [];
  const dots = [];
  for (const s of sets) {
    const w = (W * Math.max(1, s.mesafe || 0)) / tot;
    const c = blokRenk(s);
    segs.push(`<line x1="${(x + 2).toFixed(1)}" y1="14" x2="${(x + w - 2).toFixed(1)}" y2="14" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`);
    dots.push(`<circle cx="${(x + w / 2).toFixed(1)}" cy="14" r="6.5" fill="#141B23" stroke="${c}" stroke-width="3.5"/>`);
    x += w;
  }
  return `<svg class="metro" viewBox="0 0 ${W} 28" preserveAspectRatio="none" aria-hidden="true">${segs.join('')}${dots.join('')}</svg>`;
}

// Seçili olmayan günler renksiz: blok başına gri tonu (ana set en açık,
// ısınma/soğuma en koyu) ki yapı renk olmadan da okunsun.
const BLOK_GRI = { MS: '#C9D2DB', AS: '#9BA7B3', PS: '#76828F', WU: '#4F5B67', CD: '#4F5B67' };
const blokGri = (b) => BLOK_GRI[String((b && b.blok) || b || '').trim().toUpperCase()] || '#65717D';

function miniBar(sets, gray = false) {
  const color = gray ? blokGri : blokRenk;
  return `<div class="mini-bar">${sets.map((s) => `<i data-grow="${Math.max(1, s.mesafe || 0)}" data-bg="${color(s)}"></i>`).join('')}</div>`;
}

function renderBanners() {
  const info = state.datesInfo;
  const banners = [];
  const s = state.session;
  if (s) {
    banners.push(`
      <div class="banner banner-live">
        <div><strong>Devam eden seans</strong><br>${esc(fmtDateTR(s.tarih))}${sessionStarted(s) ? ' · başladı' : ''}</div>
        <div class="banner-actions">
          <button class="btn btn-primary" data-act="resume">Devam et</button>
          <button class="btn btn-ghost" data-act="discard">Sil</button>
        </div>
      </div>`);
  }
  const queue = data.getQueue();
  if (queue.length) {
    const err = queue.find((q) => q.lastError);
    banners.push(`
      <div class="banner banner-warn">
        <div><strong>Gönderilmeyi bekleyen ${queue.length} kayıt</strong><br>
          ${esc(queue.map((q) => fmtDateTR(q.payload.tarih)).join(', '))}
          ${err ? `<br><small>Son hata: ${esc(err.lastError.message || err.lastError.code)}</small>` : ''}
        </div>
        <div class="banner-actions">
          <button class="btn btn-primary" data-act="flush">Şimdi dene</button>
          <button class="btn btn-ghost" data-act="queue-manage">Yönet</button>
        </div>
      </div>`);
  }
  if (info.offline) {
    banners.push('<div class="banner">Çevrimdışı — son yüklenen liste gösteriliyor.</div>');
  } else if (info.error) {
    banners.push(`<div class="banner banner-err">${esc(info.error.message)}${info.error.code === 'AUTH' ? ' Ayarlardan anahtarı kontrol edin.' : ''}</div>`);
  }
  $('days-banners').innerHTML = banners.join('');
}

function renderDays() {
  const today = todayKey();
  const info = state.datesInfo;
  const dates = visibleDates();
  const byDate = new Map(dates.map((d) => [d.tarih, d]));
  renderBanners();

  if (!state.dates && info.loading) {
    $('wk').hidden = true;
    $('days-hero').innerHTML = '';
    $('days-list').innerHTML = '<p class="empty">Yükleniyor…</p>';
    $('days-today-bar').hidden = true;
    return;
  }
  $('wk').hidden = false;
  ensureSelection(byDate);
  const ws = state.weekStart;

  // Hafta başlığı ve özeti
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const we = weekKeys[6];
  const isThisWeek = ws === mondayOf(today);
  const a = parseKey(ws);
  const b = parseKey(we);
  $('wk-title').textContent = isThisWeek ? 'Bu hafta'
    : `${a.getDate()} ${AY_KISA[a.getMonth()]} – ${b.getDate()} ${AY_KISA[b.getMonth()]}`;
  $('wk-today').hidden = isThisWeek && state.selDate === today;
  const planned = weekKeys.filter((k) => byDate.has(k));
  const weekM = planned.reduce((acc, k) => acc + (byDate.get(k).toplamMesafe || 0), 0);
  $('wk-sum').textContent = planned.length ? `${planned.length} idman · ${fmtNum(weekM)} m` : 'Plan yok';

  // Günler
  $('wk-track').innerHTML = weekKeys.map((k) => {
    const dt = parseKey(k);
    const cls = ['wd'];
    if (k === state.selDate) cls.push('on');
    if (k === today) cls.push('today');
    if (byDate.has(k)) cls.push('has');
    if (k < today) cls.push('past');
    return `<button class="${cls.join(' ')}" data-day="${k}" aria-label="${esc(fmtDateTR(k))}">
      <small>${GUN_KISA[dt.getDay()]}</small><b>${dt.getDate()}</b><i></i></button>`;
  }).join('');
  try { takvimEk(); } catch (err) { console.warn('takvim ekleri', err); }

  // Seçili günün kartı
  const sel = state.selDate;
  const d = byDate.get(sel);
  const selDt = parseKey(sel);
  const s = state.session;
  if (d) {
    const sets = previewSets(d);
    const hs = hedefSureOf(d);
    const ms = sets ? sets.filter((x) => String(x.blok).trim().toUpperCase() === 'MS').reduce((acc, x) => acc + (x.mesafe || 0), 0) : 0;
    const pill = sel === today ? '● BUGÜN' : (sel < today ? 'GEÇMİŞ PLAN' : GUNLER[selDt.getDay()].toLocaleUpperCase('tr'));
    $('days-hero').innerHTML = `
      <div class="hero${sel < today ? ' is-past' : ''}">
        <div class="hero-top"><span class="hero-pill">${pill}</span>${s && s.tarih === sel ? '<span class="hero-live">DEVAM EDİYOR</span>' : ''}${hs ? `<span class="hero-time">${fmtDur(hs)} hedef</span>` : ''}</div>
        <div class="hero-date">${selDt.getDate()} ${AYLAR[selDt.getMonth()]} <span>${GUNLER[selDt.getDay()]}</span></div>
        ${sets ? metroSvg(sets) : ''}
        <div class="hero-stats">
          <div><span class="lbl">SET</span><b>${d.setSayisi}</b></div>
          <div><span class="lbl">MESAFE</span><b>${fmtNum(d.toplamMesafe)}</b></div>
          <div><span class="lbl">ANA SET</span><b class="ms">${ms ? fmtNum(ms) : '—'}</b></div>
        </div>
      </div>`;
  } else {
    $('days-hero').innerHTML = `
      <div class="hero is-empty">
        <div class="hero-date">${selDt.getDate()} ${AYLAR[selDt.getMonth()]} <span>${GUNLER[selDt.getDay()]}</span></div>
        <p>Bu gün için plan yok.</p>
      </div>`;
  }

  // Haftanın diğer planlı günleri (dokunmak seçer)
  const others = planned.filter((k) => k !== sel);
  let list = others.map((k) => {
    const x = byDate.get(k);
    const dt = parseKey(k);
    const sets = previewSets(x);
    const hs = hedefSureOf(x);
    return `
      <button class="day-row${k < today ? ' is-past' : ''}" data-tarih="${k}">
        <span class="dr-date"><b>${dt.getDate()}</b><small>${AY_KISA[dt.getMonth()].toLocaleUpperCase('tr')}</small></span>
        <span class="dr-info">
          <span class="dr-name">${GUNLER[dt.getDay()]}${k === today ? ' · Bugün' : ''}</span>
          <span class="dr-meta">${x.setSayisi} set · ${fmtNum(x.toplamMesafe)} m${hs ? ` · ${fmtDur(hs)}` : ''}</span>
          ${sets ? miniBar(sets, true) : ''}
        </span>
      </button>`;
  }).join('');
  if (!dates.length) {
    list = `
      <div class="empty">
        <p>Planlanmış idman yok</p>
        <button class="btn btn-primary" data-act="refresh">Yenile</button>
      </div>`;
  }
  $('days-list').innerHTML = list;
  paint($('days-list'));

  // Alt düğme: yalnızca seçili günün planı varsa
  $('days-today-bar').hidden = !d;
  if (d) {
    $('days-cta-text').textContent = s && s.tarih === sel ? 'Seansa devam et'
      : (sel === today ? 'Bugünün idmanını aç' : `${selDt.getDate()} ${AYLAR[selDt.getMonth()]} idmanını aç`);
  }
  fitListLines();
}

function selectDay(k, keepWeek = true) {
  state.selDate = k;
  state.selKeep = true;
  if (!keepWeek || mondayOf(k) !== state.weekStart) state.weekStart = mondayOf(k);
  renderDays();
}

function shiftWeek(dir) {
  const track = $('wk-track');
  state.weekStart = addDays(state.weekStart, dir * 7);
  // Yeni haftada planlı bir gün varsa onu, yoksa aynı hafta gününü seç.
  const byDate = new Set(visibleDates().map((d) => d.tarih));
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(state.weekStart, i));
  const today = todayKey();
  state.selDate = weekKeys.includes(today) ? today
    : (weekKeys.find((k) => byDate.has(k)) || addDays(state.selDate, dir * 7));
  state.selKeep = true;
  renderDays();
  // Kayma animasyonu
  track.style.transition = 'none';
  track.style.transform = `translateX(${dir * 40}%)`;
  track.style.opacity = '0.3';
  requestAnimationFrame(() => {
    track.style.transition = 'transform 0.28s ease-out, opacity 0.28s';
    track.style.transform = 'translateX(0)';
    track.style.opacity = '1';
  });
}

/** Hafta şeridi: yatay kaydırma haftayı değiştirir, dokunma günü seçer. */
function wireWeekSwipe() {
  const el = $('wk');
  let g = null;
  el.addEventListener('pointerdown', (e) => {
    g = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, swiping: false };
  });
  el.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    g.dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.swiping && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(dy)) g.swiping = true;
    if (g.swiping) {
      const t = $('wk-track');
      t.style.transition = 'none';
      t.style.transform = `translateX(${g.dx * 0.6}px)`;
    }
  });
  const end = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const { dx, swiping } = g;
    g = null;
    const t = $('wk-track');
    if (swiping && Math.abs(dx) > 50) {
      state.suppressDayClick = true;
      shiftWeek(dx < 0 ? 1 : -1);
    } else {
      if (swiping) state.suppressDayClick = true;
      t.style.transition = 'transform 0.2s';
      t.style.transform = 'translateX(0)';
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => {
    if (state.suppressDayClick) {
      state.suppressDayClick = false;
      return;
    }
    const b = e.target.closest('[data-day]');
    if (b) selectDay(b.dataset.day);
  });
}

async function onDaysClick(e) {
  const row = e.target.closest('[data-tarih]');
  if (row) return selectDay(row.dataset.tarih);
  const act = e.target.closest('[data-act]');
  if (!act) return;
  switch (act.dataset.act) {
    case 'refresh':
      return showDays(true);
    case 'resume':
      return resumeSession();
    case 'discard': {
      const ok = await modal({
        title: 'Seans silinsin mi?',
        body: `<p>Bu seansın işaretleri ve süresi silinecek, hiçbir yere kaydedilmeyecek.</p>${yapilanUyari(state.session)}`,
        actions: [{ label: 'Evet, sil', value: true, cls: 'btn-danger' }, { label: 'Vazgeç', value: false }],
      });
      if (ok) {
        data.clearSession();
        state.session = null;
        state.plan = null;
        renderDays();
      }
      return;
    }
    case 'flush':
      return flushQueue(true);
    case 'queue-manage':
      return manageQueue();
  }
}

async function manageQueue() {
  const queue = data.getQueue();
  const body = document.createElement('div');
  body.className = 'pick-list';
  body.innerHTML = queue.map((q) => `
    <button class="pick" data-value="${esc(q.id)}">
      <strong>${esc(fmtDateTR(q.payload.tarih))}</strong>
      <small>${q.lastError ? esc(q.lastError.message || q.lastError.code) : 'Henüz denenmedi'} · ${q.lastError && q.lastError.code === 'SAME_DAY' ? 'Göndermek ya da silmek için dokun' : 'Silmek için dokun'}</small>
    </button>`).join('');
  const id = await modal({ title: 'Bekleyen kayıtlar', body, actions: [{ label: 'Kapat', value: '' }] });
  if (!id) return;
  const item = queue.find((q) => q.id === id);
  if (item && item.lastError && item.lastError.code === 'SAME_DAY') {
    // 13.9: aynı gün başka idman kayıtlı — kullanıcı onaylarsa ikinci idman olarak gönderilir.
    const c = await modal({
      title: 'Bugüne ait idman kaydı var',
      body: `<p>${esc(fmtDateTR(item.payload.tarih))} için tabloda başka bir idman kayıtlı. Bu kayıt ikinci idman olarak gönderilsin mi?</p>`,
      actions: [{ label: 'İkinci idman olarak gönder', value: 'ikinci', cls: 'btn-primary' }, { label: 'Kaydı sil', value: 'sil', cls: 'btn-danger' }, { label: 'Vazgeç', value: '' }],
    });
    if (c === 'ikinci') { data.markQueueIkinci(id); return flushQueue(true); }
    if (c !== 'sil') return;
  }
  const ok = await modal({
    title: 'Kayıt silinsin mi?',
    body: '<p>Bu seans hiçbir zaman tabloya gönderilmeyecek.</p>',
    actions: [{ label: 'Evet, sil', value: true, cls: 'btn-danger' }, { label: 'Vazgeç', value: false }],
  });
  if (ok) data.removeFromQueue(id);
  renderDays();
}

async function flushQueue(verbose = false) {
  if (!data.getQueue().length) return;
  let r;
  try {
    r = await data.flushQueue();
  } catch (err) {
    if (verbose) toast(`Gönderilemedi: ${err.message}`, 4000);
    rerenderDates();
    return;
  }
  const sent = [...r.sent, ...r.duplicates];
  for (const x of sent) if (x.tur !== 'salon') state.sentDates.add(x.tarih);
  if (sent.length) toast(`Bekleyen kayıt gönderildi: ${sent.map((x) => fmtDateTR(x.tarih)).join(', ')}`, 4000);
  else if (verbose && r.remaining) toast('Hâlâ gönderilemedi. Bağlantı gelince tekrar denenecek.');
  if (state.screen === 'history') renderHistory();
  else rerenderDates();
}

// ---------------------------------------------------------------------------
// Ana sayfa: Yüzme / Salon
// ---------------------------------------------------------------------------

function showHome() {
  show('home');
  renderHome();
  loadDates();
  const c = data.getCachedSalon();
  if (data.isConfigured('salon') && (!c || Date.now() - c.savedAt > 5 * 60 * 1000)) loadSalon();
}

function renderHome() {
  const now = new Date();
  const today = todayKey();
  $('home-date').textContent = `${GUNLER[now.getDay()]}, ${now.getDate()} ${AYLAR[now.getMonth()]}`;

  // Yüzme kartı: ilk planlı idman (ya da devam eden seans) ve iki düğme: İdmanı aç · Takvim.
  let when = '';
  let meta = '';
  let sets = null;
  let open = '';
  state.homeNext = null;
  const s = state.session;
  const whenOf = (k) => {
    const dt = parseKey(k);
    const date = `${GUNLER[dt.getDay()]} ${dt.getDate()} ${AYLAR[dt.getMonth()]}`;
    if (k === today) return `Bugün <span>· ${date}</span>`;
    if (k === addDays(today, 1)) return `Yarın <span>· ${date}</span>`;
    return `${GUNLER[dt.getDay()]} <span>· ${dt.getDate()} ${AYLAR[dt.getMonth()]}</span>`;
  };
  const metaOf = (d, list) => {
    const hs = hedefSureOf(d);
    const ms = list ? list.filter((x) => String(x.blok).trim().toUpperCase() === 'MS').reduce((acc, x) => acc + (x.mesafe || 0), 0) : 0;
    return `${d.setSayisi} set · ${fmtNum(d.toplamMesafe)} m${hs ? ` · ${fmtDur(hs)}` : ''}${ms ? ` · ana set ${fmtNum(ms)} m` : ''}`;
  };
  if (s) {
    const plan = state.plan || data.getCachedPlan(s.tarih);
    when = `${whenOf(s.tarih)} <em>DEVAM EDİYOR</em>`;
    if (plan) {
      sets = plan.setler.map((x) => ({ blok: x.blok, mesafe: setDist(x) }));
      meta = `${plan.setler.length} set · ${fmtNum(sets.reduce((a, x) => a + x.mesafe, 0))} m${sessionStarted(s) ? ' · başladı' : ''}`;
    }
    open = 'Seansa devam et';
  } else if (!state.dates && state.datesInfo.loading) {
    meta = 'Yükleniyor…';
  } else if (!state.dates && state.datesInfo.error) {
    when = 'Bağlantı yok';
    meta = state.datesInfo.error.message;
  } else {
    const next = visibleDates().filter((d) => d.tarih >= today).sort((a, b) => (a.tarih < b.tarih ? -1 : 1))[0];
    if (next) {
      sets = previewSets(next);
      when = whenOf(next.tarih);
      meta = metaOf(next, sets);
      open = 'İdmanı aç';
      state.homeNext = next.tarih;
    } else {
      when = 'Planlanmış idman yok';
    }
  }
  $('home-swim-tag').innerHTML = when;
  $('home-swim-metro').innerHTML = sets ? metroSvg(sets) : '';
  $('home-swim-meta').textContent = meta;
  $('home-open').hidden = !open;
  $('home-open-text').textContent = open || 'İdmanı aç';

  const n = data.getHistory().length;
  const q = data.getQueue().length;
  $('home-history-meta').textContent = (n ? `${n} kayıt` : 'Henüz kayıt yok') + (q ? ` · ${q} gönderilmeyi bekliyor` : '');
  renderHomeGym();
  try { renderHafta(); } catch (err) { $('home-week').innerHTML = ''; console.warn('haftalık şerit', err); }
  fitListLines();
}

// ===========================================================================
// Sürüm 12 — ortak ekranlar: ana sayfa haftalık şeridi, Form ve denge, Haftanın özeti
// ===========================================================================

/** Ortak durum: seanslar, günlük yük, form, oran, toparlanma, kurallar. */
function genelDurum() {
  const L = seansListesi();
  const g = yuk.gunluk(L);
  const bugun = todayKey();
  const K = kurallar();
  const normal = yuk.normalHafta(K);
  const H = yuk.haftalar(L, bugun, 8);
  const buHafta = H[H.length - 1];
  // Kronik yük (son 4 hafta ortalaması) normal haftanın yarısından azsa: aradan dönüş
  let son28 = 0;
  for (const x of L) if (x.tarih > yuk.gunEkle(bugun, -28) && x.tarih <= bugun) son28 += x.yuk;
  const donus = son28 / 4 < normal * 0.5;
  const oran = yuk.yukOrani(g, bugun, normal);
  return { L, g, bugun, K, normal, H, buHafta, hd: yuk.haftaDurumu(buHafta.top, normal), donus, oran, od: yuk.oranDurum(oran, { donus }), tp: yuk.toparlanma(L) };
}
const DURUM_CLS = { az: '', normal: 'ok', yuksek: 'warn' };

/** Bugünün önerisi (süre bütçesi, program, toparlanma, önleyici borç). */
function bugunOnerisi(G) {
  const now = new Date();
  const b = kisit.sureButcesi(now, G.K);
  const butce = b.dk ? `${b.dilim === 'sabah' ? 'sabah' : b.dilim === 'ogle' ? 'öğle' : 'akşam'} ${b.dk} dk bütçe` : `${b.dilim === 'aksam' ? 'akşam' : b.dilim} sınırsız`;
  const gun = yuk.haftaGunleri(G.L, G.bugun);
  if (G.L.some((x) => x.tarih === G.bugun)) return { metin: 'Bugün idman yapıldı · dinlen ve toparlan', butce: '' };
  const hz = hazirBugun();
  if (hz && (hz.karar === 'dinlen' || hz.karar === 'tibbi')) return { metin: hz.metin, butce: '' };
  if (ayriGun(G.K)) {
    const yz = yuk.haftaGunleri(G.L, G.bugun, 'yuzme'), sg = yuk.haftaGunleri(G.L, G.bugun, 'salon');
    if (yz >= G.K.gunHafta && sg >= G.K.gunHaftaSalon) return { metin: `Haftalık ${G.K.gunHafta} yüzme + ${G.K.gunHaftaSalon} kara tamam · dinlenme`, butce: '' };
  } else if (gun >= G.K.gunHafta) return { metin: `Haftalık ${G.K.gunHafta} gün tamam · dinlenme`, butce: '' };
  if (state.homeNext === G.bugun) return { metin: 'Yüzme programı var', butce };
  const yorgun = Object.entries(G.tp).filter(([, o]) => o.toparlanma < 60).map(([k]) => k);
  const d = salonData();
  const borc = d ? salon.onleyiciDurum(d.gecmis, G.bugun, hPay).filter((o) => o.acik).map((o) => o.ad.toLocaleLowerCase('tr')) : [];
  const odak = borc.length ? borc.join(' + ') : 'dengeye göre';
  return { metin: `Kara: ${odak}${yorgun.length ? ` · ${yorgun.slice(0, 2).join(', ')} dinleniyor` : ''}`, butce };
}

/** Yüzme ve salon günleri ayrı mı sayılıyor (sporRef kisit gun_hafta_salon)? */
const ayriGun = (K) => K.gunHaftaSalon != null;

/** Bugünün hazır olma sonucu (kontrol yapıldıysa). */
function hazirBugun() { return gosterge.hazirKisisel(data.getHazir(), todayKey(), (k) => hazir.hazirSkor(k, kurallar())); } // 13.5 (B7): kişisel tabana göre
/** Hazır olma satırı: skor, (ortalaman), karar metni ve en etkili 2 neden. */
const hazirMetin = (h) => `Hazır olma %${h.skor}${h.ort != null ? ` (ortalaman %${h.ort})` : ''} · ${h.metin}${h.nedenler && h.nedenler.length ? ` · ${h.nedenler.map((x) => `${x.ad} ${x.metin}`).join(' · ')}` : ''}`;

/** Dinlenme haftası önerisi: yük oranı + son hazır olma kontrolleri + son 14 günün ağrısı. */
function dinlenmeDurumu(G) {
  const H = data.getHazir();
  const hazirlar = Object.keys(H).sort().reverse().slice(0, 7).map((t) => hazir.hazirSkor(H[t], G.K));
  const bas = yuk.gunEkle(G.bugun, -14);
  const msiler = G.L.filter((x) => x.tarih >= bas).map((x) => (x.tur === 'salon' ? x.msiMax || 0 : Math.max(0, ...Object.values(analiz.msiParse(x.msi)))));
  return hazir.dinlenmeOnerisi({ oran: G.od, hazirlar, msiler });
}

/** Günlük hazır olma kontrolü (10 sn): uyku, kas ağrısı, enerji, eklem (MSI). */
async function hazirKontrol() {
  const k = { uyku: 3, agri: 1, enerji: 3, eklem: 0, ...(data.getHazir()[todayKey()] || {}) };
  const satir = (key, ad, vals, etiket) => `<p class="hz-q">${ad}</p><div class="sg-grid hz-${key}">${vals.map((v, i) => `<button data-hz="${key}" data-v="${v}" class="${k[key] === v ? 'is-on' : ''}">${etiket[i]}</button>`).join('')}</div>`;
  const el = document.createElement('div');
  const ciz = () => {
    const r = gosterge.hazirKisisel({ ...data.getHazir(), [todayKey()]: k }, todayKey(), (x) => hazir.hazirSkor(x, kurallar()));
    el.innerHTML = satir('uyku', 'Uyku', [1, 2, 3, 4, 5], ['çok kötü', 'kötü', 'orta', 'iyi', 'çok iyi'])
      + satir('agri', 'Kas ağrısı', [1, 2, 3, 4, 5], ['yok', 'hafif', 'orta', 'belirgin', 'çok'])
      + satir('enerji', 'Enerji', [1, 2, 3, 4, 5], ['çok düşük', 'düşük', 'orta', 'iyi', 'çok iyi'])
      + satir('eklem', 'Omuz / kalça / diz ağrısı (MSI)', [0, 0.5, 1, 2, 3], ['0', '0,5', '1', '2', '3+'])
      + `<p class="hz-sonuc ${r.karar}">%${r.skor}${r.ort != null ? ` · ortalaman %${r.ort}` : ''} · ${esc(r.metin)}</p>${r.nedenler.length ? `<p class="hz-ned">En etkili: ${esc(r.nedenler.map((x) => `${x.ad} ${x.metin}`).join(' · '))}</p>` : ''}`;
  };
  ciz();
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-hz]'); if (!b) return; k[b.dataset.hz] = Number(b.dataset.v); ciz(); });
  const ok = await modal({ title: 'Bugün nasılsın?', body: el, actions: [{ label: 'Kaydet', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }] });
  if (!ok) return;
  data.setHazir(todayKey(), { uyku: k.uyku, agri: k.agri, enerji: k.enerji, eklem: k.eklem });
  renderHome();
}

/** Programdaki (gönderilmemiş) yüzme günleri: [{ tarih, metre }] */
const planliYuzme = () => visibleDates().map((d) => ({ tarih: d.tarih, metre: Number(d.toplamMesafe) || 0 }));

/** Ana sayfa: haftalık şerit (gün halkası, form, bugünün önerisi, göstergeler, uyarılar). */
function renderHafta() {
  const box = $('home-week');
  const G = genelDurum();
  const gun = yuk.haftaGunleri(G.L, G.bugun);
  const ay = yuk.stilAy(G.L, G.bugun.slice(0, 7));
  const d = salonData();
  const omuz = d ? salon.onleyiciDurum(d.gecmis, G.bugun, hPay).find((o) => o.key === 'omuz') : null;
  const o = bugunOnerisi(G);
  const od = G.od;
  const testZ = analiz.cssTestiZamani(data.getHistory(), guncelCss(), G.bugun);
  const cak = yuk.cakisma(G.L, G.bugun, planliYuzme());
  const hzBugun = hazirBugun();
  const O1 = gosterge.oranlar(G.L, G.bugun); // 13.5 (B1)
  const dinOn = dinlenmeDurumu(G);
  const ring = (v, t, l, cls) => { const p = Math.min(1, v / t); const c = 2 * Math.PI * 20; return `<div class="hw-ring ${cls}"><svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="20" class="tr"/><circle cx="24" cy="24" r="20" class="fg" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 24 24)"/><text x="24" y="29" text-anchor="middle">${v}/${t}</text></svg><small>${l}</small></div>`; };
  const halka = ayriGun(G.K)
    ? `${ring(yuk.haftaGunleri(G.L, G.bugun, 'yuzme'), G.K.gunHafta, 'yüzme gün', 'a')}${ring(yuk.haftaGunleri(G.L, G.bugun, 'salon'), G.K.gunHaftaSalon || 0, 'kara gün', 'a')}`
    : ring(gun, G.K.gunHafta, 'bu hafta gün', 'a');
  box.innerHTML = `<div class="hw-top">${halka}${omuz ? ring(omuz.yapilan, omuz.hedef, 'omuz önleyici', 't') : ''}
      <button class="hw-form" data-hw="form"><small>BU HAFTA YÜK</small><b class="n ${DURUM_CLS[G.hd.durum]}">%${G.hd.pay}</b><span class="${DURUM_CLS[G.hd.durum]}">${esc(G.hd.metin.toLocaleLowerCase('tr'))}</span><small>normal haftaya göre ›</small></button></div>
    <div class="hw-today"><small>BUGÜN ÖNERİ${o.butce ? ` · ${esc(o.butce.toLocaleUpperCase('tr'))}` : ''}</small><b>${esc(o.metin)}</b></div>
    ${ay.toplam ? `<p class="hw-g ${ay.brOran >= G.K.brAyMax * 0.8 ? 'warn' : ''}">Kurbağalama bu ay <b>%${fmtDec(ay.brOran)}</b> / ${G.K.brAyMax}</p>` : ''}
    ${['sari', 'turuncu'].includes(O1.top.renk) || ['turuncu'].includes(O1.yuzme.renk) || ['turuncu'].includes(O1.kara.renk) ? `<button class="hw-g warn" data-hw="form">⚠ Bu hafta / son 4 hafta: toplam ${O1.top.oran == null ? '—' : `${fmtDec(O1.top.oran)}×`} · yüzme ${O1.yuzme.oran == null ? '—' : `${fmtDec(O1.yuzme.oran)}×`} · kara ${O1.kara.oran == null ? '—' : `${fmtDec(O1.kara.oran)}×`} ›</button>` : ''}
    ${cak ? `<p class="hw-g warn">⚠ ${esc(cak.metin)}</p>` : ''}
    ${hzBugun ? `<button class="hw-g hw-hz ${hzBugun.karar === 'tam' ? 'ok' : 'warn'}" data-hw="hazir">${esc(hazirMetin(hzBugun))}</button>` : '<button class="hw-g hw-hz" data-hw="hazir">☀ Bugün nasılsın? · 10 sn kontrol</button>'}
    ${dinOn.oner ? `<p class="hw-g warn">⚠ Dinlenme haftası öner: ${esc(dinOn.nedenler.join(', '))}</p>` : ''}
    ${new Date().getDay() === 0 && gun ? '<button class="hw-g hw-oz" data-hw="hafta">📋 Haftanın özeti hazır ›</button>' : ''}
    ${testZ ? '<button class="hw-g hw-test" data-hw="css">💡 CSS testi zamanı: eşik setleri hedefin altında · testi yap ›</button>' : ''}
    <button class="hw-g hw-bh" data-hw="buhafta">🗓 Bu hafta · yüzme + kara planı ›</button>`;
}

// --- Form ve denge ekranı -------------------------------------------------------------------

function showForm() { show('form'); renderForm(); }

/** Haftalık yük çubukları (yüzme + salon üst üste), normal hafta kesikli çizgi. */
function haftaGrafik(H, normal) {
  const w = 320, h = 150, pl = 8, pr = 8, pt = 16, pb = 20;
  const max = Math.max(normal * 1.4, ...H.map((x) => x.top)) || 1;
  const bw = (w - pl - pr) / H.length;
  const Y = (v) => pt + (h - pt - pb) * (1 - v / max);
  const o = [`<svg class="hg hy" viewBox="0 0 ${w} ${h}" role="img" aria-label="Son ${H.length} hafta yük">`];
  H.forEach((x, i) => {
    const x0 = pl + i * bw + 4, bwi = Math.max(2, bw - 8);
    const yY = Y(x.yuzme), yS = Y(x.yuzme + x.salon);
    if (x.yuzme) o.push(`<rect x="${x0.toFixed(1)}" y="${yY.toFixed(1)}" width="${bwi.toFixed(1)}" height="${(h - pb - yY).toFixed(1)}" rx="2" class="by"><title>${esc(fmtDateTR(x.bas))} haftası · yüzme ${fmtNum(x.yuzme)}</title></rect>`);
    if (x.salon) o.push(`<rect x="${x0.toFixed(1)}" y="${yS.toFixed(1)}" width="${bwi.toFixed(1)}" height="${(yY - yS).toFixed(1)}" rx="2" class="bs"><title>${esc(fmtDateTR(x.bas))} haftası · kara ${fmtNum(x.salon)}</title></rect>`);
    if (i % 2 === (H.length - 1) % 2 || i === H.length - 1) o.push(`<text x="${(x0 + bwi / 2).toFixed(1)}" y="${h - 5}" text-anchor="middle" class="ax">${i === H.length - 1 ? 'bu hafta' : `${x.bas.slice(8, 10)}.${x.bas.slice(5, 7)}`}</text>`);
  });
  o.push(`<line x1="${pl}" x2="${w - pr}" y1="${Y(normal).toFixed(1)}" y2="${Y(normal).toFixed(1)}" class="ref"/><text x="${w - pr}" y="${(Y(normal) - 4).toFixed(1)}" text-anchor="end" class="ax">normal hafta ${fmtNum(normal)}</text>`);
  o.push(`<line x1="${pl}" x2="${w - pr}" y1="${h - pb}" y2="${h - pb}" class="gl"/></svg>`);
  return o.join('');
}

function renderForm() {
  const G = genelDurum();
  const B = G.buHafta;
  const p = prefs();
  // 1. Bu hafta
  const bar = Math.min(100, Math.round((B.top / (G.normal * 1.5)) * 100));
  const nrm = Math.round((G.normal / (G.normal * 1.5)) * 100);
  // 2. Gidişat (yük artışı)
  const gid = G.od.durum === 'yuksek' ? ['warn', 'Yük son haftalara göre çok arttı: bu hafta hafif tut ya da dinlenme haftası yap.']
    : G.od.durum === 'sinirda' ? ['warn', 'Yük artışı sınırda: bir sonraki haftayı artırma.']
      : G.od.durum === 'donus' ? ['', 'Aradan dönüş döneminde: her hafta en çok %20 artır, 3–4 haftada normale çık.']
        : G.od.durum === 'dusuk' ? ['', 'Yük son haftalara göre az: istersen kademeli artır.']
          : G.od.durum === 'guvenli' ? ['ok', 'Yük dengeli artıyor (güvenli aralık).'] : ['', 'Değerlendirme için en az 2 haftalık kayıt gerekli.'];
  const dinOn = dinlenmeDurumu(G);
  // Haftalık set (salon, kas grubu başına; hedef 10–20, omuz ≤ 12)
  const sd = salonData();
  const hs = sd ? hazir.haftalikSet(sd.gecmis.map((r) => ({ tarih: r.tarih, hareket: r.hareket, set: r.set })), salon.haftaBasi(G.bugun), G.bugun, hPay) : {};
  const setHtml = Object.keys(hs).length ? `<p class="sp-lb">HAFTALIK SET · KAS GRUBU <small>(kara; hedef 10–20, omuz itiş ≤ 12)</small></p>${grup.sirala(Object.keys(hs)).map((g) => { const d = hazir.setDurum(g, hs[g]); return `<div class="fd-r"><span class="fs-g">${esc(g)}</span><div class="fd-t"><i data-bg="${grup.grupRenk(g)}" data-w="${Math.min(100, (hs[g] / 20) * 100)}"></i><s data-l="${(d.alt / 20) * 100}"></s></div><b class="n ${d.durum === 'iyi' ? '' : 'warn'}">${hs[g]}</b><small>${d.durum === 'az' ? 'az' : d.durum === 'fazla' ? 'fazla' : 'iyi'}</small></div>`; }).join('')}` : '';
  // 3. Kas yorgunluğu: yalnızca toparlanması %90'ın altındaki gruplar
  const yorgun = Object.entries(G.tp).filter(([, o]) => o.toparlanma < 90).sort((a, b) => a[1].toparlanma - b[1].toparlanma);
  const yk = Object.fromEntries(yorgun.map(([g, o]) => [g, Math.min(100, Math.round((100 - o.toparlanma) * 2))]));
  const kaynak = (o) => (o.yuzmePay >= 80 ? 'yüzmeden' : o.salonPay >= 80 ? 'karadan' : 'yüzme + kara');
  // 4. Yoğunluk dengesi (yüzme setleri, süre ağırlıklı)
  const hist = data.getHistory();
  const reps = (from) => {
    const out = [];
    for (const r of hist) {
      if (!r || r.tur === 'salon' || r.tarih < from) continue;
      for (const st of r.setler || []) {
        const sn = analiz.lapSn(st.gercek);
        if (!st.tamamlandi || sn == null) continue;
        const z = zoneOf(pacePer100(sn, st.mesafe), st);
        if (z) out.push({ ms: sn * 1000 * (Number(st.yapilan) || Number(st.tekrar) || 1), n: z.n, zone: z.zone });
      }
    }
    return analiz.denge(analiz.bolgeSureleri(out));
  };
  const bas4 = yuk.gunEkle(G.bugun, -28);
  const d4 = reps(bas4);
  const dengeVar = d4.kolay + d4.esik + d4.hiz > 0;
  const dengeSatir = (ad, a, hedef, cls) => `<div class="fd-r"><span>${ad}</span><div class="fd-t"><i class="${cls}" data-w="${a}"></i></div><b class="n">%${a}</b><small>${hedef}</small></div>`;
  const dengeNot = !dengeVar ? '' : d4.kolay < 60 ? 'Kolay yüzme az: aerobik taban için kolay payını artır.' : d4.hiz > 20 ? 'Hız payı yüksek: omuz için hız setlerini sınırlı tut.' : 'Dağılım dengeli.';
  // 5. Stil
  const st4 = {};
  let stTop = 0;
  for (const x of G.L) if (x.tur === 'yuzme' && x.tarih >= bas4) for (const [k, m] of Object.entries(x.stil || {})) { st4[k] = (st4[k] || 0) + m; stTop += m; }
  const ay = yuk.stilAy(G.L, G.bugun.slice(0, 7));
  // 6. Döngü (blok): yalnızca başlatılınca
  const BLOK = [['Hacim', 'Kara 3 × 12–15 · yüzmede aerobik hacim'], ['Hacim+', 'Kara 3–4 × 10–12 · eşik setleri artar'], ['Kuvvet', 'Kara 3 × 6–8, dinlenme 2 dk · yüzme hacmi −%10'], ['Dinlenme', 'Hacim %40 az, yoğunluk aynı']];
  let blokHtml;
  const fdT = fazBilgisi();
  if (fdT.kaynak === 'takvim') {
    blokHtml = `<div class="fm-blok">${fdT.dongu.map((a, i) => `<div class="${i === fdT.i ? 'on' : ''}"><b>${i + 1}</b><small>${esc(a)}</small></div>`).join('')}</div>
      <p class="fm-bt"><b>${esc(fazEtiket(fdT))} · ${esc(fdT.F.ad)}</b> — kara: ${esc(fdT.F.salon)} · yüzme: ${esc(fdT.F.yuzme)}</p>
      ${fdT.yasak.length ? `<p class="fm-acik">Bu fazda yok: ${esc(fdT.yasak.join(', ').toLocaleUpperCase('tr'))}</p>` : ''}
      <p class="fm-acik">Faz takvimi idmanRef faz sayfasından; döngü ve yasaklar kisit sayfasından (dongu_F…, yasak_F…).</p>`;
  } else if (p.blokBas) {
    const hf = Math.floor((Date.parse(salon.haftaBasi(G.bugun)) - Date.parse(p.blokBas)) / (7 * 86400000));
    const bh = ((hf % 4) + 4) % 4;
    blokHtml = `<div class="fm-blok">${BLOK.map(([a], i) => `<div class="${i === bh ? 'on' : ''}"><b>${i + 1}</b><small>${a}</small></div>`).join('')}</div>
      <p class="fm-bt"><b>${bh + 1}. hafta · ${BLOK[bh][0]}</b> — ${esc(BLOK[bh][1])}</p>
      ${G.od.durum === 'yuksek' && bh !== 3 ? '<p class="fm-bt warn">⚠ Yük hızlı arttı: dinlenme haftasını öne al.</p>' : ''}
      <button class="btn btn-block" data-fm="blokbitir">Döngüyü durdur</button>`;
  } else {
    blokHtml = `<p class="fm-acik">İsteğe bağlı: 3 hafta artan yük + 1 hafta dinlenme. Başlatırsan hangi haftada olduğun ve o haftanın kara/yüzme ağırlığı burada görünür.</p>
      <button class="btn btn-block" data-fm="blok">Döngüyü bu hafta başlat</button>`;
  }
  // 13.5 göstergeleri: B1 oran, B9 monotoni, B17 form eğrisi, B11 bölge dağılımı
  const O = gosterge.oranlar(G.L, G.bugun);
  const RENK = { yesil: 'ok', sari: 'warn', turuncu: 'tur', az: '', yok: '' };
  const oranSatir = (ad, o, cls) => `<div class="fd-r g-or"><span>${ad}</span><div class="fd-t"><i class="${cls}" data-w="${o.oran == null ? 0 : Math.min(100, Math.round((o.oran / 2) * 100))}"></i></div><b class="n ${RENK[o.renk]}">${o.oran == null ? '—' : `${fmtDec(o.oran)}×`}</b></div>`;
  const M = gosterge.monotoni(G.g, G.bugun);
  const mMax = Math.max(1, ...M.gunler.map((x) => x.yuk));
  const turGun = (t) => { const ss = G.L.filter((x) => x.tarih === t); return ss.some((x) => x.tur === 'salon') ? (ss.some((x) => x.tur === 'yuzme') ? 'gk' : 'gs') : 'gy'; };
  const GA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const monoHtml = `<div class="g-mono">${M.gunler.map((x) => `<div><i class="${x.yuk ? turGun(x.tarih) : ''}" data-h="${Math.round((x.yuk / mMax) * 100)}"></i><small>${GA[new Date(`${x.tarih}T12:00:00`).getDay()]}</small></div>`).join('')}</div>
    <div class="fd-r g-or"><span>Monotoni</span><b class="n ${M.yuksek ? 'warn' : 'ok'}">${M.monotoni == null ? '—' : fmtDec(M.monotoni)}</b><small>${M.monotoni == null ? 'son 7 günde yük yok' : M.yuksek ? 'yüksek: her gün benzer yük' : 'düşük = iyi (dinlenme günleri var)'}</small></div>
    <div class="fd-r g-or"><span>Zorlanma</span><b class="n">${M.zorlanma == null ? '—' : fmtNum(M.zorlanma)}</b><small>haftalık yük × monotoni</small></div>
    ${M.yuksek ? '<p class="fm-sonuc warn">2\'nin üstü: her gün benzer yük → araya kolay gün koy.</p>' : ''}`;
  const gY = p.karaYorgunluk ? yuk.gunluk(G.L.filter((x) => x.tur === 'yuzme')) : null;
  const E = yuk.formEgrisi(G.g, G.bugun, 42, gY);
  const TR = gosterge.trend(E);
  const TRAD = { yukseliyor: '↑ yükseliyor', dusuyor: '↓ düşüyor', dengeli: '→ dengeli' };
  const eMax = Math.max(1, ...E.map((x) => Math.max(x.kondisyon, x.yorgunluk)));
  const pts = (k) => E.map((x, i) => `${((i / Math.max(1, E.length - 1)) * 316 + 2).toFixed(1)},${(98 - (x[k] / eMax) * 90).toFixed(1)}`).join(' ');
  const egriHtml = E.some((x) => x.kondisyon || x.yorgunluk) ? `<svg class="g-egri" viewBox="0 0 320 100" role="img" aria-label="Form eğrisi"><polyline points="${pts('kondisyon')}" class="ek"/><polyline points="${pts('yorgunluk')}" class="ey"/></svg>
    <p class="g-chips">${TR.kondisyon ? `<span class="g-chip k">Kondisyon ${TRAD[TR.kondisyon]}</span>` : ''}${TR.yorgunluk ? `<span class="g-chip y">Yorgunluk ${TRAD[TR.yorgunluk]}</span>` : ''}</p>` : '<p class="fm-acik">Form eğrisi için kayıt yok.</p>';
  const fdB = fazBilgisi();
  const hedefB = gosterge.bolgeHedefi(fdB.kaynak === 'takvim' ? fdB.fazKod : 1);
  const repsHafta = [];
  for (const r of hist) {
    if (!r || r.tur === 'salon' || r.tarih < salon.haftaBasi(G.bugun)) continue;
    for (const st of r.setler || []) {
      const sn = analiz.lapSn(st.gercek);
      if (!st.tamamlandi || sn == null) continue;
      const z = zoneOf(pacePer100(sn, st.mesafe), st);
      if (z) repsHafta.push({ ms: sn * 1000 * (Number(st.yapilan) || Number(st.tekrar) || 1), zone: z.zone });
    }
  }
  const BD = gosterge.bolgeDagilimi(repsHafta, hedefB);
  const BAD = { EN1: 'EN1 · kolay', EN2: 'EN2 · orta', EN3: 'EN3 · eşik', SP: 'SP · hız' };
  const bolgeHtml = BD ? `${Object.keys(BAD).map((k) => `<div class="fd-r g-or"><span>${BAD[k]}</span><div class="fd-t"><i class="z${k === 'EN1' ? 2 : k === 'EN2' ? 3 : k === 'EN3' ? 4 : 6}" data-w="${BD.pay[k]}"></i></div><b class="n ${BD.eksik.some((x) => x.grup === k) ? 'warn' : ''}">%${BD.pay[k]}</b><small>hedef ${hedefB[k]}</small></div>`).join('')}
    ${BD.eksik.map((x) => `<p class="fm-sonuc warn">⚠ ${esc(x.metin)}</p>`).join('')}` : '<p class="fm-acik">Bu hafta bölge bilgisi olan yüzme yok.</p>';
  $('fm-body').innerHTML = `
    <p class="sp-lb">BU HAFTA / SON 4 HAFTA <small>(yük oranı)</small></p>
    <div class="fm-card">${oranSatir('Toplam', O.top, 'ok')}${oranSatir('Yüzme', O.yuzme, 'by')}${oranSatir('Kara', O.kara, 'bs')}
      <p class="fm-acik">${esc(O.metin)} Renk: 0,8–1,3 yeşil · 1,3–1,5 sarı · üstü turuncu.</p></div>
    <p class="sp-lb">BU HAFTA</p>
    <div class="fm-card">
      <div class="fm-bh"><b class="n ${DURUM_CLS[G.hd.durum]}">%${G.hd.pay}</b><span><b>${esc(G.hd.metin)}</b><small>${B.seans}/${G.K.gunHafta + (G.K.gunHaftaSalon || 0)} seans · ${B.dk} dk · yük ${fmtNum(B.top)} / ${fmtNum(G.normal)}</small></span></div>
      <div class="fm-yb"><i data-w="${bar}" class="${DURUM_CLS[G.hd.durum]}"></i><s data-l="${nrm}"></s></div>
      <p class="fm-acik">Yük = süre (dk) × zorluk (RPE). Normal hafta = ${ayriGun(G.K) ? 'yüzme ' : ''}${G.K.gunHafta} seans × ${G.K.seansDk} dk × RPE ${G.K.seansRpe}${ayriGun(G.K) ? ` + kara ${G.K.gunHaftaSalon} × ${G.K.salonDk} dk × RPE ${G.K.salonRpe}` : ''}.</p>
    </div>
    <p class="sp-lb">SON 8 HAFTA <small>(turkuaz yüzme · mor kara)</small></p>
    ${haftaGrafik(G.H, G.normal)}
    ${G.od.durum === 'donus' || O.top.oran == null ? `<p class="fm-sonuc ${gid[0]}">${esc(gid[1])}</p>` : ''}
    ${dinOn.oner ? `<p class="fm-sonuc warn">⚠ Dinlenme haftası öner: ${esc(dinOn.nedenler.join(', '))}.</p>` : ''}
    ${setHtml}
    <p class="sp-lb">YÜKÜN HAFTAYA DAĞILIMI <small>(son 7 gün)</small></p>
    ${monoHtml}
    <p class="sp-lb">FORM EĞRİSİ · SON 6 HAFTA <small>(mavi kondisyon · turuncu yorgunluk)</small></p>
    ${egriHtml}
    <button class="g-ayar ${p.karaYorgunluk ? 'on' : ''}" data-fm="karayorg">Kara yükü yalnız yorgunluğa sayılsın <b>${p.karaYorgunluk ? 'AÇIK' : 'KAPALI'}</b></button>
    <p class="fm-acik">Açıkken kara idmanı yüzme kondisyonunu şişirmez, yalnız yorgunluğu artırır.</p>
    <p class="sp-lb">KAS YORGUNLUĞU · SON 4 GÜN <small>(tahmin)</small></p>
    ${yorgun.length ? `<div class="sp-kapsam"><span class="sp-mb big" data-mb data-mb-abs="1" data-mb-v="ikisi" data-mb-k="${esc(JSON.stringify(yk))}"></span><div>
        <p class="fm-acik">Renk koyulaştıkça kas daha yorgun; gri kaslar dinlenmiş.</p>
        ${yorgun.slice(0, 5).map(([g, o]) => `<p class="sp-kp"><span class="gd" data-bg="${grup.grupRenk(g)}"></span>${esc(g)}<b class="${o.toparlanma < 60 ? 'warn' : ''}">%${o.toparlanma} hazır</b></p><p class="fm-src">${kaynak(o)}</p>`).join('')}</div></div>`
      : '<p class="fm-sonuc ok">Tüm kaslar toparlanmış ✓</p>'}
    ${dengeVar ? `<p class="sp-lb">YÜZME YOĞUNLUĞU · SON 4 HAFTA <small>(set süresine göre)</small></p>
      ${dengeSatir('Kolay', d4.kolay, 'hedef ~%75', 'z3')}${dengeSatir('Eşik', d4.esik, '~%15', 'z4')}${dengeSatir('Hız', d4.hiz, '~%10', 'z6')}
      <p class="fm-acik">${esc(dengeNot)}</p>` : ''}
    <p class="sp-lb">BU HAFTA YOĞUNLUK · FAZ HEDEFİ <small>(${esc(fdB.kaynak === 'takvim' ? fazEtiket(fdB) : 'Faz 1 varsayılanı')})</small></p>
    ${bolgeHtml}
    ${stTop ? `<p class="sp-lb">STİL · SON 4 HAFTA</p><div class="fm-stil">${['FR', 'BK', 'BF', 'BR'].filter((k) => st4[k]).map((k) => `<i class="st-${k}" data-grow="${st4[k]}"></i>`).join('')}</div>
      <p class="oz-bl">${['FR', 'BK', 'BF', 'BR'].filter((k) => st4[k]).map((k) => `<span><i class="st-${k}"></i>${k} %${Math.round((st4[k] / stTop) * 100)}</span>`).join('')}</p>` : ''}
    <p class="fd-br ${ay.brOran >= G.K.brAyMax * 0.8 ? 'warn' : ''}">Kurbağalama bu ay %${fmtDec(ay.brOran)} · sınır %${G.K.brAyMax} (kalça, diz)</p>
    <p class="sp-lb">HAFTANIN İSKELETİ <small>(öneri; program sayfasına yazmaz)</small></p>
    ${iskelet(G)}
    <p class="sp-lb">4 HAFTALIK DÖNGÜ</p>
    ${blokHtml}`;
  paint($('fm-body'));
  yerlestirMini($('fm-body'));
  for (const el of $('fm-body').querySelectorAll('[data-w]')) el.style.width = `${el.dataset.w}%`;
  for (const el of $('fm-body').querySelectorAll('[data-l]')) el.style.left = `${el.dataset.l}%`;
  for (const el of $('fm-body').querySelectorAll('[data-h]')) el.style.height = `${Math.max(2, Number(el.dataset.h))}%`;
}

/** Haftanın iskeleti: bu haftanın günleri — yapılan, planlı yüzme, kalan yuvalar için öneri (kısıt + toparlanma). */
function iskelet(G) {
  const bas = salon.haftaBasi(G.bugun);
  const planli = new Set(visibleDates().map((x) => x.tarih));
  const ad = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const yapilan = yuk.haftaGunleri(G.L, G.bugun, ayriGun(G.K) ? 'yuzme' : null);
  let kalan = Math.max(0, G.K.gunHafta - yapilan);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const t = yuk.gunEkle(bas, i);
    const ss = G.L.filter((x) => x.tarih === t);
    let tx = '', cls = '';
    if (ss.length) { tx = ss.map((x) => `${x.tur === 'yuzme' ? 'Yüzme' : 'Kara'} ${x.dk} dk`).join(' + '); cls = 'ok'; }
    else if (planli.has(t) && t >= G.bugun) { tx = 'Yüzme programı'; cls = 't'; if (kalan) kalan--; }
    else if (t >= G.bugun && kalan && (i >= 1 && i <= 4)) {
      const slot = i === 4 ? 'akşam · sınırsız' : `sabah ${G.K.sure.sabah} / öğle ${G.K.sure.ogle} dk`;
      tx = `Öneri: ${i === 4 ? 'yüzme (eşik + hız)' : 'kara (önleyici + core)'} · ${slot}`; cls = 'a'; kalan--;
    }
    rows.push(`<div class="fm-gun ${cls}${t === G.bugun ? ' today' : ''}"><b>${ad[i]}</b><span>${esc(tx || '—')}</span></div>`);
  }
  return `<div class="fm-isk">${rows.join('')}</div>`;
}

// --- Bu hafta (sürüm 13): yüzme + salon tek plan --------------------------------------------
// Ortak döngü fazı, haftalık yük hedefi, eklem başına sağlık bütçesi, 7 günlük plan (yapılan → program → öneri),
// ölçüm zamanı. Salon önerisi onayla SalonTakip "plan" sayfasına yazılır; yüzme programı Code.gs'te kalır.

/** Bu haftanın fazı: faz takvimi (sporRef fazBilgi + kisit dongu_/yasak_) → elle döngü → varsayılan. */
function fazBilgisi() {
  const r = sporRef();
  return model.fazDurumu({ bugun: todayKey(), takvim: (r && Array.isArray(r.faz)) ? r.faz : [], K: kurallar(), blokBas: prefs().blokBas || null });
}
/** Faz etiketi: takvim "Faz 1 · Aerobik taban · 3. hafta", elle "Döngü · 2. hafta". */
function fazEtiket(fd) {
  if (fd.kaynak === 'takvim') return `${fd.fazAd}${fd.fazAd === `Faz ${fd.fazKod}` ? '' : ` (F${fd.fazKod})`} · ${fd.hafta}. hafta`;
  if (fd.kaynak === 'elle') return `Döngü · ${fd.i + 1}. hafta`;
  return '';
}
/** Döngü notu (salon planlamada): faz/döngü yoksa boş. */
function fazNotu() {
  const fd = fazBilgisi();
  if (!fd.kaynak) return '';
  return `<p class="sp-faz">${esc(fazEtiket(fd))} <b>${esc(fd.F.ad)}</b> — kara: ${esc(fd.F.salon)}</p>`;
}

function showBuHafta() { show('bu-hafta'); renderBuHafta(); }

function buHaftaVeri() {
  const G = genelDurum();
  const fd = fazBilgisi();
  const F = fd.F;
  const fn = fd.kaynak ? model.FAZLAR.findIndex((x) => x.ad === F.ad) : null;
  const bas = salon.haftaBasi(G.bugun);
  const gecen = G.H.length > 1 ? G.H[G.H.length - 2].top : 0;
  const hedef = model.haftaHedefi({ gecen, buHafta: G.buHafta.top, normal: G.normal, donus: G.donus, oran: G.od, fazKat: fn == null ? 1 : F.yukKat });
  const d = salonData();
  const ag = analiz.agriGecmisi(data.getHistory(), yuk.gunEkle(G.bugun, -14));
  const msiBolge = Object.fromEntries(Object.entries(ag).map(([k, o]) => [k, o.max]));
  const butce = model.saglikButceleri({ L: G.L, salonSatir: d ? d.gecmis.map((r) => ({ tarih: r.tarih, hareket: r.hareket, set: r.set })) : [], bugun: G.bugun, K: G.K, normal: G.normal, msiBolge, brAy: yuk.stilAy(G.L, G.bugun.slice(0, 7)).brOran });
  const hz = hazirBugun();
  const yOran = model.yuzmeSureOrani(data.getHistory()) || 1;
  const planDk = Object.fromEntries(visibleDates().map((x) => [x.tarih, Math.round((hedefSureOf(x) * yOran) / 60)]));
  const gunler = model.haftaPlani({ bugun: G.bugun, bas, K: G.K, L: G.L, planDk, yuzmePlan: visibleDates().map((x) => x.tarih), salonPlan: [...new Set(salonProgram().map((r) => r.tarih))], hazirKarar: hz ? hz.karar : null, fazNo: fn, F, hafiflet: G.od.durum === 'yuksek' });
  const r = data.isConfigured('ref') ? sporRef() : null;
  const c = r && r.css.length ? ref.cssFor(r, { tarih: G.bugun, havuz: prefs().havuz, alet: '' }) : null;
  const olcum = model.olcumZamani({ bugun: G.bugun, sonCssTarih: c ? c.ilk : null, fazNo: fn });
  return { G, fn, fd, F, hedef, butce, gunler, olcum };
}

function renderBuHafta() {
  const { G, fd, F, hedef, butce, gunler, olcum } = buHaftaVeri();
  const BCLS = { iyi: 'ok', sinirda: 'warn', asti: 'bad' };
  const DY = { yapildi: '✓ yapıldı', planli: 'programda', oneri: 'öneri', bos: '' };
  const pay = hedef.hedef ? Math.min(100, Math.round((G.buHafta.top / hedef.hedef) * 100)) : 0;
  $('bh-body').innerHTML = `
    <div class="bh-faz"><small>${fd.kaynak ? esc(fazEtiket(fd).toLocaleUpperCase('tr')) : 'DÖNGÜ KAPALI · varsayılan'}</small><b>${esc(F.ad)}</b>${fd.odak ? `<p>🎯 ${esc(fd.odak)}</p>` : ''}${fd.yasak.length ? `<p>⊘ bu fazda yok: ${esc(fd.yasak.join(', ').toLocaleUpperCase('tr'))}</p>` : ''}
      <p>🏊 ${esc(F.yuzme)}</p><p>🏋 ${esc(F.salon)}</p></div>
    <p class="sp-lb">HAFTALIK YÜK HEDEFİ <small>(yüzme + kara)</small></p>
    <div class="fm-card"><div class="fm-bh"><b class="n">%${pay}</b><span><b>${fmtNum(G.buHafta.top)} / ${fmtNum(hedef.hedef)} · kalan ${fmtNum(hedef.kalan)}</b><small>${esc(hedef.metin)}</small></span></div>
      <div class="fm-yb"><i data-w="${pay}" class="${pay > 100 ? 'warn' : 'ok'}"></i></div></div>
    <p class="sp-lb">SAĞLIK BÜTÇESİ · EKLEM</p>
    ${butce.map((b) => `<div class="fd-r bh-b"><span>${esc(b.ad)}</span><div class="fd-t"><i class="${BCLS[b.durum]}" data-w="${Math.min(100, b.pay)}"></i></div><b class="n ${BCLS[b.durum]}">${fmtDec(b.deger)} / ${fmtDec(b.sinir)}</b><small>${esc(b.birim)}</small></div><p class="fm-src">${esc(b.not)}</p>`).join('')}
    <p class="sp-lb">GÜNLER <small>(${ayriGun(G.K) ? `${G.K.gunHafta} yüzme + ${G.K.gunHaftaSalon} kara` : `${G.K.gunHafta} gün`}; Cuma akşam yüzme, Sal–Per sabah/öğle)</small></p>
    ${gunler.some((g) => g.isler.some((x) => x.tur === 'salon')) ? '' : '<p class="bh-u warn">⚠ Bu hafta kara günü yok: yüzme günlerinden birine 15–20 dk omuz önleyici + core ekle.</p>'}
    ${gunler.map((g) => `<div class="bh-gun ${g.durum}${g.tarih === G.bugun ? ' today' : ''}" data-bh-gun="${g.tarih}">
      <div class="bh-h"><b>${esc(g.gun)}</b><small>${esc(fmtDateTR(g.tarih).split(' ').slice(0, 2).join(' '))}</small>${DY[g.durum] ? `<em>${DY[g.durum]}</em>` : ''}</div>
      ${g.isler.map((x) => `<p class="bh-is ${x.tur}">${x.tur === 'yuzme' ? '🏊' : '🏋'} <b>${esc(x.ad)}</b>${x.sure ? ` · ${x.sure} dk` : ''}${x.butce ? `<small>${esc(x.butce)}</small>` : ''}${x.yan ? `<small>+ ${esc(x.yan)}</small>` : ''}${x.hafif ? `<small class="warn">${esc(x.hafif)}</small>` : ''}</p>`).join('')}
      ${g.uyarilar.map((u) => `<p class="bh-u warn">⚠ ${esc(u)}</p>`).join('')}
      ${g.isler.some((x) => x.tur === 'salon' && x.kaynak === 'oneri') ? `<button class="btn btn-block" data-bh="salon" data-t="${g.tarih}" data-dk="${g.isler.find((x) => x.tur === 'salon').sure || 65}">📅 Kara idmanını planla · programa yaz</button>` : ''}
    </div>`).join('')}
${uyumHtml(G)}
    ${olcum.length ? `<p class="sp-lb">ÖLÇÜM</p>${olcum.map((o) => (/^CSS/.test(o) ? `<button class="hw-g hw-test" data-bh="css">📏 ${esc(o)} · testi yap ›</button>` : `<p class="hw-g">📏 ${esc(o)}</p>`)).join('')}` : ''}
    <p class="sp-note">Yük = süre (dk) × zorluk (RPE). Yüzme programı idman dosyasındaki yuzmePlan'da kalır; önerilen kara günü düzenleyip karaPlan sayfasına yazabilirsin.</p>`;
  for (const el of $('bh-body').querySelectorAll('[data-w]')) el.style.width = `${el.dataset.w}%`;
}

/** Önerilen salon günü için hareketler: önce açık önleyici borç, sonra puan; kas grubu başına en çok 2, süre bütçesinin %80'i. */
function salonOneriListe(dk) {
  const d = salonData();
  if (!d) return [];
  const yer = prefs().yer && YERLER[prefs().yer];
  const ekipman = yer ? [...new Set(d.katalog.map((k) => k.ekipman).filter((e) => e && yer.test(e)))] : [];
  const { rows } = planRows(d, { oncelik: {}, amac: [], ekipman, stcMin: 0 });
  const sirali = [...rows.filter((r) => r.borcAcik), ...rows.filter((r) => !r.borcAcik && !r.yorgun.length)];
  const out = [];
  const gsay = {};
  for (const r of sirali) {
    if (out.some((x) => x.ad === r.ad)) continue;
    const g = grupOf(r.ad);
    if ((gsay[g] || 0) >= 2) continue;
    const x = salon.planHareket(d, r.ad, { bodyweight: (katalogOf(r.ad) || {}).ekipman === 'Bodyweight', uygula: false });
    if (out.length >= 3 && salonTahmin([...out, x]) > dk * 60 * 0.8) break;
    out.push(x);
    gsay[g] = (gsay[g] || 0) + 1;
    if (out.length >= 7) break;
  }
  return out;
}

/** 13.5 (B16): bu haftanın plan / yapılan uyumu (yüzme süresi plana göre ±%20 yeşil), kaçan gün için uyarlama önerisi. */
function uyumVeri(G) {
  const bas = salon.haftaBasi(G.bugun);
  const planY = new Set(visibleDates().map((x) => x.tarih));
  const planK = new Set(salonProgram().filter((r) => !r.durum).map((r) => r.tarih));
  const hist = data.getHistory();
  const planDkOf = (t) => {
    const r = hist.find((h) => h && h.tur !== 'salon' && h.tarih === t);
    if (!r) return 0;
    const sn = (r.setler || []).reduce((a, x) => a + (Number(x.tekrar) || 1) * ((analiz.lapSn(x.hedef) || 0) + (analiz.lapSn(x.dinlen) || 0)), 0);
    return Math.round(sn / 60);
  };
  const gunler = [];
  for (let i = 0; i < 7; i++) {
    const t = yuk.gunEkle(bas, i);
    const plan = [...(planY.has(t) ? [{ tur: 'yuzme' }] : []), ...(planK.has(t) ? [{ tur: 'salon' }] : [])];
    const yapilan = G.L.filter((x) => x.tarih === t).map((x) => ({ tur: x.tur, dk: x.dk, planDk: x.tur === 'yuzme' ? planDkOf(t) : 0 }));
    gunler.push({ tarih: t, plan, yapilan });
  }
  return gosterge.uyum(gunler, G.bugun);
}

const gunKisa = (t) => GUN_KISA[new Date(`${t}T12:00:00`).getDay()];
const turAd = (t) => (t === 'salon' ? 'Kara' : 'Yüzme');

function uyumHtml(G) {
  const U = uyumVeri(G);
  const rows = U.satirlar.filter((x) => x.durum !== 'bos');
  if (!rows.length) return '';
  const satir = (x) => {
    const y = x.yapilan[0];
    const tx = y ? `${x.yapilan.map((v) => `${turAd(v.tur)} ${v.dk} dk${v.planDk ? ` (plan ${v.planDk})` : ''}`).join(' + ')}` : `${turAd((x.plan[0] || {}).tur)} · ${x.durum === 'kirmizi' ? 'yapılmadı' : 'planlı'}`;
    const sag = x.durum === 'kirmizi' ? '<em class="bad">—</em>' : x.durum === 'bekliyor' ? '<em class="mu">bekliyor</em>' : x.pay != null ? `<em class="${x.durum === 'yesil' ? 'ok' : 'warn'}">%${x.pay}</em>` : '<em class="ok">✓</em>';
    return `<div class="g-gun"><span class="g-dot ${x.durum}"></span><b>${gunKisa(x.tarih)}</b><span>${esc(tx)}</span>${sag}</div>`;
  };
  return `<p class="sp-lb">PLAN / YAPILAN <small>(yüzme süresi plana göre ±%20 yeşil)</small></p>${rows.map(satir).join('')}
    ${U.uyarlama ? `<button class="btn btn-block set-gap" data-bh="uyarla" data-k="${U.uyarlama.kacan}" data-h="${U.uyarlama.hedef}">Uyarlama öner: kaçan ${gunKisa(U.uyarlama.kacan)} ${U.uyarlama.tur === 'salon' ? 'kara idmanını' : 'yüzmesini'} ${gunKisa(U.uyarlama.hedef)} gününe</button>` : ''}`;
}

function onBuHaftaClick(e) {
  const b = e.target.closest('[data-bh]');
  if (!b) return;
  if (b.dataset.bh === 'uyarla') {
    modal({ title: 'Uyarlama önerisi', body: `<p>${esc(fmtDateTR(b.dataset.k))} günü kaçan idmanı ${esc(fmtDateTR(b.dataset.h))} gününe al; o günün en önemli setini (eşik / kalite) koru, kalanını kısalt.</p><p class="muted">Uygulama tabloya yazmaz: planı yuzmePlan'da ya da YZ planlama oturumunda taşı.</p>`, actions: [{ label: 'Tamam', value: true, cls: 'btn-primary' }] });
    return;
  }
  if (b.dataset.bh === 'css') cssTestiAc();
  else if (b.dataset.bh === 'salon') {
    if (!salonData()) { toast('Kara verisi yok. Bağlantıyı kontrol et.'); return; }
    const liste = salonOneriListe(Number(b.dataset.dk) || 65);
    showSalonPlanSablon({ tur: 'oneri', hareketler: liste });
    if (sl.plan) { sl.plan.hedefTarih = b.dataset.t; renderSalonPlan(); }
  }
}

// --- Haftanın özeti ------------------------------------------------------------------------

function showHaftaOzeti(bas) { state.haftaBas = bas || salon.haftaBasi(todayKey()); show('hafta'); renderHaftaOzeti(); }

function haftaVeri(L, bas) {
  const son = yuk.gunEkle(bas, 6);
  const w = L.filter((x) => x.tarih >= bas && x.tarih <= son);
  const km = w.filter((x) => x.tur === 'yuzme').reduce((a, x) => a + (x.metre || 0), 0) / 1000;
  const set = w.filter((x) => x.tur === 'salon').reduce((a, x) => a + (x.set || 0), 0);
  const yk = w.reduce((a, x) => a + x.yuk, 0);
  const st = {};
  let top = 0;
  for (const x of w) if (x.tur === 'yuzme') for (const [k, m] of Object.entries(x.stil || {})) { st[k] = (st[k] || 0) + m; top += m; }
  return { w, km, set, yk, st, top, gun: new Set(w.map((x) => x.tarih)).size };
}

function renderHaftaOzeti() {
  const G = genelDurum();
  const bas = state.haftaBas;
  const H = haftaVeri(G.L, bas), O = haftaVeri(G.L, yuk.gunEkle(bas, -7));
  const son = yuk.gunEkle(bas, 6);
  const hd = yuk.haftaDurumu(H.yk, G.normal);
  const ag = analiz.agriGecmisi(data.getHistory().filter((r) => r.tarih >= bas && r.tarih <= son));
  const salonAgri = H.w.filter((x) => x.tur === 'salon' && x.msiMax >= 1);
  const d = salonData();
  const od = d ? salon.onleyiciDurum(d.gecmis, son < G.bugun ? son : G.bugun, hPay) : [];
  const kiy = (a, b, f) => (b ? ` <em class="${a >= b ? 'ok' : 'mu'}">${a >= b ? '↑' : '↓'} geçen ${f(b)}</em>` : '');
  const notlar = [];
  for (const o of od) notlar.push(`${o.ad} ${o.yapilan}/${o.hedef}${o.acik ? '' : ' ✓'}`);
  const testZ = analiz.cssTestiZamani(data.getHistory(), guncelCss(), son < G.bugun ? son : G.bugun);
  if (testZ) notlar.push('Eşik setleri hedefin altında → CSS testi önerilir');
  const or = yuk.oranDurum(yuk.yukOrani(G.g, son < G.bugun ? son : G.bugun, G.normal), { donus: G.donus });
  const prGun = salonProgram().filter((r) => r.tarih >= bas && r.tarih <= son).map((r) => r.tarih);
  if (prGun.length) { const u = hazir.planUyumu(prGun, H.w.filter((x) => x.tur === 'salon').map((x) => x.tarih)); notlar.push(`Kara programı uyumu: ${u.yapilan}/${u.planli} gün (%${u.pay})`); }
  if (or.durum === 'yuksek' || or.durum === 'sinirda') notlar.push(`Yük artış oranı: ${or.metin}`);
  const sag = { 'sag omuz': 'Omuz', 'sol omuz': 'Omuz', 'sag diz': 'Bacak', 'sol diz': 'Bacak', kalca: 'Kalça', bel: 'Sırt', boyun: 'Sırt' };
  const agK = {};
  for (const k of Object.keys(ag)) if (sag[k]) agK[sag[k]] = 100;
  $('hz-title').textContent = `${fmtDateTR(bas)} – ${fmtDateTR(son)}`;
  $('hz-next').disabled = son >= G.bugun;
  $('hz-body').innerHTML = `
    <div class="stats4"><div><small>YÜZME</small><b class="n">${fmtDec(Math.round(H.km * 10) / 10)}<span>km</span></b>${kiy(H.km, O.km, (v) => `${fmtDec(Math.round(v * 10) / 10)} km`)}</div>
      <div><small>KARA</small><b class="n">${H.set}<span>set</span></b>${kiy(H.set, O.set, (v) => `${v}`)}</div>
      <div><small>SEANS</small><b class="n">${H.gun}/${G.K.gunHafta}</b></div>
      <div><small>YÜK</small><b class="n">%${hd.pay}</b><em class="mu">${esc(hd.metin.toLocaleLowerCase('tr'))}</em></div></div>
    <p class="hz-yk">Haftalık yük <b>${fmtNum(H.yk)}</b>${O.yk ? ` · geçen hafta ${fmtNum(O.yk)} (${H.yk >= O.yk ? '+' : '−'}%${Math.abs(Math.round(((H.yk - O.yk) / O.yk) * 100))})` : ''}</p>
    ${H.top ? `<p class="sp-lb">STİL · KURBAĞALAMA %${fmtDec(Math.round(((H.st.BR || 0) / H.top) * 1000) / 10)}</p><div class="fm-stil">${['FR', 'BK', 'BF', 'BR'].filter((k) => H.st[k]).map((k) => `<i class="st-${k}" data-grow="${H.st[k]}"></i>`).join('')}</div>
      <p class="oz-bl">${['FR', 'BK', 'BF', 'BR'].filter((k) => H.st[k]).map((k) => `<span><i class="st-${k}"></i>${k} %${Math.round((H.st[k] / H.top) * 100)}</span>`).join('')}</p>` : ''}
    <p class="sp-lb">AĞRI</p>
    ${Object.keys(ag).length || salonAgri.length ? `<div class="sp-kapsam"><span class="sp-mb" data-mb data-mb-v="front" data-mb-k="${esc(JSON.stringify(agK))}"></span><div>${Object.entries(ag).map(([k, o]) => `<p>${esc((MSI_BOLGELER.find((x) => x.key === k) || { label: k }).label)}: MSI en çok ${fmtDec(o.max)} · ${o.n} seans</p>`).join('')}${salonAgri.map((x) => `<p>Salon ${esc(fmtDateTR(x.tarih))}: MSI ${fmtDec(x.msiMax)}</p>`).join('')}</div></div>` : '<p class="hz-ok">Ağrı kaydı yok ✓</p>'}
    <p class="sp-lb">GÜNLER</p>
    <div class="fm-isk">${H.w.length ? H.w.map((x) => `<div class="fm-gun ok"><b>${esc(fmtDateTR(x.tarih).split(' ').slice(0, 2).join(' '))}</b><span>${x.tur === 'yuzme' ? `Yüzme ${fmtNum(x.metre)} m` : `Salon ${x.set} set`} · ${x.dk} dk · RPE ${x.rpe == null ? '—' : fmtDec(x.rpe)}</span></div>`).join('') : '<p class="empty">Bu hafta kayıt yok.</p>'}</div>
    ${notlar.length ? `<p class="sp-lb">HAFTANIN NOTLARI</p><ul class="hz-not">${notlar.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
  paint($('hz-body'));
  yerlestirMini($('hz-body'));
}

/** Takvim gün düğmelerinin içine: salon simgesi, günlük yük çubuğu, ağrı işareti (sınıflar değişmez). */
function takvimEk() {
  const L = seansListesi();
  const g = yuk.gunluk(L);
  const msi = {};
  for (const r of data.getHistory()) if (r && r.tur !== 'salon' && Object.values(analiz.msiParse(r.seans && r.seans.msi)).some((v) => v >= 1)) msi[r.tarih] = true;
  for (const x of L) if (x.tur === 'salon' && x.msiMax >= 1) msi[x.tarih] = true;
  for (const b of document.querySelectorAll('#wk-track .wd')) {
    const t = b.dataset.day;
    const salonVar = L.some((x) => x.tarih === t && x.tur === 'salon');
    if (!salonVar && !g[t] && !msi[t]) continue;
    const ek = document.createElement('span');
    ek.className = 'wd-ek';
    ek.innerHTML = `${salonVar ? '<em class="wd-s" title="Kara">⊢⊣</em>' : ''}${msi[t] ? '<em class="wd-a" title="Ağrı (MSI ≥ 1)">⚠</em>' : ''}${g[t] ? `<u class="wd-y"><i data-h="${Math.min(100, Math.round(g[t] / 6))}"></i></u>` : ''}`;
    for (const el of ek.querySelectorAll('[data-h]')) el.style.height = `${el.dataset.h}%`;
    b.append(ek);
  }
}


// ---------------------------------------------------------------------------
// Telefonda yapılmış idmanlar
//
// Biten seanslar telefonda otomatik silinmez; yalnızca buradan elle silinir.
// Buradan silmek ne tabloyu ne de gönderim kuyruğunu etkiler.
// ---------------------------------------------------------------------------

const DURUM = {
  sent: { ad: 'Tabloda', cls: 'ok' },
  duplicate: { ad: 'Zaten kayıtlıydı', cls: 'dim' },
  queued: { ad: 'Kuyrukta', cls: 'warn' },
  lost: { ad: 'Gönderilmedi', cls: 'err' },
};

/** Kaydın güncel durumu: kuyrukta mı, gönderildi mi? */
function historyStatus(rec, queued) {
  if (queued.has(qKey(rec, rec.tarih))) return 'queued';
  if (rec.status === 'queued') return 'lost'; // kuyruktan elle silinmiş
  return DURUM[rec.status] ? rec.status : 'sent';
}

/** Kayıt türü: 'salon' ya da 'yuzme' (eski kayıtlarda tur yok). */
const turOf = (x) => (x && x.tur === 'salon' ? 'salon' : 'yuzme');
const qKey = (x, tarih) => `${turOf(x)}|${tarih}`;
/** Kuyruktaki kayıtların "tür|tarih" anahtarları. */
const queuedDates = () => new Set(data.getQueue().map((q) => qKey(q, q.payload.tarih)));

function showHistory() {
  show('history');
  renderHistory();
}

function renderHistory() {
  const list = data.getHistory();
  const queued = queuedDates();
  $('hist-bar').hidden = !list.length;
  if (!list.length) {
    $('hist-list').innerHTML = '<p class="empty">Henüz kayıt yok</p>';
    return;
  }
  $('hist-list').innerHTML = list.map((r) => {
    const dt = parseKey(r.tarih);
    const st = DURUM[historyStatus(r, queued)];
    if (turOf(r) === 'salon') {
      const sets = r.hareketler.reduce((a, x) => a + (Number(x.set) || 0), 0);
      return `
      <button class="day-row hist-row is-salon" data-hist="${esc(r.id)}">
        <span class="dr-date"><b>${dt.getDate()}</b><small>${AY_KISA[dt.getMonth()].toLocaleUpperCase('tr')}</small></span>
        <span class="dr-info">
          <span class="dr-name">Kara · ${GUNLER[dt.getDay()]} <em class="chip ${st.cls}">${st.ad}</em></span>
          <span class="dr-meta">${r.hareketler.length} hareket · ${sets} set${r.sure ? ` · ${esc(fmtDur(parseSec(r.sure)))}` : ''}</span>
        </span>
      </button>`;
    }
    const done = r.setler.filter((x) => x.tamamlandi);
    const mesafe = r.seans && r.seans.mesafe !== '' && r.seans.mesafe != null ? Number(r.seans.mesafe) : done.reduce((a, x) => a + setDist(x), 0);
    const sure = r.seans && parseSec(r.seans.sure) ? fmtDur(parseSec(r.seans.sure)) : '';
    return `
      <button class="day-row hist-row" data-hist="${esc(r.id)}">
        <span class="dr-date"><b>${dt.getDate()}</b><small>${AY_KISA[dt.getMonth()].toLocaleUpperCase('tr')}</small></span>
        <span class="dr-info">
          <span class="dr-name">${GUNLER[dt.getDay()]} <em class="chip ${st.cls}">${st.ad}</em></span>
          <span class="dr-meta">${done.length}/${r.setler.length} set · ${fmtNum(mesafe)} m${sure ? ` · ${esc(sure)}` : ''}</span>
          ${miniBar(done.map((x) => ({ blok: x.blok, mesafe: setDist(x) })))}
        </span>
      </button>`;
  }).join('');
  paint($('hist-list'));
}

function historyDetail(r) {
  if (turOf(r) === 'salon') {
    const box = document.createElement('div');
    box.className = 'hd';
    box.innerHTML = `${r.sure ? `<p>Kara · Süre ${esc(fmtDur(parseSec(r.sure)))}</p>` : ''}<div class="hd-sets">${r.hareketler.map((x) => `
      <div class="hd-set"><i data-bg="${grupInfo(x.hareket).renk}"></i><span><b>${esc(x.hareket)}</b>
        <small>${x.set} × ${esc(fmtDec(x.tekrar))} · ${esc(fmtKg(x.agirlik))}${x.sure ? ` · ${esc(x.sure)}` : ''}${x.rpe !== '' ? ` · RPE ${esc(fmtDec(x.rpe))}` : ''}${x.msi !== '' ? ` · MSI ${esc(fmtDec(x.msi))}` : ''}</small>
        ${x.aciklama ? `<small>${esc(x.aciklama)}</small>` : ''}</span></div>`).join('')}</div>`;
    return paint(box);
  }
  const s = r.seans || {};
  const facts = [
    s.sure ? `Süre ${esc(s.sure)}` : '',
    s.mesafe !== '' && s.mesafe != null ? `${fmtNum(s.mesafe)} m` : '',
    s.havuz ? `Havuz ${esc(s.havuz)} m` : '',
    s.rpe !== '' && s.rpe != null ? `RPE ${esc(s.rpe)}` : '',
  ].filter(Boolean).join(' · ');
  const sets = r.setler.map((x) => `
    <div class="hd-set${x.tamamlandi ? '' : ' is-skip'}">
      <i data-bg="${blokRenk(x)}"></i>
      <span><b>${x.tamamlandi ? '✓ ' : ''}${esc([setTitle(x), x.tur].filter(Boolean).join(' '))}</b>
      ${x.gercek ? `<small>Gerçek ${esc(x.gercek)}${x.hedef ? ` · Hedef ${esc(x.hedef)}` : ''}</small>` : ''}
      ${x.not ? `<small>${esc(x.not)}</small>` : ''}</span>
    </div>`).join('');
  const body = document.createElement('div');
  body.className = 'hd';
  body.innerHTML = `
    ${facts ? `<p>${facts}</p>` : ''}
    ${s.msi ? `<p class="muted">MSI: ${esc(s.msi)}</p>` : ''}
    ${s.aciklama ? `<p>${esc(s.aciklama)}</p>` : ''}
    <div class="hd-sets">${sets}</div>`;
  return paint(body);
}

async function onHistoryClick(e) {
  const row = e.target.closest('[data-hist]');
  if (!row) return;
  const rec = data.getHistory().find((x) => x.id === row.dataset.hist);
  if (!rec) return renderHistory();
  const act = await modal({
    title: fmtDateTR(rec.tarih),
    body: historyDetail(rec),
    actions: [{ label: 'Bu kaydı sil', value: 'del', cls: 'btn-danger' }, { label: 'Kapat', value: '' }],
  });
  if (act !== 'del') return;
  const pending = queuedDates().has(qKey(rec, rec.tarih));
  const ok = await modal({
    title: pending ? 'Henüz gönderilmedi' : 'Kayıt silinsin mi?',
    body: pending
      ? '<p>Bu seans tabloya henüz gönderilmedi. Telefondaki kopyası silinir; gönderim kuyruğu etkilenmez, bağlantı gelince yine gönderilir.</p>'
      : '<p>Telefondaki kopya silinir. Tablodaki kayıt etkilenmez.</p>',
    actions: [{ label: 'Evet, sil', value: true, cls: 'btn-danger' }, { label: 'Vazgeç', value: false }],
  });
  if (ok) data.removeHistory([rec.id]);
  renderHistory();
}

async function clearHistory() {
  const list = data.getHistory();
  const queued = queuedDates();
  const sent = list.filter((r) => ['sent', 'duplicate'].includes(historyStatus(r, queued)));
  const pending = list.filter((r) => queued.has(qKey(r, r.tarih)));
  const actions = [];
  if (sent.length && sent.length < list.length) actions.push({ label: `Tabloya gidenleri sil (${sent.length})`, value: 'sent', cls: 'btn-danger' });
  actions.push({ label: `Tümünü sil (${list.length})`, value: 'all', cls: 'btn-danger' }, { label: 'Vazgeç', value: '' });
  const pick = await modal({
    title: 'Kayıtları sil',
    body: '<p>Yalnızca bu telefondaki kopyalar silinir; tablodaki kayıtlar etkilenmez.</p>',
    actions,
  });
  if (!pick) return;
  if (pick === 'all' && pending.length) {
    const ok = await modal({
      title: 'Gönderilmemiş kayıt var',
      body: `<p>${pending.length} seans henüz tabloya gönderilmedi (${esc(pending.map((r) => fmtDateTR(r.tarih)).join(', '))}). Telefondaki kopyaları silinir; gönderim kuyruğu etkilenmez.</p>`,
      actions: [{ label: 'Yine de sil', value: true, cls: 'btn-danger' }, { label: 'Vazgeç', value: false }],
    });
    if (!ok) return;
  }
  data.removeHistory((pick === 'all' ? list : sent).map((r) => r.id));
  renderHistory();
}

async function openDate(tarih) {
  if (state.session && state.session.tarih === tarih && state.plan) return resumeSession();
  if (state.session && hasProgress(state.session)) {
    const ok = await modal({
      title: 'Devam eden seans var',
      body: `<p>${esc(fmtDateTR(state.session.tarih))} seansı kaydedilmedi. Yeni güne geçersen silinecek.</p>${yapilanUyari(state.session)}`,
      actions: [{ label: 'Sil ve geç', value: true, cls: 'btn-danger' }, { label: 'Vazgeç', value: false }],
    });
    if (!ok) return;
  }

  // Program önbellekteyse (tarih listesiyle gelir) beklemeden açılır;
  // sunucudaki güncel hali arka planda kontrol edilir.
  const cached = data.getCachedPlan(tarih);
  if (cached && cached.setler.length) {
    startSession(tarih, cached);
    refreshPlan(tarih);
    return;
  }

  if (state.opening) return; // çift dokunma
  state.opening = true;
  toast('Program yükleniyor…', 30000);
  let r;
  try {
    r = await data.getPlan(tarih);
  } catch (err) {
    toast(`Program yüklenemedi: ${err.message}`, 4000);
    return;
  } finally {
    state.opening = false;
  }
  $('toast').hidden = true;

  if (!r.plan.setler || !r.plan.setler.length) {
    await modal({
      title: 'Set bulunamadı',
      body: `<p>${esc(fmtDateTR(tarih))} için yuzmePlan sayfasında satır yok.</p>`,
      actions: [{ label: 'Tamam', value: true }],
    });
    return showDays();
  }

  startSession(tarih, r.plan);
  if (r.fromCache) toast('Çevrimdışı: son yüklenen program gösteriliyor.');
}

function startSession(tarih, plan) {
  state.plan = { ...plan, tarih };
  state.session = newSession(tarih);
  state.session.yedek = plan.setler; // 13.9: program önbellekten düşse de seans açılabilsin
  persist();
  openProgram();
  const cu = cssUyarisi(tarih); // geçerli CSS yoksa bölge verilmez: bir kez söyle
  if (cu) toast(cu, 4500);
}

/**
 * Önbellekten açılan programın sunucudaki halini kontrol eder. Program
 * değişmişse ve seansa henüz başlanmadıysa (işaret, süre yok) yenisiyle
 * değiştirilir; başlanmışsa seans boyunca eldeki program korunur.
 */
async function refreshPlan(tarih) {
  let fresh;
  try {
    fresh = await data.fetchPlan(tarih);
  } catch {
    return; // çevrimdışı: önbellekteki program yeterli
  }
  const s = state.session;
  if (!s || s.tarih !== tarih || !state.plan) return;
  if (!fresh.setler.length || JSON.stringify(fresh.setler) === JSON.stringify(state.plan.setler)) return;
  if (hasProgress(s)) return;
  data.storePlan({ ...fresh, tarih });
  state.plan = { ...fresh, tarih };
  s.pos = 0;
  persist();
  if (state.screen === 'program') openProgram();
  toast('Program tablodan güncellendi.');
}

/**
 * Eski Code.gs tarih listesiyle programları göndermez: yaklaşan ilk birkaç
 * günün programı arka planda indirilir ki açılışta beklenmesin.
 */
async function prefetchPlans() {
  const today = todayKey();
  const upcoming = visibleDates().filter((d) => d.tarih >= today && !data.getCachedPlan(d.tarih)).slice(0, 3);
  for (const d of upcoming) {
    try {
      await data.getPlan(d.tarih);
    } catch {
      return;
    }
  }
}

function resumeSession() {
  const s = state.session || data.loadSession();
  // 13.9: önbellekte program yoksa seansın kendi kopyası; başlamış seans hiçbir zaman sessizce silinmez.
  const yedek = s && [s.setler, s.yedek].find((x) => Array.isArray(x) && x.length);
  const plan = s && (data.getCachedPlan(s.tarih) || (yedek ? { tarih: s.tarih, setler: yedek } : null));
  if (!s || !plan) {
    data.clearSession();
    state.session = null;
    return showDays();
  }
  state.session = migrateSession(s);
  // İdmanda düzenlenen plan seansta saklanır.
  state.plan = Array.isArray(state.session.setler) && state.session.setler.length ? { ...plan, setler: state.session.setler } : plan;
  state.zst = null;
  persist();
  if (state.session.screen === 'rpe' && zst().phase === 'done') return openRpe();
  if (state.session.screen === 'msi' && zst().phase === 'done') { ensureForm(); return openMsi(); }
  if (state.session.screen === 'ozet' && zst().phase === 'done') { ensureForm(); return openOzet(); }
  if (zst().phase === 'done') return openRpe();
  return openProgram();
}

// ---------------------------------------------------------------------------
// İdman ekranı (ZAMANLAMA.md)
//
// Tek büyük düğme: YÜZ → DUR → YÜZ … (ilk YÜZ idmanı da başlatır). Her dokunuş yalnızca
// bir olay (zaman damgası) ekler; durum ve süreler zaman.js ile olay
// listesinden hesaplanır. Setin son DUR'u seti, son setin son DUR'u
// idmanı bitirir. Geri al son olayı siler.
// ---------------------------------------------------------------------------

const hexA = (hex, a) => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

const GUARD_MS = 2000;  // geçişten sonra ikinci dokunuş yok sayılır
const UNDO_MS = 5000;   // Geri al bu süre görünür

const ev = () => state.session.events;
const zst = () => state.zst || (state.zst = zaman.replay(ev(), state.plan.setler));
const tekrarOf = (s) => Number(s.tekrar) || 1;
const legacyDone = (i) => {
  const L = state.session.legacy;
  return Boolean(L && L.done && L.done[setKey(state.plan.setler[i], i)]);
};

/** 'bekliyor' | 'suruyor' | 'tamam' | 'eksik' (eski sürümden gelen işaretli setler 'tamam'). */
function statusOf(i) {
  const st = zst();
  if (!st.per[i].reps.length && legacyDone(i)) return 'tamam';
  return zaman.setStatus(st, i, tekrarOf(state.plan.setler[i]));
}

/** from'dan sonraki ilk başlanmamış set (baştan sarar); yoksa -1. */
function nextOpenSet(from) {
  const n = state.plan.setler.length;
  for (let k = 1; k <= n; k++) {
    const j = (from + k) % n;
    if (statusOf(j) === 'bekliyor') return j;
  }
  return -1;
}

function sessionDistance() {
  const st = zst();
  let d = zaman.doneDistance(st, state.plan.setler);
  state.plan.setler.forEach((s, i) => { if (!st.per[i].reps.length && legacyDone(i)) d += setDist(s); });
  return d;
}

const fmtShort = (ms) => fmtDur(Math.round(ms / 1000));
/** Ekrandaki ortalama: "1:29.8" (tabloya fmtLap ile "01:29.8" yazılır). */
const fmtAvg = (ms) => fmtLap(ms).replace(/^0(\d:)/, '$1');
const signed = (sec) => `${sec < 0 ? '−' : '+'}${Math.abs(Math.round(sec))} sn`;

/** Kartın içeriği hangi kipte: 'live' (yüzülen/dinlenilen set), 'next' (dinlenirken odaktaki başka set), 'sum' (biten), 'ready'. */
function cardMode(i) {
  const st = zst();
  const pos = state.wheel ? state.wheel.index : state.session.pos || 0;
  const status = statusOf(i);
  if (st.phase === 'swim' && i === st.cur) return 'live';
  if (st.phase === 'rest') {
    if (i === st.cur && status !== 'tamam') return 'live';
    if (i === pos && i !== st.cur) return 'next';
  }
  if (status === 'tamam' || status === 'eksik') return 'sum';
  return 'ready';
}

function repBoxes(i, withLive) {
  const s = state.plan.setler[i];
  const st = zst();
  const reps = st.per[i].reps;
  const n = tekrarOf(s);
  const boxes = [];
  for (let r = 0; r < Math.max(n, reps.length); r++) {
    const rep = reps[r];
    let cls = '';
    let v = '—';
    if (rep && rep.geldim != null) { cls = 'ok'; v = fmtShort(rep.geldim - rep.cik); }
    else if (rep && withLive) { cls = 'now'; v = ''; }
    if (withLive && st.phase === 'rest' && st.cur === i && r === reps.length && r < n) { cls = 'rest'; v = ''; }
    boxes.push(`<div class="${cls}"><small>${r + 1}.</small><b class="n">${v}</b></div>`);
  }
  return `<div class="w-reps${boxes.length > 6 ? ' is-many' : ''}">${boxes.join('')}</div>`;
}

/** 5+ tekrarlı setler için tek satır şerit: her tekrar bir çentik; altında sayaç, ortalama ve son 3 süre. */
function repStrip(i) {
  const s = state.plan.setler[i];
  const st = zst();
  const reps = st.per[i].reps;
  const n = tekrarOf(s);
  const notches = [];
  for (let r = 0; r < Math.max(n, reps.length); r++) {
    const rep = reps[r];
    let cls = '';
    if (rep && rep.geldim != null) cls = 'ok';
    else if (rep) cls = 'now';
    else if (st.phase === 'rest' && st.cur === i && r === reps.length) cls = 'rs';
    notches.push(`<i class="${cls}"></i>`);
  }
  const times = zaman.repTimes(st, i);
  const swimming = st.phase === 'swim' && st.cur === i;
  const label = swimming ? `Tekrar ${reps.length}/${n}` : `${times.length}/${n} bitti`;
  const avg = times.length ? `ort. ${fmtAvg(zaman.effectiveTimes(times).avgMs)}` : '';
  const last3 = times.slice(-3).map((t) => `<em>${fmtShort(t)}</em>`).join(' · ');
  return `<div class="w-strip">${notches.join('')}</div>
    <div class="w-rep"><b>${label}</b><span>${avg}</span></div>
    <div class="w-last3">${last3 ? `Son: ${last3}` : ''}</div>`;
}

/** Yüzerken/dinlenirken başlığın altındaki kısa bilgi: Hedef · Dinlen · Alet ve açıklamanın ilk satırı. */
function setInfo(s) {
  const short = (v) => String(v).replace(/^0(\d:)/, '$1');
  const parts = [];
  if (s.hedef) parts.push(`Hedef <b>${esc(short(s.hedef))}</b>`);
  if (s.dinlen) parts.push(`Dinlen <b>${esc(short(s.dinlen))}</b>`);
  if (s.alet) parts.push(`Alet <b>${esc(s.alet)}</b>`);
  return `${parts.length ? `<div class="w-info">${parts.join(' · ')}</div>` : ''}${s.aciklama ? `<div class="w-idesc">${esc(s.aciklama)}</div>` : ''}`;
}

function renderItem(node, s, i, cum) {
  const st = zst();
  const status = statusOf(i);
  const mode = cardMode(i);
  const blok = String(s.blok || '').trim().toUpperCase();
  const b = blokOf(s);
  const n = state.plan.setler.length;
  const c = cum[i];
  const styleTur = [s.stil, s.tur].filter(Boolean).join(' · ');
  const rowName = [setTitle(s), s.tur].filter(Boolean).join(' ');
  const short = (v) => String(v).replace(/^0(\d:)/, '$1');
  const tile = (label, value) => `<div class="w-tile"><small>${label}</small><b>${esc(short(value))}</b></div>`;
  const tiles = [s.hedef ? tile('HEDEF', s.hedef) : '', s.dinlen ? tile('DİNLEN', s.dinlen) : ''].join('');
  const d = zaman.doneReps(st, i);
  const T = tekrarOf(s);
  const isDone = status === 'tamam' || status === 'eksik';

  let tag = `${esc(blok)}${b.ad ? ` · ${esc(b.ad.toLocaleUpperCase('tr'))}` : ''} · ${i + 1}/${n}`;
  if (status === 'tamam') tag = `✓ TAMAMLANDI · ${tag}`;
  else if (status === 'eksik') tag = `${d}/${T} · ERKEN BİTTİ · ${tag}`;

  // Hazır kartta başlık büyük: stil · tür Sürüm 9'daki gibi kendi satırında. Küçük başlıklı
  // kartlarda (yüzerken, dinlenirken, özet) başlığın yanında durur.
  // 13.11.0: sıradaki set kartında (set sonu dinlenmesi) başlık ve stil·tür tek satırda: alan saate kalır.
  const title = mode === 'ready'
    ? `<div class="w-title">${esc(`${T} × ${s.mesafe}`)}</div>${styleTur ? `<div class="w-sub">${esc(styleTur)}</div>` : ''}`
    : `<div class="w-title">${esc(`${T} × ${s.mesafe}`)}${styleTur ? `<small>${esc(styleTur)}</small>` : ''}</div>`;
  const timer = '<div class="w-timer"><span class="w-tmode"></span><b class="w-tbig n"></b><span class="w-tsub n"></span></div>';
  let body;
  const foot = `<div class="w-foot">
        ${s.alet ? `<span><span class="w-alet">Alet</span> <b>${esc(s.alet)}</b></span>` : ''}
        <span class="w-last">${s.hedef && pacePer100(parseSec(s.hedef), s.mesafe) ? `<span class="w-pace"><span class="w-alet">Tempo</span> ${paceHtml(parseSec(s.hedef), s)}</span>` : '<span></span>'}<span class="w-dist">${fmtNum(setDist(s))} / ${fmtNum(c.dist)} m</span></span>
      </div>`;
  if (mode === 'live') {
    const plus = st.phase === 'rest' && st.cur === i ? '<button class="w-plus" data-plus>＋1 tekrar</button>' : '';
    body = `${title}${setInfo(s)}${T > 4 ? repStrip(i) : repBoxes(i, true)}${plus}${timer}`;
  } else if (mode === 'next') {
    // Set sonu dinlenmesi: sıradaki setin içeriği öne alınır, kalan alanı büyük sayaç doldurur.
    // 13.11.0: biten setin özeti ("✓ … bitti · ort.") sıradaki kartın üstüne binmez; kendi kartında kalır.
    body = `${title}
      ${s.aciklama ? `<div class="w-desc">${esc(s.aciklama)}</div>` : ''}
      ${tiles ? `<div class="w-tiles">${tiles}</div>` : ''}
      ${foot}
      <div class="w-ninfo">${setInfo({ ...s, aciklama: '' }).replace(/<\/?div[^>]*>/g, '')}${s.hedef && pacePer100(parseSec(s.hedef), s.mesafe) ? ` · Tempo ${paceHtml(parseSec(s.hedef), s)}` : ''}</div>
      ${timer}`;
  } else if (mode === 'sum') {
    const times = zaman.repTimes(st, i);
    const avg = times.length ? fmtAvg(zaman.effectiveTimes(times).avgMs) : '';
    body = `${title}${times.length ? repBoxes(i, false) : ''}
      <div class="w-summary n">${avg ? `Ortalama <b>${avg}</b> · ` : ''}${times.length ? `${d}/${T} tekrar` : 'Önceki sürümde işaretlendi'}</div>
      ${tiles ? `<div class="w-tiles">${tiles}</div>` : ''}`;
  } else {
    body = `${title}
      ${s.aciklama ? `<div class="w-desc">${esc(s.aciklama)}</div>` : '<div class="w-desc"></div>'}
      ${tiles ? `<div class="w-tiles">${tiles}</div>` : ''}
      ${foot}`;
  }

  // 13.11: kartta hem blok hem bölge. Ana sette bölge dolgulu hap + 7 kademeli ısı ölçeği; diğer bloklarda soluk bölge kodu.
  let ztag = ''; let meter = '';
  const sn = s.hedef && s.mesafe ? pacePer100(parseSec(s.hedef), s.mesafe) : 0;
  const zz = b.zone || (sn ? zoneOf(sn, s) : null);
  if (b.zone) {
    ztag = `<b class="w-ztag z${b.zone.n}">${esc(b.zone.zone)}</b>`;
    meter = `<div class="w-meter">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<i class="z${n}${n === b.zone.n ? ' on' : ''}"></i>`).join('')}</div>`;
  } else if (zz || (sn && ref.isDrill(s))) {
    ztag = `<b class="w-ztag is-plain">${esc(zz ? zz.zone : 'TEC')}</b>`;
  }
  node.classList.toggle('is-done', isDone);
  for (const m of ['live', 'next', 'sum', 'ready']) node.classList.toggle(`m-${m}`, m === mode);
  node.classList.add('w-item');
  node.dataset.mode = mode;
  node.style.setProperty('--c', b.renk);
  node.style.setProperty('--c-soft', hexA(b.renk, 0.35));
  node.style.setProperty('--c-glow', hexA(b.renk, 0.55));
  node.style.setProperty('--c-wash', hexA(b.renk, 0.12));
  node.innerHTML = `
    <div class="w-line"></div>
    <div class="w-dot"></div>
    <div class="w-row">
      <span class="w-tm">${c.time ? fmtDur(c.time) : ''}</span>
      <span class="w-nm"><i class="w-bk">${esc(blok)}</i>${esc(rowName)}${status === 'eksik' ? ` · ${d}/${T}` : ''}</span>
    </div>
    <div class="w-ctm">${c.time ? fmtDur(c.time) : ''}${setTime(s) ? `<small>+${fmtDur(setTime(s))}</small>` : ''}</div>
    <div class="w-card">${(() => { const dr = (mode === 'ready' || mode === 'next') && drillOf(s); return dr ? `<a class="sl-vid" href="${esc(dr.video)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(dr.ad)} videosu">▶ Drill</a>` : ''; })()}<div class="w-tag"><span>${tag}</span>${ztag}</div>${meter}${body}</div>`;
}

// --- Sürüm 12 (yüzme): set sonu ara şeridi — omuz rahatlatma, kulaç, nabız; drill videosu --------

const yzVeri = () => (state.session.yz = state.session.yz || { kn: {}, rahat: {} });
/** Set sonu dinlenmesinde (setin tüm tekrarları bitti) ara şerit; aksi halde gizli. */
function yzAraGuncelle(st) {
  const box = $('yz-ara');
  const i = st.cur;
  const s = i != null ? state.plan.setler[i] : null;
  if (!s || st.phase !== 'rest' || zaman.doneReps(st, i) < tekrarOf(s)) { if (!box.hidden) { box.hidden = true; box.dataset.sig = ''; } return; }
  const key = setKey(s, i);
  const f = yzVeri();
  const next = state.plan.setler[i + 1];
  const blokSonu = analiz.aerobikBlok(s.blok) && (!next || String(next.blok || '').toUpperCase() !== String(s.blok || '').toUpperCase());
  const rahat = kurallar().omuzRahatlatma && blokSonu && !f.rahat[key];
  const kn = f.kn[key] || {};
  const ks = kn.kulac ? kisit.kulacDurum(kn.kulac, s, kurallar()) : null;
  const sig = `${key}|${rahat}|${kn.kulac}|${kn.nabiz}`;
  if (box.dataset.sig === sig && !box.hidden) return;
  box.dataset.sig = sig;
  box.innerHTML = `${rahat ? `<div class="yz-rahat"><b>Omuz rahatlatma · 60 sn</b><span>Aerobik blok bitti: sarkaç 20 sn · kol salınımı 20 sn · kapı esnetme 20 sn</span>
      <div class="yz-rb"><button data-rahat="yap">Yaptım</button><button data-rahat="atla">Atla</button></div></div>` : ''}
    <button class="yz-kn${ks && ks.durum === 'yuksek' ? ' warn' : ''}" data-kn><span>${esc(setTitle(s))}</span><b>${kn.kulac ? `Kulaç ${kn.kulac}/25 m` : 'Kulaç'} · ${kn.nabiz ? `Nabız ${kn.nabiz}` : 'Nabız'}</b><small>${kn.kulac || kn.nabiz ? 'düzelt' : 'gir'}</small></button>`;
  box.hidden = false;
}

async function onYzAra(e) {
  const st = zst();
  const i = st.cur;
  const s = state.plan.setler[i];
  if (!s) return;
  const key = setKey(s, i);
  const f = yzVeri();
  const r = e.target.closest('[data-rahat]');
  if (r) { f.rahat[key] = r.dataset.rahat; persist(); return yzAraGuncelle(st); }
  if (!e.target.closest('[data-kn]')) return;
  const K = kurallar();
  const norm = kisit.kulacNormu(s, K);
  const prevN = Object.values(f.kn).map((x) => x.nabiz).filter(Boolean).pop();
  const v = { kulac: (f.kn[key] || {}).kulac || Math.round((norm.aralik[0] + norm.aralik[1]) / 2), nabiz: (f.kn[key] || {}).nabiz || prevN || 140 };
  const body = document.createElement('div');
  body.className = 'kn-body';
  const draw = () => {
    const d = kisit.kulacDurum(v.kulac, s, K);
    body.innerHTML = `<div class="kn-row"><div><small>KULAÇ / 25 M</small><b class="n">${v.kulac}</b><span class="${d && d.durum === 'yuksek' ? 'warn' : 'mu'}">${esc(d ? d.metin : '')}</span></div>
        <div class="kn-pm"><button data-d="kulac:-1">−</button><button data-d="kulac:1">+</button></div></div>
      <div class="kn-row"><div><small>NABIZ</small><b class="n">${v.nabiz}</b><span class="mu">atım/dk${prevN ? ` · önceki ${prevN}` : ''}</span></div>
        <div class="kn-pm"><button data-d="nabiz:-5">−5</button><button data-d="nabiz:-1">−</button><button data-d="nabiz:1">+</button><button data-d="nabiz:5">+5</button></div></div>`;
  };
  draw();
  body.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-d]');
    if (!b) return;
    const [k, d] = b.dataset.d.split(':');
    v[k] = k === 'kulac' ? Math.max(5, Math.min(40, v[k] + Number(d))) : Math.max(60, Math.min(220, v[k] + Number(d)));
    draw();
  });
  const ok = await modal({ title: `${setTitle(s)} · kulaç ve nabız`, body, actions: [{ label: 'Kaydet', value: 'ok', cls: 'btn-primary' }, { label: 'Vazgeç', value: '' }] });
  if (ok === 'ok' && state.session) {
    f.kn[key] = { kulac: v.kulac, nabiz: v.nabiz };
    persist();
    yzAraGuncelle(zst());
    const d = kisit.kulacDurum(v.kulac, s, K);
    if (d && d.durum === 'yuksek') toast(`⚠ ${d.metin}`, 3500);
  }
}

/** Set açıklamasındaki drill → sporRef drill videosu ({ ad, video }) ya da null. */
const drillOf = (s) => { const r = sporRef(); const d = r && Array.isArray(r.drill) ? analiz.drillBul(s.aciklama, r.drill) : null; return d && d.video ? d : null; };

function openProgram() {
  state.session.screen = 'program';
  state.zst = null;
  persist();
  show('program');

  if (!state.wheel) {
    state.wheel = new Wheel($('wheel'), {
      onLayout: () => { fitAllCards(); refitSoon(); },
      onChange: (i) => {
        if (!state.session || !state.plan) return;
        const prev = state.session.pos;
        state.session.pos = i;
        persist();
        updateAmbient(i);
        // Odak değişince dinlenme kartı (sonraki set / uyarı) yeniden çizilir.
        if (zst().phase === 'rest') { refreshItem(prev, false); refreshItem(i, false); }
        updateControls();
        updateBar();
        tick();
      },
    });
  }
  const cum = cumulative(state.plan.setler);
  const nodes = state.plan.setler.map((s, i) => {
    const node = document.createElement('div');
    renderItem(node, s, i, cum);
    return node;
  });
  state.wheel.setItems(nodes, state.session.pos || 0);
  refitSoon();
  updateAmbient(state.wheel.index);
  updateProgram();
  startTicker();
}

// ---------------------------------------------------------------------------
// Metin boyu alana uyar (sürüm 10.5): alan sabit, yazı alanı dolduracak en büyük boyda.
// Kısa metin büyür (üst sınır), uzun metin küçülür (alt sınır); alt sınırda da sığmazsa
// son satır "…" ile biter (tamamı ayrıntı panelinde).
// ---------------------------------------------------------------------------

/** el'in yazı boyunu [min, max] içinde, over() yanlış kalan en büyük değere ayarlar. Sığdıysa true. */
function fillText(el, min, max, over = () => el.scrollHeight > el.clientHeight + 1) {
  el.classList.remove('is-clamp');
  let lo = min;
  let hi = max;
  el.style.fontSize = `${min}px`;
  if (over()) return false;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    el.style.fontSize = `${mid}px`;
    if (over()) hi = mid - 1; else lo = mid;
  }
  el.style.fontSize = `${lo}px`;
  return true;
}

/** Alt sınırda da sığmayan metin: alana sığan satır sayısında "…" ile biter. */
function clampText(el) {
  const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3;
  el.style.setProperty('--clamp', String(Math.max(1, Math.floor((el.clientHeight + 1) / lh))));
  el.classList.add('is-clamp');
}

/** Tek satırlık metin: genişliğe sığana dek küçülür; min'de de sığmazsa CSS "…" ile keser. */
function fitLine(el, max, min) {
  if (!el || !el.clientWidth) return;
  fitText(el, max, min);
}

// Kart açıklamasının sınırları (px): [alt, üst] kademeye göre (fit-0…fit-3).
const DESC_FIT = {
  ready: [[19, 34], [17, 30], [15, 26], [14, 22]],
  next: [[16, 24], [15, 22], [14, 20], [13, 18]],
};

/**
 * Hazır ve sıradaki set kartında açıklama, başlık ile kutular arasındaki sabit alanı doldurur.
 * Kısa ekranda alan yetmezse kart kademeli sıkılaşır (fit-1…fit-3: başlık, stil · tür ve kutular
 * küçülür); en sıkı kademede de sığmazsa açıklama "…" ile biter. Canlı kartta bilgi ve açıklama
 * satırları kesilmek yerine küçülür.
 */
function fitCardText(node) {
  const card = node.querySelector('.w-card');
  if (!card || !card.clientHeight) return;
  const mode = node.dataset.mode;
  node.querySelectorAll('.w-info, .w-idesc').forEach((el) => fitLine(el, 17, 12));
  const desc = node.querySelector('.w-desc');
  const over = () => card.scrollHeight > card.clientHeight + 1;
  const levels = DESC_FIT[mode] || DESC_FIT.ready;
  node.classList.remove('fit-1', 'fit-2', 'fit-3');
  for (let lvl = 0; lvl < levels.length; lvl++) {
    if (lvl) node.classList.add(`fit-${lvl}`);
    const [min, max] = levels[lvl];
    const fits = desc && desc.textContent.trim() ? fillText(desc, min, max) : true;
    if (fits && !over()) return;
    if (lvl === levels.length - 1 && desc && desc.textContent.trim() && !fits) clampText(desc);
  }
}

/** Ayrıntı paneli: açıklama panele sığan en büyük boyda; alt sınırda panel kayar (kesilmez). */
function fitDetail() {
  const box = $('detail-body');
  const desc = box.querySelector('.dt-desc');
  if (!desc || box.hidden || !box.clientHeight) return;
  fillText(desc, 18, 34, () => box.scrollHeight > box.clientHeight + 1);
}

/** Mola ekranındaki "Sıradaki": ekrana sığan en büyük boyda. */
function fitMolaNext() {
  const el = $('mola-next');
  const root = $('mola');
  if (el.hidden || root.hidden || !root.clientHeight) return;
  fillText(el, 14, 22, () => root.scrollHeight > root.clientHeight + 1);
}

/** Ana sayfa ve takvim: tek satırlık başlık/bilgi satırları kesilmek yerine küçülür. */
function fitListLines() {
  if (state.screen === 'home') fitLine($('home-swim-meta'), 22, 15);
  if (state.screen === 'days') {
    document.querySelectorAll('#screen-days .hero-date').forEach((el) => fitLine(el, 32, 22));
    document.querySelectorAll('#screen-days .dr-meta').forEach((el) => fitLine(el, 20, 14));
  }
}

function fitAllCards() {
  if (state.wheel) state.wheel.items.forEach(fitCardText);
}

/** Düzen bir sonraki karede oturur (ekran açılışı, yazı tipi): kartlar o zaman yeniden sığdırılır. */
let refitFrame = 0;
function refitSoon() {
  cancelAnimationFrame(refitFrame);
  refitFrame = requestAnimationFrame(() => { refitFrame = requestAnimationFrame(fitAllCards); });
}

/** Başlıktaki değer kutuya sığmazsa yazıyı küçültür. */
function fitText(el, max = 54, min = 30) {
  el.style.fontSize = `${max}px`;
  let size = max;
  while (el.scrollWidth > el.clientWidth + 1 && size > min) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
}

/** Büyük düğmenin yazısı düğmeye sığacak kadar küçülür (uzun yazılar dar ekranda taşıyordu). */
function fitMainLabel() {
  const el = $('btn-main-label');
  if (!el) return;
  delete el.dataset.fit;
  if (!el.clientWidth) return; // ekran gizli: görününce yeniden denenir
  const max = innerWidth <= 380 ? 46 : 56; // 13.9: büyük düğme
  el.classList.remove('is-wrap');
  fitText(el, max, 30);
  // Tek satırda büyük kalamıyorsa iki satıra bölünür (İDMANA / BAŞLA).
  if (el.scrollWidth > el.clientWidth + 1 && el.textContent.includes(' ')) {
    el.classList.add('is-wrap');
    fitText(el, max, 16);
  } else if (el.scrollWidth > el.clientWidth + 1) {
    fitText(el, 30, 16);
  }
  el.dataset.fit = '1';
}

function fitHeader() {
  document.querySelectorAll('#screen-program .prog-stat b.fit').forEach((el) => fitText(el));
}

/** Arka plan ve peron, aktif bloğun rengine bürünür. */
function updateAmbient(i) {
  const set = state.plan && state.plan.setler[i];
  if (!set) return;
  $('screen-program').style.setProperty('--amb', hexA(blokOf(set).renk, 0.12));
}

function refreshItem(i, redraw = true) {
  if (!state.wheel || i == null) return;
  const node = state.wheel.items[i];
  if (node) {
    renderItem(node, state.plan.setler[i], i, cumulative(state.plan.setler));
    fitCardText(node);
  }
  if (redraw) state.wheel.render();
}

function refreshAllItems() {
  if (!state.wheel) return;
  const cum = cumulative(state.plan.setler);
  state.wheel.items.forEach((node, i) => { renderItem(node, state.plan.setler[i], i, cum); fitCardText(node); });
  state.wheel.render();
}

function updateBar() {
  if (!state.session || !state.plan) return;
  const active = state.wheel ? state.wheel.index : -1;
  $('prog-bar').innerHTML = state.plan.setler.map((s, i) => {
    const status = statusOf(i);
    const cls = status === 'tamam' || status === 'eksik' ? ' is-on' : (i === active || status === 'suruyor' ? ' is-cur' : '');
    const c = blokOf(s).renk;
    return `<span class="seg${cls}" data-grow="${Math.max(1, setDist(s))}" data-bg="${c}" data-glow="${c}"></span>`;
  }).join('');
  paint($('prog-bar'));
}

function updateProgram() {
  if (!state.session || !state.plan) return;
  const sets = state.plan.setler;
  const totalDist = sets.reduce((a, s) => a + setDist(s), 0);
  const totalTime = sets.reduce((a, s) => a + setTime(s), 0);
  $('prog-dist').innerHTML = `${fmtNum(sessionDistance())}<small class="dim"> /${fmtNum(totalDist)}</small>`;
  $('prog-end').textContent = totalTime ? ` /${fmtDur(totalTime)}` : '';
  if (state.wheel) state.wheel.locked = zst().phase === 'swim';
  $('prog-back').classList.toggle('is-off', zst().phase === 'swim');
  // 13.9 odak: yüzerken/dinlenirken kart tam genişlik, komşu setler birer satır, kronometre büyük.
  const odak = ['swim', 'rest'].includes(zst().phase);
  $('wheel').classList.toggle('is-focus', odak);
  if (state.wheel) state.wheel.setSide(odak ? 1 : 2);
  updateBar();
  updateControls();
  tick();
  fitHeader();
}

const ICON_SES_ON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const ICON_SES_OFF = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

function updateSoundButton() {
  const on = prefs().ses;
  const b = $('btn-sound');
  b.innerHTML = `${on ? ICON_SES_ON : ICON_SES_OFF}<span>${on ? 'Ses açık' : 'Ses kapalı'}</span>`;
  b.classList.toggle('is-off', !on);
  b.setAttribute('aria-pressed', String(on));
}

/** Büyük düğmenin yazısı ve alt satırı. */
function updateControls() {
  const s = state.session;
  if (!s || !state.plan || !state.wheel) return;
  const st = zst();
  const pos = state.wheel.index;
  const a = zaman.mainAction(st, state.plan.setler, pos);
  const btn = $('btn-main');
  let label = '';
  let sub = '';
  if (a.kind === 'geldim') {
    label = 'DUR';
    const T = tekrarOf(state.plan.setler[a.set]);
    if (a.rep < T) sub = `${a.rep}. tekrar biter`;
    else sub = a.set === state.plan.setler.length - 1 || nextOpenSet(a.set) < 0 ? 'Son tekrar · idman biter' : 'Son tekrar · set biter';
  } else if (a.kind === 'cik') {
    label = 'YÜZ';
    const set = state.plan.setler[a.set];
    if (a.start) sub = 'İdman ve 1. tekrar başlar';
    else sub = st.cur === a.set || st.phase === 'ready' ? `${a.rep}. tekrar başlar` : `${setTitle(set)} ${set.tur || ''} · ${a.rep}. tekrar`.replace(/\s+·/, ' ·');
  } else if (a.kind === 'mola') { label = 'MOLA'; sub = 'Devam etmek için DEVAM ET'; }
  else { label = 'SET TAMAM'; sub = 'Kaydırıp başka sete geç'; }
  const lab = $('btn-main-label');
  if (lab.textContent !== label || !lab.dataset.fit) {
    lab.textContent = label;
    fitMainLabel();
  }
  $('btn-main-sub').textContent = sub;
  btn.classList.toggle('is-geldim', a.kind === 'geldim');
  btn.classList.toggle('is-idle', a.kind === 'yok');
  updateSoundButton();
}

function startTicker() {
  stopTicker();
  state.ticker = setInterval(tick, 200);
  tick();
}

function stopTicker() {
  clearInterval(state.ticker);
  state.ticker = null;
}

/** Saatleri, büyük saati ve bipleri günceller (her 200 ms ve her olayda). */
function tick() {
  const s = state.session;
  if (!s || !state.plan || state.screen !== 'program') return;
  if (!$('btn-main-label').dataset.fit) fitMainLabel();
  const now = Date.now();
  const st = zst();
  yzAraGuncelle(st);
  const clock = $('prog-clock');
  const t = st.basla == null ? '0:00' : fmtClock(zaman.idmanMs(st, now));
  if (clock.textContent !== t) {
    const grew = t.length !== clock.textContent.length;
    clock.textContent = t;
    if (grew) fitHeader();
  }
  clock.classList.toggle('is-idle', st.basla == null);

  // Sol düğme: son basıştan sonra 5 sn "Geri al"; sonra dinlenirken "Mola", yüzerken "İptal" (13.9).
  const last = st.last;
  const undoable = Boolean(last && ACTIONS.includes(last.t) && st.phase !== 'done' && st.mola == null && now - last.ts < UNDO_MS);
  setLeftSlot(undoable ? 'undo' : (st.phase === 'rest' && st.mola == null ? 'mola' : st.phase === 'swim' ? 'iptal' : ''));
  updateMola(st, now);

  if (!state.wheel) return;
  const pos = state.wheel.index;
  const node = state.wheel.items[st.phase === 'swim' ? st.cur : pos];
  const box = node && node.querySelector('.w-timer');
  if (st.phase === 'swim') {
    const s0 = state.plan.setler[st.cur];
    const reps = st.per[st.cur].reps;
    const el = (now - reps[reps.length - 1].cik) / 1000;
    const hedef = parseSec(s0.hedef);
    if (box) {
      setTimer(box, `YÜZÜYOR · ${reps.length}/${tekrarOf(s0)}`, 'y', fmtDur(Math.floor(el)), '',
        hedef ? (el <= hedef ? `Hedef ${fmtDur(hedef)} · <span class="g">${Math.ceil(hedef - el)} sn kaldı</span>` : `Hedef ${fmtDur(hedef)} · <span class="r">${signed(el - hedef)}</span>`) : '');
      const now1 = node.querySelector('.w-reps .now b');
      if (now1) now1.textContent = fmtDur(Math.floor(el));
    }
  } else if (st.phase === 'rest') {
    const i = st.cur;
    const s0 = state.plan.setler[i];
    const reps = st.per[i].reps;
    const lastRep = reps[reps.length - 1];
    const dinlen = parseSec(s0.dinlen);
    const el = zaman.restElapsed(st, now) / 1000;
    const rem = dinlen - el;
    const lastT = (lastRep.geldim - lastRep.cik) / 1000;
    const hedef = parseSec(s0.hedef);
    const sub = `Son tekrar ${fmtDur(Math.round(lastT))}${hedef ? ` · <span class="${lastT <= hedef ? 'g' : 'r'}">${signed(lastT - hedef)}</span>` : ''}`;
    const setOver = zaman.doneReps(st, i) >= tekrarOf(s0);
    if (box) {
      if (!dinlen) {
        setTimer(box, setOver ? 'SET SONU DİNLENMESİ' : 'DİNLENME', 'b', fmtDur(Math.floor(el)), '', sub);
      } else {
        const big = rem >= 0 ? fmtDur(Math.ceil(rem)) : `−${fmtDur(Math.floor(-rem) || 0)}`;
        const mode = rem < 0 ? 'DİNLENME UZADI' : (setOver ? 'SET SONU DİNLENMESİ' : 'DİNLENME');
        setTimer(box, mode, rem < 0 ? 'r' : 'b', big, rem < 0 ? 'r' : (rem <= 3 ? 'y' : ''), sub);
      }
      box.classList.toggle('is-flash', Boolean(dinlen) && rem > 0 && rem <= 3);
      const rb = node.querySelector('.w-reps .rest b');
      if (rb) rb.textContent = dinlen ? (rem >= 0 ? fmtDur(Math.ceil(rem)) : `−${fmtDur(Math.floor(-rem))}`) : fmtDur(Math.floor(el));
    }
    if (dinlen && st.mola == null) checkBeep(lastRep.geldim, rem);
  } else if (box) {
    box.hidden = true;
  }
}

function setTimer(box, mode, modeCls, big, bigCls, subHtml) {
  box.hidden = false;
  const m = box.querySelector('.w-tmode');
  const b = box.querySelector('.w-tbig');
  const su = box.querySelector('.w-tsub');
  if (m.textContent !== mode) m.textContent = mode;
  m.className = `w-tmode ${modeCls}`;
  if (b.textContent !== big) b.textContent = big;
  // Uzun değer (−0:07, 1:05:00) kutuya sığsın diye küçülür.
  const len = big.length;
  b.className = `w-tbig n ${bigCls}${len >= 7 ? ' l7' : len === 6 ? ' l6' : len === 5 ? ' l5' : ''}`;
  if (su.innerHTML !== subHtml) su.innerHTML = subHtml;
}

/** Olay ekler, durumu yeniden hesaplar, kaydeder. */
function pushEvent(e) {
  ev().push({ ...e, ts: e.ts || Date.now() });
  state.zst = null;
  persist();
}

function onMainButton() {
  const s = state.session;
  if (!s || !state.plan || !state.wheel) return;
  const now = Date.now();
  const st = zst();
  if (st.last && now - st.last.ts < GUARD_MS) return; // çift dokunma
  audio.unlock();
  const a = zaman.mainAction(st, state.plan.setler, state.wheel.index);
  if (a.kind === 'mola') return;
  if (a.kind === 'yok') {
    if (a.set != null) askResetSet(a.set);
    return;
  }
  if (a.kind === 'cik') {
    if (a.start) pushEvent({ t: 'basla', ts: now }); // ilk YÜZ idmanı da başlatır
    pushEvent({ t: 'cik', ts: now, set: a.set });
  }
  else if (a.kind === 'geldim') {
    pushEvent({ t: 'geldim', ts: now });
    if (prefs().ses) audio.ok();
    const st2 = zst();
    const i = st2.cur;
    { // Çok kısa tekrar: atılmaz, sorulur (Geri al ya da özette düzelt)
      const rt = zaman.repTimes(st2, i);
      const son = rt[rt.length - 1];
      const h = parseSec(state.plan.setler[i].hedef) * 1000;
      if (h > 0 && son != null && son < 0.2 * h) setTimeout(() => toast(`Çok kısa tekrar (${fmtShort(son)}): yanlış dokunuşsa sol alttan Geri al; özette de düzeltebilir ya da çıkarabilirsin.`, 5000), 0);
    }
    if (zaman.doneReps(st2, i) >= tekrarOf(state.plan.setler[i])) {
      const next = nextOpenSet(i);
      if (i === state.plan.setler.length - 1 || next < 0) {
        pushEvent({ t: 'bitir', ts: now, auto: true });
        openRpe();
        return;
      }
      afterEvent();
      state.wheel.scrollTo(next);
      return;
    }
  }
  afterEvent();
}

/**
 * Biten setin tekrar sürelerini idman sırasında düzeltir (yanlış/geç dokunuş): ± sn ya da ortalamadan çıkar.
 * Düzeltmeler özetteki ile aynı yere yazılır (form.edits); dokunuş olayları değişmez.
 */
async function duzeltSet(i) {
  const s = state.plan.setler[i];
  const k = setKey(s, i);
  const times = zaman.repTimes(zst(), i);
  const f = ensureForm();
  const ed = { ...(f.edits[k] || {}) };
  const el = document.createElement('div');
  const ms = (r) => (typeof ed[r] === 'number' ? ed[r] : times[r]);
  const ciz = () => {
    el.innerHTML = `<p class="oy-not">Yanlış ya da geç basılan tekrarı düzelt veya ortalamadan çıkar. Dokunuşlar silinmez; özette de değiştirebilirsin.</p>
      ${times.map((t, r) => `<div class="dz-r${ed[r] === 'drop' ? ' off' : ''}"><span>${r + 1}.</span><b class="n">${ed[r] === 'drop' ? 'çıkarıldı' : fmtShort(ms(r))}</b>
        <span class="dz-b">${ed[r] === 'drop' ? '' : [-5, -1, 1, 5].map((d) => `<button data-dz="${r}:${d}">${d > 0 ? `+${d}` : `−${-d}`}</button>`).join('')}<button data-dz="${r}:x">${ed[r] === 'drop' ? 'geri al' : 'çıkar'}</button></span></div>`).join('')}`;
  };
  ciz();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dz]');
    if (!b) return;
    const [r, d] = b.dataset.dz.split(':');
    if (d === 'x') { if (ed[r] === 'drop') delete ed[r]; else ed[r] = 'drop'; }
    else ed[r] = Math.max(1000, Math.round(ms(Number(r)) / 1000) * 1000 + Number(d) * 1000); // tam saniyeye
    ciz();
  });
  const ok = await modal({ title: `${setTitle(s)} · tekrar süreleri`, body: el, actions: [{ label: 'Kaydet', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }] });
  if (!ok || !state.session) return;
  f.edits[k] = ed;
  persist();
  refreshAllItems();
  toast('Tekrar süreleri düzeltildi', 1500);
}

/**
 * 13.7: setin yüzülen mesafesini düzeltir (ör. 1500 yerine 1600). Set anında, bitince ya da özette kullanılır;
 * yapılan tekrarlar da yeni mesafeyle sayılır (tempo, toplam mesafe). Tabloya Mesafe yeni değerle, Not'a plan
 * farkı ("Plan: 1×1500 → 1×1600") yazılır. Olaylar (dokunuşlar) değişmez.
 */
async function mesafeDuzelt(i) {
  const s = state.plan && state.plan.setler[i];
  if (!s) return;
  const eski = Number(s.mesafe) || 0;
  let m = eski;
  const adim = Number(prefs().havuz) || 25;
  const el = document.createElement('div');
  const ciz = () => {
    el.innerHTML = `<p class="oy-not">Yüzdüğün mesafe plandan farklıysa düzelt. ${tekrarOf(s) > 1 ? `Her tekrar için geçerli (${tekrarOf(s)} tekrar). ` : ''}Tekrar süreleri aynı kalır, tempo yeni mesafeye göre hesaplanır.</p>
      <div class="mz-r"><button data-mz="-100">−100</button><button data-mz="-${adim}">−${adim}</button><b class="n">${fmtNum(m)}<small> m</small></b><button data-mz="${adim}">+${adim}</button><button data-mz="100">+100</button></div>
      ${m !== eski ? `<p class="oy-not">Plan ${fmtNum(eski)} m → ${fmtNum(m)} m · toplam ${tekrarOf(s) > 1 ? `${tekrarOf(s)} × ` : ''}${fmtNum(m)} m</p>` : ''}`;
  };
  ciz();
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-mz]'); if (!b) return; m = Math.max(adim, m + Number(b.dataset.mz)); ciz(); });
  const ok = await modal({ title: `${setTitle(s)} · mesafe`, body: el, actions: [{ label: 'Kaydet', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }] });
  if (!ok || !state.session || m === eski) return;
  const base = keyedPlan();
  base.setler[i] = { ...base.setler[i], mesafe: m };
  const ss = state.session;
  ss.setler = base.setler;
  state.plan = { ...state.plan, setler: base.setler };
  state.zst = null;
  persist();
  if (state.screen === 'ozet') renderOzet();
  else { refreshAllItems(); updateProgram(); }
  toast(`Mesafe düzeltildi: ${fmtNum(eski)} → ${fmtNum(m)} m`, 2000);
}

/** 13.8: setin etiketini yazar / değiştirir (yüzerken ve biten sette de); yuzmeVeri Etiket sütununa gider. */
async function etiketDuzelt(i) {
  const s = state.plan && state.plan.setler[i];
  if (!s) return;
  const el = document.createElement('div');
  el.innerHTML = `<label class="es-blk"><span class="es-l">ETİKET</span><input id="etk-in" type="text" maxlength="60" autocomplete="off" placeholder="ör. Aerobik Taban -1"></label>`;
  el.querySelector('#etk-in').value = s.etiket || '';
  const p = modal({ title: `${setTitle(s)} · etiket`, body: el, actions: [{ label: 'Kaydet', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }] });
  const inp = el.querySelector('#etk-in');
  let v = inp.value;
  inp.addEventListener('input', () => { v = inp.value; });
  if (!(await p) || !state.session) return;
  v = String(v || '').trim().slice(0, 60);
  if (v === (s.etiket || '')) return;
  const base = keyedPlan();
  base.setler[i] = { ...base.setler[i], etiket: v };
  state.session.setler = base.setler;
  state.plan = { ...state.plan, setler: base.setler };
  state.zst = null;
  persist();
  if (state.screen === 'ozet') renderOzet();
  else { refreshAllItems(); updateProgram(); }
  toast(v ? `Etiket: ${v}` : 'Etiket silindi', 1800);
}

/** Tamamlanan seti sıfırlar: o setin YÜZ/DUR olayları silinir, set yeniden yapılabilir. */
async function askResetSet(i) {
  const set = state.plan.setler[i];
  const st = zst();
  const choice = await modal({
    title: 'Bu seti sıfırla?',
    body: `<p>${esc(setTitle(set))} · ${zaman.doneReps(st, i)}/${tekrarOf(set)} tekrar. Tekrar süreleri silinir, set yeniden yapılabilir.</p>`,
    actions: [
      ...(zaman.repTimes(st, i).length ? [{ label: 'Tekrar sürelerini düzelt', value: 'duzelt', cls: 'btn-primary' }] : []),
      { label: 'Mesafeyi düzelt', value: 'mesafe' },
      { label: 'Etiketi yaz', value: 'etiket' },
      { label: 'Seti sıfırla', value: 'sifirla' },
      { label: 'Vazgeç', value: '' },
    ],
  });
  if (choice === 'duzelt') return duzeltSet(i);
  if (choice === 'mesafe') return mesafeDuzelt(i);
  if (choice === 'etiket') return etiketDuzelt(i);
  if (choice !== 'sifirla' || !state.session || zst().phase === 'swim') return;
  state.session.events = zaman.withoutSet(ev(), i);
  state.zst = null;
  persist();
  afterEvent();
  state.wheel.scrollTo(i, false);
  updateProgram();
  toast('Set sıfırlandı');
}

function afterEvent() {
  refreshAllItems();
  updateProgram();
}

function onUndo() {
  const st = zst();
  if (!st.last || st.phase === 'done' || st.mola != null || !ACTIONS.includes(st.last.t)) return;
  const e = ev();
  const popped = e.pop();
  // İlk YÜZ basla + cik birlikte eklenir; geri alınca ikisi de silinir.
  const prev = e[e.length - 1];
  if (popped.t === 'cik' && prev && prev.t === 'basla' && prev.ts === popped.ts) e.pop();
  state.zst = null;
  persist();
  const st2 = zst();
  afterEvent();
  if (st2.phase === 'swim' && state.wheel.index !== st2.cur) state.wheel.scrollTo(st2.cur);
  toast('Son dokunuş geri alındı', 1500);
}

const ACTIONS = ['basla', 'cik', 'geldim'];
const ICON_UNDO = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';
const ICON_IPTAL = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICON_MOLA = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';

/** Sol alt düğme: 'undo' (Geri al, 5 sn), 'mola' (dinlenirken), 'iptal' (yüzerken: tekrarı iptal) ya da '' (sönük). */
function setLeftSlot(act) {
  const b = $('btn-undo');
  if (b.dataset.act === act) return;
  b.dataset.act = act;
  b.innerHTML = act === 'mola' ? `${ICON_MOLA}<span>Mola</span>` : act === 'iptal' ? `${ICON_IPTAL}<span>İptal</span>` : `${ICON_UNDO}<span>Geri al</span>`;
  b.setAttribute('aria-label', act === 'mola' ? 'Mola ver' : act === 'iptal' ? 'Başlayan tekrarı iptal et' : 'Son dokunuşu geri al');
  b.classList.toggle('is-on', act === 'undo');
  b.classList.toggle('is-mola', act === 'mola');
  b.classList.toggle('is-iptal', act === 'iptal');
}

function onLeftSlot() {
  const act = $('btn-undo').dataset.act;
  if (act === 'undo') onUndo();
  else if (act === 'mola') startMola();
  else if (act === 'iptal') tekrarIptal();
}

/**
 * 13.9: yanlışlıkla başlatılan tekrarı iptal: başlangıcı (cik) silinir, tekrar hiç başlamamış
 * sayılır; dinlenme kaldığı yerden sürer, YÜZ yeniden başlatır. İdmanın ilk tekrarıysa idman
 * saati de sıfırlanır (basla da silinir). Onay sorulur.
 */
async function tekrarIptal() {
  const st = zst();
  const e = ev();
  const last = e[e.length - 1];
  if (st.phase !== 'swim' || !last || last.t !== 'cik') return;
  const rep = st.per[st.cur].reps.length;
  const sure = fmtDur(Math.floor((Date.now() - last.ts) / 1000));
  const ilk = e.length === 2 && e[0].t === 'basla' && e[0].ts === last.ts; // idmanın ilk tekrarı
  const ok = await modal({
    title: `${rep}. tekrarı iptal et?`,
    body: `<p>Bu tekrar <b>${sure}</b>'dir sayıyor. İptal edersen hiç başlamamış sayılır:</p>
      <p class="muted">• ${sure} silinir, tekrar boş kalır<br>• ${ilk ? 'idman saati de sıfırlanır' : 'dinlenme saati kaldığı yerden sürer'}<br>• hazır olunca YÜZ'e yeniden bas</p>`,
    actions: [{ label: 'Evet, iptal et', value: true, cls: 'btn-primary' }, { label: 'Vazgeç, yüzüyorum', value: false }],
  });
  // Onay beklerken DUR'a basıldıysa (olay değiştiyse) hiçbir şey yapılmaz.
  if (!ok || ev()[ev().length - 1] !== last) return;
  e.pop();
  const prev = e[e.length - 1];
  if (prev && prev.t === 'basla' && prev.ts === last.ts) e.pop();
  state.zst = null;
  persist();
  afterEvent();
  toast('Tekrar iptal edildi · YÜZ ile yeniden başlat', 2500);
}

/** Mola: yalnızca dinlenirken. İdman saati, dinlenme sayacı ve bipler durur. */
function startMola() {
  const st = zst();
  if (st.phase !== 'rest' || st.mola != null) {
    if (st.phase === 'swim') toast('Yüzerken mola verilemez. Önce DUR.');
    return;
  }
  pushEvent({ t: 'mola' });
  afterEvent();
}

function endMola() {
  if (zst().mola == null) return;
  pushEvent({ t: 'devam' });
  afterEvent();
}

function updateMola(st, now) {
  const box = $('mola');
  const on = st.mola != null;
  if (box.hidden === on) box.hidden = !on;
  if (!on) return;
  $('mola-time').textContent = fmtDur(Math.floor((now - st.mola) / 1000));
  $('mola-idman').textContent = fmtClock(zaman.idmanMs(st, now));
  const i = state.wheel ? state.wheel.index : st.cur;
  const set = state.plan.setler[i];
  const done = zaman.doneReps(st, i);
  const short = (v) => String(v).replace(/^0(\d:)/, '$1');
  const html = done < tekrarOf(set)
    ? `Sıradaki: <b>${esc(setTitle(set))} · ${done + 1}. tekrar</b>${set.hedef || set.dinlen ? `<br>${[set.hedef ? `Hedef ${esc(short(set.hedef))}` : '', set.dinlen ? `Dinlen ${esc(short(set.dinlen))}` : ''].filter(Boolean).join(' · ')}` : ''}`
    : '';
  const nx = $('mola-next');
  const changed = nx.innerHTML !== html || nx.hidden !== !html;
  if (nx.innerHTML !== html) nx.innerHTML = html;
  nx.hidden = !html;
  if (changed) fitMolaNext();
}

/** Karta dokununca setin tüm bilgisi büyük yazıyla; dokununca kapanır, zamanlamayı etkilemez. */
// --- Sürüm 12 (yüzme): rehberli CSS testi, derece tahmini, set ilerleme grafiği ------------------

/** Şu anki aletsiz CSS (sn/100 m): sporRef, yoksa Ayarlar'daki değer. */
function guncelCss() {
  const r = data.isConfigured('ref') ? sporRef() : null;
  const c = r && r.css.length ? ref.cssFor(r, { tarih: todayKey(), havuz: prefs().havuz, alet: '' }) : null;
  return c ? c.css : prefs().css || null;
}

/** CSS testi: 400 m ve 200 m süreleri → CSS = (t400 − t200) / 2; sporRef'e yeni satır ya da yalnızca telefonda. */
async function cssTestiAc() {
  const eski = guncelCss() || 126; // yalnız giriş kutularının başlangıcı
  const v = { t400: Math.round(eski * 4 + 8), t200: Math.round(eski * 2 - 6) };
  const body = document.createElement('div');
  body.className = 'kn-body';
  const draw = () => {
    const css = analiz.cssTesti(v.t400, v.t200);
    const fark = css ? Math.round((css - eski) * 10) / 10 : null;
    const t = css ? analiz.dereceTahmini(css) : null;
    body.innerHTML = `<p class="mu">Isınmadan sonra 400 m ve 5 dk dinlenip 200 m, ikisi de en iyi temponla (aletsiz). Süreleri gir.</p>
      ${[['t400', '400 M'], ['t200', '200 M']].map(([k, l]) => `<div class="kn-row"><div><small>${l}</small><b class="n">${fmtDur(v[k])}</b></div>
        <div class="kn-pm"><button data-d="${k}:-5">−5</button><button data-d="${k}:-1">−</button><button data-d="${k}:1">+</button><button data-d="${k}:5">+5</button></div></div>`).join('')}
      <div class="css-res">${css ? `<small>YENİ CSS</small><b class="n">${fmtDur(css)}</b><span>/100 m · şimdiki ${fmtDur(eski)}${fark ? ` (${fark > 0 ? '+' : ''}${fmtDec(fark)} sn)` : ''}</span>` : '<span class="warn">Süreler tutarsız: 400 m, 200 m\'nin 1,5–3 katı olmalı</span>'}</div>
      ${t ? `<p class="mu">Derece tahmini (kaba): 100 FR ${fmtDur(t[100])} · 200 FR ${fmtDur(t[200])} · 400 FR ${fmtDur(t[400])}</p>` : ''}`;
  };
  draw();
  body.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-d]');
    if (!b) return;
    const [k, d] = b.dataset.d.split(':');
    v[k] = Math.max(30, Math.min(1200, v[k] + Number(d)));
    draw();
  });
  const refVar = data.isConfigured('ref');
  const sec = await modal({ title: 'CSS testi', body, actions: [
    ...(refVar ? [{ label: "idmanRef'e yaz", value: 'ref', cls: 'btn-primary' }] : []),
    { label: refVar ? 'Yalnızca telefonda' : 'Telefonda kullan', value: 'tel', cls: refVar ? '' : 'btn-primary' },
    { label: 'Vazgeç', value: '' },
  ] });
  const css = analiz.cssTesti(v.t400, v.t200);
  if (!sec || !css) { if (sec && !css) toast('Süreler tutarsız: CSS hesaplanamadı', 2500); return; }
  if (sec === 'tel') { data.setPrefs({ css: Math.round(css) }); renderPrefs(); return toast(`CSS ${fmtDur(css)} telefonda kaydedildi`, 2500); }
  try {
    await data.addCss({ tarih: todayKey(), css, havuz: prefs().havuz });
    await refreshRef();
    state.zones = null;
    renderPrefs();
    toast(`CSS ${fmtDur(css)} idmanRef'e yazıldı (yeni satır; eskiler duruyor)`, 3000);
  } catch (err) {
    await modal({ title: 'idmanRef\'e yazılamadı', body: `<p>${esc(err.message)}</p><p class="muted">idmanRef.gs'in yeni sürümü dağıtıldı mı? (addCss)</p>`, actions: [{ label: 'Tamam', value: '' }] });
  }
}

/** Aynı set türünün son 8 seferi: ortalama tempo /100 m (yukarı = hızlı), CSS çizgisi. */
function tempoGrafik(s) {
  const imza = analiz.setImza({ ...s, tekrar: tekrarOf(s) });
  const g = analiz.setGecmisi(data.getHistory(), imza).slice(0, 8).reverse();
  if (g.length < 2) return '';
  const c = cssOf(s);
  const v = g.map((x) => x.tempo);
  const all = c ? [...v, c.css] : v;
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.15 || 1;
  const W = 300, H = 96, pl = 34, pr = 52, pt = 8, pb = 18;
  const X = (i) => pl + ((W - pl - pr) * i) / (g.length - 1);
  const Y = (y) => pt + (H - pt - pb) * ((y - (lo - pad)) / (hi - lo + 2 * pad)); // küçük tempo (hızlı) yukarıda
  const pts = v.map((y, i) => `${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const dots = g.map((x, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v[i]).toFixed(1)}" r="8" class="hit"><title>${esc(x.tarih.slice(8, 10))}.${esc(x.tarih.slice(5, 7))} · ort. ${fmtAvg(x.ortSn * 1000)} · ${fmtDur(Math.round(x.tempo))}/100</title></circle>`).join('');
  const cssLn = c ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(c.css).toFixed(1)}" y2="${Y(c.css).toFixed(1)}" class="ref"/><text x="${W - pr + 4}" y="${(Y(c.css) + 4).toFixed(1)}" class="ax">CSS</text>` : '';
  return `<p class="dt-lb">SON ${g.length} KEZ · ORT. TEMPO /100 M (YUKARI = HIZLI)</p>
    <svg class="hg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(imza)} son ${g.length} kez">
      <text x="${pl - 5}" y="${(Y(lo) + 4).toFixed(1)}" text-anchor="end" class="ax">${fmtDur(Math.round(lo))}</text><text x="${pl - 5}" y="${(Y(hi) + 4).toFixed(1)}" text-anchor="end" class="ax">${fmtDur(Math.round(hi))}</text>
      ${cssLn}<polyline points="${pts}" class="ln"/>${dots}<circle cx="${X(g.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="4" class="last"/>
      <text x="${pl}" y="${H - 4}" class="ax">${esc(g[0].tarih.slice(8, 10))}.${esc(g[0].tarih.slice(5, 7))}</text><text x="${W - pr}" y="${H - 4}" text-anchor="end" class="ax">${esc(g[g.length - 1].tarih.slice(8, 10))}.${esc(g[g.length - 1].tarih.slice(5, 7))}</text></svg>`;
}

function openDetail(i) {
  const s = state.plan.setler[i];
  const b = blokOf(s);
  const c = cumulative(state.plan.setler)[i];
  const blok = String(s.blok || '').trim().toUpperCase();
  const short = (v) => String(v).replace(/^0(\d:)/, '$1');
  const styleTur = [s.stil, s.tur].filter(Boolean).join(' · ');
  const pace = s.hedef && pacePer100(parseSec(s.hedef), s.mesafe) ? `<p class="dt-row">Tempo ${paceHtml(parseSec(s.hedef), s)}</p>` : '';
  const box = $('detail');
  box.style.setProperty('--c', b.renk);
  $('detail-body').innerHTML = `
    <div class="dt-tag">${esc(blok)}${b.ad ? ` · ${esc(b.ad.toLocaleUpperCase('tr'))}` : ''} · ${i + 1}/${state.plan.setler.length}</div>
    <div class="dt-title">${esc(`${tekrarOf(s)} × ${s.mesafe}`)}</div>
    ${styleTur ? `<div class="dt-sub">${esc(styleTur)}</div>` : ''}
    ${s.etiket ? `<p class="dt-etiket">🏷 ${esc(s.etiket)}</p>` : ''}
    ${s.aciklama ? `<p class="dt-desc">${esc(s.aciklama)}</p>` : ''}
    <div class="dt-tiles">${s.hedef ? `<div><small>HEDEF</small><b>${esc(short(s.hedef))}</b></div>` : ''}${s.dinlen ? `<div><small>DİNLEN</small><b>${esc(short(s.dinlen))}</b></div>` : ''}</div>
    ${pace}
    ${s.alet ? `<p class="dt-row">Alet <b>${esc(s.alet)}</b></p>` : ''}
    <p class="dt-row">${fmtNum(setDist(s))} m${c.time ? ` · yığımlı hedef ${fmtDur(c.time)}` : ''}</p>
    ${tempoGrafik(s)}
    ${detailActions(i)}
    <p class="dt-hint">Boşluğa dokun: kapat · süre işlemeye devam eder</p>`;
  box.dataset.i = String(i);
  box.hidden = false;
  fitDetail();
}

/** Ayrıntı panelinin altındaki Düzenle · Sonrasına ekle · Sil (yüzerken sönük). */
function detailActions(i) {
  const r = editRules(i);
  const why = zst().phase === 'swim' ? 'Yüzerken düzenlenemez' : !r.canEdit ? 'Biten set düzenlenemez' : !r.canDelete ? 'Başlanan set silinemez' : '';
  const b = (act, icon, label, on, cls = '') => `<button class="dt-act ${cls}" data-dact="${act}"${on ? '' : ' disabled'}><i>${icon}</i>${label}</button>`;
  return `<div class="dt-acts">${b('edit', '✎', 'Düzenle', r.canEdit)}${b('add', '＋', 'Sonrasına ekle', r.canInsert)}${b('del', '🗑', 'Sil', r.canDelete, 'del')}</div>
    <button class="dt-act dt-mz" data-dact="mesafe"><i>📏</i>Mesafeyi düzelt (yüzülen ${fmtNum(Number(state.plan.setler[i].mesafe) || 0)} m)</button>
    <button class="dt-act dt-mz" data-dact="etiket"><i>🏷</i>${state.plan.setler[i].etiket ? 'Etiketi değiştir' : 'Etiket yaz'}</button>
    ${why ? `<p class="dt-why">${why}</p>` : ''}`;
}

function onDetailClick(e) {
  const btn = e.target.closest('[data-dact]');
  if (btn && btn.disabled) return; // sönük düğme paneli kapatmasın
  const i = Number($('detail').dataset.i);
  closeDetail();
  if (!btn || !state.plan || !(i >= 0)) return;
  if (btn.dataset.dact === 'edit') openSetEdit('edit', i);
  else if (btn.dataset.dact === 'add') openSetEdit('add', i);
  else if (btn.dataset.dact === 'del') deleteSet(i);
  else if (btn.dataset.dact === 'mesafe') mesafeDuzelt(i);
  else if (btn.dataset.dact === 'etiket') etiketDuzelt(i);
}

function closeDetail() {
  $('detail').hidden = true;
}

// ---------------------------------------------------------------------------
// İdman anında plan düzenleme (duzen.js): Düzenle · Sonrasına ekle · Sil, +1 tekrar.
// Düzenlenen plan seansta (session.setler) saklanır; tabloya özgün setlerde değişen
// alanlar, eklenen setlerde tüm alanlar gider ve Not'a plan farkı yazılır.
// ---------------------------------------------------------------------------

const STILLER = ['FR', 'BK', 'BR', 'BF', 'IM'];
const TURLER = ['Swim', 'Drill', 'Kick', 'Pull'];
const ALETLER = ['Finn', 'Paddle', 'PB', 'Snorkel', 'Board'];

function editRules(i) {
  const st = zst();
  const status = statusOf(i);
  return duzen.rules({
    done: zaman.doneReps(st, i),
    started: st.per[i].reps.length > 0 || legacyDone(i),
    finished: status === 'tamam' || status === 'eksik',
    swimming: st.phase === 'swim',
  });
}

const fmtMS = (sec) => `${pad2(Math.floor(sec / 60))}:${pad2(Math.round(sec % 60))}`;
const aletList = (v) => String(v || '').split(/\s*,\s*/).filter(Boolean);

/** Düzenleme ekranı. mode: 'edit' (i. set) ya da 'add' (i. setin arkasına, onun kopyası). */
function openSetEdit(mode, i) {
  const src = state.plan.setler[i];
  const r = mode === 'edit' ? editRules(i) : duzen.rules({ done: 0, started: false, finished: false, swimming: false });
  const d = Object.fromEntries(duzen.FIELDS.map((f) => [f, src[f] == null ? '' : src[f]]));
  d.tekrar = tekrarOf(src);
  d.mesafe = Number(src.mesafe) || 0;
  state.eset = { mode, i, d, r, orig: { ...d } };
  $('eset-desc').value = d.aciklama;
  $('eset-etiket').value = d.etiket || '';
  renderSetEdit();
  $('eset').hidden = false;
}

function renderSetEdit() {
  const E = state.eset;
  const { d, r } = E;
  const b = blokOf(d);
  const n = state.plan.setler.length;
  const blok = String(d.blok || '').trim().toUpperCase();
  const pos = E.mode === 'edit' ? `${E.i + 1}/${n} · DÜZENLE` : `${E.i + 2}/${n + 1} · YENİ SET`;
  $('eset').style.setProperty('--c', b.renk);
  $('eset-tag').textContent = `${blok}${b.ad ? ` · ${b.ad.toLocaleUpperCase('tr')}` : ''} · ${pos}`;
  $('eset-title').textContent = [`${d.tekrar} × ${d.mesafe}`, d.stil, d.tur].filter(Boolean).join(' ');
  const split = r.splitFields.filter((f) => String(d[f]) !== String(E.orig[f]));
  const stepper = (key, label, value, note = '') => `<div class="es-row"><div class="es-l">${label}${note ? `<small>${note}</small>` : ''}</div>
    <div class="es-stp"><button data-es="${key}:-1" aria-label="${label} azalt">−</button><b class="n">${value}</b><button data-es="${key}:1" aria-label="${label} artır">+</button></div></div>`;
  const chips = (key, list, cur, multi = false) => {
    const on = multi ? aletList(cur) : [String(cur || '')];
    const all = [...list, ...on.filter((x) => x && !list.includes(x))];
    return `<div class="es-chips">${all.map((x) => `<button data-es-chip="${key}" data-v="${esc(x)}" class="${on.includes(x) ? 'is-on' : ''}">${esc(x)}</button>`).join('')}</div>`;
  };
  const aletler = (() => {
    const rr = sporRef();
    return rr && rr.alet && rr.alet.length ? rr.alet.map((a) => a.kod) : ALETLER;
  })();
  $('eset-body').innerHTML = `
    ${stepper('tekrar', 'TEKRAR', d.tekrar, r.minTekrar > 1 ? `en az ${r.minTekrar} (yapıldı)` : '')}
    ${stepper('mesafe', 'MESAFE', d.mesafe, r.splitFields.length ? 'başladı · değişirse yeni set' : '')}
    ${stepper('hedef', 'HEDEF', d.hedef ? fmtDur(parseSec(d.hedef)) : '—')}
    ${stepper('dinlen', 'DİNLEN', d.dinlen ? fmtDur(parseSec(d.dinlen)) : '—')}
    <div class="es-blk"><div class="es-l">STİL${r.splitFields.length ? '<small>başladı · değişirse yeni set</small>' : ''}</div>${chips('stil', STILLER, d.stil)}</div>
    <div class="es-blk"><div class="es-l">TÜR</div>${chips('tur', TURLER, d.tur)}</div>
    <div class="es-blk"><div class="es-l">ALET</div>${chips('alet', aletler, d.alet, true)}</div>
    <div class="es-blk"><div class="es-l">BLOK</div>${chips('blok', Object.keys(BLOKLAR), blok)}</div>
    ${split.length ? '<p class="es-warn">Yapılan tekrarlar eski haliyle kalır; kalanlar yeni set olarak eklenir.</p>' : ''}`;
}

function onSetEditClick(e) {
  const E = state.eset;
  if (!E) return;
  const t = e.target.closest('button');
  if (!t) return;
  const { d } = E;
  if (t.id === 'eset-back' || t.id === 'eset-cancel') return closeSetEdit();
  if (t.id === 'eset-save') return saveSetEdit();
  if (t.dataset.es) {
    const [key, dir] = t.dataset.es.split(':');
    const k = Number(dir);
    if (key === 'tekrar') d.tekrar = Math.max(E.r.minTekrar, Math.min(99, d.tekrar + k));
    else if (key === 'mesafe') d.mesafe = Math.max(25, Math.min(5000, d.mesafe + k * ((k > 0 ? d.mesafe >= 400 : d.mesafe > 400) ? 100 : 25)));
    else {
      const sec = Math.max(0, Math.min(3600, parseSec(d[key]) + k * 5));
      d[key] = sec ? fmtMS(sec) : '';
    }
  } else if (t.dataset.esChip) {
    const key = t.dataset.esChip;
    const v = t.dataset.v;
    if (key === 'alet') {
      const list = aletList(d.alet);
      d.alet = (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(', ');
    } else {
      d[key] = d[key] === v && key !== 'blok' ? '' : v;
    }
  } else {
    return;
  }
  renderSetEdit();
}

function closeSetEdit() {
  $('eset').hidden = true;
  state.eset = null;
}

/** Düzenlenmiş planı uygular: seansa yazar, tekerleği yeniden kurar. */
function applyPlan(r, focus) {
  const s = state.session;
  s.setler = r.setler;
  s.events = r.events;
  s.pos = focus == null ? r.pos : focus;
  state.plan = { ...state.plan, setler: r.setler };
  state.zst = null;
  persist();
  openProgram();
}

/** İlk düzenlemede setlere kalıcı anahtar ve özgün hal eklenir. */
const keyedPlan = () => ({ setler: duzen.keyed(state.plan.setler, setKey), events: ev().slice(), pos: state.wheel ? state.wheel.index : state.session.pos || 0 });

async function saveSetEdit() {
  const E = state.eset;
  if (!E || !state.session) return;
  if (zst().phase === 'swim') { closeSetEdit(); return toast('Yüzerken düzenlenemez'); }
  const d = { ...E.d, aciklama: $('eset-desc').value.trim(), etiket: $('eset-etiket').value.trim() };
  const base = keyedPlan();
  if (E.mode === 'add') {
    const ns = duzen.newSet(d);
    closeSetEdit();
    applyPlan(duzen.insertAfter(base, E.i, ns), E.i + 1);
    return toast(`Set eklendi: ${d.tekrar} × ${d.mesafe}`);
  }
  const cur = base.setler[E.i];
  const split = E.r.splitFields.some((f) => String(d[f]) !== String(E.orig[f]));
  if (split) {
    const done = zaman.doneReps(zst(), E.i);
    const kalan = Math.max(1, d.tekrar - done);
    const ok = await modal({
      title: 'Yeni set olarak eklensin mi?',
      body: `<p>Yapılan ${done} tekrar ${esc(`${done} × ${E.orig.mesafe} ${E.orig.stil}`)} olarak kalır; kalan ${kalan} tekrar ${esc(`${kalan} × ${d.mesafe} ${d.stil}`)} yeni set olarak arkasına eklenir.</p>`,
      actions: [{ label: 'Yeni set olarak ekle', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }],
    });
    if (!ok) return;
    closeSetEdit();
    base.setler[E.i] = { ...cur, tekrar: done };
    applyPlan(duzen.insertAfter(base, E.i, duzen.newSet({ ...d, tekrar: kalan })), E.i + 1);
    return toast('Kalan tekrarlar yeni set olarak eklendi');
  }
  closeSetEdit();
  base.setler[E.i] = { ...cur, ...d };
  applyPlan(base, E.i);
  toast(duzen.planNote(base.setler[E.i]) || 'Değişiklik yok');
}

/** Başlanmamış seti siler; 5 sn içinde Geri al. */
function deleteSet(i) {
  if (!editRules(i).canDelete) return;
  const base = keyedPlan();
  const removed = base.setler[i];
  let r;
  try {
    r = duzen.removeAt(base, i);
  } catch (err) {
    return toast(err.message);
  }
  applyPlan(r);
  toastAction(`${setTitle(removed)} silindi`, 'Geri al', () => {
    if (!state.session || !state.plan) return;
    applyPlan(duzen.insertAfter(keyedPlan(), i - 1, removed), i);
  });
}

/** Dinlenirken kartta "+1 tekrar": setin tekrarını bir artırır; 5 sn içinde Geri al. */
function plusOneRep() {
  const st = zst();
  if (st.phase !== 'rest' || st.cur == null) return;
  const i = st.cur;
  const base = keyedPlan();
  const before = tekrarOf(base.setler[i]);
  base.setler[i] = { ...base.setler[i], tekrar: before + 1 };
  applyPlan(base, state.wheel ? state.wheel.index : i);
  const m = base.setler[i].mesafe;
  toastAction(`${before} × ${m} → ${before + 1} × ${m}`, 'Geri al', () => {
    if (!state.session) return;
    const b2 = keyedPlan();
    const set = b2.setler[i];
    if (!set || tekrarOf(set) <= Math.max(1, zaman.doneReps(zst(), i))) return;
    b2.setler[i] = { ...set, tekrar: tekrarOf(set) - 1 };
    applyPlan(b2, state.wheel ? state.wheel.index : i);
  });
}

// Sürükleme (yüzerken kilitli tekerlekte de) paneli açmasın: yalnızca yerinde dokunuş.
let wheelDown = null;
function onWheelDown(e) { wheelDown = { x: e.clientX, y: e.clientY }; }

function onWheelClick(e) {
  const d = wheelDown;
  wheelDown = null;
  if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
  if (e.target.closest && e.target.closest('[data-plus]')) return plusOneRep();
  const card = e.target.closest && e.target.closest('.w-item.is-active .w-card');
  if (!card || !state.wheel || zst().mola != null) return;
  const i = state.wheel.items.indexOf(card.closest('.w-item'));
  if (i >= 0) openDetail(i);
}

function onSoundButton() {
  data.setPrefs({ ses: !prefs().ses });
  refreshPrefs();
  if (prefs().ses) audio.unlock();
  updateSoundButton();
}

async function onProgramBack() {
  const s = state.session;
  const st = zst();
  if (st.phase === 'swim') {
    toast('Yüzerken kullanılamaz. Önce DUR.');
    return;
  }
  if (!hasProgress(s)) {
    data.clearSession();
    state.session = null;
    state.plan = null;
    return showDays();
  }
  const sets = state.plan.setler;
  const full = sets.filter((x, i) => statusOf(i) === 'tamam').length;
  const partial = sets.map((x, i) => [x, i]).filter(([, i]) => ['eksik', 'suruyor'].includes(statusOf(i)))
    .map(([x, i]) => `${setTitle(x)} ${zaman.doneReps(st, i)}/${tekrarOf(x)}`);
  const choice = await modal({
    title: 'İdmanı bitir?',
    body: `<p>Yapılan: ${full} set tam${partial.length ? `, ${esc(partial.join(', '))}` : ''} · ${fmtNum(sessionDistance())} m · ${fmtClock(zaman.idmanMs(st, Date.now()))}</p>`,
    actions: [
      ...(st.phase === 'rest' && st.mola == null ? [{ label: '⏸ Mola ver', value: 'mola', cls: 'btn-mola' }] : []),
      { label: 'İdmanı bitir ve kaydet', value: 'bitir', cls: 'btn-primary' },
      { label: 'Devam et', value: '' },
      { label: 'Takvime dön (idman sürer)', value: 'cik', cls: 'btn-ghost' },
    ],
  });
  if (choice === 'mola') {
    startMola();
  } else if (choice === 'bitir') {
    if (st.phase === 'idle') pushEvent({ t: 'basla' });
    if (zst().mola != null) pushEvent({ t: 'devam' });
    pushEvent({ t: 'bitir', auto: false });
    openRpe();
  } else if (choice === 'cik') {
    showDays();
  }
}

// --- Ses ---------------------------------------------------------------------
//
// Dinlenmede çıkışa 3-2-1 kısa, 0'da uzun bip; DUR'da kısa onay. iOS sesi
// yalnızca bir dokunuştan sonra açar (audio.unlock).

const audio = {
  ctx: null,
  unlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  },
  beep(freq, ms, vol = 0.5) {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.setValueAtTime(vol, t + ms / 1000 - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  },
  short() { this.beep(880, 140); },
  long() { this.beep(1320, 650); },
  ok() { this.beep(660, 90, 0.35); },
};

/** 3-2-1 kısa, 0'da uzun bip — her dinlenmede her işaret bir kez. */
function checkBeep(key, rem) {
  if (!prefs().ses) return;
  const mark = zaman.beepMark(rem);
  if (mark == null) return;
  if (!state.beep || state.beep.key !== key) state.beep = { key, marks: new Set() };
  if (state.beep.marks.has(mark)) return;
  // Geç açılan ekranda eski işaretler çalmasın: yalnızca şu anki saniye.
  for (let m = mark; m <= 3; m++) state.beep.marks.add(m);
  // Dinlenme bitti: ses + titreşim (titreşim yalnızca ekrana dokunulduysa; yoksa tarayıcı engelleyip uyarı yazar)
  if (mark === 0 && prefs().bildirim && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Dinlenme bitti', { body: 'Sıradaki sete hazır mısın?', tag: 'ysk-dinlenme', silent: false }); } catch { /* bazı tarayıcılar yalnız service worker ile izin verir */ }
  }
  if (mark === 0) { audio.long(); if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate([200, 100, 200]); }
  else audio.short();
}

// ---------------------------------------------------------------------------
// Seans sonu: RPE → MSI → Özet ve kaydet
// ---------------------------------------------------------------------------

const RPE_ETIKET = ['dinlenme', 'çok kolay', 'kolay', 'rahat', 'orta', 'orta+', 'zorlu', 'zor', 'çok zor', 'aşırı', 'maks.'];
const MSI_DONGU = [0.5, 1, 1.5, 2, 3];
const HAZIR_IFADE = ['İyi hissettim', 'Yorgun', 'Omuz hassas', 'Teknik iyi', 'Tempo zorladı'];

function ensureForm() {
  const s = state.session;
  if (!s.form || s.form.v !== 2) {
    s.form = { v: 2, rpe: null, msi: {}, havuz: prefs().havuz || 25, notes: {}, edits: {}, chips: [], aciklama: '' };
  }
  return s.form;
}

function openRpe() {
  ensureForm();
  state.session.screen = 'rpe';
  state.zst = null;
  persist();
  show('rpe');
  const f = state.session.form;
  const st = zst();
  $('rpe-grid').innerHTML = RPE_ETIKET.map((l, n) => `<button data-v="${n}" class="${f.rpe === n ? 'is-on' : ''}"><b class="n">${n}</b><small>${l}</small></button>`).join('');
  const done = state.plan.setler.filter((x, i) => ['tamam', 'eksik'].includes(statusOf(i))).length;
  $('rpe-info').textContent = `İdman: ${fmtClock(zaman.idmanMs(st, Date.now()))} · ${fmtNum(sessionDistance())} m · ${done} set`;
  // "İdmana dön" yalnızca bitişten sonraki ilk 5 sn belirgin; ‹ her zaman döner.
  const b = st.bitir;
  $('rpe-undo').hidden = !(b && Date.now() - b < UNDO_MS);
  clearTimeout(state.rpeTimer);
  if (!$('rpe-undo').hidden) state.rpeTimer = setTimeout(() => { $('rpe-undo').hidden = true; }, UNDO_MS - (Date.now() - b));
}

/** Bitişi geri alır: otomatik bitişte son DUR da geri alınır (tekrar sürüyor olur). */
function backToWorkout() {
  const e = ev();
  const last = e[e.length - 1];
  if (!last || last.t !== 'bitir') return openProgram();
  e.pop();
  if (last.auto && e.length && e[e.length - 1].t === 'geldim') e.pop();
  state.zst = null;
  persist();
  openProgram();
  const st = zst();
  if (st.cur == null) return;
  // Son tekrar geri alınmadıysa tamamlanan set yerine sıradaki açık sete dur.
  const next = statusOf(st.cur) === 'tamam' ? nextOpenSet(st.cur) : -1;
  state.wheel.scrollTo(next >= 0 ? next : st.cur, false);
  updateProgram();
}

function onRpeClick(e) {
  const b = e.target.closest('button[data-v]');
  if (!b) return;
  state.session.form.rpe = Number(b.dataset.v);
  persist();
  openMsi();
}

function openMsi() {
  state.session.screen = 'msi';
  persist();
  show('msi');
  renderMsi();
}

// Ağrı haritası: dokunulan kas + yan → seans sayfasına yazılan bölge anahtarı (eski liste de aynen çalışır).
const MSI_PIN = {
  front: { 'sag omuz': [56, 110], 'sol omuz': [174, 110], 'sag diz': [84, 372], 'sol diz': [146, 372], kalca: [115, 236] },
  back: { 'sag omuz': [169, 104], 'sol omuz': [49, 104], boyun: [109, 62], bel: [109, 212], kalca: [109, 250] },
};
function msiAnahtar(hit, fy) {
  if (hit.g === 'Omuz') return `${hit.yan} omuz`;
  if (hit.g === 'Bacak') return `${hit.yan} diz`;
  if (hit.g === 'Kalça' || hit.g === 'Kalça yanı') return 'kalca';
  if (hit.g === 'Sırt') return fy < 0.2 ? 'boyun' : 'bel';
  return null;
}
function msiHarita() {
  if (!state.session || !state.session.form) return;
  const f = state.session.form;
  const v = state.msiView || 'front';
  const wrap = $('msi-harita');
  const m = harita.META[v];
  const y = {};
  for (const [k, val] of Object.entries(f.msi)) {
    if (val == null) continue;
    if (/omuz/.test(k)) y.Omuz = 1;
    if (/diz/.test(k)) y.Bacak = 1;
    if (k === 'kalca') { y['Kalça'] = 1; y['Kalça yanı'] = 1; }
    if (k === 'bel' || k === 'boyun') y['Sırt'] = 1;
  }
  const fig = harita.figur(v, { yogunluk: Object.keys(y).length ? y : { yok: 0 }, rozet: false, cls: 'msi-fig' });
  for (const [k, [x, yy]] of Object.entries(MSI_PIN[v])) {
    if (f.msi[k] == null) continue;
    const p = document.createElement('span');
    p.className = `msi-pin${f.msi[k] >= 2 ? ' r' : ''}`;
    p.textContent = String(f.msi[k]).replace('.', ',');
    p.style.left = `${(x / m.w) * 100}%`;
    p.style.top = `${(yy / m.h) * 100}%`;
    fig.append(p);
  }
  wrap.replaceChildren(fig);
  for (const b of $('msi-seg').children) b.classList.toggle('on', b.dataset.v === v);
  const ag = analiz.agriGecmisi(data.getHistory(), yuk.gunEkle(todayKey(), -28));
  const lab = Object.fromEntries(MSI_BOLGELER.map((b) => [b.key, b.label]));
  const rows = Object.entries(ag).sort((a, b) => b[1].n - a[1].n);
  $('msi-gecmis').innerHTML = rows.length ? `<p class="lbl">SON 4 HAFTA</p>${rows.map(([k, o]) => `<p><b>${esc(lab[k] || k)}</b> · ${o.n} seans · ort. ${fmtDec(o.ort)} · en çok ${fmtDec(o.max)}</p>`).join('')}` : '';
}

function renderMsi() {
  const f = state.session.form;
  msiHarita();
  harita.hitYukle();
  $('msi-body').innerHTML = MSI_BOLGELER.map((b) => {
    const v = f.msi[b.key];
    const cls = v == null ? '' : v >= 2 ? 'w2' : v >= 1 ? 'w1' : 'w05';
    return `<button data-bolge="${b.key}" class="${cls}">${b.label}<em class="n">${v == null ? '—' : String(v).replace('.', ',')}</em></button>`;
  }).join('');
  const any = Object.keys(f.msi).length > 0;
  $('msi-next').hidden = !any;
  $('msi-none').classList.toggle('is-dim', any);
}

function onMsiClick(e) {
  const f = state.session.form;
  if (e.target.closest('#msi-none')) {
    f.msi = {};
    persist();
    return openOzet();
  }
  if (e.target.closest('#msi-next')) return openOzet();
  const sv = e.target.closest('#msi-seg [data-v]');
  if (sv) { state.msiView = sv.dataset.v; msiHarita(); return; }
  let k = null;
  const fig = e.target.closest('#msi-harita .kf');
  if (fig) {
    const hit = harita.hitEvent(fig, state.msiView || 'front', e);
    const r = fig.getBoundingClientRect();
    k = hit ? msiAnahtar(hit, (e.clientY - r.top) / r.height) : null;
    if (!k) { toast('Bu bölge için MSI yok: omuz, diz, kalça, bel ya da boyuna dokun', 2500); return; }
  } else {
    const b = e.target.closest('button[data-bolge]');
    if (!b) return;
    k = b.dataset.bolge;
  }
  const cur = f.msi[k];
  const idx = cur == null ? -1 : MSI_DONGU.indexOf(cur);
  if (idx === MSI_DONGU.length - 1) delete f.msi[k];
  else f.msi[k] = MSI_DONGU[idx + 1];
  persist();
  renderMsi();
}

/** Setin not satırları: { key, lines: [{ id, text, on, warn }], suspects } */
function setNotes(i) {
  const s = state.plan.setler[i];
  const k = setKey(s, i);
  const st = zst();
  const f = state.session.form;
  const times = zaman.repTimes(st, i);
  const edits = f.edits[k] || {};
  const eff = zaman.effectiveTimes(times, edits);
  const chosen = f.notes[k] || {};
  const lines = [];
  const T = tekrarOf(s);
  const d = times.length;
  const sus = zaman.suspects(times, parseSec(s.hedef) * 1000);
  if (d >= 1) {
    const txt = eff.all.map((x, r) => `${fmtShort(x.ms)}${x.dropped ? ' (çıkarıldı)' : ''}`).join(', ');
    lines.push({ id: 'reps', text: `Tekrarlar: ${txt}`, on: chosen.reps ?? d >= 2, sus });
  }
  const rests = st.per[i].rests;
  const dev = zaman.restDeviation(rests, parseSec(s.dinlen));
  const sonu = st.per[i].sonu;
  if (dev.show) {
    const txt = `Dinlenme: ${rests.map(fmtShort).join(', ')} (ort. ${signed(dev.avgDev)})${sonu != null ? ` · Set sonu ${fmtShort(sonu)}` : ''}`;
    lines.push({ id: 'rest', text: txt, on: chosen.rest ?? false });
  }
  if (d > 0 && d < T) lines.push({ id: 'eksik', text: `${d}/${T} tekrar yapıldı`, on: chosen.eksik ?? true });
  return { k, lines, eff, times, sus };
}

function openOzet() {
  state.session.screen = 'ozet';
  persist();
  show('ozet');
  renderOzet();
}

function msiSummary(msi) {
  const parts = MSI_BOLGELER.filter((b) => msi[b.key] != null).map((b) => `${b.label.toLocaleLowerCase('tr')} ${String(msi[b.key]).replace('.', ',')}`);
  return parts.length ? parts.join(', ') : 'ağrı yok';
}

/** Özette setin ek satırı: kulaç · nabız · SWOLF, geçen aynı setle kıyas, rekor. */
function ozetEk(i, eff) {
  const s = state.plan.setler[i];
  const kn = (state.session.yz && state.session.yz.kn[setKey(s, i)]) || {};
  const parts = [];
  if (kn.kulac) { const sw = analiz.swolf(eff.avgMs, Number(s.mesafe), kn.kulac); parts.push(`Kulaç ${kn.kulac}/25 m${sw ? ` · SWOLF ${sw}` : ''}`); }
  if (kn.nabiz) parts.push(`Nabız ${kn.nabiz}`);
  const out = [];
  if (parts.length) out.push(`<p class="oz-x">${esc(parts.join(' · '))}</p>`);
  const kd = kn.kulac ? kisit.kulacDurum(kn.kulac, s, kurallar()) : null;
  if (kd && kd.durum === 'yuksek') out.push(`<p class="oz-x warn">⚠ ${esc(kd.metin)}</p>`);
  const ort = eff.avgMs ? eff.avgMs / 1000 : 0;
  if (ort) {
    const imza = analiz.setImza({ ...s, tekrar: tekrarOf(s) });
    const hist = data.getHistory();
    const ky = analiz.kiyas(hist, imza, state.session.tarih, ort);
    if (ky) out.push(`<p class="oz-x">Geçen (${esc(fmtDateTR(ky.tarih))}): ort. ${esc(fmtAvg(ky.onceki * 1000))} · <b class="${ky.fark < 0 ? 'ok' : ky.fark > 0 ? 'warn' : ''}">${ky.fark < 0 ? `↑ ${fmtDec(-ky.fark)} sn hızlı` : ky.fark > 0 ? `↓ ${fmtDec(ky.fark)} sn yavaş` : 'aynı'}</b></p>`);
    const rk = analiz.setRekor(hist, imza, state.session.tarih, ort);
    if (rk) out.push(`<p class="oz-x pr">🏆 Bu setin en hızlı ortalaması (önceki ${esc(fmtAvg(rk.onceki * 1000))})</p>`);
  }
  return out.join('');
}

/** 13.5 (B10): CSS tabanlı stres puanı (RPE girilmese de) ve aynı standart sette RPE kayması. */
function ozetStres() {
  const st = zst();
  const f = state.session.form;
  let puan = 0;
  const satirlar = [];
  state.plan.setler.forEach((s, i) => {
    const c = cssOf(s);
    const reps = zaman.repTimes(st, i);
    if (!c || !reps.length) return;
    const r = gosterge.stresPuani([{ ad: `${s.blok || ''} ${setTitle(s)}`.trim(), mesafe: s.mesafe, reps }], c.css);
    if (r && r.satirlar[0]) { puan += r.puan; satirlar.push(r.satirlar[0]); }
  });
  if (!satirlar.length) return '';
  const dk = zaman.idmanMs(st, Date.now()) / 60000;
  const rpeYuk = f.rpe == null ? null : Math.round(dk * f.rpe);
  // RPE kayması: en çok stres veren setlerden geçmişte aynısı (aynı imza) olan ilki
  const hist = data.getHistory();
  const rpeOf = Object.fromEntries(hist.filter((r) => r && r.tur !== 'salon' && r.seans).map((r) => [r.tarih, r.seans.rpe]));
  let kay = null;
  for (const [i, s] of state.plan.setler.entries()) {
    if (kay || f.rpe == null) break;
    const { eff } = st.per[i].reps.length ? setNotes(i) : {};
    if (!eff || !eff.avgMs || !['MS', 'AS'].includes(String(s.blok || '').toUpperCase())) continue;
    const imza = analiz.setImza({ ...s, tekrar: tekrarOf(s) });
    const g = analiz.setGecmisi(hist, imza, state.session.tarih).map((x) => ({ ...x, rpe: rpeOf[x.tarih] }));
    const k = gosterge.rpeKaymasi(g, eff.avgMs / 1000, f.rpe);
    if (k) kay = { ...k, ad: setTitle(s), simdi: eff.avgMs };
  }
  satirlar.sort((a, b2) => b2.puan - a.puan);
  return `<p class="lbl oz-h">STRES PUANI <small>(CSS'e göre tekrar hızından; RPE gerekmez)</small></p>
    <div class="g-stres"><div><small>STRES PUANI</small><b class="n">${fmtNum(puan)}</b></div>${rpeYuk != null ? `<div><small>RPE İLE YÜK</small><b class="n mu">${fmtNum(rpeYuk)}</b></div>` : ''}</div>
    ${satirlar.slice(0, 3).map((x) => `<div class="fd-r g-or"><span>${esc(x.ad)} · hız CSS'e göre %${x.hiz}</span><b class="n">${x.puan}</b></div>`).join('')}
    ${kay ? `<p class="lbl oz-h">RPE KAYMASI · ${esc(kay.ad)}</p><p class="oz-x">Önceki ort. ${esc(fmtAvg(kay.ortSn * 1000))} · RPE ${fmtDec(kay.ortRpe)} → bugün ${esc(fmtAvg(kay.simdi))} · RPE ${fmtDec(f.rpe)}</p><p class="oz-x ${kay.fark > 0 ? 'warn' : 'ok'}">${esc(kay.metin)}</p>` : ''}`;
}

/** Özetin üst bölümü: bölgelerde süre (tekrar süreleri × CSS bölgesi). */
function ozetAnaliz() {
  const st = zst();
  const reps = [];
  state.plan.setler.forEach((s, i) => {
    for (const ms of zaman.repTimes(st, i)) {
      const z = zoneOf(pacePer100(ms / 1000, s.mesafe), s);
      if (z) reps.push({ ms, n: z.n, zone: z.zone });
    }
  });
  const b = analiz.bolgeSureleri(reps);
  const stres = ozetStres();
  if (!b.length) return stres;
  return `${stres}<p class="lbl oz-h">BÖLGELERDE SÜRE</p><div class="oz-bolge">${b.map((x) => `<i class="z${x.n}" data-grow="${x.ms}"></i>`).join('')}</div>
    <p class="oz-bl">${b.map((x) => `<span><i class="z${x.n}"></i>${esc(x.zone)} %${x.pay}</span>`).join('')}</p>`;
}

function renderOzet() {
  const f = state.session.form;
  const st = zst();
  $('oz-sure').textContent = fmtClock(zaman.idmanMs(st, Date.now()));
  $('oz-mesafe').textContent = fmtNum(sessionDistance());
  $('oz-rpe').textContent = f.rpe == null ? '—' : String(f.rpe);
  $('oz-msi').textContent = msiSummary(f.msi);
  for (const b of $('oz-havuz').children) b.classList.toggle('is-on', Number(b.dataset.v) === f.havuz);

  const blocks = [];
  state.plan.setler.forEach((s, i) => {
    if (!st.per[i].reps.length) return;
    const { k, lines, eff, sus } = setNotes(i);
    const title = `${setTitle(s)} ${s.tur || ''}`.trim();
    const etk = s.etiket ? `<p class="oz-etiket">🏷 ${esc(s.etiket)}</p>` : '';
    const susHtml = sus.map((r) => {
      const x = eff.all[r];
      return `<button class="oz-sus" data-set="${i}" data-rep="${r}">⚠ ${r + 1}. tekrar ${fmtShort(x.ms)}${x.edited ? ' (düzeltildi)' : x.dropped ? ' (çıkarıldı)' : ''} — düzelt</button>`;
    }).join('');
    const ls = lines.map((l) => `<button class="oz-line" data-set="${k}" data-line="${l.id}"><i class="cb${l.on ? ' on' : ''}">${l.on ? '✓' : ''}</i><span>${esc(l.text)}</span></button>`).join('');
    const x = ozetEk(i, eff);
    blocks.push(`<div class="oz-set"><div class="oz-st"><b>${esc(title)}</b><span class="n">ort. ${eff.avgMs ? fmtAvg(eff.avgMs) : '—'}</span></div>${etk}${x}${ls}${susHtml}</div><button class="oz-mz" data-mz-set="${i}">📏 Mesafe ${fmtNum(Number(s.mesafe) || 0)} m · düzelt</button>`);
  });
  $('oz-analiz').innerHTML = ozetAnaliz();
  paint($('oz-analiz'));
  $('oz-notes').innerHTML = blocks.length ? blocks.join('') : '<p class="muted">Süresi ölçülen set yok.</p>';
  const zs = zst();
  const mola = zs.molaN ? [`Mola ${zs.molaN > 1 ? `${zs.molaN}× · ` : ''}${fmtShort(zaman.molaMs(zs, zs.bitir || Date.now()))}`] : [];
  $('oz-chips').innerHTML = [...HAZIR_IFADE, ...mola].map((c) => `<button class="oz-chip${f.chips.includes(c) ? ' on' : ''}" data-chip="${esc(c)}">${esc(c)}</button>`).join('');
  if (document.activeElement !== $('oz-aciklama')) $('oz-aciklama').value = f.aciklama;
  // 13.9: yarıda kalan idman — yapılmayan setler planda kalabilir (sonra devam).
  const kalan = kalanSetler();
  const kb = $('oz-kalan');
  kb.hidden = !kalan.length;
  kb.innerHTML = `<i class="cb${f.kalanPlanda ? ' on' : ''}">${f.kalanPlanda ? '✓' : ''}</i><span>Yapılmayan ${kalan.length} set planda kalsın <small>(sonra devam edersin; işaretsizse plandan silinir)</small></span>`;
  $('oz-msg').hidden = true;
}

function onOzetClick(e) {
  const f = state.session.form;
  if (e.target.closest('#oz-kalan')) { f.kalanPlanda = !f.kalanPlanda; persist(); return renderOzet(); }
  const hv = e.target.closest('#oz-havuz button[data-v]');
  if (hv) { f.havuz = Number(hv.dataset.v); persist(); return renderOzet(); }
  const chip = e.target.closest('button[data-chip]');
  if (chip) {
    const c = chip.dataset.chip;
    f.chips = f.chips.includes(c) ? f.chips.filter((x) => x !== c) : [...f.chips, c];
    persist();
    return renderOzet();
  }
  const line = e.target.closest('button[data-line]');
  if (line) {
    const k = line.dataset.set;
    const id = line.dataset.line;
    const i = state.plan.setler.findIndex((s, j) => setKey(s, j) === k);
    const cur = setNotes(i).lines.find((l) => l.id === id);
    f.notes[k] = { ...(f.notes[k] || {}), [id]: !cur.on };
    persist();
    return renderOzet();
  }
  const mz = e.target.closest('button.oz-mz');
  if (mz) return mesafeDuzelt(Number(mz.dataset.mzSet));
  const sus = e.target.closest('button.oz-sus');
  if (sus) return openEdit(Number(sus.dataset.set), Number(sus.dataset.rep));
  if (e.target.closest('#oz-rpe-box')) return openRpe();
  if (e.target.closest('#oz-msi-box')) return openMsi();
}

// --- Şüpheli tekrarı düzeltme ------------------------------------------------

function openEdit(i, r) {
  const st = zst();
  const times = zaman.repTimes(st, i);
  const s = state.plan.setler[i];
  const k = setKey(s, i);
  const e = (state.session.form.edits[k] || {})[r];
  const others = times.filter((_, j) => j !== r);
  const start = typeof e === 'number' ? e : Math.round(zaman.median(others) / 1000) * 1000;
  state.edit = { i, r, k, ms: start };
  $('ed-title').textContent = `${setTitle(s)} ${s.tur || ''} · ${r + 1}. tekrar`;
  $('ed-reps').innerHTML = times.map((t, j) => `<div class="${j === r ? 'bad' : ''}"><small>${j + 1}</small><b class="n">${fmtShort(t)}</b></div>`).join('');
  renderEdit();
  $('ed-sheet').hidden = false;
}

function renderEdit() {
  $('ed-val').textContent = fmtShort(state.edit.ms);
  $('ed-apply').textContent = `${fmtShort(state.edit.ms)} olarak düzelt`;
}

function onEditClick(e) {
  const E = state.edit;
  if (!E) return;
  const f = state.session.form;
  const step = e.target.closest('[data-step]');
  if (step) {
    E.ms = Math.max(1000, E.ms + Number(step.dataset.step) * 1000);
    return renderEdit();
  }
  const act = e.target.closest('[data-ed]');
  if (!act) return;
  const edits = f.edits[E.k] || (f.edits[E.k] = {});
  if (act.dataset.ed === 'apply') edits[E.r] = E.ms;
  else if (act.dataset.ed === 'drop') edits[E.r] = 'drop';
  else if (act.dataset.ed === 'keep') delete edits[E.r];
  persist();
  closeEdit();
  renderOzet();
}

function closeEdit() {
  $('ed-sheet').hidden = true;
  state.edit = null;
}

// --- Kaydet --------------------------------------------------------------------

function formMsiString(msi) {
  return MSI_BOLGELER
    .filter((b) => msi[b.key] !== undefined && msi[b.key] !== null)
    .map((b) => `${b.key} ${msi[b.key]}`)
    .join('; ');
}

function buildPayload() {
  const s = state.session;
  const f = s.form;
  const st = zst();
  const legacyRes = (s.legacy && s.legacy.results) || {};
  const aciklama = [...f.chips, String(f.aciklama || '').trim()].filter(Boolean).join('. ');
  const kalan = kalanSetler();
  return {
    tarih: s.tarih,
    ...(st.basla ? { baslangic: st.basla } : {}), // 13.9: yuzmeSeans Tarih saatli
    ...(f.ikinci ? { ikinci: true } : {}),         // 13.9: aynı günün ikinci idmanı (onaylı)
    ...(f.kalanPlanda && kalan.length ? { birak: kalan.map((i) => state.plan.setler[i].sira) } : {}),
    seans: {
      sure: fmtHMS(zaman.idmanMs(st, Date.now())),
      mesafe: sessionDistance(),
      havuz: f.havuz,
      rpe: f.rpe === null ? '' : f.rpe,
      msi: formMsiString(f.msi),
      aciklama,
    },
    setler: state.plan.setler.map((set, i) => {
      const k = setKey(set, i);
      const old = legacyRes[k] || {};
      // İdmanda değişen/eklenen set: plan alanları ve Not'a plan farkı.
      const ed = duzen.payloadFields(set);
      const fark = duzen.planNote(set);
      const base = { sira: set._yeni ? null : set.sira, ...ed };
      if (st.per[i].reps.length && zaman.doneReps(st, i) > 0) {
        const { lines, eff } = setNotes(i);
        const not = [fark, old.not, ...lines.filter((l) => l.on).map((l) => l.text)].filter(Boolean).join(' | ');
        const kn = (s.yz && s.yz.kn && s.yz.kn[k]) || {};
        return { ...base, tamamlandi: true, gercek: eff.avgMs ? fmtLap(eff.avgMs) : '', kulac: kn.kulac || '', nabiz: kn.nabiz || '', rpe: '', msi: '', not };
      }
      if (legacyDone(i)) {
        return { ...base, tamamlandi: true, gercek: old.gercek || '', kulac: '', nabiz: '', rpe: '', msi: '', not: [fark, old.not].filter(Boolean).join(' | ') };
      }
      return { ...base, tamamlandi: false };
    }),
  };
}

/** 13.9: hiç yapılmamış özgün setler (indeks) — istenirse planda kalır. */
function kalanSetler() {
  const st = zst();
  return state.plan.setler.map((set, i) => i)
    .filter((i) => !state.plan.setler[i]._yeni && state.plan.setler[i].sira != null
      && !(st.per[i].reps.length && zaman.doneReps(st, i) > 0) && !legacyDone(i));
}

/** Biten seansın telefonda saklanan kopyası (Yapılmış idmanlar). */
function keepInHistory(payload, status) {
  const st = zst();
  const rec = {
    id: `${payload.tarih}-${Date.now()}`,
    tarih: payload.tarih,
    savedAt: Date.now(),
    status,
    startedAt: st.basla,
    endedAt: st.bitir,
    seans: payload.seans,
    setler: state.plan.setler.map((set, i) => {
      const p = payload.setler[i] || {}; // aynı sırayla üretilir (idmanda eklenen setlerin sırası yok)
      return {
        sira: set.sira, blok: set.blok, tekrar: set.tekrar, mesafe: set.mesafe, stil: set.stil, tur: set.tur,
        aciklama: set.aciklama, hedef: set.hedef, dinlen: set.dinlen, alet: set.alet, etiket: set.etiket || '',
        tamamlandi: Boolean(p.tamamlandi), gercek: p.gercek || '', not: p.not || '', kulac: p.kulac || '', nabiz: p.nabiz || '',
        yapilan: zaman.doneReps(st, i),
      };
    }),
  };
  if (!data.addHistory(rec)) toast('Telefonda yer kalmadı: seansın kopyası saklanamadı.', 5000);
}

async function saveSessionForm() {
  const f = state.session.form;
  if (state.saving) return;
  f.aciklama = $('oz-aciklama').value;
  data.setPrefs({ havuz: f.havuz });
  refreshPrefs();
  persist();
  const payload = buildPayload();
  // Süresi olmayan tamamlanmış set: kaydetmeden önce sor (Gerçek boş gider)
  const sursuz = payload.setler.map((x, i) => (x.tamamlandi && !x.gercek ? i : -1)).filter((i) => i >= 0);
  if (sursuz.length) {
    const ok = await modal({ title: 'Süresi olmayan set', body: `<p>${sursuz.map((i) => esc(setTitle(state.plan.setler[i]))).join(', ')}: tamamlandı ama tekrar süresi yok; tabloda Gerçek boş kalır.</p>`, actions: [{ label: 'Yine de kaydet', value: true, cls: 'btn-primary' }, { label: 'Geri dön', value: false }] });
    if (!ok) return;
  }
  const btn = $('oz-save');
  state.saving = true;
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor…';
  let result;
  let again = false;
  try {
    result = await data.finishSession(payload);
  } catch (err) {
    again = await handleSaveError(err, payload);
  } finally {
    state.saving = false;
    btn.disabled = false;
    btn.textContent = 'Kaydet';
  }
  // Tekrar dene / ikinci idman: kilit (state.saving) açıldıktan sonra yeniden gönderilir.
  if (again) return saveSessionForm();
  if (!result) return;
  keepInHistory(payload, 'sent');
  endSessionLocally(Boolean(result && result.kalanSet));
  showDone({ ok: true, result });
}

async function handleSaveError(err, payload) {
  if (err.code === 'SAME_DAY') {
    // 13.9: aynı gün başka idman kayıtlı — onaylanırsa ikinci idman olarak yazılır.
    const ikinci = await modal({
      title: 'Bugüne ait idman kaydı var',
      body: `<p>${esc(fmtDateTR(payload.tarih))} için tabloda başka bir idman kayıtlı. Bu idman aynı günün ikinci idmanı olarak ayrıca kaydedilsin mi?</p><p class="muted">Önceki kayda dokunulmaz.</p>`,
      actions: [{ label: 'Evet, ikinci idman olarak kaydet', value: true, cls: 'btn-primary' }, { label: 'Özete dön', value: false }],
    });
    if (!ikinci) return false;
    state.session.form.ikinci = true;
    persist();
    return true;
  }
  if (err.code === 'DUPLICATE') {
    const close = await modal({
      title: 'Bu seans zaten kayıtlı',
      body: `<p>${esc(fmtDateTR(payload.tarih))} için tabloda kayıt var; ikinci kez yazılmadı ve hiçbir şey silinmedi.</p>`,
      actions: [{ label: 'Seansı kapat', value: true, cls: 'btn-primary' }, { label: 'Özete dön', value: false }],
    });
    if (close) {
      keepInHistory(payload, 'duplicate');
      endSessionLocally();
      showDays();
    }
    return;
  }

  if (err.transient || err.code === 'NO_CONFIG') {
    queueAndClose(payload, err);
    return;
  }

  const choice = await modal({
    title: 'Kaydedilemedi',
    body: `<p>${esc(err.message)}</p><p class="muted">Hata kodu: ${esc(err.code)}</p>`,
    actions: [
      { label: 'Tekrar dene', value: 'retry', cls: 'btn-primary' },
      { label: 'Kuyruğa al, sonra dene', value: 'queue' },
      { label: 'Özete dön', value: '' },
    ],
  });
  if (choice === 'retry') return true;
  if (choice === 'queue') queueAndClose(payload, err);
  return false;
}

function queueAndClose(payload, err) {
  data.enqueue(payload, { code: err.code || 'CLIENT', message: err.message });
  keepInHistory(payload, 'queued');
  endSessionLocally();
  showDone({ ok: false });
}

// ---------------------------------------------------------------------------
// Onay ekranı
// ---------------------------------------------------------------------------

function showDone({ ok, result }) {
  $('done-icon').innerHTML = ok ? '<svg viewBox="0 0 52 52" aria-hidden="true"><circle class="dn-c" cx="26" cy="26" r="24"/><path class="dn-k" d="M15 27l7 7 15-16"/></svg>' : '⏳'; // 13.6: çizilen onay
  $('done-icon').classList.toggle('is-wait', !ok);
  $('done-title').textContent = ok ? 'Kaydedildi' : 'Kaydedilemedi';
  let text;
  if (ok) {
    text = `${result.yazilanSet} set yuzmeVeri sayfasına yazıldı, ${result.silinenSet} satır yuzmePlan'dan silindi.`;
    if (result.kalanSet) text += ` ${result.kalanSet} set planda kaldı.`;
    if (result.uyari) text += ` ${result.uyari}`;
    text += ' Seans bu telefonda da saklandı.';
  } else {
    text = 'Bağlantı gelince denenecek. Kayıt bu cihazda bekliyor; uygulama her açılışta yeniden dener.';
  }
  $('done-text').textContent = text;
  show('done');
  clearTimeout(state.doneTimer);
  state.doneTimer = setTimeout(() => { if (state.screen === 'done') showDays(); }, ok ? 4000 : 6000);
}

// ---------------------------------------------------------------------------
// Başlangıç
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Salon idmanı (salon.js). SalonTakip'in kendi betiği; plan telefonda tutulur.
// Ana sayfa salon kartı → son idmanı tekrarla / yeni idman planla → hareketler
// tekerlekte: BAŞLA / BİTTİ, dinlenme sayacı, set tekrarı ±, hareket sonunda
// nabız · RPE · MSI · not → özet → idman sayfasına yazılır.
// ---------------------------------------------------------------------------

const sl = { ses: null, st: null, wheel: null, ticker: null, giris: null, edit: null, saving: false, loading: null, err: null };
const slH = () => sl.ses.hareketler;
const slst = () => sl.st || (sl.st = salon.replay(sl.ses.events, slH()));
const salonData = () => (data.getCachedSalon() || {}).data || null;
const fmtKg = (v) => (v === salon.VUCUT ? 'Vücut' : v === '' || v == null ? '—' : `${String(v).replace('.', ',')} kg`);
const fmtDec = (v) => String(v).replace('.', ',');

function slPersist() {
  sl.st = null;
  if (sl.ses) data.saveSalonSession(sl.ses);
}

/** Hareketin ana kas grubu (hkEtki'de en yüksek oranlı). */
function grupOf(ad) {
  const d = salonData();
  const rows = d ? d.etki.filter((e) => e.ad === ad) : [];
  if (!rows.length) return '';
  const by = {};
  for (const r of rows) by[r.grup] = (by[r.grup] || 0) + (Number(r.oran) || 0);
  return Object.entries(by).sort((a, b) => b[1] - a[1])[0][0];
}
// Grup adı ve rengi grup.js'ten (10 grup; eski adlar da tanınır).
const grupInfo = (ad) => { const g = grupOf(ad); return { ad: grup.grupAd(g).toLocaleUpperCase('tr'), renk: grup.grupRenk(g) }; };
/** Hareketin kas grubu payları Türkçe adlarla, büyükten küçüğe: [[ad, oran], …] */
const etkiTR = (ad) => {
  const by = {};
  for (const e of (salonData() ? salonData().etki : []).filter((x) => x.ad === ad)) by[grup.grupAd(e.grup)] = (by[grup.grupAd(e.grup)] || 0) + (Number(e.oran) || 0);
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
};
const katalogOf = (ad) => { const d = salonData(); return d ? d.katalog.find((k) => k.ad === ad) : null; };

// --- Sürüm 12: kısıt, önleyici doz, yük -------------------------------------------------
/** Kısıt kuralları (sporRef "kisit" sayfası ya da varsayılan). */
const kurallar = () => kisit.kurallar(sporRef());
/** Hareketin haritadaki kas grubu payları (Omuz … Bacak). */
const hPay = (ad) => { const d = salonData(); return d ? grup.haritaPay(salon.grupPay(d.etki, ad)) : {}; };
/** Yüzme + salon seansları (yük hesapları için). */
function seansListesi() {
  const d = salonData();
  return yuk.seanslar({ hist: data.getHistory(), salonGecmis: d ? d.gecmis : [], salonSeans: d && Array.isArray(d.seans) ? d.seans : [], etkiPay: (ad) => (d ? salon.grupPay(d.etki, ad) : {}), katsayi: yuk.yuzmeKatsayi(sporRef()) });
}
/** Hareketin kısıt durumu (katalog satırı + kurallar). */
const kisitOf = (ad) => kisit.hareketKisit(katalogOf(ad) || { ad }, kurallar());

/**
 * Planlama listesi: salon.puanla + kısıt (yasaklılar ayrı), açık önleyici borç ×1,25, toparlanmamış kas ×0,8.
 * { rows (uygun/dikkat, puana göre), yasak, borc }
 */
function planRows(d, opts) {
  const borc = salon.onleyiciDurum(d.gecmis, todayKey(), hPay);
  const acik = new Set(borc.filter((b) => b.acik).map((b) => b.key));
  const tp = yuk.toparlanma(seansListesi());
  const all = salon.puanla(d, opts).map((r) => {
    const h = hPay(r.ad);
    const kat = salon.onleyiciKat(r.ad, h);
    const yorgun = Object.entries(h).filter(([g, p]) => p >= 0.3 && tp[g] && tp[g].toparlanma < 50).map(([g]) => g);
    return { ...r, ks: kisitOf(r.ad), hpay: h, kat, borcAcik: Boolean(kat && acik.has(kat)), yorgun, ham: r.ham * (kat && acik.has(kat) ? 1.25 : 1) * (yorgun.length ? 0.8 : 1) };
  });
  const rows = all.filter((r) => r.ks.durum !== 'yasak');
  const max = Math.max(0, ...rows.map((r) => r.ham));
  for (const r of rows) r.puan = max ? Math.round((r.ham / max) * 100) : 0;
  rows.sort((a, b) => b.ham - a.ham || a.ad.localeCompare(b.ad));
  return { rows, yasak: all.filter((r) => r.ks.durum === 'yasak'), borc };
}

// --- Ana sayfa kartı ve başlangıç ---------------------------------------------------

function renderHomeGym() {
  const badge = $('home-gym-badge');
  const desc = $('home-gym-desc');
  const go = $('home-gym-go');
  const kur = data.isConfigured('salon');
  $('home-gym-card').classList.toggle('off', !kur);
  if (!kur) {
    badge.textContent = 'KURULMADI';
    badge.hidden = false;
    desc.textContent = "Ayarlar'dan idman ve idmanRef bağlantılarını gir.";
    go.hidden = true;
    return;
  }
  desc.textContent = '';
  const s = data.loadSalonSession();
  badge.textContent = 'DEVAM EDİYOR';
  badge.hidden = !s;
  renderGymGo(s ? null : salonHazir(), s);
}

/** Tarih anahtarı → "Bugün · Çarşamba 23 Eylül" / "Cuma · 25 Eylül" (yüzme kartıyla aynı). */
function gunBasligi(k) {
  const today = todayKey();
  const dt = parseKey(k);
  const date = `${GUNLER[dt.getDay()]} ${dt.getDate()} ${AYLAR[dt.getMonth()]}`;
  if (k === today) return `Bugün <span>· ${date}</span>`;
  if (k === addDays(today, 1)) return `Yarın <span>· ${date}</span>`;
  return `${GUNLER[dt.getDay()]} <span>· ${dt.getDate()} ${AYLAR[dt.getMonth()]}</span>`;
}

/** Salon metrosu: durak = hareket, renk = kas grubu, uzunluk = set sayısı (yüzmede durak = set, renk = blok). */
function salonMetroSvg(list) {
  const W = 360;
  const tot = list.reduce((a, x) => a + Math.max(1, x.set || 0), 0) || 1;
  let x = 0;
  const segs = [];
  const dots = [];
  for (const h of list) {
    const w = (W * Math.max(1, h.set || 0)) / tot;
    const c = grupRenk(grupOf(h.ad));
    segs.push(`<line x1="${(x + 2).toFixed(1)}" y1="14" x2="${(x + w - 2).toFixed(1)}" y2="14" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`);
    dots.push(`<circle cx="${(x + w / 2).toFixed(1)}" cy="14" r="6.5" fill="#141B23" stroke="${c}" stroke-width="3.5"/>`);
    x += w;
  }
  return `<svg class="metro" viewBox="0 0 ${W} 28" preserveAspectRatio="none" aria-hidden="true">${segs.join('')}${dots.join('')}</svg>`;
}

/** Programdaki (yapılmamış) gün listesi, sıralı. */
const programGunleri = () => [...new Set(salonProgram().filter((r) => !r.durum).map((r) => r.tarih))].sort();

/**
 * 13.3: ana sayfada başlatılabilecek salon idmanı — tek kaynak salonPlan (yüzmedeki havuzPlan gibi):
 * bugünün planı, yoksa sıradaki planlı gün. (Eski sürümde telefona kaydedilmiş plan varsa önce o.)
 * salonVeri'deki son idman artık şablon değildir.
 */
function salonHazir() {
  const p = data.loadSalonPlan();
  if (p) return { tur: 'plan', hareketler: p.hareketler, oncelik: p.oncelik || {}, kaydedildi: p.kaydedildi };
  const bugun = todayKey();
  const gunler = programGunleri();
  const t = gunler.includes(bugun) ? bugun : gunler.find((g) => g > bugun);
  if (!t) return null;
  return { tur: 'program', hareketler: programHareketler(programGun(t).filter((r) => !r.durum)), tarih: t };
}

/** Salon süre tahmini (sn): geçmişteki gerçek sürelerden öğrenir (Süre sütunu), yoksa formül. */
const salonTahmin = (list) => salon.tahminOgren(list, salonData() ? salonData().gecmis : []).sn;

/** Hareketin ekipmanı (H · Equipment). */
const ekipmanOf = (ad) => (katalogOf(ad) || {}).ekipman || '';
/** Geçmişe göre ilerleme önerisi (bantta/vücut ağırlığında kg değil tekrar). */
const oneriOf = (ad) => (salonData() ? salon.oneri(salonData().gecmis, ad, { ekipman: ekipmanOf(ad) }) : null);

/**
 * İdman başında artış önerilerini sorar (sormadan uygulanmaz). Seçilenler uygulanır (kartta "geri al" ile),
 * seçilmeyenler son yapılan değerle başlar. Vazgeçilirse null.
 */
async function oneriSor(hareketler, { plan = false } = {}) {
  const list = hareketler.map((x) => ({ ...x }));
  const d = salonData();
  const on = plan ? planOneriListesi(list) : d ? salon.oneriListesi(d.gecmis, list, ekipmanOf) : [];
  if (!on.length) return list;
  const sec = new Set(on.map((x) => x.i));
  const el = document.createElement('div');
  const deger = (x, o) => (o.text.includes('kg') ? `${fmtKg(x.agirlik)} → ${fmtKg(o.agirlik)}` : o.sure && o.sure !== x.sure ? `${x.sure} → ${o.sure} sn` : `${fmtDec(x.tekrar)} → ${fmtDec(o.tekrar)} tekrar`);
  const ciz = () => {
    el.innerHTML = `<p class="oy-not">Son idmanda RPE ≤ 8 ve ağrı yok. Seçtiğin harekette değer artar; seçmediğin ${plan ? 'plandaki değerle' : 'son yaptığınla'} başlar.</p>
      ${on.map((x) => `<button class="oy-r${sec.has(x.i) ? ' is-on' : ''}" data-oy="${x.i}"><span>${esc(x.ad)}</span><b class="n">${esc(deger(list[x.i], x.o))}</b><i>${sec.has(x.i) ? '✓' : ''}</i></button>`).join('')}`;
  };
  ciz();
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-oy]'); if (!b) return; const i = Number(b.dataset.oy); if (sec.has(i)) sec.delete(i); else sec.add(i); ciz(); });
  const v = await modal({ title: `Artış önerisi · ${on.length} hareket`, body: el, actions: [{ label: 'Seçilenleri uygula', value: 'uygula', cls: 'btn-primary' }, { label: plan ? 'Hiçbiri · plandaki değerlerle' : 'Hiçbiri · son değerlerle', value: 'hic' }, { label: 'Vazgeç', value: '' }] });
  if (!v) return null;
  if (v === 'uygula') for (const x of on) if (sec.has(x.i)) salon.uygulaOneri(list[x.i], x.o);
  return list;
}

function renderGymGo(hz, ses) {
  const box = $('home-gym-go');
  const N = 5;
  const satir = (x) => `<li><i data-bg="${grupRenk(grupOf(x.ad))}"></i><span>${esc(x.ad)}</span><b class="n">${x.set}×${x.sure ? `${x.sure} sn` : fmtDec(x.tekrar)}${typeof x.agirlik === 'number' ? ` · ${fmtKg(x.agirlik)}` : ''}</b></li>`;
  let when;
  let list = null;
  let meta = '';
  let src = '';
  let ana = 'İdmanı aç';
  if (ses) {
    when = 'Devam eden idman';
    list = ses.hareketler;
    meta = `${list.length} hareket${ses.events.length ? ' · başladı' : ''}`;
    ana = 'Devam et';
  } else if (hz) {
    when = gunBasligi(hz.tarih || todayKey());
    list = hz.hareketler;
    const set = list.reduce((a, x) => a + (x.set || 0), 0);
    meta = `${list.length} hareket · ${set} set · ${fmtSure(salonTahmin(list))}`;
    const bugun = !hz.tarih || hz.tarih === todayKey();
    src = hz.tur === 'plan' ? 'Telefonda kayıtlı plan (eski sürüm)' : bugun ? 'karaPlan · tablodan' : 'karaPlan · bugün plan yok, sıradaki gün';
    if (!bugun) ana = 'Bu planla başla';
  } else {
    when = 'Plan yok';
    meta = 'Sırada kara planı yok';
    src = salonData() ? "Tabloda karaPlan'a yazabilir ya da burada planlayabilirsin." : 'Plan yükleniyor…';
    ana = '＋ İdman planla';
  }
  $('home-gym-tag').innerHTML = when;
  $('home-gym-metro').innerHTML = list && list.length ? salonMetroSvg(list) : '';
  $('home-gym-meta').textContent = meta;
  const ka = ses ? null : gosterge.karaArasi(seansListesi(), todayKey()); // 13.5 (B18)
  const kaHtml = ka ? `<div class="g-uyari"><b>⚠ Son kara idmanı ${ka.gun} gün önce</b><p>2 haftadan uzun ara kuvvet kazanımını geriletir. Bu hafta 1 tam vücut gün planla; ilk gün ağırlıkları %10 düşür.</p></div>` : '';
  $('home-gym-info').innerHTML = kaHtml + (list && !ses ? `<ul class="hgg-ls">${list.slice(0, N).map(satir).join('')}</ul>
    ${list.length > N ? `<details class="hgg-more"><summary>+${list.length - N} hareket daha</summary><ul class="hgg-ls">${list.slice(N).map(satir).join('')}</ul></details>` : ''}
    ${src ? `<p class="hgg-src">${esc(src)}</p>` : ''}` : src ? `<p class="hgg-src">${esc(src)}</p>` : '');
  paint($('home-gym-info'));
  $('home-gym-start-text').textContent = ana;
  $('home-gym-start').querySelector('svg').style.display = list ? '' : 'none';
  $('home-gym-planla').hidden = Boolean(ses) || !list;
  $('home-gym-planla').textContent = hz && hz.tarih && hz.tarih !== todayKey() ? '＋ Bugün için planla' : '＋ Planla (başka gün / yeni)';
  box.hidden = false;
}

/** Plandaki değerden yüksek artış önerileri (planda zaten yazılı olan değer önerilmez). */
function planOneriListesi(list) {
  const d = salonData();
  if (!d) return [];
  return salon.oneriListesi(d.gecmis, list, ekipmanOf).filter(({ i, o }) => {
    const x = list[i];
    return (typeof o.agirlik === 'number' && typeof x.agirlik === 'number' && o.agirlik > x.agirlik)
      || (!x.sure && o.tekrar > x.tekrar && o.agirlik === x.agirlik) || (x.sure && o.sure > x.sure);
  });
}

/** İdmanı aç: devam eden idman, plan (artış önerisi sorulur) ya da plan yoksa planlama. */
async function onGymStart() {
  if (data.loadSalonSession()) return onHomeGym();
  const hz = salonHazir();
  if (!hz) return showSalonPlan();
  const h = await oneriSor(hz.hareketler, { plan: true });
  if (!h) return;
  if (hz.tur === 'plan') data.clearSalonPlan();
  sl.ses = salon.newSession(todayKey(), h);
  if (hz.tur === 'program') sl.ses.programTarih = hz.tarih;
  if (hz.oncelik) sl.ses.oncelik = { ...hz.oncelik };
  slPersist();
  openSalon();
}

function onHomeGym() {
  if (!data.isConfigured('salon')) return showSetup(true);
  const s = data.loadSalonSession();
  if (s) { sl.ses = s; return openSalon(); }
  showSalonStart();
}

async function loadSalon() {
  if (sl.loading) return sl.loading;
  sl.loading = data.getSalon().then(() => { sl.err = null; }).catch((err) => { sl.err = err; }).finally(() => {
    sl.loading = null;
    kimlikCache.clear(); // H'deki Görsel sütunu değişmiş olabilir
    if (state.screen === 'salon-start') renderSalonStart();
    if (state.screen === 'home') { renderHomeGym(); try { renderHafta(); } catch { /* şerit bir sonraki çizimde */ } }
  });
  return sl.loading;
}

function showSalonStart() {
  state.pgHome = false;
  show('salon-start');
  renderSalonStart();
  loadSalon();
}

function renderSalonStart() {
  const d = salonData();
  const body = $('ss-body');
  if (!d) {
    body.innerHTML = sl.err
      ? `<p class="empty">Kara verisi alınamadı: ${esc(sl.err.message)}</p><button class="btn btn-block" data-ss="retry">Tekrar dene</button>`
      : '<p class="empty">Yükleniyor…</p>';
    return;
  }
  // 13.3: yalnızca salonPlan'daki planlı günler (salonVeri'deki son idman şablon değil)
  const bugun = todayKey();
  const gunler = programGunleri().filter((t) => t >= bugun);
  const kart = (t) => {
    const rows = programGun(t).filter((r) => !r.durum);
    const list = programHareketler(rows);
    return `<div class="ss-card" data-ss-gun="${t}">
      <p class="ss-k">${esc(fmtDateTR(t).toLocaleUpperCase('tr'))}${t === bugun ? ' · BUGÜN' : ''} · ${list.length} HAREKET · ${esc(fmtSure(salonTahmin(list)))}</p>
      ${rows.map((r) => `<div class="ss-row"><i data-bg="${grupInfo(r.hareket).renk}"></i><span><b>${esc(r.hareket)}</b>
        <small>${r.set || ''} × ${r.sure ? `${r.sure} sn` : esc(fmtDec(r.tekrar))}${r.agirlik !== '' && r.agirlik != null ? ` · ${esc(fmtKg(r.agirlik))}` : ''}</small></span></div>`).join('')}
      <div class="pg-act"><button class="btn btn-primary" data-ss="basla" data-t="${t}">${t === bugun ? 'İdmanı aç' : 'Bu planla başla'}</button><button class="btn" data-ss="duzenle" data-t="${t}">Düzenle</button></div>
    </div>`;
  };
  body.innerHTML = `${gunler.length ? gunler.map(kart).join('') : `<p class="empty">karaPlan'da sırada plan yok. Tabloda yazabilir ya da burada planlayabilirsin.</p>`}
    <button class="btn btn-block set-gap${gunler.length ? '' : ' btn-primary'}" data-ss="plan">＋ Yeni idman planla</button>
    <button class="btn btn-block set-gap" data-ss="prog">📅 Kara programı (hafta)</button>
    ${sl.err ? `<p class="muted set-gap">Çevrimdışı: son alınan veri gösteriliyor.</p>` : ''}`;
  paint(body);
}

async function onSalonStartClick(e) {
  const b = e.target.closest('[data-ss]');
  if (!b) return;
  const act = b.dataset.ss;
  const t = b.dataset.t;
  if (act === 'retry') { sl.err = null; renderSalonStart(); loadSalon(); }
  else if (act === 'basla') {
    const h = await oneriSor(programHareketler(programGun(t).filter((r) => !r.durum)), { plan: true });
    if (!h) return;
    sl.ses = salon.newSession(todayKey(), h);
    sl.ses.programTarih = t;
    slPersist();
    openSalon();
  } else if (act === 'duzenle') {
    showSalonPlanSablon({ tur: 'program', hareketler: programHareketler(programGun(t)), tarih: t });
    if (sl.plan) { sl.plan.hedefTarih = t; renderSalonPlan(); }
  } else if (act === 'plan') showSalonPlan();
  else if (act === 'prog') showSalonProgram();
}

function startSalon(hareketler) {
  sl.ses = salon.newSession(todayKey(), hareketler.map((h) => ({ ...h })));
  slPersist();
  openSalon();
}

// --- İdman ekranı ------------------------------------------------------------------

function openSalon() {
  sl.ses.screen = 'salon';
  slPersist();
  if (slst().phase === 'done') return showSalonOzet();
  show('salon');
  if (!sl.wheel) {
    sl.wheel = new Wheel($('sl-wheel'), {
      onLayout: () => { sl.wheel.items.forEach(fitCardText); },
      onChange: (i) => {
        if (!sl.ses) return;
        sl.ses.pos = i;
        slPersist();
        slRefreshAll();
      },
    });
  }
  const nodes = slH().map((x, h) => { const n = document.createElement('div'); slRenderItem(n, x, h); return n; });
  sl.wheel.setItems(nodes, Math.min(sl.ses.pos || 0, nodes.length - 1));
  slRefreshAll();
  clearInterval(sl.ticker);
  sl.ticker = setInterval(slTick, 200);
  slTick();
}

/** Biten setlerin tekrarını (süreli harekette saniyesini) ve hareketin ağırlığını sonradan düzeltir (tamamlanan hareket dahil). */
async function slDuzelt(h) {
  const x = slH()[h];
  const st = slst();
  const n = salon.doneSets(st, h);
  if (!n) return;
  const reps = salon.repsOf(sl.ses, st, h).slice(0, n);
  let kg = x.agirlik;
  const adim = data.getHareketNot(x.ad).adim || 2.5;
  const el = document.createElement('div');
  const ciz = () => {
    el.innerHTML = `${reps.map((v, j) => `<div class="dz-r"><span>${j + 1}. set</span><b class="n">${fmtDec(v)}${x.sure ? ' sn' : ''}</b><span class="dz-b"><button data-dz="${j}:-1">−</button><button data-dz="${j}:1">+</button></span></div>`).join('')}
      ${typeof kg === 'number' || kg === '' ? `<div class="dz-r"><span>Ağırlık</span><b class="n">${esc(fmtKg(kg))}</b><span class="dz-b"><button data-dz="kg:-1">−</button><button data-dz="kg:1">+</button></span></div>` : ''}
      <p class="oy-not">Ağırlık hareketin tüm setleri için yazılır.</p>`;
  };
  ciz();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dz]');
    if (!b) return;
    const [j, d] = b.dataset.dz.split(':');
    if (j === 'kg') kg = Math.max(0, (Number(kg) || 0) + Number(d) * adim);
    else reps[j] = Math.max(0, reps[j] + Number(d) * (x.sure ? 5 : 1));
    ciz();
  });
  const ok = await modal({ title: `${x.ad} · biten setler`, body: el, actions: [{ label: 'Kaydet', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }] });
  if (!ok || !sl.ses) return;
  const arr = sl.ses.reps[x._k] || (sl.ses.reps[x._k] = []);
  reps.forEach((v, j) => { arr[j] = v; });
  x.agirlik = kg;
  slPersist();
  slRefreshAll();
  toast('Biten setler düzeltildi', 1500);
}

function slRefreshAll() {
  if (!sl.wheel || !sl.ses) return;
  sl.wheel.items.forEach((n, h) => slRenderItem(n, slH()[h], h));
  slTick(); // sayaç dolu olsun ki kart doğru ölçülsün
  sl.wheel.items.forEach(fitCardText);
  sl.wheel.render();
  slUpdate();
}

function slCardMode(h) {
  const st = slst();
  const stat = salon.status(st, slH(), h);
  if (st.cur === h && (st.phase === 'work' || (st.phase === 'rest' && stat !== 'tamam'))) return 'live';
  if (stat === 'tamam' || stat === 'eksik') return 'sum';
  return 'ready';
}

function slBoxes(h, live) {
  const x = slH()[h];
  const st = slst();
  const sets = st.per[h].sets;
  const reps = salon.repsOf(sl.ses, st, h);
  const n = Math.max(x.set, sets.length);
  const out = [];
  for (let j = 0; j < n; j++) {
    let cls = '';
    let v = String(x.sure || x.tekrar);
    if (j < reps.length) { cls = 'ok'; v = fmtDec(reps[j]); }
    else if (live && sets[j] && sets[j].bit == null) { cls = 'now'; v = String(x.sure || x.tekrar); }
    else if (live && st.phase === 'rest' && j === reps.length) { cls = 'rest'; v = '—'; }
    out.push(`<div class="${cls}"><small>${j + 1}.</small><b class="n">${v}</b></div>`);
  }
  return `<div class="w-reps sl-sets">${out.join('')}</div>`;
}

function slRenderItem(node, x, h) {
  const st = slst();
  const mode = slCardMode(h);
  const stat = salon.status(st, slH(), h);
  const g = grupInfo(x.ad);
  const k = katalogOf(x.ad);
  const n = slH().length;
  const hedef = `${x.set} × ${x.sure ? `${x.sure} sn` : x.tekrar}`;
  let tag = `${g.ad ? `${esc(g.ad)} · ` : ''}${h + 1}/${n}`;
  const isnN = (sl.ses.isinmaSet || {})[x._k];
  if (isnN) tag = `${tag} · ISINMA ${isnN}`;
  if (stat === 'tamam') tag = `✓ TAMAMLANDI · ${tag}`;
  else if (stat === 'eksik') tag = `${salon.doneSets(st, h)}/${x.set} · ERKEN BİTTİ · ${tag}`;
  const vid = k && k.video ? `<a class="sl-vid" href="${esc(k.video)}" target="_blank" rel="noopener noreferrer" aria-label="Videoyu YouTube'da aç">▶ Video</a>`
    : videoOf(x.ad) ? `<button class="sl-vid sl-vform" data-bilgi="${esc(x.ad)}" aria-label="Formu izle">▶ Form</button>` : '';
  const pin = data.getHareketNot(x.ad).not;
  const info = `<div class="w-info">Hedef <b>${esc(hedef)}</b> · ${esc(fmtKg(x.agirlik))}${x.dinlen ? ` · Dinlen <b>${fmtDur(x.dinlen)}</b>` : ''}</div>${pin ? `<div class="sl-pin">📌 ${esc(pin)}</div>` : ''}`;
  const timer = '<div class="w-timer"><span class="w-tmode"></span><b class="w-tbig n"></b><span class="w-tsub n"></span></div>';
  let body;
  if (mode === 'live') {
    const reps = salon.repsOf(sl.ses, st, h);
    const j = st.phase === 'work' ? st.per[h].sets.length - 1 : reps.length - 1;
    const cur = st.phase === 'work' ? (sl.ses.reps[x._k] || [])[j] : reps[j];
    const val = cur != null ? cur : (x.sure || x.tekrar);
    const plus = `<div class="sl-row2">${st.phase === 'rest' ? '<button class="w-plus" data-sl-plus>＋1 set</button>' : ''}<button class="w-plus sl-agri" data-sl-agri>Ağrı</button></div>`;
    body = `<div class="w-title sl-ad">${esc(x.ad)}</div>${info}${slBoxes(h, true)}
      <div class="sl-wt"><div><span class="lbl">${j + 1}. SET ${x.sure ? 'SÜRE (SN)' : 'TEKRAR'}</span><b class="n">${fmtDec(val)}</b></div>
        <div class="sl-pm"><button data-sl-rep="-1" aria-label="Azalt">−</button><button data-sl-rep="1" aria-label="Artır">+</button></div></div>
      ${plus}${timer}`;
  } else if (mode === 'sum') {
    const reps = salon.repsOf(sl.ses, st, h);
    const gi = sl.ses.giris[x._k];
    const avg = reps.length ? reps.reduce((a, b) => a + b, 0) / reps.length : 0;
    body = `<div class="w-title sl-ad">${esc(x.ad)}</div>${slBoxes(h, false)}
      <div class="w-summary n">Ort. <b>${fmtDec(Math.round(avg * 100) / 100)}</b> · ${fmtShort(salon.hareketMs(st, h))}${gi && gi.rpe != null ? ` · RPE ${fmtDec(gi.rpe)}` : ''}${gi && gi.msi != null ? ` · MSI ${fmtDec(gi.msi)}` : ''}</div>
      ${gi ? '' : '<button class="w-plus" data-sl-giris>Nabız · RPE · MSI gir</button>'}`;
  } else {
    const o = oneriOf(x.ad);
    const oneriTx = x._oneri ? `<em class="ok">öneri uygulandı: ${esc(x._oneri.text)}</em> <button class="sl-geri" data-sl-geri>geri al</button>` : o ? `<em class="${o.warn ? 'warn' : ''}">öneri: ${esc(o.text)}</em>` : '';
    const prev = o ? `<div class="sl-prev">Geçen: ${o.rpe != null ? `RPE ${fmtDec(o.rpe)}` : ''}${o.msi ? ` · MSI ${fmtDec(o.msi)}` : ''} · ${oneriTx}</div>` : '';
    const w = x.agirlik === salon.VUCUT ? '' : `<div class="sl-wt"><div><span class="lbl">AĞIRLIK</span><b class="n">${esc(fmtKg(x.agirlik))}</b></div>
      <div class="sl-pm"><button data-sl-w="-1" aria-label="Ağırlığı azalt">−</button><button data-sl-w="1" aria-label="Ağırlığı artır">+</button></div></div>`;
    const kn = kisitOf(x.ad).notlar;
    const kisitTx = kn.length ? `<div class="sl-kn">${kn.map((t) => `<span>⚠ ${esc(t)}</span>`).join('')}</div>` : '';
    body = `<div class="w-title sl-ad">${esc(x.ad)}</div>${info}${prev}${kisitTx}${slBoxes(h, false)}${w}<div class="w-desc"></div>`;
  }
  node.classList.add('w-item');
  node.classList.toggle('is-done', stat === 'tamam' || stat === 'eksik');
  for (const m of ['live', 'next', 'sum', 'ready']) node.classList.toggle(`m-${m}`, m === mode);
  node.dataset.mode = mode;
  node.style.setProperty('--c', g.renk);
  node.style.setProperty('--c-soft', hexA(g.renk, 0.35));
  node.style.setProperty('--c-glow', hexA(g.renk, 0.55));
  node.style.setProperty('--c-wash', hexA(g.renk, 0.12));
  node.innerHTML = `
    <div class="w-line"></div><div class="w-dot"></div>
    <div class="w-row"><span class="w-tm">${h + 1}</span><span class="w-nm">${esc(x.ad)}</span></div>
    <div class="w-ctm">${h + 1}</div>
    <div class="w-card">${vid}<div class="w-tag">${tag}</div>${body}</div>`;
}

/** Üst bilgi, ilerleme çubuğu, büyük düğme. */
function slUpdate() {
  if (!sl.ses || !sl.wheel) return;
  const st = slst();
  const H = slH();
  const doneN = H.filter((_, h) => ['tamam', 'eksik'].includes(salon.status(st, H, h))).length;
  $('sl-count').innerHTML = `${doneN}<small class="y">/${H.length}</small>`;
  const tahmin = H.reduce((a, x) => a + x.set * ((x.sure ? x.sure + 30 : x.tekrar * 3 + 60)), 0);
  $('sl-end').textContent = ` /~${fmtDur(tahmin)}`;
  $('sl-bar').innerHTML = H.map((x, h) => {
    const stt = salon.status(st, H, h);
    return `<span class="seg${stt === 'tamam' || stt === 'eksik' ? ' is-on' : ''}${st.cur === h && st.phase !== 'done' ? ' is-cur' : ''}" data-bg="${grupInfo(x.ad).renk}" data-grow="${x.set}"></span>`;
  }).join('');
  paint($('sl-bar'));
  const a = salon.mainAction(st, H, sl.wheel.index);
  let label = 'BAŞLA';
  let sub = '';
  const x = H[a.h];
  if (a.kind === 'set') {
    sub = `${a.set}. set${st.basla == null ? ' · idman başlar' : ''}${x.sure ? ` · ${x.sure} sn` : ''}`;
  } else if (a.kind === 'bitti') {
    label = 'BİTTİ';
    sub = `${a.set}. set${a.set >= x.set ? ' · son set' : ''}`;
  } else if (a.kind === 'mola') { label = 'MOLA'; sub = 'Devam etmek için DEVAM ET'; }
  else { label = 'HAREKET TAMAM'; sub = 'Kaydırıp başka harekete geç'; }
  const lab = $('sl-main-label');
  if (lab.textContent !== label) { lab.textContent = label; fitText(lab, innerWidth <= 380 ? 34 : 40, 18); }
  $('sl-main-sub').textContent = sub;
  $('sl-main').classList.toggle('is-geldim', a.kind === 'bitti');
  slIsinmaGuncelle();
  $('sl-main').classList.toggle('is-idle', a.kind === 'yok');
  const on = prefs().ses;
  $('sl-sound').innerHTML = `${on ? ICON_SES_ON : ICON_SES_OFF}<span>${on ? 'Ses açık' : 'Ses kapalı'}</span>`;
  $('sl-sound').classList.toggle('is-off', !on);
}

function slPush(e) {
  sl.ses.events.push({ ...e, ts: e.ts || Date.now() });
  slPersist();
}

function onSlMain() {
  if (!sl.ses || !sl.wheel) return;
  const now = Date.now();
  const st = slst();
  if (st.last && now - st.last.ts < GUARD_MS) return;
  audio.unlock();
  const a = salon.mainAction(st, slH(), sl.wheel.index);
  if (a.kind === 'set') slPush({ t: 'set', ts: now, h: a.h });
  else if (a.kind === 'bitti') return slFinishSet(now);
  else if (a.kind === 'yok' || a.kind === 'mola') return;
  slRefreshAll();
}

/** Süperset üyeleri (aynı x.ss), sırayla. */
const ssUyeleri = (h) => { const H = slH(); const id = H[h] && H[h].ss; return id ? H.map((x, i) => (x.ss === id ? i : -1)).filter((i) => i >= 0) : []; };
/**
 * Süpersette h'nin setinden sonra gidilecek hareket: turdaki sonraki üye (dinlenmesiz) ya da turun başı (dinlenmeli).
 * { h, ara: true } (tur içi) | { h, ara: false } (yeni tur) | null
 */
function ssSonraki(h) {
  const u = ssUyeleri(h);
  if (u.length < 2) return null;
  const st = slst();
  const left = (i) => salon.doneSets(st, i) < slH()[i].set;
  const after = u.filter((i) => i > h && left(i) && salon.doneSets(st, i) < salon.doneSets(st, h));
  if (after.length) return { h: after[0], ara: true };
  const first = u.find(left);
  return first != null && first !== h ? { h: first, ara: false } : (left(h) ? { h, ara: false } : null);
}

/** Set biter; hareketin son setiyse hareket sonu girişi açılır. */
function slFinishSet(ts) {
  const h = slst().cur;
  slPush({ t: 'bitti', ts });
  if (prefs().ses) audio.ok();
  const st = slst();
  slRefreshAll();
  if (salon.doneSets(st, h) >= slH()[h].set) return openGiris(h);
  const ss = ssSonraki(h);
  if (ss && ss.h !== h) sl.wheel.scrollTo(ss.h); // süperset: sıradaki harekete geç
}

function onSlUndo() {
  const act = $('sl-undo').dataset.act;
  if (act === 'mola') { slPush({ t: 'mola' }); return slRefreshAll(); }
  if (act !== 'undo') return;
  const e = sl.ses.events;
  const popped = e.pop();
  if (popped && popped.t === 'set') {
    // Geri alınan setin girilmiş tekrarı da silinir.
    const x = slH()[popped.h];
    const r = sl.ses.reps[x._k];
    if (r) r.length = Math.min(r.length, slst().per[popped.h].sets.length - 1);
  }
  slPersist();
  slRefreshAll();
  toast('Son dokunuş geri alındı', 1500);
}

/** Set tekrarı ± (yapılan / son biten set) ve ağırlık ±. */
function onSlWheelClick(e) {
  const t = e.target;
  if (t.closest('a.sl-vid')) return; // video YouTube'da açılır
  const vf = t.closest('[data-bilgi]');
  if (vf) { e.stopPropagation(); bilgiKarti(vf.dataset.bilgi); return; } // form videosu (uygulama içinde)
  const st = slst();
  const repBtn = t.closest('[data-sl-rep]');
  if (repBtn) {
    const h = st.cur;
    const x = slH()[h];
    const arr = sl.ses.reps[x._k] || (sl.ses.reps[x._k] = []);
    const j = st.phase === 'work' ? st.per[h].sets.length - 1 : salon.doneSets(st, h) - 1;
    if (j < 0) return;
    const curV = arr[j] != null ? arr[j] : (x.sure || x.tekrar);
    arr[j] = Math.max(0, curV + Number(repBtn.dataset.slRep) * (x.sure ? 5 : 1));
    slPersist();
    return slRefreshAll();
  }
  const wBtn = t.closest('[data-sl-w]');
  if (wBtn) {
    const x = slH()[sl.wheel.index];
    x.agirlik = Math.max(0, (Number(x.agirlik) || 0) + Number(wBtn.dataset.slW) * (data.getHareketNot(x.ad).adim || 2.5));
    slPersist();
    return slRefreshAll();
  }
  if (t.closest('[data-sl-geri]')) {
    const x = slH()[sl.wheel.index];
    const tx = x._oneri ? x._oneri.text : '';
    salon.oneriGeriAl(x);
    slPersist();
    slRefreshAll();
    return toast(`Öneri geri alındı (${tx}): son yapılan değerler`, 2000);
  }
  if (t.closest('[data-sl-plus]')) return slPlusSet();
  if (t.closest('[data-sl-agri]')) return slAgri();
  if (t.closest('[data-sl-giris]')) return openGiris(sl.wheel.index);
  const card = t.closest('.w-item.is-active .w-card');
  if (card) openSlDetail(sl.wheel.index);
}

function slTick() {
  if (!sl.ses || state.screen !== 'salon') return;
  const now = Date.now();
  const st = slst();
  const clock = $('sl-clock');
  const ct = st.basla == null ? '0:00' : fmtClock(salon.idmanMs(st, now));
  if (clock.textContent !== ct) clock.textContent = ct;
  clock.classList.toggle('is-idle', st.basla == null);
  // Sol düğme: son basıştan 5 sn "Geri al"; dinlenirken "Mola".
  const undoable = Boolean(st.last && ['set', 'bitti'].includes(st.last.t) && st.phase !== 'done' && st.mola == null && now - st.last.ts < UNDO_MS);
  const act = undoable ? 'undo' : (st.phase === 'rest' && st.mola == null ? 'mola' : '');
  const lb = $('sl-undo');
  if (lb.dataset.act !== act) {
    lb.dataset.act = act;
    lb.innerHTML = act === 'mola' ? `${ICON_MOLA}<span>Mola</span>` : `${ICON_UNDO}<span>Geri al</span>`;
    lb.classList.toggle('is-on', act === 'undo');
    lb.classList.toggle('is-mola', act === 'mola');
  }
  $('sl-mola').hidden = st.mola == null;
  if (st.mola != null) $('sl-mola-time').textContent = fmtDur(Math.floor((now - st.mola) / 1000));
  if (!sl.wheel || st.cur == null) return;
  const node = sl.wheel.items[st.cur];
  const box = node && node.querySelector('.w-timer');
  const x = slH()[st.cur];
  if (st.phase === 'work') {
    const set = st.per[st.cur].sets[st.per[st.cur].sets.length - 1];
    const el = (now - set.bas) / 1000;
    if (x.sure) {
      const rem = x.sure - el;
      if (rem <= 0) { slFinishSet(set.bas + x.sure * 1000); return; } // süreli set kendiliğinden biter
      if (box) setTimer(box, `${st.per[st.cur].sets.length}. SET · SÜRE`, 'y', fmtDur(Math.ceil(rem)), rem <= 3 ? 'y' : '', `${x.sure} sn · bitince set biter`);
      checkBeep(set.bas, rem);
    } else if (box) {
      setTimer(box, `${st.per[st.cur].sets.length}. SET · YAPILIYOR`, 'y', fmtDur(Math.floor(el)), '', st.per[st.cur].sets.length >= x.set ? 'son set · bitince hareket biter' : `${x.set} setin ${st.per[st.cur].sets.length}.`);
    }
  } else if (st.phase === 'rest' && box && ssSonraki(st.cur) && ssSonraki(st.cur).ara) {
    const n = slH()[ssSonraki(st.cur).h];
    setTimer(box, 'SÜPERSET · DİNLENME YOK', 'y', '→', '', `sıradaki: ${n.ad}`);
  } else if (st.phase === 'rest' && box) {
    const el = salon.restMs(st, now) / 1000;
    const rem = x.dinlen - el;
    const next = `${salon.doneSets(st, st.cur) + 1}. SETE`;
    if (!x.dinlen) setTimer(box, `DİNLENME · ${next}`, 'b', fmtDur(Math.floor(el)), '', `hareket ${fmtShort(now - st.per[st.cur].sets[0].bas)}`);
    else {
      setTimer(box, rem < 0 ? 'DİNLENME UZADI' : `DİNLENME · ${next}`, rem < 0 ? 'r' : 'b', rem >= 0 ? fmtDur(Math.ceil(rem)) : `−${fmtDur(Math.floor(-rem))}`, rem < 0 ? 'r' : (rem <= 3 ? 'y' : ''), `plan ${fmtDur(x.dinlen)} · hareket ${fmtShort(now - st.per[st.cur].sets[0].bas)}`);
      if (st.mola == null) checkBeep(`s${st.lastBitti}`, rem);
    }
  }
}

/** Dinlenirken "+1 set" (5 sn Geri al). */
function slPlusSet() {
  const st = slst();
  if (st.phase !== 'rest' || st.cur == null) return;
  const x = slH()[st.cur];
  x.set += 1;
  slPersist();
  slRefreshAll();
  toastAction(`${x.ad}: ${x.set - 1} → ${x.set} set`, 'Geri al', () => {
    if (!sl.ses || x.set <= Math.max(1, salon.doneSets(slst(), slH().indexOf(x)))) return;
    x.set -= 1;
    slPersist();
    slRefreshAll();
  });
}

// --- Sürüm 12: hareket bilgi kartı (free-exercise-db) ve hareket grafiği --------------------

let hdb = null; // hareketdb.js (yalnızca kart açılınca yüklenir)
let adb = null; // adimlar.js (Türkçe adımlar, yalnızca kart açılınca)
const adimYukle = () => adb || (adb = import('./adimlar.js?v=13.11.0').then((m) => m.ADIMLAR).catch(() => ({})));
const hdbYukle = () => hdb || (hdb = import('./hareketdb.js?v=13.11.0'));
let bilgiTimer = null;

/** Hareketin videosu (H · Video önce, sonra uygulamadaki liste) ya da null. */
const videoOf = (ad) => video.videoBul(ad, (katalogOf(ad) || {}).video, VIDEOLAR);

/** Hareket adı → free-exercise-db kimliği (eşleştirme pahalı: 876 kayıt; sonuç önbellekte). */
const kimlikCache = new Map();
function hareketKimligi(H, ad) {
  if (kimlikCache.has(ad)) return kimlikCache.get(ad);
  const k = katalogOf(ad) || { ad };
  const id = bilgi.eslestir(ad, H.DB, k.gorsel || '', (x) => Boolean(H.TR[x]) || H.YEREL.has(x));
  kimlikCache.set(ad, id);
  return id;
}

/** [data-sp-th] yer tutucularına hareket fotoğrafı (eşleşme varsa; yoksa boş kalır). */
async function kartGorselleri(root) {
  const els = [...root.querySelectorAll('[data-sp-th]')];
  if (!els.length) return;
  const H = await hdbYukle();
  for (const el of els) {
    const id = hareketKimligi(H, el.dataset.spTh);
    if (!id || !H.YEREL.has(id)) continue; // küçük resim yalnızca uygulamadaki fotoğraflardan (çevrimdışı, dış istek yok)
    const im = document.createElement('img');
    im.loading = 'lazy';
    im.alt = '';
    im.src = `img/hareket/${id}_0.webp`;
    im.addEventListener('error', () => im.remove());
    el.replaceChildren(im);
    el.classList.add('is-img');
  }
}

/** Hareket bilgi kartını açar (fotoğraf başlangıç ↔ bitiş, adımlar, kaslar, kısıt, sık hata, video). */
async function bilgiKarti(ad) {
  const H = await hdbYukle();
  const k = katalogOf(ad) || { ad };
  const id = hareketKimligi(H, ad);
  const r = id ? H.DB.find((x) => x[0] === id) : null;
  const tr = id ? H.TR[id] : null;
  const ks = kisitOf(ad);
  const kasY = r ? bilgi.kasYogunluk(r[3], r[4]) : grup.haritaPay(salonData() ? salon.grupPay(salonData().etki, ad) : {});
  const src = (i) => (H.YEREL.has(id) ? `img/hareket/${id}_${i}.webp` : `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${id}/${i}.jpg`);
  const g = grupOf(ad);
  const v = videoOf(ad);
  const cevrimici = navigator.onLine !== false;
  const hn = data.getHareketNot(ad);
  const adm = tr ? null : (await adimYukle())[ad] || null;
  const box = $('bilgi');
  box.dataset.ad = ad;
  box.style.setProperty('--c', grup.grupRenk(g));
  $('bi-tag').textContent = `${grup.grupAd(g).toLocaleUpperCase('tr') || 'HAREKET'}${ks.durum !== 'uygun' ? ' · KISITLI' : ''}`;
  $('bi-title').textContent = tr ? tr.ad : ad;
  $('bi-body').innerHTML = `${tr && tr.ad !== ad ? `<p class="bi-en">${esc(ad)}</p>` : r && r[1] !== ad ? `<p class="bi-en">${esc(ad)} · ${esc(r[1])}</p>` : ''}
    ${v && cevrimici ? `<div class="bi-vid${v.bicim === 's' ? ' dik' : ''}"><iframe src="${esc(video.gommeAdresi(v))}" title="${esc(ad)} videosu" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <p class="bi-vk"><span>${v.kaynak ? `${esc(v.kaynak)} · ` : ''}${v.nereden === 'tablo' ? 'H · Video sütunundan' : 'uygulama listesinden'} · sessiz · döngü</span><a href="${esc(video.izleAdresi(v))}" target="_blank" rel="noopener noreferrer">↗ YouTube'da aç</a></p>` : ''}
    ${v && !cevrimici ? '<p class="bi-off">📶 Çevrimdışı: video internet gelince oynar. Şimdilik fotoğraf ve adımlar.</p>' : ''}
    ${!v ? '<p class="bi-off">Bu hareketin videosu yok: H sayfasının Video sütununa YouTube bağlantısı ekleyebilirsin.</p>' : ''}
    ${id && (!v || !cevrimici) && (cevrimici || H.YEREL.has(id)) ? `<div class="bi-media" id="bi-media"><img src="${src(0)}" alt="${esc(ad)}: başlangıç"><img class="b" src="${src(1)}" alt="${esc(ad)}: bitiş">
      <div class="bi-ph"><button data-bi-p="0" class="on">1 · Başlangıç</button><button data-bi-p="1">2 · Bitiş</button><button data-bi-p="a" class="play">⏸ durdur</button></div></div>`
    : id && !cevrimici ? '' : !v ? '<p class="dt-why">Bu hareket için fotoğraf bulunamadı. Tablodaki H sayfasına "Görsel" sütunu ekleyip free-exercise-db kimliğini yazabilirsin.</p>' : ''}
    <div class="bi-row"><span class="sp-mb big" data-mb data-mb-v="ikisi" data-mb-k="${esc(JSON.stringify(Object.fromEntries(Object.entries(kasY).map(([gg, v]) => [gg, Math.round(v * 100)]))))}"></span>
      <div><p class="sp-lb">ÇALIŞAN KAS</p>${r ? `<p><b>${esc(r[3].map(bilgi.kasAdi).join(', '))}</b></p>${r[4].length ? `<p class="mu">İkincil: ${esc(r[4].map(bilgi.kasAdi).join(', '))}</p>` : ''}` : etkiTR(ad).map(([gg, o]) => `<p>${esc(gg)} <b>${fmtDec(Math.round(o * 100) / 100)}</b></p>`).join('')}</div></div>
    <div class="bi-not" data-bi-not>${hn.not ? `<p>📌 ${esc(hn.not)}</p>` : '<p class="mu">📌 Sabit not yok (koltuk ayarı, bant rengi…)</p>'}<button data-bi-act="not">${hn.not ? 'Düzenle' : 'Not ekle'}</button></div>
    <div class="bi-adim"><span>Ağırlık adımı</span>${[1, 1.25, 2, 2.5, 5].map((a) => `<button data-bi-adim="${a}" class="${(hn.adim || 2.5) === a ? 'on' : ''}">${fmtDec(a)}</button>`).join('')}<small>kg</small></div>
    ${ks.durum === 'yasak' ? `<p class="bi-k red">⊘ ${esc(ks.neden.join(' · '))}${ks.alternatif ? ` · yerine: ${esc(ks.alternatif)}` : ''}</p>` : ''}
    ${ks.notlar.map((t) => `<p class="bi-k">⚠ ${esc(t)}</p>`).join('')}
    ${ks.durum === 'uygun' ? '<p class="bi-k ok">✓ Kısıtlarına uygun</p>' : ''}
    ${tr ? `<p class="sp-lb">NASIL YAPILIR</p><ol class="bi-ol">${tr.adim.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>
      <p class="sp-lb">SIK HATA</p><ul class="bi-err">${tr.hata.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <div class="bi-swim"><b>Yüzmeye katkısı</b><p>${esc(tr.yuzme)}</p></div>`
    : adm ? `<p class="sp-lb">NASIL YAPILIR${adm.yakin ? ` <small>(benzer hareketten: ${esc(adm.en)})</small>` : ''}</p><ol class="bi-ol">${adm.adim.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>`
    : r ? `<p class="sp-lb">NASIL YAPILIR <small>(kaynak İngilizce)</small></p><ol class="bi-ol" lang="en">${r[5].map((a) => `<li>${esc(a)}</li>`).join('')}</ol>` : ''}
    ${!tr && adm ? '<p class="bi-src">Türkçe adımlar: exercises-dataset (MIT lisansı, yalnızca metin)</p>' : ''}
    ${k.video && !video.ytAyir(k.video) ? `<p><a class="sl-vid is-inline" href="${esc(k.video)}" target="_blank" rel="noopener noreferrer">▶ Videoyu YouTube'da aç</a></p>` : ''}
    ${id ? `<p class="bi-src">Fotoğraf ve İngilizce anlatım: free-exercise-db (kamu malı)${H.YEREL.has(id) ? '' : ' · fotoğraf internetten yüklenir'}</p>` : ''}`;
  paint($('bi-body'));
  yerlestirMini($('bi-body'));
  box.hidden = false;
  clearInterval(bilgiTimer);
  const m = $('bi-media');
  if (m) {
    let auto = true, ph = 0;
    const set = (p) => { ph = p; m.classList.toggle('p1', p === 1); m.querySelectorAll('[data-bi-p]').forEach((b) => b.classList.toggle('on', b.dataset.biP === String(p))); };
    bilgiTimer = setInterval(() => { if (auto && !box.hidden) set(ph ? 0 : 1); }, 1500);
    m.querySelector('.bi-ph').addEventListener('click', (e) => {
      const b = e.target.closest('[data-bi-p]');
      if (!b) return;
      if (b.dataset.biP === 'a') { auto = !auto; b.textContent = auto ? '⏸ durdur' : '⏵ oynat'; } else { auto = false; m.querySelector('.play').textContent = '⏵ oynat'; set(Number(b.dataset.biP)); }
    });
  }
}
async function onBilgiClick(e) {
  const ad = $('bilgi').dataset.ad;
  if (!ad) return;
  const a = e.target.closest('[data-bi-adim]');
  if (a) { data.setHareketNot(ad, { adim: Number(a.dataset.biAdim) }); $('bi-body').querySelectorAll('[data-bi-adim]').forEach((b) => b.classList.toggle('on', b === a)); toast(`${ad}: ağırlık adımı ${fmtDec(Number(a.dataset.biAdim))} kg`, 1800); return; }
  if (e.target.closest('[data-bi-act="not"]')) {
    const el = document.createElement('div');
    el.innerHTML = `<textarea id="bi-not-ta" rows="3" maxlength="200" placeholder="ör. koltuk 4. delik, yeşil bant">${esc(data.getHareketNot(ad).not || '')}</textarea>`;
    const ok = await modal({ title: `📌 ${ad}`, body: el, actions: [{ label: 'Kaydet', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }] });
    if (!ok) return;
    data.setHareketNot(ad, { not: el.querySelector('textarea').value.trim() });
    bilgiKarti(ad);
    if (state.screen === 'salon' && sl.ses) slRefreshAll();
  }
}

function bilgiKapat() { $('bilgi').hidden = true; clearInterval(bilgiTimer); $('bi-body').replaceChildren(); /* video durur */ }

/** Hareketin son 8 idmanı: ağırlık (kg) ya da en iyi tekrar/süre; tek çizgi, noktada RPE. */
function hareketGrafik(ad) {
  const d = salonData();
  const h = d ? salon.historyOf(d.gecmis, ad).slice(0, 8).reverse() : [];
  if (h.length < 2) return '';
  const kg = h.every((r) => typeof r.agirlik === 'number');
  const timed = salon.isTimed(ad, h[h.length - 1].aciklama);
  const val = (r) => (kg ? r.agirlik : Math.max(...(salon.parseSetler(r.aciklama) || [Number(r.tekrar) || 0])));
  const v = h.map(val);
  const lo = Math.min(...v), hi = Math.max(...v);
  const pad = (hi - lo) * 0.15 || 1;
  const W = 300, Hh = 96, pl = 30, pr = 50, pt = 8, pb = 18;
  const X = (i) => pl + ((W - pl - pr) * i) / (h.length - 1);
  const Y = (y) => pt + (Hh - pt - pb) * (1 - (y - (lo - pad)) / (hi - lo + 2 * pad));
  const birim = kg ? ' kg' : timed ? ' sn' : '';
  const pts = v.map((y, i) => `${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const ticks = [lo, hi].filter((t, i, a) => a.indexOf(t) === i).map((t) => `<text x="${pl - 5}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end" class="ax">${fmtDec(t)}</text><line x1="${pl}" x2="${W - pr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" class="gl"/>`).join('');
  const dots = h.map((r, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v[i]).toFixed(1)}" r="8" class="hit"><title>${esc(r.tarih.slice(8, 10))}.${esc(r.tarih.slice(5, 7))} · ${fmtDec(v[i])}${birim}${r.rpe != null ? ` · RPE ${fmtDec(r.rpe)}` : ''}${r.msi ? ` · MSI ${fmtDec(r.msi)}` : ''}</title></circle>`).join('');
  return `<p class="sp-lb">SON ${h.length} İDMAN · ${kg ? 'AĞIRLIK (KG)' : timed ? 'EN UZUN SÜRE (SN)' : 'EN ÇOK TEKRAR'}</p>
    <svg class="hg" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(ad)} son ${h.length} idman">${ticks}
      <text x="${pl}" y="${Hh - 4}" class="ax">${esc(h[0].tarih.slice(8, 10))}.${esc(h[0].tarih.slice(5, 7))}</text><text x="${W - pr}" y="${Hh - 4}" text-anchor="end" class="ax">${esc(h[h.length - 1].tarih.slice(8, 10))}.${esc(h[h.length - 1].tarih.slice(5, 7))}</text>
      <polyline points="${pts}" class="ln"/>${dots}<circle cx="${X(h.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="4" class="last"/>
      <text x="${(X(h.length - 1) + 8).toFixed(1)}" y="${(Y(v[v.length - 1]) + 4).toFixed(1)}" class="dl">${fmtDec(v[v.length - 1])}${birim}</text></svg>`;
}

// --- Sürüm 12: set sırasında ağrı (MSI kural motoru), ısınma şablonu ----------------------

/** Set sırasında ağrı: 0,5 not · 1–1,5 hafiflet önerisi · 2 hareketi durdur · 3+ seansı bitir önerisi. */
async function slAgri() {
  const st = slst();
  const h = st.cur != null ? st.cur : sl.wheel.index;
  const x = slH()[h];
  const K = kurallar();
  const body = document.createElement('div');
  body.className = 'msi-sec';
  body.innerHTML = `<div class="msi-g">${salon.MSI_DEGERLER.map((v) => `<button data-value="${v}" class="${v >= K.msi.dur ? 'r' : ''}">${fmtDec(v)}</button>`).join('')}</div>
    <p class="msi-l"><span class="g">${fmtDec(K.msi.gozlem)} gözlem</span><span class="y">${fmtDec(K.msi.hafiflet)}–${fmtDec(K.msi.dur - 0.5)} hafiflet</span><span class="r">${fmtDec(K.msi.dur)} durdur</span><span class="r">${fmtDec(K.msi.tibbi)}+ tıbbi</span></p>`;
  const v = await modal({ title: `Ağrı · ${x.ad}`, body, actions: [{ label: 'Vazgeç', value: '' }] });
  if (v === '' || v == null || !sl.ses) return;
  const m = Number(v);
  const karar = kisit.msiKarar(m, K);
  sl.ses.agri = sl.ses.agri || {};
  const a = (sl.ses.agri[x._k] = sl.ses.agri[x._k] || { max: 0, not: [] });
  a.max = Math.max(a.max, m);
  const setNo = Math.max(1, st.per[h].sets.length);
  if (karar.seviye === 'devam' || karar.seviye === 'gozlem') {
    if (m > 0) a.not.push(`MSI ${fmtDec(m)} (${setNo}. set, gözlem)`);
    slPersist();
    return toast(m > 0 ? `MSI ${fmtDec(m)}: gözlem notu düşüldü, devam` : 'Ağrı yok: devam', 2000);
  }
  if (karar.seviye === 'hafiflet') {
    const hf = kisit.hafiflet(x);
    const ne = [hf.agirlik !== x.agirlik ? `${fmtKg(hf.agirlik)} (önce ${fmtKg(x.agirlik)})` : '', x.sure ? `${hf.sure} sn` : `${hf.tekrar} tekrar`].filter(Boolean).join(' · ');
    const c = await modal({ title: `MSI ${fmtDec(m)} · hafiflet`, body: `<p>Kalan setler: <b>${esc(ne)}</b>, yalnızca ağrısız aralıkta.</p>`, actions: [{ label: 'Hafifleterek devam', value: 'h', cls: 'btn-primary' }, { label: 'Aynen devam', value: '' }] });
    if (c === 'h') { Object.assign(x, hf); a.not.push(`MSI ${fmtDec(m)} (${setNo}. set) · hafifletildi: ${ne}`); }
    else a.not.push(`MSI ${fmtDec(m)} (${setNo}. set) · hafifletilmedi`);
    slPersist();
    return slRefreshAll();
  }
  if (karar.seviye === 'dur') {
    a.not.push(`MSI ${fmtDec(m)} (${setNo}. set) · durduruldu`);
    const done = salon.doneSets(st, h);
    if (st.phase === 'work' && st.cur === h) { x.set = done + 1; slPersist(); toast(`MSI ${fmtDec(m)}: hareket durduruldu`, 2500); return slFinishSet(Date.now()); }
    x.set = Math.max(1, done);
    slPersist();
    slRefreshAll();
    toast(`MSI ${fmtDec(m)}: hareket durduruldu`, 2500);
    if (done > 0) openGiris(h);
    return;
  }
  a.not.push(`MSI ${fmtDec(m)} (${setNo}. set) · tıbbi`);
  slPersist();
  const bit = await modal({ title: `MSI ${fmtDec(m)} · tıbbi değerlendirme`, body: '<p>Ağrı yüksek. Seansı bitirip kaydetmen önerilir.</p>', actions: [{ label: 'Seansı bitir', value: true, cls: 'btn-danger' }, { label: 'İdmana dön', value: false }] });
  if (bit && sl.ses) {
    if (slst().phase === 'work') slPush({ t: 'bitti' });
    slPush({ t: 'son' });
    showSalonOzet();
  }
}

/** Isınma şablonu (kayda sayılmaz): omuz ve kalça, kısıtlara uygun. */
const ISINMA = [
  { ad: 'Bant pull-apart', doz: '15' },
  { ad: 'Bant dış rotasyon', doz: '12 + 12' },
  { ad: 'Kol çevirme', doz: '30 sn' },
  { ad: 'Kalça köprüsü', doz: '10' },
];
function slIsinmaGuncelle() {
  const b = $('sl-warm');
  if (!sl.ses) return;
  const st = slst();
  const w = sl.ses.isinma || { tamam: [], bitti: false };
  b.hidden = st.basla != null || w.bitti;
  b.innerHTML = `<b>Isınma</b> ${w.tamam.length}/${ISINMA.length} <small>kayda sayılmaz ›</small>`;
}
async function slIsinma() {
  const w = (sl.ses.isinma = sl.ses.isinma || { tamam: [], bitti: false });
  const body = document.createElement('div');
  body.className = 'isn';
  const draw = () => { body.innerHTML = ISINMA.map((it, i) => `<button class="isn-i${w.tamam.includes(i) ? ' on' : ''}" data-isn="${i}"><i>${w.tamam.includes(i) ? '✓' : ''}</i><b>${esc(it.ad)}</b><span>${esc(it.doz)}</span></button>`).join(''); };
  draw();
  body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-isn]');
    if (!t) return;
    const i = Number(t.dataset.isn);
    w.tamam = w.tamam.includes(i) ? w.tamam.filter((x) => x !== i) : [...w.tamam, i];
    slPersist();
    draw();
  });
  const v = await modal({ title: 'Isınma · 6 dk', body, actions: [{ label: 'Bitti', value: 'ok', cls: 'btn-primary' }, { label: 'Isınmayı atla', value: 'atla' }, { label: 'Kapat', value: '' }] });
  if (!sl.ses) return;
  if (v === 'ok' || v === 'atla') w.bitti = true;
  slPersist();
  slIsinmaGuncelle();
}

/** Bu hareketin bugünkü satırı geçmişe göre rekor mu (hareket sonu). */
function slRekor(h) {
  const d = salonData();
  if (!d) return [];
  const x = slH()[h];
  const row = salon.payload(sl.ses, slst()).hareketler.find((r) => r.hareket === x.ad);
  return row ? salon.rekorlar(d.gecmis, { ...row, tarih: sl.ses.tarih }) : [];
}

// --- Ayrıntı paneli ve düzenleme --------------------------------------------------

function openSlDetail(h) {
  const x = slH()[h];
  const st = slst();
  const k = katalogOf(x.ad);
  const etki = etkiTR(x.ad);
  const started = st.per[h].sets.length > 0;
  const working = st.phase === 'work';
  const stat = salon.status(st, slH(), h);
  const b = (act, icon, label, on, cls = '') => `<button class="dt-act ${cls}" data-sact="${act}"${on ? '' : ' disabled'}><i>${icon}</i>${label}</button>`;
  const box = $('sl-detail');
  box.style.setProperty('--c', grupInfo(x.ad).renk);
  box.dataset.h = String(h);
  $('sl-detail-body').innerHTML = `
    <div class="dt-tag">${esc(grupInfo(x.ad).ad)} · ${h + 1}/${slH().length}</div>
    <div class="dt-title sl-dt">${esc(x.ad)}</div>
    <p class="dt-row">Hedef <b>${x.set} × ${x.sure ? `${x.sure} sn` : x.tekrar}</b> · ${esc(fmtKg(x.agirlik))} · Dinlen <b>${fmtDur(x.dinlen)}</b></p>
    ${k ? `<p class="dt-row">${esc([k.amac, k.ekipman].filter(Boolean).join(' · '))}${k.stc != null ? ` · Yüzme katsayısı ${fmtDec(k.stc)}` : ''}</p>` : '<p class="dt-why">Katalogda (H) yok: v2 formülü bu hareketi hesaplamaz.</p>'}
    ${etki.length ? `<div class="dt-kas"><span class="sp-mb" data-mb data-mb-ad="${esc(x.ad)}"></span><p class="dt-row sl-etki">${etki.slice(0, 4).map(([g, o]) => `${esc(g)} <b>${fmtDec(Math.round(o * 100) / 100)}</b>`).join(' · ')}</p></div>` : ''}
    ${hareketGrafik(x.ad)}
    <p class="dt-row"><button class="sl-bilgi" data-bilgi="${esc(x.ad)}">ⓘ Nasıl yapılır</button>${!working && !salon.doneSets(st, h) ? ` <button class="sl-bilgi sl-isn" data-sl-isn>＋ Isınma seti${(sl.ses.isinmaSet || {})[x._k] ? ` · ${(sl.ses.isinmaSet || {})[x._k]}` : ''} <small>kayda sayılmaz</small></button>` : ''}</p>
    ${k && k.video ? `<p class="dt-row"><a class="sl-vid is-inline" href="${esc(k.video)}" target="_blank" rel="noopener noreferrer">▶ Videoyu YouTube'da aç</a></p>` : ''}
    ${!working && salon.doneSets(st, h) ? '<p class="dt-row"><button class="sl-bilgi sl-dz" data-sl-dz>✎ Biten setleri düzelt</button></p>' : ''}
    <div class="dt-acts sl-acts">${b('edit', '✎', 'Düzenle', !working && stat !== 'tamam')}${b('swap', '⇄', 'Değiştir', !working && !started)}${b('add', '＋', 'Sonrasına ekle', !working)}${b('del', '🗑', 'Sil', !working && !started && slH().length > 1, 'del')}</div>
    ${working ? '<p class="dt-why">Set sürerken düzenlenemez</p>' : started ? '<p class="dt-why">Başlanan hareket silinemez ya da değiştirilemez</p>' : ''}
    <p class="dt-hint">Boşluğa dokun: kapat</p>`;
  paint($('sl-detail-body'));
  yerlestirMini($('sl-detail-body'));
  box.hidden = false;
}

function onSlDetailClick(e) {
  if (e.target.closest('a')) return;
  const bi = e.target.closest('[data-bilgi]');
  if (bi) { bilgiKarti(bi.dataset.bilgi); return; }
  if (e.target.closest('[data-sl-isn]')) {
    const h = Number($('sl-detail').dataset.h);
    const x = slH()[h];
    sl.ses.isinmaSet = sl.ses.isinmaSet || {};
    sl.ses.isinmaSet[x._k] = (sl.ses.isinmaSet[x._k] || 0) + 1;
    slPersist();
    slRefreshAll();
    openSlDetail(h);
    toast(`Isınma seti ${sl.ses.isinmaSet[x._k]}: kayda sayılmaz, nota yazılır`, 1500);
    return;
  }
  if (e.target.closest('[data-sl-dz]')) { const h = Number($('sl-detail').dataset.h); $('sl-detail').hidden = true; slDuzelt(h); return; }
  const btn = e.target.closest('[data-sact]');
  if (btn && btn.disabled) return;
  const box = $('sl-detail');
  const h = Number(box.dataset.h);
  box.hidden = true;
  if (!btn || !sl.ses) return;
  const act = btn.dataset.sact;
  if (act === 'edit') openSlEdit(h);
  else if (act === 'del') slDelete(h);
  else if (act === 'swap') pickHareket({ mode: 'swap', h });
  else if (act === 'add') pickHareket({ mode: 'add', h });
}

/** src: 'ses' (idman) ya da 'plan' (planlama 3. adım). Düzenleme katmanı o ekrana taşınır. */
const seListe = () => (sl.edit && sl.edit.src === 'plan' ? sl.plan.liste : slH());
function openSlEdit(h, src = 'ses') {
  const x = (src === 'plan' ? sl.plan.liste : slH())[h];
  const done = src === 'plan' ? 0 : salon.doneSets(slst(), h);
  const scr = $(src === 'plan' ? 'screen-salon-plan' : 'screen-salon');
  if ($('sl-edit').parentElement !== scr) scr.append($('sl-edit'));
  sl.edit = { h, src, d: { set: x.set, tekrar: x.tekrar, sure: x.sure, agirlik: x.agirlik, dinlen: x.dinlen }, min: Math.max(1, done) };
  renderSlEdit();
  $('sl-edit').hidden = false;
}

function renderSlEdit() {
  const E = sl.edit;
  const L = seListe();
  const x = L[E.h];
  const d = E.d;
  $('sl-edit').style.setProperty('--c', grupInfo(x.ad).renk);
  $('se-tag').textContent = `${grupInfo(x.ad).ad} · ${E.h + 1}/${L.length} · DÜZENLE`;
  $('se-title').textContent = x.ad;
  const stp = (key, label, value, note = '') => `<div class="es-row"><div class="es-l">${label}${note ? `<small>${note}</small>` : ''}</div>
    <div class="es-stp"><button data-se="${key}:-1" aria-label="${label} azalt">−</button><b class="n">${value}</b><button data-se="${key}:1" aria-label="${label} artır">+</button></div></div>`;
  $('se-body').innerHTML = `
    ${stp('set', 'SET', d.set, E.min > 1 ? `en az ${E.min} (yapıldı)` : '')}
    ${d.sure ? stp('sure', 'SÜRE (SN)', d.sure) : stp('tekrar', 'TEKRAR', d.tekrar)}
    ${d.agirlik === salon.VUCUT ? '' : stp('agirlik', 'AĞIRLIK', esc(fmtKg(d.agirlik)))}
    ${stp('dinlen', 'DİNLEN', fmtDur(d.dinlen))}
    <div class="es-blk"><div class="es-l">TÜR</div><div class="es-chips">
      <button data-se-chip="tekrar" class="${d.sure ? '' : 'is-on'}">Tekrar</button><button data-se-chip="sure" class="${d.sure ? 'is-on' : ''}">Süreli</button>
      <button data-se-chip="vucut" class="${d.agirlik === salon.VUCUT ? 'is-on' : ''}">Vücut ağırlığı</button></div></div>`;
}

function onSlEditClick(e) {
  const E = sl.edit;
  const t = e.target.closest('button');
  if (!E || !t) return;
  const d = E.d;
  if (t.id === 'se-back' || t.id === 'se-cancel') { $('sl-edit').hidden = true; sl.edit = null; return; }
  if (t.id === 'se-save' && E.src === 'plan') {
    Object.assign(sl.plan.liste[E.h], d);
    $('sl-edit').hidden = true;
    sl.edit = null;
    const y = $('sp-body').scrollTop; renderSalonPlan(); $('sp-body').scrollTop = y;
    return toast('Hareket güncellendi');
  }
  if (t.id === 'se-save') {
    Object.assign(slH()[E.h], d);
    $('sl-edit').hidden = true;
    sl.edit = null;
    slPersist();
    slRefreshAll();
    return toast('Hareket güncellendi');
  }
  if (t.dataset.se) {
    const [key, dir] = t.dataset.se.split(':');
    const k = Number(dir);
    if (key === 'set') d.set = Math.max(E.min, Math.min(20, d.set + k));
    else if (key === 'tekrar') d.tekrar = Math.max(1, Math.min(100, d.tekrar + k));
    else if (key === 'sure') d.sure = Math.max(5, Math.min(600, d.sure + k * 5));
    else if (key === 'agirlik') d.agirlik = Math.max(0, (Number(d.agirlik) || 0) + k * (data.getHareketNot(seListe()[E.h].ad).adim || 2.5));
    else if (key === 'dinlen') d.dinlen = Math.max(0, Math.min(600, d.dinlen + k * 15));
  } else if (t.dataset.seChip === 'sure') { d.sure = d.sure || 30; }
  else if (t.dataset.seChip === 'tekrar') { d.sure = 0; }
  else if (t.dataset.seChip === 'vucut') { d.agirlik = d.agirlik === salon.VUCUT ? '' : salon.VUCUT; }
  renderSlEdit();
}

/** Olaylardaki hareket indekslerini kaydırır (ekleme/silme). */
const slShift = (events, at, dlt) => events.map((e) => (e.h != null && e.h >= at ? { ...e, h: e.h + dlt } : e));

function slDelete(h) {
  if (slst().per[h].sets.length || slH().length < 2) return;
  const removed = slH()[h];
  sl.ses.hareketler.splice(h, 1);
  sl.ses.events = slShift(sl.ses.events, h + 1, -1);
  slPersist();
  openSalon();
  toastAction(`${removed.ad} silindi`, 'Geri al', () => {
    if (!sl.ses) return;
    sl.ses.hareketler.splice(h, 0, removed);
    sl.ses.events = slShift(sl.ses.events, h, 1);
    slPersist();
    openSalon();
  });
}

/** Değiştir: h. hareketin yerine; Ekle: h. hareketin arkasına. */
function slApplyPick({ mode, h }, ad) {
  const base = mode === 'swap' ? slH()[h] : null;
  const last = salonData() ? salon.historyOf(salonData().gecmis, ad)[0] : null;
  const nx = last ? salon.fromHistory(last) : salon.hareket({ ad, set: base ? base.set : 3, tekrar: base ? base.tekrar : 10, agirlik: (katalogOf(ad) || {}).ekipman === 'Bodyweight' ? salon.VUCUT : '', sure: salon.isTimed(ad) ? 30 : 0 });
  if (mode === 'swap') {
    sl.ses.hareketler[h] = nx;
    sl.ses.pos = h;
  } else {
    sl.ses.hareketler.splice(h + 1, 0, nx);
    sl.ses.events = slShift(sl.ses.events, h + 1, 1);
    sl.ses.pos = h + 1;
  }
  slPersist();
  openSalon();
  toast(mode === 'swap' ? `${base.ad} → ${ad}` : `${ad} eklendi`);
}

// --- Hareket sonu girişi -----------------------------------------------------------

function openGiris(h) {
  const x = slH()[h];
  const st = slst();
  const reps = salon.repsOf(sl.ses, st, h);
  const prev = sl.ses.giris[x._k];
  const lastSes = Object.values(sl.ses.giris).filter((g) => g.nabiz != null).pop();
  const hist = salonData() ? salon.historyOf(salonData().gecmis, x.ad).find((r) => r.nabiz != null) : null;
  const gecen = hist ? hist.nabiz : null;
  const ag = sl.ses.agri && sl.ses.agri[x._k];
  sl.giris = { h, nabiz: prev ? prev.nabiz : null, nabizBas: lastSes ? lastSes.nabiz : (gecen != null ? gecen : 120), rpe: prev ? prev.rpe : null, msi: prev ? prev.msi : (ag ? ag.max : null), not: prev ? prev.not || '' : (ag ? ag.not.join('; ') : ''), gecen };
  $('sl-giris').style.setProperty('--c', grupInfo(x.ad).renk);
  $('sg-tag').textContent = `${grupInfo(x.ad).ad} · ${h + 1}/${slH().length} · HAREKET BİTTİ`;
  $('sg-title').textContent = x.ad;
  const avg = reps.length ? reps.reduce((a, b) => a + b, 0) / reps.length : 0;
  const setMetin = `${reps.map(fmtDec).join('-')}${x.sure ? ' sn' : ''}`;
  sl.giris.sum = `<div class="sg-sum"><div class="sg-set${setMetin.length > 13 ? ' xl' : setMetin.length > 8 ? ' l' : ''}"><small>SETLER</small><b class="n">${esc(setMetin)}</b></div><div><small>ORT.</small><b class="n">${fmtDec(Math.round(avg * 100) / 100)}</b></div><div><small>SÜRE</small><b class="n">${fmtShort(salon.hareketMs(st, h))}</b></div></div>`;
  renderGiris();
  $('sl-giris').hidden = false;
}

function renderGiris() {
  const G = sl.giris;
  const rr = sporRef();
  const grid = (key, vals, cur, extra = '') => `<div class="sg-grid sg-${key}">${vals.map((v) => `<button data-sg="${key}" data-v="${v}" class="${cur === v ? 'is-on' : ''}">${fmtDec(v)}</button>`).join('')}${extra}</div>`;
  const msiText = rr && G.msi != null ? ref.scaleText(rr.msi, G.msi) : '';
  const rpeText = rr && G.rpe != null ? ref.scaleText(rr.rpe, G.rpe) : '';
  $('sg-body').innerHTML = `${G.sum}
    <p class="sg-lb">NABIZ</p>
    <div class="es-row sg-hr"><div><b class="n">${G.nabiz == null ? '—' : G.nabiz}</b><small>${G.nabiz == null ? ' ölçmediysen boş kalır · ± ile gir' : ' atım/dk'}${G.gecen != null ? ` · geçen ${G.gecen}` : ''}</small></div>
      <div class="es-stp"><button data-sg-hr="-5" aria-label="Nabız 5 azalt">−5</button><button data-sg-hr="-1" aria-label="Nabız azalt">−</button><button data-sg-hr="1" aria-label="Nabız artır">+</button></div></div>
    <p class="sg-lb">RPE</p>${grid('rpe', salon.RPE_DEGERLER, G.rpe, `<button data-sg="rpe" data-v="" class="${G.rpe == null ? 'is-on' : ''}">—</button>`)}
    ${rpeText ? `<p class="sg-desc">${esc(rpeText)} <span>(idmanRef)</span></p>` : ''}
    <p class="sg-lb">YEDEKTE TEKRAR (RIR) <small>— son sette kaç tekrar daha yapabilirdin? RPE'yi doldurur</small></p>
    <div class="sg-grid sg-rir">${[0, 1, 2, 3, 4].map((r) => `<button data-sg-rir="${r}" class="${G.rir === r ? 'is-on' : ''}">${r === 4 ? '4+' : r}</button>`).join('')}</div>
    <p class="sg-lb">SON SET</p>
    <div class="sg-grid sg-tur">${[['', 'normal'], ['düşürme seti', 'düşürme'], ['tükenişe kadar', 'tükeniş']].map(([v, l]) => `<button data-sg-tur="${v}" class="${(G.tur || '') === v ? 'is-on' : ''}">${l}</button>`).join('')}</div>
    <p class="sg-lb">MSI</p>${grid('msi', salon.MSI_DEGERLER, G.msi)}
    ${msiText ? `<p class="sg-desc">${esc(msiText)} <span>(idmanRef)</span></p>` : ''}
    <label class="es-blk"><span class="es-l">NOT</span><textarea id="sg-not" rows="2" autocomplete="off">${esc(G.not)}</textarea></label>`;
  const next = slNextOpen(G.h);
  $('sg-save-sub').textContent = next >= 0 ? `sıradaki: ${slH()[next].ad}` : 'idman biter · özet';
}

function onGirisClick(e) {
  const G = sl.giris;
  const t = e.target.closest('button');
  if (!G || !t) return;
  if (t.id === 'sg-save') return saveGiris();
  G.not = $('sg-not') ? $('sg-not').value : G.not;
  if (t.dataset.sgRir != null) { G.rir = Number(t.dataset.sgRir); G.rpe = Math.max(6, 10 - G.rir); }
  else if (t.dataset.sgTur != null) G.tur = t.dataset.sgTur;
  else if (t.dataset.sgHr) G.nabiz = G.nabiz == null ? G.nabizBas : Math.max(40, Math.min(220, G.nabiz + Number(t.dataset.sgHr))); // ilk dokunuş: son ölçülen değerden başla
  else if (t.dataset.sg) {
    const v = t.dataset.v === '' ? null : Number(t.dataset.v);
    G[t.dataset.sg] = v;
  } else return;
  renderGiris();
}

/** h'den sonraki ilk başlanmamış hareket; yoksa -1. */
function slNextOpen(h) {
  const st = slst();
  const n = slH().length;
  for (let k = 1; k < n; k++) {
    const j = (h + k) % n;
    if (!st.per[j].sets.length) return j;
  }
  return -1;
}

function saveGiris() {
  const G = sl.giris;
  const x = slH()[G.h];
  let not = ($('sg-not') ? $('sg-not').value : G.not).trim();
  if (G.tur && !not.includes(G.tur)) not = [not, `son set: ${G.tur}`].filter(Boolean).join(' · ');
  if (G.rir != null && !/RIR/.test(not)) not = [not, `RIR ${G.rir === 4 ? '4+' : G.rir}`].filter(Boolean).join(' · ');
  sl.ses.giris[x._k] = { nabiz: G.nabiz, rpe: G.rpe, msi: G.msi, not };
  $('sl-giris').hidden = true;
  sl.giris = null;
  slPersist();
  const pr = slRekor(G.h);
  if (pr.length) toast(`🏆 Rekor · ${x.ad}: ${pr.map((r) => r.metin).join(' · ')}`, 3500);
  const ss = ssSonraki(G.h);
  const next = ss && ss.h !== G.h ? ss.h : slNextOpen(G.h);
  if (next < 0 && slst().phase !== 'work') {
    slPush({ t: 'son' });
    return showSalonOzet();
  }
  slRefreshAll();
  if (next >= 0 && slst().phase !== 'work') sl.wheel.scrollTo(next);
}

// --- Geri, özet, kayıt -------------------------------------------------------------

async function onSlBack() {
  const st = slst();
  const choice = await modal({
    title: 'Kara idmanı',
    body: st.basla == null ? '<p>İdman henüz başlamadı.</p>' : `<p>Süre ${fmtClock(salon.idmanMs(st, Date.now()))} · ${slH().filter((_, h) => st.per[h].sets.length).length} hareket başladı.</p>`,
    actions: [
      { label: 'Devam et', value: '', cls: 'btn-primary' },
      ...(st.basla != null ? [{ label: 'İdmanı bitir ve kaydet', value: 'end' }] : []),
      { label: 'Ana sayfaya dön', value: 'home' },
      { label: 'İdmanı sil', value: 'del', cls: 'btn-danger' },
    ],
  });
  if (choice === 'end') {
    if (st.phase === 'work') slPush({ t: 'bitti' });
    slPush({ t: 'son' });
    showSalonOzet();
  } else if (choice === 'home') {
    clearInterval(sl.ticker);
    showHome();
  } else if (choice === 'del') {
    const ok = await modal({ title: 'İdman silinsin mi?', body: '<p>Bu kara idmanı telefondan silinir, tabloya yazılmaz.</p>', actions: [{ label: 'Evet, sil', value: true, cls: 'btn-danger' }, { label: 'Vazgeç', value: false }] });
    if (ok) { slEnd(); showHome(); }
  }
}

function slEnd() {
  clearInterval(sl.ticker);
  data.clearSalonSession();
  sl.ses = null;
  sl.st = null;
}

function showSalonOzet() {
  clearInterval(sl.ticker);
  sl.ses.screen = 'ozet';
  slPersist();
  show('salon-ozet');
  const st = slst();
  const p = salon.payload(sl.ses, st);
  const missing = p.hareketler.filter((x) => x.rpe === '' && x.msi === '').length;
  const d = salonData();
  const hac = salon.hacim(p.hareketler);
  const kp = kapsam(p.hareketler.map((x) => ({ ad: x.hareket, set: x.set })));
  const pr = d ? p.hareketler.flatMap((x) => salon.rekorlar(d.gecmis, { ...x, tarih: p.tarih }).map((r) => ({ ...r, ad: x.hareket }))) : [];
  const kiyas = d ? salonKiyas(d.gecmis, p) : null;
  $('so-body').innerHTML = `
    <div class="sg-sum so-top"><div><small>SÜRE</small><b class="n">${fmtClock(salon.idmanMs(st, Date.now()))}</b></div><div><small>HAREKET</small><b class="n">${p.hareketler.length}</b></div><div><small>SET</small><b class="n">${p.hareketler.reduce((a, x) => a + x.set, 0)}</b></div>${hac ? `<div><small>HACİM</small><b class="n">${fmtNum(hac)}<small> kg</small></b></div>` : ''}</div>
    ${Object.keys(kp).length ? `<div class="sp-kapsam so-heat"><span class="sp-mb big" data-mb data-mb-v="ikisi" data-mb-k="${esc(JSON.stringify(kp))}"></span><div><p class="sp-lb">ÇALIŞAN KASLAR</p>${Object.entries(kp).slice(0, 4).map(([g, v]) => `<p class="sp-kp"><span class="gd" data-bg="${grup.grupRenk(g)}"></span>${esc(g)}<b>%${v}</b></p>`).join('')}</div></div>` : ''}
    ${pr.length ? `<div class="so-pr"><b>🏆 Rekor</b>${pr.map((r) => `<p>${esc(r.ad)} · <b>${esc(r.metin)}</b><span>önceki ${esc(r.onceki)}</span></p>`).join('')}</div>` : ''}
    ${kiyas ? `<div class="so-kiyas"><p class="sp-lb">GEÇEN BENZER İDMANA GÖRE · ${esc(fmtDateTR(kiyas.tarih))}</p><p>${esc(kiyas.metin)}</p></div>` : ''}
    ${p.hareketler.length ? p.hareketler.map((x) => `<div class="ss-row"><i data-bg="${grupInfo(x.hareket).renk}"></i><span><b>${esc(x.hareket)}</b>
      <small>${x.set} × ${esc(fmtDec(x.tekrar))} · ${esc(fmtKg(x.agirlik))} · ${esc(x.sure)}${x.nabiz !== '' ? ` · ${x.nabiz} atım` : ''}${x.rpe !== '' ? ` · RPE ${fmtDec(x.rpe)}` : ''}${x.msi !== '' ? ` · MSI ${fmtDec(x.msi)}` : ''}</small>
      <small>${esc(x.aciklama)}</small></span></div>`).join('') : '<p class="empty">Biten set yok: kaydedilecek hareket yok.</p>'}
    ${missing ? `<p class="dt-why">${missing} harekette RPE/MSI girilmedi; boş yazılır.</p>` : ''}`;
  if (!sl.ses.seans) { sl.ses.seans = { yer: prefs().yer || 'Salon' }; slPersist(); }
  $('so-body').querySelector('.so-top').insertAdjacentHTML('afterend', '<div class="so-seans" id="so-seans"></div>');
  renderSoSeans();
  paint($('so-body'));
  yerlestirMini($('so-body'));
  $('so-save').disabled = !p.hareketler.length;
}

/** 13.4: idmanın geneli (karaSeans): seans RPE'si, MSI, yer, not — yük hesabı gerçek süre × bu RPE ile yapılır. */
function renderSoSeans() {
  const box = $('so-seans');
  if (!box || !sl.ses) return;
  const K = sl.ses.seans || {};
  const rr = sporRef();
  const grid = (key, vals, cur) => `<div class="sg-grid sg-${key}">${vals.map((v) => `<button data-so="${key}" data-v="${v}" class="${cur === v ? 'is-on' : ''}">${fmtDec(v)}</button>`).join('')}</div>`;
  const rpeText = rr && K.rpe != null ? ref.scaleText(rr.rpe, K.rpe) : '';
  const hr = salon.payload(sl.ses, slst()).hareketler.map((x) => Number(x.rpe)).filter((x) => x > 0);
  const ort = hr.length ? Math.round((hr.reduce((a, b) => a + b, 0) / hr.length) * 10) / 10 : null;
  box.innerHTML = `<p class="sp-lb">İDMANIN GENELİ <small>— karaSeans'a yazılır, yük bu RPE ile hesaplanır</small></p>
    <p class="sg-lb">RPE · tüm idman ne kadar zordu?${ort != null ? ` <small>(hareketlerin ortalaması ${fmtDec(ort)})</small>` : ''}</p>${grid('rpe', salon.RPE_DEGERLER, K.rpe)}
    ${rpeText ? `<p class="sg-desc">${esc(rpeText)} <span>(idmanRef)</span></p>` : ''}
    <p class="sg-lb">MSI · idman sonrası ağrı</p>${grid('msi', salon.MSI_DEGERLER, K.msi)}
    <p class="sg-lb">YER</p><div class="sg-grid sg-yer">${['Salon', 'Ev', 'Otel'].map((y) => `<button data-so="yer" data-v="${y}" class="${K.yer === y ? 'is-on' : ''}">${y}</button>`).join('')}</div>
    <label class="es-blk"><span class="es-l">NOT</span><textarea id="so-not" rows="2" autocomplete="off">${esc(K.not || '')}</textarea></label>`;
}

function onSoSeansClick(e) {
  const b = e.target.closest('[data-so]');
  if (!b || !sl.ses) return;
  const K = (sl.ses.seans = sl.ses.seans || {});
  const k = b.dataset.so;
  const v = k === 'yer' ? b.dataset.v : Number(b.dataset.v);
  K[k] = K[k] === v && k !== 'yer' ? null : v; // ikinci dokunuş seçimi kaldırır
  slPersist();
  renderSoSeans();
}

/** Geçen benzer idman (en az bir ortak hareket, en yeni tarih) ile hacim ve RPE kıyası. */
function salonKiyas(gecmis, p) {
  const adlar = new Set(p.hareketler.map((x) => x.hareket));
  const tarih = (gecmis || []).filter((r) => r.tarih < p.tarih && adlar.has(r.hareket)).reduce((a, r) => (r.tarih > a ? r.tarih : a), '');
  if (!tarih) return null;
  const rows = gecmis.filter((r) => r.tarih === tarih);
  const h0 = salon.hacim(rows), h1 = salon.hacim(p.hareketler);
  const ort = (xs) => { const v = xs.map((x) => Number(x.rpe)).filter((x) => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const r0 = ort(rows), r1 = ort(p.hareketler);
  const parts = [];
  if (h0 && h1) { const f = Math.round(((h1 - h0) / h0) * 100); parts.push(`Hacim ${fmtNum(h1)} kg · geçen ${fmtNum(h0)} kg (${f >= 0 ? '+' : ''}${f}%)`); }
  if (r1 != null && r0 != null) parts.push(`ort. RPE ${fmtDec(Math.round(r1 * 10) / 10)} (geçen ${fmtDec(Math.round(r0 * 10) / 10)})`);
  return parts.length ? { tarih, metin: parts.join(' · ') } : null;
}

function onSoBack() {
  const e = sl.ses.events;
  if (e.length && e[e.length - 1].t === 'son') e.pop();
  slPersist();
  openSalon();
}

/** Telefonda saklanan kopya (Yapılmış idmanlar). */
function keepSalonHistory(payload, status) {
  const st = slst();
  data.addHistory({ id: `s${payload.tarih}-${Date.now()}`, tur: 'salon', tarih: payload.tarih, savedAt: Date.now(), status, startedAt: st.basla, endedAt: st.son, sure: fmtHMS(salon.idmanMs(st, Date.now())), hareketler: payload.hareketler, seans: payload.seans });
}

async function saveSalonForm() {
  if (sl.saving || !sl.ses) return;
  const payload = salon.payload(sl.ses, slst());
  if (!payload.hareketler.length) return;
  sl.saving = true;
  $('so-save').disabled = true;
  $('so-save').textContent = 'Kaydediliyor…';
  try {
    await data.saveSalon(payload);
    keepSalonHistory(payload, 'sent');
    if (sl.ses.programTarih) data.salonProgramYapildi(sl.ses.programTarih).then(() => loadSalon()).catch(() => {}); // program satırları silinir (saveSalon zaten sildiyse etkisiz)

    slEnd();
    showHome();
    toast(`Kara idmanı kaydedildi: ${payload.hareketler.length} hareket`, 3500);
  } catch (err) {
    if (err.code === 'DUPLICATE') {
      const close = await modal({ title: 'Bu gün zaten kayıtlı', body: `<p>${esc(fmtDateTR(payload.tarih))} için idman sayfasında kayıt var; ikinci kez yazılmadı.</p>`, actions: [{ label: 'İdmanı kapat', value: true, cls: 'btn-primary' }, { label: 'Özete dön', value: false }] });
      if (close) { keepSalonHistory(payload, 'duplicate'); slEnd(); showHome(); }
    } else if (err.transient || err.code === 'NO_CONFIG') {
      data.enqueue(payload, { code: err.code, message: err.message }, 'salon');
      keepSalonHistory(payload, 'queued');
      slEnd();
      showHome();
      toast('Bağlantı yok: kayıt kuyruğa alındı, bağlantı gelince gönderilecek.', 4500);
    } else {
      const c = await modal({ title: 'Kaydedilemedi', body: `<p>${esc(err.message)}</p><p class="muted">Hata kodu: ${esc(err.code)}</p>`, actions: [{ label: 'Tekrar dene', value: 'retry', cls: 'btn-primary' }, { label: 'Kuyruğa al, sonra dene', value: 'queue' }, { label: 'Özete dön', value: '' }] });
      if (c === 'queue') { data.enqueue(payload, { code: err.code, message: err.message }, 'salon'); keepSalonHistory(payload, 'queued'); slEnd(); showHome(); }
      else if (c === 'retry') { sl.saving = false; return saveSalonForm(); }
    }
  } finally {
    sl.saving = false;
    $('so-save').disabled = false;
    $('so-save').textContent = 'Kaydet';
  }
}

// --- Salon programı (sürüm 13): SalonTakip "plan" sayfası ------------------------------------
/** Tablodaki program satırları (plan sayfası yoksa boş). */
const salonProgram = () => { const d = salonData(); return d && Array.isArray(d.plan) ? d.plan : []; };
const programGun = (t) => salonProgram().filter((r) => r.tarih === t);
/** Program satırları → idman hareketleri (son idmana göre öneri yok: program neyse o). */
function programHareketler(rows) {
  const ids = {};
  return rows.map((r) => {
    const x = salon.hareket({ ad: r.hareket, set: r.set || 3, tekrar: r.tekrar || 10, agirlik: r.agirlik == null ? '' : r.agirlik, dinlen: r.dinlen || 90, sure: r.sure || 0 });
    if (r.ss) x.ss = ids[r.ss] || (ids[r.ss] = x._k);
    return x;
  });
}

function showSalonProgram(bas) {
  if (state.screen === 'salon-start') state.pgHome = false; // geri: geldiği yer
  state.pgBas = bas || salon.haftaBasi(todayKey());
  show('salon-prog');
  renderSalonProgram();
}

function renderSalonProgram() {
  const bas = state.pgBas;
  const ad = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const yuzme = new Set(visibleDates().map((x) => x.tarih));
  const bugun = todayKey();
  $('pg-title').textContent = `${fmtDateTR(bas)} – ${fmtDateTR(yuk.gunEkle(bas, 6))}`;
  const destek = salonData() && Array.isArray(salonData().plan);
  const gunler = [];
  for (let i = 0; i < 7; i++) {
    const t = yuk.gunEkle(bas, i);
    const rows = programGun(t);
    const yapildi = rows.length && rows.every((r) => r.durum);
    const liste = rows.map((r) => `<li><span>${esc(r.hareket)}</span><b class="n">${r.set}×${r.sure ? `${r.sure}sn` : r.tekrar}${typeof r.agirlik === 'number' ? ` · ${fmtDec(r.agirlik)} kg` : ''}</b></li>`).join('');
    const sure = rows.length ? fmtSure(salonTahmin(programHareketler(rows))) : '';
    gunler.push(`<div class="pg-gun${t === bugun ? ' today' : ''}${yapildi ? ' done' : ''}" data-pg-gun="${t}">
      <div class="pg-h"><b>${ad[i]}</b><small>${esc(fmtDateTR(t).split(' ').slice(0, 2).join(' '))}</small>${yuzme.has(t) ? '<em class="pg-yz">🏊 yüzme</em>' : ''}${yapildi ? '<em class="pg-ok">✓ yapıldı</em>' : rows.length ? `<em>${rows.length} hareket · ${sure}</em>` : ''}</div>
      ${rows.length ? `<ul class="hgg-ls">${liste}</ul><div class="pg-act">${yapildi ? '' : `<button class="btn btn-primary" data-pg="basla" data-t="${t}">İdmana başla</button>`}<button class="btn" data-pg="duzenle" data-t="${t}">Düzenle</button><button class="btn" data-pg="sil" data-t="${t}">Sil</button></div>`
        : t >= bugun ? `<button class="btn btn-block pg-ekle" data-pg="planla" data-t="${t}">＋ Bu güne kara idmanı planla</button>` : ''}</div>`);
  }
  $('pg-body').innerHTML = `${destek ? '' : '<p class="bi-off">Programı tabloda tutmak için idman dosyasında karaPlan sayfası gerekir: ilk kez "Programa yaz" deyince betik sayfayı kendisi açar.</p>'}${gunler.join('')}
    <p class="sp-note">Program idman dosyasının karaPlan sayfasında durur; masada planla, salonda uygula. Yapılan idman karaVeri'ye yazılır, o günün satırları plandan silinir.</p>`;
}

async function onSalonProgramClick(e) {
  const b = e.target.closest('[data-pg]');
  if (!b) return;
  const t = b.dataset.t;
  const rows = programGun(t);
  if (b.dataset.pg === 'basla') {
    const h = await oneriSor(programHareketler(rows), { plan: true });
    if (!h) return;
    sl.ses = salon.newSession(todayKey(), h);
    sl.ses.programTarih = t;
    slPersist();
    openSalon();
  } else if (b.dataset.pg === 'duzenle') {
    showSalonPlanSablon({ tur: 'program', hareketler: programHareketler(rows), tarih: t });
    sl.plan.hedefTarih = t;
    renderSalonPlan();
  } else if (b.dataset.pg === 'planla') {
    showSalonPlan();
    if (sl.plan) sl.plan.hedefTarih = t;
  } else if (b.dataset.pg === 'sil') {
    const ok = await modal({ title: 'Programı sil', body: `<p>${esc(fmtDateTR(t))} günündeki ${rows.length} hareket tablodaki plan sayfasından silinsin mi?</p>`, actions: [{ label: 'Sil', value: true, cls: 'btn-primary' }, { label: 'Vazgeç', value: false }] });
    if (!ok) return;
    await programYaz(t, []);
  }
}

/** Plan (3. adım) → tabloya programa yazar. Gün: hedef gün ya da seçim. */
async function programaYaz() {
  const P = sl.plan;
  if (!P || !P.liste.length) return;
  let t = P.hedefTarih;
  if (!t) {
    const gunler = Array.from({ length: 7 }, (_, i) => yuk.gunEkle(todayKey(), i));
    t = await modal({ title: 'Hangi güne?', body: '<p>Plan idman dosyasının karaPlan sayfasına yazılır; o günün eski planı değişir.</p>', actions: [...gunler.map((g, i) => ({ label: `${i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : ''} ${fmtDateTR(g)}`.trim(), value: g, cls: i === 0 ? 'btn-primary' : '' })), { label: 'Vazgeç', value: '' }] });
    if (!t) return;
  }
  const hareketler = P.liste.map((x) => ({ hareket: x.ad, set: x.set, tekrar: x.sure ? 1 : x.tekrar, agirlik: x.agirlik, sure: x.sure || '', dinlen: x.dinlen, ss: x.ss ? String(P.liste.findIndex((y) => y.ss === x.ss) + 1) : '' }));
  if (await programYaz(t, hareketler)) { sl.plan = null; showSalonProgram(salon.haftaBasi(t)); }
}

async function programYaz(t, hareketler) {
  try {
    await data.saveSalonProgram(t, hareketler);
    await loadSalon();
    toast(hareketler.length ? `Programa yazıldı: ${fmtDateTR(t)} · ${hareketler.length} hareket` : `Program silindi: ${fmtDateTR(t)}`, 3000);
    if (state.screen === 'salon-prog') renderSalonProgram();
    return true;
  } catch (err) {
    toast(err.code === 'UNKNOWN_ACTION' ? 'idman betiği eski: idman.gs\'i yapıştırıp yeniden dağıt.' : `Yazılamadı: ${err.message}`, 4500);
    return false;
  }
}

// --- Salon planlama (salon.puanla) ---------------------------------------------------
// 1) Hedef: kas grubu dağılımı (son 4 hafta / tüm zaman) gösterilir, önceliğe sen karar
//    verirsin (dokun: öncelik, ×2, kapalı); amaç, ekipman ve yüzme aktarım süzgeci.
// 2) Hareket seç: puan = Σ(öncelik × etki) × aktarım; ağrılı hareket ⚠ ve yarım puan.
// 3) Plan: sıra, set × tekrar (son yapılan + öneri), süre tahmini → İdmana başla.

const STC_ADIM = [0, 0.5, 0.7, 0.85];

/** Hazır idmanı (son idman ya da kayıtlı plan) şablon olarak planın 3. adımında açar: sırala, çıkar, ekle, düzenle. */
function showSalonPlanSablon(hz) {
  if (!hz) return showSalonPlan();
  showSalonPlan();
  const P = sl.plan;
  if (!P) return;
  P.liste = hz.hareketler.map((x) => ({ ...x }));
  P.secili = P.liste.map((x) => x.ad);
  P.oncelik = { ...(hz.oncelik || {}) };
  P.sablon = hz.tur;
  P.step = 2;
  renderSalonPlan();
}

/** 13.5 (B5): döngü haftasının reçetesi (hedef set × tekrar · RIR) ve geçen idmana göre öneri; döngü yoksa boş. */
function receteSatiri(x) {
  const fd = fazBilgisi();
  const R = fd.kaynak ? gosterge.receteOf(fd.F.ad) : null;
  if (!R || x.sure) return '';
  const d = salonData();
  const son = d ? salon.historyOf(d.gecmis, x.ad)[0] : null;
  const reps = son ? salon.parseSetler(son.aciklama) : null;
  const kgsiz = x.agirlik === salon.VUCUT || /band|bodyweight|vücut/i.test(ekipmanOf(x.ad));
  const on = son ? gosterge.receteOneri({ tekrar: reps ? Math.max(...reps) : son.tekrar, rpe: son.rpe }, R, kgsiz) : null;
  return `<small class="sp-rc">hedef ${x.set} × ${R.min}–${R.max} · RIR ${R.rir} (${esc(R.ad)})${on ? ` · <em class="${on.tip === 'artir' ? '' : 'warn'}">${esc(on.metin)}</em>` : ''}</small>`;
}

/** Yer → izinli ekipman (H'deki Equipment adı). Salon: hepsi. */
const YERLER = { Salon: null, Ev: /^(band|bands|bodyweight|vücut|db|dumbbell|dambıl)$/i, Otel: /^(band|bands|bodyweight|vücut)$/i };

function showSalonPlan() {
  const d = salonData();
  if (!d) { toast('Kara verisi yok. Bağlantıyı kontrol et.'); loadSalon(); return; }
  sl.plan = { step: 0, oncelik: {}, amac: [], ekipman: [], stcMin: 0, secili: [], liste: [], hmView: 'front', odak: null };
  if (prefs().yer && YERLER[prefs().yer]) { sl.plan.yer = prefs().yer; sl.plan.ekipman = [...new Set(d.katalog.map((k) => k.ekipman).filter((e) => e && YERLER[prefs().yer].test(e)))]; }
  harita.hitYukle().then(() => {}); // dokunma haritası arka planda
  show('salon-plan');
  renderSalonPlan();
}

const grupAd = (g) => grup.grupAd(g);
const grupRenk = (g) => grup.grupRenk(g);
const planOpts = () => ({ oncelik: sl.plan.oncelik, amac: sl.plan.amac, ekipman: sl.plan.ekipman, stcMin: sl.plan.stcMin });

function payBar(pay) {
  return `<div class="sp-stk">${Object.entries(pay).sort((a, b) => b[1] - a[1]).map(([g, p]) => `<i data-bg="${grupRenk(g)}" data-grow="${Math.round(p * 100)}"></i>`).join('')}</div>`;
}

function sonText(r) {
  if (!r) return 'Daha önce yapılmadı';
  const reps = salon.parseSetler(r.aciklama);
  return `Son: ${r.tarih.slice(8, 10)}.${r.tarih.slice(5, 7)} · ${r.set}×${reps ? Math.max(...reps) : fmtDec(r.tekrar)} @${r.agirlik === salon.VUCUT ? 'vücut' : fmtDec(r.agirlik)}${r.rpe != null ? ` · RPE ${fmtDec(r.rpe)}` : ''}${r.msi != null ? ` · MSI ${fmtDec(r.msi)}` : ''}`;
}

function renderSalonPlan() {
  const P = sl.plan;
  const d = salonData();
  [...$('sp-steps').children].forEach((el, i) => el.classList.toggle('on', i <= P.step));
  const body = $('sp-body');
  const next = $('sp-next');
  if (P.step === 0) {
    $('sp-title').textContent = 'Kara idmanı planla';
    const son4 = salon.dagilim(d.gecmis, d.etki, addDays(todayKey(), -28));
    const tum = salon.dagilim(d.gecmis, d.etki);
    const chips = (key, vals, fmt = (v) => v) => `<div class="es-chips">${vals.map((v) => `<button data-sp-chip="${key}" data-v="${esc(v)}" class="${(key === 'stc' ? P.stcMin === v : P[key].includes(v)) ? 'is-on' : ''}">${esc(fmt(v))}</button>`).join('')}</div>`;
    const amaclar = [...new Set(d.katalog.map((k) => k.amac).filter(Boolean))].sort();
    const ekipmanlar = [...new Set(d.katalog.map((k) => k.ekipman).filter(Boolean))].sort();
    body.innerHTML = `${fazNotu()}${haritaBolumu(d, son4, tum)}
      <p class="sp-lb">LİSTE · KAS GRUBU DAĞILIMI · dokun: öncelik ver</p>
      <p class="sp-note">Çubuk son 4 hafta, çizgi tüm zaman ortalaması. Önceliğe sen karar verirsin.</p>
      <div class="sp-kas">${grup.sirala(salon.gruplar(d.etki)).map((g) => {
        const o = P.oncelik[g] || 0;
        return `<button class="sp-k${o ? ' is-on' : ''}" data-sp-grup="${esc(g)}"><b>${esc(grupAd(g))}<em>${o >= 2 ? `ÖNCELİK ×${o}` : o ? 'ÖNCELİK' : ''}</em></b>
          <span class="sp-bar"><i data-bg="${grupRenk(g)}" data-w="${Math.min(100, (son4[g] || 0) * 2.5)}"></i><s data-l="${Math.min(100, (tum[g] || 0) * 2.5)}"></s></span>
          <small>son 4 hafta %${fmtDec(son4[g] || 0)} · tümü %${fmtDec(tum[g] || 0)}</small></button>`;
      }).join('')}</div>
      <p class="sp-lb">YER <small>(ekipmanı süzer)</small></p><div class="es-chips">${Object.keys(YERLER).map((y) => `<button data-sp-yer="${y}" class="${(P.yer || 'Salon') === y ? 'is-on' : ''}">${y}</button>`).join('')}</div>
      <p class="sp-lb">AMAÇ</p>${chips('amac', amaclar)}
      <p class="sp-lb">YÜZMEYE ETKİ (en az)</p>${chips('stc', STC_ADIM, (v) => (v ? `≥ ${fmtDec(v)}` : 'Hepsi'))}
      <p class="sp-lb">EKİPMAN</p>${chips('ekipman', ekipmanlar)}`;
    next.textContent = `Hareketleri getir · ${salon.puanla(d, planOpts()).length} uygun`;
  } else if (P.step === 1) {
    $('sp-title').textContent = 'Hareket seç';
    const { rows, yasak, borc } = planRows(d, planOpts());
    const ac = borc.filter((b) => b.acik);
    const cak = hmOncelik(d, 'Omuz') ? yuk.cakisma(seansListesi(), todayKey(), planliYuzme(), true) : null;
    body.innerHTML = `<p class="sp-note">Sıralama: öncelikli kas × hareketin etkisi × yüzme aktarımı. ⚠: son iki idmanda ağrı (MSI ≥ 1,5).</p>
      ${cak ? `<p class="sp-cak">⚠ ${esc(cak.metin)}</p>` : ''}
      ${ac.length ? `<div class="sp-borc"><b>Önleyici borç · bu hafta</b>${borc.map((b) => `<span class="${b.acik ? '' : 'is-ok'}">${esc(b.ad)} ${b.yapilan}/${b.hedef}${b.acik ? '' : ' ✓'}</span>`).join('')}</div>` : ''}
      ${rows.map((r) => `<button class="sp-ex${P.secili.includes(r.ad) ? ' is-on' : ''}" data-sp-ex="${esc(r.ad)}">
        <span class="sp-mb" data-mb data-mb-ad="${esc(r.ad)}"></span>
        <span class="sp-sc"><b class="n">${r.puan}</b><small>PUAN</small></span>
        <span class="sp-m"><b>${esc(r.ad)}${r.amac ? `<span class="sp-tag">${esc(r.amac.toLocaleUpperCase('tr'))}</span>` : ''}${r.oneri && r.oneri.warn ? ' <span class="warn">⚠</span>' : ''}</b>
          ${payBar(r.pay)}<small>Yüzme ${r.stc == null ? '—' : fmtDec(r.stc)} · ${esc(sonText(r.son))}</small>
          <span class="sp-nasil" data-sp-info="${esc(r.ad)}" role="button" aria-label="${esc(r.ad)}: nasıl yapılır"><span class="sp-th" data-sp-th="${esc(r.ad)}"></span><span>${videoOf(r.ad) ? '▶ Video · nasıl yapılır' : 'ⓘ Nasıl yapılır'}</span></span>
          ${r.borcAcik ? `<small class="sp-ok">Önleyici: ${esc(salon.ONLEYICI.find((o) => o.key === r.kat).ad.toLocaleLowerCase('tr'))} borcu</small>` : ''}
          ${r.yorgun.length ? `<small class="warn">Dinleniyor: ${esc(r.yorgun.join(', '))}</small>` : ''}
          ${r.ks.notlar.map((t) => `<small class="sp-kn">⚠ ${esc(t)}</small>`).join('')}</span>
        ${r.video ? `<a class="sp-vid" href="${esc(r.video)}" target="_blank" rel="noopener noreferrer" aria-label="Video">▶</a>` : ''}
        <span class="sp-add">${P.secili.includes(r.ad) ? '✓' : '+'}</span></button>`).join('') || '<p class="empty">Süzgeçlere uyan hareket yok.</p>'}
      ${yasak.length ? `<button class="sp-kg" data-sp-kg>⊘ ${yasak.length} hareket sağlık kısıtı nedeniyle ${P.kisitGoster ? 'gösteriliyor · gizle' : 'gizlendi · göster'}</button>
        ${P.kisitGoster ? yasak.map((r) => `<div class="sp-ex is-yasak"><span class="sp-sc"><b class="n">⊘</b></span>
          <span class="sp-m"><b>${esc(r.ad)}</b><small class="sp-kn">${esc(r.ks.neden.join(' · '))}</small>${r.ks.alternatif ? `<small>Yerine: <b>${esc(r.ks.alternatif)}</b></small>` : ''}</span></div>`).join('') : ''}` : ''}
      ${P.secili.length ? (() => { const sx = P.secili.map((ad) => P.liste.find((x) => x.ad === ad) || salon.planHareket(d, ad, { uygula: false })); const k = kapsam(sx); return `<div class="sp-tray"><span class="sp-mb" data-mb data-mb-v="ikisi" data-mb-k="${esc(JSON.stringify(k))}"></span>
        <span class="sp-m"><b>${sx.length} hareket · ~${fmtDur(salonTahmin(sx))}</b><small>${esc(Object.entries(k).slice(0, 3).map(([g, v]) => `${g} %${v}`).join(' · '))}</small></span></div>`; })() : ''}`;
    next.textContent = `Plana geç · ${P.secili.length} hareket`;
    next.disabled = !P.secili.length;
  } else {
    $('sp-title').textContent = P.sablon ? (P.sablon === 'plan' ? 'Planı düzenle' : P.sablon === 'program' ? 'Programı düzenle' : P.sablon === 'oneri' ? 'Önerilen kara günü' : 'Son idmandan plan') : 'Plan';
    if (P.liste.length !== P.secili.length || P.liste.some((x, i) => x.ad !== P.secili[i])) {
      P.liste = P.secili.map((ad) => P.liste.find((x) => x.ad === ad) || salon.planHareket(d, ad, { bodyweight: (katalogOf(ad) || {}).ekipman === 'Bodyweight', uygula: false }));
    }
    const kp = kapsam(P.liste);
    body.innerHTML = `${fazNotu()}<p class="sp-sum">${P.liste.length} hareket · ~${fmtDur(salonTahmin(P.liste))} <small>(${salon.tahminOgren(P.liste, d.gecmis).ogrenilen ? 'son idmanlardaki gerçek sürelere göre' : 'set × (tekrar × 3 sn + 60 sn)'})</small></p>
      ${P.liste.length ? `<div class="sp-kapsam"><span class="sp-mb big" data-mb data-mb-v="ikisi" data-mb-k="${esc(JSON.stringify(kp))}"></span>
        <div><p class="sp-lb">PLANIN KAPSAMI</p>${Object.entries(kp).slice(0, 5).map(([g, v]) => `<p class="sp-kp"><span class="gd" data-bg="${grup.grupRenk(g)}"></span>${esc(g)}<b>%${v}</b></p>`).join('')}</div></div>` : ''}
      ${P.liste.map((x, i) => {
        const o = oneriOf(x.ad);
        const kn = kisitOf(x.ad).notlar;
        const rc = receteSatiri(x);
        const al = altOneriler(x.ad, P.liste.map((y) => y.ad), 1)[0];
        return `<div class="sp-pl"><span class="sp-n n">${i + 1}</span>
          <span class="sp-m"><b>${esc(x.ad)}</b><small>${esc(grupAd(grupOf(x.ad)))}${x._oneri ? ` · öneri uygulandı: <em>${esc(x._oneri.text)}</em>` : o ? ` · öneri: <em class="${o.warn ? 'warn' : ''}">${esc(o.text)}</em>` : ''}</small>${rc}${al ? `<button class="sp-alt" data-sp-alt="${i}" data-ad="${esc(al.ad)}">⇄ yerine: ${esc(al.ad)}</button>` : ''}${kn.map((t) => `<small class="sp-kn">⚠ ${esc(t)}</small>`).join('')}</span>
          <button class="sp-v n" data-sp-ed="${i}" aria-label="${esc(x.ad)} düzenle">${x.set} × ${x.sure ? `${x.sure} sn` : x.tekrar}<small>${esc(fmtKg(x.agirlik))} ✎</small></button>
          <span class="sp-mv"><button data-sp-mv="${i}:-1" aria-label="Yukarı" ${i ? '' : 'disabled'}>↑</button><button data-sp-mv="${i}:1" aria-label="Aşağı" ${i < P.liste.length - 1 ? '' : 'disabled'}>↓</button><button data-sp-rm="${i}" aria-label="Çıkar">✕</button></span></div>
          ${i < P.liste.length - 1 ? `<button class="sp-ss${x.ss && P.liste[i + 1].ss === x.ss ? ' is-on' : ''}" data-sp-ss="${i}">${x.ss && P.liste[i + 1].ss === x.ss ? '⛓ süperset · ayır' : '⛓ süperset yap'}</button>` : ''}`;
      }).join('')}
      <button class="btn btn-block sp-ekle" data-sp-add>＋ Hareket ekle</button>
      <p class="sp-note">Set, tekrar, ağırlık: sağdaki değere dokun. "Plana yaz" planı idman dosyasının karaPlan sayfasına yazar${P.hedefTarih ? ` (${esc(fmtDateTR(P.hedefTarih))})` : ' (gün seçilir)'}; ana sayfada yüzme planı gibi görünür.</p>`;
    next.textContent = 'İdmana başla';
    next.disabled = !P.liste.length;
  }
  $('sp-save').hidden = P.step !== 2;
  $('sp-save').textContent = 'Plana yaz';
  $('sp-save').disabled = !P.liste.length;
  if (P.step === 0) next.disabled = false;
  paint(body);
  if (P.step === 0) yerlestirHarita();
  yerlestirMini(body);
  if (P.step === 1) kartGorselleri(body).catch(() => {});
  for (const el of body.querySelectorAll('[data-w]')) el.style.width = `${el.dataset.w}%`;
  for (const el of body.querySelectorAll('[data-l]')) el.style.left = `${el.dataset.l}%`;
}

// --- Planlama: kas haritası (harita.js) ------------------------------------------------------
/** Haritadaki grup → tablodaki (hkEtki) gruplar. */
const tabloGruplari = (d, g) => salon.gruplar(d.etki).filter((t) => grup.haritaGruplari(t).includes(g));
/** Haritadaki grubun önceliği (tablo gruplarının en yükseği). */
const hmOncelik = (d, g) => Math.max(0, ...tabloGruplari(d, g).map((t) => sl.plan.oncelik[t] || 0));
/** Dağılım (tablo grubu → %) → haritadaki grup → %. */
function hmDagilim(dag) {
  const out = {};
  for (const [t, v] of Object.entries(dag)) { const hs = grup.haritaGruplari(t); for (const h of hs) out[h] = (out[h] || 0) + v / hs.length; }
  return out;
}

/** Hareket listesinin kas kapsamı (set ağırlıklı %): { grup: % } büyükten küçüğe. */
function kapsam(list) {
  const tot = {};
  let all = 0;
  for (const x of list) for (const [g, p] of Object.entries(hPay(x.ad))) { tot[g] = (tot[g] || 0) + p * (x.set || 1); all += p * (x.set || 1); }
  return Object.fromEntries(Object.entries(tot).map(([g, v]) => [g, Math.round((v / (all || 1)) * 100)]).sort((a, b) => b[1] - a[1]));
}
/** Kapsam → figür yoğunluğu (en büyük 1). */
const yogunlukOf = (k) => { const m = Math.max(1, ...Object.values(k)); return Object.fromEntries(Object.entries(k).map(([g, v]) => [g, 0.25 + 0.75 * (v / m)])); };
/** [data-mb] yer tutucularına mini figür; data-mb-ad: hareket ya da data-mb-k: kapsam JSON, data-mb-v: front|back|ikisi. */
function yerlestirMini(root) {
  for (const el of root.querySelectorAll('[data-mb]')) {
    const k = el.dataset.mbAd ? kapsam([{ ad: el.dataset.mbAd, set: 1 }]) : JSON.parse(el.dataset.mbK || '{}');
    // data-mb-abs: değerler 0–100 mutlak (toparlanma yorgunluğu); yoksa en büyüğe göre
    const y = el.dataset.mbAbs ? Object.fromEntries(Object.entries(k).map(([g, v]) => [g, v > 0 ? Math.max(0.12, Math.min(1, v / 100)) : 0])) : yogunlukOf(k);
    const ana = Object.keys(k)[0];
    const views = el.dataset.mbV === 'ikisi' ? ['front', 'back'] : [el.dataset.mbV || (ana ? harita.yuzu(ana) : 'front')];
    el.replaceChildren(...views.map((v) => harita.figur(v, { yogunluk: y, rozet: false, cls: 'mini' })));
  }
}

function haritaBolumu(d, son4, tum) {
  const P = sl.plan;
  const sec = {};
  for (const g of harita.META.grup) { const p = hmOncelik(d, g); if (p) sec[g] = p; }
  const say = (v) => Object.keys(sec).filter((g) => harita.gorunumde(v, g)).length || '';
  return `<div class="hm-top"><p class="sp-lb">KAS HARİTASI · dokun: seç / bırak</p>
      <div class="hm-seg"><button data-hm-v="front" class="${P.hmView === 'front' ? 'on' : ''}">Ön<i>${say('front')}</i></button><button data-hm-v="back" class="${P.hmView === 'back' ? 'on' : ''}">Arka<i>${say('back')}</i></button></div></div>
    <div class="hm-wrap" id="hm-wrap"></div>
    ${Object.keys(sec).length ? hmSecili(d, sec, son4, tum) : '<p class="hm-hint">Çalıştırmak istediğin bölgelere dokun · yana kaydır: ön / arka</p>'}`;
}

/** Seçili bölgeler ve ağırlıkları (1–5): haritanın altında. */
function hmSecili(d, sec, son4, tum) {
  const s4 = hmDagilim(son4), tz = hmDagilim(tum);
  const tp = yuk.toparlanma(seansListesi());
  const rows = grup.sirala(Object.keys(sec)).map((g) => {
    const w = sec[g];
    const fark = Math.round((s4[g] || 0) - (tz[g] || 0));
    const hazir = tp[g] ? tp[g].toparlanma : 100;
    const not = fark <= -5 ? '<em class="ok">geri kalmış</em>' : fark >= 5 ? '<em class="warn">fazla çalışılmış</em>' : '';
    return `<div class="hm-row" data-hm-row="${esc(g)}"><span class="gd" data-bg="${grup.grupRenk(g)}"></span>
      <div class="hm-rn"><b>${esc(g)}</b><small>son 4 hafta %${fmtDec(Math.round((s4[g] || 0) * 10) / 10)} · hazır %${hazir}${hazir < 60 ? ' ⚠' : ''} ${not}</small></div>
      <div class="hm-w" role="group" aria-label="${esc(g)} ağırlığı">${[1, 2, 3, 4, 5].map((n) => `<button data-hm-w="${esc(g)}|${n}" class="${n <= w ? 'on' : ''}" aria-label="${n}">${n}</button>`).join('')}</div>
      <button class="hm-rm" data-hm-rm="${esc(g)}" aria-label="${esc(g)} bırak">×</button></div>`;
  }).join('');
  return `<p class="sp-lb">SEÇİLİ BÖLGELER · AĞIRLIK <small>(1 az · 5 çok; hareket sıralamasını belirler)</small></p><div class="hm-list">${rows}</div>`;
}

/** Figürü yerleştirir (innerHTML'den sonra; durum sl.plan'dan). */
function yerlestirHarita() {
  const P = sl.plan;
  const d = salonData();
  const wrap = $('hm-wrap');
  if (!wrap || !d) return;
  const sec = {};
  for (const g of harita.META.grup) { const p = hmOncelik(d, g); if (p) sec[g] = p; }
  wrap.append(harita.figur(P.hmView, { secili: sec, sabit: true }));
}

/** Haritaya dokunma: seçili değilse seçer (ağırlık 3), seçiliyse bırakır. */
const HM_VARSAYILAN = 3;
function onHaritaTap(g) {
  const P = sl.plan;
  const d = salonData();
  const ts = tabloGruplari(d, g);
  if (!ts.length) { toast(`${g}: tabloda (hkEtki) bu gruba bağlı hareket yok`, 2500); return false; }
  const secili = hmOncelik(d, g) > 0;
  for (const t of ts) { if (secili) delete P.oncelik[t]; else P.oncelik[t] = HM_VARSAYILAN; }
  P.odak = null;
  return true;
}

let hmSwipe = null;
function onSalonPlanPointer(e) {
  if (e.type === 'pointerdown') { hmSwipe = e.target.closest('#hm-wrap') ? { x: e.clientX, y: e.clientY } : null; return; }
  if (!hmSwipe || !sl.plan) return;
  const dx = e.clientX - hmSwipe.x, dy = e.clientY - hmSwipe.y;
  hmSwipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    sl.plan.hmView = sl.plan.hmView === 'front' ? 'back' : 'front';
    sl.plan.hmSwiped = Date.now();
    const y = $('sp-body').scrollTop; renderSalonPlan(); $('sp-body').scrollTop = y;
  }
}

function onSalonPlanClick(e) {
  const P = sl.plan;
  if (!P || e.target.closest('a')) return;
  const inf = e.target.closest('[data-sp-info]');
  if (inf) { bilgiKarti(inf.dataset.spInfo); return; }
  const fig = e.target.closest('#hm-wrap .kf');
  if (fig) {
    if (P.hmSwiped && Date.now() - P.hmSwiped < 400) return;
    const hit = harita.hitEvent(fig, P.hmView, e);
    if (hit && onHaritaTap(hit.g)) { const y = $('sp-body').scrollTop; renderSalonPlan(); $('sp-body').scrollTop = y; }
    return;
  }
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.hmV) {
    P.hmView = t.dataset.hmV;
  } else if (t.dataset.hmW) {
    const [g, n] = t.dataset.hmW.split('|');
    for (const x of tabloGruplari(salonData(), g)) P.oncelik[x] = Number(n);
  } else if (t.dataset.hmRm) {
    for (const x of tabloGruplari(salonData(), t.dataset.hmRm)) delete P.oncelik[x];
  } else if (t.dataset.spGrup) {
    const g = t.dataset.spGrup;
    const o = P.oncelik[g] || 0;
    if (o >= 2) delete P.oncelik[g]; else P.oncelik[g] = o + 1; // liste: yok → ★ → ★★ → yok (haritadaki 3–5 de buradan sıfırlanır)
  } else if (t.dataset.spYer) {
    P.yer = t.dataset.spYer;
    const izin = YERLER[P.yer];
    P.ekipman = izin ? [...new Set(salonData().katalog.map((k) => k.ekipman).filter((e) => e && izin.test(e)))] : [];
    data.setPrefs({ yer: P.yer });
  } else if (t.dataset.spChip) {
    const key = t.dataset.spChip;
    if (key === 'stc') P.stcMin = Number(t.dataset.v);
    else P[key] = P[key].includes(t.dataset.v) ? P[key].filter((v) => v !== t.dataset.v) : [...P[key], t.dataset.v];
  } else if (t.dataset.spKg != null) {
    P.kisitGoster = !P.kisitGoster;
  } else if (t.dataset.spEx) {
    const ad = t.dataset.spEx;
    P.secili = P.secili.includes(ad) ? P.secili.filter((x) => x !== ad) : [...P.secili, ad];
  } else if (t.dataset.spMv) {
    const [i, k] = t.dataset.spMv.split(':').map(Number);
    const j = i + k;
    [P.liste[i], P.liste[j]] = [P.liste[j], P.liste[i]];
    P.secili = P.liste.map((x) => x.ad);
  } else if (t.dataset.spSs) {
    const i = Number(t.dataset.spSs);
    const a = P.liste[i], b = P.liste[i + 1];
    if (a.ss && b.ss === a.ss) { delete b.ss; if (!(i > 0 && P.liste[i - 1].ss === a.ss)) delete a.ss; for (let j = i + 2; j < P.liste.length && P.liste[j].ss === a.ss; j++) delete P.liste[j].ss; }
    else { const id = a.ss || b.ss || a._k; a.ss = id; b.ss = id; }
  } else if (t.dataset.spEd != null) {
    openSlEdit(Number(t.dataset.spEd), 'plan');
    return;
  } else if (t.dataset.spProg != null) {
    programaYaz();
    return;
  } else if (t.dataset.spAdd != null) {
    P.step = 1;
  } else if (t.dataset.spAlt != null) { // 13.6 (P3): aynı gruptan alternatifle değiştir (set/tekrar son yapılandan)
    const i = Number(t.dataset.spAlt);
    const ad = t.dataset.ad;
    const nx = salon.planHareket(salonData(), ad, { bodyweight: (katalogOf(ad) || {}).ekipman === 'Bodyweight', uygula: false });
    if (P.liste[i].ss) nx.ss = P.liste[i].ss;
    toast(`${P.liste[i].ad} → ${ad}`);
    P.liste[i] = nx;
    P.secili = P.liste.map((x) => x.ad);
  } else if (t.dataset.spRm) {
    P.liste.splice(Number(t.dataset.spRm), 1);
    P.secili = P.liste.map((x) => x.ad);
  } else return;
  const y = $('sp-body').scrollTop;
  renderSalonPlan();
  $('sp-body').scrollTop = y;
}

function onSalonPlanNext() {
  const P = sl.plan;
  if (P.step < 2) { P.step += 1; renderSalonPlan(); $('sp-body').scrollTop = 0; return; }
  sl.ses = salon.newSession(todayKey(), P.liste.map((x) => ({ ...x })));
  sl.ses.oncelik = { ...P.oncelik };
  sl.plan = null;
  slPersist();
  openSalon();
}

/** 13.3: Plana yaz — salonPlan sayfasına (gün: hedef gün ya da seçim). Telefona yerel plan artık kaydedilmez. */
function onSalonPlanSave() {
  programaYaz();
}

function onSalonPlanBack() {
  const P = sl.plan;
  if (P && P.step > 0) { P.step -= 1; return renderSalonPlan(); }
  showSalonStart();
}

/** İdmanda Değiştir (aynı kas grubundan) / Sonrasına ekle: puanlı liste. */
/** 13.6 (P3): aynı ana kas grubundan, kısıta uygun ve yerdeki ekipmanla yapılabilen alternatifler. */
function altOneriler(ad, haric = [], n = 3) {
  const d = salonData();
  if (!d) return [];
  const yer = prefs().yer;
  const ekipman = yer && YERLER[yer] ? [...new Set(d.katalog.map((k) => k.ekipman).filter((e) => e && YERLER[yer].test(e)))] : [];
  return salon.alternatifler(d, ad, { haric, ekipman, uygun: (x) => kisitOf(x).durum !== 'yasak', n });
}

async function pickHareket(ctx) {
  const d = salonData();
  if (!d) return toast('Kara verisi yok.');
  const cur = slH()[ctx.h];
  const g = grupOf(cur.ad);
  const oncelik = ctx.mode === 'swap' ? (g ? { [g]: 1 } : {}) : (sl.ses.oncelik || {});
  const rows = planRows(d, { oncelik, haric: slH().map((x) => x.ad) }).rows.slice(0, 20); // yasaklılar önerilmez
  const body = document.createElement('div');
  body.className = 'pick-list sp-pick';
  const alt = ctx.mode === 'swap' ? altOneriler(cur.ad, slH().map((x) => x.ad)) : [];
  body.innerHTML = (alt.length ? `<p class="sp-lb">ÖNERİLEN · AYNI KAS GRUBU</p>${alt.map((r) => `<button class="pick pick-on" data-value="${esc(r.ad)}"><b>⇄ ${esc(r.ad)}</b><small>${esc(r.neden)}</small></button>`).join('')}<p class="sp-lb">TÜMÜ</p>` : '') + rows.map((r) => `<button class="pick" data-value="${esc(r.ad)}"><b>${r.puan} · ${esc(r.ad)}${r.oneri && r.oneri.warn ? ' ⚠' : ''}</b><small>${esc(Object.keys(r.pay).map(grupAd).join(', '))} · ${esc(sonText(r.son))}</small></button>`).join('') || '<p class="empty">Uygun hareket yok.</p>';
  const ad = await modal({
    title: ctx.mode === 'swap' ? `${cur.ad} yerine (${grupAd(g) || 'aynı grup'})` : `${cur.ad} sonrasına ekle`,
    body,
    actions: [{ label: 'Vazgeç', value: '' }],
  });
  if (ad && sl.ses) slApplyPick(ctx, ad);
}

function wireSalon() {
  $('home-gym').addEventListener('click', onHomeGym);
  $('ss-back').addEventListener('click', showHome);
  $('ss-body').addEventListener('click', onSalonStartClick);
  $('sl-main').addEventListener('click', onSlMain);
  $('sl-warm').addEventListener('click', slIsinma);
  $('sl-undo').addEventListener('click', onSlUndo);
  $('sl-sound').addEventListener('click', () => { data.setPrefs({ ses: !prefs().ses }); refreshPrefs(); if (prefs().ses) audio.unlock(); slUpdate(); });
  $('sl-back').addEventListener('click', onSlBack);
  $('sl-devam').addEventListener('click', () => { slPush({ t: 'devam' }); slRefreshAll(); slTick(); });
  $('sl-wheel').addEventListener('click', onSlWheelClick);
  $('sl-detail').addEventListener('click', onSlDetailClick);
  $('sl-edit').addEventListener('click', onSlEditClick);
  $('sl-giris').addEventListener('click', onGirisClick);
  $('so-back').addEventListener('click', onSoBack);
  $('so-save').addEventListener('click', saveSalonForm);
  $('so-body').addEventListener('click', onSoSeansClick);
  $('so-body').addEventListener('input', (e) => { if (e.target.id === 'so-not' && sl.ses) { (sl.ses.seans = sl.ses.seans || {}).not = e.target.value; slPersist(); } });
  $('sp-back').addEventListener('click', onSalonPlanBack);
  $('sp-body').addEventListener('click', onSalonPlanClick);
  $('sp-body').addEventListener('pointerdown', onSalonPlanPointer);
  $('sp-body').addEventListener('pointerup', onSalonPlanPointer);
  $('sp-next').addEventListener('click', onSalonPlanNext);
  $('sp-save').addEventListener('click', onSalonPlanSave);
  $('bi-close').addEventListener('click', bilgiKapat);
  $('home-gym-start').addEventListener('click', onGymStart);
  $('yz-ara').addEventListener('click', onYzAra);
  $('home-gym-planla').addEventListener('click', () => {
    if (!data.isConfigured('salon')) return showSetup(true);
    state.pgHome = true; // Plana yaz → Takvim → geri: ana sayfa
    const hz = salonHazir();
    showSalonPlan();
    if (sl.plan && hz && hz.tarih && hz.tarih !== todayKey()) sl.plan.hedefTarih = todayKey(); // "Bugün için planla"
  });
  $('home-gym-cal').addEventListener('click', () => { if (!data.isConfigured('salon')) return showSetup(true); showSalonProgram(); state.pgHome = true; loadSalon(); });
}

function wire() {
  $('setup-save').addEventListener('click', saveSetup);
  $('setup-back').addEventListener('click', () => showHome());
  $('setup-forget').addEventListener('click', forgetKey);
  $('setup-prefs').addEventListener('click', onPrefsClick);
  $('pref-css').addEventListener('change', onCssChange);
  $('pref-css-test').addEventListener('click', cssTestiAc);
  $('pref-ses-test').addEventListener('click', () => {
    audio.unlock();
    audio.short();
    setTimeout(() => audio.long(), 500);
  });

  $('home-settings').addEventListener('click', () => showSetup(true));
  $('home-swim').addEventListener('click', () => showDays());
  $('home-open').addEventListener('click', () => {
    if (state.session) resumeSession();
    else if (state.homeNext) openDate(state.homeNext);
  });
  wireSalon();
  $('home-history').addEventListener('click', showHistory);
  $('home-form').addEventListener('click', showForm);
  $('pref-tema').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; data.setPrefs({ tema: b.dataset.v === 'koyu' ? null : b.dataset.v }); state.prefs = null; gorunumUygula(); renderPrefs(); });
  $('pref-yazi').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; data.setPrefs({ yazi: Number(b.dataset.v) === 1 ? null : Number(b.dataset.v) }); state.prefs = null; gorunumUygula(); renderPrefs(); });
  $('pref-bildirim').addEventListener('click', async () => {
    let ac = !prefs().bildirim;
    if (ac && 'Notification' in window && Notification.permission !== 'granted') ac = (await Notification.requestPermission().catch(() => 'denied')) === 'granted';
    if (ac === false && !prefs().bildirim) toast('Bildirim izni verilmedi', 2500);
    data.setPrefs({ bildirim: ac ? true : undefined });
    state.prefs = null;
    $('pref-bildirim').textContent = `Dinlenme bitince bildirim: ${prefs().bildirim ? 'açık' : 'kapalı'}`;
  });
  $('pref-yedek').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data.yedek(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `idmansk-yedek-${todayKey()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Yedek indirildi', 2000);
  });
  $('bi-body').addEventListener('click', onBilgiClick);
  $('pg-back').addEventListener('click', () => (state.pgHome ? showHome() : showSalonStart()));
  $('pg-prev').addEventListener('click', () => { state.pgBas = yuk.gunEkle(state.pgBas, -7); renderSalonProgram(); });
  $('pg-next').addEventListener('click', () => { state.pgBas = yuk.gunEkle(state.pgBas, 7); renderSalonProgram(); });
  $('pg-body').addEventListener('click', onSalonProgramClick);
  $('home-hafta').addEventListener('click', () => showHaftaOzeti());
  $('fm-back').addEventListener('click', showHome);
  $('hz-back').addEventListener('click', showHome);
  $('hz-prev').addEventListener('click', () => { state.haftaBas = yuk.gunEkle(state.haftaBas, -7); renderHaftaOzeti(); });
  $('hz-next').addEventListener('click', () => { state.haftaBas = yuk.gunEkle(state.haftaBas, 7); renderHaftaOzeti(); });
  $('home-week').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hw]');
    if (!b) return;
    if (b.dataset.hw === 'form') showForm();
    else if (b.dataset.hw === 'hafta') showHaftaOzeti();
    else if (b.dataset.hw === 'css') cssTestiAc();
    else if (b.dataset.hw === 'hazir') hazirKontrol();
    else if (b.dataset.hw === 'buhafta') showBuHafta();
  });
  $('bh-back').addEventListener('click', showHome);
  $('bh-body').addEventListener('click', onBuHaftaClick);
  $('fm-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fm]');
    if (!b) return;
    if (b.dataset.fm === 'blok') { data.setPrefs({ blokBas: salon.haftaBasi(todayKey()) }); toast('Döngü bu hafta başladı: 1. hafta · Hacim'); }
    else if (b.dataset.fm === 'blokbitir') { data.setPrefs({ blokBas: null }); toast('Döngü durduruldu'); }
    else if (b.dataset.fm === 'karayorg') data.setPrefs({ karaYorgunluk: !prefs().karaYorgunluk });
    state.prefs = null;
    renderForm();
  });
  $('hist-back').addEventListener('click', () => showHome());
  $('hist-list').addEventListener('click', onHistoryClick);
  $('hist-clear').addEventListener('click', clearHistory);

  $('days-back').addEventListener('click', () => showHome());
  $('days-refresh').addEventListener('click', () => showDays(true));
  $('days-list').addEventListener('click', onDaysClick);
  $('days-banners').addEventListener('click', onDaysClick);
  $('days-today-btn').addEventListener('click', () => { if (state.selDate) openDate(state.selDate); });
  $('days-hero').addEventListener('click', onDaysClick);
  $('wk-today').addEventListener('click', () => selectDay(todayKey(), false));
  wireWeekSwipe();

  $('prog-back').addEventListener('click', onProgramBack);
  $('btn-main').addEventListener('click', onMainButton);
  $('btn-undo').addEventListener('click', onLeftSlot);
  $('mola-devam').addEventListener('click', endMola);
  $('wheel').addEventListener('pointerdown', onWheelDown, { capture: true, passive: true });
  $('wheel').addEventListener('click', onWheelClick);
  $('detail').addEventListener('click', onDetailClick);
  $('eset').addEventListener('click', onSetEditClick);
  $('eset-desc').addEventListener('input', (e) => { if (state.eset) state.eset.d.aciklama = e.target.value; });
  $('eset-etiket').addEventListener('input', (e) => { if (state.eset) state.eset.d.etiket = e.target.value; });
  $('btn-sound').addEventListener('click', onSoundButton);

  $('rpe-back').addEventListener('click', backToWorkout);
  $('rpe-undo').addEventListener('click', backToWorkout);
  $('rpe-grid').addEventListener('click', onRpeClick);
  $('msi-back').addEventListener('click', openRpe);
  $('screen-msi').addEventListener('click', onMsiClick);
  $('oz-back').addEventListener('click', openMsi);
  $('screen-ozet').addEventListener('click', onOzetClick);
  $('oz-aciklama').addEventListener('input', (e) => { state.session.form.aciklama = e.target.value; persist(); });
  $('oz-save').addEventListener('click', saveSessionForm);
  $('ed-sheet-body').addEventListener('click', onEditClick);
  $('ed-dim').addEventListener('click', closeEdit);

  $('done-back').addEventListener('click', () => {
    // Kayıttan sonra sıradaki idmana değil, takvimde bugüne dönülür.
    const today = todayKey();
    state.selDate = today;
    state.weekStart = mondayOf(today);
    state.selKeep = true;
    showDays();
  });
  // iOS: ses bağlamı yalnızca bir dokunuşla açılabilir.
  document.addEventListener('pointerdown', () => { if (prefs().ses) audio.unlock(); }, { capture: true, passive: true });
  $('app-version').textContent = `Sürüm ${APP_VERSION}`;
  // Yazı tipi yüklenince ölçüler değişir: tekerleği ve kronometreyi yeniden ölç.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (state.wheel) state.wheel.layout();
      if (state.screen === 'program') { fitHeader(); fitMainLabel(); }
      fitListLines();
    });
  }
  // Ekran dönünce / boyut değişince tek satırlar ve paneller yeniden sığdırılır.
  let refitTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(refitTimer);
    refitTimer = setTimeout(() => { fitListLines(); if (!$('detail').hidden) fitDetail(); fitMolaNext(); }, 120);
  });

  // Beklenmeyen bir hata sessiz kalmasın ve ekranı kilitlemesin.
  const report = (msg) => {
    toast(`Beklenmeyen hata: ${msg}`, 6000);
    $('modal').hidden = true;
  };
  window.addEventListener('error', (e) => report(e.message));
  window.addEventListener('unhandledrejection', (e) => report((e.reason && e.reason.message) || String(e.reason)));

  window.addEventListener('online', () => flushQueue());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (wake.wanted) wake.acquire();
    if (state.screen === 'program') updateProgram();
    flushQueue();
  });
  // iOS: iki parmakla yakınlaştırmayı engelle.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

/** 13.6 (F7): uygulama dosyaları önbellekte; internet yokken de açılır (sw.js). Desteklemeyen tarayıcıda sessizce atlanır. */
function swKaydet() {
  try {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch { /* yok say */ }
}

/** 13.6: tema (koyu / açık / sistem) ve yazı boyutu (yakınlaştırma) — yalnız bu telefonda. */
function gorunumUygula() {
  const p = prefs();
  let acik = p.tema === 'acik';
  try { if (p.tema === 'sistem') acik = window.matchMedia('(prefers-color-scheme: light)').matches; } catch { /* eski tarayıcı */ }
  document.documentElement.dataset.theme = acik ? 'light' : 'dark';
  document.documentElement.style.zoom = p.yazi && p.yazi !== 1 ? String(p.yazi) : '';
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', acik ? '#F3F5F8' : '#0B0F14');
}

function boot() {
  gorunumUygula();
  try { window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (prefs().tema === 'sistem') gorunumUygula(); }); } catch { /* yok say */ }
  swKaydet();
  wire();
  if (!data.isConfigured()) {
    showSetup(false);
    return;
  }
  refreshRef();
  const s = data.loadSession();
  if (s && data.getCachedPlan(s.tarih)) {
    state.session = s;
    resumeSession(); // eski biçim seans burada yeni modele taşınır
    flushQueue();
    return;
  }
  if (s) data.clearSession();
  showHome();
}

boot();
