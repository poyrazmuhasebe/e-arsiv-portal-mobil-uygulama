# Hukuki Metin Taslakları

> ## ⚠️ BU KLASÖRDEKİ HER METİN TASLAKTIR — HUKUKİ İNCELEME GEREKİR
>
> Bu metinler bir avukat ya da KVKK uyum danışmanı tarafından yazılmamıştır ve
> **hukuki görüş değildir.** Yayına çıkmadan önce bir hukuk danışmanı
> tarafından incelenip onaylanmaları zorunludur.
> Takip: [Issue #36](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/36).

## Neden bu klasör var

Uygulama hesabı sistemi ([hesap-sistemi.md](../hesap-sistemi.md)) eklendiğinde
e-posta ve uygulama kullanıcı adı **Cloudflare'e (yurt dışına) aktarılmaya**
başlıyor. Bu, uygulamanın bugüne kadarki "sunucusuz, üçüncü taraf yok"
durumunda hiç olmayan bir şey.

Bu klasör, hukuk danışmanına götürülecek başlangıç metinlerini içerir.
Teknik gerçekler doğrudur ve kod tarafından doğrulanabilir; **hukuki
nitelendirmeler doğrulanmamıştır.**

| Dosya | İçerik | Nerede gösterilecek |
|---|---|---|
| [aydinlatma-metni.md](aydinlatma-metni.md) | KVKK m.10 aydınlatma | Kayıt ekranında, kayıt düğmesinin yakınında |
| [gizlilik-politikasi.md](gizlilik-politikasi.md) | Gizlilik politikası | Uygulama içinde **ve** herkese açık bir URL'de (Play şartı) |
| [hizmet-sartlari.md](hizmet-sartlari.md) | Kullanım koşulları | Kayıt ekranında ve uygulama menüsünde |

## Doldurulması gereken alanlar

Metinlerde `[…]` ile işaretli her yer **senin tarafından doldurulacak**:

- `[VERİ SORUMLUSU UNVANI]` — tüzel kişi ya da gerçek kişi unvanı
- `[VERİ SORUMLUSU ADRESİ]`
- `[VERİ SORUMLUSU VKN/TCKN]`
- `[VERBİS KAYIT DURUMU]` — kayıt gerekiyorsa numarası
- `[İLETİŞİM E-POSTASI]` — KVKK başvuruları için
- ~~`[ALAN ADI]`~~ — **dolduruldu:** `earsivfatura.poyrazmuhasebe.com`
- `[YÜRÜRLÜK TARİHİ]`

## Danışmana özellikle sorulacaklar

1. **Yurt dışına aktarım (KVKK m.9).** D1'e yazılan her kayıt Cloudflare'in AB
   veri merkezlerine gidiyor. Araştırmada Cloudflare için bir **yeterlilik
   kararı bulunamadı.** Pratik yol: Cloudflare ile **standart sözleşme**
   imzalamak ve imzadan sonra **5 iş günü içinde Kurum'a bildirmek.**
   Cloudflare'in bu sözleşmeyi imzalayıp imzalamayacağı **belirsiz.** Alternatif
   bir hukuki dayanak var mı?
2. **Veri sorumlusunun kimliği.** Uygulamayı kim yayınlıyor — gerçek kişi mi,
   tüzel kişi mi? VERBİS kaydı gerekiyor mu?
3. **Açık rıza gerekmediği değerlendirmesi.** E-posta, kullanıcı adı ve şifre
   sözleşmenin (hesabın) kurulması için gerekli veriler sayılarak açık rızaya
   bağlanmadı. Bu değerlendirme doğru mu?
4. **İlke Kararı 2026/347** uyarınca aydınlatma ve açık rıza metinleri ayrı
   tutuldu; aydınlatma metni için onay istenmiyor, yalnızca bağlantı
   gösteriliyor. Bu yeterli mi?
5. **Mali müşavir kullanımı.** Uygulamayı mali müşavirler kendi müşterilerinin
   GİB hesaplarıyla kullanıyor. GİB verisi hiçbir zaman bize ulaşmıyor
   (cihazda kalıyor), ama bu durum sorumluluk açısından bir şey değiştiriyor
   mu? Mükellef verisi bakımından kim veri sorumlusu?
6. **Saklama süreleri.** Hesap silinince D1 satırları hemen siliniyor. Workers
   Logs'ta istek meta verisi tutulmaması için `invocation_logs` kapatılıyor.
   Ayrıca bir saklama yükümlülüğü var mı?
