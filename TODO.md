# TODO

## Tamamlanan

- [x] Proje iskeleti (Expo + TypeScript, React Navigation, Zustand, React Native Paper)
- [x] `gibApi.ts` — dispatch/assos-login istemcisi, hata/mesaj ayrıştırma (`error` string/boolean, `data` zarfı her zaman açılıyor)
- [x] Giriş ekranı (assos-login, SecureStore ile token saklama, "Kullanıcı Kodunu/Şifreyi Hatırla" onay kutuları)
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
- [x] SMS ile onaylama akışı (gönder + kod girme modalı) — **uçtan uca canlı doğrulanmadı**
- [x] PDF üretme/indirme/paylaşma (`src/utils/pdf.ts`) — `expo-print` Base64 + `FileSystem.writeAsStringAsync` (Android'de `expo-print`'in kendi cache dizinini `expo-file-system` ile okumaya çalışmak "isn't readable" hatası verdiği için ham `uri` hiç okunmuyor, Base64 doğrudan yazılıyor); "Paylaş" `expo-sharing`, "İndir" Android'de `StorageAccessFramework` ile paylaşım penceresi açmadan doğrudan kaydediyor
- [x] `@react-native-community/datetimepicker` v9 deprecation düzeltmesi — `onChange` yerine `onValueChange`/`onDismiss` (3 kullanım yerinde: FaturaBilgileriKarti, IrsaliyeBilgileriKarti, TaslaklarScreen)
- [x] Merkezi oturum-hatası yönetimi (`gibHatasiniIsle`) — GİB yanıtı oturum/token'a işaret eden anahtar kelimeler içeriyorsa otomatik `logout()` + Login'e dönüş
- [x] Tevkifat kodları tablosu (`faturaConstants.ts`) — GİB'in resmi KDV Genel Uygulama Tebliği oranlarıyla ve kullanıcının paylaştığı kod↔oran referans tablosuyla tam doğrulanıp **52 koda** (601-627 kısmi + 801-825 tam tevkifat) çıkarıldı
- [x] Test modu (`IS_TEST_MODE`) — mock login/kullanıcı/mükellef/taslak/fatura kaydet/SMS/HTML
- [x] `faturaConstants.ts` — GİB'in gerçek "e-Arşiv Fatura Oluştur" ekranından DevTools ile yakalanan ham `<select>` verileriyle birebir güncellendi: **Para Birimi** (8→185 gerçek kod), **Ülke** (12→250 gerçek değer, bir tekrar eden "Faroe Adaları" ayıklandı), **Fatura Tipi** (`IADE`/`YTBSATIS`/`YTBISTISNA`/`YTBIADE`/`YTBTEVKIFAT`/`YTBTEVKIFATIADE` — eskiden icat edilmiş `GENELIADE`/`YATIRIMTESVIK*` değerleri yanlıştı), **Vergi Türü** (gerçek 29 `V####` kodu; en kritik olarak KDV Tevkifat = `V9015`, eskiden icat edilmiş `'KDVTEVKIFAT'` string'i hiçbir zaman gerçek bir GİB gönderimiyle eşleşmeyecekti). Bağımlı tüm dosyalar (`faturaHesap.ts`, `MalHizmetKarti.tsx`, `faturaForm.ts`) `V9015` sentinel'ine geçirildi.
- [x] **`faturaKaydet` KESİN OLARAK CANLI DOĞRULANDI** — kullanıcının gerçek DevTools yakalamasında `EARSIV_PORTAL_FATURA_OLUSTUR` cmd'iyle iki ayrı GERÇEK fatura (GENEL İADE ve TEVKİFAT tipleri) başarıyla oluşturuldu ("Faturanız başarıyla oluşturulmuştur..."). Bu sırada önceki turda yanlışlıkla geri alınmış olan cmd (`EARSIV_PORTAL_FATURA_KAYDET`) tekrar `EARSIV_PORTAL_FATURA_OLUSTUR`'a düzeltildi ve `buildFaturaOlusturPayload` gerçek yakalamalara göre yeniden düzenlendi: tutarlar artık GİB'in kendi biçimlendirmesiyle (autoNumeric.js) birebir eşleşecek şekilde gereksiz ".00" olmadan gönderiliyor (`tutarStr`), top-level `vergiCesidi` sabit boşluk yerine tevkifat varsa `V9015` oluyor, tevkifatlı kalemlerde alan adı `kdvTevkifatKodu` değil `tevkifatKodu` ve oran/tutar alanları dinamik `{kod}Orani`/`{kod}Tutari` (ör. `V9015Orani`/`V9015Tutari`) olarak gönderiliyor, tevkifat varsa üç ek top-level alan (`tevkifataTabiIslemTutar`, `tevkifataTabiIslemKdv`, `hesaplananV9015`) ekleniyor, ve her istekte (boş da olsa) `iadeTable` alanı gönderiliyor.

## Doğrulanması Gerekenler

- [ ] SMS gönder/onayla (`smsSifreGonder` / `smsSifreOnayla`) — cmd adları ve payload şekli canlı ortamda doğrulanmadı.
- [ ] **GENEL İADE fatura tipi eksik**: gerçek yakalamada `iadeTable` alanı `[{faturaNo, duzenlenmeTarihi}]` şeklinde iade edilen orijinal faturayı belirtiyor; uygulamada bunu girecek bir form alanı henüz yok, bu yüzden `buildFaturaOlusturPayload` her zaman `iadeTable: []` gönderiyor. GENEL İADE tipiyle gerçek bir fatura kesmeden önce bu alan için UI eklenmeli (muhtemelen İrsaliye Bilgileri kartına benzer bir "İade Edilen Fatura" kartı).
- [ ] Menü ağacından (`getUserMenu`) görülen ama henüz uygulanmayan gerçek sayfa adları: "İptal/İtiraz Talepleri" → `RG_IPTALITIRAZTASLAKLAR`, "Adıma Düzenlenen Belgeler" (bana kesilen faturalar) → `RG_ALICI_TASLAKLAR`, "Kullanıcı Bilgileri" → `RG_KULLANICI`. Bunların cmd adları henüz yakalanmadı; "İtiraz/İptal Talebi Oluştur" özelliği yapılırken bu sayfa adı referans alınabilir.
- [ ] Tevkifat kodları: 623 sonrası olası "Kamu Özel İşbirliği/Sağlık Tesisleri" gibi karmaşık/tek orana indirgenemeyen kalemler listede yok (bilinçli olarak atlandı).
- [ ] GİB'in gerçek tevkifat kodu listesinde ayrıca "627-Ex" adlı, 627'nin 01/11/2022 öncesi eski oranını temsil eden tarihsel bir seçenek var; bu varyantın doğrulanmış bir oranı elimizde olmadığından ve uygulama her zaman güncel tarihli fatura kestiğinden bilerek listeye eklenmedi.

## Yapılacaklar

- [ ] **Detaylı Alıcı Defteri yönetim ekranı** (şu an yalnızca fatura kesilince otomatik kayıt + seç-ve-doldur var; aşağıdakiler henüz yok):
  - [ ] Kayıtlı alıcıyı düzenleme (Unvan/Ad-Soyad/Vergi Dairesi/Ülke/Adres güncelleme)
  - [ ] Kayıtlı alıcıyı silme
  - [ ] Fatura akışının dışında, defterden bağımsız olarak elle yeni alıcı ekleme
  - [ ] Muhtemelen ayrı bir "Alıcı Defteri" listeleme ekranı (Dashboard'dan erişilebilir), `aliciDefteri.ts`'in mevcut `aliciListesiGetir`/`aliciKaydet` fonksiyonlarına `aliciGuncelle`/`aliciSil` eklenmesini gerektirir
- [ ] **"Kayıtlı Mal/Hizmet Adı" defteri** — fatura kaleminde bir kere girilen Mal/Hizmet adı otomatik kaydedilecek; ayrı bir menüden:
  - [ ] Listeleme
  - [ ] Düzenleme
  - [ ] Elle yeni kayıt ekleme
  - [ ] Silme
  - Alıcı Defteri ile aynı desen: `aliciDefteri.ts`'e benzer bir `malHizmetDefteri.ts` (SecureStore tabanlı) + `MalHizmetKarti.tsx`'te kalem girilirken bu defterden seçim/otomatik tamamlama
- [ ] Taslak fatura silme/iptal akışı ve "Düzenle" (şu an `TaslaklarScreen`'de yalnızca `console.log` yer tutucular)
- [ ] "İtiraz Talebi Oluştur" / "İptal Talebi Oluştur" butonlarının gerçek işlevi
- [ ] Form doğrulamasını güçlendirme (gerçek VKN/TCKN checksum kontrolü)
- [ ] Hata mesajlarının kullanıcı diline daha iyi çevrilmesi (şu an GİB'in ham mesajı gösteriliyor)
- [ ] Offline/ağ hatası senaryolarında daha net kullanıcı geri bildirimi
- [ ] `gibApi.ts` içindeki tanı amaçlı `console.log` satırlarının canlıya geçmeden önce ayıklanması/kısılması (şifre dışında hassas veri basmıyor ama gürültülü)
- [ ] Test kapsamı: en azından `faturaHesap.ts`'teki KDV/iskonto/tevkifat hesaplama fonksiyonları için birim testleri
- [ ] `app.json` üzerinden gerçek uygulama ikonu/isim/versiyon ayarları
- [ ] EAS Build ile iOS/Android native paket üretimi ve mağaza yayın hazırlığı
