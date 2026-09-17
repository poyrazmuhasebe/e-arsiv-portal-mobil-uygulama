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
- [x] PDF üretme/indirme/paylaşma (`src/utils/pdf.ts`) — `expo-print` Base64 + `expo-file-system` ile yazma (Android FileProvider okuma kısıtlamasını aşmak için); "Paylaş" `expo-sharing`, "İndir" Android'de `StorageAccessFramework` ile paylaşım penceresi açmadan doğrudan kaydediyor
- [x] Test modu (`IS_TEST_MODE`) — mock login/kullanıcı/mükellef/taslak/fatura kaydet/SMS/HTML

## Doğrulanması Gerekenler

- [ ] `faturaKaydet` — cmd (`EARSIV_PORTAL_FATURA_KAYDET`) ve tüm payload alanları (özellikle `kdvTevkifatKodu`/`kdvTevkifatOrani`, `irsaliyeNumarasi`, `dovizKuru`) canlı ortamda **henüz doğrulanmadı**. Yeni modüler formla ilk gerçek/küçük denemeyi yapıp Network yakalamasıyla teyit edilmeli.
- [ ] SMS gönder/onayla (`smsSifreGonder` / `smsSifreOnayla`) — cmd adları ve payload şekli canlı ortamda doğrulanmadı.
- [ ] Tevkifat kodları ve oranları (`faturaConstants.ts` → `TEVKIFAT_KODLARI`) — kısaltılmış bir liste, GİB'in tam/güncel tebliğ oranlarıyla karşılaştırılmalı.

## Yapılacaklar

- [ ] Taslak fatura silme/iptal akışı ve "Düzenle" (şu an `TaslaklarScreen`'de yalnızca `console.log` yer tutucular)
- [ ] "İtiraz Talebi Oluştur" / "İptal Talebi Oluştur" butonlarının gerçek işlevi
- [ ] Form doğrulamasını güçlendirme (gerçek VKN/TCKN checksum kontrolü)
- [ ] Hata mesajlarının kullanıcı diline daha iyi çevrilmesi (şu an GİB'in ham mesajı gösteriliyor)
- [ ] Offline/ağ hatası senaryolarında daha net kullanıcı geri bildirimi
- [ ] `gibApi.ts` içindeki tanı amaçlı `console.log` satırlarının canlıya geçmeden önce ayıklanması/kısılması (şifre dışında hassas veri basmıyor ama gürültülü)
- [ ] Test kapsamı: en azından `faturaHesap.ts`'teki KDV/iskonto/tevkifat hesaplama fonksiyonları için birim testleri
- [ ] `app.json` üzerinden gerçek uygulama ikonu/isim/versiyon ayarları
- [ ] EAS Build ile iOS/Android native paket üretimi ve mağaza yayın hazırlığı
