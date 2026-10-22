# idmanSK — Claude Code oturum rehberi

Telefonda çalışan yüzme + kara (salon) idman uygulaması (PWA, GitHub Pages) ve onun Google Apps Script
arka uçları. Kullanıcı Türkçe yazar; cevaplar ve arayüz metinleri Türkçe.
Ayrıntılı mimari: **SPEC.md** (gerekince oku; tamamını her seferinde okuma).

## Çalışma kuralları (kullanıcının kalıcı istekleri)
- **Önce öneri, sonra kod:** İstek gelince çözüm önerisini yaz, gerekiyorsa görsel (mockup) göster;
  kod ancak kullanıcı onaylayınca ("uygula", "onaylıyorum") yazılır.
- **Token tüketen şeylerden önce onay al** (tablo, görsel, uzun rapor).
- **Mevcudu bozma:** Değişiklikten önce ve sonra tüm testler (`tests/run-all.sh`). Eski test yalnızca bilerek
  değişen davranış için değiştirilir ve yanına `// 13.x (bilerek değişti): neden` yazılır.
- **Güvenlik:** Her .gs `@OnlyCurrentDoc`; her betik yalnızca kendi tablosuna erişir. Anahtar (token) Script
  Properties'te; istek içeriği hata mesajına yansıtılmaz.
- **Terimler:** Arayüzde "kara idmanı" (salon değil) ve "yüzme" (havuz değil). İç anahtarlar (ysk.salon…,
  tur 'salon', salon.js) değişmez. Yer seçeneği "Salon" ve havuz boyu 25/50 m kalır.
- Commit/PR'da model adı yazma. PR yalnız istenirse.

## Depo
- GitHub: `seyfettinkarakaya/idmanSK` (eski adı Claude; yönlendirme var). Yayın: https://seyfettinkarakaya.github.io/idmanSK/
- Çalışma dalı: `claude/yuzmesk-phase-1-y66759`; sürüm bitince aynı commit `main`'e de itilir (Pages main'den yayınlar):
  `git push -u origin <dal> && git push origin <dal>:main`
- Commit sonuna oturumun verdiği Co-Authored-By / Claude-Session satırlarını ekle.

## Dosya haritası
| Dosya | Görev |
|---|---|
| `index.html`, `style.css` | Tüm ekranların iskeleti ve stili (tek sayfa; CSP inline stil/script yasak) |
| `app.js` (~6000 satır) | Arayüz: tüm ekranlar, olay işleyiciler. Veriye yalnız `data.js` ile erişir |
| `data.js` | Bağlantılar, fetch (timeout, hata kodları), localStorage önbellekleri, kuyruk, geçmiş |
| `zaman.js` | Yüzme zamanlama modeli: olay listesi → durum (saf). Bkz. ZAMANLAMA.md |
| `salon.js` | Kara idmanı: olay modeli, payload, öneri/puanlama, alternatifler, rekorlar (saf) |
| `wheel.js` | "Metro tekerleği" set kaydırıcı (DOM bileşeni) |
| `duzen.js` | İdman anında set düzenle/ekle/sil, plan farkı notu (saf) |
| `ref.js`, `kisit.js`, `grup.js`, `yuk.js`, `model.js`, `gosterge.js`, `analiz.js`, `hazir.js` | Saf hesap modülleri (CSS/tempo bölgesi, sağlık kısıtı, kas grupları, yük, haftalık model, göstergeler, yüzme analizi, hazır olma) |
| `harita.js`, `bilgi.js`, `video.js`, `hareketdb.js`, `adimlar.js`, `videolar.js` | Kas haritası, hareket bilgi kartı, video eşleme ve gömülü veri |
| `sw.js` | Service worker (çevrimdışı). `SURUM` uygulama sürümüyle aynı olmalı |
| `idman.gs` | idman tablosu betiği: yüzme plan/veri/seans + kara veri/plan/seans |
| `idmanRef.gs` | idmanRef tablosu: zone, css, alet, bilgi, RPE, MSI, faz (salt okuma + addCss) |
| `idmanKutuphane.gs` | idmanKutuphane tablosu: karaHareket, karaEtki (salt okuma) |
| `tests/` | Birim (.mjs), betik (test-gas*.cjs, sahte SpreadsheetApp: fakegas.cjs), e2e (Playwright: harness.cjs) |
| `README.md` | Kurulum + her sürümün "neler var" bölümü |
| `IS_LISTESI.md` | İş listesi: açık işler özeti, beklemede/iptal, İzlenecek (kararsız testler), Tamamlanan |
| `ZAMANLAMA.md` | Yüzme zamanlama modeli tasarımı |
| `IDMAN_OTURUMU_REHBERI.md` | Programı yazan ayrı "idman" oturumu için rehber (eski adlar içerebilir) |

## Test
```
NODE_PATH=$(npm root -g) bash tests/run-all.sh          # hepsi (~4 dk, set -e: ilk hatada durur)
node tests/test-gas-edge.cjs                             # tek dosya
NODE_PATH=$(npm root -g) node tests/e2e-surum13.cjs "13.9"   # e2e: ada göre süz
```
Bilinen kararsızlar (tek başına geçer): test-e2e.cjs "tekrar 2: DUR !== YÜZ", bazı yüzme e2e'leri tam koşuda
(sahte saat). Ayrıntı IS_LISTESI → İzlenecek.

## Sürüm yükseltme
1. `sed -i 's/13\.9\.0/13.10.0/g' *.js index.html` (sw.js dahil) ve `tests/test-e2e.cjs` içindeki `'Sürüm 13.9.0'`.
   test-sw.mjs tutarlılığı denetler.
2. README'ye "## Sürüm 13.x'te neler var (dağıtım: …)" bölümü, IS_LISTESI → Tamamlanan satırı.
3. .gs değiştiyse kullanıcıya dosyayı gönder ve "Apps Script'e yapıştır → Dağıtımları yönet → Yeni sürüm" de.

## Mockup yöntemi (öneri aşaması)
Uygulamanın style.css/fontlarıyla statik HTML → `python3 -m http.server` → Playwright ile PNG → kullanıcıya gönder.
Gerçek ekran görüntüsü: harness.cjs `runScenarios` + `launch({ viewport:{width:390,height:844} })`.

## Şu anki durum
Son sürüm **13.9.0** (22.10.2026). Açık işler ve bekleyenler: IS_LISTESI.md başı ("Açık işler özeti", "İzlenecek").
