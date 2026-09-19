import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const buDizin = path.dirname(fileURLToPath(import.meta.url));

// Migration dosyaları Node tarafında okunur ve bir binding olarak Worker'a
// geçirilir; test kurulumu bunları gerçek yerel D1'e uygular.
const migrationlar = await readD1Migrations(path.join(buDizin, "migrations"));

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONLARI: migrationlar,
          // Testlerde kullanılan sırlar. Gerçek değerlerle ilgisi yok.
          OTURUM_IMZA_ANAHTARI: "test-imza-anahtari-yalnizca-testler-icin",
          PEPPER: "test-pepper",
          CORS_IZIN_LISTESI: "http://localhost:8081",
          // Testlerin doğrulama kodlarını görebilmesi için. Bir test bunu
          // geçici olarak kaldırıp üretim davranışını da sınar.
          GELISTIRME: "1",
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./test/kurulum.ts"],
  },
});
