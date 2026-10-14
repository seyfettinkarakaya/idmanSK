/**
 * @OnlyCurrentDoc
 *
 * idmanSK — idmanKutuphane arka ucu (sabit kara idmanı bilgisi; yalnızca okuma)
 *
 * idmanKutuphane tablosuna bağlı (container-bound) betik olarak kurulur ve web
 * uygulaması olarak yayınlanır (erişim: herkes, çalıştıran: ben). Yalnızca
 * bağlı olduğu tabloya erişir ve hiçbir şey yazmaz.
 *
 * Uç nokta (POST, gövde JSON): getKutuphane → { katalog, etki }
 *   katalog: karaHareket sayfası (Exercise, Goal Tag, Equipment, BW Coefficient, Swim Transfer Coefficient,
 *            isteğe bağlı Video / Kısıt / Alternatif / Görsel)
 *   etki   : karaEtki sayfası (Exercise — A1 boşsa A sütunu —, Muscle Group, Muscle, Kinetic Chain, Yük Etki Oranı)
 *   karaKas sayfası (kas / zincir listesi) şimdilik okunmaz.
 */

var TOKEN_PROPERTY = 'TOKEN';
// Sayfa adları: ilk ad güncel, sonrakiler eski adlar.
var SHEET_HAREKET = ['karaHareket', 'salonHar', 'H'];
var SHEET_ETKI = ['karaEtki', 'salonHKEtki', 'hkEtki'];

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply_(fail_('BAD_REQUEST', 'İstek gövdesi geçerli JSON değil.'));
  }
  return reply_(handle_(req || {}));
}

function doGet() {
  return reply_({ ok: true, data: { uygulama: 'idmanSK idmanKutuphane', surum: 1 } });
}

function handle_(req) {
  if (!checkToken_(req.token)) return fail_('AUTH', 'Geçersiz anahtar (token).');
  try {
    switch (req.action) {
      case 'getKutuphane':
        return ok_(getKutuphane_());
      default:
        return fail_('UNKNOWN_ACTION', 'Bilinmeyen işlem.');
    }
  } catch (err) {
    return errorReply_(err);
  }
}

function errorReply_(err) {
  if (err && err.appCode) return fail_(err.appCode, err.message);
  var ref = Utilities.getUuid().slice(0, 8);
  console.error('SERVER ' + ref + ': ' + ((err && err.stack) || err));
  return fail_('SERVER', 'Sunucuda beklenmeyen bir hata oldu (başvuru: ' + ref + ').');
}

// ---------------------------------------------------------------------------
// Kurulum yardımcıları (Apps Script düzenleyicisinden elle çalıştırılır)
// ---------------------------------------------------------------------------

/**
 * Rastgele bir token üretir, Script Properties'e yazar ve günlüğe basar.
 * Anahtarı yenilemek için de kullanılır: eski anahtar o anda geçersiz olur.
 */
function tokenUret() {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROPERTY, token);
  Logger.log('Yeni token: ' + token);
  return token;
}

/** Kayıtlı token'ı günlüğe basar. */
function tokenGoster() {
  Logger.log('Token: ' + PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY));
}

// ---------------------------------------------------------------------------
// getKutuphane
// ---------------------------------------------------------------------------

function getKutuphane_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return { katalog: readKatalog_(ss), etki: readEtki_(ss) };
}

/** İlk bulunan sayfanın adı ya da null. */
function sheetName_(ss, names) {
  for (var i = 0; i < names.length; i++) if (ss.getSheetByName(names[i])) return names[i];
  return null;
}

function readKatalog_(ss) {
  var name = sheetName_(ss, SHEET_HAREKET);
  if (!name) return [];
  var t = readSheet_(ss, name);
  var cE = col_(t, 'Exercise', false);
  if (cE < 0) cE = 0; // başlık boşsa A sütunu
  var cG = col_(t, 'Goal Tag', false), cQ = col_(t, 'Equipment', false);
  var cB = col_(t, 'BW Coefficient', false), cV = col_(t, 'Video', false);
  var cK = col_(t, 'Kısıt', false), cA = col_(t, 'Alternatif', false), cGo = col_(t, 'Görsel', false);
  // "Swim Transfer Coefficient" (başlık kısaltılmış olabilir) — ilk eşleşen sütun.
  var cS = -1;
  t.headers.forEach(function (h, i) { if (cS < 0 && normalize_(h).indexOf('swim transfer') === 0) cS = i; });
  return t.values.filter(function (r) { return text_(r, cE); }).map(function (r) {
    var video = text_(r, cV);
    var k = {
      ad: text_(r, cE), amac: text_(r, cG), ekipman: text_(r, cQ),
      bw: toNumber_(cell_(r, cB)), stc: toNumber_(cell_(r, cS)),
      video: /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(video) ? video : ''
    };
    if (text_(r, cK)) k.kisit = text_(r, cK);
    if (text_(r, cA)) k.alternatif = text_(r, cA);
    if (text_(r, cGo)) k.gorsel = text_(r, cGo);
    return k;
  });
}

function readEtki_(ss) {
  var name = sheetName_(ss, SHEET_ETKI);
  if (!name) return [];
  var t = readSheet_(ss, name);
  var cE = col_(t, 'Exercise', false);
  if (cE < 0) cE = 0; // karaEtki: A1 boş olabilir → A sütunu hareket adı
  var cG = col_(t, 'Muscle Group', true), cM = col_(t, 'Muscle', false);
  var cK = col_(t, 'Kinetic Chain', false), cO = col_(t, 'Yük Etki Oranı', true);
  return t.values.filter(function (r) { return text_(r, cE) && toNumber_(r[cO]) !== null; }).map(function (r) {
    return { ad: text_(r, cE), grup: text_(r, cG), kas: text_(r, cM), zincir: text_(r, cK), oran: toNumber_(r[cO]) };
  });
}

// ---------------------------------------------------------------------------
// Yardımcılar (idmanRef.gs ile aynı)
// ---------------------------------------------------------------------------

function readSheet_(ss, name, opts) {
  opts = opts || {};
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw appError_('NO_SHEET', '"' + name + '" sayfası bulunamadı.');
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var t = { sheet: sheet, name: name, headers: headers, map: headerMap_(headers), values: [], display: [], formats: [] };
  if (lastRow > 1 && lastCol) {
    var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
    t.values = range.getValues();
    if (opts.display) t.display = range.getDisplayValues();
    if (opts.formats) t.formats = range.getNumberFormats();
  }
  return t;
}

function headerMap_(headers) {
  var map = {};
  headers.forEach(function (h, i) {
    var k = normalize_(h);
    if (k && !(k in map)) map[k] = i;
  });
  return map;
}

function col_(t, header, required) {
  var k = normalize_(header);
  if (k in t.map) return t.map[k];
  if (required) throw appError_('MISSING_COLUMN', '"' + t.name + '" sayfasında "' + header + '" sütunu yok.');
  return -1;
}

function cell_(row, c) {
  return c < 0 ? '' : row[c];
}

function text_(row, c) {
  return String(cell_(row, c) == null ? '' : cell_(row, c)).trim();
}

function normalize_(s) {
  return String(s == null ? '' : s)
    .trim()
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/\s+/g, ' ');
}

function toNumber_(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return null;
  var s = String(v).trim().replace(',', '.');
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

function appError_(code, message) {
  var e = new Error(message);
  e.appCode = code;
  return e;
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(code, message) {
  return { ok: false, error: code, message: message || '' };
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
