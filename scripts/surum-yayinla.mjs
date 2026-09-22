// Uygulamanın yeni sürümünü hesap sunucusunun veritabanına (D1,
// uygulama_surumleri) kaydeder. Kayıttan sonra, sürüm kodu bundan DÜŞÜK olan
// her kurulum açılışta kapatılamayan "Güncelleme gerekli" kutusunu görür.
//
//   npm run surum:yayinla                                  → app.json'daki sürümü kaydeder
//   npm run surum:yayinla -- --adres https://.../x.apk     → kutuda "Güncellemeyi İndir" düğmesi
//   npm run surum:yayinla -- --yerel                       → uzak yerine yerel (wrangler dev) D1
//
// SIRA ÖNEMLİ: önce yeni APK'yı dağıtın/kurun, SONRA yayınlayın — yayın anında
// eski sürümdeki herkes (siz dahil) kilitlenir.
//
// Hatalı bir sürümü geri çekmek (bir öncekini yeniden "son sürüm" yapmak):
//   cd worker && npx wrangler d1 execute earsiv-hesap --remote \
//     --command "DELETE FROM uygulama_surumleri WHERE platform='android' AND surum_kodu=<kod>"
//
// Gereken: worker/ içinde `npx wrangler login` yapılmış olması ve
// migrations/0002_uygulama_surumleri.sql'in uzak D1'e uygulanmış olması.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumanlar = process.argv.slice(2);
const yerel = argumanlar.includes('--yerel');
const adresIndeksi = argumanlar.indexOf('--adres');
const adres = adresIndeksi >= 0 ? argumanlar[adresIndeksi + 1] : null;

function dur(mesaj) {
  console.error(`\n✖ ${mesaj}`);
  process.exit(1);
}

if (adresIndeksi >= 0 && (!adres || !adres.startsWith('https://'))) {
  dur('--adres bir https:// adresi olmalı.');
}

const expo = JSON.parse(readFileSync(path.join(kok, 'app.json'), 'utf8')).expo;
const kod = expo.android?.versionCode;
const ad = String(expo.version ?? '');
if (!Number.isInteger(kod) || kod < 1) dur('app.json → expo.android.versionCode geçersiz.');
if (!/^[0-9A-Za-z.+-]+$/.test(ad)) dur(`app.json → expo.version beklenmeyen karakter içeriyor: ${ad}`);

const sqlMetni = (s) => (s === null ? 'NULL' : `'${s.replace(/'/g, "''")}'`);
const sql =
  'INSERT INTO uygulama_surumleri (platform, surum_kodu, surum_adi, indirme_adresi, yayin) ' +
  `VALUES ('android', ${kod}, ${sqlMetni(ad)}, ${sqlMetni(adres)}, unixepoch());\n`;

// Komut satırı yerine dosya: Windows kabuğunda tırnak kaçışı sorun çıkarmasın.
const gecici = mkdtempSync(path.join(os.tmpdir(), 'surum-'));
const sqlDosyasi = path.join(gecici, 'surum.sql');
writeFileSync(sqlDosyasi, sql);

console.log(`\n> Sürüm kaydediliyor (${yerel ? 'YEREL' : 'UZAK'} D1): ${ad} (versionCode ${kod})`);
const s = spawnSync(
  'npx',
  ['wrangler', 'd1', 'execute', 'earsiv-hesap', yerel ? '--local' : '--remote', `--file="${sqlDosyasi}"`, '--yes'],
  { cwd: path.join(kok, 'worker'), stdio: 'inherit', shell: true },
);
rmSync(gecici, { recursive: true, force: true });
if (s.status !== 0) {
  dur('Kayıt başarısız. Bu sürüm zaten kayıtlıysa (UNIQUE hatası) yeni bir derleme alın.');
}
console.log(`\n✔ Yayınlandı: ${ad} (${kod}). Bundan eski kurulumlar açılışta güncelleme isteyecek.`);
