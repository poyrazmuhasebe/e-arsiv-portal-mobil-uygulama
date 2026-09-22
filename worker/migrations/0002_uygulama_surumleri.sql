-- Yayınlanan uygulama sürümleri (zorunlu güncelleme kontrolü).
--
-- Uygulama her açılışta GET /v1/surum ile bu tablodaki EN YÜKSEK sürüm
-- kodunu sorar; cihazdaki sürüm kodu daha düşükse kapatılamayan
-- "güncelleyin" kutusu gösterilir. Satırlar `npm run surum:yayinla`
-- (scripts/surum-yayinla.mjs) ile eklenir. Hatalı bir sürüm geri çekilecekse
-- satırı silmek yeterli: bir önceki sürüm yeniden "son sürüm" olur.
--
-- Kişisel veri İÇERMEZ.

CREATE TABLE uygulama_surumleri (
  -- 'android' | 'ios'
  platform        TEXT    NOT NULL CHECK (platform IN ('android', 'ios')),
  -- Android versionCode (tam sayı, her derlemede artar).
  surum_kodu      INTEGER NOT NULL CHECK (surum_kodu > 0),
  -- Kullanıcıya gösterilen ad, ör. "1.0.1-beta.3".
  surum_adi       TEXT    NOT NULL,
  -- İsteğe bağlı: yeni APK'nın indirileceği https adresi.
  indirme_adresi  TEXT,
  -- Unix zamanı, saniye.
  yayin           INTEGER NOT NULL,
  PRIMARY KEY (platform, surum_kodu)
);
