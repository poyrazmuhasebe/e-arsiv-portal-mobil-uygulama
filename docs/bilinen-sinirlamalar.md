# Bilinen Sınırlamalar

Güncel, güvenilir durum her zaman
[GitHub Issues](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues)'dadır;
bu sayfa onların tematik bir özetidir.

## Doğrulama Gerektirenler

- ~~SMS ile imzalama uçtan uca canlı doğrulandı, OID kaynağı belirsizdi~~ —
  **artık tamamen doğrulandı ve düzeltildi**, bkz.
  [gib-entegrasyonu.md](gib-entegrasyonu.md) ve
  [Issue #6](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/6)
  (kapatıldı).
- ~~İptal/İtiraz Talebi "Reddet" doğrulanmamıştı~~ — **artık canlı
  doğrulandı, üstelik gerçek değerin `talepCevabi: 0` değil `2` olduğu da
  ortaya çıktı** (düzeltildi) (bkz.
  [Issue #18](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/18),
  kapatıldı). Kabul ve Reddet, `iptalItirazTalepDurumGuncelle`'nin her iki
  yolu da artık tam doğrulanmış durumda.

## Bilinen Fonksiyonel Eksikler

- **GENEL İADE fatura tipi çalışmayabilir** — `iadeTable` alanı her zaman
  boş gönderiliyor, iade edilen orijinal faturayı belirtecek form alanı yok.
  ([Issue #2](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/2))
- **28/29 vergi türü desteklenmiyor** — yalnızca `V9015` (KDV Tevkifat)
  hesaplanıp GİB'e gönderiliyor. Artık **sessizce yok sayılmıyor**: diğer
  türler seçicide "(henüz desteklenmiyor)" olarak pasif; tevkifat kodu eksik ya
  da fatura tipiyle uyumsuz tevkifat "Oluştur"u engelliyor. Gerçek hesaplama
  için her türün GİB'e gönderim şeması (alan adları) canlı bir yakalamayla
  doğrulanmalı.
  ([Issue #1](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/1))
- ~~**Tutar etiketlerinde her zaman "₺" gösteriliyor**~~ — **yapıldı**: fatura
  formundaki tutar etiketleri seçilen para biriminin simgesini (TRY ₺, USD $,
  EUR €, GBP £) ya da diğer kodlarda kodun kendisini gösteriyor
  (`src/utils/paraBirimi.ts`). GİB'e giden veri değişmedi. **Hâlâ "₺":**
  Taslak/Kesilen Faturalar listesindeki tutar — GİB'in liste yanıtında belgenin
  para birimini taşıyan bir alan olup olmadığı doğrulanmadı.
  ([Issue #3](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/3))
- **İtiraz Talebi Oluştur, Taslak Düzenle** — düğmeler görünür ama gerçek
  işlevleri yok: `handleAksiyon` yalnızca geliştirme modunda (`__DEV__`) bir
  `console.log` yazar, GİB'e istek atmaz. (Taslak **Sil** ve **İptal Talebi
  Oluştur** artık gerçek isteklerle çalışıyor.)
  ([Issue #7](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/7),
  [Issue #11](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/11))
- **"Adıma Düzenlenen Belgeler" ekranı henüz yok** — Dashboard'daki menü
  öğesi "Bu özellik henüz eklenmedi." uyarısı gösteriyor; gerekli cmd henüz
  yakalanmadı.
  ([Issue #19](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/19))

## Araştırılması Gerekenler

- **İptal talebi süre kısıtları bilinmiyor** — faturanın düzenlenme
  tarihinden itibaren en geç 7 gün içinde iptal talebi açılabildiği ve
  talep açıldıktan sonra karşı tarafın yanıt vermesi için de belki 7 gün
  olduğu düşünülüyor, ama bu GİB tarafından (gerçek hata mesajı veya
  mevzuat referansıyla) henüz doğrulanmadı. `TaslaklarScreen.tsx`'teki
  "İptal" butonuna bu yüzden herhangi bir tarih kısıtlaması eklenmedi.
  ([Issue #21](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/21))

## Veri Kapsamı Eksikleri

- **Tevkifat kodu listesi**: 623 sonrası bazı karmaşık/tek orana
  indirgenemeyen kalemler ve "627-Ex" (01/11/2022 öncesi eski oran)
  tarihsel varyantı bilinçli olarak dışarıda.
  ([Issue #8](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/8))

## Eksik Özellikler (Yapılacaklar)

- ~~Detaylı Alıcı Defteri yönetim ekranı (düzenleme/silme/elle ekleme).~~ —
  **yapıldı** ("Kullanıcı İşlemleri > Alıcı Defteri", bkz.
  [ozellikler.md](ozellikler.md)). Cihazda canlı denenmesi gerekiyor.
  ([Issue #9](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/9))
- ~~**SecureStore değer boyutu**: defter tek değerde ~13–48 KB~~ — **tasarım
  düzeltildi**: alıcı ve mal/hizmet defterleri artık kayıt başına ayrı
  SecureStore anahtarında (en büyük tek değer ~1 KB, dizin ~160 B); eski tek
  değerli defterler ilk erişimde kayıpsız taşınıyor; yarım kalan yazmalar
  defteri bozmuyor (bkz.
  [guvenlik-ve-veri.md](guvenlik-ve-veri.md#parçalı-saklama-srcutilsbolunmusdefterts)).
  **Hâlâ doğrulanmadı:** gerçek cihazlarda kabul edilen değer boyutu ve dolu bir
  defteri açmanın (52 SecureStore okuması) ne kadar sürdüğü. Bir kayıt bir
  cihazın sınırını aşarsa yazma reddedilir ve kullanıcıya "Kaydedilemedi"
  bildirilir.
  ([Issue #23](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/23))
- ~~"Kayıtlı Mal/Hizmet Adı" defteri.~~ — **yapıldı** (hesaba özel, en fazla
  50 ad; fatura formunda "Kayıtlı Mal/Hizmet Seç"). Cihazda canlı denenmesi
  gerekiyor.
  ([Issue #10](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/10))
- ~~Gerçek VKN/TCKN checksum doğrulaması~~ — **yapıldı**
  (`src/utils/kimlikDogrula.ts`; VKN ve TCKN kontrol basamağı algoritmaları).
  Yalnızca biçimsel doğrulamadır: numaranın GİB'de kayıtlı olup olmadığını
  `mukellefBilgisiGetir` sorgusu belirler.
  ([Issue #12](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/12))
- ~~Kullanıcı dostu hata mesajları~~ — **kısmen yapıldı**: gözlenmiş 4 GİB
  metni tek yerde (`gibHataMesajlari.ts`) anlaşılır Türkçeye çevriliyor, orijinal
  metin korunuyor. Görülmemiş GİB metinleri hâlâ ham gösteriliyor (tahminle
  çeviri yapılmıyor); yeni metinler canlıda görüldükçe eklenmeli.
  ([Issue #13](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/13))
- ~~Offline/ağ hatası senaryolarında daha net geri bildirim~~ — **kısmen
  yapıldı**: zaman aşımı mesajı artık mükerrer işlem riskine karşı "önce listeyi
  kontrol edin" diyor, bağlantı yok mesajı netleşti. **Yapılmadı:** sürekli
  görünen bir "çevrimdışı" şeridi — bağlantı durumunu dinlemek için yeni bir
  bağımlılık (`@react-native-community/netinfo`, Expo Go'da mevcut) gerekiyor;
  **sonraya bırakıldı**. Eklenirse, "sunucusuz / üçüncü taraf yok" ilkesi
  gereği kütüphanenin internet erişilebilirlik kontrolü (varsayılan olarak dış
  bir adrese istek attığı bilinen, kurulumda doğrulanacak) kapatılıp yalnızca
  cihazın bildirdiği bağlantı durumu kullanılmalı. Not: şerit GİB kesintisini
  göstermez (o sırada internet vardır); onu HTTP 502/503/504 mesajı karşılıyor.
  ([Issue #14](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/14))

## Kod Kalitesi / Bakım

- `kalemHesapla` (`faturaHesap.ts`) ile `satirHesapla` (`gibApi.ts`) aynı
  hesaplama mantığını iki yerde tekrarlıyor — ileride biri güncellenip
  diğeri unutulursa ekranda gösterilen tutar ile GİB'e giden tutar
  birbirinden sapabilir.
  ([Issue #5](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/5))
- Tevkifat oranı kontrolünde falsy check kullanılıyor (0 ile "tevkifat yok"
  ayrışmıyor) — şu an ulaşılamıyor ama kırılgan bir kalıp.
  ([Issue #4](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/4))
- ~~`gibApi.ts` içindeki tanı amaçlı `console.log` satırları canlıya
  geçmeden önce ayıklanmalı.~~ — **yapıldı**: tüm loglar `if (__DEV__)`
  altında (release'de ayıklanır); şifre/token içeren loglar tamamen kaldırıldı.
  ([Issue #15](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/15))
- ~~`faturaHesap.ts`'teki hesaplama fonksiyonları için birim testi yok.~~ —
  **yapıldı**: `npm test` (Node'un yerleşik test çalıştırıcısı, ek bağımlılık
  yok; bkz. [kurulum-ve-gelistirme.md](kurulum-ve-gelistirme.md#testler)).
  Saf yardımcılar ve `gibApi` yanıt yorumlama testli; ekran bileşenleri için
  otomatik test yok.
  ([Issue #16](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/16))

## Yayına Hazırlık

- ~~`app.json` ikon/isim/versiyon ve EAS Build henüz yapılmadı.~~ — **kısmen
  yapıldı**: `app.json` (ad, ikonlar, paket kimliği), `eas.json` ve ilk Android
  APK (v1.0.0) hazır. **Kalan:** `production` (AAB) derlemesi, iOS paketi,
  mağaza yayın hazırlığı.
  ([Issue #17](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/17))
- **v1.0.0 APK'sı güncel değil** — log düzeltmesinden ve sonraki güvenlik
  sıkılaştırmalarından önce alındı; düzeltmeleri içeren yeni derleme (v1.0.1)
  alınana kadar kullanılmamalı.
  ([Issue #22](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/22))
- **Cihazda denenmemiş değişiklikler** —
  [cihazda-denenecekler.md](cihazda-denenecekler.md)'deki liste henüz
  tamamlanmadı.
  ([Issue #24](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/24))
