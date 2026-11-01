/**
 * @OnlyCurrentDoc
 *
 * idmanSK — idman Analitik arka ucu (rapor ve performans takibi; yalnızca okuma)
 *
 * "idman Analitik" tablosuna bağlı (container-bound) betik olarak kurulur ve web
 * uygulaması olarak yayınlanır (erişim: herkes, çalıştıran: ben). Yalnızca bağlı
 * olduğu tabloya erişir ve hiçbir şey yazmaz. Hesapları tablodaki formüller yapar;
 * betik görünen değerleri aynen okur (metin olarak), uygulama yalnızca gösterir.
 *
 * Uç nokta (POST, gövde JSON): getAnalitik →
 *   { hedefler, durum, kn, kesintisiz, kv, test, kara, derece: { etiketler, css }, sezon, model, bolge, bilgi, alindi }
 * Her biri satır dizisidir (nesne: alan → görünen metin). Sayfa ya da sütun yoksa o alan boş kalır
 * (sayfa adları ve başlıklar büyük/küçük harf, boşluk ve Türkçe karakter farkından etkilenmez).
 * veri ve arsiv sayfaları (ham veriler) okunmaz.
 */

var TOKEN_PROPERTY = 'TOKEN';
var SON_SATIR = 80; // sayfa başına en çok bu kadar son satır (tarih sırası artan sayfalarda en yeniler)

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
  return reply_({ ok: true, data: { uygulama: 'idmanSK idmanAnalitik', surum: 1 } });
}

function handle_(req) {
  if (!checkToken_(req.token)) return fail_('AUTH', 'Geçersiz anahtar (token).');
  try {
    switch (req.action) {
      case 'getAnalitik':
        return ok_(getAnalitik_());
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
// getAnalitik
// ---------------------------------------------------------------------------

// Sayfa şemaları: [alan, başlık, kaçıncı sütun (varsayılan 1: aynı başlık yan yana tablolarda tekrarlanırsa)]
var TABLOLAR = {
  hedefler: { sayfa: ['Hedefler'], alanlar: [['hedef', 'Hedef'], ['esik', 'Eşik'], ['guncel', 'Güncel'], ['durum', 'Durum'], ['aciklama', 'Açıklama']] },
  durum: { sayfa: ['durum'], alanlar: [['hafta', 'Hafta'], ['baslangic', 'Başlangıç'], ['tip', 'Tip'], ['yuzme', 'Yüzme seans'], ['ara', 'En uzun ara (gün)'], ['kara', 'Kara seans'], ['ev', 'Ev seansı'], ['esikhiz', 'Eşik+Hız %'], ['msi', 'MSI max'], ['km', 'km'], ['fren', 'Fren']] },
  kn: { sayfa: ['KN'], alanlar: [['tarih', 'Tarih'], ['ara', 'Ara (gün)'],
    ['k1sure', 'KN-1 süre'], ['k1max', 'KN-1 max nabız'], ['k1ort', 'KN-1 ort nabız'], ['k1dmax', 'KN-1 Δ max'], ['k1dort', 'KN-1 Δ ort'], ['k1kulac', 'KN-1 kulaç'],
    ['k2sure', 'KN-2 süre'], ['k2max', 'KN-2 max nabız'], ['k2ort', 'KN-2 ort nabız'], ['k2dmax', 'KN-2 Δ max'], ['k2dort', 'KN-2 Δ ort'], ['k2kulac', 'KN-2 kulaç'],
    ['k3sure', 'KN-3 süre'], ['k3max', 'KN-3 max nabız'], ['k3ort', 'KN-3 ort nabız'], ['k3dmax', 'KN-3 Δ max'], ['k3dort', 'KN-3 Δ ort'], ['k3kulac', 'KN-3 kulaç'],
    ['rpe', 'Seans RPE'], ['msi', 'Seans MSI']] },
  kesintisiz: { sayfa: ['Kesintisiz'], alanlar: [['tarih', 'Tarih'], ['ara', 'Ara (gün)'], ['mesafe', 'Mesafe'], ['sure', 'Süre'], ['tempo', 'Gerçek tempo'], ['hedef', 'Hedef tempo'], ['fark', 'Fark (sn/100)'], ['max', 'Max nabız'], ['ort', 'Ort nabız'], ['kulac', 'Kulaç'], ['rpe', 'Seans RPE'], ['msi', 'Seans MSI'], ['not', 'Not']] },
  kv: { sayfa: ['KV'], alanlar: [['tarih', 'Tarih'], ['ara', 'Ara (gün)'], ['set', 'Set'], ['hedef', 'Hedef tempo'], ['tempo', 'Gerçek tempo'], ['fark', 'Fark (sn/100)'], ['kulac', 'Kulaç'], ['max', 'Max nabız'], ['ort', 'Ort nabız'], ['swolf', 'SWOLF'], ['dswolf', 'Δ SWOLF'], ['rpe', 'Seans RPE'], ['msi', 'Seans MSI'], ['not', 'Not']] },
  test: { sayfa: ['Test'], alanlar: [['tarih', 'Tarih'], ['etiket', 'Etiket'], ['mesafe', 'Mesafe'], ['sure', 'Süre'], ['tempo', 'Tempo'], ['max', 'Max nabız'], ['ort', 'Ort nabız'], ['kulac', 'Kulaç'], ['dsure', 'Δ süre (sn, önceki teste göre)'], ['css', 'CSS (sn/100)'], ['dcss', 'Δ CSS'], ['msi', 'Seans MSI'], ['not', 'Not']] },
  kara: { sayfa: ['Kara'], alanlar: [['tarih', 'Tarih'], ['yer', 'Yer'], ['sure', 'Süre'], ['rpe', 'Seans RPE'], ['msi', 'Seans MSI'], ['setler', 'Barfiks setleri'], ['ort', 'Barfiks ort'], ['dort', 'Δ ort (ilk)'], ['toplam', 'Barfiks toplam'], ['brpe', 'Barfiks RPE'], ['test', 'Test']] },
  etiketler: { sayfa: ['derece'], alanlar: [['etiket', 'Etiket', 2], ['alet', 'Alet', 2], ['sayi', 'Sayı'], ['eniyi', 'En iyi'], ['eniyitarih', 'En iyi tarih'], ['son', 'Son'], ['sontarih', 'Son tarih'], ['ilk', 'İlk'], ['ilktarih', 'İlk tarih']] },
  css: { sayfa: ['derece'], alanlar: [['tarih', 'Tarih', 2], ['yontem', 'Yöntem'], ['girdi', 'Girdi'], ['css', 'CSS /100'], ['not', 'Not']] },
  sezon: { sayfa: ['sezon'], alanlar: [['sezon', 'Sezon'], ['seans', 'Seans'], ['km', 'Km'], ['ilk', 'İlk'], ['son', 'Son'], ['hafta', 'Hafta'], ['seanshafta', 'Seans/hafta'], ['ortm', 'Ort. seans m'], ['ara14', '14+ gün ara'], ['ms', 'MS payı']] },
  model: { sayfa: ['model'], alanlar: [['donem', 'Dönem'], ['baslangic', 'Başlangıç'], ['bitis', 'Bitiş'], ['hafta', 'Hafta'], ['seans', 'Seans'], ['seanshafta', 'Seans/hafta'], ['kmhafta', 'Km/hafta'], ['ortm', 'Ort. seans m'], ['ms', 'MS payı'], ['ara14', '14+ gün ara']] },
  bolge: { sayfa: ['bolge'], alanlar: [['sezon', 'Sezon'], ['ms', 'MS km'], ['bolgeli', 'Bölgeli %'], ['kolay', 'Kolay %'], ['orta', 'Orta %'], ['esik', 'Eşik %'], ['hiz', 'Hız %'], ['tec', 'TEC %'], ['aletli', 'Aletli %'], ['esikhiz', 'Eşik+Hız %']] },
  bilgi: { sayfa: ['bilgi'], alanlar: [['tanim', 'Tanım'], ['deger', 'Değer'], ['aciklama', 'Açıklama']] }
};

function getAnalitik_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = {};
  Object.keys(TABLOLAR).forEach(function (k) { out[k] = readTablo_(ss, TABLOLAR[k]); });
  return {
    hedefler: out.hedefler, durum: out.durum, kn: out.kn, kesintisiz: out.kesintisiz, kv: out.kv, test: out.test, kara: out.kara,
    derece: { etiketler: out.etiketler, css: out.css },
    sezon: out.sezon, model: out.model, bolge: out.bolge, bilgi: out.bilgi,
    alindi: Date.now()
  };
}

/** Şemaya göre görünen değerleri okur; boş ve "Henüz kayıt yok" satırları atılır; en yeni SON_SATIR satır. */
function readTablo_(ss, spec) {
  var sheet = null;
  for (var i = 0; i < spec.sayfa.length && !sheet; i++) sheet = sheetByName_(ss, spec.sayfa[i]);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || !lastCol) return [];
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var disp = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var cols = spec.alanlar.map(function (a) { return colN_(headers, a[1], a[2] || 1); });
  var rows = [];
  disp.forEach(function (row) {
    var o = {};
    var dolu = false;
    spec.alanlar.forEach(function (a, j) {
      var v = cols[j] >= 0 ? String(row[cols[j]] == null ? '' : row[cols[j]]).trim() : '';
      if (/^henüz kayıt yok$/i.test(v)) v = '';
      if (v !== '') dolu = true;
      o[a[0]] = v;
    });
    if (dolu) rows.push(o);
  });
  return rows.length > SON_SATIR ? rows.slice(rows.length - SON_SATIR) : rows;
}

/** Başlığa göre n'inci sütun (aynı başlık yan yana tablolarda tekrarlanabilir); yoksa -1. */
function colN_(headers, header, n) {
  var k = normalize_(header);
  var say = 0;
  for (var i = 0; i < headers.length; i++) {
    if (normalize_(headers[i]) === k && ++say === n) return i;
  }
  return -1;
}

/** Sayfa adı büyük/küçük harf ve Türkçe karakter farkına bakmadan bulunur. */
function sheetByName_(ss, name) {
  var s = ss.getSheetByName(name);
  if (s) return s;
  var k = normalize_(name);
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) if (normalize_(all[i].getName()) === k) return all[i];
  return null;
}

// ---------------------------------------------------------------------------
// Yardımcılar (idmanRef.gs / idmanKutuphane.gs ile aynı)
// ---------------------------------------------------------------------------

function normalize_(s) {
  return String(s == null ? '' : s)
    .trim()
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/\s+/g, ' ');
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(code, message) {
  return { ok: false, error: code, message: message };
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
