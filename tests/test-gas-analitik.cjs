// idmanAnalitik.gs (sahte SpreadsheetApp): salt okuma, başlıkla sütun bulma, tekrarlayan başlıklar (derece), güvenlik.
//   node tests/test-gas-analitik.cjs
const assert = require('assert');
const { makeEnv, Sheet } = require('./fakegas.cjs');
const { analitikSheets } = require('./analitik-ornek.cjs');

const env = (sheets = analitikSheets(), token = 'secret') => makeEnv(sheets, token, 'idmanAnalitik.gs', { alias: false });
let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error('BAŞARISIZ:', name); throw e; } };

test('token: yanlış ya da eksik anahtar reddedilir; bilinmeyen işlem; bozuk JSON; istek içeriği yansıtılmaz', () => {
  const e = env();
  for (const token of ['yanlis', '', undefined, 12345, null, 'secret ']) {
    const r = JSON.parse(e.ctx.doPost({ postData: { contents: JSON.stringify({ action: 'getAnalitik', token }) } }).s);
    assert.strictEqual(r.error, 'AUTH', String(token));
  }
  assert.strictEqual(JSON.parse(env(analitikSheets(), null).ctx.doPost({ postData: { contents: JSON.stringify({ action: 'getAnalitik', token: 'x' }) } }).s).error, 'AUTH', 'Script Properties boşsa kimse giremez');
  assert.strictEqual(JSON.parse(e.ctx.doPost({ postData: { contents: '{bozuk' } }).s).error, 'BAD_REQUEST');
  const r = e.call({ action: 'silHepsini' });
  assert.strictEqual(r.error, 'UNKNOWN_ACTION'); assert.ok(!/silHepsini/.test(r.message));
  assert.strictEqual(JSON.parse(e.ctx.doGet().s).data.uygulama, 'idmanSK idmanAnalitik');
});

test('getAnalitik: sayfalar başlıkla okunur, görünen metin aynen; boş ve "Henüz kayıt yok" satırları yok; ham veri sayfaları okunmaz', () => {
  const e = env();
  const before = JSON.stringify(Object.values(e.sheets).map((s) => s.data));
  const r = e.call({ action: 'getAnalitik' });
  assert.ok(r.ok, JSON.stringify(r));
  const d = r.data;
  assert.strictEqual(d.hedefler.length, 9);
  assert.deepStrictEqual(d.hedefler[2], { hedef: '2 · Kara seansı', esik: 'Her hafta ≥ 1 ev seansı', guncel: '1/2 hafta · bu hafta 0', durum: '✗', aciklama: 'Biten haftalar sayılır' });
  assert.deepStrictEqual(d.durum.map((x) => [x.hafta, x.km, x.kara]), [['5', '4,3', '1'], ['6', '6,6', '1'], ['7', '5,4', '0'], ['8', '7,2', '1'], ['9', '7,5', '0']]);
  assert.deepStrictEqual([d.kn[2].tarih, d.kn[2].k1sure, d.kn[2].k1ort, d.kn[2].k1kulac, d.kn[2].k3dort], ['27.10.2026', '4:27', '156', '13,3', '-15']);
  assert.deepStrictEqual(d.kesintisiz.map((x) => [x.mesafe, x.sure, x.ort]), [['1000', '0:22:31', '177'], ['1200', '0:27:36', '172'], ['1600', '0:36:33', '148'], ['1600', '0:36:36', '163'], ['1600', '0:37:19', '142']]);
  assert.deepStrictEqual([d.kv[1].set, d.kv[1].swolf, d.kv[1].dswolf], ['8×150', '47,3', '+0,1']);
  assert.deepStrictEqual(d.test, [], 'Henüz kayıt yok satırı atılır');
  assert.deepStrictEqual(d.kara.map((x) => [x.setler, x.ort]), [['10-7-5', '7,3'], ['11-9-9', '9,7'], ['9-9-9', '9,0']]);
  assert.deepStrictEqual(d.sezon.map((x) => x.sezon), ['2024', '2025', '2026', '26-27']);
  assert.strictEqual(d.model[1].kmhafta, '6,6');
  assert.deepStrictEqual(d.bolge[2], { sezon: '26-27', ms: '16,2', bolgeli: '100', kolay: '22', orta: '64', esik: '6', hiz: '7', tec: '0', aletli: '0', esikhiz: '14' });
  assert.deepStrictEqual(d.bilgi[2], { tanim: 'Bu Hafta', deger: '44', aciklama: '' });
  assert.ok(d.alindi > 0);
  assert.ok(!/GİZLİ-HAM-VERİ/.test(JSON.stringify(d)), 'veri sayfası okunmaz');
  assert.strictEqual(JSON.stringify(Object.values(e.sheets).map((s) => s.data)), before, 'salt okuma: hiçbir sayfa değişmedi');
});

test('derece: yan yana tablolarda tekrarlanan başlıklar (Etiket, Alet, Tarih) ikinci sütundan okunur', () => {
  const d = env().call({ action: 'getAnalitik' }).data.derece;
  assert.deepStrictEqual(d.etiketler.map((x) => [x.etiket, x.sayi, x.eniyi, x.eniyitarih, x.son, x.sontarih]), [
    ['CSS 400', '5', '0:07:35.0', '26.05.2023', '0:08:02.0', '09.10.2026'],
    ['CSS 200', '3', '0:03:44.0', '12.05.2023', '0:03:49.3', '09.10.2026'],
    ['Derece 100', '30', '0:01:34.0', '15.12.2023', '0:01:47.0', '21.04.2026']]);
  assert.deepStrictEqual(d.css.map((x) => [x.tarih, x.yontem, x.girdi, x.css, x.not]), [
    ['09.10.2026', 'İki mesafe', '400 + 200', '2:06.4', ''], ['20.08.2026', 'T30', '1500 m / 30:43', '2:02.3', 'tahmini'], ['26.05.2026', 'T30', '1450 m / 30:06', '2:04.0', 'tahmini']]);
});

test('eksik sayfa ve sütun hata vermez: o alan boş kalır; sayfa/başlık yazımı (büyük-küçük, Türkçe) önemsiz; en yeni 80 satır', () => {
  const sh = analitikSheets();
  delete sh.Kara; delete sh.bolge;
  sh.hedefler = sh.Hedefler; delete sh.Hedefler; sh.hedefler.name = 'HEDEFLER'; // sayfa adı farklı yazım
  sh.hedefler.data[0] = ['hedef', 'ESIK', 'güncel', 'durum', 'Açıklama']; // başlıklar farklı yazım
  const rows = Array.from({ length: 100 }, (_, i) => [`${String(i + 1).padStart(2, '0')}.01.2026`, '1', '1000', '0:22:00', '2:10', '2:10', '0', '170', '150', '', '', '', '13', '7', '0', '']);
  sh.Kesintisiz = new Sheet('Kesintisiz', sh.Kesintisiz.data[0], rows);
  const r = env(sh).call({ action: 'getAnalitik' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepStrictEqual([r.data.kara, r.data.bolge], [[], []]);
  assert.strictEqual(r.data.hedefler.length, 9, 'farklı yazılmış sayfa ve başlıklar bulunur');
  assert.strictEqual(r.data.hedefler[0].esik, 'MSI < 1 · KN-1 kulaç < 14,3');
  assert.strictEqual(r.data.kesintisiz.length, 80);
  assert.strictEqual(r.data.kesintisiz[79].tarih, '100.01.2026', 'en yeni satırlar kalır');
});

console.log(`idmanAnalitik.gs betik testleri: TAMAM (${n} senaryo)`);
