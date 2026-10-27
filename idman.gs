/**
 * @OnlyCurrentDoc
 *
 * idmanSK — "idman" dosyasının arka ucu (yüzme + salon girişleri). Eski Code.gs + Salon.gs birleşimi.
 * Sayfalar: yuzmePlan, yuzmeVeri, yuzmeSeans (yüzme); karaPlan, karaVeri, karaSeans (kara/salon). Eski adlar da tanınır.
 * Referanslar (bölgeler, CSS, hareket kataloğu, kas etkileri, vücut ağırlığı) ayrı "idmanRef" dosyasında, idmanRef.gs.
 *
 * @OnlyCurrentDoc: betik yalnızca bağlı olduğu tabloya erişebilir; Drive'daki
 * diğer dosyalara erişim izni istenmez.
 *
 * idman tablosuna bağlı (container-bound) script olarak kurulur ve
 * web uygulaması olarak yayınlanır (erişim: herkes, çalıştıran: ben).
 *
 * Sütunlar her zaman 1. satırdaki BAŞLIK ADINA göre bulunur; sütun harfi
 * veya sırası hiçbir yerde varsayılmaz. Başlık karşılaştırması büyük/küçük
 * harf, baştaki/sondaki boşluk ve Türkçe karakter farklarına duyarsızdır
 * ("Sıra" = "sira" = " SIRA ").
 *
 * Uç noktalar (hepsi POST, gövde JSON):
 *   getDates, getPlan, finishSession (yüzme); getSalon, saveSalon, savePlan, planYapildi (salon)
 */

// idman dosyası (yüzme + kara girişleri). Sayfa adları: ilk ad güncel, sonrakiler eski adlar (geçişte bozulmasın).
var SHEET_PLAN = ['yuzmePlan', 'havuzPlan'];        // yüzme programı
var SHEET_ESKI = ['yuzmeVeri', 'havuzVeri'];        // yapılan yüzme setleri
var SHEET_SEANS = ['yuzmeSeans', 'havuzSeans'];     // yüzme seans özeti (isteğe bağlı)
var SHEET_IDMAN = ['karaVeri', 'salonVeri'];        // yapılan kara (salon) hareketleri
var SHEET_SALON_PLAN = ['karaPlan', 'salonPlan'];   // kara (salon) programı
var SHEET_KARA_SEANS = ['karaSeans', 'salonSeans']; // kara idmanı seans özeti (isteğe bağlı, 13.4)
var LOCK_WAIT_MS = 30000;
var TOKEN_PROPERTY = 'TOKEN';

// Plan / eski sütun başlıkları.
var COL = {
  tarih: 'Tarih',
  sira: 'Sıra',
  blok: 'Blok',
  tekrar: 'Tekrar',
  mesafe: 'Mesafe',
  stil: 'Stil',
  tur: 'Tür',
  aciklama: 'Açıklama',
  hedef: 'Hedef',
  dinlen: 'Dinlen',
  alet: 'Alet',
  gercek: 'Gerçek',
  kulac: 'Kulaç',
  nabiz: 'Nabız',
  rpe: 'RPE',
  msi: 'MSI',
  not: 'Not',
  etiket: 'Etiket' // 13.8: isteğe bağlı; plandan gelir, idmanda değişebilir, yuzmeVeri'ye yazılır
};

// seans sütun başlıkları.
var SEANS_COL = {
  tarih: 'Tarih',
  sure: 'Süre',
  mesafe: 'Mesafe',
  havuz: 'Havuz',
  rpe: 'RPE',
  msi: 'MSI',
  aciklama: 'Açıklama'
};

// Uygulamadan gelen, set başına sonuç alanları ve türleri.
var SET_RESULT_FIELDS = {
  gercek: 'olcum',   // ölçülen süre: [h]:mm:ss.0 (ondalık korunur)
  kulac: 'number',
  nabiz: 'number',
  rpe: 'number',
  msi: 'text',
  not: 'text'
};

// İdmanda değiştirilen ya da eklenen setlerin plan alanları ve türleri.
var PLAN_EDIT_FIELDS = {
  blok: 'text',
  tekrar: 'number',
  mesafe: 'number',
  stil: 'text',
  tur: 'text',
  aciklama: 'text',
  hedef: 'duration',
  dinlen: 'duration',
  alet: 'text',
  etiket: 'text' // 13.8
};

// eski sayfasında boş bırakılan sütunlar: tablo bunları kendi formülleriyle doldurur.
var ESKI_BLANK = ['Sıra', 'Set Mesafe', 'Set Süre'];

// ---------------------------------------------------------------------------
// Giriş noktaları
// ---------------------------------------------------------------------------

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
  return reply_({ ok: true, data: { uygulama: 'idmanSK idman', surum: 2 } });
}

function handle_(req) {
  if (!checkToken_(req.token)) return fail_('AUTH', 'Geçersiz anahtar (token).');
  try {
    switch (req.action) {
      case 'getDates':
        return ok_(getDates_());
      case 'getPlan':
        return ok_(getPlan_(req));
      case 'finishSession':
        return withLock_(function () { return ok_(finishSession_(req)); });
      case 'getSalon':
        return ok_(getSalon_());
      case 'saveSalon':
        return withLock_(function () { return ok_(saveSalon_(req)); });
      case 'savePlan':
        return withLock_(function () { return ok_(savePlan_(req)); });
      case 'planYapildi':
        return withLock_(function () { return ok_(planYapildi_(req)); });
      default:
        return fail_('UNKNOWN_ACTION', 'Bilinmeyen işlem.');
    }
  } catch (err) {
    return errorReply_(err);
  }
}

/**
 * Bilinen hatalar (appCode) kodu ve mesajıyla döner. Beklenmeyen hataların
 * ayrıntısı istemciye gönderilmez; yalnızca Apps Script günlüğüne (Yürütmeler)
 * kısa bir başvuru numarasıyla yazılır.
 */
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
// getDates
// ---------------------------------------------------------------------------

/**
 * Planlı günlerin listesi. Her gün için:
 *   setler: gün kartı önizlemesi (blok, toplam mesafe, hedef süre sn)
 *   detay : getPlan ile aynı biçimde tüm setler — uygulama programı ayrı bir
 *           istek beklemeden açabilsin diye.
 */
function getDates_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var plan = readSheet_(ss, SHEET_PLAN, { display: true });
  var c = planColumns_(plan, false);

  var byDate = {};
  plan.values.forEach(function (row, i) {
    var key = dateKey_(row[c.tarih], tz);
    if (!key) return;
    var g = byDate[key] || (byDate[key] = { tarih: key, setSayisi: 0, toplamMesafe: 0, hedefSure: 0, setler: [], detay: [] });
    var disp = plan.display[i];
    var tekrar = toNumber_(cell_(row, c.tekrar)) || 1;
    var mesafe = setDistance_(row, c.tekrar, c.mesafe);
    var sure = tekrar * ((parseDuration_(durationText_(cell_(disp, c.hedef))) || 0) +
      (parseDuration_(durationText_(cell_(disp, c.dinlen))) || 0));
    g.setSayisi++;
    g.toplamMesafe += mesafe;
    g.hedefSure += sure;
    g.setler.push({ sira: toNumber_(cell_(row, c.sira)), _satir: i, blok: text_(disp, c.blok), mesafe: mesafe, sure: sure });
    g.detay.push(planSet_(plan, c, i));
  });

  return Object.keys(byDate).sort().map(function (k) {
    var g = byDate[k];
    g.setler.sort(bySira_);
    g.setler.forEach(function (s) { delete s._satir; delete s.sira; });
    g.detay.sort(bySira_);
    g.detay.forEach(function (s) { delete s._satir; });
    g.hedefSure = Math.round(g.hedefSure);
    return g;
  });
}

function planColumns_(plan, siraRequired) {
  return {
    tarih: col_(plan, COL.tarih, true),
    sira: col_(plan, COL.sira, siraRequired),
    blok: col_(plan, COL.blok, false),
    tekrar: col_(plan, COL.tekrar, false),
    mesafe: col_(plan, COL.mesafe, false),
    stil: col_(plan, COL.stil, false),
    tur: col_(plan, COL.tur, false),
    aciklama: col_(plan, COL.aciklama, false),
    hedef: col_(plan, COL.hedef, false),
    dinlen: col_(plan, COL.dinlen, false),
    alet: col_(plan, COL.alet, false),
    etiket: col_(plan, COL.etiket, false)
  };
}

/** Bir Plan satırı → uygulamadaki set nesnesi (_satir sıralama içindir). */
function planSet_(plan, c, i) {
  var row = plan.values[i];
  var disp = plan.display[i];
  var set = {
    _satir: i,
    sira: toNumber_(cell_(row, c.sira)),
    blok: text_(disp, c.blok),
    tekrar: toNumber_(cell_(row, c.tekrar)) || 1,
    mesafe: toNumber_(cell_(row, c.mesafe)) || 0,
    stil: text_(disp, c.stil),
    tur: text_(disp, c.tur),
    aciklama: text_(disp, c.aciklama),
    hedef: durationText_(cell_(disp, c.hedef)),
    dinlen: durationText_(cell_(disp, c.dinlen)),
    alet: text_(disp, c.alet)
  };
  if (c.etiket >= 0) set.etiket = text_(disp, c.etiket); // sütun yoksa alan da yok (eski tablolar aynı)
  return set;
}

// ---------------------------------------------------------------------------
// getPlan
// ---------------------------------------------------------------------------

function getPlan_(req) {
  var tarih = requireDate_(req.tarih);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var plan = readSheet_(ss, SHEET_PLAN, { display: true });
  var c = planColumns_(plan, true);

  var setler = [];
  plan.values.forEach(function (row, i) {
    if (dateKey_(row[c.tarih], tz) !== tarih) return;
    setler.push(planSet_(plan, c, i));
  });

  setler.sort(bySira_);
  setler.forEach(function (s) { delete s._satir; });
  return { tarih: tarih, setler: setler };
}

// ---------------------------------------------------------------------------
// finishSession
//
// Sıra: 1) yinelenme kontrolü  2) yuzmeVeri'ye yaz  3) doğrula  4) yuzmeSeans'a yaz
//       5) ancak hepsi başarılıysa günün yuzmePlan satırlarını sil (arşiv yok).
// 2–4 arasında bir hata olursa bu çağrının eklediği satırlar geri alınır,
// yuzmePlan'a dokunulmaz. Böylece ya hepsi kalıcı olur ya hiçbiri.
// 13.9: ikinci: true → aynı günün ikinci idmanı (kullanıcı onayıyla); yinelenme
//       yuzmeSeans'ta aynı başlangıç saatiyle aranır. baslangic (ms) → yuzmeSeans
//       Tarih hücresi saatli yazılır. birak: [Sıra] → bu satırlar planda kalır
//       (yarıda kesilen idmanın kalan setleri).
// ---------------------------------------------------------------------------

function finishSession_(req) {
  var tarih = requireDate_(req.tarih);
  var seansIn = req.seans;
  var setlerIn = req.setler;
  if (!seansIn || typeof seansIn !== 'object') throw appError_('BAD_REQUEST', '"seans" alanı eksik.');
  if (!Array.isArray(setlerIn)) throw appError_('BAD_REQUEST', '"setler" alanı eksik.');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var plan = readSheet_(ss, SHEET_PLAN, { formats: true });
  var eski = readSheet_(ss, SHEET_ESKI);
  var seans = sheetOf_(ss, SHEET_SEANS) ? readSheet_(ss, SHEET_SEANS) : null; // yuzmeSeans isteğe bağlı
  var eskiTarihCol = col_(eski, COL.tarih, true);
  var seansTarihCol = seans ? col_(seans, SEANS_COL.tarih, true) : -1;

  var baslangic = seansStart_(req.baslangic, tarih, tz);
  var eskiOnce = rowsForDate_(eski, eskiTarihCol, tarih, tz).length;
  var seansOnce = seans ? rowsForDate_(seans, seansTarihCol, tarih, tz).length : 0;

  // 1) Yinelenme kontrolü. seans sayfası da kontrol edilir: hiç set
  //    tamamlanmadan kapatılan bir seans eski'ye satır yazmaz, ikinci
  //    gönderimi yakalamanın tek yolu budur. İkinci idmanda yalnızca aynı
  //    başlangıç saatli seans satırı yinelenme sayılır (kuyruktan yeniden gönderim).
  //    Başlangıç saati gelirse: aynı saatli seans satırı = bu idman (DUPLICATE); günün başka
  //    kaydı varsa SAME_DAY (uygulama sorar, onaylanınca ikinci: true ile yeniden gönderir).
  var ayniIdman = Boolean(seans && baslangic && seans.values.some(function (row) {
    var v = row[seansTarihCol];
    return v instanceof Date && Math.floor(v.getTime() / 60000) === Math.floor(baslangic.getTime() / 60000);
  }));
  if (ayniIdman) throw appError_('DUPLICATE', tarih + ' tarihli bu idman zaten kaydedilmiş.');
  if (req.ikinci !== true && (eskiOnce || seansOnce)) {
    if (baslangic) throw appError_('SAME_DAY', tarih + ' için tabloda başka bir idman kayıtlı.');
    throw appError_('DUPLICATE', tarih + ' tarihli seans zaten kaydedilmiş.');
  }

  var planTarihCol = col_(plan, COL.tarih, true);
  var planSiraCol = col_(plan, COL.sira, true);
  var planRows = rowsForDate_(plan, planTarihCol, tarih, tz);
  if (!planRows.length) throw appError_('NOT_FOUND', tarih + ' için ' + adOf_(SHEET_PLAN) + ' sayfasında satır yok.');

  // Tamamlanan setleri Plan satırlarıyla eşleştir.
  var planBySira = {};
  planRows.forEach(function (i) {
    var key = siraKey_(plan.values[i][planSiraCol]);
    if (!(key in planBySira)) planBySira[key] = i;
  });

  // Uygulamadaki sıra korunur: özgün setler Sıra'ya göre, idmanda eklenen setler
  // (eklendi: true, Sıra yok) uygulamada arkasına eklendikleri setin hemen arkasına.
  var seen = {};
  var done = [];
  var anchor = { sira: -Infinity, row: -1 };
  var sub = 0;
  setlerIn.forEach(function (s) {
    if (!s) return;
    if (s.eklendi === true) {
      sub += 1;
      if (s.tamamlandi === true) done.push({ row: null, sonuc: s, key: anchor, sub: sub });
      return;
    }
    var key = siraKey_(s.sira);
    var row = key in planBySira ? planBySira[key] : null;
    if (row !== null) {
      anchor = { sira: toNumber_(plan.values[row][planSiraCol]), row: row };
      sub = 0;
    }
    if (s.tamamlandi !== true) return;
    if (seen[key]) return;
    seen[key] = true;
    if (row === null) {
      throw appError_('PLAN_MISMATCH', 'Sıra ' + s.sira + ' bu tarihin planında bulunamadı.');
    }
    done.push({ row: row, sonuc: s, key: anchor, sub: 0 });
  });

  done.sort(function (a, b) {
    var c = bySira_({ sira: a.key.sira, _satir: a.key.row }, { sira: b.key.sira, _satir: b.key.row });
    return c || a.sub - b.sub;
  });

  var eskiWritten = null;
  var seansWritten = null;
  try {
    // 2) eski sayfasına yaz.
    if (done.length) {
      var eskiRows = done.map(function (d) { return buildEskiRow_(plan, eski, d.row, d.sonuc, tarih, tz); });
      eskiWritten = writeRows_(eski, eskiRows, true); // en yeni seans en üstte
    }

    // 3) Doğrula.
    SpreadsheetApp.flush();
    var yazilan = countDateInColumn_(eski.sheet, eskiTarihCol, tarih, tz);
    if (yazilan !== eskiOnce + done.length) {
      throw appError_('WRITE_MISMATCH',
        adOf_(SHEET_ESKI) + ' sayfasına ' + done.length + ' satır beklenirken ' + (yazilan - eskiOnce) + ' satır bulundu.');
    }

    // 4) seans sayfasına tek satır (sayfa varsa).
    if (seans) {
      seansWritten = writeRows_(seans, [buildSeansRow_(seans, tarih, seansIn, tz, baslangic)], true); // en yeni üstte
      SpreadsheetApp.flush();
      if (countDateInColumn_(seans.sheet, seansTarihCol, tarih, tz) !== seansOnce + 1) {
        throw appError_('WRITE_MISMATCH', adOf_(SHEET_SEANS) + ' satırı doğrulanamadı.');
      }
    }
  } catch (err) {
    rollback_(seansWritten, seansTarihCol, tarih, tz);
    rollback_(eskiWritten, eskiTarihCol, tarih, tz);
    SpreadsheetApp.flush();
    throw err;
  }

  // 5) Günün plan satırlarını sil (arşiv yok: yapılan setler yuzmeVeri'de). Satır numaraları, arada tablo
  //    elle düzenlenmiş olabileceği için taze okumayla yeniden hesaplanır. birak'taki Sıralar planda kalır.
  var birak = null;
  if (Array.isArray(req.birak) && req.birak.length) {
    birak = {};
    req.birak.forEach(function (x) { birak[siraKey_(x)] = true; });
  }
  var silinen = 0;
  var uyari = '';
  try {
    silinen = deleteDateRows_(plan.sheet, planTarihCol, tarih, tz, birak ? { col: planSiraCol, keep: birak } : null);
  } catch (err) {
    console.error('plan sil: ' + ((err && err.stack) || err));
    uyari = 'Seans kaydedildi ancak plan satırları silinemedi.';
  }

  var data = { yazilanSet: done.length, silinenSet: silinen };
  if (birak) data.kalanSet = planRows.length - silinen;
  if (uyari) data.uyari = uyari;
  return data;
}


/**
 * eski satırı. planRow null ise idmanda eklenen set: plan alanları sonuc.plan'dan gelir.
 * sonuc.plan, özgün sette idmanda değişen alanları taşır (Not'a fark ayrıca yazılır).
 * Sıra, Set Mesafe ve Set Süre boş bırakılır.
 */
function buildEskiRow_(plan, eski, planRow, sonuc, tarih, tz) {
  var src = planRow === null ? null : plan.values[planRow];
  var srcFmt = planRow === null ? null : plan.formats[planRow];
  var over = sonuc.plan && typeof sonuc.plan === 'object' ? sonuc.plan : {};
  var editByKey = {};
  Object.keys(PLAN_EDIT_FIELDS).forEach(function (f) { editByKey[normalize_(COL[f])] = f; });
  var blank = {};
  ESKI_BLANK.forEach(function (h) { blank[normalize_(h)] = true; });
  var tarihKey = normalize_(COL.tarih);
  var values = [];
  var formats = [];
  eski.headers.forEach(function (h) {
    var key = normalize_(h);
    var f = editByKey[key];
    var conv;
    if (key && blank[key]) {
      values.push('');
      formats.push(null);
    } else if (key && Object.prototype.hasOwnProperty.call(SET_RESULT_FIELDS, key)) {
      conv = convertValue_(sonuc[key], SET_RESULT_FIELDS[key]);
      values.push(conv.value);
      formats.push(conv.format);
    } else if (f && Object.prototype.hasOwnProperty.call(over, f)) {
      conv = convertValue_(over[f], PLAN_EDIT_FIELDS[f]);
      values.push(conv.value);
      formats.push(conv.format);
    } else if (src && key && key in plan.map) {
      values.push(src[plan.map[key]]);
      formats.push(srcFmt[plan.map[key]]);
    } else if (!src && key === tarihKey) {
      values.push(Utilities.parseDate(tarih, tz, 'yyyy-MM-dd'));
      formats.push(null);
    } else {
      values.push('');
      formats.push(null);
    }
  });
  return { values: values, formats: formats };
}

/**
 * Seansın başlangıç anı (ms) → Date; yalnızca aynı güne düşüyorsa (yoksa null: Tarih saatsiz yazılır).
 */
function seansStart_(ms, tarih, tz) {
  var n = Number(ms);
  if (!isFinite(n) || n <= 0) return null;
  var d = new Date(n);
  return dateKey_(d, tz) === tarih ? d : null;
}

// 13.9: seans Tarih'i başlangıç saatiyle. 13.12: gerçek tarih-saat (timestamp), saniyeli ve açık 24 saat (HH): küçük hh bazı
// gösterimlerde 12 saat verdiği için öğleden sonraki idman gece görünüyordu (27.10: 14:24 → 02:24).
var SEANS_SAAT_FMT = 'dd.mm.yyyy HH:mm:ss';

/** Seans sayfasının Tarih hücresi: başlangıç saati varsa saatli, yoksa yalnız gün. */
function seansTarihCell_(tarih, tz, baslangic) {
  return baslangic
    ? { value: baslangic, format: SEANS_SAAT_FMT }
    : { value: Utilities.parseDate(tarih, tz, 'yyyy-MM-dd'), format: null };
}

function buildSeansRow_(seans, tarih, s, tz, baslangic) {
  var fields = {};
  fields[normalize_(SEANS_COL.tarih)] = seansTarihCell_(tarih, tz, baslangic);
  fields[normalize_(SEANS_COL.sure)] = convertValue_(s.sure, 'olcum');
  fields[normalize_(SEANS_COL.mesafe)] = convertValue_(s.mesafe, 'number');
  fields[normalize_(SEANS_COL.havuz)] = convertValue_(s.havuz == null || s.havuz === '' ? 25 : s.havuz, 'number');
  fields[normalize_(SEANS_COL.rpe)] = convertValue_(s.rpe, 'number');
  fields[normalize_(SEANS_COL.msi)] = convertValue_(s.msi, 'text');
  fields[normalize_(SEANS_COL.aciklama)] = convertValue_(s.aciklama, 'text');

  var values = [];
  var formats = [];
  seans.headers.forEach(function (h) {
    var f = fields[normalize_(h)];
    values.push(f ? f.value : '');
    formats.push(f ? f.format : null);
  });
  return { values: values, formats: formats };
}

/**
 * Uygulamadan gelen değeri hücreye yazılacak değer + sayı biçimine çevirir.
 * format null ise sütunun mevcut biçimi (bir üst satırınki) korunur.
 */
function convertValue_(v, type) {
  if (v === null || v === undefined) return { value: '', format: null };
  var s = String(v).trim();
  if (s === '') return { value: '', format: null };

  if (type === 'number') {
    var n = toNumber_(s);
    return n !== null ? { value: n, format: null } : { value: s, format: '@' };
  }
  if (type === 'duration' || type === 'olcum') {
    // Saat hanesi her zaman yazılır (Sheets "07:00"ı 7 saat sanmasın): planlanan [h]:mm:ss, ölçülen [h]:mm:ss.0
    var sec = parseDuration_(s);
    if (sec === null) return { value: s, format: '@' };
    var fmt = type === 'olcum' || sec % 1 !== 0 ? '[h]:mm:ss.0' : '[h]:mm:ss';
    return { value: sec / 86400, format: fmt, kanonik: true };
  }
  return { value: s, format: '@' };
}

// ---------------------------------------------------------------------------
// Tablo yardımcıları
// ---------------------------------------------------------------------------

/** Sayfa: ad ya da ad listesi (ilk bulunan; güncel ad önce). Yoksa null. */
function sheetOf_(ss, names) {
  var list = Array.isArray(names) ? names : [names];
  for (var i = 0; i < list.length; i++) {
    var sh = ss.getSheetByName(list[i]);
    if (sh) return sh;
  }
  return null;
}
/** Listenin güncel adı (hata mesajı ve yeni sayfa için). */
function adOf_(names) {
  return Array.isArray(names) ? names[0] : names;
}

function readSheet_(ss, names, opts) {
  opts = opts || {};
  var sheet = sheetOf_(ss, names);
  var name = adOf_(names);
  if (!sheet) throw appError_('NO_SHEET', '"' + name + '" sayfası bulunamadı.');
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var t = { sheet: sheet, name: name, headers: headers, map: headerMap_(headers), values: [], display: [], formats: [] };
  if (lastRow > 1 && lastCol) {
    var width = lastCol;
    if (opts.cols) { // yalnızca gereken başlıklara kadar oku (sağdaki formül sütunları okunmaz)
      var m = headerMap_(headers);
      width = opts.cols.reduce(function (w, h) { var k = normalize_(h); return k in m ? Math.max(w, m[k] + 1) : w; }, 1);
    }
    var range = sheet.getRange(2, 1, lastRow - 1, width);
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

function rowsForDate_(t, c, tarih, tz) {
  var out = [];
  t.values.forEach(function (row, i) {
    if (dateKey_(row[c], tz) === tarih) out.push(i);
  });
  return out;
}

function countDateInColumn_(sheet, c, tarih, tz) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var vals = sheet.getRange(2, c + 1, lastRow - 1, 1).getValues();
  var n = 0;
  vals.forEach(function (r) { if (dateKey_(r[0], tz) === tarih) n++; });
  return n;
}

/**
 * Satırları yazar. atTop: başlığın hemen altına (2. satırdan itibaren) eklenir,
 * mevcut satırlar aşağı kayar; değilse sayfanın sonuna eklenir.
 * Biçimler: kaynak biçimi > değerin kendi biçimi > komşu veri satırının biçimi.
 * Yazılan aralığı döndürür.
 */
function writeRows_(t, rows, atTop) {
  var sheet = t.sheet;
  var width = t.headers.length;
  var n = rows.length;
  var start;
  var neighborRow = null; // biçimi örnek alınacak mevcut veri satırı

  if (atTop) {
    var hadData = sheet.getLastRow() >= 2;
    start = 2;
    sheet.insertRowsBefore(2, n);
    if (hadData) {
      neighborRow = 2 + n;
      // Yeni satırlar başlığın değil, ilk veri satırının görünümünü alsın.
      sheet.getRange(neighborRow, 1, 1, width).copyFormatToRange(sheet, 1, width, start, start + n - 1);
    }
  } else {
    start = sheet.getLastRow() + 1;
    var end = start + n - 1;
    if (sheet.getMaxRows() < end) sheet.insertRowsAfter(sheet.getMaxRows(), end - sheet.getMaxRows());
    if (start > 2) neighborRow = start - 1;
  }

  try {
    writeValues_(sheet, rows, start, width, neighborRow);
  } catch (err) {
    // Üste eklenen satırlar bu çağrınındır: yazma yarıda kaldıysa boş kalmasınlar.
    if (atTop) sheet.deleteRows(start, n);
    throw err;
  }
  return { sheet: sheet, start: start, count: n, inserted: Boolean(atTop) };
}

function writeValues_(sheet, rows, start, width, neighborRow) {
  var n = rows.length;
  var range = sheet.getRange(start, 1, n, width);
  var neighborFormats = neighborRow ? sheet.getRange(neighborRow, 1, 1, width).getNumberFormats()[0] : null;
  var ownFormats = range.getNumberFormats();

  var formats = rows.map(function (r, ri) {
    return r.formats.map(function (f, i) {
      var base = neighborFormats ? neighborFormats[i] : ownFormats[ri][i];
      if (!f) return base;
      // Uygulamanın süre biçimi ([h]:mm:ss[.0]) her zaman yazılır; diğer süre biçimlerinde sütunun biçimi korunur.
      if (r.values[i] !== '' && isDurationFormat_(f) && isDurationFormat_(base) && !/^\[h\]/.test(f)) return base;
      return f;
    });
  });

  range.setNumberFormats(formats);
  range.setValues(rows.map(function (r) { return r.values; }));
  copyFormulas_(sheet, rows, start, width, neighborRow);
}

/**
 * Tablonun kendi hesapladığı sütunlar (Sıra, Set Mesafe, Set Süre, Hafta …): yeni satırlarda boş kalan bir sütunda
 * komşu (önceki en üst) veri satırında formül varsa, aynı formül göreli olarak (R1C1) yeni satırlara da yazılır.
 * Böylece betik o sütunlara değer yazmaz, tablo hesaplar ve sütunlar kaymaz.
 */
function copyFormulas_(sheet, rows, start, width, neighborRow) {
  if (!neighborRow || typeof sheet.getRange(neighborRow, 1, 1, width).getFormulasR1C1 !== 'function') return;
  var f = sheet.getRange(neighborRow, 1, 1, width).getFormulasR1C1()[0];
  for (var i = 0; i < width; i++) {
    if (!f[i]) continue;
    var bos = rows.every(function (r) { return r.values[i] === '' || r.values[i] === null || r.values[i] === undefined; });
    if (!bos) continue;
    sheet.getRange(start, i + 1, rows.length, 1).setFormulasR1C1(rows.map(function () { return [f[i]]; }));
  }
}

function isDurationFormat_(f) {
  return /s/.test(f || '') && /[hm]/.test(f) && !/[dy]/i.test(f);
}

/** Bu çağrının eklediği satırları geri alır (yalnızca tarih hâlâ eşleşiyorsa). */
function rollback_(written, tarihCol, tarih, tz) {
  if (!written) return;
  try {
    if (written.inserted) {
      // Üste eklenen blok tamamen bu çağrınındır; olduğu gibi kaldırılır.
      written.sheet.deleteRows(written.start, written.count);
      return;
    }
    var vals = written.sheet.getRange(written.start, tarihCol + 1, written.count, 1).getValues();
    for (var i = written.count - 1; i >= 0; i--) {
      if (dateKey_(vals[i][0], tz) === tarih) written.sheet.deleteRow(written.start + i);
    }
  } catch (e) {
    // Geri alma başarısızsa asıl hata yine de istemciye iletilir.
  }
}

/**
 * Plan'da bu tarihe ait tüm satırları taze okumayla bulup alttan yukarı siler.
 * birak { col, keep }: o sütundaki Sıra'sı keep'te olan satırlar kalır (13.9).
 */
function deleteDateRows_(sheet, tarihCol, tarih, tz, birak) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var vals = sheet.getRange(2, tarihCol + 1, lastRow - 1, 1).getValues();
  var siralar = birak ? sheet.getRange(2, birak.col + 1, lastRow - 1, 1).getValues() : null;
  var rows = [];
  vals.forEach(function (r, i) {
    if (dateKey_(r[0], tz) !== tarih) return;
    if (siralar && birak.keep[siraKey_(siralar[i][0])]) return;
    rows.push(i + 2);
  });

  // Ardışık satırları tek deleteRows çağrısında sil, en alttan başla.
  var deleted = 0;
  var i = rows.length - 1;
  while (i >= 0) {
    var end = rows[i];
    var start = end;
    while (i > 0 && rows[i - 1] === start - 1) { i--; start--; }
    sheet.deleteRows(start, end - start + 1);
    deleted += end - start + 1;
    i--;
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Değer yardımcıları
// ---------------------------------------------------------------------------

/** Başlık/anahtar normalleştirme: küçük harf, Türkçe karakterler sadeleşir. */
function normalize_(s) {
  return String(s == null ? '' : s)
    .trim()
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/\s+/g, ' ');
}

/** Hücre değerini YYYY-MM-DD anahtarına çevirir; tarih değilse ''. */
function dateKey_(v, tz) {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (typeof v === 'string') {
    var s = v.trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return m[1] + '-' + pad2_(m[2]) + '-' + pad2_(m[3]);
    m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
    if (m) return m[3] + '-' + pad2_(m[2]) + '-' + pad2_(m[1]);
  }
  return '';
}

function requireDate_(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw appError_('BAD_REQUEST', 'Tarih YYYY-MM-DD biçiminde olmalı.');
  }
  return v;
}

function toNumber_(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return null;
  var s = String(v).trim().replace(',', '.');
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

function siraKey_(v) {
  var n = toNumber_(v);
  return n === null ? 'x:' + String(v) : String(n);
}

function setDistance_(row, cTekrar, cMesafe) {
  var tekrar = toNumber_(cell_(row, cTekrar)) || 1;
  var mesafe = toNumber_(cell_(row, cMesafe)) || 0;
  return tekrar * mesafe;
}

function bySira_(a, b) {
  var an = a.sira === null || a.sira === undefined;
  var bn = b.sira === null || b.sira === undefined;
  if (an !== bn) return an ? 1 : -1;
  if (!an && a.sira !== b.sira) return a.sira - b.sira;
  return a._satir - b._satir;
}

/** "ss:dd:ss", "dd:ss" veya "dd:ss.d" → saniye; geçersizse null. */
function parseDuration_(s) {
  var m = String(s).trim().match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?([.,]\d+)?$/);
  if (!m) return null;
  var frac = m[4] ? Number('0.' + m[4].slice(1)) : 0;
  if (m[3] !== undefined) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + frac;
  return Number(m[1]) * 60 + Number(m[2]) + frac;
}

/** Görünen süre metnini dd:ss (veya ss:dd:ss) biçimine sadeleştirir. */
function durationText_(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  var m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?([.,]\d+)?$/);
  if (!m) return s;
  var frac = m[4] ? '.' + m[4].slice(1) : '';
  if (m[3] !== undefined) {
    if (Number(m[1]) === 0) return pad2_(m[2]) + ':' + pad2_(m[3]) + frac;
    return pad2_(m[1]) + ':' + pad2_(m[2]) + ':' + pad2_(m[3]) + frac;
  }
  return pad2_(m[1]) + ':' + pad2_(m[2]) + frac;
}

function pad2_(n) {
  n = String(n);
  return n.length < 2 ? '0' + n : n;
}

// ---------------------------------------------------------------------------
// Kimlik, kilit, cevap
// ---------------------------------------------------------------------------

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

function withLock_(fn) {
  var lock = LockService.getDocumentLock() || LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    return fail_('LOCKED', 'Tablo şu anda meşgul. Birazdan tekrar deneyin.');
  }
  try {
    return fn();
  } catch (err) {
    return errorReply_(err);
  } finally {
    lock.releaseLock();
  }
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

// ===========================================================================
// Kara / salon (eski Salon.gs): karaVeri (yapılan hareketler), karaPlan (program), karaSeans (seans özeti).
// Hareket kataloğu, kas etkileri ve vücut ağırlığı artık idmanRef dosyasında (getRef).
// ===========================================================================

var PLAN_HEADERS = ['Tarih', 'Sıra', 'Hareket', 'Set', 'Tekrar', 'Ağırlık', 'Süre', 'Dinlen', 'Süperset', 'Not', 'Durum'];
var VUCUT = 'Vücut';

var IDMAN_COL = {
  tarih: 'Tarih', no: 'No', hareket: 'Hareket', set: 'Set', tekrar: 'Tekrar', agirlik: 'Ağırlık',
  nabiz: 'Nabız', rpe: 'RPE', msi: 'MSI', aciklama: 'Açıklama', sure: 'Süre'
};


function readPlan_(ss, tz) {
  var t = readSheet_(ss, SHEET_SALON_PLAN);
  var c = planCols_(t);
  var out = [];
  t.values.forEach(function (r) {
    var tarih = dateKey_(cell_(r, c.tarih), tz);
    if (!tarih || !text_(r, c.hareket)) return;
    var ag = cell_(r, c.agirlik);
    out.push({
      tarih: tarih, sira: toNumber_(cell_(r, c.sira)) || out.filter(function (x) { return x.tarih === tarih; }).length + 1,
      hareket: text_(r, c.hareket), set: toNumber_(cell_(r, c.set)) || 0, tekrar: toNumber_(cell_(r, c.tekrar)) || 0,
      agirlik: normalize_(ag) === normalize_(VUCUT) ? VUCUT : toNumber_(ag), sure: toNumber_(cell_(r, c.sure)) || 0,
      dinlen: toNumber_(cell_(r, c.dinlen)) || 0, ss: text_(r, c.ss), not: text_(r, c.not), durum: text_(r, c.durum)
    });
  });
  return out.sort(function (a, b) { return a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : a.sira - b.sira; });
}

function planCols_(t) {
  return {
    tarih: col_(t, 'Tarih', true), sira: col_(t, 'Sıra', false), hareket: col_(t, 'Hareket', true), set: col_(t, 'Set', false),
    tekrar: col_(t, 'Tekrar', false), agirlik: col_(t, 'Ağırlık', false), sure: col_(t, 'Süre', false), dinlen: col_(t, 'Dinlen', false),
    ss: col_(t, 'Süperset', false), not: col_(t, 'Not', false), durum: col_(t, 'Durum', false)
  };
}

function planSheet_(ss) {
  var sh = sheetOf_(ss, SHEET_SALON_PLAN);
  if (!sh) {
    sh = ss.insertSheet(adOf_(SHEET_SALON_PLAN));
    sh.getRange(1, 1, 1, PLAN_HEADERS.length).setValues([PLAN_HEADERS]);
  }
  return sh;
}

/** savePlan { tarih, hareketler: [{ hareket, set, tekrar, agirlik, sure, dinlen, ss, not }] } — o günün plan satırları yenilenir. */
function savePlan_(req) {
  var tarih = requireDate_(req.tarih);
  var list = (Array.isArray(req.hareketler) ? req.hareketler : []).filter(function (h) { return h && String(h.hareket || '').trim(); });
  if (list.length > 60) throw appError_('BAD_REQUEST', 'Plan en çok 60 hareket olabilir.');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  planSheet_(ss);
  var t = readSheet_(ss, SHEET_SALON_PLAN);
  var c = planCols_(t);
  var silinen = deleteDateRows_(t.sheet, c.tarih, tarih, tz);
  if (!list.length) return { yazilan: 0, silinen: silinen };
  var day = Utilities.parseDate(tarih, tz, 'yyyy-MM-dd');
  var w = t.headers.length;
  var rows = list.map(function (h, i) {
    var r = [];
    for (var j = 0; j < w; j++) r.push('');
    var put = function (k, v) { if (c[k] >= 0) r[c[k]] = v; };
    put('tarih', day); put('sira', i + 1); put('hareket', String(h.hareket).trim().slice(0, 120));
    put('set', toNumber_(h.set) || ''); put('tekrar', toNumber_(h.tekrar) || '');
    put('agirlik', normalize_(h.agirlik) === normalize_(VUCUT) ? VUCUT : (toNumber_(h.agirlik) == null ? '' : toNumber_(h.agirlik)));
    put('sure', toNumber_(h.sure) || ''); put('dinlen', toNumber_(h.dinlen) || '');
    put('ss', String(h.ss || '').slice(0, 20)); put('not', String(h.not || '').slice(0, 300)); put('durum', '');
    return r;
  });
  var at = t.sheet.getLastRow() + 1;
  t.sheet.getRange(at, 1, rows.length, w).setValues(rows);
  return { yazilan: rows.length, silinen: silinen };
}

/** planYapildi { tarih } — 13.2.1: o günün karaPlan satırları silinir (sayfa yoksa bir şey yapmaz). */
function planYapildi_(req) {
  var tarih = requireDate_(req.tarih);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return { silinen: deletePlanDay_(ss, tarih, ss.getSpreadsheetTimeZone()) };
}

function deletePlanDay_(ss, tarih, tz) {
  if (!sheetOf_(ss, SHEET_SALON_PLAN)) return 0;
  var t = readSheet_(ss, SHEET_SALON_PLAN);
  return deleteDateRows_(t.sheet, planCols_(t).tarih, tarih, tz);
}

function readGecmis_(ss, tz) {
  var keys = Object.keys(IDMAN_COL).map(function (k) { return IDMAN_COL[k]; });
  var t = readSheet_(ss, SHEET_IDMAN, { cols: keys }); // tüm sayfanın görünen değeri yerine yalnızca Süre sütunu
  var c = idmanCols_(t, false);
  var sureDisp = c.sure >= 0 && t.values.length ? t.sheet.getRange(2, c.sure + 1, t.values.length, 1).getDisplayValues() : [];
  var out = [];
  t.values.forEach(function (r, i) {
    var tarih = dateKey_(r[c.tarih], tz);
    if (!tarih || !text_(r, c.hareket)) return;
    var ag = r[c.agirlik];
    out.push({
      tarih: tarih, no: text_(r, c.no), hareket: text_(r, c.hareket),
      set: toNumber_(r[c.set]), tekrar: toNumber_(r[c.tekrar]),
      agirlik: normalize_(ag) === normalize_(VUCUT) ? VUCUT : toNumber_(ag),
      nabiz: toNumber_(cell_(r, c.nabiz)), rpe: toNumber_(cell_(r, c.rpe)), msi: toNumber_(cell_(r, c.msi)),
      aciklama: text_(r, c.aciklama), sure: c.sure >= 0 ? durationText_(sureDisp[i][0]) : ''
    });
  });
  return out;
}

function idmanCols_(t, forWrite) {
  var c = {};
  Object.keys(IDMAN_COL).forEach(function (k) {
    c[k] = col_(t, IDMAN_COL[k], k !== 'sure' && (forWrite || ['tarih', 'hareket'].indexOf(k) >= 0));
  });
  return c;
}

/**
 * İstek: { tarih: 'YYYY-MM-DD', hareketler: [{ hareket, set, tekrar, agirlik, nabiz, rpe, msi, aciklama, sure }] }
 * 1) o tarih idman'da varsa DUPLICATE  2) en üste yaz  3) satır sayısını doğrula (tutmazsa geri al)
 */
function saveSalon_(req) {
  var tarih = requireDate_(req.tarih);
  var list = Array.isArray(req.hareketler) ? req.hareketler : [];
  list = list.filter(function (h) { return h && String(h.hareket || '').trim(); });
  if (!list.length) throw appError_('BAD_REQUEST', 'Kaydedilecek hareket yok.');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var t = readSheet_(ss, SHEET_IDMAN);
  ensureSureHeader_(t);
  var c = idmanCols_(t, true);

  if (countDateInColumn_(t.sheet, c.tarih, tarih, tz) > 0) {
    throw appError_('DUPLICATE', tarih + ' tarihli salon idmanı zaten kayıtlı.');
  }

  var day = Utilities.parseDate(tarih, tz, 'yyyy-MM-dd');
  var rows = list.map(function (h, i) {
    var f = {};
    f[c.tarih] = { value: day, format: null };
    f[c.no] = { value: i + 1, format: null };
    f[c.hareket] = { value: String(h.hareket).trim(), format: '@' };
    f[c.set] = convertValue_(h.set, 'number');
    f[c.tekrar] = convertValue_(h.tekrar == null ? '' : Math.round(Number(h.tekrar) * 100) / 100, 'number');
    f[c.agirlik] = normalize_(h.agirlik) === normalize_(VUCUT) ? { value: VUCUT, format: '@' } : convertValue_(h.agirlik, 'number');
    f[c.nabiz] = convertValue_(h.nabiz, 'number');
    f[c.rpe] = convertValue_(h.rpe, 'number');
    f[c.msi] = convertValue_(h.msi, 'number');
    f[c.aciklama] = convertValue_(h.aciklama, 'text');
    if (c.sure >= 0) f[c.sure] = convertValue_(h.sure, 'duration');
    var values = [];
    var formats = [];
    t.headers.forEach(function (_, j) {
      values.push(f[j] ? f[j].value : '');
      formats.push(f[j] ? f[j].format : null);
    });
    return { values: values, formats: formats };
  });

  var written = writeRows_(t, rows, true);
  SpreadsheetApp.flush();
  if (countDateInColumn_(t.sheet, c.tarih, tarih, tz) !== rows.length) {
    rollback_(written, c.tarih, tarih, tz);
    SpreadsheetApp.flush();
    throw appError_('WRITE_MISMATCH', 'idman sayfasına ' + rows.length + ' satır beklenirken farklı sayı bulundu.');
  }
  // 13.4: karaSeans (varsa) tek satır; yazılamazsa karaVeri satırları da geri alınır.
  var seansSheet = req.seans && typeof req.seans === 'object' ? sheetOf_(ss, SHEET_KARA_SEANS) : null;
  if (seansSheet) {
    var ks = readSheet_(ss, SHEET_KARA_SEANS);
    var ksTarih = col_(ks, KARA_SEANS_COL.tarih, true);
    var ksWritten = null;
    try {
      ksWritten = writeRows_(ks, [buildKaraSeansRow_(ks, day, req.seans, seansStart_(req.seans.baslangic, tarih, tz))], true); // en yeni üstte
      SpreadsheetApp.flush();
      if (countDateInColumn_(ks.sheet, ksTarih, tarih, tz) !== 1) {
        throw appError_('WRITE_MISMATCH', adOf_(SHEET_KARA_SEANS) + ' satırı doğrulanamadı.');
      }
    } catch (err) {
      rollback_(ksWritten, ksTarih, tarih, tz);
      rollback_(written, c.tarih, tarih, tz);
      SpreadsheetApp.flush();
      throw err;
    }
  }
  // 13.2.1: havuz gibi — yapılan idman karaVeri'de, günün karaPlan satırları silinir (arşiv yok).
  var out = { yazilan: rows.length, silinenPlan: 0 };
  try {
    out.silinenPlan = deletePlanDay_(ss, tarih, tz);
  } catch (err) {
    console.error('salon plan sil: ' + ((err && err.stack) || err));
    out.uyari = 'İdman kaydedildi ancak ' + adOf_(SHEET_SALON_PLAN) + ' satırları silinemedi.';
  }
  return out;
}

var KARA_SEANS_COL = { tarih: 'Tarih', sure: 'Süre', rpe: 'RPE', msi: 'MSI', yer: 'Yer', aciklama: 'Açıklama' };

/** karaSeans satırı: { sure: 'h:mm:ss', rpe, msi, yer, aciklama, baslangic (ms, 13.9: Tarih saatli) } — başlık sırası tablodan. */
function buildKaraSeansRow_(ks, day, s, baslangic) {
  var fields = {};
  fields[normalize_(KARA_SEANS_COL.tarih)] = baslangic ? { value: baslangic, format: SEANS_SAAT_FMT } : { value: day, format: null };
  fields[normalize_(KARA_SEANS_COL.sure)] = convertValue_(s.sure, 'duration');
  fields[normalize_(KARA_SEANS_COL.rpe)] = convertValue_(s.rpe, 'number');
  fields[normalize_(KARA_SEANS_COL.msi)] = convertValue_(s.msi, 'number');
  fields[normalize_(KARA_SEANS_COL.yer)] = convertValue_(s.yer, 'text');
  fields[normalize_(KARA_SEANS_COL.aciklama)] = convertValue_(s.aciklama, 'text');
  var values = [];
  var formats = [];
  ks.headers.forEach(function (h) {
    var f = fields[normalize_(h)];
    values.push(f ? f.value : '');
    formats.push(f ? f.format : null);
  });
  return { values: values, formats: formats };
}

/** karaSeans → [{ tarih, sure, rpe, msi, yer, aciklama }] (yük hesabı için gerçek süre ve seans RPE'si). */
function readKaraSeans_(ss, tz) {
  var t = readSheet_(ss, SHEET_KARA_SEANS, { display: true });
  var c = {};
  Object.keys(KARA_SEANS_COL).forEach(function (k) { c[k] = col_(t, KARA_SEANS_COL[k], k === 'tarih'); });
  var out = [];
  t.values.forEach(function (r, i) {
    var tarih = dateKey_(r[c.tarih], tz);
    if (!tarih) return;
    out.push({
      tarih: tarih, sure: c.sure >= 0 ? durationText_(t.display[i][c.sure]) : '',
      rpe: toNumber_(cell_(r, c.rpe)), msi: toNumber_(cell_(r, c.msi)), yer: text_(r, c.yer), aciklama: text_(r, c.aciklama)
    });
  });
  return out;
}

/** "Süre" başlığı yoksa K sütununa (Açıklama'dan sonraki ilk sütun) yazılır. */
function ensureSureHeader_(t) {
  if (col_(t, IDMAN_COL.sure, false) >= 0) return;
  var k = 10; // K
  if (t.headers.length > k && String(t.headers[k] || '').trim()) {
    throw appError_('MISSING_COLUMN', 'idman sayfasında "Süre" sütunu yok ve K sütunu başka bir başlıkla dolu.');
  }
  t.sheet.getRange(1, k + 1, 1, 1).setValues([[IDMAN_COL.sure]]);
  while (t.headers.length <= k) t.headers.push('');
  t.headers[k] = IDMAN_COL.sure;
  t.map = headerMap_(t.headers);
}

/** getSalon: geçmiş (karaVeri), varsa program (karaPlan) ve seanslar (karaSeans). katalog/etki/bw başka dosyadan gelir (boş döner). */
function getSalon_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var out = { katalog: [], etki: [], bw: [], gecmis: sheetOf_(ss, SHEET_IDMAN) ? readGecmis_(ss, tz) : [] }; // karaVeri yoksa boş geçmiş
  if (sheetOf_(ss, SHEET_SALON_PLAN)) out.plan = readPlan_(ss, tz);
  if (sheetOf_(ss, SHEET_KARA_SEANS)) out.seans = readKaraSeans_(ss, tz);
  return out;
}
