# Cihazda Denenecekler

Kodda yapılmış, otomatik testlerden (`npm test`) geçmiş ama **henüz telefonda
(Expo Go) görülmemiş** değişikliklerin kontrol listesi. Denendikçe `- [ ]` →
`- [x]` yapın; sorun çıkarsa ilgili Issue'ya not düşün. Listenin tamamlanması
[Issue #24](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/24)
ile, SecureStore'un gerçek cihaz doğrulaması
[Issue #23](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/23)
ile takip ediliyor.

Başlatma (`E:\earsiv-app` içinde):

```bash
npx expo start -c
```

Telefon bağlanamazsa: `npx expo start -c --tunnel`

**GİB bakımdayken:** Giriş yapmak GİB'e bağlıdır. Ekranlara ancak cihazda
**kayıtlı bir oturum** varsa girilebilir (önceden giriş yapılmış ve oturum
hatırlanmışsa). Aşağıdaki "GİB gerekmez" bölümündeki adımlar yalnızca cihazdaki
veriyle çalışır.

## 2026-09-20 — Uygulama hesabı sistemi

**Hiçbiri henüz telefonda denenmedi.** Aşağıdaki adımların bir kısmı yerel
Worker, bir kısmı deploy edilmiş Worker gerektirir.

### Yerel Worker gerekir (telefon ile PC aynı Wi-Fi'de)

Hazırlık: `worker/.dev.vars.example` dosyasını `.dev.vars` adıyla kopyalayın,
`worker/` içinde `npx wrangler d1 migrations apply earsiv-hesap --local` ve
`npx wrangler dev --ip 0.0.0.0 --port 8787` çalıştırın. Kök dizinde
`.env.local` dosyasına `EXPO_PUBLIC_HESAP_API_URL=http://<PC-IP>:8787` yazın
(IP'yi `ipconfig` ile bulun). Windows Güvenlik Duvarı sorunca yalnızca
**"Özel ağ"** işaretleyin.

- [ ] **Karşılama ekranı** — uygulama artık GİB giriş ekranıyla değil,
  "Kayıt Ol" / "Giriş Yap" ile açılıyor.
- [ ] **Kayıt Ol** — e-posta, Uygulama Kullanıcı Adı ve şifre ile hesap
  açılıyor; alan hataları anlaşılır.
- [ ] **Yalnızca rakamlı kullanıcı adı reddediliyor** — ör. `34567890`
  yazınca "en az bir harf içermeli" uyarısı çıkıyor ve **istek gitmiyor**
  (`wrangler dev` konsolunda istek görünmemeli).
- [ ] **Hatırlanan GİB kodu çakışması** — daha önce "Kullanıcı Kodunu Hatırla"
  ile kaydedilmiş GİB kodunu kullanıcı adı alanına yazınca "Bu, GİB kullanıcı
  kodunuz" uyarısı çıkıyor ve **istek gitmiyor**.
- [ ] **E-posta Doğrula** — 6 haneli kod ekranı geliyor; yerel Worker'da kod
  ekranda "Yerel geliştirme: kod ######" olarak da görünüyor.
- [ ] **Yanlış kod** reddediliyor, doğru kod kabul ediliyor ve GİB giriş
  ekranına geçiliyor.
- [ ] **Kodu yeniden gönder** 60 saniyelik geri sayımla çalışıyor.
- [ ] **Giriş Yap** — çıkıp aynı hesapla tekrar giriliyor.
- [ ] **Şifremi unuttum** — iki adımlı akış çalışıyor; yeni şifreyle giriş
  yapılıyor, eski şifre reddediliyor.
- [ ] **Hukuki metinler** — kayıt ekranındaki üç bağlantı açılıyor,
  metinlerin başında "TASLAK" uyarısı görünüyor.
- [ ] **Sunucu kapalıyken** — `wrangler dev`'i durdurup giriş denenince
  "Hesap sunucusuna ulaşılamadı" mesajı çıkıyor, uygulama çökmüyor.

### GİB gerekir (+ yerel Worker)

- [ ] **GİB giriş ekranı** — etiket artık "GİB Kullanıcı Kodu"; duyuru kutusu
  hâlâ burada; uyarı metni yeni hâliyle görünüyor.
- [ ] **"Hesaptan çık" düğmesi** GİB giriş ekranının altında görünüyor ve
  Karşılama ekranına dönüyor.
- [ ] **GİB girişi çalışıyor** ve Dashboard'a geçiliyor.
- [ ] **İki ayrı çıkış** — Dashboard'daki çıkış düğmesi "GİB oturumunu kapat"
  ve "Hesaptan çık" seçenekleri sunuyor.
- [ ] **"GİB oturumunu kapat"** GİB giriş ekranına dönüyor, uygulama hesabı
  **açık kalıyor**.
- [ ] **"Hesaptan çık"** Karşılama ekranına dönüyor.
- [ ] **Defterler korunuyor** — her iki çıkıştan sonra da aynı GİB hesabına
  tekrar girince alıcı defteri ve kayıtlı mal/hizmet adları yerinde.
- [ ] **Hatırlanan GİB kodu korunuyor** — çıkıştan sonra GİB giriş formu yine
  dolu geliyor.
- [ ] **Uygulama kilidi** — hesap oturumu açık ama GİB kapalıyken de kilit
  ekranı geliyor; kilit ekranındaki düğme artık "Hesaptan Çık".
- [ ] **Sahipsiz GİB oturumu siliniyor** — güncellemeden önce girilmiş bir
  cihazda ilk açılışta GİB oturumu geri yüklenmiyor, GİB kodu formda kalıyor.

### DEMO: "Şimdilik atla" (2026-09-21) — GİB gerekir, Worker gerekmez

- [ ] Karşılama ekranında "Şimdilik atla" görünüyor ve doğrudan GİB giriş
  ekranına geçiyor (kayıt/doğrulama adımı yok).
- [ ] GİB giriş ekranının altındaki düğme "Kayıt ol / giriş yap" yazıyor ve
  Karşılama ekranına dönüyor.
- [ ] GİB'e girince Dashboard açılıyor; menüde "Hesabımı Sil" **yok**; çıkış
  diyaloğunda "Tamamen çık" var.
- [ ] Uygulamayı tamamen kapatıp açınca Karşılama ekranı geliyor ve GİB
  oturumu **hatırlanmıyor** (hatırlanan GİB kullanıcı kodu formda duruyor).

### Filigran ve tarih sınırı (2026-09-21) — GİB gerekir

- [ ] **Silinmiş** bir faturayı aç: ortada "FATURA SİLİNDİ" var, "iptal
  edilmiş" filigranı **yok**. (Hâlâ görünüyorsa GİB'in filigranı görseldir;
  Metro'daki "GİB SİLİNMİŞ FATURA … GEÇEN YERLER" satırını gönderin.)
- [ ] **İptal Kabul Edildi** bir faturayı aç: görüntüleme ekranında ve PDF'te
  "İPTAL KABUL EDİLDİ".
- [ ] **İptal Reddedildi** bir faturayı aç: "İPTAL REDDEDİLDİ".
- [ ] Talebi **olmayan** normal bir faturada filigran **yok**.
- [ ] Başlangıç tarihini 1 aydan eskiye çekince bitiş kendiliğinden 7 gün
  sonrasına geliyor ve bilgi mesajı çıkıyor; tersi de aynı.

### Deploy edilmiş Worker gerekir

Worker **2026-09-20'de canlıya alındı**: `https://earsivfatura.poyrazmuhasebe.com`
Bu bölümü denemek için `.env.local` dosyası **üretim adresini** içermelidir:
`EXPO_PUBLIC_HESAP_API_URL=https://earsivfatura.poyrazmuhasebe.com`.
**Dosyayı silmeyin:** Expo `.env.example`'ı okumaz; `.env.local` yoksa değişken
tanımsız kalır ve uygulama "Hesap sunucusu yapılandırılmamış" der.

- [ ] **Gerçek e-posta geliyor** — kayıt sonrası doğrulama kodu gerçekten
  gelen kutusuna ulaşıyor. **En kritik doğrulanmamış madde:** Cloudflare
  Email Sending BETA ve postayı yalnızca *teslim için kabul ediyor*; teslim
  garantisi vermiyor. Gereksiz (spam) klasörünü de kontrol edin.
- [ ] **Şifre sıfırlama e-postası** ulaşıyor.
- [ ] **Hesabımı Sil** — Dashboard → Hesabımı Sil ile hesap siliniyor,
  Karşılama ekranına dönülüyor, aynı e-postayla tekrar kayıt olunabiliyor.
- [ ] **Silmeden sonra defterler duruyor** — yeni hesapla aynı GİB hesabına
  girince alıcı defteri ve mal/hizmet adları yerinde.
- [ ] **Herkese açık silme sayfası** — tarayıcıdan
  `https://earsivfatura.poyrazmuhasebe.com/hesap-sil` açılıyor ve çalışıyor.
- [ ] **EAS preview APK** ile uçtan uca çalışıyor (APK yerel `http://`
  adrese bağlanamaz, yalnızca üretim adresiyle denenebilir).

**Sunucu tarafında ZATEN doğrulandı** (2026-09-20, üretimde): kayıt 201
dönüyor, şifre `scrypt$16384$8$1$…` olarak saklanıyor, yanıtta geliştirme
kodu yok, yanlış şifreyle silme reddediliyor, doğru şifreyle siliniyor ve
sonrasında giriş 401 veriyor, herkese açık silme sayfası 200/HTML dönüyor.

## 2026-09-19 oturumu

### GİB gerekmez

- [ ] **Bakım sonrası giriş ekranı temiz** — 20/9/2026 23:59'dan sonra giriş
  ekranında planlı bakım duyurusu **görünmüyor** (süresi dolunca kendiliğinden
  gizlenmesi beklenir).
- [ ] **Duyuru kutusunun kendisi** — 19–20/9 bakım duyurusu süresi dolduğu için
  artık görülemez; kutu, `src/constants/duyurular.ts`'e **bir sonraki GİB duyurusu
  eklendiğinde** denenecek: tam metin görünüyor, bağlantı tarayıcıda açılıyor, ×
  ile kapanıyor ve uygulama yeniden açılınca gelmiyor, uzun metinde form
  kaydırılarak (klavye açıkken de) kullanılabiliyor.
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
  iOS'ta) "Kaydedilemedi" uyarısı çıkıyor mu? Kayıtlar artık bölünerek
  saklanıyor (bkz. aşağıdaki "Defterlerin parçalı saklanması" bölümü ve
  [guvenlik-ve-veri.md](guvenlik-ve-veri.md#değer-boyutu-securestore)); uyarı
  yine çıkarsa tek bir kaydın kendisi reddediliyor demektir, Issue açın.

## 2026-09-19 — Defterlerin parçalı saklanması

Alıcı defteri ve Kayıtlı Mal/Hizmet listesi artık kayıt başına ayrı SecureStore
anahtarında; eski tek değerli defterler ilk erişimde taşınıyor. Otomatik
testler (`npm test`) geçti; aşağıdakiler **telefonda görülmedi**.

**Önemli:** Taşımayı denemek için telefonda **önceki sürümle** kaydedilmiş bir
defter olmalı. Yeni kodu açmadan önce Alıcı Defteri'nde ve "Kayıtlı Mal/Hizmet
Seç"te kaç kayıt olduğunu ve ilk birkaçının sırasını not edin.

### GİB gerekmez (kayıtlı oturumla)

- [ ] **Taşıma: kayıtlar kaybolmadı** — yeni kodla uygulamayı açın → Alıcı
  Defteri: kayıt sayısı (`x/50`) ve sıra, not ettiğinizle aynı; bir kaydın
  adres/ülke/vergi dairesi alanları doğru. Fatura formunda "Kayıtlı
  Alıcılardan Seç" aynı listeyi gösteriyor.
- [ ] **Taşıma: mal/hizmet adları** — Yeni Fatura Kes → bir kalemde "Kayıtlı
  Mal/Hizmet Seç": adlar ve sıraları önceki gibi.
- [ ] **Taşıma kalıcı** — uygulamayı tamamen kapatıp (son uygulamalardan
  kaydırarak) yeniden açın: iki liste de aynı.
- [ ] **Açılış hızı** — dolu (40–50 kayıtlı) bir Alıcı Defteri ekranı ve
  "Kayıtlı Alıcılardan Seç" penceresi gözle görülür bir gecikme olmadan
  (≈1 sn altı) açılıyor mu? İlk açılışta (taşıma sırasında) bir kez daha uzun
  sürebilir. Özellikle eski/yavaş Android telefonda deneyin; süre not edin.
- [ ] **Adres düzenle / sil** — Alıcı Defteri'nde bir kaydın adresini
  değiştirin, bir kaydı silin; ekrandan çıkıp girince ve uygulamayı yeniden
  açınca değişiklikler duruyor, sıra bozulmuyor.
- [ ] **Mal/hizmet silme** — "Kayıtlı Mal/Hizmet Seç" → çöp kutusu → onay →
  ad listeden kalkıyor, uygulama yeniden açılınca geri gelmiyor.
- [ ] **Yarıda kapatma** (isteğe bağlı) — Alıcı Defteri'nde "Sil"e basıp onay
  verdikten hemen sonra uygulamayı son uygulamalardan kapatın; yeniden açınca
  kayıt ya silinmiş ya da yerinde, liste bozuk/eksik değil.
- [ ] **"Kaydedilemedi" çıkmıyor** — yukarıdaki işlemlerin hiçbirinde
  "Kaydedilemedi"/"Silinemedi" uyarısı görülmüyor (özellikle iOS'ta).

### GİB gerekir

- [ ] **Elle alıcı ekleme** — Alıcı Defteri → kişi+ ikonu → VKN/TCKN sorgusu →
  adres → "Deftere Kaydet": kayıt en üstte; uygulama yeniden açılınca duruyor.
- [ ] **Hesap yalıtımı (taşıma sonrası)** — iki farklı hesapla sırayla giriş:
  her birinin (taşınmış) alıcı ve mal/hizmet defteri yalnızca kendi hesabında
  görünüyor; ikinci hesabın eski defteri o hesapla ilk girişte taşınıyor.
- [ ] **Fatura sonrası otomatik kayıt** — fatura başarıyla oluşturulunca
  alıcı ve kalem adları deftere ekleniyor; başarı mesajında "kaydedilemedi"
  notu yok. *Gerçek belge üretir; yalnızca zaten kesilecek bir faturada
  deneyin.*
