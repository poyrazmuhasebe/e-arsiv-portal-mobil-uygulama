# Cihazda Denenecekler

Kodda yapılmış, otomatik testlerden (`npm test`) geçmiş ama **henüz telefonda
(Expo Go) görülmemiş** değişikliklerin kontrol listesi. Denendikçe `- [ ]` →
`- [x]` yapın; sorun çıkarsa ilgili Issue'ya not düşün.

Başlatma (`E:\earsiv-app` içinde):

```bash
npx expo start -c
```

Telefon bağlanamazsa: `npx expo start -c --tunnel`

**GİB bakımdayken:** Giriş yapmak GİB'e bağlıdır. Ekranlara ancak cihazda
**kayıtlı bir oturum** varsa girilebilir (önceden giriş yapılmış ve oturum
hatırlanmışsa). Aşağıdaki "GİB gerekmez" bölümündeki adımlar yalnızca cihazdaki
veriyle çalışır.

## 2026-09-19 oturumu

### GİB gerekmez

- [ ] **GİB bakım duyurusu kutusu** — *yalnızca 20/9/2026 23:59'a kadar
  denenebilir, sonra kutu kendiliğinden gizlenir.* Giriş ekranının üstünde
  kırmızımsı kutuda "ELEKTRONİK BELGE SİSTEMLERİNDE YAPILACAK PLANLI BAKIM…"
  duyurusu tam metniyle görünüyor; alttaki bağlantıya dokununca GİB'in PDF'i
  tarayıcıda açılıyor; × ile kapanıyor ve uygulama kapatılıp açılınca bir daha
  gelmiyor. Klavye açıkken form kaydırılarak kullanılabiliyor.
- [ ] **Alıcı Defteri ekranı açılıyor** (#9) — Dashboard → Kullanıcı İşlemleri →
  Alıcı Defteri: kayıtlar ve `x/50` sayacı görünüyor; arama unvan/ad/VKN ile
  süzüyor.
- [ ] **Adres düzenleme** (#9) — "Adresi Düzenle" ile adres ve ülke değişip
  kaydediliyor, kaydın sırası değişmiyor; unvan/vergi dairesi düzenlenemiyor.
  Adres boşken "Adres gerekli" uyarısı çıkıyor.
- [ ] **Silme** (#9) — "Sil" → onay penceresi → kayıt listeden kalkıyor.
- [ ] **Ekleme formunda geri tuşu** (#9) — sağ üstteki kişi+ ikonuyla formu aç;
  Android geri tuşu / iOS kaydırma önce formu kapatıyor, Dashboard'a atmıyor.
- [ ] **Kayıtlı Mal/Hizmet Seç penceresi** (#10) — kalemdeki düğme pencere
  açıyor; defter boşken "Henüz kayıtlı mal/hizmet yok" yazıyor.
- [ ] **Para birimi simgesi** (#3) — Doküman Para Birimi EUR → kalem ve
  Toplamlar'daki tutarlar "€"; CHF → "CHF"; TRY → "₺".
- [ ] **Vergi seçici** (#1) — "Vergi Seçiniz"de yalnızca KDV TEVKİFAT
  seçilebiliyor; diğerleri "(henüz desteklenmiyor)" ekiyle soluk ve
  dokunulamaz; altında açıklama notu var.
- [ ] **Tevkifat uyarıları** (#1) — Fatura Tipi TEVKİFAT + KDV Tevkifat seç, kod
  seçme → kırmızı "tevkifat kodu seçin" uyarısı, "Oluştur" pasif. Kod seç, sonra
  Fatura Tipi'ni SATIŞ yap → "yalnızca TEVKİFAT iken uygulanabilir" uyarısı,
  "Oluştur" pasif.
- [ ] **Bağlantı yok mesajı** (#14) — uçak modunda bir sorgu (ör. Taslaklar →
  Sorgula) → "GİB portalına ulaşılamadı. İnternet bağlantınızı (mobil veri /
  Wi-Fi) kontrol edin…"
- [ ] **GİB kesintisi mesajı** — GİB bakımdayken bir sorgu → "GİB portalı şu an
  hizmet vermiyor (HTTP 50x)…" mesajı görünüyor, ham HTML değil. *Tam da bakım
  sırasında denenebilir.*

### GİB gerekir

- [ ] **Elle alıcı ekleme** (#9) — VKN/TCKN yaz → Unvan/Ad/Soyad/Vergi Dairesi
  GİB'den dolup kilitli kalıyor → adres yazınca "Deftere Kaydet" aktifleşiyor.
  Aynı VKN tekrar eklenince "Zaten kayıtlı" onayı çıkıyor.
- [ ] **Eski unvan hemen temizleniyor** — fatura formunda geçerli bir VKN yaz,
  unvan dolsun; bir hanesini değiştir → eski unvan hemen siliniyor, "Oluştur"
  pasif. Kayıtlı alıcı seçince unvan yeniden sorgulanıp doluyor, adres korunuyor.
- [ ] **Hesap yalıtımı** (#9, #10) — iki farklı hesapla giriş: birinin alıcı ve
  mal/hizmet defteri diğerinde görünmüyor.
- [ ] **Mal/hizmet otomatik kayıt** (#10) — fatura başarıyla oluşturulunca kalem
  adları listeye ekleniyor; seçince kalemin adına yazılıyor; çöp kutusu → onay →
  siliniyor. *Gerçek belge üretir; yalnızca zaten kesilecek bir faturada deneyin.*
- [ ] **GİB hata metinleri** (#13) — GİB'den bilinen bir hata gelirse (ör. "Bu
  işlem için yetkiniz yok") açıklama + `(GİB mesajı: "...")` görünüyor. Kasıtlı
  tetiklemenin güvenli yolu yok; karşılaşılınca kontrol edin.

### Zamanla gözlenecek

- [ ] **SecureStore boyutu** (#9, #10) — alıcı defteri doldukça (özellikle
  iOS'ta) "Kaydedilemedi" uyarısı çıkıyor mu? Çıkarsa kayıtlar bölünerek
  saklanmalı (bkz.
  [guvenlik-ve-veri.md](guvenlik-ve-veri.md#değer-boyutu-securestore)).
