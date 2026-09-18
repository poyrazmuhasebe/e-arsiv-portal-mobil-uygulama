# Bilinen Sınırlamalar

Güncel, güvenilir durum her zaman
[GitHub Issues](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues)'dadır;
bu sayfa onların tematik bir özetidir.

## Doğrulama Gerektirenler

- **SMS ile imzalama** (`smsSifreGonder`/`smsSifreOnayla`) — cmd adları ve
  payload şekli henüz canlı ortamda doğrulanmadı.
  ([Issue #6](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/6))

## Bilinen Fonksiyonel Eksikler

- **GENEL İADE fatura tipi çalışmayabilir** — `iadeTable` alanı her zaman
  boş gönderiliyor, iade edilen orijinal faturayı belirtecek form alanı yok.
  ([Issue #2](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/2))
- **28/29 vergi türü sessizce yok sayılıyor** — yalnızca `V9015` (KDV
  Tevkifat) hesaplanıp GİB'e gönderiliyor; Konaklama Vergisi, Damga
  Vergisi gibi diğer gerçek GİB kodları seçilse bile hiçbir etkisi yok.
  ([Issue #1](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/1))
- **Tutar etiketlerinde her zaman "₺" gösteriliyor** — seçilen para birimi
  (176 gerçek kod arasından USD/EUR/vb. olsa bile) UI'da yansımıyor (GİB'e
  giden veri doğru).
  ([Issue #3](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/3))
- **İtiraz/İptal Talebi Oluştur, Taslak Düzenle** — şu an yalnızca
  `console.log` yer tutucular, gerçek işlevleri yok. (Taslak **Sil** artık
  gerçek `EARSIV_PORTAL_FATURA_SIL` isteğiyle çalışıyor.)
  ([Issue #7](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/7),
  [Issue #11](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/11))

## Veri Kapsamı Eksikleri

- **Tevkifat kodu listesi**: 623 sonrası bazı karmaşık/tek orana
  indirgenemeyen kalemler ve "627-Ex" (01/11/2022 öncesi eski oran)
  tarihsel varyantı bilinçli olarak dışarıda.
  ([Issue #8](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/8))

## Eksik Özellikler (Yapılacaklar)

- Detaylı Alıcı Defteri yönetim ekranı (düzenleme/silme/elle ekleme).
  ([Issue #9](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/9))
- "Kayıtlı Mal/Hizmet Adı" defteri.
  ([Issue #10](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/10))
- Gerçek VKN/TCKN checksum doğrulaması (şu an yalnızca uzunluk kontrolü).
  ([Issue #12](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/12))
- Kullanıcı dostu hata mesajları (şu an GİB'in ham metni gösteriliyor).
  ([Issue #13](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/13))
- Offline/ağ hatası senaryolarında daha net geri bildirim.
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
- `gibApi.ts` içindeki tanı amaçlı `console.log` satırları canlıya
  geçmeden önce ayıklanmalı.
  ([Issue #15](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/15))
- `faturaHesap.ts`'teki hesaplama fonksiyonları için birim testi yok.
  ([Issue #16](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/16))

## Yayına Hazırlık

- `app.json` ikon/isim/versiyon ve EAS Build henüz yapılmadı.
  ([Issue #17](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/17))
