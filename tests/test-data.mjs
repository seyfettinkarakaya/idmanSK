// data.js birim testleri: localStorage ve fetch sahte, Node'da çalışır.
//   node tests/test-data.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ysk-'));
const modPath = path.join(tmp, 'data.mjs');
fs.copyFileSync(path.join(here, '..', 'data.js'), modPath);

// --- sahte ortam -------------------------------------------------------------
class Store {
  constructor() { this.m = new Map(); this.full = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.full) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
globalThis.localStorage = new Store();
let handler = null; // (body) => { status, json } | throws
const calls = [];
const urls = [];
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  calls.push(body.action);
  urls.push(`${url}|${body.token}`);
  if (opts.signal && opts.signal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
  const r = await handler(body, opts);
  return { ok: r.status === undefined || r.status < 400, status: r.status || 200, json: async () => { if (r.raw) throw new Error('bad json'); return r.json; } };
};

const data = await import(pathToFileURL(modPath).href);
const LS = globalThis.localStorage;
const reset = () => { LS.clear(); LS.full = false; calls.length = 0; urls.length = 0; handler = null; };
const cfg = () => data.setConfig({ apiUrl: 'https://script.google.com/macros/s/X/exec', token: 'tok' });
let n = 0;
const test = async (name, fn) => { reset(); await fn(); n++; };

// --- Ayarlar ------------------------------------------------------------------
await test('config boş/bozuk/geçerli', () => {
  assert.deepEqual(data.getConfig(), { apiUrl: '', token: '' });
  assert.equal(data.isConfigured(), false);
  LS.setItem('ysk.config', '{bozuk');
  assert.deepEqual(data.getConfig(), { apiUrl: '', token: '' });
  LS.setItem('ysk.config', JSON.stringify({ apiUrl: 5, token: ['x'] }));
  assert.deepEqual(data.getConfig(), { apiUrl: '', token: '' });
  data.setConfig({ apiUrl: '  https://a/exec ', token: ' t ' });
  assert.deepEqual(data.getConfig(), { apiUrl: 'https://a/exec', token: 't' });
  assert.equal(data.isConfigured(), true);
  data.clearConfig();
  assert.equal(data.isConfigured(), false);
});

await test('tercihler: varsayılan, doğrulama, kısmi güncelleme', () => {
  assert.deepEqual(data.getPrefs(), { ses: true, css: null, havuz: 25 });
  LS.setItem('ysk.prefs', JSON.stringify({ ses: 'evet', css: -3 }));
  assert.deepEqual(data.getPrefs(), { ses: true, css: null, havuz: 25 }, 'geçersiz değerler yok sayılır');
  data.setPrefs({ ses: false });
  assert.deepEqual(data.getPrefs(), { ses: false, css: null, havuz: 25 });
  data.setPrefs({ havuz: 50 });
  assert.equal(data.getPrefs().havuz, 50);
  data.setPrefs({ havuz: 33 });
  assert.equal(data.getPrefs().havuz, 25, 'geçersiz havuz varsayılana döner');
  data.setPrefs({ css: null });
  assert.deepEqual(data.getPrefs(), { ses: false, css: null, havuz: 25 });
  LS.setItem('ysk.prefs', '[]');
  assert.deepEqual(data.getPrefs(), { ses: true, css: null, havuz: 25 });
});

// --- Sunucu çağrıları ----------------------------------------------------------
await test('yapılandırma yoksa NO_CONFIG', async () => {
  await assert.rejects(data.getDates(), (e) => e.code === 'NO_CONFIG' && !e.transient);
});

await test('HTTP, geçersiz JSON, sunucu hatası, ağ hatası kodları', async () => {
  cfg();
  handler = () => ({ status: 500 });
  await assert.rejects(data.fetchPlan('2026-09-29'), (e) => e.code === 'HTTP' && e.transient);
  handler = () => ({ raw: true });
  await assert.rejects(data.fetchPlan('2026-09-29'), (e) => e.code === 'BAD_RESPONSE' && e.transient);
  handler = () => ({ json: { ok: false, error: 'AUTH', message: 'Geçersiz' } });
  await assert.rejects(data.fetchPlan('2026-09-29'), (e) => e.code === 'AUTH' && !e.transient && e.message === 'Geçersiz');
  handler = () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(data.fetchPlan('2026-09-29'), (e) => e.code === 'NETWORK' && e.transient);
  handler = () => ({ json: { ok: true, data: { setler: 'x' } } });
  await assert.rejects(data.fetchPlan('2026-09-29'), (e) => e.code === 'BAD_RESPONSE');
  handler = () => ({ json: { ok: false } });
  await assert.rejects(data.fetchPlan('2026-09-29'), (e) => e.code === 'UNKNOWN');
});

await test('istek gövdesi: action + token, text/plain', async () => {
  cfg();
  let seen;
  handler = (b, o) => { seen = { b, o }; return { json: { ok: true, data: { tarih: 'x', setler: [] } } }; };
  await data.fetchPlan('2026-09-29');
  assert.equal(seen.b.action, 'getPlan'); assert.equal(seen.b.token, 'tok'); assert.equal(seen.b.tarih, '2026-09-29');
  assert.match(seen.o.headers['Content-Type'], /^text\/plain/);
});

const DATES = [
  { tarih: '2026-09-29', setSayisi: 2, toplamMesafe: 600, hedefSure: 600, setler: [{ blok: 'WU', mesafe: 200, sure: 240 }],
    detay: [{ sira: 1, blok: 'WU', tekrar: 1, mesafe: 200 }, { sira: 2, blok: 'MS', tekrar: 4, mesafe: 100 }] },
  { tarih: '2026-10-02', setSayisi: 1, toplamMesafe: 400, hedefSure: 0, setler: [], detay: [{ sira: 1, blok: 'WU', tekrar: 1, mesafe: 400 }] },
];

await test('getDates: detay programları önbelleğe alır, listede tutmaz', async () => {
  cfg();
  handler = () => ({ json: { ok: true, data: DATES } });
  const r = await data.getDates();
  assert.equal(r.fromCache, false);
  assert.ok(r.dates.every((d) => !('detay' in d)), 'detay listeden çıkarılır');
  assert.ok(!LS.getItem('ysk.dates').includes('detay'));
  assert.deepEqual(data.getCachedPlan('2026-09-29').setler.map((s) => s.sira), [1, 2]);
  assert.equal(data.getCachedPlan('2026-10-02').setler.length, 1);
});

await test('getDates: devam eden seansın programına dokunmaz', async () => {
  cfg();
  data.storePlan({ tarih: '2026-09-29', setler: [{ sira: 9, blok: 'CD' }] });
  data.saveSession({ tarih: '2026-09-29', done: {}, results: {}, sw: { laps: [] } });
  handler = () => ({ json: { ok: true, data: DATES } });
  await data.getDates();
  assert.deepEqual(data.getCachedPlan('2026-09-29').setler.map((s) => s.sira), [9], 'seans programı sabit kalır');
  assert.equal(data.getCachedPlan('2026-10-02').setler.length, 1);
});

await test('getDates: eski sunucu (detay yok), liste dışı günler budanır', async () => {
  cfg();
  data.storePlan({ tarih: '2026-01-01', setler: [{ sira: 1 }] });
  handler = () => ({ json: { ok: true, data: DATES.map(({ detay, ...d }) => d) } });
  await data.getDates();
  assert.equal(data.getCachedPlan('2026-09-29'), null);
  assert.equal(data.getCachedPlan('2026-01-01'), null, 'listede olmayan gün silinir');
});

await test('getDates: {dates:[…]} biçimi, bozuk liste, çevrimdışı önbellek', async () => {
  cfg();
  handler = () => ({ json: { ok: true, data: { dates: DATES } } });
  assert.equal((await data.getDates()).dates.length, 2);
  handler = () => ({ json: { ok: true, data: { bozuk: 1 } } });
  const r = await data.getDates(); // BAD_RESPONSE geçici → önbellek
  assert.equal(r.fromCache, true); assert.equal(r.error.code, 'BAD_RESPONSE');
  handler = () => { throw new Error('ağ yok'); };
  const r2 = await data.getDates();
  assert.equal(r2.fromCache, true); assert.equal(r2.dates.length, 2);
  handler = () => ({ json: { ok: false, error: 'AUTH' } });
  await assert.rejects(data.getDates(), (e) => e.code === 'AUTH', 'kalıcı hata önbelleğe düşmez');
  LS.setItem('ysk.dates', JSON.stringify({ dates: 'bozuk' }));
  assert.equal(data.getCachedDates(), null);
  handler = () => { throw new Error('ağ yok'); };
  await assert.rejects(data.getDates(), (e) => e.code === 'NETWORK', 'bozuk önbellek + ağ yok');
});

await test('getPlan: kaydeder; ağ yoksa önbellek; yoksa hata', async () => {
  cfg();
  handler = () => ({ json: { ok: true, data: { tarih: '2026-09-29', setler: [{ sira: 1 }] } } });
  const r = await data.getPlan('2026-09-29');
  assert.equal(r.fromCache, false); assert.equal(data.getCachedPlan('2026-09-29').setler.length, 1);
  handler = () => { throw new Error('x'); };
  assert.equal((await data.getPlan('2026-09-29')).fromCache, true);
  await assert.rejects(data.getPlan('2026-12-31'), (e) => e.code === 'NETWORK');
});

await test('fetchPlan önbelleğe yazmaz', async () => {
  cfg();
  handler = () => ({ json: { ok: true, data: { tarih: '2026-09-29', setler: [{ sira: 1 }] } } });
  await data.fetchPlan('2026-09-29');
  assert.equal(data.getCachedPlan('2026-09-29'), null);
});

await test('forgetDate: listeden ve programlardan çıkarır; bozuk önbellekte çökmez', async () => {
  cfg();
  handler = () => ({ json: { ok: true, data: DATES } });
  await data.getDates();
  data.forgetDate('2026-09-29');
  assert.deepEqual(data.getCachedDates().map((d) => d.tarih), ['2026-10-02']);
  assert.equal(data.getCachedPlan('2026-09-29'), null);
  LS.setItem('ysk.dates', '"bozuk"'); LS.setItem('ysk.plans', '[1,2]');
  data.forgetDate('2026-10-02');
  assert.equal(LS.getItem('ysk.dates'), null);
});

await test('seans doğrulaması', () => {
  assert.equal(data.loadSession(), null);
  LS.setItem('ysk.session', JSON.stringify({ tarih: 'x' }));
  assert.equal(data.loadSession(), null, 'eksik alanlı seans yok sayılır');
  const s = { tarih: '2026-09-29', done: {}, results: {}, sw: { laps: [] } };
  data.saveSession(s);
  assert.deepEqual(data.loadSession(), s);
  data.clearSession();
  assert.equal(data.loadSession(), null);
  // Sürüm 10 biçimi: olay listesi
  const v2 = { v: 2, tarih: '2026-09-29', events: [{ t: 'basla', ts: 1 }, { t: 'cik', ts: 2, set: 0 }], pos: 0 };
  data.saveSession(v2);
  assert.deepEqual(data.loadSession(), v2);
  data.saveSession({ ...v2, events: [{ t: 'cik' }] });
  assert.equal(data.loadSession(), null, 'zaman damgası olmayan olay reddedilir');
  data.saveSession({ ...v2, events: 'x' });
  assert.equal(data.loadSession(), null);
});

// --- Yapılmış idmanlar -------------------------------------------------------------
const rec = (tarih, status = 'sent') => ({ id: `${tarih}-1`, tarih, savedAt: 1, status, seans: {}, setler: [] });

await test('geçmiş: ekle, aynı günü değiştir, sırala, sil, bozuk kayıtları ele', () => {
  assert.deepEqual(data.getHistory(), []);
  assert.equal(data.addHistory(rec('2026-09-25')), true);
  data.addHistory(rec('2026-09-29'));
  data.addHistory({ ...rec('2026-09-25', 'queued'), id: 'yeni' });
  assert.deepEqual(data.getHistory().map((r) => [r.tarih, r.status]), [['2026-09-29', 'sent'], ['2026-09-25', 'queued']]);
  data.removeHistory(['yeni']);
  assert.deepEqual(data.getHistory().map((r) => r.tarih), ['2026-09-29']);
  LS.setItem('ysk.history', JSON.stringify([null, { id: 1 }, rec('2026-01-01'), { id: 'x', tarih: 'y' }]));
  assert.deepEqual(data.getHistory().map((r) => r.tarih), ['2026-01-01']);
  LS.setItem('ysk.history', '{}');
  assert.deepEqual(data.getHistory(), []);
});

await test('geçmiş: depolama doluysa false döner', () => {
  LS.full = true;
  assert.equal(data.addHistory(rec('2026-09-29')), false);
});

// --- Kuyruk ---------------------------------------------------------------------------
const payload = (tarih) => ({ tarih, seans: {}, setler: [] });

await test('kuyruk: bozuk öğeleri eler, sırayı korur', () => {
  data.enqueue(payload('2026-09-26'), { code: 'NETWORK', message: 'x' });
  data.enqueue(payload('2026-09-27'));
  assert.deepEqual(data.getQueue().map((q) => q.payload.tarih), ['2026-09-26', '2026-09-27']);
  assert.equal(data.getQueue()[0].lastError.code, 'NETWORK');
  LS.setItem('ysk.queue', JSON.stringify([{ id: 'a' }, null, { id: 'b', payload: { tarih: 'x' } }]));
  assert.deepEqual(data.getQueue().map((q) => q.id), ['b']);
  LS.setItem('ysk.queue', '"x"');
  assert.deepEqual(data.getQueue(), []);
});

await test('flush: gönderilen/DUPLICATE çıkar, geçmiş işaretlenir, ağ hatasında durur', async () => {
  cfg();
  data.addHistory(rec('2026-09-26', 'queued'));
  data.addHistory(rec('2026-09-27', 'queued'));
  data.enqueue(payload('2026-09-26'));
  data.enqueue(payload('2026-09-27'));
  data.enqueue(payload('2026-09-28'));
  let i = 0;
  handler = () => {
    i++;
    if (i === 1) return { json: { ok: true, data: { yazilanSet: 1 } } };
    if (i === 2) return { json: { ok: false, error: 'DUPLICATE' } };
    throw new Error('ağ');
  };
  const r = await data.flushQueue();
  assert.deepEqual(r.sent.map((x) => x.tarih), ['2026-09-26']);
  assert.deepEqual(r.duplicates.map((x) => x.tarih), ['2026-09-27']);
  assert.equal(r.remaining, 1);
  const q = data.getQueue();
  assert.equal(q[0].tries, 1); assert.equal(q[0].lastError.code, 'NETWORK');
  const h = Object.fromEntries(data.getHistory().map((x) => [x.tarih, x.status]));
  assert.deepEqual(h, { '2026-09-26': 'sent', '2026-09-27': 'duplicate' });
});

await test('flush: kalıcı hata (PLAN_MISMATCH) atlanır, sonraki denenir; çift çağrı tek iş', async () => {
  cfg();
  data.enqueue(payload('2026-09-26'));
  data.enqueue(payload('2026-09-27'));
  handler = (b) => (b.tarih === '2026-09-26' ? { json: { ok: false, error: 'PLAN_MISMATCH', message: 'm' } } : { json: { ok: true, data: {} } });
  const [a, b] = [data.flushQueue(), data.flushQueue()];
  assert.equal(a, b, 'aynı anda ikinci flush aynı işi döndürür');
  const r = await a;
  assert.deepEqual(r.sent.map((x) => x.tarih), ['2026-09-27']);
  assert.equal(data.getQueue()[0].lastError.code, 'PLAN_MISMATCH');
  assert.equal(calls.filter((c) => c === 'finishSession').length, 2);
});

await test('13.9 flush: SAME_DAY kuyrukta kalır; ikinci idman işaretlenince ikinci: true ile gönderilir', async () => {
  cfg();
  data.enqueue(payload('2026-09-26'));
  const bodies = [];
  handler = (b) => { bodies.push(b); return b.ikinci ? { json: { ok: true, data: { yazilanSet: 1 } } } : { json: { ok: false, error: 'SAME_DAY', message: 'başka idman' } }; };
  let r = await data.flushQueue();
  assert.equal(r.remaining, 1); assert.equal(data.getQueue()[0].lastError.code, 'SAME_DAY');
  assert.ok(data.markQueueIkinci(data.getQueue()[0].id));
  assert.equal(data.getQueue()[0].lastError, null);
  r = await data.flushQueue();
  assert.deepEqual(r.sent.map((x) => x.tarih), ['2026-09-26']);
  assert.equal(bodies[1].ikinci, true); assert.equal(r.remaining, 0);
  assert.equal(data.markQueueIkinci('yok'), false);
});

await test('flush: yapılandırma yoksa göndermez', async () => {
  data.enqueue(payload('2026-09-26'));
  const r = await data.flushQueue();
  assert.equal(r.remaining, 1); assert.equal(calls.length, 0);
});

// --- 13.2: 2 bağlantı (idman = yüzme + salon, idmanRef) -------------------------------------
const SALON = 'https://script.google.com/macros/s/S/exec';
const REF = 'https://script.google.com/macros/s/R/exec';

await test('2 bağlantı: salon idman bağlantısını kullanır (eski ayrı salon yok sayılır), salon için idmanRef de gerekir', () => {
  LS.setItem('ysk.config', JSON.stringify({ apiUrl: 'https://a/exec', token: 't', salon: { apiUrl: SALON, token: 's' } })); // eski biçim
  assert.deepEqual(data.getConfig(), { apiUrl: 'https://a/exec', token: 't' });
  assert.deepEqual(data.getConfig('salon'), { apiUrl: 'https://a/exec', token: 't' }, 'salon = idman');
  assert.equal(data.isConfigured('salon'), false, 'idmanRef yok');
  data.setConfig({ apiUrl: REF, token: 'r' }, 'ref');
  assert.equal(data.isConfigured('salon'), true);
  data.setConfig({ apiUrl: SALON, token: 's2' }, 'salon');
  assert.deepEqual(data.getConfig('salon'), { apiUrl: 'https://a/exec', token: 't' }, 'salon ayrı kaydedilmez');
  data.setConfig({ apiUrl: 'https://b/exec', token: 't2' });
  assert.equal(JSON.parse(LS.getItem('ysk.config')).salon, undefined, 'eski salon bağlantısı temizlenir');
  assert.deepEqual(data.getConfig('ref'), { apiUrl: REF, token: 'r' }, 'idman değişince idmanRef kalır');
  data.clearConfig();
  assert.equal(data.isConfigured('ref'), false);
});

await test('2 bağlantı: getRef idmanRef\'e, getSalon idman\'a gider; salon önbelleği katalog/etki/bw\'yi idmanRef\'ten alır', async () => {
  cfg();
  data.setConfig({ apiUrl: REF, token: 'r' }, 'ref');
  handler = (b) => ({ json: { ok: true, data: b.action === 'getRef' ? { zones: [], css: [{ ilk: '2026-01-01', css: 120 }], katalog: [{ ad: 'Row' }], etki: [{ ad: 'Row', grup: 'Back', oran: 1 }], bw: [{ ilk: '2026-01-01', son: '', kg: 80 }] } : { katalog: [], etki: [], bw: [], gecmis: [] } } });
  await data.getRef();
  const d = await data.getSalon();
  assert.deepEqual(urls, [`${REF}|r`, 'https://script.google.com/macros/s/X/exec|tok']);
  assert.equal(data.getCachedRef().data.css[0].css, 120);
  assert.deepEqual([d.katalog[0].ad, data.getCachedSalon().data.etki[0].grup, data.getCachedSalon().data.bw[0].kg], ['Row', 'Back', 80]);
});

await test('idmanRef/salon: beklenmeyen cevap BAD_RESPONSE, önbelleğe yazılmaz', async () => {
  cfg();
  data.setConfig({ apiUrl: REF, token: 'r' }, 'ref');
  handler = () => ({ json: { ok: true, data: { uygulama: 'başka betik' } } });
  await assert.rejects(data.getRef(), (e) => e.code === 'BAD_RESPONSE');
  await assert.rejects(data.getSalon(), (e) => e.code === 'BAD_RESPONSE');
  assert.equal(data.getCachedRef(), null);
  assert.equal(data.getCachedSalon(), null);
});

await test('salon kuyruğu: salon kaydı saveSalon ile gider; salon bağlı değilse bekler; geçmiş türe göre', async () => {
  cfg();
  const sp = { tarih: '2026-10-01', hareketler: [{ hareket: 'Row', set: 3, tekrar: 10, agirlik: 20 }] };
  data.addHistory({ id: 'h1', tarih: '2026-10-01', tur: 'salon', status: 'queued', hareketler: [] });
  data.addHistory({ id: 'h2', tarih: '2026-10-01', status: 'sent', setler: [] });
  assert.equal(data.getHistory().length, 2, 'aynı gün yüzme ve salon ayrı kayıt');
  data.enqueue(sp, null, 'salon');
  handler = () => ({ json: { ok: true, data: { yazilan: 1 } } });
  let r = await data.flushQueue();
  assert.equal(r.remaining, 1, 'salon bağlı değil (idmanRef yok): bekler');
  assert.equal(calls.length, 0);
  data.setConfig({ apiUrl: REF, token: 'r' }, 'ref');
  r = await data.flushQueue();
  assert.deepEqual(calls, ['saveSalon']);
  assert.equal(r.sent[0].tur, 'salon');
  const h = data.getHistory();
  assert.equal(h.find((x) => x.tur === 'salon').status, 'sent');
  assert.equal(h.find((x) => x.tur !== 'salon').status, 'sent');
});

await test('salon seansı: kaydet/oku/sil, bozuk biçim yok sayılır', () => {
  assert.equal(data.loadSalonSession(), null);
  data.saveSalonSession({ tarih: '2026-10-01', hareketler: [] });
  assert.equal(data.loadSalonSession().tarih, '2026-10-01');
  LS.setItem('ysk.salonSession', JSON.stringify({ tarih: 5 }));
  assert.equal(data.loadSalonSession(), null);
  data.clearSalonSession();
  assert.equal(data.loadSalonSession(), null);
});

await test('zaman aşımı TIMEOUT olarak döner', async () => {
  cfg();
  const realSet = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => realSet(fn, 0); // 30 sn'yi bekleme
  handler = (b, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
  await assert.rejects(data.fetchPlan('x'), (e) => e.code === 'TIMEOUT' && e.transient);
  globalThis.setTimeout = realSet;
});

await test('sürüm 12: kayıtlı salon planı (bozuk/boş yok sayılır), addCss sporRef adresine gider', async () => {
  assert.equal(data.loadSalonPlan(), null);
  LS.setItem('ysk.salonPlan', '{bozuk');
  assert.equal(data.loadSalonPlan(), null);
  data.saveSalonPlan({ kaydedildi: 1, oncelik: {}, hareketler: [] });
  assert.equal(data.loadSalonPlan(), null, 'boş plan yok sayılır');
  const p = { kaydedildi: 5, oncelik: { Omuz: 2 }, hareketler: [{ ad: 'X', set: 3, tekrar: 10 }] };
  data.saveSalonPlan(p);
  assert.deepEqual(data.loadSalonPlan(), p);
  data.clearSalonPlan();
  assert.equal(data.loadSalonPlan(), null);
  const REF = 'https://script.google.com/macros/s/REF/exec';
  data.setConfig({ apiUrl: REF, token: 'r' }, 'ref');
  handler = (b) => ({ json: { ok: true, data: { satir: 9, css: b.css } } });
  assert.deepEqual(await data.addCss({ tarih: '2026-10-06', css: 116 }), { satir: 9, css: 116 });
  assert.deepEqual(calls, ['addCss']);
  assert.equal(urls[0], `${REF}|r`);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`data.js testleri: TAMAM (${n} senaryo)`);
