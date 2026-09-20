# Kişisel Verilerin Korunması Hakkında Aydınlatma Metni

> ## ⚠️ TASLAK — HUKUKİ İNCELEME GEREKİR
> Bu metin bir hukuk danışmanı tarafından yazılmamıştır ve hukuki görüş
> değildir. Yayına çıkmadan önce incelenip onaylanması zorunludur.
> Bkz. [README](README.md), [Issue #36](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/36).
>
> **Bu metin bir aydınlatma metnidir; onay istenmez.** KVKK Kurulu'nun
> 18.02.2026 tarihli 2026/347 sayılı İlke Kararı uyarınca aydınlatma metni ile
> açık rıza metni ayrı ayrı düzenlenir ve aydınlatma metni için rıza/onay
> talep edilmez. Uygulamada bu metin yalnızca bir bağlantı olarak gösterilir,
> yanında bir onay kutucuğu bulunmaz.

**Yürürlük tarihi:** `[YÜRÜRLÜK TARİHİ]`

## 1. Veri sorumlusu

6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") uyarınca veri
sorumlusu:

- **Unvan:** `[VERİ SORUMLUSU UNVANI]`
- **Adres:** `[VERİ SORUMLUSU ADRESİ]`
- **VKN/TCKN:** `[VERİ SORUMLUSU VKN/TCKN]`
- **VERBİS:** `[VERBİS KAYIT DURUMU]`
- **İletişim:** `[İLETİŞİM E-POSTASI]`

## 2. Bu uygulama neyi yapar, neyi yapmaz

e-Arşiv Portal Mobil Uygulaması, kullanıcıların Gelir İdaresi Başkanlığı
("GİB") e-Arşiv Portalına **kendi hesaplarıyla** bağlanıp e-Arşiv faturası
kesmelerini sağlayan bir istemcidir. **GİB'in resmî bir ürünü değildir.**

Uygulamanın iki ayrı veri akışı vardır ve bunlar birbirinden tamamen
ayrılmıştır:

**a) GİB tarafı — hiçbir verisi bize ulaşmaz.**
GİB kullanıcı kodunuz, GİB şifreniz, oturum bilgileriniz, unvan ve vergi
kimlik bilgileriniz, kestiğiniz faturalar, alıcı defteriniz ve mal/hizmet
defteriniz **yalnızca telefonunuz ile GİB'in sunucuları arasında** gidip
gelir. Bu verilerin hiçbiri veri sorumlusuna, Cloudflare'e ya da başka bir
üçüncü tarafa **aktarılmaz.** GİB şifreniz telefonda da **hiçbir koşulda
saklanmaz**; her girişte yeniden girmeniz gerekir.

**b) Uygulama hesabı tarafı — bu metnin konusu budur.**
Uygulamayı kullanabilmek için oluşturduğunuz hesaba ilişkin veriler işlenir ve
Cloudflare, Inc. altyapısında saklanır.

## 3. İşlenen kişisel veriler

| Veri | Nereden alınır | Nerede saklanır |
|---|---|---|
| E-posta adresi | Sizden, kayıt sırasında | Telefonunuzda ve Cloudflare D1 veritabanında |
| Uygulama kullanıcı adı | Sizden, kayıt sırasında | Telefonunuzda ve Cloudflare D1 veritabanında |
| Uygulama şifresi | Sizden, kayıt sırasında | **Hiçbir yerde açık hâliyle saklanmaz.** Sunucuya güvenli bağlantı (HTTPS) ile gönderilir, orada geri döndürülemez biçimde özetlenir (scrypt) ve yalnızca bu özet saklanır |
| Oturum bilgisi | Sistem tarafından üretilir | Telefonunuzda; sunucuda yalnızca geri döndürülemez özeti |
| Bağlantı bilgileri (IP adresi vb.) | Bağlantı kurulurken | Cloudflare'in altyapısına **ulaşır**; tarafımızca ayrıca kayıt altına alınmaz |
| Sosyal hesap kimliği | *(İleride sosyal giriş eklenirse)* İlgili sağlayıcıdan | Cloudflare D1 veritabanında yalnızca sağlayıcının verdiği kullanıcı kimliği. Sağlayıcının erişim jetonları **saklanmaz** |

**İşlenmeyen veriler:** GİB kullanıcı kodu, GİB şifresi, GİB oturum jetonu,
vergi kimlik numarası, T.C. kimlik numarası, unvan, fatura içerikleri, alıcı
ve mal/hizmet defterleri. Bunlar yalnızca telefonunuzda bulunur ve GİB ile
telefonunuz arasında gider gelir.

## 4. İşleme amaçları

- Uygulama hesabınızın oluşturulması ve yönetilmesi
- Kimliğinizin doğrulanması ve oturum açmanızın sağlanması
- E-posta adresinizin doğrulanması
- Şifrenizi unuttuğunuzda hesabınıza yeniden erişebilmeniz
- Hesap güvenliğinin sağlanması (kötüye kullanımın ve otomatik saldırıların
  engellenmesi için istek sınırlaması)
- Talebiniz hâlinde hesabınızın silinmesi

## 5. Hukuki sebep

Kanun'un 5. maddesinin ikinci fıkrasının (c) bendi uyarınca **bir sözleşmenin
kurulması veya ifasıyla doğrudan doğruya ilgili olması** ve (f) bendi uyarınca
**veri sorumlusunun meşru menfaatleri** (hesap güvenliği) hukuki sebeplerine
dayanılmaktadır.

> **Danışmana sorulacak:** Bu nitelendirme doğru mu? Bu sebeplere dayanıldığı
> için ayrıca açık rıza alınmamaktadır.

## 6. Yurt dışına aktarım

> ### ⚠️ Bu bölüm hukuki incelemeyi en çok gerektiren bölümdür.

Uygulama hesabı verileriniz **Cloudflare, Inc.** altyapısında işlenir ve
saklanır. Veritabanı, Cloudflare'in **Avrupa Birliği** yetki alanında (`eu`
jurisdiction) oluşturulmuştur; veriler garantili olarak AB veri merkezlerinde
tutulur. **Türkiye'de barındırma seçeneği bulunmamaktadır.**

Bu, Kanun'un 9. maddesi anlamında bir **yurt dışına aktarım**dır.

- Aktarılan veriler: e-posta adresi, uygulama kullanıcı adı, şifre özeti,
  oturum bilgisi özeti ve bağlantı bilgileri.
- **Aktarılmayan veriler:** GİB'e ilişkin hiçbir veri.

`[DANIŞMAN TARAFINDAN DOLDURULACAK: aktarımın hukuki dayanağı — standart
sözleşme imzalandıysa tarihi ve Kuruma bildirim tarihi]`

Ayrıca Cloudflare, işletim amacıyla kısa süreli kayıtlar tutabilir
(Workers Logs). Uygulamada istek üstverisi kaydı **kapatılmıştır**; yine de
bağlantı bilgileri Cloudflare'in kendi altyapı kayıtlarına düşebilir.

## 7. Saklama süresi

- Hesap verileri, hesabınız var olduğu sürece saklanır.
- **Hesabınızı sildiğinizde** kullanıcı kaydınız, oturumlarınız, varsa sosyal
  hesap bağlantılarınız ve tek kullanımlık kodlarınız veritabanından silinir.
- Telefonunuzdaki GİB verileri (hatırlanan kullanıcı kodu, alıcı ve
  mal/hizmet defterleri) hesap silmeden **etkilenmez**; bunlar yalnızca sizde
  olduğu için dilediğiniz zaman uygulamadan kendiniz silebilirsiniz.

## 8. Haklarınız (Kanun m.11)

Veri sorumlusuna başvurarak;

- kişisel verinizin işlenip işlenmediğini öğrenme,
- işlenmişse buna ilişkin bilgi talep etme,
- işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,
- yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,
- eksik veya yanlış işlenmişse düzeltilmesini isteme,
- Kanun'un 7. maddesinde öngörülen şartlar çerçevesinde silinmesini veya yok
  edilmesini isteme,
- düzeltme, silme ve yok edilme işlemlerinin aktarıldığı üçüncü kişilere
  bildirilmesini isteme,
- münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir
  sonucun ortaya çıkmasına itiraz etme,
- kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın
  giderilmesini talep etme

haklarına sahipsiniz.

Başvurularınızı `[İLETİŞİM E-POSTASI]` adresine iletebilirsiniz. Hesabınızı
uygulama içindeki "Hesabımı Sil" ekranından ya da
`https://earsivfatura.poyrazmuhasebe.com/hesap-sil` adresinden kendiniz de silebilirsiniz.
