# idmanSK — Teknik şartname (sürüm 13.12.1, 22.10.2026)

Bu belge uygulamanın mimarisini, veri modelini, arka uç sözleşmesini ve ekran akışlarını anlatır. Yeni bir
Claude Code oturumu buradan kaldığı yerden devam edebilmelidir. Kurallar ve günlük komutlar: `CLAUDE.md`.
Sürüm geçmişi ayrıntısı: `README.md` ("Sürüm 13.x'te neler var"), iş listesi: `IS_LISTESI.md`.

---

## 1. Genel yapı

```
iPhone (Safari, ana ekrana eklenmiş PWA)
   index.html + style.css + ES modülleri (app.js → data.js, zaman.js, salon.js, ...)
   localStorage (ysk.*)  ·  service worker (sw.js, çevrimdışı açılış)
        │  fetch POST (JSON, text/plain; CORS'suz)  — her tablonun kendi adresi + anahtarı
        ├── idman.gs          → "idman" Google tablosu   (yüzme + kara girişleri; okuma/yazma)
        ├── idmanRef.gs       → "idmanRef" tablosu       (bölgeler, CSS, faz…; salt okuma + addCss)
        └── idmanKutuphane.gs → "idmanKutuphane" tablosu (hareket kataloğu, kas etkisi; salt okuma)
```

- Derleme adımı yok: dosyalar olduğu gibi GitHub Pages'te yayınlanır (`main` dalı).
- Modüller `?v=SURUM` ile yüklenir; sw.js `SURUM` değiştikçe önbelleği yeniler (asset: cache-first, sayfa:
  network-first, script.google.com asla önbelleğe alınmaz).
- CSP: inline script/stil yok. Dinamik stil `data-*` öznitelikleri + JS ile (ör. `data-grow`, `data-bg` → `paint()`).
- Kullanıcı arayüzü Türkçe; koyu tema varsayılan (`tema`: koyu / açık / sistem; `yazi`: 1 / 1.12 / 1.25 zoom).

## 2. Google tabloları (sütunlar 1. satırdaki BAŞLIK ADIYLA bulunur; harf/sıra varsayılmaz,
## büyük/küçük harf, boşluk ve Türkçe karakter farkı önemsiz — `normalize_`)

Sayfa adları dizi olarak tanımlı: ilk ad güncel, sonrakiler eski adlar (`sheetOf_(ss, names)`).

### idman dosyası
| Sayfa (eski adlar) | Sütunlar | Kim yazar |
|---|---|---|
| **yuzmePlan** (havuzPlan) | Tarih, Sıra, Blok, Tekrar, Mesafe, Stil, Tür, Açıklama, Hedef, Dinlen, Alet, Set Mesafe, Yığımlı Mesafe, Set Süre, Yığımlı Süre, Gerçek, Kulaç, Nabız, RPE, MSI, Not, Etiket, Hafta, Hedef Zone, Gerçek Zone, Hedef Pace, Gerçek Pace (formül sütunları kullanıcının) | Kullanıcı / idman oturumu yazar; uygulama okur, kayıtta günün satırlarını siler |
| **yuzmeVeri** (havuzVeri) | Plan sütunlarıyla aynı (+ Etiket). Tarih **yalnız gün** | finishSession: yapılan her set bir satır, en yeni üstte |
| **yuzmeSeans** (havuzSeans, isteğe bağlı) | Tarih, Süre, Mesafe, Havuz, RPE, MSI, Açıklama. Tarih **başlangıç saatli** (13.9, `dd.mm.yyyy HH:mm:ss` (13.12: timestamp, 24 saat)) | finishSession: seans başına 1 satır |
| **karaPlan** (salonPlan) | Tarih, Sıra, Hareket, Set, Tekrar, Ağırlık, Süre, Dinlen, Süperset, Not, Durum | savePlan (uygulamadaki "Plana yaz") / kullanıcı |
| **karaVeri** (salonVeri) | Tarih, No, Hareket, Set, Tekrar, Ağırlık, Nabız, RPE, MSI, Açıklama, Süre | saveSalon |
| **karaSeans** (salonSeans, isteğe bağlı) | Tarih (başlangıç saatli, 13.9), Süre, RPE, MSI, Yer, Açıklama | saveSalon (req.seans varsa) |

### idmanRef dosyası
zone (7 tempo bölgesi, CSS farkı sn/100 m), css (tarih/havuz/alet bazlı CSS), alet, bilgi (BW = vücut ağırlığı
satırı dahil), RPE, MSI, faz (sezon/faz/ilk/son/odak); isteğe bağlı kisit, yuzmeKas, drill. Eski: salonHar,
salonHKEtki (artık kütüphanede).

### idmanKutuphane dosyası
- **karaHareket** (salonHar, H): Exercise, Goal Tag, Equipment, BW Coefficient, Swim Transfer Coefficient, Gemini STC, Chat GPT STC
- **karaEtki** (salonHKEtki, hkEtki): A1 boş → A sütunu hareket; Muscle Group, Muscle, Kinetic Chain, Yük Etki Oranı, Notlar
- karaKas okunmaz.

## 3. Arka uç sözleşmesi

Ortak: `doPost(e)` → gövde JSON `{ action, token, ... }`. Cevap `{ ok: true, data }` ya da
`{ ok: false, error: KOD, message, ref? }`. Token Script Properties `TOKEN` ile sabit-zamanlı karşılaştırılır;
token tanımsızsa herkes reddedilir. Yazma işlemleri `LockService` altında (30 sn; alamazsa `LOCKED`).
Kurulum: her betikte `tokenUret()` çalıştır → web uygulaması olarak dağıt (erişim: herkes, çalıştıran: ben).

Hata kodları: AUTH, BAD_REQUEST, UNKNOWN_ACTION, LOCKED, DUPLICATE, SAME_DAY (13.9), NOT_FOUND, PLAN_MISMATCH,
WRITE_MISMATCH, MISSING_COLUMN, NO_SHEET, SERVER. Geçici sayılanlar (istemci kuyruğa alır): NETWORK, HTTP, BAD_RESPONSE, TIMEOUT,
LOCKED, SERVER.

### idman.gs
| action | İstek | Cevap / davranış |
|---|---|---|
| getDates | – | `{ dates: [{ tarih, setler:[{sira,blok,mesafe,sure}], detay:[set…] }] }` planlı günler |
| getPlan | `tarih` | `{ tarih, setler: [set] }` set: sira, blok, tekrar, mesafe, stil, tur, aciklama, hedef, dinlen, alet, (etiket sütun varsa) |
| finishSession | aşağıda | `{ yazilanSet, silinenSet, kalanSet?, uyari? }` |
| getSalon | – | `{ katalog, etki, bw, gecmis, plan?, seans? }` (katalog/etki artık kütüphaneden gelir) |
| saveSalon | `tarih, hareketler:[{hareket,set,tekrar,agirlik,nabiz,rpe,msi,aciklama,sure}], seans?:{sure,rpe,msi,yer,aciklama,baslangic}` | karaVeri'ye yazar (o gün varsa DUPLICATE), karaSeans 1 satır (hata → hepsi geri), günün karaPlan satırlarını siler |
| getGecmis | `gun?` (7–400, varsayılan 120) | `{ sets:[{t,b,n,m,s,u,a,h,g,z}], seans:[{t,ts,rpe,havuz,mesafe,sure}], gun, alindi }` yuzmeVeri (+ yuzmeSeans) salt okuma, kıyas kaynağı (13.12) |
| savePlan | `tarih, hareketler` | karaPlan'da o günü değiştirir (yoksa sayfayı açar) |
| planYapildi | `tarih` | karaPlan'da o günü siler |

**finishSession** isteği:
```
{ tarih: 'YYYY-MM-DD',
  baslangic?: ms,            // 13.9 seans başlangıcı → yuzmeSeans Tarih saatli (aynı güne düşmüyorsa saatsiz)
  ikinci?: true,             // 13.9 aynı günün ikinci idmanı (kullanıcı onayladı)
  birak?: [Sıra…],           // 13.9 bu Sıralı plan satırları silinmez (yarıda kesilen idman)
  seans: { sure:'h:mm:ss', mesafe, havuz:25|50, rpe, msi:'bölge n; …', aciklama },
  setler: [ { sira|null, tamamlandi, eklendi?, gercek:'mm:ss.s', kulac, nabiz, rpe, msi, not,
              plan?:{ idmanda değişen alanlar: blok,tekrar,mesafe,stil,tur,aciklama,hedef,dinlen,alet,etiket } } ] }
```
Sıra: 1) yinelenme: aynı başlangıç dakikalı seans satırı → DUPLICATE; ikinci değilse ve o gün Veri/Seans'ta
kayıt varsa → baslangic varsa SAME_DAY, yoksa DUPLICATE. 2) tamamlanan setler Plan satırından kopyalanıp
(başlığa göre) yuzmeVeri'nin üstüne yazılır; idmanda eklenen setler (`eklendi`) bağlandıkları setin arkasına.
Sıra/Set Mesafe/Set Süre boş bırakılır, formül sütunları komşu satırdan R1C1 kopyalanır. 3) sayı doğrulanır
(önceki + yeni). 4) yuzmeSeans satırı. 2–4 hata → bu çağrının satırları geri alınır. 5) günün plan satırları
silinir (`birak` hariç).

### idmanRef.gs
- getRef → `{ zones, css, bilgi, alet, rpe, msi, faz, katalog, etki, bw, kisit?, yuzmeKas?, drill? }`
- addCss `{ tarih, css, havuz?, alet? }` → css sayfasına satır (CSS testi sonucu).

### idmanKutuphane.gs
- getKutuphane → `{ katalog, etki }`.

## 4. İstemci veri katmanı (data.js)

- `TARGETS`: 'yuzme' (idman), 'ref' (idmanRef), 'kutuphane'; kara idmanı da idman bağlantısını kullanır.
- `call(action, body, target)` → fetch, `REQUEST_TIMEOUT_MS` 30 sn (getSalon 60 sn), `ApiError{code, transient}`.
- localStorage anahtarları:

| Anahtar | İçerik |
|---|---|
| ysk.config | bağlantılar `{apiUrl, token, ref:{…}, kutuphane:{…}}` |
| ysk.dates / ysk.plans | gün listesi ve gün programları önbelleği (`forgetDate`, `forgetPlan`) |
| ysk.session | devam eden yüzme seansı `{v:2, tarih, events, setler?, yedek, form, yz, screen}` |
| ysk.queue | gönderilemeyen kayıtlar `[{id, tur, payload, tries, lastError}]` |
| ysk.history | telefonda biten seanslar (status sent/queued/duplicate); elle silinir |
| ysk.prefs | havuz, css(elle), ses, bildirim, yer, karaYorgunluk, tema, yazi … (beyaz liste) |
| ysk.ref / ysk.kutuphane / ysk.salon | arka uç cevaplarının önbelleği |
| ysk.salonSession / ysk.salonPlan | kara idmanı seansı ve telefondaki plan |
| ysk.gecmis | (13.12) Drive'daki yuzmeVeri/yuzmeSeans son günleri `{sets, seans, alindi}`; kıyas, rekor, RPE kayması (analiz.gecmisListe + benzerMi) |
| ysk.hazir / ysk.hareketNot | günlük hazır olma kontrolü, harekete sabit not |

- Kuyruk: `enqueue`, `flushQueue` (başarılı ve DUPLICATE çıkar; SAME_DAY kalır, `markQueueIkinci(id)` ile
  `ikinci:true` yapılıp yeniden gönderilir; ağ hatasında durur). Uygulama her açılışta ve gün listesinde dener.

## 5. Yüzme zamanlaması (zaman.js, ZAMANLAMA.md)

Seans bir **olay listesidir**; süre hiçbir yerde biriktirilmez, her şey `replay(events, sets)` ile yeniden hesaplanır.
- Olaylar: `basla`, `cik {set}` (tekrar başlar), `geldim` (tekrar biter), `bitir {auto}`, `mola`, `devam`.
- Ekranda tek büyük düğme: YÜZ (cik; ilk YÜZ basla+cik aynı ts) / DUR (geldim). Setin son DUR'u seti, son setin son
  DUR'u idmanı bitirir. Çift dokunma koruması 2 sn.
- Durum `st`: phase idle|ready|swim|rest|done, cur, per[i].reps[{cik,geldim}], rests, mola…
- Sol alt düğme: son dokunuştan 5 sn "Geri al" (son olayı siler); dinlenirken "Mola"; yüzerken "✕ İptal" (13.9:
  onayla son `cik` silinir, ilk tekrarsa `basla` da).
- Tekrar süresi düzeltmeleri `form.edits[setKey][rep] = ms | 'drop'`; şüpheli tekrar (`suspects`) özette işaretlenir.

## 6. Ekranlar ve akışlar (app.js)

`show(name)` ekranları değiştirir; `state` tek global durum (session, plan, zst, wheel, screen, dates…).

- **13.12:** ortak takvim (`#home-cal`: `renderHomeCal`, gün noktaları, seçili günün özeti; `#home-swim` ve `#home-gym-cal` artık özet satırları);
  set kartı başlığı `.w-hd` (blok karesi `.w-blk`, ad `.w-hn`, bölge rozeti `.w-zb` + 7 kademeli `.w-meter`); yüzerken `ph-swim` (dev saat), dinlenirken
  `ph-rest` (`.w-timer.is-bar`, `restInfo`, `nextLine`), set sonunda `prevSetLine`; düzeltme: yüzmede `data-rep` kutusu → `duzeltSet`, karada `data-sl-set` → `slDuzeltSet`;
  kıyas: `analiz.gecmisListe/benzerMi/benzerGecmis/kiyas2/rekor2`, `gecmisEsitle()` (kayıttan sonra zorla, ana sayfada 20 dk).
- **Renk sistemi (13.11):** rol başına tek renk — sarı `--accent` (birincil eylem), yeşil `--done` (durum), amber `--warn`, kırmızı `#FF6B6B`/`#EF4444`,
  dinlenme/mola nötr (`var(--text)`). Blok renkleri `BLOKLAR` (WU krem, PS gül, AS somon, CD açık mavi); ana set `blokOf(s)` ile bölgeden:
  `ZONE_FILL` (n: 1 REC … 7 SP3). Bölge metin/çubuk rengi `.z1–.z7` (`--zc` metin, `--zf` dolgu, `--zi` hap yazısı). Kimlik: `--t-teal` yüzme
  (#3FC1D9), `--t-amber` kara (#A78BFA; adı eski). Kart: `.w-card` çapraz renk akışı + `inset 4px` sol vurgu; metin tonu
  `color-mix(var(--c) var(--cp), var(--cmix))` (koyu: beyaza, açık: siyaha karışır). Yazı boyutu seçenekleri 0.9/1/1.12/1.25/1.4.
- **Ana sayfa** (`home`): Yüzme kartı (bugünün programı), Kara kartı (karaPlan'dan; metro şeridi), haftalık şerit,
  Form ve denge, hazır olma (B7), uyarılar (B18). Ayarlar: 3 bağlantı, görünüm, ses, bildirim, CSS, yedek.
- **Gün seçimi** (`days`): hafta takvimi; banner'lar (devam eden seans, bekleyen kayıtlar → Yönet). "… idmanını aç".
- **İdman** (`program`): üst bilgi (SÜRE/MESAFE, set şeridi), `wheel` (metro tekerleği; aktif set kartı, komşular
  satır), dock (sol: Geri al/Mola/İptal · büyük YÜZ/DUR · Ses).
  - Kart modları: ready, live (yüzerken/dinlenirken), next (set sonu dinlenmesi; sıradaki set öne), sum (biten).
  - 13.10.1: `m-next` (set sonu dinlenmesi) kartında sayaç `flex: 3` ile kalan alanı doldurur, aynı uzatılmış rakamlar; başlık tek satır;
    banner kalktı (biten setin özeti kendi kartında).
  - 13.10: odak düzeninde `.w-tbig` dikey uzatılır (`--sy` 2.2, `scaleY`; kutu yüksekliği 0.85·boy·sy, `pointer-events:none`);
    `.w-reps` ve `.w-info` gizli, başlık 40 px.
  - 13.9 odak düzeni: phase swim|rest iken `#wheel.is-focus`, `wheel.setSide(1)`; kart tam genişlik, açıklama gizli,
    kronometre `container-type:size` ile kutuya sığan en büyük boy. Dock 150 px.
  - Karta dokun → ayrıntı paneli (büyük yazı; Mesafe / Etiket düzelt). Uzun bas / SET TAMAM'a dokun → seti sıfırla,
    tekrar sürelerini düzelt, mesafeyi düzelt, etiketi yaz.
  - Düzenle / Sonrasına ekle / Sil / +1 tekrar (duzen.js); düzenlenen plan `session.setler`'de.
  - ‹ paneli: devam et, takvime dön, idmanı bitir ve kaydet.
- **Seans sonu:** RPE → MSI (ağrı haritası) → **Özet** (tekrar notları, şüpheli tekrar, mesafe düzelt, hazır
  ifadeler, açıklama, "Yapılmayan N set planda kalsın" kutusu) → Kaydet.
  - Hatalar: SAME_DAY → "Bugüne ait idman kaydı var" (onay → ikinci:true); DUPLICATE → kapat (geçmişte "Zaten
    kayıtlıydı"); geçici → kuyruk; kalıcı → Tekrar dene / Kuyruğa al / Özete dön. Kayıt hiçbir yolda silinmez.
  - Başarı → `keepInHistory`, `endSessionLocally(kalanVarsa)` (kalan varsa gün listede ve seçili kalır), onay ekranı.
- **Geçmiş** (`history`): telefondaki biten seanslar, durumları, elle silme.
- **Kara idmanı** (`salon` ekranları, salon.js): plan (karaPlan veya telefonda planlama: hedef → hareket seç
  (öneri/puan, alternatifler P3) → plan), idman tekerleği (BAŞLA/BİTTİ, dinlenme, set ±), hareket sonu nabız·RPE·MSI·not,
  "İdmanın geneli" (karaSeans) → özet → saveSalon. "Plana yaz" → savePlan.

## 7. Hesap modülleri (saf, birim testli)

- **ref.js**: güne/havuza/alete göre CSS (`cssFor`), 100 m tempo → bölge (`zoneFor`, varsayılan 7 bölge).
- **yuk.js**: seans yükü = RPE × dk (Foster); günlük/haftalık yük, form eğrisi (`formEgrisi`), toparlanma, çakışma.
- **model.js**: faz (idmanRef faz), haftalık yük hedefi, sağlık bütçeleri, haftalık plan, ölçüm zamanı.
- **gosterge.js** (13.5): oranlar, monotoni, trend, kara arası, reçete (B5), kişisel hazır olma, stres puanı,
  RPE kayması, bölge hedefi/dağılımı, plan uyumu.
- **kisit.js**: sağlık kısıtı kuralları (MSI kararı, hafifletme, süre bütçesi, kulaç normu).
- **grup.js / harita.js**: 10 kas grubu, renkler, dokunmatik kas haritası.
- **analiz.js**: SWOLF, set geçmişi/kıyas, rekor, CSS testi, derece tahmini, ağrı geçmişi.
- **salon.js**: kara olay modeli (`set`, `bitti`, `son`, mola), payload, öneri/puanlama, alternatifler, 1RM, hacim.

## 8. Testler (tests/)

- Birim: test-data, test-ref, test-duzen, test-salon, test-zaman, test-cekirdek, test-gosterge, test-sw (.mjs).
- Betik: test-gas, test-gas-edge, test-gas-salon (.cjs) — `fakegas.cjs` sahte SpreadsheetApp/Utilities/Lock
  (`makeEnv(sheets, token, file, {alias})`; ALIAS: yuzmePlan→Plan, yuzmeVeri→eski, yuzmeSeans→seans, karaVeri→idman,
  karaPlan→plan …; saat dilimi UTC).
- E2E (Playwright, Chromium /opt/pw-browsers): e2e-senaryolar, e2e-surum12, e2e-surum13, test-e2e.
  `harness.cjs`: yerel sunucu + sahte API (gerçek .gs dosyaları fakegas üstünde), sahte saat (`p.clock`).
  `launch({ rows, planH, eskiH, salonSheets, ref, kut, sw, storage, viewport, time })`; yardımcılar: openToday,
  press/tap(sn)/adv(sn), events, label, finishToOzet, waitModal/modalClick, goTo, activeIdx, env.sheets.
- `run-all.sh` hepsini sırayla çalıştırır (`set -e`).

## 9. Bilinen durum ve açık işler (22.10.2026)

- Son yayın 13.9.0; idman.gs 13.9 dağıtımı kullanıcıda (yapılmadıysa "kalsın" ve ikinci idman çalışmaz).
- Beklemede: B20 gün düzeni, B21 zaruri/seçimlik (bilgi sayfası önerisi IS_LISTESI'nde).
- Karar bekliyor: B2, B3. Ertelendi: uzak duvar ölçümü, P3-1, F4.
- İzlenecek: kararsız e2e testleri (sahte saat); 13.4 ilk kara idmanı; 13.9 ilk gerçek kullanım.
- Kullanıcının tablo işleri: Hafta formülü, Hedef Zone formülü.
