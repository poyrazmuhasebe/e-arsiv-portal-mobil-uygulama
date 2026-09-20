# Gizlilik Politikası

> ## ⚠️ TASLAK — HUKUKİ İNCELEME GEREKİR
> Bu metin bir hukuk danışmanı tarafından yazılmamıştır ve hukuki görüş
> değildir. Yayına çıkmadan önce incelenip onaylanması zorunludur.
> Bkz. [README](README.md), [Issue #36](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/36).
>
> Bu metin hem **uygulama içinde** hem de **herkese açık bir URL'de**
> yayımlanmalıdır (Google Play şartı).

**Yürürlük tarihi:** `[YÜRÜRLÜK TARİHİ]` · **Uygulama:** e-Arşiv Portal Mobil
Uygulaması · **Yayıncı:** `[VERİ SORUMLUSU UNVANI]` · **İletişim:**
`[İLETİŞİM E-POSTASI]`

## Kısaca

- **Vergi verileriniz bize hiç ulaşmaz.** GİB kullanıcı kodunuz, GİB şifreniz,
  faturalarınız, alıcı defteriniz ve mal/hizmet defteriniz yalnızca
  telefonunuzda ve GİB'in sunucularında bulunur.
- **Yalnızca uygulama hesabınızı sunucumuzda tutarız:** e-posta adresiniz,
  uygulama kullanıcı adınız ve şifrenizin geri döndürülemez özeti.
- **GİB şifrenizi hiçbir yerde saklamayız** — telefonda bile. Her girişte
  yeniden girersiniz.
- **Reklam yok, izleme yok, analitik yok.** Uygulamada hiçbir reklam ağı,
  analitik SDK'sı ya da çökme raporlama servisi yoktur.
- **Verinizi satmayız, kiralamayız, pazarlama amacıyla paylaşmayız.**

## 1. Bu uygulama nedir

e-Arşiv Portal Mobil Uygulaması, GİB e-Arşiv Portalına **sizin kendi
hesabınızla** bağlanan bir istemcidir. **GİB'in resmî bir ürünü değildir.**
Portalın yayımlanmış resmî bir REST API'si yoktur; uygulama, portalın kendi
web arayüzünün kullandığı iç servislere doğrudan istek atar.

## 2. İki ayrı veri akışı

### a) GİB tarafı — sunucusuz

Aşağıdaki verilerin tamamı **yalnızca telefonunuz ile GİB arasında** gider
gelir ve **hiçbiri bize ya da başka bir üçüncü tarafa ulaşmaz**:

- GİB kullanıcı kodunuz ve şifreniz
- GİB oturum jetonunuz
- Unvanınız, vergi kimlik numaranız / T.C. kimlik numaranız
- Kestiğiniz faturaların içeriği, alıcı bilgileri, tutarlar
- Alıcı defteriniz ve kayıtlı mal/hizmet adlarınız

Bunlardan telefonda saklananlar, cihazın şifreli güvenli deposunda
(`expo-secure-store`) tutulur. **GİB şifreniz telefonda da saklanmaz.**

### b) Uygulama hesabı tarafı — Cloudflare

Uygulamayı kullanabilmek için bir hesap oluşturmanız gerekir. Bu hesaba
ilişkin veriler **Cloudflare, Inc.** altyapısında tutulur.

## 3. Topladığımız veriler

| Veri | Neden | Nerede |
|---|---|---|
| E-posta adresi | Kimlik, giriş, doğrulama, şifre sıfırlama | Cloudflare D1 (AB) + telefonunuz |
| Uygulama kullanıcı adı | Hesabınızı tanımlamak | Cloudflare D1 (AB) + telefonunuz |
| Uygulama şifresi | Giriş | **Yalnızca geri döndürülemez özeti** (scrypt) Cloudflare D1'de. Açık hâli hiçbir yerde saklanmaz |
| Oturum jetonları | Her açılışta yeniden giriş yapmamanız için | Telefonunuzda; sunucuda yalnızca geri döndürülemez özeti |
| Doğrulama / sıfırlama kodları | E-posta doğrulama ve şifre sıfırlama | Cloudflare D1'de yalnızca özeti; kısa ömürlü ve tek kullanımlık |
| IP adresi ve bağlantı bilgileri | Bağlantının kurulması, kötüye kullanımın engellenmesi | Cloudflare altyapısına **ulaşır** |

**Toplamadıklarımız:** konum, rehber, telefon numarası, cihaz tanımlayıcısı,
reklam kimliği, kullanım analitiği, çökme raporu, GİB'e ilişkin hiçbir veri.

## 4. Üçüncü taraflar

| Taraf | Ne için | Ne alır |
|---|---|---|
| **Gelir İdaresi Başkanlığı (GİB)** | Faturalarınızı kesmek | GİB kullanıcı kodunuz, şifreniz ve fatura verileriniz — **doğrudan telefonunuzdan**, biz aracı olmadan |
| **Cloudflare, Inc.** | Uygulama hesabı altyapısı (Worker + D1 veritabanı + e-posta gönderimi) | E-posta adresiniz, kullanıcı adınız, şifre özetiniz, bağlantı bilgileriniz |
| *(İleride)* **Google / Meta** | Sosyal giriş, yalnızca kullanırsanız | Sağlayıcıdan aldığımız kimlik doğrulanır; **jetonlar saklanmaz**, veritabanına yalnızca sağlayıcının verdiği kullanıcı kimliği yazılır |

Bunların dışında hiçbir üçüncü tarafa veri aktarılmaz. Reklam ağı, analitik
sağlayıcısı ya da veri simsarı kullanılmaz.

## 5. Verilerin bulunduğu ülke

Uygulama hesabı verileriniz Cloudflare'in **Avrupa Birliği** yetki alanındaki
veri merkezlerinde saklanır. **Türkiye'de barındırma seçeneği
bulunmamaktadır.** Bu, 6698 sayılı Kanun'un 9. maddesi anlamında bir yurt
dışına aktarımdır; ayrıntı için
[Aydınlatma Metni](aydinlatma-metni.md)'ne bakınız.

## 6. Kayıtlar (loglar)

Cloudflare'in Workers Logs özelliği yeni servislerde varsayılan olarak
açıktır ve istek üstverisini saklar (ücretsiz planda 3, ücretli planda 7 gün).
Uygulamamızda **istek üstverisi kaydı kapatılmıştır.**

Hiçbir koşulda kayıtlara yazılmayanlar: şifreler, jetonlar, istek gövdeleri,
`Authorization` başlıkları, e-posta adresleri, kullanıcı adları. Hatalar
yalnızca sabit bir hata kodu ve uç nokta adıyla kaydedilir.

## 7. Saklama ve silme

- Hesap verileriniz, hesabınız var olduğu sürece saklanır.
- **Hesabınızı iki şekilde silebilirsiniz:**
  1. Uygulama içinden: **Menü → Hesabımı Sil**
  2. Herkese açık sayfadan: `https://earsivfatura.poyrazmuhasebe.com/hesap-sil`
- Silme ile kullanıcı kaydınız, oturumlarınız, varsa sosyal hesap
  bağlantılarınız ve tek kullanımlık kodlarınız veritabanından kaldırılır.
  **Dondurma değil, silmedir.**
- Telefonunuzdaki GİB verileri (hatırlanan kullanıcı kodu, alıcı ve
  mal/hizmet defterleri) hesap silmeden **etkilenmez** — bunlar sunucuda
  zaten yok. Dilerseniz uygulamadan kendiniz silebilirsiniz; uygulamayı
  kaldırmak da Android'de bu verileri siler.

## 8. Güvenlik

- Sunucuyla tüm haberleşme **HTTPS** üzerindendir.
- Şifreler **scrypt** ile geri döndürülemez biçimde özetlenir; açık hâlleri
  hiçbir yerde saklanmaz.
- Telefondaki hassas veriler cihazın şifreli güvenli deposunda tutulur ve
  yalnızca cihaz kilidi açıkken erişilebilir olacak şekilde yazılır.
- İsteğe bağlı **uygulama kilidi** ile uygulama, cihazınızın biyometrik
  doğrulaması veya PIN'i ile korunabilir.
- Fatura görüntüleyici, GİB'den gelen HTML'i en az yetkili bir görüntüleyicide
  açar (JavaScript kapalı, gezinme engelli, çerez ve önbellek yok).
- Giriş ve şifre sıfırlama uçlarında otomatik saldırılara karşı istek
  sınırlaması uygulanır.

Hiçbir sistem tamamen güvenli değildir; mutlak güvenlik taahhüdü verilemez.

## 9. Çocuklar

Uygulama, mali yükümlülüklerini yerine getiren mükellefler ve mali müşavirler
için tasarlanmıştır; 18 yaşından küçüklere yönelik değildir ve bilerek onlardan
veri toplamaz.

## 10. Değişiklikler

Bu politika değiştiğinde yürürlük tarihi güncellenir ve önemli değişiklikler
uygulama içinde duyurulur.

## 11. İletişim

`[İLETİŞİM E-POSTASI]` · `[VERİ SORUMLUSU UNVANI]` · `[VERİ SORUMLUSU ADRESİ]`
