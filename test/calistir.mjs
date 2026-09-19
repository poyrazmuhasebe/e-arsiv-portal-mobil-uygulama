// `npm test` giriş noktası. Yeni bağımlılık gerektirmez:
//   1. test/ ve testlerin kullandığı src/ modüllerini tsc ile geçici bir
//      klasöre (node_modules/.cache/earsiv-test) CommonJS olarak derler,
//   2. Node'un yerleşik test çalıştırıcısıyla (`node --test`) çalıştırır;
//      React Native/Expo modülleri test/sahte/kurulum.ts ile sahtelenir.
//
// Yalnızca bazı dosyaları çalıştırmak için: `npm test -- aliciDefteri gibApi`

import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cikti = path.join(kok, 'node_modules', '.cache', 'earsiv-test');

rmSync(cikti, { recursive: true, force: true });

const derleme = spawnSync(
  process.execPath,
  [path.join(kok, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', path.join(kok, 'tsconfig.test.json')],
  { stdio: 'inherit' },
);
if (derleme.status !== 0) {
  console.error('Test derlemesi başarısız.');
  process.exit(derleme.status ?? 1);
}

const testDizini = path.join(cikti, 'test');
const filtreler = process.argv.slice(2).map((f) => f.toLowerCase());
const dosyalar = readdirSync(testDizini)
  .filter((ad) => ad.endsWith('.test.js'))
  .filter((ad) => filtreler.length === 0 || filtreler.some((f) => ad.toLowerCase().includes(f)))
  .map((ad) => path.join(testDizini, ad));

if (dosyalar.length === 0) {
  console.error('Çalıştırılacak test dosyası bulunamadı.');
  process.exit(1);
}

const calisma = spawnSync(
  process.execPath,
  ['--test', '--require', path.join(testDizini, 'sahte', 'kurulum.js'), ...dosyalar],
  { stdio: 'inherit' },
);
process.exit(calisma.status ?? 1);
