# idmanSK — Sürüm 12.1

Havuz kenarında ve salonda kullanılan, tek kullanıcılı idman uygulaması.
Program Google E-Tablolar'daki **YuzmeProgram** dosyasında hazırlanır; uygulama onu
büyük puntoyla gösterir, seans bitince yapılan setleri `eski` sayfasına yazar, seans
özetini `seans` sayfasına yazar ve günün Plan satırlarını `arsiv` sayfasına taşır.
Biten seansın bir kopyası telefonda da kalır (**Yapılmış idmanlar**).
Salon idmanı **SalonTakip** dosyasıyla çalışır (plan telefonda yapılır, yapılan hareketler
`idman` sayfasına yazılır); CSS, tempo bölgeleri ve RPE/MSI açıklamaları **sporRef**
dosyasından okunur.

- Ön yüz: tek sayfalık PWA (vanilla HTML/CSS/JS, derleme adımı yok), GitHub Pages'te barındırılır.
- Arka uç (13.2): iki dosyanın her birine bağlı ayrı Google Apps Script web uygulaması —
  `idman.gs` (idman dosyası: yüzme + salon girişleri) ve `idmanRef.gs` (idmanRef dosyası: referanslar).
  İkisi de `@OnlyCurrentDoc`: her betik **yalnızca kendi dosyasını** görür; Drive'daki diğer dosyalara
  erişim izni istenmez. İki ayrı adres ve anahtar.

## Dosyalar

| Dosya | Görev |
|---|---|
| `index.html` | Ekranların iskeleti |
| `style.css` | Koyu, yüksek kontrastlı havuz kenarı tasarımı |
| `app.js` | Arayüz: ekranlar, program ve zamanlama, seans sonu |
| `zaman.js` | Saf zamanlama modülü: dokunuş olaylarından tekrar/dinlenme süreleri (bkz. `ZAMANLAMA.md`) |
| `duzen.js` | İdman anında yüzme planı düzenleme (değiştir/ekle/sil, plan farkı notu) |
| `salon.js` | Salon: olaylardan set/dinlenme durumu, tabloya giden satırlar, planlama puanı, ilerleme önerisi |
| `ref.js` | sporRef hesapları: güne/havuza/alete göre CSS, tempo bölgeleri, RPE/MSI açıklamaları |
| `wheel.js` | Tekerlek (wheel) gezinme bileşeni: sürükleme, atalet, oturma |
| `grup.js` | 10 kas grubu (Omuz, Göğüs, Biseps, Triseps, Ön kol, Sırt, Karın, Kalça, Kalça yanı, Bacak), renkleri, tablodaki İngilizce adların eşlemesi |
| `kisit.js` | Sağlık kısıtları: yasaklı hareketler, squat derinliği, MSI kararı, süre bütçesi, kulaç normu (sporRef `kisit` sayfasıyla değiştirilebilir) |
| `yuk.js` | Yük modeli: seans yükü (RPE × dk), form eğrisi, yük artış oranı, kas toparlanması, kurbağalama payı |
| `harita.js` | Dokunmatik kas haritası (ön/arka figür, dokunma haritası `img/kas/`) |
| `analiz.js` | Yüzme analizi: SWOLF, bölgelerde süre, aynı setle kıyas ve rekor, ağrı geçmişi, CSS testi, derece tahmini |
| `bilgi.js`, `hareketdb.js` | Hareket bilgi kartları: ad eşleme ve free-exercise-db verisi (36 harekete Türkçe metin + `img/hareket/` fotoğrafları) |
| `sw.js` | Service worker: uygulama dosyaları önbellekte (internet yokken açılış) |
| `gosterge.js` | 13.5 göstergeleri: yük oranı, monotoni, form trendi, kara arası, reçete, kişisel hazır olma, stres puanı, bölge dağılımı, plan uyumu |
| `model.js` | Sürüm 13 entegre model: ortak döngü fazı, haftalık yük hedefi, eklem bütçeleri, 7 günlük plan, ölçüm zamanı |
| `hazir.js` | Günlük hazır olma skoru, dinlenme haftası önerisi, haftalık set / kas grubu, plan uyumu, ağırlık adımı |
| `video.js`, `videolar.js` | Hareket videoları: YouTube adresi çözme, çerezsiz gömme adresi; 61 hareketlik liste (`tasarim/video/liste.csv`'den üretilir) |
| `adimlar.js` | Hareketlerin Türkçe adımları (exercises-dataset metinleri, MIT; `tasarim/adim/yap.py` ile üretilir) |
| `data.js` | **Tek veri erişim modülü**: Apps Script çağrıları, yerel önbellek, gönderim kuyruğu |
| `manifest.json`, `icons/` | PWA tanımı ve simgeler (192, 512, apple-touch-icon) |
| `fonts/` | Archivo ve Barlow Condensed (SIL Open Font License); dışarıdan yazı tipi yüklenmez |
| `idman.gs` | idman betiği: yüzme (`getDates`, `getPlan`, `finishSession`) + kara (`getSalon`, `saveSalon`, `savePlan`, `planYapildi`) |
| `idmanRef.gs` | idmanRef betiği: `getRef` (bölgeler, CSS, bilgi, faz, kısıtlar, BW), `addCss` |
| `idmanKutuphane.gs` | idmanKutuphane betiği: `getKutuphane` (karaHareket, karaEtki; yalnızca okur) |
| `tests/` | Arka uç ve uçtan uca testler (bkz. en alt) |

---

## 1. Tabloları hazırlama (13.4: üç dosya)

Üç Google tablosu kullanılır; başlıklar **1. satırda**. Eski sayfa adları (havuz…, salon…) da tanınır.

**idman** — giriş verileri (yüzme + kara idmanı):
- **yuzmePlan** (eski havuzPlan): `Tarih, Sıra, Blok, Tekrar, Mesafe, Stil, Tür, Açıklama, Hedef, Dinlen, Alet, Gerçek, Kulaç, Nabız, RPE, MSI, Not`, isteğe bağlı `Etiket` (13.8)
  (yanında Yığımlı Mesafe, Hedef Zone gibi türetilmiş sütunlar olabilir; uygulama onları okumaz, yazmaz.)
- **yuzmeVeri** (eski havuzVeri): yuzmePlan'daki 17 başlık; tablonun kendi hesapladığı sütunlar (Set Mesafe, Set Süre,
  Hafta …) olabilir — betik bunlara değer yazmaz, üstteki satırda formül varsa yeni satırlara kopyalar.
- **yuzmeSeans** (eski havuzSeans; isteğe bağlı): `Tarih, Süre, Mesafe, Havuz, RPE, MSI, Açıklama`
- **karaVeri** (eski salonVeri): `Tarih, No, Hareket, Set, Tekrar, Ağırlık, Nabız, RPE, MSI, Açıklama, Süre`
- **karaPlan** (eski salonPlan; yoksa ilk "Plana yaz"da açılır): `Tarih, Sıra, Hareket, Set, Tekrar, Ağırlık, Süre, Dinlen, Süperset, Not, Durum`
- **karaSeans** (isteğe bağlı): `Tarih, Süre, RPE, MSI, Yer, Açıklama` — kara idmanının geneli; yük bu satırdan hesaplanır.
- Arşiv yok: idman kaydedilince o günün plan satırları (yuzmePlan / karaPlan) silinir.

**idmanRef** — referanslar:
- **zone, css, alet, bilgi, RPE, MSI, faz** (eski adı fazBilgi); isteğe bağlı **kisit, yuzmeKas, drill**.
- Vücut ağırlığı: **bilgi** sayfasında bir satır — Kısaltma `BW`, sonra ilk tarih, son tarih, kg.

**idmanKutuphane** — sabit kara idmanı bilgisi:
- **karaHareket**: `Exercise, Goal Tag, Equipment, BW Coefficient, Swim Transfer Coefficient` (Gemini/Chat GPT STC okunmaz); isteğe bağlı Video, Kısıt, Alternatif, Görsel.
- **karaEtki**: `Exercise` (A1 boşsa A sütunu), `Muscle Group, Muscle, Kinetic Chain, Yük Etki Oranı` (Notlar okunmaz).
- **karaKas** (kas / zincir listesi): şimdilik okunmaz.

Betikler sütunları **başlık adına göre** bulur; sütun sırası önemli değildir ve yeni sütun
eklemek bir şeyi bozmaz. Karşılaştırma büyük/küçük harf, baştaki/sondaki boşluk ve
Türkçe karakter farklarını yok sayar (`Sıra` = `sira`).

Notlar:
- `Tarih` hücreleri tarih biçiminde olmalı (`gg.aa.yyyy` metni de kabul edilir).
- `Hedef` / `Dinlen` `00:01:30` biçiminde yazılmalı (Sheets `1:30`'u 1 saat 30 dk sanar). Betik yazdığı süreleri
  saat haneli yazar: planlanan `[h]:mm:ss`, ölçülen (Gerçek, seans Süre) `[h]:mm:ss.0`.
- Aynı tarihte her set benzersiz bir `Sıra` değerine sahip olmalı.

## 2. Apps Script'leri kurma ve yayınlama (üç betik)

| Dosya | Betik (bu depodan) | Telefonda Ayarlar → Bağlantılar |
|---|---|---|
| idman | `idman.gs` | **idman** (gerekli) |
| idmanRef | `idmanRef.gs` | **idmanRef** (CSS, bölgeler, faz, BW) |
| idmanKutuphane | `idmanKutuphane.gs` (yalnızca okur) | **idmanKutuphane** (kara idmanı için) |

Her dosya için:
1. Tabloyu açın → **Uzantılar → Apps Script**.
2. Varsa eski kodu silin, bu depodaki ilgili `.gs` dosyasını yapıştırıp kaydedin (tek dosya).
3. **Token üretme:** fonksiyon listesinden `tokenUret`'i seçip **Çalıştır**. İlk seferde Google yetki ister; onaylayın.
   Betik `@OnlyCurrentDoc` ile işaretlidir: yalnızca bağlı olduğu tabloya erişir. **Yürütme günlüğü**'ndeki
   `Yeni token: …` değerini kopyalayın (sonradan `tokenGoster`).
4. **Dağıt → Yeni dağıtım** → tür: **Web uygulaması** · *Şu kullanıcı olarak yürüt:* **Ben** · *Erişimi olan:* **Herkes**.
5. `https://script.google.com/macros/s/…/exec` adresini kopyalayıp telefonda **Ayarlar → Bağlantılar**'a girin.

Betiği güncellediğinizde **Dağıt → Dağıtımları yönet → (kalem) → Sürüm: Yeni sürüm** ile yayınlayın; adres değişmez.

### Anahtarı (token) yenileme

Anahtar başkasının eline geçtiyse (ekran görüntüsü, mesaj, kaybolan telefon) ya da
yalnızca önlem olarak:

1. Apps Script düzenleyicisinde `tokenUret`'i çalıştırın. Yeni anahtar üretilir ve
   **eski anahtar o anda geçersiz olur**; eski anahtarla gelen istekler `AUTH` hatası alır.
2. Yürütme günlüğündeki `Yeni token: …` değerini kopyalayın (sonradan `tokenGoster`).
3. Telefonda **Ana sayfa → ⚙︎ Ayarlar**'da anahtar alanına yapıştırıp **Kaydet ve bağlan**.

Yeniden dağıtım gerekmez; adres aynı kalır. Telefonu değiştirirken veya birine verirken
**Ayarlar → Anahtarı unut** adres ve anahtarı telefondan siler (yapılmış idmanlar ve
gönderilmeyi bekleyen kayıtlar kalır).

Hızlı kontrol: `/exec` adresini tarayıcıda açınca `{"ok":true,…}` görmelisiniz.

## 2b. Sayfa ayrıntıları (13.2 adlarıyla)

Her dosyaya **kendi** betiği kurulur; adımlar yukarıdakiyle aynıdır (Uzantılar → Apps Script →
dosyayı yapıştır → `tokenUret` → Dağıt → Web uygulaması, *Ben* / *Herkes*). Her betiğin
anahtarı ayrıdır. Adresler ve anahtarlar telefonda **Ayarlar → Bağlantılar**'a girilir;
idmanRef boş bırakılırsa salon ve CSS bölgeleri kapalı kalır.

| Dosya | Betik | Okur | Yazar |
|---|---|---|---|
| idman | `idman.gs` | havuzPlan, salonVeri, salonPlan (varsa) | havuzVeri, havuzSeans (en üste), havuzPlan'dan günün satırlarını siler; salonVeri (en üste), salonPlan |
| idmanRef | `idmanRef.gs` | zone, css, alet, bilgi (BW dahil), RPE, MSI, faz, salonHar, salonHKEtki; isteğe bağlı kisit, yuzmeKas, drill | css (yalnızca CSS testi: sona yeni satır) |

**idman (salon)** (`idman.gs`):
- `salonVeri`: A–J sırası değişmez — `Tarih, No, Hareket, Set, Tekrar, Ağırlık, Nabız, RPE, MSI, Açıklama`
  (`v2` formülü bu sütunları sırasıyla okur). Hareket süresi **K** sütununa (`Süre`) yazılır;
  başlık yoksa ilk kayıtta açılır (K başka başlıkla doluysa hata verir, hiçbir şey yazılmaz).
- Yazma kuralları: Tarih gerçek tarih, sayılar sayı, vücut ağırlığı tam olarak `Vücut`;
  **Tekrar** setlerin ortalaması (ör. 9,67), set ayrıntısı **Açıklama**'da (`Setler: 11-9-9`).
  Aynı gün ikinci kez yazılmaz (`DUPLICATE`).
- `salonHar`: `Exercise, Goal Tag, Equipment, BW Coefficient, Swim Transfer Coefficient, …`;
  isteğe bağlı **Video** sütunu `salonHar!A:E`'den sonra (yalnızca youtube.com / youtu.be adresleri gösterilir).
- `salonHKEtki`: `Exercise, Muscle Group, Muscle, Kinetic Chain, Yük Etki Oranı`.
- Sürüm 12, `salonHar`'da isteğe bağlı üç başlık okur (varsa): **Kısıt** (ör. `squat>90`, `zıplama`),
  **Alternatif** (güvenli hareket adı), **Görsel** (free-exercise-db kimliği; bilgi kartı için ad eşlemesini geçersiz kılar).
  Boş bırakılırsa uygulama kısıtları hareket adından, kartı ad benzerliğinden bulur.
- **Sürüm 13 — `plan` sayfası** (yalnızca ekleme; ilk "Programa yaz"da betik kendisi açar):
  `Tarih, Sıra, Hareket, Set, Tekrar, Ağırlık, Süre, Dinlen, Süperset, Not, Durum`. Bir günün planı yazılınca
  o tarihin eski satırları yenileriyle değişir; idman bitince salonVeri'ye yazılır ve o günün satırları salonPlan'dan silinir (13.2.1, havuz gibi; arşiv yok).
  Sayfa yoksa `getSalon` cevabı eskisiyle aynıdır.
- `salonHKEtki` grupları İngilizce kalabilir (`Shoulders`, `Arms`, `Core` …); uygulama 10 Türkçe gruba çevirir.

**idmanRef** (`idmanRef.gs`, salt okuma):
- `zone` (`Zone, Alt Sınır, Üst Sınır, Tür, Türkçe Adı`): PACE satırları CSS'e eklenen sn/100 m
  sınırları (alt ≤ fark < üst; `−19` gibi Unicode eksi kabul edilir).
- `css` (`Tarih_ilk, Tarih_son, CSS (sn), Alet, Havuz`): idman gününe, havuza ve alete göre seçilir;
  alet adları `alet` sayfasındaki kod/ad ile eşlenir (`PB` = `Pullbuoy`). Günü kapsayan satır yoksa
  en son değer kullanılır ve Ayarlar'da "CSS güncel değil" yazar. idmanRef bağlı değilse CSS Ayarlar'dan elle girilir.
- `RPE`, `MSI`: başlıksız tek sütun (`7–8 — Zor, …`); salon girişinde ve Ayarlar'da açıklama olarak gösterilir.
- **Sürüm 12, isteğe bağlı sayfalar** (yoksa uygulama varsayılanlarla çalışır; eski sayfalara dokunulmaz):
  - `kisit` (`Kural, Değer, Açıklama`): `tani` (Değer: tanı adı, Açıklama: kural metni), `br_ay_max` (10),
    `squat_derinlik` (90), `yasak` (virgülle: `koşu, run, jump, …`), `msi_gozlem` / `msi_hafiflet` / `msi_dur` / `msi_tibbi`
    (0,5 / 1 / 2 / 3), `sure_sabah` / `sure_ogle` / `sure_aksam` (80 / 65 / 0 = sınırsız), `gun_hafta` (3),
    `kulac_drill` / `kulac_yuzus` / `kulac_race` / `kulac_pull` (`10-11` gibi aralık), `omuz_rahatlatma` (evet/hayır).
  - `yuzmeKas` (`Stil, Grup, Katsayı`): yüzme yükünün kas gruplarına dağılımı (ör. `FR, Omuz, 0.35`).
  - `drill` (`Ad, Video, Açıklama`): set açıklamasında drill adı geçerse ▶ video bağlantısı çıkar.
- **CSS testi** (Ayarlar → CSS testi yap): 400 m ve 200 m süresinden CSS = (t400 − t200) / 2;
  idmanRef bağlıysa `css` sayfasının **sonuna** bir satır eklenir (`Tarih_ilk`, `CSS`, `Kaynak = idmanSK CSS testi`), eski satırlar durur.

### Sürüm 12'ye geçiş

1. `SporRef.gs` ve `Salon.gs`'i yeni sürümle değiştirip **Yeni sürüm** olarak yeniden dağıtın (adres ve anahtar değişmez).
   `Code.gs` değişmedi.
2. İsterseniz sporRef'e `kisit`, `yuzmeKas`, `drill` sayfalarını, SalonTakip `H`'ye Kısıt / Alternatif / Görsel başlıklarını ekleyin.
3. Hareket fotoğrafları uygulamayla gelir (`img/hareket/`); listede olmayan hareketlerin fotoğrafı
   `raw.githubusercontent.com` (free-exercise-db) üzerinden yüklenir, bu yüzden CSP `img-src`'ye bu adres eklendi.

## 3. GitHub Pages'e koyma

1. Bu depoyu GitHub'a gönderin (ücretsiz planda Pages için depo **herkese açık** olmalı).
2. Depo → **Settings → Pages** → *Source:* **Deploy from a branch** →
   dal: `main`, klasör: `/ (root)` → **Save**.
3. Birkaç dakika sonra adres `https://<kullanıcı>.github.io/<depo>/` olarak yayına girer
   (HTTPS; Wake Lock ve PWA için gerekli).

Token ve Apps Script adresi koda **gömülmez**: ilk açılışta uygulama bunları sorar ve
yalnızca o cihazın `localStorage`'ında saklar. Bu yüzden depo herkese açık olabilir.
Ayarlar ana sayfadaki ⚙︎ düğmesinden sonradan değiştirilebilir.

Güvenlik: sayfa bir Content-Security-Policy taşır; yalnızca kendi dosyalarını yükler ve
yalnızca `script.google.com` / `script.googleusercontent.com` adreslerine bağlanır.
Bu yüzden Ayarlar'a yalnızca `https://script.google.com/macros/s/…/exec` biçimindeki adres
kabul edilir. Sunucudaki beklenmeyen hataların ayrıntısı telefona gönderilmez; telefonda
kısa bir başvuru numarası görünür, ayrıntı Apps Script **Yürütmeler** günlüğündedir.

## 4. iPhone'da ana ekrana ekleme

1. iPhone'da **Safari** ile Pages adresini açın (başka tarayıcıdan eklenen kısayol adres çubuğuyla açılabilir).
2. Alttaki **Paylaş** düğmesine (yukarı ok olan kare) dokunun.
3. Listeyi kaydırıp **Ana Ekrana Ekle**'yi seçin; ad **idmanSK** olarak gelir → **Ekle**.
4. Ana ekrandaki idmanSK simgesiyle açın: adres çubuğu olmadan tam ekran açılır.
5. İlk açılışta Apps Script adresini ve token'ı yapıştırıp **Kaydet ve bağlan**'a basın.

> Ana ekrandaki uygulamanın `localStorage`'ı Safari sekmesinden ayrıdır; ayarları
> ana ekran simgesinden açtıktan sonra girin.

---

## Kullanım

**Ana sayfa.** Her bölüm kendi renginde bir kart: **Yüzme** turkuaz, **Salon** amber
(SalonTakip bağlı değilse "Kurulmadı" → Ayarlar). Yüzme kartında takvimdeki ilk planlı idmanın tarihi (*Bugün · Çarşamba
23 Eylül*), günün blok renkli hattı ve set · mesafe · süre · ana set; altında iki düğme:
**İdmanı aç** o idmana doğrudan girer, **Takvim** hafta takvimini açar. Devam eden seans varsa
düğme **Seansa devam et** olur; planlı idman yoksa yalnız Takvim görünür. Altta **Yapılmış
idmanlar**, üstte ⚙︎ Ayarlar. Devam eden bir seans varsa uygulama doğrudan seansa açılır.
Takvim ve ana sayfa idman ekranıyla aynı nötr koyu tonlardadır; turkuaz yalnızca vurgudur.

**Gün seçimi (hafta takvimi).** Üstte haftanın 7 günü; idman olan günlerde nokta var,
bugün çerçeveli. Şeridi sağa/sola kaydırınca önceki/sonraki haftaya geçilir; başka
haftadayken **Bugün** düğmesi geri getirir. Bir güne ya da alttaki gün satırlarına dokunmak
yalnızca **seçer**: seçili günün kartında tarih, günün blok renkli hat önizlemesi, set,
mesafe, ana set ve hedef süre görünür. İdmana yalnızca alttaki **"… idmanını aç"**
düğmesiyle girilir. Açılışta bugün (plan yoksa en yakın planlı gün) seçilidir. Seçili
olmayan günlerin çubukları gri tonlardadır (ana set en açık, ısınma/soğuma en koyu).
Sol üstteki ‹ ana sayfaya döner.

**Program açılışı.** Tarih listesi her günün tüm setlerini de getirir ve telefonda saklanır;
"… idmanını aç" programı beklemeden açar. Tablodaki güncel hali arka planda kontrol edilir:
program değişmişse ve seansa henüz başlanmadıysa yenisiyle değiştirilir ("Program tablodan
güncellendi"), başlandıysa seans boyunca eldeki program korunur. (Eski Code.gs ile yaklaşan
ilk üç günün programı arka planda indirilir.)

**Program (metro hattı).** Setler bir metro hattının durakları gibi dizilir; hat her
bloğun renginde. Aktif durak "peron"da büyük bir kart olarak açılır (Tekrar × Mesafe,
Stil · Tür, açıklama, Hedef, Dinlen, Alet ve set / yığımlı mesafe); üstünde ve altında
ikişer durak görünür. Yukarı/aşağı kaydırdıkça hat akar ve bir sonraki durak perona gelir;
kaydırma bilerek "ağır"dır (bir durak için ~170 px, fırlatma en fazla bir durak); bırakınca en yakın durağa oturur. Hattın solundaki süreler yığımlı hedef süredir:
o sete kadar tekrar × (hedef + dinlen) toplamı. Üstte büyük yazıyla solda **Süre** (geçen / toplam hedef), sağda **Mesafe** (yüzülen / toplam); altında her set için blok renginde,
mesafesine oranlı bir ilerleme çubuğu. Program ekranı açıkken ekran sönmez (Screen Wake
Lock; desteklenmiyorsa sessizce devam eder). Kartın altında hedefin **100 m temposu**
(ör. `Tempo 1:35/100 · Z3`) bölge renginde görünür.

**Zamanlama (tek düğme).** Ayrı kronometre yoktur; ayrıntılı kurallar `ZAMANLAMA.md`'de.
- Alttaki büyük düğme **YÜZ → DUR → YÜZ → …** olur. İlk YÜZ idman saatini ve 1. tekrarı
  birlikte başlatır; son setin son DUR'u idmanı bitirir. Altındaki küçük yazı ne olacağını söyler
  ("7. tekrar başlar", "Son tekrar · set biter", "Son tekrar · idman biter"). Tekrar ve dinlenme
  süreleri yalnızca dokunuş zamanlarından hesaplanır; uygulama kapanıp açılsa da kaymaz.
- Yüzerken ve dinlenirken kartta set bilgisi (*Hedef · Dinlen · Alet* ve açıklamanın ilk satırı),
  tekrar durumu ve büyük saat: yüzerken yukarı sayar, dinlenirken plandaki dinlenmeden geri sayar,
  süre aşılınca eksiye kırmızı geçer. 4 ve altı tekrarda tekrar kutucukları; 5+ tekrarda tek satır
  şerit (yapılan yeşil, yüzülen sarı, dinlenilen mavi), **Tekrar 7/12**, ortalama ve son 3 süre.
- Setin son DUR'u seti bitirir ve kart sıradaki sete geçer. Bu **set sonu dinlenmesinde** sıradaki
  setin içeriği öne çıkar (stil · tür, açıklama, hedef, dinlen, alet, tempo); dinlenme sayacı kartın
  altında ince bir şerittir. Set sonu dinlenmesi biten sete yazılır.
- **Karta dokununca** (yüzerken de) setin tüm bilgisi büyük yazıyla açılır; dokununca kapanır.
- Dinlenmenin son 3 saniyesinde kısa bip, çıkış anında uzun bip; DUR'da onay sesi.
  Alt bardaki **Ses** düğmesi sesi açar/kapatır. iPhone sessiz moddaysa ses çıkmaz.
- Sol alt düğme: her basıştan sonra 5 saniye **Geri al**, sonra dinlenirken **⏸ Mola**.
  2 saniye içindeki ikinci dokunuş yok sayılır. Yüzerken setler kaydırılamaz ve ‹ çalışmaz.
- **Mola** (tuvalet arası vb.): yalnızca dinlenirken, sol alt düğmeden ya da ‹ → *Mola ver*.
  Mola ekranında idman saati, dinlenme sayacı ve bipler durur; yalnızca **DEVAM ET** molayı
  bitirir. Mola süresi idman süresinden ve dinlenme ölçümünden düşülür; özette "Mola 4:30"
  hazır ifadesi çıkar (işaretlenirse açıklamaya yazılır).
- **Seti erken bitirmek:** dinlenirken başka sete kaydırın; kart hangi setin kaç tekrarla
  kapanacağını yazar, YÜZ'e basınca önceki set n/N olarak kapanır. Geri kaydırmak vazgeçer.
- **İdmanı erken bitirmek:** ‹ → *İdmanı bitir ve kaydet* / *Devam et* / *Takvime dön (idman sürer)*.
- **Seti sıfırla:** tamamlanan sette düğme *SET TAMAM* olur; dokununca onay sorulur, onaylanırsa
  o setin tekrarları silinir ve set yeniden yapılabilir (diğer setler etkilenmez).
- Kayıttan sonra *Kaydedildi* ekranından geri dönünce takvim bugün seçili açılır.

**Tempo ve CSS bölgeleri.** sporRef bağlıysa CSS idman gününe, havuza (son seansın havuzu)
ve alete göre `css` sayfasından, bölgeler `zone` sayfasından gelir: REC · EN1 · EN2 · EN3 ·
SP1 · SP2 · SP3 (yavaştan hızlıya, her biri kendi renginde). Bağlı değilse Ayarlar'daki elle
girilen CSS (varsayılan 1:57) ve aynı 7 bölgenin varsayılan sınırları kullanılır. Drill/Kick
setlerinde ve CSS'i tanımlı olmayan aletle yüzülen setlerde tempo gösterilir, bölge verilmez.

**İdman anında düzenleme.** Karta dokununca açılan panelde **Düzenle · Sonrasına ekle · Sil**
(yüzerken sönük). Düzenle: ± tekrar/mesafe/hedef/dinlen, stil/tür/alet/blok seçenekleri, açıklama.
Biten set düzenlenmez, başlanan set silinmez, tekrar yapılandan aşağı inmez; başlanmış sette mesafe
ya da stil değişirse yapılan tekrarlar eski haliyle kalır, kalanlar yeni set olur. Dinlenirken
kartta **＋1 tekrar**. Silme ve +1 tekrarda 5 sn **Geri al**. Tabloya özgün setlerde değişen alanlar,
eklenen setlerde tüm alanlar yazılır; **Not**'a plan farkı düşülür (`Plan: 4×100 → 6×100, Hedef
1:30 → 1:25`, `idmanda eklendi`). `eski` sayfasında **Sıra, Set Mesafe, Set Süre** boş bırakılır
(tablo kendisi doldurur); `arsiv`'e planın özgün hali gider.

**Metin boyu.** Kart açıklaması başlık ile kutular arasındaki sabit alanı doldurur: kısa metin
büyür, uzun metin küçülür; alt sınırda da sığmazsa son satır "…" ile biter (tamamı ayrıntı
panelinde). Tek satırlık bilgiler kesilmek yerine küçülür.

**Salon.** Ana sayfadaki salon kartı → **Son idmanı tekrarla** (son günün hareketleri, son yapılan
değerlerle) ya da **Yeni idman planla**:
1. *Hedef*: kas grubu dağılımı (çubuk son 4 hafta, çizgi tüm zaman); öncelik için dokun
   (öncelik → ×2 → kapalı). Amaç, yüzmeye etki (aktarım katsayısı) ve ekipman süzgeçleri.
2. *Hareket seç*: puan = Σ(öncelik × `hkEtki` oranı) × yüzme aktarım katsayısı, 0–100.
   Son iki idmanda MSI ≥ 1,5 olan hareketin puanı yarıya iner ve ⚠ alır (gizlenmez). ▶ video YouTube'da açılır.
3. *Plan*: sıra (↑ ↓), son yapılan değerler + öneri (son seferde RPE ≤ 8 ve MSI ≤ 0,5 → +2,5 kg ya da
   +1 tekrar; RPE ≥ 9,5 ya da MSI ≥ 1,5 → aynı ⚠), süre tahmini set × (tekrar × 3 sn + 60 sn). Plan yalnızca telefonda.

İdmanda büyük düğme **BAŞLA / BİTTİ**; set tekrarı kartta ± ile düzeltilir; dinlenme sayacı, bipler,
mola, Geri al, dinlenirken **＋1 set**. Süreli hareketler (Plank vb.) geri sayar ve kendiliğinden biter.
Hareketin son setinden sonra **nabız** (± geçen değerle hazır), **RPE** 6–10, **MSI** (sporRef açıklamasıyla)
ve **not** girilir. Kart paneli: Düzenle · **Değiştir** (aynı kas grubundan puanlı liste) · Sonrasına ekle · Sil.
Bitince özet → **Kaydet**; bağlantı yoksa kuyruğa alınır ve bağlantı gelince gönderilir.

**Seans sonu.** Üç kısa adım:
1. **RPE** — 0–10 arası tek dokunuş (5 sn içinde *İdmana dön* ile son adım geri alınır).
2. **MSI** — *Ağrı yok* ya da vücut şemasında bölgeye dokundukça 0,5 → 1 → 1,5 → 2 → 3 → boş.
   Dokunulmayan bölge kaydedilmez; MSI seans sayfasına `sag omuz 1; bel 0.5` biçiminde yazılır.
3. **Özet ve kaydet** — süre (ilk YÜZ → bitiş, molalar hariç) ve mesafe (yapılan tekrarlar × mesafe)
   otomatik; havuz 25/50 (son seçim hatırlanır); hazır ifadeler ve açıklama. Her set için
   ortalama tekrar süresi **Gerçek**'e gider. Nota yazılabilecek satırlar (tekrar süreleri,
   plandan belirgin sapan dinlenmeler, eksik tekrar) işaret kutusuyla gösterilir; yalnızca
   işaretlenenler **Not**'a yazılır. Ortancadan çok sapan (unutulmuş dokunuş) tekrar
   işaretlenir; düzeltilebilir veya ortalamadan çıkarılabilir.

**Çevrimdışı ve kurtarma.**
- Seçilen günün programı ve devam eden seansın tüm durumu (dokunuş olayları, seans sonu
  girişleri) her değişiklikte cihazda saklanır; uygulama kapanırsa kaldığı yerden açılır.
  Sürüm 9 ve öncesinden kalan seans yeni modele taşınır (işaretli setler ve turlar korunur).
- Kayıt gönderilemezse (internet yok, sunucu meşgul) kuyruğa alınır; uygulama her
  açılışta, bağlantı geldiğinde ve öne getirildiğinde yeniden dener. Kuyruk gün seçimi
  ekranında görünür.

**Yapılmış idmanlar.** Biten her seans (tabloya gönderilen, kuyrukta bekleyen veya zaten
kayıtlı çıkan) telefonda saklanır ve **otomatik silinmez**. Ana sayfadaki *Yapılmış
idmanlar* listesinde tarih, set, mesafe, süre ve durum (*Tabloda*, *Kuyrukta*, *Zaten
kayıtlıydı*) görünür; bir kayda dokununca setler, Gerçek süreler ve notlar açılır. Kayıtlar
tek tek veya **Sil…** ile toplu (tabloya gidenler / tümü) silinir; silmeden önce onay
sorulur, gönderilmemiş kayıt için ayrıca uyarılır. Buradan silmek ne tabloyu ne de
gönderim kuyruğunu etkiler.

## Arka uç davranışı (`finishSession`)

1. `eski` (veya `seans`) sayfasında o tarih varsa **DUPLICATE** döner, hiçbir şey yazılmaz.
2. Tamamlanan setler, Plan'daki satırları kaynak alınarak **orijinal Sıra değerine göre**
   `eski`'ye eklenir; Gerçek/Kulaç/Nabız/RPE/MSI/Not uygulamadan gelen değerlerle dolar.
   Satırlar başlığın hemen altına (2. satırdan itibaren) eklenir, böylece en yeni seans
   en üstte durur; yeni satırlar mevcut ilk veri satırının biçimini alır.
3. Yazılan satır sayısı doğrulanır; tutmazsa **WRITE_MISMATCH**.
4. `seans` sayfasına tek satır eklenir (o da 2. satıra, en yeni en üstte).
5. Ancak 2–4 başarılıysa o tarihin **tüm** Plan satırları Sıra sırasıyla `arsiv`
   sayfasının en üstüne kopyalanır (sayfa yoksa oluşturulur) ve sayısı doğrulanır.
6. Arşiv doğrulanınca Plan satırları silinir.

2–4 arasında bir hata olursa bu çağrının eklediği satırlar geri alınır ve Plan'a
dokunulmaz. Arşivleme başarısız olursa seans yine kaydedilmiş sayılır ama Plan satırları
silinmez (cevapta `uyari`). Tüm yazma işlemleri `LockService` kilidi altında yapılır (30 sn bekler,
alamazsa **LOCKED**).

Hata kodları: `AUTH`, `LOCKED`, `DUPLICATE`, `NOT_FOUND`, `PLAN_MISMATCH`,
`WRITE_MISMATCH`, `MISSING_COLUMN`, `NO_SHEET`, `BAD_REQUEST`, `SERVER`.

### Sürüm 13.2'ye geçiş (iki dosya, iki betik)

1. **idman** dosyasında: Uzantılar → Apps Script → eski kodu silip `idman.gs`'i yapıştır → `tokenUret` → Dağıt
   (yeni dağıtım ya da mevcut dağıtımda "Yeni sürüm"). Sayfa adları: havuzPlan, havuzVeri, havuzSeans, salonVeri, salonPlan.
2. **idmanRef** dosyasında: aynı adımlar `idmanRef.gs` ile. Sayfa adları: zone, css, alet, bilgi (BW satırı dahil),
   RPE, MSI, faz, salonHar, salonHKEtki.
3. Telefonda **Ayarlar → Bağlantılar**: idman ve idmanRef adresleri + anahtarları → Kaydet ve bağlan. Ayrı salon
   bağlantısı artık yok (eski kayıt yok sayılır).
4. Eski `arsiv` sayfası artık kullanılmaz (silinebilir).

### Sürüm 13'e geçiş

1. SalonTakip'te `Salon.gs`'i yenisiyle değiştirip **Yeni sürüm** olarak dağıtın (adres ve anahtar değişmez).
   Yalnızca salon programı (`plan` sayfası) için gerekir; eski betikle uygulama "Salon.gs eski" der, gerisi çalışır.
   `Code.gs` ve `SporRef.gs` değişmedi.
2. Videolar YouTube'un çerezsiz oynatıcısıyla (youtube-nocookie) gömülür; CSP'ye
   `frame-src https://www.youtube-nocookie.com` eklendi. İnternet yokken fotoğraf ve adımlar gösterilir.
3. Telefonda yeni yerel anahtarlar: `ysk.hazir` (hazır olma kontrolleri, 60 gün), `ysk.hareketNot` (harekete sabit not);
   ayarlar: `yer` (Salon/Ev/Otel), `bildirim`. Ayarlar → Yedek indir: anahtarlar hariç JSON.

## Sürüm 13.8'de neler var (dağıtım: idman.gs yeni sürüm)

- **Etiket:** yuzmePlan / yuzmeVeri'de isteğe bağlı **Etiket** sütunu. Plandan okunur; ayrıntı panelinde ve özette
  "🏷" ile görünür; idmanda Düzenle'den ya da (yüzerken / biten sette) "Etiket yaz" ile değiştirilir; yuzmeVeri'nin
  Etiket sütununa yazılır (yalnız etiket değişince Not'a plan farkı yazılmaz). Sütun yoksa hiçbir şey değişmez.

## Sürüm 13.7'de neler var (dağıtım gerekmez)

- **Mesafeyi düzelt:** set yüzülürken (karta dokun → ayrıntı paneli), bitince (biten sete dokun) ya da özette
  setin yüzülen mesafesi değiştirilebilir (± havuz boyu, ±100). Yapılan tekrarlar yeni mesafeyle sayılır (tempo,
  toplam); tabloya Mesafe yeni değerle, Not'a "Plan: 1×1500 → 1×1600" yazılır. Dokunuşlar ve süreler değişmez.

## Sürüm 13.6'da neler var (dağıtım gerekmez)

- **Hareket değiştir (P3):** idmanda "Değiştir" listesinin üstünde aynı ana kas grubundan, kısıta ve yerdeki
  ekipmana uygun en iyi 3 alternatif (kas örtüşmesine göre); planlamada her hareketin altında "⇄ yerine: …".
- **Çevrimdışı açılış (F7):** `sw.js` uygulama dosyalarını telefonda saklar; internet yokken de uygulama açılır.
  Tablo (Apps Script) istekleri önbelleğe alınmaz. Yeni sürüm internet varken ilk açılışta gelir.
- **Görünüm:** Ayarlar → Görünüm'de tema (Koyu / Açık / Sistem) ve yazı boyutu (Küçük / Normal / Büyük / Çok büyük);
  yeni uygulama simgesi (dambıl + dalga; ana ekrandan silip yeniden ekleyince görünür), SVG geri/ileri okları,
  kurulumda bağlantı kartları, "Kaydedildi"de çizilen onay, kısa ekran geçişleri (telefonda "hareketi azalt"
  açıksa kapalı).

## Sürüm 13.5'te neler var (dağıtım gerekmez)

- **Form ve denge:** bu hafta / son 4 hafta yük oranı (toplam, yüzme, kara; 0,8–1,3 yeşil · 1,3–1,5 sarı · üstü
  turuncu), yükün haftaya dağılımı (monotoni ve zorlanma), form eğrisi (kondisyon / yorgunluk, trend etiketi; "kara
  yükü yalnız yorgunluğa" ayarı), bu haftanın bölge dağılımı faz hedefine göre ve eksik bölge uyarısı.
- **Ana sayfa:** hazır olma senin son 28 günlük ortalamana göre (en az 7 kontrol) ve en etkili 2 neden; son kara
  idmanından 14 günden fazla geçtiyse kara kartında uyarı.
- **Bu hafta:** plan / yapılan uyumu (yüzme süresi plana göre ±%20 yeşil, kaçan gün kırmızı) ve uyarlama önerisi
  (tabloya yazmaz).
- **Yüzme özeti:** CSS'e göre stres puanı (RPE girilmese de) ve aynı standart sette RPE kayması.
- **Kara planlama:** döngü haftasının reçetesi (Hacim 3 × 12–15 RIR 2–3 … Kuvvet 3 × 6–8) ve geçen idmana göre öneri.
- Hesaplar `gosterge.js`'te (saf işlevler, `tests/test-gosterge.mjs`).

## Sürüm 13.4'te neler var

- **Yeni sayfa adları:** yuzmePlan / yuzmeVeri / yuzmeSeans, karaPlan / karaVeri / karaSeans (eski adlar da tanınır).
- **karaSeans:** kara idmanı özetinde "İdmanın geneli" — RPE, MSI, Yer (Salon/Ev/Otel), not; tek satır yazılır. Yük
  hesabı bu satırın gerçek süresi × RPE'siyle yapılır (yoksa eski tahmin).
- **idmanKutuphane:** hareket kataloğu ve kas etkileri ayrı dosyada; üçüncü betik ve bağlantı. Kurulmamışsa idmanRef'teki
  eski sayfalar kullanılır.
- **Terimler:** arayüzde "salon" yerine kara idmanı, "havuz" yerine yüzme (yer seçeneği "Salon" ve havuz boyu aynı).

## Sürüm 13.3'te neler var

- **Salon kartı yüzme kartı gibi:** ana sayfadaki salon kartı planı idman dosyasının **salonPlan** sayfasından okur
  (yüzmedeki havuzPlan gibi). Bugünün planı, yoksa sıradaki planlı gün gösterilir: gün başlığı, metro çizgisi
  (durak = hareket, renk = kas grubu, uzunluk = set), hareket listesi; **İdmanı aç** · **Takvim** · **＋ Planla**.
  Plan yoksa "＋ İdman planla".
- **salonVeri şablon değil:** "Son idmanı tekrarla / düzenle" kalktı. salonVeri yalnızca artış önerisi, rekorlar,
  yük/form, haftalık set ve süre tahmini için okunur.
- **Planlama salonPlan'a yazar:** planlamanın son adımında **Plana yaz** (gün seçilir); telefona yerel "hazır plan"
  kaydedilmez (eski sürümden kalan yerel plan varsa bir kez kullanılır).
- **Artış önerisi plana göre:** idman başında yalnızca plandaki değerden yüksek öneriler sorulur; "Hiçbiri" plandaki
  değerlerle başlar.
- İdman kaydedilince salonVeri'ye yazılır, o günün salonPlan satırları silinir (13.2.1).

## Sürüm 13.2'de neler var

- **İki dosya, iki betik:** idman (havuzPlan, havuzVeri, havuzSeans, salonVeri, salonPlan) ve idmanRef (referanslar +
  salonHar, salonHKEtki, bilgi BW, faz). Uygulamada iki bağlantı; salon idman bağlantısını kullanır, hareket kataloğu
  idmanRef'ten gelir. Arşiv kaldırıldı. Kurulum ve geçiş: bölüm 1–2 ve "Sürüm 13.2'ye geçiş".
- **13.2.1:** salon geçmişi daha hızlı okunur (salonVeri'de yalnızca gereken sütunlar, görünen değer yalnızca Süre);
  salon bağlantısı için bekleme süresi 60 sn (büyük idman dosyası + yeni dağıtımın ilk çağrısı).
  havuzSeans sayfası isteğe bağlı: yoksa seans satırı yazılmaz; planlar havuzPlan/salonPlan'dan okunur,
  biten idmanlar havuzVeri/salonVeri'ye yazılır.
  Salon da havuz gibi: idman kaydedilince günün salonPlan satırları silinir (artık "yapıldı" işareti yok).
- **Süre biçimleri:** betik süreleri saat haneli yazar (planlanan `[h]:mm:ss`, ölçülen `[h]:mm:ss.0`).
- **Tablonun hesapladığı sütunlar:** havuzVeri/salonVeri'de betiğin doldurmadığı sütunlarda üstteki satırın formülü
  yeni satırlara kopyalanır; değer yazılmaz, sütunlar kaymaz.

## Sürüm 13.1'de neler var

- **Ad:** uygulama artık **idmanSK** (ekran, ana ekran adı, yedek dosyası `idmansk-yedek-….json`). Telefondaki veri
  anahtarları (`ysk.*`) aynen kalır: geçmiş ve ayarlar kaybolmaz. iPhone'da ana ekrandaki ad, uygulama silinip yeniden
  eklenince güncellenir.
- **CSS:** varsayılan CSS yok. sporRef'te bugünü kapsayan satır yoksa (ya da elle CSS girilmediyse) tempo bölgesi
  gösterilmez, program açılınca uyarı çıkar. Drill/Kick/Scull setlerinde **TEC**, Tür `Test` setlerinde **TEST** yazar.
- **Yüzme:** hedefin %20'sinden kısa tekrar sorulur (Geri al ya da özette düzelt/çıkar); biten setin tekrar süreleri
  idmanda düzeltilir; süresi olmayan tamamlanmış set için kaydetmeden önce uyarı.
- **Salon:** ilerleme önerisi sormadan uygulanmaz (idman başında Kabul / Hiçbiri); bant ve vücut ağırlığında kg değil
  +1 tekrar; nabız boş başlar (ölçülmediyse yazılmaz); biten setlerin tekrarı ve ağırlığı sonradan düzeltilir; süre
  tahmini idman sayfasının Süre sütunundan (gerçek süreler) öğrenilir.
- **Faz takvimi + döngü:** sporRef `fazBilgi` (faz tarihleri) üstte, 4 haftalık döngü içinde. Döngü ve yasaklar sporRef
  `kisit` sayfasına satır: `dongu_F1` = `Hacim, Hacim+, Hacim+, Dinlenme`, `yasak_F1` = `SP, Kuvvet`.
- **Yüzme / salon ayrı günler:** `kisit`'e `gun_hafta_yuzme` (3), `gun_hafta_salon` (2), `salon_dk` (50), `salon_rpe` (5)
  yazılırsa yüzme ve salon günleri ayrı sayılır, normal haftaya salon payı eklenir (3 × 65 × 6 + 2 × 50 × 5).
  Satırlar yoksa eski davranış (toplam 3 gün).
- Bu sürüm için **betik dağıtımı gerekmez**; `kisit` ve `fazBilgi` satırları mevcut SporRef.gs ile okunur.

## Sürüm 13'te neler var

- **Bu hafta** (ana sayfa → "🗓 Bu hafta"): yüzme + salon tek plan. Ortak döngü fazı (Hacim → Hacim+ → Kuvvet → Dinlenme;
  Form ve denge'de başlatılır), haftalık yük hedefi (geçen haftadan en çok %10, aradan dönüşte %20, yük hızlı arttıysa
  %20 az), eklem bütçeleri (omuz yükü, kurbağalama %, diz bükümlü setler; ağrıda sınır daralır), 7 gün:
  yapılan → programdaki → öneri (Cuma akşam yüzme; Sal–Per'de salon, yüzmeye komşu olmayan güne). Hazır olma
  "dinlen" ise bugün öneri yok. Önerilen salon günü "Salonu planla" ile düzenlenip `plan` sayfasına yazılır.
  Yüzme önerisi tabloya yazılmaz (Code.gs değişmedi). CSS testi 28 günde bir hatırlatılır.
- **Salon programı**: haftalık ekran; boş güne planla, Düzenle, Sil, İdmana başla; bugünün programı ana sayfada.
- **Hareket videoları**: kartta sessiz döngü video (OPEX öncelikli 61 hareket; H · Video sütunu önce), Türkçe adımlar,
  harekete sabit not, ağırlık adımı; idmanda "▶ Form".
- **Pratik öneriler**: günlük hazır olma kontrolü, RIR → RPE, son set türü, Salon/Ev/Otel süzgeci, haftalık set /
  kas grubu (10–20, omuz ≤ 12), salon programı uyumu, dinlenme haftası önerisi, dinlenme sonu bildirimi
  (iPhone'da yalnızca ana ekrana eklenmiş uygulamada ve izin verilirse), JSON yedek.

## Sürüm 12'de neler var

- **Ana sayfa**: haftalık şerit (bu hafta gün sayısı, omuz önleyici, form), bugünün önerisi (süre bütçesi, toparlanma,
  önleyici borç), kurbağalama payı, yük artış uyarısı, CSS testi zamanı; Pazar günü "Haftanın özeti hazır".
- **Form ve denge**: kondisyon / yorgunluk / form (TrainingPeaks PMC mantığı, 42 ve 7 günlük ortalama), yük artış oranı
  (7 gün / 28 gün; güvenli 0,8–1,3), kas toparlanması haritası, kolay/eşik/hız dengesi, stil payları, haftanın iskeleti,
  4 haftalık blok (Hacim → Hacim+ → Kuvvet → Dinlenme). 6 haftadan kısa kayıtta form "veri birikiyor" olarak gösterilir.
- **Haftanın özeti**: km, set, seans, form, haftalık yük ve geçen hafta kıyası, stil, ağrı, günler, notlar (kişisel; paylaşım yok).
- **Salon**: kas haritasıyla planlama (dokun → ★, iki kez → ★★), sağlık kısıtı filtresi (⊘ + güvenli alternatif),
  önleyici borç, kayıtlı plan ve ana sayfadan doğrudan giriş, otomatik ilerleme ("geri al"; ⚠ varsa öneri yok),
  ısınma, ağrı → hafiflet/durdur, rekorlar, hacim, kıyas, süperset, hareket bilgi kartları ve grafik.
- **Yüzme**: set sonu kulaç + nabız (norm uyarısı), aerobik blok sonunda omuz rahatlatma, drill videosu, SWOLF,
  bölgelerde süre, aynı setle kıyas ve rekor, ağrı haritası + son 4 hafta, CSS testi ve derece tahmini, tempo grafiği.
- **Takvim**: gün düğmelerinde salon simgesi, günlük yük çubuğu, ağrı işareti.
- Dinlenme sonu bildirimi kilitli telefonda (service worker gerekir) bu sürümde yok; salonda ekran açık kalır ve titreşim verilir.
- Garmin bağlantısı sonraki sürüme bırakıldı.
- **12.1:** haritada dokun = seç / bırak (renkler sabit, ✓), ağırlık 1–5 altta; ana sayfa salon kartında kas grupları +
  hareket listesi, "Düzenle" ile son idmandan plan; Form ve denge sadeleşti: yük normal haftaya göre (3 × 65 dk × RPE 6;
  sporRef `kisit`: `seans_dk`, `seans_rpe`), aradan dönüşte yanlış "yük hızlı arttı" uyarısı yok.

## Kaynaklar ve lisanslar

- Kas haritası görseli kullanıcının kendi görselinden üretildi (`tasarim/v27/kaynak/`).
- Hareket fotoğrafları ve açıklamaları: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, kamu malı).
- Hareket adımlarının metni: [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (MIT; lisans notu `adimlar.js` başında).
  Veri setinin animasyonları (© Gym visual) lisanssız olduğundan **kullanılmaz**.
- Videolar YouTube'da sahiplerinde durur, uygulama yalnızca YouTube'un oynatıcısıyla gömer (dosya kopyalanmaz).
- Yazı tipleri Archivo ve Barlow Condensed: SIL Open Font License.

## Mimari ve Faz 2

Arayüz (`app.js`) tabloya, `localStorage`'a veya kuyruğa doğrudan erişmez; hepsi `data.js`
üzerinden geçer. Faz 2'de Garmin/FIT gibi yeni kaynaklar `data.js`'e yeni fonksiyon,
`Code.gs`'e yeni `action` olarak eklenir. Seans durumu bir olay listesidir
(`basla`, `cik`, `geldim`, `bitir` + zaman damgası); tüm süreler `zaman.js` ile bu listeden
hesaplanır. Garmin verisi aynı set alanlarını (Gerçek, Kulaç, Nabız, Not) doldurabilir.

## Testler

```sh
sh tests/run-all.sh           # hepsi
node tests/test-gas.cjs       # idman.gs yüzme ana akış (sahte SpreadsheetApp, bağımlılık yok)
node tests/test-gas-edge.cjs  # idman.gs uç durumlar: kimlik, başlıklar, tarih/süre biçimleri, geri alma, kilit
node tests/test-gas-salon.cjs # idman.gs salon + idmanRef.gs: okuma, idman'a yazma (A–J + K Süre), DUPLICATE, geri alma
node tests/test-data.mjs      # data.js: 3 bağlantı, önbellek, kuyruk (yüzme + salon), geçmiş, hata kodları
node tests/test-ref.mjs       # ref.js: CSS seçimi (gün/havuz/alet), 7 bölge, RPE/MSI açıklaması
node tests/test-duzen.mjs     # duzen.js: ekle/sil, olay kaydırma, plan farkı notu, kısıtlar
node tests/test-salon.mjs     # salon.js: set/dinlenme durumu, tabloya giden satırlar, puan, öneri
node tests/test-zaman.mjs     # zaman.js: olaylardan süreler, düğme sırası, bip, şüpheli tekrar
node tests/test-cekirdek.mjs  # grup.js, kisit.js, yuk.js, analiz.js, bilgi.js (Sürüm 12 çekirdeği)
node tests/e2e-senaryolar.cjs [filtre]  # 50+ uçtan uca senaryo (Playwright + Chromium)
node tests/e2e-surum12.cjs [filtre]     # Sürüm 12 senaryoları (harita, kısıt, ilerleme, yüzme analizi, form, haftanın özeti)
node tests/test-e2e.cjs       # baştan sona tam akış
```

Uçtan uca testler için Playwright gerekir (global kuruluysa `NODE_PATH=$(npm root -g)`).
Senaryolar: tam idman (otomatik set geçişi, son DUR'la bitiş), tek basışla başlangıç, 12 tekrarlı
set şeridi, set sonu kartı, ayrıntı paneli, mola, dinlenme sayacı ve bipler,
ses düğmesi, çift dokunma ve geri al, yüzerken kaydırma/‹ kilidi, seti ve idmanı erken bitirme,
şüpheli tekrar düzeltme, dinlenme notu onayı, RPE/MSI/havuz, yeniden açılışta devam, Sürüm 9
seansının taşınması, hızlı açılış ve arka plan yenileme, eski Code.gs uyumu, çevrimdışı,
geçersiz anahtar, kalıcı/geçici sunucu hataları, DUPLICATE, gizli hata ayrıntısı, gün değiştirme,
40 setlik program, kuyruk ve geçmiş yönetimi, ayarlar, kurulum (3 bağlantı), sporRef CSS/bölge,
idman anında düzenleme ve kısıtları, metin boyu, salon (tekrarla, planla, BAŞLA/BİTTİ, giriş, özet,
kuyruk, Değiştir/Sil, süreli hareket), 320–430 px ekranlarda taşma.
