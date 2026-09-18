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
| `faturaHTMLGetir` | `dispatch`, `EARSIV_PORTAL_FATURA_GOSTER` | ✅ Canlı yanıtla doğrulandı |
| `faturaKaydet` | `dispatch`, `EARSIV_PORTAL_FATURA_OLUSTUR` | ✅ **Canlı yanıtla doğrulandı** — kullanıcının gerçek DevTools yakalamasında bu cmd/payload ile GENEL İADE ve TEVKİFAT tipi iki gerçek fatura başarıyla oluşturuldu ("Faturanız başarıyla oluşturulmuştur..."). İstisna: GENEL İADE tipi için `iadeTable` alanını dolduracak form UI'ı henüz yok (bkz. [Issue #2](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/2)), o yüzden GENEL İADE ile gerçek kesim şu an eksik olabilir. |
| `smsSifreGonder` / `smsSifreOnayla` | `dispatch`, `EARSIV_PORTAL_SMSSIFRE_*` | ⚠️ **Doğrulanmadı** (bkz. [Issue #6](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/6)) |
| `faturaIndir` (ham base64/PDF indirme, HTML değil) | `dispatch`, `EARSIV_PORTAL_FATURA_INDIR` | ⚠️ **Doğrulanmadı**, kullanılmıyor (yerine `faturaHTMLGetir` + PDF üretimi kullanılıyor) |

Bilinen sınırlamaların tam listesi için bkz. [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md).
