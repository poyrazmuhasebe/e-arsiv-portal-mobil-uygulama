# GİB Komutlarının Doğrulanma Durumu

`src/services/gibApi.ts` içindeki her fonksiyonun GİB'in gerçek (canlı) portalıyla
doğrulanma durumu. Detaylı gerekçeler ilgili fonksiyonun üstündeki kod
yorumlarında; bilinen boşluklar için [Issues](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues)'a bakın.

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

## Bilinen sınırlamalar

- **Vergi Seçiniz:** `faturaConstants.ts`'teki 29 gerçek vergi türünden yalnızca
  `V9015` (KDV Tevkifat) hesaplanıp GİB'e gönderiliyor; diğerleri seçilse bile
  sessizce dikkate alınmıyor (bkz. [Issue #1](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/1)).
- **Tevkifat kodları:** 601-627 (kısmi) + 801-825 (tam tevkifat) kapsanıyor;
  623 sonrası bazı karmaşık kalemler ve "627-Ex" tarihsel varyantı bilinçli
  olarak dışarıda bırakıldı (bkz. [Issue #8](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/8)).
