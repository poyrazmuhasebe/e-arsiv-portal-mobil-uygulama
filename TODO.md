# TODO

## Tamamlanan

- [x] Proje iskeleti (Expo + TypeScript, React Navigation, Zustand, React Native Paper)
- [x] `gibApi.ts` — dispatch/assos-login istemcisi, hata/mesaj ayrıştırma
- [x] Giriş ekranı (assos-login, SecureStore ile token saklama)
- [x] Auth-flow navigasyonu (token'a göre Login ↔ Dashboard/FaturaKesim/Taslaklar takası)
- [x] Dashboard (mükellef unvanı, güvenli çıkış, menü kartları)
- [x] Fatura Kesim Formu (alıcı bilgileri, dinamik kalemler, KDV/toplam hesaplama, validasyon)
- [x] VKN/TCKN girilince mükellef bilgisi otomatik doldurma (`mukellefBilgisiGetir`)
- [x] Taslak/Kesilen Faturalar ekranı (koyu tema, liste, yenileme)
- [x] SMS ile onaylama akışı (gönder + kod girme modalı) — **uçtan uca canlı doğrulanmadı**
- [x] Test modu (`IS_TEST_MODE`) — mock login/kullanıcı/taslak/fatura kaydet
- [x] Uygulama genelinde koyu tema (MD3DarkTheme)
- [x] `dispatch()` zarf ayrıştırma düzeltmesi (gerçek yanıtlarda `data` her zaman açılıyor, `error` string/boolean fark etmeksizin doğru yorumlanıyor)

## Doğrulanması / Netleştirilmesi Gerekenler

- [ ] `faturaKaydet` — cmd adı (`EARSIV_PORTAL_FATURA_KAYDET`) canlı ortamda gerçek Network yakalamasıyla **henüz doğrulanmadı**. Küçük/kontrollü bir denemeyle payload alan adları teyit edilmeli.
- [ ] SMS gönder/onayla (`smsSifreGonder` / `smsSifreOnayla`) — cmd adları ve payload şekli canlı ortamda doğrulanmadı.
- [ ] Fatura indirme (`faturaIndir`, HTML/PDF) — hiç canlı test edilmedi, cmd adı doğrulanmadı.
- [ ] `taslakGetir` — canlı yanıt şekli (liste alanları: ettn/faturaTarihi/aliciUnvan/genelToplam/durum) doğrulanmadı.

## Yapılacaklar

- [ ] Fatura indirme/paylaşma ekranı (PDF/HTML görüntüleme, `expo-file-system` ile kaydetme/paylaşma)
- [ ] Taslak fatura silme/iptal akışı (`EARSIV_PORTAL_FATURA_SIL` veya benzeri — doğrulanmalı)
- [ ] Form doğrulamasını güçlendirme (gerçek VKN/TCKN checksum kontrolü)
- [ ] Hata mesajlarının kullanıcı diline daha iyi çevrilmesi (şu an GİB'in ham mesajı gösteriliyor)
- [ ] Offline/ağ hatası senaryolarında daha net kullanıcı geri bildirimi
- [ ] `gibApi.ts` içindeki tanı amaçlı `console.log` satırlarının canlıya geçmeden önce ayıklanması/kısılması (şifre dışında hassas veri basmıyor ama gürültülü)
- [ ] Test kapsamı: en azından `FaturaKesimScreen`'deki KDV/toplam hesaplama fonksiyonu için birim testleri
- [ ] `app.json` üzerinden gerçek uygulama ikonu/isim/versiyon ayarları
- [ ] EAS Build ile iOS/Android native paket üretimi ve mağaza yayın hazırlığı
