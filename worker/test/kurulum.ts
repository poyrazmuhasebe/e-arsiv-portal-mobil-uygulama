/**
 * Her test dosyasından önce çalışır: migration'ları yerel D1'e uygular.
 *
 * Testler GERÇEK workerd çalışma zamanında ve GERÇEK (yerel) D1'e karşı
 * çalışır; bellek içi sahte bir veritabanı kullanılmaz. Böylece scrypt,
 * Web Crypto ve SQL kısıtları gerçekçi biçimde denenmiş olur.
 */

import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

await applyD1Migrations(
  (env as unknown as { DB: D1Database }).DB,
  (env as unknown as { TEST_MIGRATIONLARI: Parameters<typeof applyD1Migrations>[1] })
    .TEST_MIGRATIONLARI,
);
