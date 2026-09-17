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

## Doğrulanması Gerekenler

- [ ] `faturaKaydet` — `EARSIV_PORTAL_FATURA_KAYDET` de "yetkiniz yok" ile reddedildi (bu projede bu mesaj hep geçersiz cmd anlamına geldiğinden `EARSIV_PORTAL_FATURA_OLUSTUR`'a geri dönüldü — o cmd gerçek/tanınıyor, önceki reddi muhtemelen eksik `callid` ve yanlış `hangiTip` gibi alan hatalarındandı). Kullanıcı gerçek "e-Arşiv Fatura (interaktif) Oluştur" ekranından DevTools ile tam isteği yakaladı; payload artık **birebir o yakalamaya göre**. Sıradaki canlı denemenin gerçekten fatura oluşturup oluşturmadığı doğrulanmalı.
- [ ] SMS gönder/onayla (`smsSifreGonder` / `smsSifreOnayla`) — cmd adları ve payload şekli canlı ortamda doğrulanmadı.
- [ ] Tevkifat kodları: 623 sonrası olası "Kamu Özel İşbirliği/Sağlık Tesisleri" gibi karmaşık/tek orana indirgenemeyen kalemler listede yok (bilinçli olarak atlandı).

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
