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
| `telefonnoSorgula` | `dispatch`, `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` (`RG_KULLANICI`, `telNo` alanı) | ✅ **Canlı yanıtla doğrulandı ve iki turda düzeltildi** — eski implementasyon (`EARSIV_PORTAL_TELEFONNO_SORGULA`) yanıt şekli hiç doğrulanamadığından "Kayıtlı telefon numarası alınamadı" hatasıyla başarısız oluyordu; `kullaniciBilgileriDetayGetir`'in `telNo` alanına geçildikten sonra da GİB'in `CEPTEL`'i başında `"0"` olmadan 10 hane beklediği (11 haneyle `NullPointerException` veriyordu) canlı denemeyle ortaya çıktı ve düzeltildi. |
| `kullaniciBilgileriDetayGetir` / `kullaniciBilgileriKaydet` | `dispatch`, `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` / `_KAYDET` (`RG_KULLANICI`) | ✅ Canlı yanıtla doğrulandı (`KullaniciBilgileriScreen`) |
| `smsSifreGonder` | `dispatch`, `EARSIV_PORTAL_SMSSIFRE_GONDER` (`RG_SMSONAY`) | ✅ Canlı yanıtla doğrulandı |
| `smsSifreOnayla` | `dispatch`, opak cmd `0lhozfib5410mp` (`RG_SMSONAY`) | ✅ **Uçtan uca canlı doğrulandı** — gerçek bir fatura "SMS şifreniz doğrulandı, işlem başarılı." yanıtıyla imzalandı. Tek açık nokta: `OID`'nin `smsSifreGonder`'in yanıtından geldiği varsayımı henüz bağımsız bir yanıt yakalamasıyla teyit edilmedi (bkz. [gib-entegrasyonu.md](gib-entegrasyonu.md)). |
| `iptalTalebiOlustur` | `dispatch`, `EARSIV_PORTAL_IPTAL_TALEBI_OLUSTUR` | ✅ Canlı yanıtla doğrulandı ("İptal talebiniz başarıyla oluşturulmuştur.") |
| `iptalItirazTalepleriGetir` | `dispatch`, `EARSIV_PORTAL_GELEN_IPTAL_ITIRAZ_TALEPLERINI_GETIR` | ✅ Canlı yanıtla doğrulandı (cmd/pageName/jp) |
| `iptalItirazTalepDurumGuncelle` (Kabul) | `dispatch`, `EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE` | ✅ Canlı yanıtla doğrulandı (`talepCevabi: 1`) |
| `iptalItirazTalepDurumGuncelle` (Reddet) | aynı cmd, `talepCevabi: 0` | ⚠️ **Doğrulanmadı** — mantıklı ama henüz canlı test edilmemiş bir varsayım (bkz. [Issue #18](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/18)) |
| `faturaIndir` (ham base64/PDF indirme, HTML değil) | `dispatch`, `EARSIV_PORTAL_FATURA_INDIR` | ⚠️ **Doğrulanmadı**, kullanılmıyor (yerine `faturaHTMLGetir` + PDF üretimi kullanılıyor) |

Bilinen sınırlamaların tam listesi için bkz. [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md).
