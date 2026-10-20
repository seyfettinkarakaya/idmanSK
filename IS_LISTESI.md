# YüzmeSK — İş listesi

Talepler ve hatalar burada toplanır; kod ancak "uygula" denince, listedeki
bekleyen işlerin tamamı birlikte güncellenir.

## 1. Aşama — Acil

Tamamlandı (sürüm 8), bkz. Tamamlanan. Kalan: Code.gs'in yeniden dağıtılması (aşağıda).

## Sıradaki

### Açık işler özeti (temizlik 14.10.2026)
- **Yapıldı (13.6.0, 14.10):** P3 aynı kas grubundan alternatif; F.7 çevrimdışı açılış; görünüm paketi (kurulum kartları,
  "Kaydedildi" animasyonu, SVG simgeler, yeni uygulama simgesi, ekran geçişi, açık tema, yazı boyutu).
- **Beklemede (kullanıcı 14.10):** B20 gün düzeni ve B21 zaruri/seçimlik — bilgi sayfası önerisi hazır (aşağıda maddelerde).
- **Yapıldı (13.5.0, 14.10):** B1, B5, B7, B9, B10, B11, B16, B17, B18.
- **Karar bekliyor:** B2, B3 (açıklama verildi).
- **Ertelendi:** uzak duvar ölçümü, P3-1 (+1 sn; veri gerekli), F4 saat verisi.
- **İptal:** B4, B6, B8, B12, B13, B14, B19, B22, B23, P7 (barbell yok), P8; Gym visual GIF seti.
- **Tabloda (kullanıcı):** Hafta formülü "Sezon Hafta"; Hedef Zone formülü Kick/Drill/Test; idmanRef'te eski salonHar/salonHKEtki silinebilir.
- **İzlenecek:** 13.4 ilk kara idmanı (karaVeri / karaSeans / karaPlan).

### Sürüm 12.1.0 (04.10.2026) — ekran görüntüleriyle bildirilen hatalar, YAPILDI
- [x] Haritada seç/bırak: dokun = seç, tekrar dokun = bırak; renkler sabit (seçince diğerleri griye dönmüyor),
  seçilen kasta beyaz ✓ işareti ve parıltı. Ağırlık (1–5) haritanın altındaki "Seçili bölgeler" listesinde, ✕ ile bırak.
- [x] Ana sayfa salon kartı: uzun virgüllü metin yerine kas grubu çubuğu + payları (Omuz %40 …) ve hareket
  listesi (ad · set×tekrar; ilk 5, "+N hareket daha"); süre "~1 sa 47 dk" biçiminde.
- [x] Son idmanı şablon alıp düzenleme: ana sayfada "Düzenle" ve salon başlangıcında "Son idmanı düzenle" →
  planın 3. adımı; değere dokun → set/tekrar/ağırlık/dinlenme; çıkar, sırala, süperset, "＋ Hareket ekle"; Kaydet.
- [x] "Nasıl yapılır" düğmesi büyük (40 px), uygulamadaki fotoğraf küçük resim olarak.
- [x] Form ve denge mantık hataları:
  - Yük artış oranı aradan dönüşte anlamsız büyüyordu (4 hafta boşluk + 2 hafif idman = 4 → "dinlenme haftası").
    Payda artık en az "normal hafta" (3 seans × 65 dk × RPE 6 = 1.170; sporRef kisit: seans_dk, seans_rpe);
    kronik yük normalin yarısından azsa "aradan dönüş: haftada en çok %20 artır".
  - "Form −69 yorgun" (kondisyon − yorgunluk) aynı nedenle yanıltıcıydı → kaldırıldı. Yerine: bu haftanın yükü
    normal haftaya göre % (az / normal / yüksek), son 8 hafta çubuk grafiği (yüzme + salon, normal hafta çizgisi), tek
    cümlelik sonuç.
  - Kas haritası neyi anlattığı belirsizdi → "Kas yorgunluğu": yalnızca toparlanması %90 altı kaslar, açıklama
    ("renk koyulaştıkça daha yorgun"), kaynak (yüzmeden/salondan); hepsi dinlenmişse harita yok.
  - Yoğunluk dengesi hedefleriyle (kolay ~%75, eşik ~%15, hız ~%10) ve tek cümle yorum.
  - 4 haftalık döngü başlatılmadan "1. hafta · Hacim" gösteriliyordu → yalnızca başlatılınca; durdurulabilir.
- [x] Hareket fotoğrafı eşlemesi: "Deadbug" = "Dead Bug"; eşleme önbellekte (her dokunuşta 876 kayıt taranmıyor).

### Hareket görselleri — daha zengin kaynak (araştırma 04.10.2026; karar bekliyor)
Bugün: free-exercise-db (Unlicense) 2 fotoğraf/hareket; senin 16 hareketinden 9'u eşleşiyor, 7'sinde görsel yok
(Band Chest Fly, Breathing Reset, Doorway Pec Stretch, Thread the Needle, Figure Four, Dead Hang, Band Glute Bridge
yanlış ekipmanla). Seçenekler:
- [-] **exercises-dataset (hasaneyldrm, GitHub):** 1.324 hareket, her biri **animasyonlu GIF** + küçük resim, adımlar — İPTAL (kullanıcı: Gym visual GIF'leri kullanılmıyor)
  10 dilde (**Türkçe dahil**). Görseller Gym visual'a ait, izinle dağıtılıyor: yalnız 180×180, her kullanımda
  "© Gym visual" yazılmalı. Kişisel uygulama için en uygun içerik; lisans notu (NOTICE) kurulumdan önce okunmalı.
- [ ] **wger:** ~800+ hareket, CC BY-SA 3.0 (kaynak gösterilir, aynı lisansla paylaşılır); görsel kapsamı düzensiz.
- [ ] **Everkinetic:** ~100 temel hareket, başlangıç/bitiş çizimleri (SVG), CC BY-SA 3.0; sade ve net.
- [ ] **ExerciseDB:** 1.500+ GIF/video; ticari lisans tek seferlik ücretli.
- [ ] Esneme / nefes / rehab hareketleri (Breathing Reset, Thread the Needle, Figure Four, Doorway Pec) veri
  setlerinde zayıf → bunlar için H'deki **Video** sütunu (YouTube, uygulama içinde oynatma) en sağlam yol.
Öneri: GIF seti (yalnız senin hareketlerin, ~40–60 dosya, uygulamaya gömülü) + rehab/esneme için video;
free-exercise-db yedek. Karar: hangi kaynak?
İnceleme (04.10.2026, exercises-dataset indirildi): 1.324 hareket; gruplama vücut bölgesi (10) + ekipman (28) +
hedef kas + yardımcı kaslar; adımlar madde madde, Türkçe dahil. **Veri ve metinler MIT** (serbest). **GIF'ler
Gym visual'ın**: depoyu kopyalamak lisans vermez; kullanım Gym visual koşullarına bağlı (sitesi buradan açılamadı),
gerekirse izin/lisans alınmalı. Kapsam: senin 16 hareketinden 5 birebir, 5 yakın, 6 yok (esneme/nefes/asılma).
Bant hareketleri 61, esneme 57. Örnek ekranlar yerelde üretilir (`tasarim/v28/kaynak/yap.py`; çıktı depoya konmaz).
**Lisans araştırması (04.10.2026):**
- Veri + Türkçe adımlar: MIT → serbest; MIT telif satırı korunur (uygulamada "Kaynaklar ve lisanslar").
- GIF'ler: © Gym visual. Veri setinin izni yalnızca o depoya; "depoyu kopyalamak lisans değildir". Kaynağından
  göstermek (hotlink) de lisans sayılmaz. Gym visual sitesindeki filigranlı önizlemeler de tam telifli.
- Yasal yol: Gym visual'dan satın alma (N-CRFL: tek seferlik, süresiz, dünya çapında; mobil uygulama ve web sayfasında
  kullanım **izinli**; yeniden satış/dağıtım, stok sitesi, yapay zekâ platformu **yasak**). Fiyat (fiyat sayfasından
  arama özetine göre): GIF başı 1–9 adet 3,6 $, 10+ adet 0,9 $ → 16–60 hareket ≈ 15–55 $.
- Açık soru (satın almadan önce Gym visual'a yazılmalı): GIF'lerin **herkese açık GitHub deposunda** durması
  "yeniden dağıtım" sayılır mı? Sayılırsa: depo özel + yayın başka yerden, ya da GIF'ler uygulamaya ilk açılışta
  kişisel bir kaynaktan (ör. Google Drive) indirilir.
- Not: gymvisual.com bu ortamdan açılamadı; koşullar arama sonuçlarındaki lisans/fiyat sayfası özetlerinden.
  Satın almadan önce https://gymvisual.com/content/9-license ve /content/6-price-rules okunmalı.
**Serbest video araştırması (04.10.2026):** uygulamada serbestçe kullanılabilen büyük bir hareket video kütüphanesi yok.
- Vector Fitness ücretsiz paket (305 video): uygulama/web uygulamasında kullanım **yasak** (yalnız sosyal medya, eğitim).
- Your Move (ymove) ücretsiz 25 video: uygulamada kullanım **serbest**, atıf isteğe bağlı; yalnız 25 hareket.
- Wikimedia Commons "Fitness animations" (~57) ve "Videos of exercise" (~25): CC BY-SA (atıf + aynı lisans); az ve dağınık.
- Mixkit / Videezy stok videoları: hareket öğretmek için çekilmemiş (atmosfer görüntüsü).
- **YouTube gömme (önerilen):** YouTube'un kendi oynatıcısıyla gömmek, sahibi gömmeye izin verdiği sürece serbest;
  dosya bizde durmaz, lisans gerekmez. Fizyoterapist/antrenör kanallarından hareket başına bir video seçilir,
  H'deki Video sütununa yazılır; uygulama içinde youtube-nocookie ile oynar (CSP frame-src eklenir), istenen
  saniyeden başlar. İnternetsizken açılmaz. Esneme/nefes/rehab hareketleri için de en iyi kaynak.
- [x] Karar (04.10.2026): YouTube gömme + exercises-dataset metinleri (MIT) + free-exercise-db fotoğrafları.
- [x] Video listesi (16 hareket, öneri + yedek): `tasarim/video/liste.csv` → kullanıcı kontrol eder → H'deki Video **(13.1.0: 61 hareketlik liste uygulamada; yerini aşağıdaki aldı)**
  sütununa yazılır. Videolar buradan izlenemedi (YouTube bu ortamda kapalı); yalnızca adı ve kanalıyla seçildi.
  Sahibi gömmeyi kapattıysa uygulama YouTube bağlantısına düşer. H'deki diğer hareketler için liste genişletilecek.
- [x] Video listesi (04.10.2026): idman sayfasındaki 61 hareketin tamamı, OPEX öncelikli (33 OPEX, 4 beğenilen,
  24 diğer kısa video) → `tasarim/video/liste.csv`. Kullanıcı onayladı: **uygulamada kaynak olarak kullanılacak.**
- [ ] **Video kaynak kanalları** (04.10.2026): 1. OPEX (shorts, en beğenilen), yedek: **KAIFIT** (@KAIFIT-ch) ve
  **Yuryfit** (kullanıcı önerisi: iyi videolar). OPEX'te olmayan 28 hareket (`liste.csv`'de Kaynak boş) için önce
  bu iki kanaldan kısa (10–15 sn) video aranır; bulunanlar listeye yazılıp `videolar.js` yeniden üretilir.
  Not: YouTube bu ortamda kapalı; kanal içeriği buradan taranamıyor → kullanıcı bağlantı verirse doğrudan eklenir,
  ya da arama sonuçlarından ad + kanal ile seçilir ve telefonda kontrol edilir.
- [x] **Uygulamada hareket videoları** (örnek ekranlar: `tasarim/v29/ornek.html`): **(13.0.0: yapıldı — kart, seçim, idman "▶ Form", çevrimdışı fotoğraf, Ayarlar özeti)**
  - Kaynak: liste uygulamaya gömülü (`videolar.js`, CSV'den üretilir); H'deki Video sütunu doluysa o önce gelir.
  - Oynatıcı: YouTube'un kendi oynatıcısı (youtube-nocookie gömme; CSP `frame-src` eklenir), sessiz, döngü,
    isteğe bağlı saniye aralığı (başla–bitir, 10–15 sn); "YouTube'da aç" ve "Video değiştir".
  - Yerler: bilgi kartının başı (1), hareket seçiminde küçük önizleme + süre (2), idmanda dinlenirken sıradaki
    hareketin döngüsü (3), çevrimdışıyken fotoğraf + adımlar (4); Ayarlar'da kaynak özeti.
  - Videosu olmayan hareket: "bağlantı ekle" (H · Video). Gömme kapalıysa YouTube bağlantısı.
  - Test: gömme adresi ve döngü parametreleri, H önceliği, çevrimdışı yedek, 320 px taşma yok.

### Kas haritası notları (04.10.2026, sürüm 12 sonrası) — 12.1.0'da yapıldı (yukarıda)
- [x] **Seçince renkler gidiyor:** bir kas seçilince seçilmeyen gruplar griye dönüyor (`harita.js` → `guncelle`: **(12.1.0)**
  seçim varken diğerlerinin opaklığı 0). İstenen: tüm gruplar kendi renginde kalsın; seçilen öne çıksın
  (amber çerçeve/parıltı + ★ rozet), seçilmeyenler en fazla hafif soluklaşsın (ör. %55), griye dönmesin.
  Ağrı haritası ve mini vücutlar (yoğunluk modu) bundan etkilenmez.
- [x] **Vücut resmi yalnızca bölge seçer** (karar 04.10.2026): dokun = seç, tekrar dokun = kaldır. Vücut üzerinde
  kademe yok (★/★★ rozeti kalkar; seçili bölge yalnızca vurgulanır). Şu an seçili kasa dokununca seçim kalkmıyor
  (`onHaritaTap` yalnızca odak açıyor) → düzelir.
- [x] **Bölge ağırlıkları haritanın altında:** "SEÇİLİ BÖLGELER" listesi; her satırda grup rengi + ad + 5 kademeli
  ağırlık seçici (●●●○○, varsayılan 3) ve ✕ (kaldır). Satırda 4 hafta / tüm zaman payı ve toparlanma %'si.
  Puanlama zaten ağırlıkla çarpar (`salon.puanla`: pay × ağırlık) → 1–5 doğrudan çalışır; kayıtlı planlardaki
  eski 1/2 değerleri aynen okunur. Eski alt panel (Yok / ★ / ★★) bu listeye dönüşür; "Liste" görünümü de aynı
  ağırlıkları gösterir.
  Test: seç → kaldır; ağırlık 5 → sıralama değişir; eski ★/★★ senaryoları yeni seçiciyle.
- [x] **Hareket seçerken resim, bilgi ve video görünsün** (04.10.2026; 12.1.0: büyük "Nasıl yapılır" + küçük resim yapıldı; uygulama içi video ve "Plana ekle" kalan). Bugün: öneri kartında küçük "ⓘ nasıl" **(13.0.0: gömülü video + Türkçe adımlar; "Plana ekle" kartta yok — kartın kendisine dokunmak seçer)**
  yazısı bilgi kartını açıyor (fotoğraf, adımlar, kaslar); video yalnızca H'de Video doluysa YouTube'a çıkan ▶.
  İstenen: seçim sırasında hareketi görerek karar vermek. Öneri:
  - Kartta hareket fotoğrafı küçük resim olarak (başlangıç ↔ bitiş geçişi); mini vücut yanında kalır.
    Fotoğrafı olmayan harekette mini vücut.
  - Küçük resme dokun → bilgi kartı (büyük fotoğraf, Türkçe adımlar, kaslar, kısıt notu) ve kartın altında
    **"Planla ekle"** düğmesi (kart kapanmadan seçilir). Kartın kendisine dokunmak yine seçer/kaldırır.
  - Video uygulama içinde oynasın (youtube-nocookie gömme; CSP'ye `frame-src https://www.youtube-nocookie.com`
    eklenir); internet yoksa bağlantı olarak kalır. Video yoksa "Video ekle: H → Video sütunu" notu.
  - Fotoğraflar: 36 hareket uygulamada; diğerleri free-exercise-db'den yüklenir (çevrimdışıysa mini vücut).
  - Test: kartta küçük resim, dokun → bilgi kartı → "Planla ekle" seçer; video gömülü/bağlantı; 320 px taşma yok.
- [x] **Salon plan sayfası** (talep 04.10.2026). Yüzmedeki Plan sayfası gibi, salon programı da önceden yazılabilsin: **(13.0.0: SalonTakip `plan` sayfası + Salon programı ekranı)**
  - SalonTakip'e **yeni** `plan` sayfası (yalnızca ekleme): `Tarih, Sıra, Hareket, Set, Tekrar, Ağırlık, Süre,
    Dinlen, Süperset, Not`. `Salon.gs`'e yeni okuma işlemi (eski işlemler aynen). `idman` sayfası değişmez.
  - Uygulamada **Salon programı** ekranı: haftalık takvim (yüzme takvimi gibi), gün kartında hareketler ve
    ~süre; "İdmana başla" o günün planıyla açılır. Telefonda yapılan plan "Kaydet"te isteğe bağlı olarak
    `plan` sayfasına da yazılır (masada planla, salonda uygula). Bitince satırlar `idman`'a (bugünkü gibi),
    plan satırı "yapıldı" olarak işaretlenir (silinmez).
  - Yüzme ve salon günleri tek takvimde de görünür (aşağıdaki birleşik model).

### Fitness uygulamalarından pratik öneriler (araştırma 04.10.2026: Hevy, Strong, Fitbod, Alpha Progression,
### RYVOLVE gibi hibrit uygulamalar, TrainingPeaks)
- [x] P1 **Günlük hazır olma kontrolü** (sabah, 10 sn): uyku, kas ağrısı, omuz/kalça/diz MSI, enerji → **(13.0.0)**
  günün önerisi (tam / hafif / dinlen). Whoop/Garmin "readiness" mantığı, cihazsız.
- [x] P2 **RIR (yedekte kalan tekrar) ile otomatik ilerleme:** set başına "2 tekrar daha yapabilirdim" → bir **(13.0.0)**
  sonraki ağırlık/tekrar (Alpha Progression, Juggernaut). RPE'nin yanında, isteğe bağlı.
- [x] P3 **Hareket değiştir (swap):** (idmanda "⇄ Değiştir" zaten var; aynı kas grubuna göre otomatik alternatif önerisi kalan) aynı kas grubunu çalıştıran, kısıta uygun ve ekipmanı olan alternatif → YAPILDI 13.6.0
  (Fitbod). Salonda alet doluysa tek dokunuşla.
- [x] P4 **Ekipman profilleri:** "Salon / Ev / Otel" — öneriler yalnızca o yerdeki ekipmanla. **(13.0.0)**
- [x] P5 **Set türleri:** ısınma (var), ana, düşürme (drop), başarısızlık; özette ayrı sayılır. **(13.0.0)**
- [x] P6 **Harekete sabit not:** "koltuk 4. delik, kablo 2. kademe" — her açılışta kartta görünür (Hevy/Strong). **(13.0.0)**
- [-] P7 **Plaka hesaplayıcı** (13.0.0: dambıl/kablo adım ayarı yapıldı; plaka hesaplayıcı kalan) (barda hangi plakalar) ve dambıl/kablo adım ayarı (2,5 kg yerine 2 kg vb.). → İPTAL 14.10: barbell kullanılmıyor
- [-] P8 **Tahmini 1RM ve hacim eğrisi** (13.0.0: kas grubu başına haftalık set yapıldı; 1RM/hacim eğrisi kalan) hareket başına; kas grubu başına haftalık set sayısı (10–20 hedef bandı, → İPTAL 14.10
  ama omuz itişte kısıta göre üst sınır).
- [x] P9 **Plan uyumu:** planlanan / yapılan (TrainingPeaks yeşil-sarı-kırmızı); haftalık özette yüzde. **(13.0.0)**
- [x] P10 **Otomatik dinlenme haftası (deload):** yük oranı, ağrı ve hazır olma kötüleşince öneri (blokla birlikte). **(13.0.0)**
- [x] P11 **Kilit ekranında dinlenme sayacı / bildirim** (service worker; sürüm 12'den ertelendi). **(13.0.0) (iOS: bildirim yalnızca ana ekrana eklenmiş uygulamada ve izin verilince)**
- [x] P12 **Dışa aktarma ve yedek:** tüm kayıtların CSV/JSON yedeği (tablo zaten ana kayıt; telefon geçmişi için). **(13.0.0) (JSON; CSV yok)**

### Sürüm 13.2.0 (09.10.2026) — iki dosya / iki betik YAPILDI (dağıtım: kullanıcı)
- [x] YuzmeProgram → **idman** (havuzPlan, havuzVeri, havuzSeans), SalonTakip → idman (salonVeri, salonPlan);
  sporRef → **idmanRef** (+ salonHar, salonHKEtki, bilgi BW, faz). Betikler: `idman.gs` (Code.gs + Salon.gs), `idmanRef.gs`.
- [x] Arşiv kaldırıldı (günün havuzPlan satırları silinir). [x] P1-2 süre biçimleri. [x] P2-1 hesaplanan sütunlara
  dokunmama + formül kopyalama. [x] Uygulamada 2 bağlantı (salon = idman; katalog idmanRef'ten). [x] CSS testi kaynağı
  "idmanSK CSS testi".
- [x] **Kullanıcı:** iki betiği yapıştır + `tokenUret` + dağıt; telefonda Ayarlar → idman ve idmanRef bağlantıları. — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
### Bütünleşik yüzme + salon modeli — araştırma önerileri (08.10.2026; "uygula" bekliyor)
Rapor: `reports/Bütünleşik yüzme salon idman modeli.md` (notlar: `research_notes/…`). Kod incelemesine göre çoğu
**dağıtım gerektirmez** (hesaplar telefonda; yeni ayarlar sporRef `kisit` satırı olarak; Plan'daki Alet sütunu zaten var).
- [x] B1 (Y) Yük oranı (7/28) → "Bu hafta / son 4 hafta" (mevcut hafta hariç), "risk" dili yok; eşikler ayarlanabilir. → KARAR 14.10: olabilir; örnek ekran istendi (yüzme / kara / toplam) → YAPILDI 13.5.0
- [ ] B2 (Y) Seans sıçraması: yüzme son 4 haftanın en uzununu %10+ aşarsa uyarı (planlı uzun yüzme "onaylı"). → KARAR 14.10: kullanıcı "aşsa ne olur?" — açıklandı, karar bekliyor (yalnız uyarı)
- [ ] B3 (Y) Omuz bütçesine pull buoy/palet metresi (ağırlıklı); palet kapısı (7 gün MSI 0, seansın ≤ %10–15). → KARAR 14.10: kullanıcı "ne gereği var?" — açıklandı (sağ omuz), karar bekliyor
- [-] B4 (Y) Girişim: ≥CSS yüzmeden sonraki 12–24 sa ağır üst vücut; kilit yüzmeden önceki akşam ağır üst vücut; aynı gün < 6 sa. → İPTAL 14.10: bilgi olarak gelebilir; planlar ayrı YZ oturumunda yapılıyor ve orada izleniyor
- [x] B5 (Y) Faza bağlı kuvvet reçetesi (set × tekrar × RIR hedefi; ilerleme önerisi buna göre). → örnek ekran istendi → YAPILDI 13.5.0
- [-] B6 (Y) Taper modülü (yarış tarihi kisit'te; 10–14 gün, hacim −%41–60, yoğunluk/sıklık aynı). → İPTAL 14.10: YZ planlama oturumunun işi
- [x] B7 (O) Hazır olma kişisel tabana göre (28 gün), kartta en etkili 2 neden; eklem ağrısı yalnız o eklemi kısıtlar. → örnek ekran istendi → YAPILDI 13.5.0
- [-] B8 (O) Ağrı izleme: seans sonrası sabah MSI sorusu; artmışsa bir renk aşağı; 2 hafta kötüleşen trend → dinlenme haftası. → İPTAL 14.10: gereksiz
- [x] B9 (O) Monotoni ve zorlanma (Foster). → örnek ekran istendi → YAPILDI 13.5.0
- [x] B10 (O) CSS tabanlı yüzme stres puanı (tekrar süresinden, dinlenme hariç) + standart sette RPE kayması. → örnek ekran istendi → YAPILDI 13.5.0
- [x] B11 (O) Yoğunluk dağılımı faz hedefine göre (piramidal), eksik bölge uyarısı. → örnek ekran istendi → YAPILDI 13.5.0
- [-] B12 (O) Diz açı pencereleri (MSI ≥ 1 iken), her bacak gününde kalça + diz egzersizi. → İPTAL 14.10: gereksiz
- [-] B13 (O) Dinlenme haftası 3+1 / 2+1 ayarı, kırmızı bayrakla erken dinlenme. → İPTAL 14.10: gereksiz
- [-] B14 (O) Çift ilerleme + RIR üst sınırı (tekrar aralığı tamamlanınca yük artar). → İPTAL 14.10: gereksiz
- [-] B15 (D) Eklem bütçelerine taban / hedef bandı / tavan (RP MEV/MRV benzeri). → BEKLEMEDE: kullanıcı yorum yapmadı; düşük öncelik
- [x] B16 (D) Plan/yapılan ±%20 uyum renkleri; kaçırılan seansta "uyarlama öner → Kabul et". → örnek ekran istendi → YAPILDI 13.5.0
- [x] B17 (D) Form eğrisi "trend" etiketi; salon yükü yalnız yorgunluğa (ayar). → örnek ekran istendi → YAPILDI 13.5.0
- [x] B18 (D) 14 günden uzun salon arası uyarısı. → örnek ekran istendi → YAPILDI 13.5.0
- [-] B19 (D) Kural kaynağı rozeti: kanıt / gelenek / doktor-fizyoterapist onayı. → İPTAL 14.10: gereksiz

**Gerçek kapasite (kullanıcı, 08.10.2026; 2026 havuz + salon istatistikleri):** yüzme dönemlerinde hafta içi havuz
ortalama ~2,5 gün (bazı haftalar 2, bazı 3), salon yalnız hafta sonu 1 gün. İdeal ve hedef: **hafta içi 3 sabah havuz +
hafta sonu 1 salon**. Model bu gerçeğe göre kurulur (öneriler buna göre uyarlanır):
- [ ] B20 (Y) Gün düzeni ayarı: `yuzme_gunleri` (ör. Pzt, Çar, Cum), `yuzme_saat` (sabah), `salon_gunleri` (Cmt, Paz), → BEKLEMEDE (14.10): öneri idmanRef!bilgi satırları — GUN_YUZME (Pzt,Çar,Cum), SAAT_YUZME (sabah), GUN_KARA (Cmt); değer Tam Adı sütununda; dağıtım gerekmez
  `gun_hafta_salon` 1 — sporRef `kisit` satırları (dağıtım gerekmez). Planlayıcı bugünkü "Cuma akşam + Sal–Per"
  varsayımı yerine bu günleri kullanır; salon hafta sonuna, son yüzmeden ≥ 24 sa sonra.
- [ ] B21 (Y) "2 kilit + 1 isteğe bağlı" yüzme haftası: kilit 1 = kalite (CSS/eşik), kilit 2 = uzun aerobik; → BEKLEMEDE (14.10): öneri bilgi satırları YZ1/YZ2/YZ3/KR1 — Tam Adı = içerik, Açıklama = zaruri/seçimlik, Açıklama.2 = faz (boş = hepsi); sıra = öncelik; zaruri sayısı yapılınca hafta tamam
  3. gün = teknik/kolay + omuz önleyici. Hafta 2 günle kalırsa kilitler korunur, 3. düşer; yük hedefi ve "normal
  hafta" 2,5 günlük gerçek ortalamaya göre (3 gün hedef, 2 gün de "tamam" sayılır).
- [-] B22 (Y) Tek salon günü = tam vücut, kuvvet öncelikli (~60 dk): omuz önleyici ısınma → çekiş kuvveti → kalça → İPTAL 14.10: zaten öyle
  (abdüktör, kalça menteşesi, derin olmayan) → itiş (omuz sınırıyla) → core; faz reçetesi (B5) bu tek güne göre.
  Haftada 1 kuvvet seansı kazanımı yavaşlatır ama korumaya yeter (yaşlı yetişkin / dayanıklılık sporcusu
  çalışmaları; raporda) → 2. uyaran olarak B23.
- [-] B23 (O) Havuz sonrası "mini kara" 10–12 dk (bant dış rotasyon, Y kaldırış, ters fly, dead bug, Pallof): → İPTAL 14.10: iptal
  2 yüzme gününde; omuz önleyici dozunu (6–8 hafta, haftada 2–3) salon gününe bağlı olmadan tamamlar; sabah
  süre bütçesinin içinde sayılır, önleyici borca yazılır.

### Sürüm 13.1.0 (08.10.2026) — dağıtımsız düzeltmeler YAPILDI
- [x] P1-1 CSS varsayılansız, geçerli satır yoksa uyarı + bölge yok. [x] P1-3 kısa tekrar sorulur (atılmaz),
  [x] P3-2 süresiz set uyarısı. [x] P1-4 artış önerisi sorulur, bant/vücutta kg yok. [x] P2-3 Scull = drill, TEC;
  [x] P3-3 Tür Test bölgesiz. [x] P2-4 salonda nabız boş başlar. [x] Yüzme/salon gün ayrımı (kisit). [x] Faz takvimi +
  döngü (fazBilgi + kisit dongu_/yasak_). [x] idmanSK görünen ad (veri anahtarları `ysk.*` kaldı: eski testler bu
  anahtarları kullanıyor ve kullanıcıya görünmüyor; taşımanın riski var, faydası yok). [x] Biten seti düzeltme (yüzme +
  salon). [x] Plan süreleri gerçekleşenden (salon: Süre sütunu; yüzme: Bu hafta'da plan × gerçek/plan oranı).
- Eski testlerde kasıtlı davranış değişikliği nedeniyle güncellenen beklentiler: test-data ve test-e2e (varsayılan CSS),
  e2e-senaryolar (Drill TEC, elle CSS testi CSS'i kendisi girer, son idmanı tekrarla öneri sorusu + bantta +1 tekrar,
  nabız boş başlar, planlamada öneri uygulanmaz), e2e-surum12 (ana sayfadan başlarken öneri sorusu, rekor bantta
  "en çok tekrar", şablonda öneri uygulanmaz), e2e-surum13 (yedek adı).

**Dağıtım gerektirenler — kullanıcı dağıtım yapana kadar BEKLİYOR** (Apps Script'i yapıştır → Yeni sürüm):
- Code.gs: P1-2 süre biçimleri (`[h]:mm:ss` / `[h]:mm:ss.0`); P2-1 tablonun hesapladığı sütunlara (Set Mesafe, Set Süre,
  Sıra, Hafta …) dokunmama + formül kopyalama (karar: uygulama boş gönderir, tablo hesaplar, sütun kaymaz).
- Salon.gs sürüm 13 (`plan` sayfası) — kullanıcı henüz dağıtmadı, bekliyor.
- Üç betikte idmanSK adı (yorumlar ve cevaptaki ad; acelesi yok).

**Sonraya:** uzak duvar ölçümü (kullanıcı: sonra). P3-1 süreli harekette +1 sn (veri görülecek).
**Tabloda (kullanıcı/oturum):** P2-2 Hafta formülü "Sezon Hafta"ya; P2-3/P3-3 Hedef Zone formülü.
**İptal:** Mesafe'de metin (`25/75`) — kullanıcı istemedi (yanlış anlaşılmaydı).

### Hata listesi (idman oturumu, 06.10.2026) — kodla karşılaştırıldı
Kaynak: 30.09, 02.10, 06.10 yüzme ve 04.10 salon kayıtları. Her maddede: bulgu → yapılacak.
- [x] **P1-1 CSS.** Uygulama zaten tarih + alet + havuzla `css` sayfasından okuyor; gömülü 117 yalnız sporRef yokken
  (`data.js` DEFAULT_PREFS) ve CSS testi başlangıcında. Tarihi kapsayan satır yoksa son satırı "güncel değil" notuyla
  kullanıyor. → Gömülü varsayılan kalkar; geçerli satır yoksa bölge verilmez, uyarı çıkar. Aletli sette o aletin satırı
  yoksa bugün bölge yok — ekipmansız CSS'e düşmek paddle/PB setlerini olduğundan zor gösterir, bu yüzden bölge yok kalır
  (oturumla teyit edilecek).
- [x] **P1-2 Süre biçimi.** `Code.gs` Gerçek'i gerçek süre değeri olarak yazıyor (değer doğru), yalnız görünüm `[mm]:ss.0`.
  Hedef/Dinlen `eski`'ye Plan'daki hücreden aynen (değer + biçim) kopyalanıyor → Plan'da `07:00` yazılmışsa Sheets onu
  7 saat sanıyor (uygulama görünen metni okuduğu için 7 dk anlıyor). → Code.gs: planlanan `[h]:mm:ss`, ölçülen
  `[h]:mm:ss.0`; idmanda değişen Hedef/Dinlen de `[h]:mm:ss`. Plan yazımı `00:07:00` (rehberde).
- [x] **P1-3 Mikro tur.** "Turlar: …" notunu yalnızca sürüm ≤ 9'dan kalan eski seansı taşıyan kod yazıyor
  (`migrateSession`): 30.09 seansı telefonda **eski bir uygulama sürümüyle** başlamış. Yeni modelde 1 tekrarlık sette
  ikinci dokunuş sonraki seti başlatır. P3-2 (Gerçek boş) de aynı nedenden. → Telefonda Ayarlar'da sürüm 13.0.0
  görünmeli. Yine de koruma: hedefin %20'sinden kısa tekrar yok sayılır ve Not'a "yoksayıldı: 0:02.3" yazılır.
- [x] **P1-4 Ağırlık +3** (kullanıcı açıkladı 07.10): uygulama idmana başlarken otomatik ilerlemeyi (+2,5 kg; tam sayı
  görünümde +3) **sormadan** uyguladı; fark edilmeden artırılmış değerlerle idman yapıldı (bantla hiçbir şey
  değişmedi), tabloya bu değerler yazıldı, kullanıcı elle düzeltti. → Öneri artık kendiliğinden uygulanmaz:
  idman başında "3 harekette artış önerisi" tek ekran (Kabul / Hayır / tek tek), kabul edilmeyen hareket son yapılan
  değerle başlar. Bant ve vücut ağırlığında kg önerisi yok (+1 tekrar ya da bant kademesi notu). Kartta öneri
  uygulanmış hareket açıkça işaretli kalır. Test: "Son idmanı tekrarla" → değerler aynı, öneri ekranı; Kabul → artar.
- [x] **P2-1 Set Mesafe / Set Süre / Sıra** (karar 07.10: **uygulama boş gönderir, tablo hesaplar; boş gönderirken
  sütun kaydırmasın**). Bugün `Code.gs` `eski`'ye satırı başlık genişliğinde yazıyor: bu üç sütuna ve başlığı Plan'da
  olmayan sütunlara (Hafta, Hedef Zone …) `''` yazıyor, yeni satırlara formül gelmiyor; yalnızca biçim kopyalanıyor.
  → Code.gs: tablonun hesapladığı sütunlara **hiç dokunmaz** (yalnız kendi sütunlarını yazar); üstteki eski satırda
  bu sütunlarda formül varsa yeni satırlara aynı formülü göreli olarak kopyalar; ARRAYFORMULA varsa alanı boş
  bırakır ki taşabilsin. Satır ekleme ve sütun sırası aynen. Doğrulama için `eski` 2. satırdaki Set Mesafe,
  Set Süre, Sıra ve Hafta hücrelerinin formül metni gerekli (kullanıcıdan). Test: formüllü/ARRAYFORMULA'lı sahte
  `eski` → yeni satırlarda doğru değer, diğer sütunlar kaymıyor.
- [x] **P2-2 Hafta.** Uygulama Hafta yazmıyor; tablo formülü sporRef `takvim`'de "Bu Hafta" satırını okuyor. — tablo tarafı ("Senin tarafında" bölümünde)
  → Formülde "Sezon Hafta" satırına geçilecek (tabloda, kullanıcı/oturum). İstenirse Code.gs yazar.
- [x] **P2-3 Kick/Drill bölgesi.** Uygulama Drill/Kick setlerinde bölge vermiyor (`ref.isDrill`); tablodaki
  REC/SP1 tablo formülünden ("Hedef Zone" sütunu, uygulama okumaz/yazmaz). → Formül düzeltilir; uygulamada
  `Scull` da drill sayılır, ekranda "TEC" yazar, yoğunluk dağılımına girmez (bugün de girmiyor).
- [x] **P2-4 Nabız hepsi 113.** Doğrulandı. Neden: salonda nabız alanı bir önceki hareketin değeriyle hazır geliyor,
  dokunup geçince kopyalanıyor. → Nabız boş başlar; yalnız girilirse yazılır.
- [ ] **P3-1 Süreli harekette +1 sn.** Kodda süreli set tam `başlangıç + süre`de bitiyor, Tekrar'a planlanan saniye
  yazılıyor; +1 üreten yer bulunamadı. → 04.10 satırlarının Tekrar/Süre/Açıklama değerleri görülecek (Drive aracı
  yalnız örnek satır döndürdü); kaynak bulununca düzeltilir.
- [x] **P3-2 Gerçek boş.** P1-3 ile aynı neden (eski sürüm seansı). → Kaydetmeden önce süresi olmayan tamamlanmış
  set varsa uyarı.
- [x] **P3-3 Test setine bölge.** Tablo formülü. → Uygulamada Tür `Test` olan sete bölge verilmez, hız payına girmez.
- [x] **P3-4 Mesafeye metin** — iptal: kullanıcı istemedi.

### Notlar (04.10.2026, 13.0.0 sonrası)
- [x] **Plan süreleri gerçekleşen sürelerden öğrensin.** İdman yapıldıkça planlardaki süre tahmini gerçek
  sürelere göre ayarlansın. Bugün tahminler sabit formülle:
  - Salon: `salon.tahminSn` = set × (tekrar × 3 sn + 60 sn) ya da set × (süre + 30 sn).
    Öneri: hareket başına son 3–5 idmandan gerçek set süresi + gerçek dinlenme (salon oturumunda olaylar var);
    yoksa kişisel ortalama (tüm hareketlerde tekrar başına sn, set arası dinlenme), o da yoksa bugünkü formül.
  - Yüzme: günün süresi Plan'daki hedef süre ya da set sürelerinin toplamı (`hedefSureOf`); geçişler, mola,
    omuz rahatlatma sayılmıyor. Öneri: geçmiş seanslarda planlanan ↔ gerçekleşen oranı (blok/set türüne göre,
    zaman.js olaylarından) → tahmin bu oranla düzeltilir.
  - Kullanım: salon planı ve Salon programı (~süre), Bu hafta (süre bütçesi 80/65 dk aşılıyor mu uyarısı,
    önerilen salon gününde hareket sayısı), yük hedefi (dk × RPE). Ekranda "tahmin: son 5 idmana göre" notu.
  - Yalnızca okuma; tablolara yazım yok. Test: gerçek süreler varken tahmin değişir, yokken formül.
- [ ] **Uzak duvarda biten tekrarlar (25, 75, 125 … m; 50 m havuzda 50, 150 …)** (05.10.2026). Telefon havuzun bir
  ucunda; tekrar karşı duvarda bitince DUR'a basılamaz. Öneri (uygulama havuz boyunu biliyor: 25/50):
  - Uygulama her tekrarın hangi duvarda bittiğini toplam metreden hesaplar. Karşıda biten tekrarda düğme
    "karşıda dinlen · dönüşte dokun" der; dokunuş beklemez.
  - **Çift ölçüm:** 2 tekrar (gidiş + dönüş) tek dokunuşla kapanır: süre = tekrar1 + karşı dinlenme + tekrar2.
    Tekrar süresi = (ölçülen − planlanan dinlenme) / 2, "tahmini" işaretli; Not'a `2×25 tek ölçüm`.
  - Karşıdaki dinlenme için uygulama planlanan süreden geri sayar ve bip verir (duyulursa); duvardaki saat yedek.
  - Toplamı karşıda biten set (ör. 3×75) için son tekrardan sonra **dönüş 25 kolay** otomatik eklenir (Not'a
    yazılır, mesafeye sayılır) ya da plan yazarken önlenir.
  - Program yazım kuralı (rehbere eklendi): tekrarlar mümkünse yakın duvarda bitsin; 25'ler çift
    (`4×50 · 25 hızlı + 25 kolay`), 75 yerine 100 (`75 + 25 kolay dönüş`).
  - Uzun vade: saat verisi (otomatik tur) bunu tamamen çözer (F4, sonra).
- [x] **CSS ekipmansız 126 sn, 117 ise Paddle + PB** (idman oturumu 05.10.2026). Uygulamada varsayılan CSS 117
  (`data.js` DEFAULT_PREFS, CSS testi başlangıcı, README). sporRef bağlıyken `css` sayfası kullanılır: alet sütunu
  boş satır ekipmansız setlere, `Paddle+PB` satırı o aletle yüzülen setlere; tarihi kapsayan satır yoksa en son
  satır ("CSS güncel değil"). Yapılacak: varsayılan 126; kullanıcı sporRef'e 09.10'a kadar `126 · alet boş` satırı
  ekler, 09.10 testinden sonra test sonucu. Ayarlar'da hangi satırın kullanıldığı (alet, tarih) açık yazsın.
- [x] **"Haftada 3 gün" yüzme içindir; salon ayrı** (idman oturumu 05.10.2026). Bugün uygulama tüm günleri
  sayıyor (`yuk.haftaGunleri` yüzme + salon), normal hafta 3 × 65 dk × RPE 6 = 1170 → Faz 1 (3 yüzme + 2 salon)
  sürekli "normalin üstünde / 3 gün tamam" görünür, Bu hafta 3. günden sonra öneri vermez. Yapılacak:
  sporRef `kisit`'e `gun_hafta_yuzme` (3), `gun_hafta_salon` (2), `salon_dk` (50), `salon_rpe` (5); normal hafta =
  yüzme 3 × 65 × 6 + salon 2 × 50 × 5; ana sayfa halkası yüzme ve salon ayrı; planlayıcı yüzme ve salon
  yuvalarını ayrı doldurur (salon yüzmeye bitişik olmayan güne). Eski `gun_hafta` okunmaya devam eder.
- [x] **Faz takvimi üstte, 4 haftalık döngü onun içinde** (idman oturumu 05.10.2026). sporRef `fazBilgi`
  (Sezon, Faz, Tarih_ilk, Tarih_son, Ad, Odak) betikten zaten okunuyor ama uygulama kullanmıyor. Yapılacak:
  - `fazBilgi`'ye isteğe bağlı iki sütun: **Döngü** (ör. `Hacim, Hacim+, Hacim+, Dinlenme`) ve **Yasak**
    (ör. `SP, Kuvvet`). SporRef.gs bunları da okur (yalnızca ekleme; yeniden dağıtım).
  - Döngü fazın başladığı haftadan kendiliğinden işler (elle "başlat" gerekmez; elle başlatma faz yoksa kalır).
  - Faz bir işi yasaklıyorsa döngü onu önermez (Faz 0–1: SP yok, salon kuvvet yok; Kuvvet haftası ilk Faz 3'te).
  - Bu hafta ve Form ve denge: "Faz 1 · Hacim+ (2/4)" gibi; faz sonu yaklaşınca ölçüm/test hatırlatması.
- [x] **İdman anında biten seti düzeltme** (04.10.2026). Bugün:
  - Yüzme: biten sete dokununca yalnız "Seti sıfırla" (tekrar süreleri silinir, set baştan yapılır); süre/tekrar
    elle düzeltilemez.
  - Salon: yalnız **son** setin tekrarı ± ile değişir; önceki setler değişmez; hareket "tamam" olunca Düzenle kapalı;
    ağırlık set başına değil hareket başına.
  Öneri: biten sete dokun → küçük düzeltme penceresi:
  - Salon: o setin tekrarı (ya da süresi), ağırlığı (set başına; kayıtta Açıklama'ya `Setler: 11@20-9@20-9@17,5`,
    Ağırlık sütunu bugünkü gibi), set türü/RIR; "seti sil" (yanlışlıkla BAŞLA). Tamamlanan hareket de düzeltilebilir.
  - Yüzme: tekrar sayısı (yapılan), tekrar süresi (yanlış dokunuşu düzelt: süreyi elle gir ya da bir dokunuşu
    geri al), kulaç/nabız; "sıfırla" kalır. Düzeltilen süre nota "düzeltildi" diye işlenir (plan farkı notu gibi).
  - Seans bitip gönderilmeden önce özet ekranında da aynı düzeltme. Gönderilen kayıt değişmez (tabloda elle).
  - Eski olay kaydı biçimi bozulmaz (düzeltme ayrı alan: `duzelt[set]`); zamanlama hesapları (zaman.js) önce
    düzeltmeyi uygular. Test: düzelt → özet ve tabloya giden satır doğru; eski senaryolar aynen geçer.
- [x] **Uygulama adı: idmanSK — HER YERDE** (talep 04.10, kapsam genişledi 07.10.2026: "her yerde").
  - Görünen: `index.html` (title, ana ekran adı, başlık, noscript), `manifest.json` (name, short_name), Ayarlar,
    yedek dosyası (`idmansk-yedek-…json`, `uygulama` alanı; eski `YüzmeSK` yedeği de tanınır).
  - Betikler: `Code.gs`, `Salon.gs`, `SporRef.gs` başlık yorumları ve sağlık cevabındaki ad (`idmanSK`, `idmanSK Salon`,
    `idmanSK sporRef`); sporRef `css`'e yeni yazılan kaynak metni `idmanSK CSS testi` (eski satırlar olduğu gibi kalır).
    Uygulama eski adla gelen cevabı da kabul eder (betik yeniden dağıtılmadan önce de çalışır).
  - Belgeler: README, ZAMANLAMA.md, IDMAN_OTURUMU_REHBERI.md, IS_LISTESI başlığı, tüm dosya başı yorumları, testler.
  - `localStorage` anahtarları `ysk.*` → `isk.*`: **taşıma ile** — ilk açılışta eski anahtarlar yeni adlara
    kopyalanır, eskiler yedek olarak bir süre durur; hiçbir kayıt, ayar ya da kuyruktaki gönderim kaybolmaz
    (test: eski anahtarlı telefon → yeni sürüm → geçmiş, ayarlar, bağlantılar, devam eden seans aynen).
  - Değişemeyecekler: Google tablolarının dosya adları (YuzmeProgram — Drive'da senin elinde), geliştirme dalının adı
    (`claude/yuzmesk-phase-1-…`, oturuma atanmış), eski git geçmişi ve `tasarim/` altındaki eski taslaklar.
    Depo adı (`Claude`) ve Pages adresi zaten adı içermiyor; değişmez.
  - iPhone'da ana ekrandaki ad, uygulama ana ekrandan silinip yeniden eklenince güncellenir (veri kaybolmaz:
    aynı adres).
  - Yalnız ekleme ilkesi: tablo sütunları ve betik işlemleri değişmez; yalnızca ad metinleri.

### Sürüm 13 — EN ÖNEMLİ: yüzme + salon tam entegre model (sağlık · yüzme · fitness dengesi) — **13.0.0 yayında**
Amaç: tek haftalık plan, tek yük bütçesi, tek sağlık bütçesi; yüzme ve salon birbirini bozmadan birbirini
besler. Dayanak: yuzme-idman-modeli (Perthes sağ kalça, sağ omuz rotator manşet + impingement, sağ diz
kondromalazi, MSI ölçeği, haftada 3 gün, süre bütçeleri, CSS ~1:57) + eşzamanlı antrenman (concurrent
training) bulguları: kuvvet ve dayanıklılık aynı güne yakın yapılınca kuvvet uyumu zayıflayabilir (girişim etkisi);
yüzücülerde kara antrenmanı (dryland) suda performansı destekler, sıralama ve ara önemlidir.
- [x] M1 **Tek hafta planlayıcı:** Cuma akşam (sınırsız) + Sal/Çar/Per'den 2 gün (sabah 75–80, öğle 65 dk). Her gün **(13.0.0: `model.haftaPlani`; Bu hafta ekranı)**
  bir "ana iş" (yüzme eşik / yüzme hız / salon kuvvet) ve bir "yan iş" (önleyici + core 15–20 dk). Bütçe
  aşılmaz; yan iş yüzmeden sonra kısa kara bloğu ya da salon gününün başı.
- [x] M2 **Girişim (interference) kuralları:** ağır omuz/sırt itiş-çekiş salonu, eşik/hız yüzme ya da uzun FR/pull **(13.0.0: salon yüzmeye komşu olmayan güne; olmuyorsa kuvvet/çekiş fazında uyarı)**
  gününden önceki gün değil (B5'in planlayıcıya taşınmışı); aynı gün zorunluysa önce yüzme, sonra salon ve
  arada ≥ 6 saat; kuvvet günü yüzme hafif (aerobik/teknik).
- [x] M3 **Ortak yük bütçesi:** haftalık sRPE hedefi, artış ≤ %10/hafta; yüzme + salon aynı birimde; yük oranı **(13.0.0: `model.haftaHedefi` — %10, dönüşte %20, yük hızlı arttıysa −%20; otomatik "hafif" işareti)**
  0,8–1,3 dışına çıkınca planlayıcı bir sonraki günü otomatik hafifletir.
- [x] M4 **Sağlık bütçeleri (eklem başına):** omuz maruziyeti (FR/BF/pull metre + baş üstü/itiş setleri), **(13.0.0: omuz yükü, kurbağalama %, diz setleri; ağrıda sınır daralır)**
  kalça (BR metre ≤ %10/ay, squat derinliği, tek bacak işleri), diz (BR + derin büküm). Her biri haftalık sınır ve
  MSI eğilimine bağlı: MSI yükselirse o eklemin bütçesi otomatik daralır, önleyici doz artar.
- [x] M5 **Ortak periyotlama:** 4 haftalık blok yüzme ve salonda aynı faz (temel → gelişim → kuvvet/hız → dinlenme); **(13.0.0: Form ve denge'deki döngü yüzme + salonda ortak faz; taper yok)**
  yarış/test haftası varsa salon kuvvetten bakıma iner (taper).
- [x] M6 **Salon yüzmeye hizmet eder:** hareket seçiminde "yüzme aktarımı" ağırlığı faza göre (temel: stabilite + **(13.0.0: salon planlamada faz notu; önerilen salon gününde önce önleyici borç, kas grubu başına ≤ 2 hareket)**
  core, gelişim: çekiş kuvveti/lat, hız: güç, dinlenme: önleyici). Kas haritası yüzmenin kas yükünü de gösterir
  (bugün var) → salon zayıf/az çalışan bölgeyi önerir, yüzmenin yorduğunu dinlendirir.
- [x] M7 **Hazır olma → günün kararı:** P1 kontrolü + toparlanma + MSI → "planı yap / hafiflet / yer değiştir **(13.0.0: dinlen/tıbbi bugünü kapatır, hafif işaretler; "yer değiştir" önerisi yok)**
  (salon ↔ yüzme) / dinlen". Değişiklik haftanın kalanını yeniden dengeler.
- [x] M8 **Tek ekran "Bu hafta":** 3 gün kartı (yüzme + salon birlikte), bütçeler (süre, yük, omuz, kalça, diz, **(13.0.0: Bu hafta ekranı; ana sayfadan)**
  BR), uyum, form; Haftanın özeti bu modelin raporu olur.
- [x] M9 **Tablolara yazım (yalnızca ekleme):** planlayıcı önerisi yüzme Plan'a ve salon `plan`'a **onayla** yazılır **(13.0.0: salon önerisi düzenlenip `plan` sayfasına onayla yazılır; yüzme Plan'a yazım YOK — Code.gs değişmedi)**
  (öneri olarak, elle düzeltilebilir); mevcut sütunlar ve akışlar aynen.
- [x] M10 **Ölçüm ve geri bildirim:** 4 haftada bir CSS testi + salon tahmini 1RM + MSI eğilimi → modelin **(13.0.0: CSS testi 28 gün, dinlenme haftasında 1RM/MSI gözden geçir notu; katsayıların otomatik ayarı yok)**
  katsayıları (yüzme kas yükü, bütçeler) kişiye göre ayarlanır; sporRef'te görünür ve düzenlenebilir.
Sıra önerisi: önce harita/plan sayfası/P maddeleri (sürüm 12.x), sonra Sürüm 13 (M1–M10) tek seferde.
Örnek ekranlar istenirse önce onay alınır (görsel üretimi).

### Sürüm 12 — tek seferde uygulanacak plan (04.10.2026) — **TAMAMLANDI, 12.0.0 yayında (04.10.2026)**
Kurulum için yapılacaklar (senin tarafında):
- [x] sporRef: yeni `SporRef.gs`'i yapıştır → Dağıtımları yönet → Yeni sürüm (CSS testi yazımı için; adres ve anahtar aynı). — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
- [x] SalonTakip: yeni `Salon.gs`'i yapıştır → Yeni sürüm (H'deki Kısıt / Alternatif / Görsel başlıklarını okur). — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
- [x] İsteğe bağlı: sporRef'e `kisit`, `yuzmeKas`, `drill` sayfaları; H'ye Kısıt / Alternatif / Görsel (biçim README'de). — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
Not: tüm testler yeşil (birim + uçtan uca 52/52 eski + 15 yeni). Eski senaryolardan yalnızca "son idmanı tekrarla"
genişletildi (öneri artık uygulanıyor → "geri al" ile eski davranış doğrulanıyor).

"uygula" denince aşağıdakilerin **hepsi tek sürümde** yapılır; sıra, bağımlılığa göre. Ayrıntılar alttaki
maddelerde (A1–F5, salon senaryosu, hareket bilgi kartları). Garmin (F4) sonraya; F3 antrenör raporu yerine kişisel "Haftanın özeti".
- [x] **0. Hazırlık:** tüm testler yeşil (03.10.2026: hepsi geçti, uçtan uca 52/52); dalda çalışılır.
- [x] **1. Veri ve betikler (yalnızca ekleme):** sporRef'e `kisit`, `yuzmeKas` (stil → kas katsayıları), `drill`
  (video) sayfaları; SporRef.gs bunları okur + CSS testi için yalnızca satır ekleyen işlem. SalonTakip `H`'ye
  isteğe bağlı Kısıt / Alternatif / Görsel sütunları (yoksa da çalışır). Eski sütunlar, sayfalar, işlemler aynen.
- [x] **2. Ortak çekirdek:** 10 kas grubu (Türkçe ad, v27 renkleri; eski 7 ad çalışır) · kısıt motoru (A1, A2,
  A3, A5, A6) · yük ve toparlanma (B1–B5, yüzme kas yükü dahil).
- [x] **3. Salon:** kas haritalı planlama (v27; eski çubuk listesi "Liste" görünümü) · öneri kartlarında mini
  vücut + plan tepsisi · plan Kaydet + ana sayfadan doğrudan giriş · otomatik ilerleme ("geri al"; ⚠'de yok) ·
  toparlanma · önleyici borç (E1) · kart üstü kısıt (E2) · ısınma şablonu (E3) · periyotlama (E4) · rekor ·
  özet (hacim, kas ısı haritası, kıyas) · hareket grafiği · dinlenme bitti bildirimi · süperset · ısınma seti ·
  **hareket bilgi kartları (G)**.
- [x] **4. Yüzme:** omuz rahatlatma (A4) · kulaç + nabız girişi, SWOLF (C1–C3) · drill videosu (C4) · ağrı
  haritası (C5) · özet (D1) · set grafiği (D2) · denge (D3) · rehberli CSS testi (D4) · derece tahmini (D5).
- [x] **5. Ortak ekranlar:** ana ekran (F1) · takvim (F2) · haftanın özeti (F3) · haftanın iskeleti (F5) · form
  ekranı (B2–B3).
- [x] **6. Düzeltmeler:** hareket sonu "SETLER 10-10-/10" kırılması · İngilizce grup adları ("Legs 0,7") ·
  Ayarlar'da kaynak/lisans notu (kas görseli: kullanıcı; hareket fotoğrafları: free-exercise-db, Unlicense).
- [x] **7. Test ve yayın:** her adımda tüm testler; her yeni özelliğe uçtan uca senaryo; senaryo ve öneri
  panoları yeniden çekilir; kurulum rehberi (yeni sayfalar) güncellenir; sürüm 12.0.0 → main.

- [x] **G. Hareket bilgi kartları (infografik)** (talep 04.10.2026). Kaynak: free-exercise-db (yuhonas, Unlicense =
  kamu malı; 876 hareket, her biri başlangıç/bitiş fotoğrafı, adım adım anlatım, birincil/ikincil kas, ekipman).
  - Eşleme: H'deki hareket adları → veritabanı kimliği (otomatik + elle düzeltme; H'de isteğe bağlı "Görsel").
  - Yalnızca senin hareketlerinin fotoğrafları uygulamaya gömülür (webp, çevrimdışı çalışır; dış istek yok).
  - Kart: başlangıç ↔ bitiş geçişi (animasyon), Türkçe adımlar, çalışan kaslar v27 mini vücutta, kısıt notu
    (A2/E2), sık hata, ▶ video. Eşleşmeyen harekette: mini vücut + adımlar + video.
  - Açılış: idmanda karta dokun → ayrıntı paneli; planlamada öneri kartında ⓘ.
  - Örnek 3 kart (04.10.2026): `tasarim/kartlar/kartlar.html` (dış rotasyon, kutuya squat, dead bug).


**Sürüm 11 yayında (03.10.2026):** 3'lü dosya yapısı (YuzmeProgram · SalonTakip · sporRef, her birine
kendi `@OnlyCurrentDoc` betiği), sporRef'ten CSS ve 7 bölge, idman anında düzenleme, metin boyu,
salon idmanı + planlama + video. Kurulum için yapılacaklar (senin tarafında):
- [x] YuzmeProgram: `Code.gs`'i güncelle → Dağıtımları yönet → Yeni sürüm (eski'de Sıra/Set Mesafe/Set Süre artık boş yazılır). — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
- [x] SalonTakip: `Salon.gs`'i kur, `tokenUret`, web uygulaması olarak dağıt; telefonda Ayarlar → Salon. — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
- [x] sporRef: `SporRef.gs`'i kur, `tokenUret`, dağıt; telefonda Ayarlar → sporRef. — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
- [x] İsteğe bağlı: `H` sayfasına Video sütunu (E'den sonra); YouTube adresleri. — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)

Varsayım (kontrol et): süreli hareket adına göre tanınır (Plank, Hold, Hang, Wall Sit, Carry, L-sit,
Hollow, Side Bridge) ya da açıklamasında "Setler: … sn" varsa; planda/idmanda Düzenle → Tür:
Süreli/Tekrar ile değiştirilebilir. Süreli harekette Tekrar sütununa ortalama saniye yazılır.

Talep (03.10.2026, karar bekliyor):
- [x] **Ana sayfadan salon idmanına doğrudan giriş** (yüzmedeki "İdmanı aç" gibi). Öneri: salon kartında
  hazır idman (önceden kaydedilmiş plan ya da son idman) tarih · hareket sayısı · ~süre ve kas grubu renk
  çubuğuyla görünür; **İdmana başla** doğrudan idmana girer, **Planla** planlama ekranını açar; süren idman
  varsa **Devam et**. Planlama sonunda "Kaydet, sonra başla" ile plan ana sayfada bekler.
  Açık soru: son idman tekrarlanırken ilerleme önerisi (+2,5 kg / +1 tekrar) uygulansın mı?

- [x] **Salon planlama ekranı yeniden tasarım** (talep 03.10.2026: "çok basit, alanlar okunaksız").
  Seçenekler `tasarim/v19/` (a: büyük kartlar, b: gövde haritası, c: tek ekran + plan tepsisi).
  Karar: üçü birlikte, vücut daha gerçekçi → birleşik taslak `tasarim/v20/` (Hedef: Vücut/Denge/Liste
  sekmeleri + büyük kas kartları; Hareket seç: mini vücut + puan + plan tepsisi; Plan: sürükle, planın
  kas kapsamı, Kaydet / İdmana başla).
  Vücut çizimi beğenilmedi → `tasarim/v21/`: react-native-body-highlighter (MIT, © 2022 ELABBASSI Hicham)
  anatomik çizimleri; lisans metni uygulamaya eklenecek.
  `tasarim/v22/`: aynı çizim SVG ışıklandırmasıyla hacimli (3B), kaslar arası ten dolgusu, öncelik ★ rozeti.
  (wger çizimi denendi: gerçekçi ama kas katmanları kaba ve lisansı AGPL → kullanılmadı.)
  `tasarim/v23/`: Z-Anatomy 3B kas modeli (CC BY-SA 4.0, BodyParts3D tabanlı) Blender Cycles ile ön/arka
  render + 7 kas grubu maskesi (~1 MB); uygulamada maskeler grup renginde "color" karışımıyla boyanır,
  yük → renk doygunluğu. Kaynak betikler `tasarim/v23/kaynak/`.
  Karar (03.10.2026): anatomi görselleri istenmedi ("korkunç"); sade ikon dili isteniyor (örnek: yuvarlak
  ikonlar, gri siluet, çalışan bölge tek renk). → `tasarim/v24/`: MIT çizimi düz stilde; harita gri→turuncu,
  kas grubu seçimi 8 yuvarlak ikon (★/★★ öncelik).
  Karar (03.10.2026): kullanıcının Gemini görseli (siyah zemin, ön/arka, renkli kas grupları) kullanılacak,
  dokunmatik olacak. → `tasarim/v25/prototip.html`: renk bölütleme (OpenCV, `kaynak/ayikla.py`) ile 7 grup
  SVG yol olarak görselin üstünde; kasa dokun → ★ öncelik → ★★ çift → kapalı; seçilen grup amber çerçeve
  + ★ rozet; üst kutuda 4 hafta / tüm zaman yüzdesi. Görsel kullanıcıya ait.
  Karar (03.10.2026): yeni görsel (gri zemin, etiketli, ön/arka) kullanılacak → `tasarim/v26/prototip.html`:
  vücut grabCut ile zeminden ayrıldı (`kaynak/govde.py`), gruplar renk ∩ bölge (`kaynak/ayikla.py`); bacak
  renksiz olduğundan konumla, arka Bel bölgesi Gövde'ye.
  Karar (03.10.2026): v26 beğenilmedi (kas sınırları, dokunma yapısı). Yeni görsel (siyah zemin, gri vücut,
  renkli kaslar) → `tasarim/v27/prototip.html`:
  - Sınırlar çizimin kendi kas renklerinden, piksel maskesi (2× yumuşak kenar); sırttaki aynı yeşil
    (sırt / triseps) watershed ile koltuk altı çizgisinden ayrılır. Kaynak: `kaynak/ayikla.py`.
  - Katmanlar: gri figür + grup başına maskeli renkli figür (CSS mask). Seçim varken seçilmeyenler gri,
    seçilen renkli + amber parıltı, odaktaki beyaz parıltı; ★/★★ rozet.
  - Dokunma: piksel haritası (`_hit.png`), kasın 9 px çevresi de sayılır.
  - Tek büyük figür, Ön/Arka düğmesi (seçim sayısıyla), yatay kaydırma, köşede diğer yüzün küçüğü.
  - Kasa dokun → ★ seçilir + alt panel: 4 hafta / tüm zaman çubukları, denge notu, öncelik
    (Yok / ★ / ★★), örnek hareketler. Öncelik çipleri; "Hareketleri getir".
  - Kas grupları 10 (kullanıcı listesi): Karın (core), Sırt, Göğüs, Omuz, Biseps, Triseps, Ön kol, Kalça
    (glutes), Kalça yanı (hip), Bacak. Çizimde aynı renkli olanlar ayrıldı (biseps/ön kol, sırt/triseps,
    kalça/kalça yanı); her grup kendi rengine boyandı (dokusu korunarak). Uygulamada salon kas grubu
    listesi (şu an 7) bu 10'a göre güncellenecek; sporRef/salon hareket eşlemesi de.
  Onay ("uygula") bekliyor.

- [x] **Salon baştan sona senaryo ve sürüm 12 önerisi** (talep 03.10.2026) → `tasarim/senaryo/senaryo.html`
  (14 adım: Salı planla → Çarşamba ana ekrandan başla → idman → özet; mevcut ekranlar gerçek uygulamadan,
  yeniler taslak). Kaynak: `tasarim/senaryo/kaynak/` (cek.cjs: uygulamadan ekran görüntüleri, sahte veriyle).
  Eksikler (senaryoda görülen):
  - [x] Kas grubu renk/ad tablosu 10 grubu tanımıyor: Biceps, Triceps, Forearms, Hip gri ve İngilizce
    (planlama, kart ayrıntısı "Legs 0,7 · Glutes 0,3"). v27 renkleriyle Türkçe; eski 7 ad çalışmaya devam.
  - [x] Hareket sonu "SETLER 10-10-/10" satır kırılıyor → metin boyu uyumu.
  - [x] Kayıtlı plan + ana sayfadan doğrudan giriş (yukarıdaki talep).
  - [x] Planlama 1. adımı kas haritası (v27); eski çubuk listesi haritanın altında "Liste" görünümü.
  - [x] Öneri kartlarında mini vücut + plan tepsisi; planda kapsam haritası, Kaydet / İdmana başla.
  - [x] Özet: toplam hacim, çalışan kaslar haritası, rekorlar, geçen benzer idmanla kıyas.
  - [x] Ayarlar'da kas görseli kaynak notu.
  Popüler uygulamalardan öneriler (Hevy, Strong, Fitbod):
  - [x] YÜKSEK: kas toparlanma (son çalışmadan geçen süre + yük) haritada ve öneri sıralamasında; ana
    ekranda "sıradaki öneri". Kayıtlı rutin, tek dokunuşla başlat. Otomatik ilerleme (son idman tekrarında
    da öneri uygulanır, "geri al"; ⚠ varsa uygulanmaz).
  - [x] ORTA: rekor (PR) rozeti ve listesi; özet kas ısı haritası; kart ayrıntısında son 8 idman grafiği.
  - [x] SONRA: dinlenme bitti bildirimi (kilitliyken), süperset, ısınma seti. (Kilitli ekran bildirimi service worker ister → sonraya; salonda ekran açık kalır + titreşim.)
  Bozmama kuralı: idman sayfası sütunları, Salon.gs/Code.gs/SporRef.gs, puanlama değişmez; mevcut akışlar
  (son idmanı tekrarla, idman, giriş, kayıt, kuyruk) aynen kalır; her adımda tüm testler (03.10.2026: hepsi
  geçti, uçtan uca 52/52) + yeni özelliğe yeni senaryo.
  Karar (03.10.2026): **tüm öneriler kabul** → (1) son idman tekrarında öneri uygulanır ("geri al"; ⚠ varsa
  uygulanmaz), (2) YÜKSEK + ORTA + SONRA ve eksiklerin hepsi, (3) eski 1. adım haritanın altında "Liste".
  Ana sayfadan doğrudan giriş de bu kapsamda. Uygulamadan önce yüzmeye taşınacak fikirler soruldu (aşağıda).

- [x] **Salondan yüzmeye taşınabilecek fikirler** (soru 03.10.2026, seçim bekliyor):
  1. MSI (ağrı) girişi kas haritasıyla: aynı görsel, sağ/sol omuz-diz vb. bölgeye dokun → 0,5/1/2; tabloya
     yazılan anahtarlar aynı (sag omuz, …). Son 4 haftanın ağrı haritası; salonda ⚠ ve rehab önerisini besler.
  2. Ortak yük ve toparlanma: yüzme de kas yüküne sayılır (stil × mesafe × RPE → omuz, sırt, triseps, karın,
     bacak; katsayılar tahmini, sporRef'te düzenlenebilir). Salon önerisi "dün 3 km yüzdün, omuz dinleniyor".
  3. Yüzme özeti salon özeti diliyle: bölge dağılımı (7 bölgede süre), geçen aynı setle kıyas
     (4×100 ort. 1:31, geçen 1:33 ↑), rekor rozetleri (en hızlı 100 tekrar, CSS altı set).
  4. Ana ekran kartları ortak dil: "✓ Bugün yapıldı" durumu, sıradaki, haftalık özet; takvimde salon günleri
     ve günlük yük çubuğu.
  5. Set ilerleme grafiği: aynı set türünün (ör. 4×100 FR) son 8 seferi; ayrıntı panelinde.
  6. Haftalık bölge dengesi (salondaki kas dağılımı gibi): 4 hafta / tüm zaman, kolay–eşik–sprint oranı.
  7. CSS güncelleme önerisi: eşik setleri sürekli hedefin altında ve RPE düşükse "CSS testi zamanı".

- [x] **Kapsamlı öneriler: yüzme + salon** (talep 03.10.2026: "hepsini iş listesine ekle"). Dayanak: yuzme-idman-modeli
  kısıtları (Perthes sağ kalça, sağ omuz impingement, sağ diz kondromalazi, MSI skalası, seans süreleri,
  kulaç normları, stil hiyerarşisi FR→BK→BF→BR), Hevy/Strong/Fitbod, MySwimPro/FORM/Garmin, TrainingPeaks.
  Not: senaryo panosundaki Goblet Squat kısıtla çelişiyor (ağırlıklı squat >90° yasak) → kısıt koruması gelince
  taslakta güvenli alternatifle (≤90° box squat / glute bridge) değiştirilecek.
  **A. Sağlık kısıtı koruması (önce bu)**
  - [x] A1 Kısıt profili: sporRef'te `kisit` sayfası (tanı → kural); uygulama okur, Ayarlar'da gösterir.
  - [x] A2 Salonda yasaklı/riskli hareket: H'ye "Kısıt" ve "Alternatif" sütunları; planlamada gizlenir ya da
    ⚠ "Perthes: ağırlıklı squat >90°" + güvenli alternatif önerilir; idmanda Değiştir de bunlara uyar.
  - [x] A3 Kurbağalama (BR) aylık sayaç: bu ayın BR metresi / toplam (sınır %10); BR set kartında "bu ay %7/10",
    sınıra yaklaşınca uyarı (diz kısıtı da ayrıca not edilir).
  - [x] A4 Omuz rahatlatma: her aerobik blok sonunda dinlenme ekranında kısa omuz rahatlatma kartı; yapıldı
    işareti seans notuna.
  - [x] A5 MSI kural motoru (yüzme + salon, idman içinde): 0,5 gözlem notu · 1–1,5 hafiflet (kalan tekrar/ağırlık
    önerisi) · ≥2 seti durdur (set biter, not düşer) · 3+ tıbbi uyarı, seansı bitir önerisi.
  - [x] A6 Seans süresi bütçesi: Sal/Çar/Per sabah 75–80 dk, öğle 65 dk, Cuma akşam sınırsız; yüzme programı ve
    salon planı ~süresi bütçeyle karşılaştırılır, aşarsa kırpma önerisi; haftada 3 gün sayacı.
  **B. Yük ve toparlanma (ortak)**
  - [x] B1 Seans yükü (sRPE = RPE × dakika) yüzme ve salon için; günlük ve haftalık yük.
  - [x] B2 Form grafiği (TrainingPeaks PMC mantığı): 42 gün "kondisyon", 7 gün "yorgunluk", fark "form".
  - [x] B3 Yük artış uyarısı (akut/kronik oran > 1,5): omuz geçmişi için erken uyarı; deload haftası önerisi.
  - [x] B4 Kas yükü haritası: salon (hkEtki) + yüzme (stil × mesafe × RPE katsayıları, sporRef'te düzenlenebilir)
    → toparlanma; salonda "dün 3 km FR: omuz dinleniyor".
  - [x] B5 Aynı gün çakışma uyarısı: ağır omuz salonu + uzun FR/kürek aynı gün ya da art arda.
  **C. Yüzme: idman içi**
  - [x] C1 Kulaç sayısı girişi (dinlenirken ±, varsayılan türe göre: drill 10–11, yüzüş 13–15, race 14–15,
    pull 11–12 /25 m); eski sayfasındaki Kulaç sütunu dolar (şu an boş yazılıyor). SWOLF ve kulaç başı mesafe.
  - [x] C2 Kulaç normu sapması: yüzüşte sürekli >15 ise "teknik bozuluyor / yorgunluk" notu.
  - [x] C3 Set sonu nabız (hızlı giriş; Nabız sütunu şu an boş yazılıyor).
  - [x] C4 Drill videosu: açıklamadaki drill adına göre bağlantı (sporRef `drill` sayfası; salondaki ▶ gibi).
  - [x] C5 MSI girişi kas haritasıyla (sağ/sol ayrımlı; tabloya yazılan anahtarlar aynı) + 4 haftalık ağrı haritası.
  **D. Yüzme: analiz**
  - [x] D1 Özet: bölge dağılımı, geçen aynı setle kıyas, rekor rozetleri, SWOLF.
  - [x] D2 Set ilerleme grafiği (aynı set türünün son 8 seferi).
  - [x] D3 Haftalık denge: bölge oranları (kolay/eşik/sprint) ve stil dağılımı (hiyerarşi, BR %).
  - [x] D4 Rehberli CSS testi (400 + 200): uygulamada test seti, CSS hesaplanır, onayla sporRef `css`'e yeni satır
    (SporRef.gs'e yalnızca ekleme işlemi). Eşik setleri sürekli hedef altında + RPE düşükse "CSS testi zamanı".
  - [x] D5 Derece tahmini: CSS ve set ortalamalarından 100/200/400 tahmini, zaman içinde.
  **E. Salon: ek**
  - [x] E1 Yüzücü önleyici dozu: haftalık omuz prehab (rotator manşet), core, kalça stabilite minimumu; "borç"
    ana ekranda ve planlamada öncelik önerisi olarak.
  - [x] E2 Kart üstü kısıt hatırlatması (ör. "derinlik ≤90°", "omuz ağrısızsa").
  - [x] E3 Isınma şablonu (bant omuz ısınması) idman başında, kayda sayılmaz.
  - [x] E4 Periyotlama: 4 haftalık blok (hacim → kuvvet → bakım) ve deload, yüzme yüküyle (B2–B3) eşgüdümlü.
  - [x] E5 (Önceki kabul edilenler: toparlanma, kayıtlı rutin, otomatik ilerleme, PR, ısı haritası, grafik,
    bildirim, süperset, ısınma seti.)
  **F. Ortak deneyim**
  - [x] F1 Ana ekran: haftalık 3 gün halkası, form durumu (taze/yorgun), bugünün önerisi (yüzme mi salon mu,
    süre bütçesiyle), BR ve omuz prehab göstergeleri.
  - [x] F2 Takvim: salon günleri, günlük yük çubuğu, kısıt uyarıları.
  - [x] F3 **Haftanın özeti** (04.10.2026, kişisel; paylaşım yok): Pazar açılır, geçmiş haftalara kaydırılır.
    Yüzme km · salon set · seans x/3 · form; bölge dengesi; stil + kurbağalama %; ağrı mini haritası; önceki haftayla
    kıyas; haftanın notları (ör. "EN3 hedef altında → CSS testi önerildi", "omuz önleyici 2/2 ✓"). Ana ekrandan
    ve Yapılmış idmanlar'dan açılır. Örnek görüntü: `tasarim/oneriler/rapor-eski.png` (paylaş düğmesi olmadan).
  - [ ] F4 Saat verisi içe aktarma (Garmin FIT) — **sonra** (04.10.2026), sürüm 12'de yok.
  - [x] F5 Haftalık program iskeleti önerisi: kısıtlar + form + denge → 3 günün odağı (öneri, program sayfasına
    yazmaz).
  Örnek ekranlar (19 taslak, her madde en az birinde): `tasarim/oneriler/oneriler.html` (kaynak: `kaynak/yap.py`).
  Bozmama kuralı aynı: tablo sütunları ve betikler yalnızca ekleme ile değişir (yeni sayfa/işlem), mevcut akışlar
  aynen; her adımda tüm testler + yeni senaryolar.

Sürüm 10 tamamlandı (bkz. Tamamlanan).

Sürüm 10.5 (sürüm 11 ile yayında):
- [x] Değişken uzunluktaki metinlerde yazı boyu alana uyar; alan boyutu değişmez.
  - Alan sabit kalır (kartta başlık ile kutular arasındaki boş yer gibi). Yazı, alanı dolduracak en
    büyük boyda gösterilir: kısa metin büyür (üst sınır), uzun metin küçülür (alt sınır, okunurluk için).
  - Alt sınırda da sığmazsa son satır "…" ile biter; tamamı karta dokununca ayrıntı panelinde.
  - Uygulanacak alanlar: set kartı açıklaması (hazır ve sıradaki set kartı), yüzerken/dinlenirken
    bilgi ve açıklama satırı (kesmek yerine küçülür), ayrıntı paneli açıklaması, mola ekranındaki
    "Sıradaki", ana sayfa Yüzme kartı bilgi satırı, takvim gün kartı başlığı.
  - Ekran döndüğünde/yazı tipi yüklendiğinde yeniden hesaplanır. Test: kısa (2 kelime) ve uzun
    (40+ kelime) açıklamayla 320–430 px'te alan boyutu sabit, yazı sınırlar içinde, taşma yok.

## 2. Aşama — Orta vade

### İşlev

> **Sürüm 11 (büyük sürüm) — "uygula" verildi (02.10.2026).** Sıra: 1) altyapı (3 dosya/betik, kurulum,
> sporRef) 2) yüzme (anında düzenleme, metin boyu, CSS/bölge) 3) salon idman + tabloya yazma
> 4) salon planlama + video 5) uçtan uca test → tek seferde yayın. Ara adımlar yalnızca geliştirme dalında.

> **Karar (02.10.2026):** Tek ve büyük bir sürüm çıkılacak. Dosya yapısı 3'lü: YuzmeProgram, SalonTakip ve
> sporRef'in her birine kendi `@OnlyCurrentDoc` Apps Script'i (3 adres + anahtar); betikler yalnızca kendi
> dosyasını görür.

- [x] **Yüzme idmanını idman anında değiştir / ekle / sil** (kararlar verildi; eski F.8 bu maddeye katıldı): karta dokun →
  ayrıntı panelinde Düzenle / Sonrasına set ekle / Sil; dinlenirken "+1 tekrar"; yüzerken kapalı;
  eklenen ve değişen setler tabloya planla farkı notuyla yazılır (Code.gs değişir).
  - Karar: planla fark Not sütununa yazılır ("Plan: 4×100 → 6×100", "idmanda eklendi").
  - Karar: `eski` sayfasında **Sıra**, **Set Mesafe**, **Set Süre** sütunları boş bırakılır (tablo kendisi
    dolduruyor). Eklenen sete sıra numarası verilmez; uygulama içindeki sırası yeterli.
  - Karar: **A** — karta dokununca açılan ayrıntı panelinin altında Düzenle · Sonrasına ekle · Sil
    (yüzerken sönük). Ortak düzenleme ekranı: ± düğmeler, stil/tür/alet seçenekleri, kısıt uyarıları.
    Dinlenirken kartta **"+1 tekrar"** kısayolu (bildirim + Geri al). Görsel: `tasarim/v17/duzenle.png`.
- [x] **Salon idman planlama** (taslak `tasarim/v16/salon-planlama.png`): hedef kaslara göre katsayı hesaplayıp
  hareket listesinden (H, hkEtki) hareket önermek.
  - Puan = Σ (kas öncelik ağırlığı × hareketin o kasa etkisi `hkEtki`) × yüzme aktarım katsayısı.
    Öncelik ağırlıklarına sen karar verirsin (otomatik öncelik yok).
  - Yüzme katsayısı: `H` sayfasındaki **Swim Transfer Coefficient** sütunu.
  - Seçim **kas grubu** düzeyinde; alt kas ve kinetik zincir hareket satırında bilgi olarak.
  - Karar: hedef tablodan **alınmaz**. Her planlamada `idman` sayfasından hesaplanan kas grubu dağılımı
    (son 4 hafta ve tüm zaman ortalaması) gösterilir; neye ağırlık vereceğine sen karar verirsin.
  - Varsayılan set/tekrar/ağırlık = son yapılan. İlerleme: son seferde RPE ≤ 8 ve MSI ≤ 0,5 → "+1 tekrar"
    veya "+2,5 kg" önerisi; RPE ≥ 9,5 veya MSI ≥ 1,5 → aynı değer + ⚠.
  - Son iki idmanda MSI ≥ 1,5 olan hareket ⚠ ile işaretlenir, puanı düşer, gizlenmez.
  - Süre tahmini: set × (tekrar × 3 sn + 60 sn); süreli harekette süre + 30 sn.
  - Plan yalnızca telefonda tutulur, tabloya yazılmaz; idman yapılınca satırlar `idman` sayfasına eklenir.
- [x] **Hareket videosu (YouTube)**: hareket kataloğuna (`H` sayfası) "Video" sütunu; uygulamada hareket
  kartında, planlama listesinde ve ayrıntı panelinde ▶ düğmesi, dokununca YouTube'da açılır.
  Yalnızca youtube.com / youtu.be adresleri kabul edilir.
  - Karar: video **YouTube'da açılır** (uygulama içinde gömülü oynatma yok; idman saati etkilenmez).
  - Karar: yalnızca **salon** hareketlerinde (yüzmede video yok). Video sütunu `H` sayfasında E'den sonra
    (formül `H!A:E` okuduğu için ilk 5 sütun değişmez).
- [x] **sporRef'ten referans verileri** (onaylandı): CSS (tarih aralığı + alet + havuz), 7 bölge
  (SP3–REC, CSS'e göre sn/100 m) ve HR bölgeleri, max nabız, faz bilgisi, RPE/MSI açıklamaları, kısaltmalar.
  Şu an CSS Ayarlar'dan elle (varsayılan 1:57), bölgeler uygulamada sabit Z1–Z5 — sporRef ile uyumsuz.
  3'lü yapı kararıyla sporRef kendi betiğinden okunur (salt okuma).

- [x] **Salon modülü**: SalonTakip tablosu (`idman` sayfası) ile çalışan salon idmanı.
  - Karar: başlangıçta iki seçenek — **son idmanı göster ve tekrarlamayı sor** ya da **yeni idman planla**
    (planlama ekranı). Kendi `@OnlyCurrentDoc` betiği (3'lü yapı).
  - Karar: **Tekrar** sütununa setlerin ortalaması (ör. 9,67), set ayrıntısı **Açıklama**'ya ("Setler: 11-9-9").
  - `v2` formülle üretiliyor (LET/REDUCE, `idman!A:J` sütun sırasıyla okur). Yazma kuralları:
    - `idman` sütun sırası A–J değişmez (Tarih, No, Hareket, Set, Tekrar, Ağırlık, Nabız, RPE, MSI, Açıklama).
    - Tarih gerçek tarih; Set/Tekrar/RPE/MSI/Nabız sayı (metin "7,5" değil); nabız yoksa boş.
    - Vücut ağırlığı tam olarak **"Vücut"** yazılır (formül BW katsayısını buna göre uygular); esnemede 0.
    - Hareket adı `H` ve `hkEtki` sayfalarındaki adla birebir aynı (yoksa v2'de "##veri yok##").
    - Uygulama yalnızca katalogdaki hareketleri önerir; katalogda olmayan hareket uyarıyla eklenir.
  - Karar: **Nabız, RPE, MSI her hareket için elle** girilir (hareket sonunda giriş adımı).
  - Karar: **hareket süresi** (ilk set başı → son set sonu, mm:ss) `idman` sayfasının **K sütununa** yazılır
    (v2 formülü A–J okuduğu için K güvenli).
  - Salon idman ekranı (taslak `tasarim/v18/salon-idman.png`): düğme **BAŞLA / BİTTİ**; set tekrarı ± ile
    düzeltilir; dinlenme sayacı; hareket sonunda Nabız (±, geçen değerle hazır) · RPE · MSI · Not girişi.
    Hareket süresi ilk set başından son set sonuna. Süreli hareketlerde BAŞLA → geri sayım, kendiliğinden biter.
  - Karar (onaylandı): yüzmedeki A düzeni salonda da — karta dokun → panel: Düzenle (set, tekrar,
    ağırlık, dinlen) · **Değiştir** (aynı kas grubundan puanlı liste; makine doluysa) · Sonrasına ekle
    (puanlı hareket listesi) · Sil (başlanmamış); dinlenirken **"+1 set"** kısayolu.
    Başlamış harekette set sayısı yapılanın altına inemez. Plan telefonda olduğu için "planla fark" notu yok;
    `idman` sayfasına gerçekte yapılan (değiştirilen hareket kendi adıyla) yazılır.

- [x] **F.2** (sürüm 12) Seans özeti ve analiz: bitişte planlanan/gerçekleşen mesafe-süre,
  blok bazında dağılım; haftalık toplamlar.
- [x] **F.3** (sürüm 12) Set başına kulaç sayısı / nabız girişi (isteğe bağlı alanlar).
- [x] İdman sırasında ağrı (MSI) kaydı — karar: yüzmede seans sonu yeterli (salonda hareket başına).
- [x] **F.7** Service worker: uygulama dosyaları önbellekte, internet yokken de açılır. → YAPILDI 13.6.0

### Görsel

Sürüm 8 görünümü korunuyor; v10/v11 önerileri beğenilmedi, görsel yenileme sonra konuşulacak.

- [x] Form, kurulum ve "Kaydedildi" ekranlarını yeni tasarıma uyarlamak; renk → YAPILDI 13.6.0
  paletlerini (sarı set ekranı / turkuaz takvim / gri ana sayfa) tek sistemde toplamak.
- [x] Tutarlı simge seti (şu an elle çizilmiş karışık SVG ve karakterler). → YAPILDI 13.6.0
- [x] Yeni uygulama simgesi. → YAPILDI 13.6.0
- [x] Hareket ve kutlama: seans bitişinde kısa animasyon, geçişlerde yumuşaklık. → YAPILDI 13.6.0
- [x] Açık tema (güneşli dış havuz için). → YAPILDI 13.6.0
- [x] Ayarlar'da yazı boyutu seçimi. → YAPILDI 13.6.0

## İzlenecek
- 14.10 (13.6.0): "13.2.0 yüzme … biten setin tekrar süresi idmanda düzeltilir" sürüm 13 dosyası tam koşuda 3'te 1 "Bu seti sıfırla?" modalını bekleyip zaman aşımına düşüyor (13.5'te de bir kez); tek başına hep geçiyor. Kök neden araştırılacak (sahte saat + çift dokunma koruması?).
- 14.10 (13.5.0): tam takımda yüzme senaryoları ara sıra zaman aşımıyla kalıyor ("Mola", "Tam idman", "Eski Code.gs"); tek başına hep geçiyor. Ağır yükte sahte saat zamanlaması; ayrı bir düzeltme işi olabilir.
- 13.4 ilk kara idmanında kontrol: karaVeri hareket satırları, karaSeans tek satır, günün karaPlan satırları silindi mi (14.10: bağlantılar, ana sayfa ve katalog tamam).
- E2E "Eski Code.gs (detay yok)" senaryosu tam takımda bir kez "geçmiş gün indirilmez" ile kaldı (14.10), tek başına iki kez geçti; zamanlamaya bağlı olabilir.
- 13.2.0 (09.10.2026): "sporRef beklenmeyen cevap verirse çökmez" senaryosu tam koşuda bir kez zaman aşımı verdi, tek başına ve tekrar tam koşuda geçti (sahte saat).
- Uçtan uca testlerde sahte saatle zaman ilerletmeli uzun yüzme senaryoları ("Tam idman", "Mola") tam takım
  çalışırken ara sıra bir dokunuşu kaçırıyor (yaklaşık 2–3 tam koşuda bir). 04.10.2026'da sürüm 12 öncesi kodda da
  (70498a8) aynı görüldü: uygulama hatası değil, test düzeneğinin sahte saat zamanlaması. Tek başına koşunca hep geçer.
  12.1.0 (04.10.2026): aynı tür ara sıra kaçırma "Seti erken bitirme", salon "Süperset" ve "İdman: ısınma"
  senaryolarında da birer kez görüldü; tekrar koşuda ve ardışık 3 tam koşuda geçti. Düzenek sağlamlaştırılmalı
  (sahte saat ilerletmeden sonra ekranın güncellenmesini beklemek).

- [ ] Telefondaki tarih önbelleğinin neden bozulduğu kesin bulunamadı. Sürüm 3+
  bozuk kaydı atlıyor ve hatayı ekranda gösteriyor. "Tarih listesi beklenmeyen
  biçimde geldi" veya "Beklenmeyen hata" mesajı görülürse ekran görüntüsü alınacak.

## Senin tarafında (tabloda / Apps Script'te)

- [x] `eski` sayfasında B1 = **Sıra** düzeltildi.
- [x] Code.gs yeni sürüm olarak dağıtıldı (arsiv, en yeni üstte, @OnlyCurrentDoc).
- [x] Sürüm 9 için Code.gs'i yeniden yapıştırıp **yeni sürüm** olarak dağıt (program — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
  hızlı açılış için tarih listesi setleri de gönderir).
- [x] Anahtar yenilendi (`tokenUret`), telefon yeni anahtarla çalışıyor.
- [x] **Sürüm 13:** SalonTakip'te yeni `Salon.gs`'i yapıştır → Dağıtımları yönet → Yeni sürüm (adres ve anahtar aynı). — eski kurulum adımı, geçildi (13.4: idman / idmanRef / idmanKutuphane)
  Salon programı (`plan` sayfası; ilk "Programa yaz"da betik açar) için gerekli. `idman` sayfası değişmez.
- [x] Sürüm 13: telefonda videoları bir kez dene (YouTube bu geliştirme ortamında kapalıydı; gömme kapalı olan
  video "YouTube'da aç" bağlantısına düşer — beğenmediğini H · Video sütununa başka adresle yaz).

## Tamamlanan

- [x] Sürüm 13.8.0 (20.10): Etiket sütunu — plandan okunur, idmanda değiştirilebilir (Düzenle / Etiket yaz), yuzmeVeri'ye yazılır. idman.gs dağıtımı gerekir.
- [x] Sürüm 13.7.0 (16.10): yüzme setinin mesafesini set anında / sonunda / özette düzeltme (kullanıcı: 1500 yerine 1600 yüzdüm).
- [x] Sürüm 13.4.0 (dağıtım: idman.gs yeni sürüm + idmanKutuphane.gs yeni betik):
  - idman sayfa adları yuzme… / kara… (eski adlar yedek); karaSeans (Tarih, Süre, RPE, MSI, Yer, Açıklama) yazımı,
    kara özetinde "İdmanın geneli" adımı; yük karaSeans'tan.
  - idmanKutuphane dosyası (karaHareket, karaEtki; karaKas okunmaz) için üçüncü betik ve bağlantı.
- [x] Terim değişikliği (14.10): arayüzde "salon" yerine **kara idmanı**, "havuz" yerine **yüzme** (sayfa adları yuzme… / kara…).
  Yer seçeneği "Salon" (mekân) ve havuz boyu (25/50 m) aynen kalır; iç anahtarlar (ysk.salon…, tur 'salon') değişmez.
- [x] Sürüm 13.3.0 (dağıtım gerekmez; idman.gs 13.2.1 yeterli):
  - Ana sayfa salon kartı yüzme kartıyla aynı yapı; plan yalnızca salonPlan'dan (bugün ya da sıradaki gün).
  - "Son idmanı tekrarla/düzenle" kaldırıldı; salon ekranında salonPlan günleri (İdmanı aç / Bu planla başla / Düzenle).
  - Planlama "Plana yaz" ile salonPlan'a yazar; Takvim (salon programı) ana sayfadan açılır, geri ana sayfaya döner.
  - Artış önerisi yalnızca plandaki değerden yüksekse sorulur.
  - Bilinçli test değişiklikleri: son idman şablonu / "Hazır plan" / "Programa yaz" düğmesi senaryoları salonPlan akışına çevrildi.
- [x] Sürüm 13.2.1: getSalon hızlandı (gerekli sütunlar), 60 sn bekleme; havuzSeans isteğe bağlı; salon idmanı sonrası salonPlan satırları silinir.

- [x] Sürüm 10.4:
  - Düğme **YÜZ / DUR**; ilk YÜZ idmanı ve 1. tekrarı birlikte başlatır (ayrı "İDMANA BAŞLA" yok).
  - 5+ tekrarlı setlerde şerit, "Tekrar 7/12", ortalama ve son 3 süre (12–20 tekrar sığar).
  - Yüzerken/dinlenirken set bilgisi (Hedef · Dinlen · Alet, açıklama); set sonu dinlenmesinde
    sıradaki setin içeriği öne, sayaç kartın altında ince şerit.
  - Karta dokununca ayrıntı paneli.
  - Mola: sol alt düğme (dinlenirken) veya ‹ → Mola ver; saat, sayaç, bipler durur; DEVAM ET;
    mola süresi idman ve dinlenme ölçümünden düşülür; özette "Mola" hazır ifadesi.
  - Kısa ekranlarda sıradaki set kartı kademeli sıkılaşır; yüzerken başlık–stil boşluğu giderildi.
  - Görseller: `tasarim/v14/oneriler-1.png`, `tasarim/v14/oneriler-2.png`.
- [x] Sürüm 10.3 (hata düzeltme):
  - Hazır set kartında stil · tür ("FR · Kick") yine başlığın hemen altında, boşluksuz (Sürüm 10'da
    başlığın yanına sığmayınca boşluklu alt satıra düşüyor, kart uzuyordu).
  - Kısa ekranlarda kart sığmazsa kademeli küçülür; en alttaki tempo · mesafe satırı kesilmez.
  - Test: 320, 375, 390, 430 px'te başlık–stil boşluğu ve kart taşması.
- [x] Sürüm 10.2 (görsel):
  - Takvim (B): nötr koyu zemin ve kartlar; turkuaz yalnızca seçili gün, BUGÜN ve "… idmanını aç"ta.
  - Ana sayfa (C): bölüm renkli kartlar (Yüzme turkuaz, Salon amber); Yüzme kartında ilk planlı
    idman, **İdmanı aç** (doğrudan giriş) ve **Takvim**; devam eden seansta "Seansa devam et".
- [x] Sürüm 10.1:
  - Büyük düğmenin yazısı düğmeye sığar; gerekirse iki satıra bölünür (İDMANA / BAŞLA).
  - Seti sıfırla: SET TAMAM'a dokununca onay; setin tekrarları silinir, set yeniden yapılır.
  - Kayıttan sonra takvimde bugüne dönülür (sıradaki idman seçilmez).
  - Testler: sahte saatin ara sıra ilerlememesinden kaynaklanan kararsızlık giderildi.
- [x] Sürüm 10 — zamanlama modeli (`ZAMANLAMA.md`):
  - `zaman.js`: olay listesinden tekrar/dinlenme/set sonu süreleri; birim testleri.
  - Tek büyük düğme İDMANA BAŞLA → ÇIK → GELDİM; tekrar kutucukları, büyük saat (eksiye kırmızı),
    üstte 54 px süre/mesafe; son GELDİM seti, son setin son GELDİM'i idmanı bitirir.
  - 3-2-1 + uzun bip, Ses düğmesi, GELDİM onay sesi; Geri al (5 sn), çift dokunma koruması (2 sn),
    yüzerken kaydırma ve ‹ kapalı; seti ve idmanı erken bitirme.
  - Seans sonu: RPE → MSI → Özet; onaylı not satırları, şüpheli tekrar düzeltme, havuz hatırlanır.
  - Gerçek = ortalama tekrar; seans mesafesi = yapılan tekrarlar.
  - Kaldırıldı: kronometre ekranı, su kilidi, Seti Tamamla, Başla/Bitir, eski form.
  - Eski biçim seans yeni modele taşınır.
  - Düzeltilen hatalar: set geçişinde aktif kartın vurgusu kayboluyordu; "İdmana dön"
    tamamlanmış sette kalıyordu; 320 px'te set mesafesi taşıyordu.
  - Testler: 17 zaman.js, 33 uçtan uca senaryo ve baştan sona tam akış yeni akışa göre yazıldı.
- [x] Sürüm 9 (hata düzeltme):
  - Su kilidi artık tüm ekranı örter: kronometrede kilitliyken ekrana veya TUR'a
    dokunmak tur ekliyordu — düzeltildi.
  - Program beklemeden açılır: tarih listesi setleri de getirir (Code.gs güncellemesi),
    güncel hali arka planda kontrol edilir; eski Code.gs'te yaklaşan günler önceden indirilir.
  - Kronometre, ölçüm sürerken başka sete geçilse de ölçülen sete bağlı kalır (başlık,
    çıkış sesi, Kaydet paneli).
  - Testler: 20 data.js + 21 Code.gs uç durum + 33 uçtan uca senaryo + ana akış testleri.

- [x] Sürüm 8 (1. aşama):
  - Ana sayfa: Yüzme (sıradaki idman) / Salon (Yakında) / Yapılmış idmanlar / Ayarlar;
    takvimde ‹ ana sayfaya döner; devam eden seans doğrudan açılır.
  - Takvimde seçili olmayan günlerin çubukları gri (ana set en açık).
  - Plan satırları silinmeden önce **arsiv** sayfasına taşınır; biten seans telefonda
    saklanır, "Yapılmış idmanlar"dan tek tek / toplu, onayla silinir.
  - G.1 `@OnlyCurrentDoc` · G.3 anahtar yenileme (README) + Anahtarı unut ·
    G.4 CSP + yalnızca `/exec` adresi kabul · G.5 yazı tipleri depoda ·
    G.6 sunucu hata ayrıntısı gizli (başvuru numarası).
  - F.1 çıkış sesi (3-2-1 kısa, çıkışta uzun; Ayarlar'dan kapatılır) · F.5 100 m tempo +
    CSS bölgeleri (kartta ve kronometrede; ekipmanlı setlerde bölge yok) · F.6 su kilidi.

- [x] Sürüm 7: setler daha yavaş kayar (~170 px/durak, fırlatma en fazla 1 durak);
  presbiyopi için büyük/kontrastlı değişken veriler (durak süreleri 22 px, Hedef/Dinlen 60 px,
  Alet 24 px, uzun açıklama otomatik küçülür); üst başlık Süre (geçen/hedef) · Mesafe;
  ilk sayfa hafta takvimi (G2, kaydırılabilir hafta, dokunmak seçer, idmana düğmeyle girilir);
  Code.gs getDates gün kartı önizlemesi için set blok/mesafe/süre döndürür (dağıtım bekliyor).

- [x] Metro tasarımı (sürüm 6): tekerlek gibi dönen metro hattı, peron ve önceki/sonraki
  ikişer durak; blok renkli, mesafeye oranlı ilerleme çubuğu; yığımlı hedef süreler;
  Kronometre · Seti Tamamla · Başla/Bitir barı; %70 kronometre (Hedefe / Çıkışa / Son tur);
  alttan açılan Kaydet paneli; tüm ekranlarda koyu zemin + sarı vurgu.

- [x] Gece Havuzu görünümü: lacivert zemin, blok renkli şerit ve ilerleme çubuğu (sürüm 5)
- [x] Kart düzeni: 1) Tekrar × Mesafe Stil Tür 2) açıklama (büyük) 3) Hedef · Dinlen · Alet
  4) Mesafe set/yığımlı · Süre set/yığımlı (küçük) (sürüm 5)
- [x] Üstte toplam hedef süre (yapılan / toplam) (sürüm 5)
- [x] seans: en yeni üstte (Code.gs, dağıtım bekliyor)

- [x] eski: yeni seans satırları 2. satırdan itibaren en üste (Code.gs, dağıtım bekliyor)
- [x] Gün listesi açılışta hemen tazelenir, kuyruk arka planda gönderilir (sürüm 4)
- [x] "Zaten kayıtlı" ekranında takılma; bozuk yerel kayıtlarda çökme (sürüm 3)
- [x] Kayıt tabloya yazıldığı halde "kaydedilemedi" denmesi (sürüm 3)
