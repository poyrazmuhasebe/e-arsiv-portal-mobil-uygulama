// Yerel APK derlemesi (EAS kuyruğu olmadan) — Windows.
//
//   npm run apk:yerel            → builds/e-Arsiv-Portal-v<sürüm>-<commit>-yerel.apk
//   npm run apk:yerel -- --temiz → android/ klasörünü baştan oluşturur (prebuild --clean)
//   npm run apk:yerel -- --yayinla → derleme başarılıysa sürümü sunucuya da kaydeder
//                                    (npm run surum:yayinla; eski sürümler kilitlenir)
//   npm run apk:yerel -- --kararli → sürüm adına "-beta.N" eklenmez
//
// SÜRÜM (beta kuralı, 2026-09-22): HER derlemede app.json → android.versionCode
// bir artırılır ve sürüm adı "<taban>-beta.<versionCode>" olur (ör. taban
// "1.0.1" → "1.0.1-beta.3"). Taban sürüm elle değiştirilir (app.json →
// expo.version; mevcut "-beta.N" eki atılıp yeniden eklenir). Derleme
// başarısız olursa app.json eski hâline döner. app.json değişikliği commit'lenmeli.
//
// Gerekenler (kullanıcı klasörüne taşınabilir kurulum, sistem ayarı değiştirmez):
//   %USERPROFILE%\Android\jdk17    Microsoft OpenJDK 17
//   %USERPROFILE%\Android\Sdk      Android SDK (platform 36, build-tools 36.0.0, NDK 27.1, CMake)
// Farklı yerdeyse JAVA_HOME / ANDROID_HOME ortam değişkenleri kullanılır.
//
// İMZA: proje kökündeki `yerel-imza.properties` (git'e GİRMEZ) varsa APK o
// anahtarla (EAS'ten indirilen keystore) imzalanır; böylece EAS APK'larının
// üzerine güncelleme olarak kurulur. Dosya yoksa hata verilir; yalnızca
// denemek için `--hata-ayiklama-imzasi` ile debug anahtarı kullanılabilir
// (bu APK EAS sürümünün üzerine KURULMAZ).
//
//   yerel-imza.properties:
//     storeFile=earsiv-app.jks          (proje köküne göre ya da tam yol)
//     storePassword=...
//     keyAlias=...
//     keyPassword=...
//
// EXPO_PUBLIC_HESAP_API_URL, EAS'teki "preview" profiliyle AYNI olsun diye
// eas.json'dan okunur (.env.local'daki geliştirme adresi APK'ya girmez).

import { execSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumanlar = process.argv.slice(2);
const temiz = argumanlar.includes('--temiz');
const debugImza = argumanlar.includes('--hata-ayiklama-imzasi');
const yayinla = argumanlar.includes('--yayinla');
const kararli = argumanlar.includes('--kararli');

// Sürüm artırıldıktan sonra bir hata olursa app.json geri yüklenir.
let geriAl = () => {};

function dur(mesaj) {
  geriAl();
  console.error(`\n✖ ${mesaj}`);
  process.exit(1);
}

if (yayinla && debugImza) {
  dur('--yayinla, --hata-ayiklama-imzasi ile kullanılamaz: debug imzalı APK mevcut kurulumun üzerine kurulmaz.');
}

// --- Araçlar ------------------------------------------------------------
// Önce %USERPROFILE%\Android: Claude masaüstü uygulaması (MSIX) içinden
// %LOCALAPPDATA%'ya kurulan dosyalar sanallaştırılıp normal terminalden
// görünmüyor; araçlar bu yüzden kullanıcı klasörüne taşındı (2026-09-22).
const adaylar = [process.env.USERPROFILE, process.env.LOCALAPPDATA]
  .filter(Boolean)
  .map((k) => path.join(k, 'Android'));
const bul = (alt, yedek) => adaylar.map((a) => path.join(a, alt)).find((y) => existsSync(y)) ?? yedek;
const javaHome = bul('jdk17', process.env.JAVA_HOME);
const androidHome = bul('Sdk', process.env.ANDROID_HOME);
if (!javaHome || !existsSync(javaHome)) dur('JDK 17 bulunamadı (%USERPROFILE%\\Android\\jdk17 ya da JAVA_HOME).');
if (!androidHome || !existsSync(androidHome)) dur('Android SDK bulunamadı (%USERPROFILE%\\Android\\Sdk ya da ANDROID_HOME).');

// --- İmza ---------------------------------------------------------------
const imzaDosyasi = path.join(kok, 'yerel-imza.properties');
let imza = null;
if (existsSync(imzaDosyasi)) {
  imza = Object.fromEntries(
    readFileSync(imzaDosyasi, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('#') && s.includes('='))
      .map((s) => [s.slice(0, s.indexOf('=')).trim(), s.slice(s.indexOf('=') + 1).trim()]),
  );
  for (const alan of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
    if (!imza[alan]) dur(`yerel-imza.properties içinde "${alan}" eksik.`);
  }
  imza.storeFile = path.resolve(kok, imza.storeFile);
  if (!existsSync(imza.storeFile)) dur(`Keystore dosyası bulunamadı: ${imza.storeFile}`);
} else if (!debugImza) {
  dur(
    'yerel-imza.properties yok. EAS anahtarını indirip bu dosyayı oluşturun (bkz. betiğin başı) ' +
      'ya da yalnızca deneme için --hata-ayiklama-imzasi verin.',
  );
}

// --- Ortam --------------------------------------------------------------
const eas = JSON.parse(readFileSync(path.join(kok, 'eas.json'), 'utf8'));
const hesapApi = eas?.build?.preview?.env?.EXPO_PUBLIC_HESAP_API_URL;
if (!hesapApi) dur('eas.json → build.preview.env.EXPO_PUBLIC_HESAP_API_URL bulunamadı.');

const ortam = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH}`,
  EXPO_PUBLIC_HESAP_API_URL: hesapApi,
  NODE_ENV: 'production',
};

function calistir(komut, argumanlar, cwd = kok) {
  console.log(`\n> ${komut} ${argumanlar.join(' ')}`);
  const s = spawnSync(komut, argumanlar, { cwd, env: ortam, stdio: 'inherit', shell: true });
  if (s.status !== 0) dur(`Komut başarısız (${s.status}): ${komut}`);
}

// --- Sürüm (her derlemede yeni versionCode) ------------------------------
const appJsonYolu = path.join(kok, 'app.json');
const appJsonEski = readFileSync(appJsonYolu, 'utf8');
const appJson = JSON.parse(appJsonEski);
const eskiKod = appJson.expo.android?.versionCode;
if (!Number.isInteger(eskiKod) || eskiKod < 1) dur('app.json → expo.android.versionCode bulunamadı.');
const surumKodu = eskiKod + 1;
const tabanSurum = String(appJson.expo.version).replace(/-beta\.\d+$/, '');
const surumAdi = kararli ? tabanSurum : `${tabanSurum}-beta.${surumKodu}`;
appJson.expo.version = surumAdi;
appJson.expo.android.versionCode = surumKodu;
writeFileSync(appJsonYolu, JSON.stringify(appJson, null, 2) + '\n');
geriAl = () => {
  writeFileSync(appJsonYolu, appJsonEski);
  console.error(`app.json eski hâline döndürüldü (versionCode ${eskiKod}).`);
};
console.log(`\n> Sürüm: ${surumAdi} (versionCode ${eskiKod} → ${surumKodu})`);

// --- Android projesi (prebuild) -----------------------------------------
const androidDizini = path.join(kok, 'android');
{
  // Simge ve açılış görseli değişikliklerini mevcut Android projesine de uygula.
  // prebuild package.json'daki "android"/"ios" betiklerini değiştiriyor;
  // proje dosyası değişmesin diye önce/sonra aynı içerik yazılır.
  const paket = readFileSync(path.join(kok, 'package.json'), 'utf8');
  try {
    calistir('npx', ['expo', 'prebuild', '-p', 'android', '--no-install', ...(temiz ? ['--clean'] : [])]);
  } finally {
    writeFileSync(path.join(kok, 'package.json'), paket);
  }
}

writeFileSync(
  path.join(androidDizini, 'local.properties'),
  `sdk.dir=${androidHome.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}\n`,
);

// Release imzası: app/build.gradle'a (prebuild her seferinde yeniden
// üretebildiği için her derlemede kontrol edilir) Gradle özelliklerinden
// okunan bir "yerel" imza eklenir. Şifreler build.gradle'a YAZILMAZ; ortam
// değişkeniyle geçirilir (aşağıda).
const gradleYolu = path.join(androidDizini, 'app', 'build.gradle');
let gradle = readFileSync(gradleYolu, 'utf8');
const ISARET = '// yerel-apk.mjs: yerel imza';
if (!gradle.includes(ISARET)) {
  const eskiImzalar = 'signingConfigs {\n        debug {';
  const eskiRelease = /(release \{[^}]*?)signingConfig signingConfigs\.debug/;
  if (!gradle.includes(eskiImzalar) || !eskiRelease.test(gradle)) {
    dur('android/app/build.gradle beklenen biçimde değil; `npm run apk:yerel -- --temiz` deneyin.');
  }
  gradle = gradle.replace(
    eskiImzalar,
    `signingConfigs {
        ${ISARET}
        if (project.hasProperty('yerelStoreFile')) {
            yerel {
                storeFile file(project.property('yerelStoreFile'))
                storePassword project.property('yerelStorePassword')
                keyAlias project.property('yerelKeyAlias')
                keyPassword project.property('yerelKeyPassword')
            }
        }
        debug {`,
  );
  gradle = gradle.replace(
    eskiRelease,
    "$1signingConfig project.hasProperty('yerelStoreFile') ? signingConfigs.yerel : signingConfigs.debug",
  );
  writeFileSync(gradleYolu, gradle);
}

// Sürüm bilgisinin app.json ile aynı olduğunu derlemeden önce garanti et.
{
  let g = readFileSync(gradleYolu, 'utf8');
  if (!/versionCode \d+/.test(g) || !/versionName "[^"]*"/.test(g)) {
    dur('android/app/build.gradle içinde versionCode/versionName bulunamadı; `npm run apk:yerel -- --temiz` deneyin.');
  }
  g = g.replace(/versionCode \d+/, `versionCode ${surumKodu}`).replace(/versionName "[^"]*"/, `versionName "${surumAdi}"`);
  writeFileSync(gradleYolu, g);
}

// --- Derleme ------------------------------------------------------------
// Yalnızca telefon işlemcileri (arm64 ve 32 bit eski telefonlar için armv7).
// x86/x86_64 emülatör ve bazı Chromebook'lar içindir; APK'da 35 MB tutuyordu
// (84 MB → ~47 MB, 2026-10-21). Komut satırı, prebuild'in her seferinde
// yeniden yazdığı gradle.properties'teki değeri geçersiz kılar.
// kotlin.compiler.execution.strategy=in-process: ayrı Kotlin daemon'u Windows'ta
// node_modules/*/android/build klasörlerini açık tutup "Unable to delete
// directory" hatasına yol açıyordu (2026-10-21).
const gradleArgumanlari = [
  'assembleRelease',
  '--no-daemon',
  '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a',
  '-Pkotlin.compiler.execution.strategy=in-process',
];
const gradleOrtami = { ...ortam };
if (imza) {
  // Gradle, ORG_GRADLE_PROJECT_<ad> ortam değişkenlerini proje özelliği
  // olarak okur. Şifreler böylece komut satırında (süreç listesi, kabuk
  // kaçışı) görünmez ve özel karakterler bozulmaz.
  gradleOrtami.ORG_GRADLE_PROJECT_yerelStoreFile = imza.storeFile;
  gradleOrtami.ORG_GRADLE_PROJECT_yerelStorePassword = imza.storePassword;
  gradleOrtami.ORG_GRADLE_PROJECT_yerelKeyAlias = imza.keyAlias;
  gradleOrtami.ORG_GRADLE_PROJECT_yerelKeyPassword = imza.keyPassword;
}
console.log(`\n> gradlew ${imza ? 'assembleRelease (EAS anahtarıyla imzalı)' : 'assembleRelease (DEBUG imzalı — yalnızca deneme)'}`);
// Tam yol: bazı ortamlarda cmd çalışma klasöründeki .bat'ı aramıyor.
const s = spawnSync(`"${path.join(androidDizini, 'gradlew.bat')}"`, gradleArgumanlari, {
  cwd: androidDizini,
  env: gradleOrtami,
  stdio: 'inherit',
  shell: true,
});
if (s.status !== 0) dur(`Gradle derlemesi başarısız (${s.status}).`);

// --- Çıktı --------------------------------------------------------------
const cikti = path.join(androidDizini, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!existsSync(cikti)) dur('APK üretilmedi: ' + cikti);
// Buradan sonra derleme başarılı sayılır; artırılan sürüm kalıcıdır.
geriAl = () => {};
const surum = surumAdi;
let commit = 'yerel';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: kok }).toString().trim();
} catch {
  // git yoksa
}
mkdirSync(path.join(kok, 'builds'), { recursive: true });
const hedef = path.join(
  kok,
  'builds',
  `e-Arsiv-Portal-v${surum}-${commit}-yerel${imza ? '' : '-debugimza'}.apk`,
);
copyFileSync(cikti, hedef);
console.log(`\n✔ APK hazır: ${hedef}`);
console.log(`  Sürüm ${surumAdi} (versionCode ${surumKodu}). app.json değişikliğini commit'lemeyi unutmayın.`);

if (yayinla) {
  calistir('node', [path.join('scripts', 'surum-yayinla.mjs')]);
} else {
  console.log(
    '  Bu sürümü zorunlu yapmak (eski sürümleri kilitlemek) için APK dağıtıldıktan sonra:\n' +
      '    npm run surum:yayinla',
  );
}
