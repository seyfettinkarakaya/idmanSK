// "idman Analitik" tablosunun örnek sayfaları (gerçek dosyadan alınan başlıklar ve birkaç satır) — betik ve uçtan uca testler.
const { Sheet } = require('./fakegas.cjs');

function analitikSheets() {
  return {
    Hedefler: new Sheet('Hedefler', ['Hedef', 'Eşik', 'Güncel', 'Durum', 'Açıklama'], [
      ['Fren', 'MSI < 1 · KN-1 kulaç < 14,3', 'MSI 0,5 · kulaç 13,3', '✓', 'MSI bu hafta; kulaç son KN'],
      ['1 · Yüzme seansı', '≥ 30 / 12 hafta · ara ≤ 14 gün', '8 seans · gereken 7,5 · en uzun ara 5 gün', '✓ yolunda', 'Faz-1 başından bugüne'],
      ['2 · Kara seansı', 'Her hafta ≥ 1 ev seansı', '1/2 hafta · bu hafta 0', '✗', 'Biten haftalar sayılır'],
      ['3 · Kontrol Noktası -1', 'Ort. nabız < 161 · kulaç ≤ 13,2', 'son 4 ort 160,7 / 13,2 · son 156 / 13,3', '✓', 'Eşik W7-W9'],
      ['4 · Eşik+Hız payı', '≤ %9', 'faz %6,0 · bu hafta %8,0', '✓', 'Km ağırlıklı'],
      ['5 · CSS', '≤ 123 (25.12)', '–', 'bekliyor', '06.11 ara ölçüm'],
      ['5 · Barfiks ortalama', '≥ 10', 'test 9,7', 'bekliyor', 'Yalnız Barfiks etiketli max test sayılır'],
      ['Kilometre taşı · Kesintisiz', '40 dk', '37,3 dk', 'bekliyor', 'En uzun kesintisiz'],
      ['İptal kuralı', 'CSS ≥ 125 VE T30 ≥ 2:06', 'CSS – · T30 –', 'bekliyor', '25.12 testinden sonra geçerli'],
    ]),
    durum: new Sheet('durum', ['Hafta', 'Başlangıç', 'Tip', 'Yüzme seans', 'En uzun ara (gün)', 'Kara seans', 'Ev seansı', 'Eşik+Hız %', 'MSI max', 'km', 'Fren'], [
      ['5', '28.09.2026', 'Giriş', '2', '2', '1', '1', '0,00%', '0,5', '4,3', ''],
      ['6', '05.10.2026', 'Giriş', '3', '4', '1', '1', '9,09%', '0,5', '6,6', ''],
      ['7', '12.10.2026', 'Yük', '2', '4', '0', '0', '7,41%', '0,5', '5,4', ''],
      ['8', '19.10.2026', 'Yük', '3', '4', '1', '1', '2,78%', '0,5', '7,2', ''],
      ['9', '26.10.2026', 'Yük', '3', '5', '0', '0', '8,00%', '0,5', '7,5', ''],
    ]),
    KN: new Sheet('KN', ['Tarih', 'Ara (gün)', 'KN-1 süre', 'KN-1 max nabız', 'KN-1 ort nabız', 'KN-1 Δ max', 'KN-1 Δ ort', 'KN-1 kulaç', 'KN-2 süre', 'KN-2 max nabız', 'KN-2 ort nabız', 'KN-2 Δ max', 'KN-2 Δ ort', 'KN-2 kulaç', 'KN-3 süre', 'KN-3 max nabız', 'KN-3 ort nabız', 'KN-3 Δ max', 'KN-3 Δ ort', 'KN-3 kulaç', 'Seans RPE', 'Seans MSI'], [
      ['13.10.2026', '4', '4:28', '176', '162', '0', '0', '13,3', '4:17', '179', '172', '0', '0', '13,5', '4:04', '183', '173', '0', '0', '14,4', '8,0', '0,5'],
      ['20.10.2026', '4', '4:27', '182', '164', '+6', '+2', '13,0', '4:20', '180', '172', '+1', '0', '12,9', '4:04', '185', '156', '+2', '-17', '13,4', '7,0', '0,0'],
      ['27.10.2026', '5', '4:27', '178', '156', '+2', '-6', '13,3', '4:14', '174', '160', '-5', '-12', '13,3', '4:05', '180', '158', '-3', '-15', '13,1', '8,0', '0,0'],
    ]),
    Kesintisiz: new Sheet('Kesintisiz', ['Tarih', 'Ara (gün)', 'Mesafe', 'Süre', 'Gerçek tempo', 'Hedef tempo', 'Fark (sn/100)', 'Max nabız', 'Ort nabız', 'Max−Ort', 'Δ max', 'Δ ort', 'Kulaç', 'Seans RPE', 'Seans MSI', 'Not'], [
      ['30.09.2026', '', '1000', '0:22:31', '2:15', '2:18', '-2,9', '188', '177', '11', '0', '0', '14,9', '7,0', '0,5', 'ORT_NABIZ: 177'],
      ['06.10.2026', '4', '1200', '0:27:36', '2:18', '2:15', '3,0', '187', '172', '15', '-1', '-5', '14,7', '7,0', '0,5', ''],
      ['16.10.2026', '3', '1600', '0:36:33', '2:17', '2:20', '-2,9', '179', '148', '31', '-9', '-29', '13,3', '7,0', '0,0', ''],
      ['22.10.2026', '1', '1600', '0:36:36', '2:17', '2:20', '-2,8', '176', '163', '13', '-12', '-14', '13,4', '8,0', '0,0', ''],
      ['30.10.2026', '2', '1600', '0:37:19', '2:20', '2:20', '0,0', '163', '142', '21', '-25', '-35', '13,3', '7,0', '0,5', ''],
    ]),
    KV: new Sheet('KV', ['Tarih', 'Ara (gün)', 'Set', 'Hedef tempo', 'Gerçek tempo', 'Fark (sn/100)', 'Kulaç', 'Max nabız', 'Ort nabız', 'Max−Ort', 'Δ max', 'Δ ort', 'SWOLF', 'Δ SWOLF', 'Seans RPE', 'Seans MSI', 'Not'], [
      ['21.10.2026', '1', '12×100', '2:25', '2:17', '-8,4', '13,0', '169', '159', '10', '0', '0', '47,2', '0', '6,0', '0,0', ''],
      ['28.10.2026', '1', '8×150', '2:18', '2:17', '-1,0', '13,0', '169', '147', '22', '0', '-12', '47,3', '+0,1', '8,0', '0,0', ''],
    ]),
    Test: new Sheet('Test', ['Tarih', 'Etiket', 'Mesafe', 'Süre', 'Tempo', 'Max nabız', 'Ort nabız', 'Kulaç', 'Δ süre (sn, önceki teste göre)', 'CSS (sn/100)', 'Δ CSS', 'Seans MSI', 'Not'], [
      ['Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', 'Henüz kayıt yok', '', 'Henüz kayıt yok'],
    ]),
    Kara: new Sheet('Kara', ['Tarih', 'Yer', 'Süre', 'Seans RPE', 'Seans MSI', 'Barfiks setleri', 'Barfiks ort', 'Δ ort (ilk)', 'Barfiks toplam', 'Barfiks RPE', 'Test'], [
      ['04.10.2026', '', '', '', '0,5', '10-7-5', '7,3', '0', '22', '9,5', 'Max test'],
      ['10.10.2026', '', '', '', '0,5', '11-9-9', '9,7', '+2,4', '29', '9,5', 'Max test'],
      ['25.10.2026', 'Ev', '1:19:06', '8,0', '0,5', '9-9-9', '9,0', '+1,7', '27', '9,0', ''],
    ]),
    // derece: yan yana üç tablo (etkinlik listesi A:G, etiket özeti J:R, CSS geçmişi T:X); "Etiket", "Alet" ve "Tarih" başlıkları tekrarlanır
    derece: new Sheet('derece', ['Tarih', 'Etiket', 'Mesafe', 'Stil', 'Alet', 'Gerçek', 'Tempo /100', '', '', 'Etiket', 'Alet', 'Sayı', 'En iyi', 'En iyi tarih', 'Son', 'Son tarih', 'İlk', 'İlk tarih', '', 'Tarih', 'Yöntem', 'Girdi', 'CSS /100', 'Not'], [
      ['09.10.2026', 'CSS 400', '400', 'FR', '', '0:08:02.0', '0:02:00.5', '', '', 'CSS 400', '', '5', '0:07:35.0', '26.05.2023', '0:08:02.0', '09.10.2026', '0:07:49.0', '12.05.2023', '', '09.10.2026', 'İki mesafe', '400 + 200', '2:06.4', ''],
      ['09.10.2026', 'CSS 200', '200', 'FR', '', '0:03:49.3', '0:01:54.7', '', '', 'CSS 200', '', '3', '0:03:44.0', '12.05.2023', '0:03:49.3', '09.10.2026', '0:03:44.0', '12.05.2023', '', '20.08.2026', 'T30', '1500 m / 30:43', '2:02.3', 'tahmini'],
      ['20.08.2026', 'T30', '1500', 'FR', '', '0:30:43.0', '0:02:02.9', '', '', 'Derece 100', '', '30', '0:01:34.0', '15.12.2023', '0:01:47.0', '21.04.2026', '0:01:45.0', '25.07.2023', '', '26.05.2026', 'T30', '1450 m / 30:06', '2:04.0', 'tahmini'],
    ]),
    sezon: new Sheet('sezon', ['Sezon', 'Seans', 'Km', 'İlk', 'Son', 'Hafta', 'Seans/hafta', 'Ort. seans m', '14+ gün ara', 'MS payı', 'Aerobik Taban', 'Sürat', 'Derece', 'BT', 'Hız Merdiveni', 'CSS', 'MS Gerçek dolu'], [
      ['2024', '98', '401,1', '04.01.2024', '26.12.2024', '52', '1,88', '4093', '3', '42%', '2', '48', '84', '39', '42', '0', '22%'],
      ['2025', '31', '113,8', '03.01.2025', '31.07.2025', '31', '1,00', '3671', '3', '37%', '0', '21', '37', '3', '6', '0', '30%'],
      ['2026', '73', '231,1', '07.01.2026', '21.08.2026', '33', '2,21', '3166', '1', '51%', '1', '22', '28', '0', '0', '2', '94%'],
      ['26-27', '13', '31', '30.09.2026', '30.10.2026', '5', '2,60', '2385', '0', '52%', '4', '0', '0', '0', '0', '2', '100%'],
    ]),
    model: new Sheet('model', ['Dönem', 'Başlangıç', 'Bitiş', 'Hafta', 'Seans', 'Seans/hafta', 'Km/hafta', 'Ort. seans m', 'MS payı', 'Aerobik Taban', 'T (süreli)', 'Sürat', 'Derece', 'BT', 'Hız Merdiveni', 'CSS testi', '14+ gün ara'], [
      ['800 aletsiz en iyi (14:56, 01.06.2023) öncesi 12 hf', '09.03.2023', '31.05.2023', '12', '29', '2,42', '9,3', '3838', '51%', '1', '0', '38', '0', '0', '0', '8', '0'],
      ['26-27 sezonu (30.09\'dan bugüne)', '30.09.2026', '01.11.2026', '4,7', '13', '2,76', '6,6', '2385', '52%', '4', '0', '0', '0', '0', '0', '2', '0'],
    ]),
    bolge: new Sheet('bolge', ['Sezon', 'MS km', 'Bölgeli %', 'Kolay %', 'Orta %', 'Eşik %', 'Hız %', 'TEC %', 'Aletli %', 'Eşik+Hız %'], [
      ['2025', '39,5', '62', '1', '7', '16', '42', '21', '13', '58'],
      ['2026', '116,7', '96', '4', '5', '36', '55', '0', '0', '91'],
      ['26-27', '16,2', '100', '22', '64', '6', '7', '0', '0', '14'],
    ]),
    bilgi: new Sheet('bilgi', ['Tanım', 'Değer', 'Açıklama'], [['Bu Sene', '2026', ''], ['Bu Ay', '11', ''], ['Bu Hafta', '44', '']]),
    // ham veri sayfaları okunmaz (gizlilik ve boyut): sızarsa test yakalar
    veri: new Sheet('veri', ['Tarih', 'Not'], [['30.10.2026', 'GİZLİ-HAM-VERİ']]),
  };
}

module.exports = { analitikSheets };
