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
| `faturaKaydet` | `dispatch`, `EARSIV_PORTAL_FATURA_OLUSTUR` | ✅ **Canlı yanıtla doğrulandı** — kullanıcının gerçek DevTools yakalamasında bu cmd/payload ile GENEL İADE ve TEVKİFAT tipi iki gerçek fatura başarıyla oluşturuldu ("Faturanız başarıyla oluşturulmuştur..."). İstisna: GENEL İADE tipi için `iadeTable` alanını dolduracak form UI'ı henüz yok (bkz. [Issue #2](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/2)), o yüzden GENEL İADE ile gerçek kesim şu an eksik olabilir. |
| `telefonnoSorgula` | `dispatch`, `EARSIV_PORTAL_TELEFONNO_SORGULA` (priming) + `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` (`RG_KULLANICI`, `telNo` alanı) | ✅ **Canlı yanıtla doğrulandı — üç turda düzeltildi**: (1) `EARSIV_PORTAL_TELEFONNO_SORGULA`'nın yanıt şekli hiç doğrulanamadığından ilk sürüm başarısız oluyordu; (2) `telNo`'nun kaynağı `kullaniciBilgileriDetayGetir`'e geçildi ama `CEPTEL`'in başında `"0"` olmadan 10 hane olması gerektiği (11 haneyle `NullPointerException`) ortaya çıktı; (3) o düzeltmeyle bile GİB'in gerçek arayüzünün ilk attığı `TELEFONNO_SORGULA` isteği eksik olduğundan NPE devam etti — bu istek "ateşle ve unut" olarak geri eklenince GİB İmza tamamen çalıştı (SMS gerçekten telefona ulaştı). |
| `kullaniciBilgileriDetayGetir` / `kullaniciBilgileriKaydet` | `dispatch`, `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` / `_KAYDET` (`RG_KULLANICI`) | ✅ Canlı yanıtla doğrulandı (`KullaniciBilgileriScreen`) |
| `smsSifreGonder` | `dispatch`, `EARSIV_PORTAL_SMSSIFRE_GONDER` (`RG_SMSONAY`) | ✅ **Uçtan uca canlı doğrulandı** — SMS gerçekten telefona ulaştı. Yanıttaki işlem kimliği alanı küçük harfli `oid` (`{"oid": "..."}`); ilk sürüm yanlışlıkla büyük harfli `OID` arayıp "işlem kimliği okunamadı" hatası veriyordu (SMS buna rağmen gönderilmişti). |
| `smsSifreOnayla` | `dispatch`, opak cmd `0lhozfib5410mp` (`RG_SMSONAY`) | ✅ **Uçtan uca canlı doğrulandı** — gerçek bir fatura "SMS şifreniz doğrulandı, işlem başarılı." yanıtıyla imzalandı; `OID`'nin `smsSifreGonder`'in yanıtındaki `oid` alanından geldiği de artık canlı doğrulandı. |
| `iptalTalebiOlustur` | `dispatch`, `EARSIV_PORTAL_IPTAL_TALEBI_OLUSTUR` | ✅ Canlı yanıtla doğrulandı ("İptal talebiniz başarıyla oluşturulmuştur.") |
| `iptalItirazTalepleriGetir` | `dispatch`, `EARSIV_PORTAL_GELEN_IPTAL_ITIRAZ_TALEPLERINI_GETIR` | ✅ Canlı yanıtla doğrulandı (cmd/pageName/jp) |
| `iptalItirazTalepDurumGuncelle` (Kabul) | `dispatch`, `EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE` | ✅ Canlı yanıtla doğrulandı (`talepCevabi: 1`) |
| `iptalItirazTalepDurumGuncelle` (Reddet) | aynı cmd, `talepCevabi: 0` | ✅ Canlı yanıtla doğrulandı |

Bilinen sınırlamaların tam listesi için bkz. [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md).

**Not:** Önceden burada `faturaIndir`/`EARSIV_PORTAL_FATURA_INDIR` diye hiç
kullanılmayan, hiç doğrulanmamış bir fonksiyon da listeleniyordu. Fatura
indirme özelliği zaten `faturaHTMLGetir` (yukarıda ✅) + istemci tarafı PDF
üretimiyle (`src/utils/pdf.ts`) tam çalışır ve canlı doğrulanmış durumda —
`faturaIndir` gereksiz/kafa karıştırıcı olduğu için koddan tamamen
kaldırıldı.
