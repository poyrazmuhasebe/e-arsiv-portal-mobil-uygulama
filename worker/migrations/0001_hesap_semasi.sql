-- Uygulama hesabı şeması.
--
-- BU VERİTABANINDA GİB VERİSİ İÇİN HİÇBİR TABLO YA DA SÜTUN YOKTUR.
-- GİB kullanıcı kodu, GİB şifresi, GİB token'ı, VKN/TCKN, unvan, fatura
-- verisi, alıcı defteri ve mal/hizmet defteri yalnızca cihazda kalır.
-- Bkz. docs/hesap-sistemi.md

CREATE TABLE kullanicilar (
  id                TEXT    PRIMARY KEY,
  -- Küçük harfe normalize edilmiş olarak saklanır.
  eposta            TEXT    NOT NULL UNIQUE,
  -- Uygulamaya özel kullanıcı adı. GİB kullanıcı kodu DEĞİLDİR.
  -- Küçük harfe normalize edilmiş olarak saklanır.
  kullanici_adi     TEXT    NOT NULL UNIQUE,
  -- "scrypt$N$r$p$<tuz>$<ozet>" biçiminde. Düz şifre hiçbir zaman saklanmaz.
  -- Sosyal girişle açılan hesaplarda NULL olabilir.
  sifre_ozeti       TEXT,
  eposta_dogrulandi INTEGER NOT NULL DEFAULT 0,
  olusturma         INTEGER NOT NULL,
  guncelleme        INTEGER NOT NULL
);

-- Sosyal giriş sağlayıcıları (aşama e). Kimlik anahtarı e-posta DEĞİL,
-- sağlayıcının verdiği kullanıcı kimliğidir (sub). Sağlayıcının erişim ya da
-- kimlik token'ları BURAYA YAZILMAZ; doğrulandıktan sonra atılır.
CREATE TABLE kimlik_saglayicilar (
  saglayici              TEXT    NOT NULL,
  saglayici_kullanici_id TEXT    NOT NULL,
  kullanici_id           TEXT    NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  olusturma              INTEGER NOT NULL,
  PRIMARY KEY (saglayici, saglayici_kullanici_id)
);

CREATE INDEX idx_kimlik_saglayicilar_kullanici ON kimlik_saglayicilar(kullanici_id);

-- Yenileme token'ının KENDİSİ değil, yalnızca SHA-256 özeti saklanır.
CREATE TABLE oturumlar (
  id              TEXT    PRIMARY KEY,
  kullanici_id    TEXT    NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  yenileme_ozeti  TEXT    NOT NULL UNIQUE,
  bitis           INTEGER NOT NULL,
  iptal           INTEGER NOT NULL DEFAULT 0,
  olusturma       INTEGER NOT NULL
);

CREATE INDEX idx_oturumlar_kullanici ON oturumlar(kullanici_id);

-- E-posta doğrulama ve şifre sıfırlama kodları. Kodun kendisi değil, yalnızca
-- SHA-256 özeti saklanır; kısa ömürlü, sınırlı denemeli ve tek kullanımlıktır.
CREATE TABLE tek_kullanimlik_kodlar (
  id           TEXT    PRIMARY KEY,
  kullanici_id TEXT    NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  -- 'eposta_dogrulama' | 'sifre_sifirlama'
  tip          TEXT    NOT NULL,
  kod_ozeti    TEXT    NOT NULL,
  bitis        INTEGER NOT NULL,
  deneme       INTEGER NOT NULL DEFAULT 0,
  kullanildi   INTEGER NOT NULL DEFAULT 0,
  olusturma    INTEGER NOT NULL
);

CREATE INDEX idx_kodlar_kullanici_tip ON tek_kullanimlik_kodlar(kullanici_id, tip);

-- Sabit pencereli oran sınırlama sayacı. Anahtar, kişisel veri içermez:
-- e-posta ve IP adresi doğrudan yazılmaz, SHA-256 özeti kullanılır.
CREATE TABLE oran_sinir (
  anahtar TEXT    PRIMARY KEY,
  pencere INTEGER NOT NULL,
  sayac   INTEGER NOT NULL
);
