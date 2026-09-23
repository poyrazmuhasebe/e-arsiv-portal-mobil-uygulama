# GİB Komutlarının Doğrulanma Durumu

`src/services/gibApi.ts` içindeki her fonksiyonun GİB'in gerçek (canlı) portalıyla
doğrulanma durumu — hızlı referans. Uç noktaların iç işleyişi ve `jp` şemaları
için [gib-entegrasyonu.md](gib-entegrasyonu.md), hesaplama/alan adı detayları
için [hesaplama-mantigi.md](hesaplama-mantigi.md), tüm bilinen boşlukların
tam listesi için [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md).

| Fonksiyon | Uç nokta / cmd | Durum |
|---|---|---|
| `login` | `assos-login`, `assoscmd=anologin` | ✅ Canlı yanıtla doğrulandı |
| `logout` | `assos-login`, `assoscmd=logout` | ✅ Canlı yanıtla doğrulandı |
| `getKullaniciBilgileri` | `dispatch`, `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` | ✅ Canlı yanıtla doğrulandı |
| `mukellefBilgisiGetir` | `dispatch`, `SICIL_VEYA_MERNISTEN_BILGILERI_GETIR` | ✅ Canlı yanıtla doğrulandı |
| `taslakGetir` | `dispatch`, `EARSIV_PORTAL_TASLAKLARI_GETIR` | ✅ Canlı yanıtla doğrulandı |
| `faturaSil` | `dispatch`, `EARSIV_PORTAL_FATURA_SIL` | ✅ Canlı yanıtla doğrulandı — GİB'in kendi iki adımlı silme akışı (uyarı onayı + gerekçe girişi) `TaslaklarScreen`'de birebir uygulandı |
| `faturaHTMLGetir` | `dispatch`, `EARSIV_PORTAL_FATURA_GOSTER` | ✅ Canlı yanıtla doğrulandı |
| `faturaGetir` (Düzenle) | `dispatch`, `EARSIV_PORTAL_FATURA_GETIR` (`RG_BASITFATURA`), jp `{ettn}` → taslağın tüm alanları + `malHizmetTable` | ✅ GİB'in kendi Düzenle ekranından canlı yakalandı (2026-09-23). Yanıttaki toplam KDV (`hesaplanankdv`, `vergilerToplami`) 0 geliyor — kullanılmıyor, form toplamları kendisi hesaplıyor. Not ve irsaliye alanları yanıtta yoktu |
| `faturaGuncelle` (Düzenle → Kaydet) | `dispatch`, `EARSIV_PORTAL_FATURA_OLUSTUR` (`RG_BASITFATURA`) — `faturaKaydet` ile aynı payload, yalnızca `faturaUuid` = taslağın ETTN'si ve `belgeNumarasi` = taslağın numarası | ✅ Canlı yakalandı (2026-09-23): yanıt yine "Faturanız başarıyla oluşturulmuştur..."; listede yeni kayıt çıkmadı, aynı numaralı taslak güncellendi |
| `faturaKaydet` | `dispatch`, `EARSIV_PORTAL_FATURA_OLUSTUR` | ✅ **Canlı yanıtla doğrulandı** — kullanıcının gerçek DevTools yakalamasında bu cmd/payload ile GENEL İADE ve TEVKİFAT tipi iki gerçek fatura başarıyla oluşturuldu ("Faturanız başarıyla oluşturulmuştur..."). İstisna: GENEL İADE tipi için `iadeTable` alanını dolduracak form UI'ı henüz yok (bkz. [Issue #2](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/2)), o yüzden GENEL İADE ile gerçek kesim şu an eksik olabilir. |
| `telefonnoSorgula` | `dispatch`, `EARSIV_PORTAL_TELEFONNO_SORGULA` (priming) + `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` (`RG_KULLANICI`, `telNo` alanı) | ✅ **Canlı yanıtla doğrulandı — üç turda düzeltildi**: (1) `EARSIV_PORTAL_TELEFONNO_SORGULA`'nın yanıt şekli hiç doğrulanamadığından ilk sürüm başarısız oluyordu; (2) `telNo`'nun kaynağı `kullaniciBilgileriDetayGetir`'e geçildi ama `CEPTEL`'in başında `"0"` olmadan 10 hane olması gerektiği (11 haneyle `NullPointerException`) ortaya çıktı; (3) o düzeltmeyle bile GİB'in gerçek arayüzünün ilk attığı `TELEFONNO_SORGULA` isteği eksik olduğundan NPE devam etti — bu istek "ateşle ve unut" olarak geri eklenince GİB İmza tamamen çalıştı (SMS gerçekten telefona ulaştı). |
| `kullaniciBilgileriDetayGetir` / `kullaniciBilgileriKaydet` | `dispatch`, `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` / `_KAYDET` (`RG_KULLANICI`) | ✅ Canlı yanıtla doğrulandı (`KullaniciBilgileriScreen`) |
| `smsSifreGonder` | `dispatch`, `EARSIV_PORTAL_SMSSIFRE_GONDER` (`RG_SMSONAY`) | ✅ **Uçtan uca canlı doğrulandı** — SMS gerçekten telefona ulaştı. Yanıttaki işlem kimliği alanı küçük harfli `oid` (`{"oid": "..."}`); ilk sürüm yanlışlıkla büyük harfli `OID` arayıp "işlem kimliği okunamadı" hatası veriyordu (SMS buna rağmen gönderilmişti). |
| `smsSifreOnayla` | `dispatch`, opak cmd `0lhozfib5410mp` (`RG_SMSONAY`) | ⚠️ **İstek yapısı doğrulandı, BAŞARISIZ yanıt biçimi yakalanmadı.** Daha önce gerçek bir fatura "SMS şifreniz doğrulandı, işlem başarılı." yanıtıyla imzalandı. **2026-09-21:** uygulama "Onaylandı" dediği hâlde fatura GİB'de "Onaylanmadı" kaldı. Kod yanıta hiç bakmıyordu; artık ret metni hata olarak gösteriliyor ve sonuç her zaman GİB'in taslak listesinden doğrulanıyor. Portalın kendi isteğiyle (2026-09-21 yakalaması) istek yapısı birebir aynı: `SIFRE`, `OID`, `OPR: 1`, 14 alanlı `DATA`. Başarısız bir onayın ham yanıtı henüz görülmedi. |
| `iptalTalebiOlustur` | `dispatch`, `EARSIV_PORTAL_IPTAL_TALEBI_OLUSTUR` | ✅ Canlı yanıtla doğrulandı ("İptal talebiniz başarıyla oluşturulmuştur.") |
| `iptalItirazTalepleriGetir` | `dispatch`, `EARSIV_PORTAL_GELEN_IPTAL_ITIRAZ_TALEPLERINI_GETIR` | ✅ Canlı yanıtla doğrulandı (cmd/pageName/jp) |
| `iptalItirazTalepDurumGuncelle` (Kabul) | `dispatch`, `EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE` | ✅ Canlı yanıtla doğrulandı (`talepCevabi: 1`) |
| `adimaDuzenlenenBelgeleriGetir` | `dispatch`, `EARSIV_PORTAL_ADIMA_KESILEN_BELGELERI_GETIR` (`RG_ALICI_TASLAKLAR`), jp `{baslangic, bitis, hourlySearchInterval: "NONE"}` | 🟡 **İstek canlı yakalamayla doğrulandı** (2026-09-21), **yanıtın şekli henüz görülmedi** — taslak listesiyle aynı biçimde geldiği varsayılıyor. İlk denemede "GİB ADIMA DÜZENLENEN HAM YANIT" logu kontrol edilmeli. |
| `iptalItirazTalepDurumGuncelle` (Reddet) | aynı cmd, `talepCevabi: 2` | ✅ Canlı yanıtla doğrulandı (önce yanlışlıkla `0` gönderiliyordu — düzeltildi) |

Bilinen sınırlamaların tam listesi için bkz. [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md).

**Not:** Önceden burada `faturaIndir`/`EARSIV_PORTAL_FATURA_INDIR` diye hiç
kullanılmayan, hiç doğrulanmamış bir fonksiyon da listeleniyordu. Fatura
indirme özelliği zaten `faturaHTMLGetir` (yukarıda ✅) + istemci tarafı PDF
üretimiyle (`src/utils/pdf.ts`) tam çalışır ve canlı doğrulanmış durumda —
`faturaIndir` gereksiz/kafa karıştırıcı olduğu için koddan tamamen
kaldırıldı.

## Dijital Vergi Dairesi (dijital.gib.gov.tr) — `src/services/dvdApi.ts`

e-Arşiv Portal'dan AYRI bir GİB sistemi. Taban: `https://dijital.gib.gov.tr/apigateway`.
Oturum `Authorization: Bearer <token>` başlığıyla taşınır (e-Arşiv Portal'daki
gibi gövdede değil). Tüm istekler kullanıcının 2026-09-22 DevTools
yakalamalarıyla birebir yazıldı.

| Fonksiyon | Uç nokta | Durum |
|---|---|---|
| `dvdGuvenlikKoduGetir` | `GET /captcha/getnewcaptcha` → `{ captchaImgBase64, cid }` (PNG 135×45) | ✅ İstek ve yanıt yakalamayla doğrulandı |
| `dvdGirisYap` | `POST /auth/tdvd/login`, başlık `page-name: login`, `ui-client: fe`, gövde `{ dk, userid, sifre, imageId }` (`imageId` = `cid`) → `{ result: true, token }` | ✅ Başarılı yanıt ve yanlış güvenlik kodu yanıtı (`{ messages: [{ text, type: "ERROR" }] }`) doğrulandı. ⚠️ Hatalı yanıtın HTTP durum kodu ve yanlış şifre metni görülmedi |
| `dvdEarsivFaturalariGetir` | `POST /eislemler/earsiv/alici-list`, gövde `{ data: { duzenlenmeTarihiBas, duzenlenmeTarihiSon } (GG/AA/YYYY), meta: { pagination: { pageNo, pageSize: 10 }, sortFieldName: "faturaNo", sortType: "DESC", filters: [] } }` → `{ pageDetail, resultListDenormalized }` | ✅ İstek ve yanıt doğrulandı. ⚠️ GİB istenen sıralamayı uygulamıyor görünüyor (uygulama kendisi sıralar); tarih aralığı sınırı, `filters` yapısı, iptal/itiraz alanlarının dolu değerleri ve oturumu düşmüş token'ın yanıtı (401/403 varsayılıyor) görülmedi. Kayıt yoksa GİB boş liste yerine "e-Arşiv Faturanız bulunmamaktadır." mesajı döner (cihaz logu, 2026-09-22) — uygulama bunu boş sayfa sayar, hata saymaz. Yanıtta faturayı açmaya yarayan kimlik yok; GİB'in sayfasında da liste yalnızca metin |
| `dvdCikisYap` | `POST /auth/tdvd/logout` (Bearer, gövde yok) → `{ data: { redirectUrl }, result: true }` | ✅ Doğrulandı |

Güvenlik kodu (captcha) **otomatik okunmaz**; kullanıcı yazar (GİB'in insan
doğrulaması aşılmaz).

**PDF'e aktarma** için iki okuma daha kullanılır:

| Fonksiyon | Uç nokta | Durum |
|---|---|---|
| `dvdKullaniciBilgisiGetir` | `GET /auth/tdvd/user-info` (Bearer) → yalnızca `name`, `surname`, `vkn`, `tckn`, `userCode` okunur | ✅ Yanıt yakalamayla görüldü; PDF başlığı için. Alınamazsa PDF yine üretilir |
| `dvdTumFaturalariGetir` | `alici-list`'i her parça (≤ 7 gün, aynı ay) ve her sayfa için sırayla çağırır, istekler arası 300 ms | Yeni uç nokta yok |

GİB'in kendi "PDF'e Aktar"ı (`GET /eislemler/report/download?uuid=…`, liste
raporu) **kullanılmaz**; PDF uygulama içinde üretilir (`src/utils/dvdRapor.ts`).
