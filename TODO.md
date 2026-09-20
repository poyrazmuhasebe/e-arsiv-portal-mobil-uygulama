# TODO

## Tamamlanan

- [x] Proje iskeleti (Expo + TypeScript, React Navigation, Zustand, React Native Paper)
- [x] `gibApi.ts` — dispatch/assos-login istemcisi, hata/mesaj ayrıştırma (`error` string/boolean, `data` zarfı her zaman açılıyor)
- [x] Giriş ekranı (assos-login, SecureStore ile token saklama, "Kullanıcı Kodunu Hatırla" onay kutusu; şifre artık hiçbir koşulda saklanmıyor)
- [x] Auth-flow navigasyonu (token'a göre Login ↔ Dashboard/FaturaKesim/Taslaklar takası)
- [x] Dashboard (mükellef unvanı — uzun unvanlarda tek satır kısaltma, güvenli çıkış, menü kartları)
- [x] Güvenli çıkış (`logout`, `assoscmd=logout` ile canlı doğrulandı)
- [x] Mükellef bilgisi sorgulama (`mukellefBilgisiGetir`, `SICIL_VEYA_MERNISTEN_BILGILERI_GETIR`) — VKN→unvan, TCKN→ad+soyad, canlı doğrulandı
- [x] Fatura Kesim Formu — modüler kart mimarisi (Fatura/Alıcı/İrsaliye/Mal-Hizmet/Toplamlar kartları, `src/screens/fatura/`)
  - [x] VKN/TCKN girilince Unvan/Ad/Soyad/Vergi Dairesi otomatik ve **salt okunur** doldurma
  - [x] 7 gün kuralı (geriye dönük 7 günden eski tarih → onaylı otomatik düzeltme)
  - [x] Kayıtlı Alıcılar (adres defteri, SecureStore, fatura kesilince otomatik kayıt)
  - [x] Dinamik vergi/tevkifat (kalem başına KDV Tevkifat kodu, otomatik oran, anlık toplam güncelleme)
  - [x] Sabit listeler (`faturaConstants.ts`) ve yeniden kullanılabilir seçici (`SecimAlani.tsx`)
- [x] Taslak/Kesilen Faturalar ekranı — tarih aralığı filtresi + Sorgula, durum rozeti (Onaylı/Taslak/Silinmiş — canlı `onayDurumu` değerleriyle doğrulandı), yatay kaydırılabilir aksiyon butonları
- [x] `taslakGetir` — cmd/pageName/tarih filtresi (`EARSIV_PORTAL_TASLAKLARI_GETIR`, `RG_BASITTASLAKLAR`, `baslangic`/`bitis`) canlı doğrulandı
- [x] Fatura HTML görüntüleme (`faturaHTMLGetir`, `EARSIV_PORTAL_FATURA_GOSTER`) — canlı doğrulandı, tam ekran WebView modalı
- [x] SMS ile onaylama akışı (gönder + kod girme modalı) — **uçtan uca canlı doğrulandı** (gerçek bir fatura SMS koduyla imzalandı; bkz. `docs/gib-api-durumu.md`, Issue #6)
- [x] PDF üretme/indirme/paylaşma (`src/utils/pdf.ts`) — `expo-print` Base64 + `FileSystem.writeAsStringAsync` (Android'de `expo-print`'in kendi cache dizinini `expo-file-system` ile okumaya çalışmak "isn't readable" hatası verdiği için ham `uri` hiç okunmuyor, Base64 doğrudan yazılıyor); "Paylaş" `expo-sharing`, "İndir" Android'de `StorageAccessFramework` ile paylaşım penceresi açmadan doğrudan kaydediyor
- [x] `@react-native-community/datetimepicker` v9 deprecation düzeltmesi — `onChange` yerine `onValueChange`/`onDismiss` (3 kullanım yerinde: FaturaBilgileriKarti, IrsaliyeBilgileriKarti, TaslaklarScreen)
- [x] Merkezi oturum-hatası yönetimi (`gibHatasiniIsle`) — GİB yanıtı oturum/token'a işaret eden anahtar kelimeler içeriyorsa otomatik `logout()` + Login'e dönüş
- [x] Tevkifat kodları tablosu (`faturaConstants.ts`) — GİB'in resmi KDV Genel Uygulama Tebliği oranlarıyla ve kullanıcının paylaştığı kod↔oran referans tablosuyla tam doğrulanıp **52 koda** (601-627 kısmi + 801-825 tam tevkifat) çıkarıldı
- [x] Test modu (`IS_TEST_MODE`) — mock login/kullanıcı/mükellef/taslak/fatura kaydet/SMS/HTML
- [x] `faturaConstants.ts` — GİB'in gerçek "e-Arşiv Fatura Oluştur" ekranından DevTools ile yakalanan ham `<select>` verileriyle birebir güncellendi: **Para Birimi** (8→177 gerçek kod), **Ülke** (12→250 gerçek değer, bir tekrar eden "Faroe Adaları" ayıklandı), **Fatura Tipi** (`IADE`/`YTBSATIS`/`YTBISTISNA`/`YTBIADE`/`YTBTEVKIFAT`/`YTBTEVKIFATIADE` — eskiden icat edilmiş `GENELIADE`/`YATIRIMTESVIK*` değerleri yanlıştı), **Vergi Türü** (gerçek 29 `V####` kodu; en kritik olarak KDV Tevkifat = `V9015`, eskiden icat edilmiş `'KDVTEVKIFAT'` string'i hiçbir zaman gerçek bir GİB gönderimiyle eşleşmeyecekti). Bağımlı tüm dosyalar (`faturaHesap.ts`, `MalHizmetKarti.tsx`, `faturaForm.ts`) `V9015` sentinel'ine geçirildi.
- [x] **`faturaKaydet` KESİN OLARAK CANLI DOĞRULANDI** — kullanıcının gerçek DevTools yakalamasında `EARSIV_PORTAL_FATURA_OLUSTUR` cmd'iyle iki ayrı GERÇEK fatura (GENEL İADE ve TEVKİFAT tipleri) başarıyla oluşturuldu ("Faturanız başarıyla oluşturulmuştur..."). Bu sırada önceki turda yanlışlıkla geri alınmış olan cmd (`EARSIV_PORTAL_FATURA_KAYDET`) tekrar `EARSIV_PORTAL_FATURA_OLUSTUR`'a düzeltildi ve `buildFaturaOlusturPayload` gerçek yakalamalara göre yeniden düzenlendi: tutarlar artık GİB'in kendi biçimlendirmesiyle (autoNumeric.js) birebir eşleşecek şekilde gereksiz ".00" olmadan gönderiliyor (`tutarStr`), top-level `vergiCesidi` sabit boşluk yerine tevkifat varsa `V9015` oluyor, tevkifatlı kalemlerde alan adı `kdvTevkifatKodu` değil `tevkifatKodu` ve oran/tutar alanları dinamik `{kod}Orani`/`{kod}Tutari` (ör. `V9015Orani`/`V9015Tutari`) olarak gönderiliyor, tevkifat varsa üç ek top-level alan (`tevkifataTabiIslemTutar`, `tevkifataTabiIslemKdv`, `hesaplananV9015`) ekleniyor, ve her istekte (boş da olsa) `iadeTable` alanı gönderiliyor.
- [x] Taslak fatura silme (`faturaSil`, `EARSIV_PORTAL_FATURA_SIL`) — GİB'in iki adımlı akışıyla (uyarı onayı + gerekçe), canlı doğrulandı
- [x] İptal talebi oluşturma (`iptalTalebiOlustur`) ve "İptal/İtiraz Talepleri" ekranı (listeleme, Kabul `talepCevabi: 1` / Reddet `talepCevabi: 2`) — canlı doğrulandı (Issue #18)
- [x] Kullanıcı Bilgileri ekranı (görüntüleme/kaydetme) ve GİB İmza için telefon numarası akışı (`telefonnoSorgula`) — canlı doğrulandı
- [x] Yayına hazırlık, ilk adım: `app.json` adı/ikonları/paket kimliği, `eas.json`, ilk APK (v1.0.0, `preview` profili) — kalanlar Issue #17
- [x] Güvenlik sıkılaştırmaları: tanı logları `__DEV__` altında ve şifre/token loglanmıyor (Issue #15), kullanılmayan Android izinleri kaldırıldı, fatura görüntüleyici en az yetkili WebView (`FaturaWebView.tsx`), birikmiş fatura PDF'lerinin otomatik temizliği, sayı girdilerinin sıkılaştırılması
- [x] Uygulama kilidi — açılışta ve uzun arka plandan sonra cihaz kilidiyle doğrulama (`expo-local-authentication`)
- [x] GİB kesintisi (HTTP 502/503/504), zaman aşımı ve bağlantı yok durumları için anlaşılır mesajlar; gözlenmiş GİB hata metinlerinin Türkçe karşılıkları (`gibHataMesajlari.ts`, Issue #13, #14)
- [x] Gerçek VKN/TCKN kontrol basamağı doğrulaması (`kimlikDogrula.ts`, Issue #12)
- [x] Kalıcı test altyapısı: `npm test` (Node'un yerleşik test çalıştırıcısı, ek bağımlılık yok; Issue #16)
- [x] Alıcı Defteri yönetim ekranı (Issue #9) ve Kayıtlı Mal/Hizmet Adı defteri (Issue #10); defterler kayıt başına ayrı SecureStore anahtarında (`bolunmusDefter.ts`)
- [x] Tutar etiketlerinde seçilen para biriminin simgesi (`paraBirimi.ts`, Issue #3)
- [x] Desteklenmeyen 28 vergi türü artık sessizce yok sayılmıyor: seçicide pasif, uyumsuz tevkifat "Oluştur"u engelliyor (`vergiDestegi.ts`, Issue #1)
- [x] Giriş ekranında kapatılabilir GİB duyuru kutusu (`DuyuruKutusu.tsx`, `duyurular.ts`)
- [x] **Uygulama hesabı sistemi** (Issue #26) — uygulama artık GİB giriş ekranıyla değil, Kayıt Ol / Giriş Yap ile açılıyor. Akış: hesap → e-posta doğrulama (zorunlu, 6 haneli kod) → GİB girişi → Dashboard. Kendi Cloudflare Worker'ımız + D1 (`worker/`), AB yetki alanında, canlı: `https://earsivfatura.poyrazmuhasebe.com`. Şifreler scrypt ile özetleniyor, düz metin hiçbir yerde saklanmıyor. **İlke değişti:** GİB tarafı hâlâ sunucusuz, hesap tarafı değil (bkz. [docs/hesap-sistemi.md](docs/hesap-sistemi.md)).
- [x] GİB oturumu artık bir uygulama hesabına bağlı (`hesap_gib_sahibi`); sahipsiz ya da başka hesaba ait oturum geri yüklenmiyor (Issue #31)
- [x] İki ayrı çıkış: "GİB oturumunu kapat" ve "Hesaptan çık"; hiçbiri cihazdaki defterleri silmiyor
- [x] Şifremi unuttum ve hesap silme — uygulama içi ekran + herkese açık web sayfası (Issue #29, Google Play şartı)
- [x] KVKK aydınlatma metni, gizlilik politikası ve hizmet şartları **TASLAKLARI** (`docs/hukuk/`, hukuki inceleme bekliyor; Issue #36)

## Doğrulanması Gerekenler / Yapılacaklar

Bu proje artık açık/kapalı işleri **GitHub Issues** üzerinden takip ediyor (bkz.
[Issues](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues)) —
tek tek maddeler halinde burada tutmak yerine orada etiketlenip (bug/
enhancement/doğrulama-gerekli) takip ediliyor. Bu dosyadaki "Tamamlanan"
listesi geçmişe dönük özet olarak kalmaya devam ediyor.

Kodlanmış ama henüz telefonda denenmemiş değişiklikler için:
[docs/cihazda-denenecekler.md](docs/cihazda-denenecekler.md). Bilinen eksiklerin
tematik özeti: [docs/bilinen-sinirlamalar.md](docs/bilinen-sinirlamalar.md).
