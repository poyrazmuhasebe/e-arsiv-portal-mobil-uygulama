/** GET /v1/surum — zorunlu güncelleme kontrolü. */

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { cagir } from "./yardimci";

const DB = (env as unknown as { DB: D1Database }).DB;

async function surumEkle(platform: string, kod: number, ad: string, adres: string | null = null) {
  await DB.prepare(
    "INSERT INTO uygulama_surumleri (platform, surum_kodu, surum_adi, indirme_adresi, yayin) VALUES (?1, ?2, ?3, ?4, ?5)",
  )
    .bind(platform, kod, ad, adres, 1_790_000_000 + kod)
    .run();
}

interface Yanit {
  platform: string;
  sonSurum: { kod: number; ad: string; indirmeAdresi: string | null; yayin: number } | null;
}

describe("sürüm kontrolü", () => {
  it("hiç sürüm yoksa sonSurum null döner", async () => {
    const yanit = await cagir("/v1/surum?platform=ios", { yontem: "GET" });
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("cache-control")).toBe("no-store");
    expect(await yanit.json()).toEqual({ platform: "ios", sonSurum: null });
  });

  it("platformun EN YÜKSEK sürüm kodunu döndürür (ekleme sırasından bağımsız)", async () => {
    await surumEkle("android", 5, "1.0.1-beta.5");
    await surumEkle("android", 7, "1.0.1-beta.7", "https://ornek.test/apk");
    await surumEkle("android", 6, "1.0.1-beta.6");
    await surumEkle("ios", 99, "ios-surumu");

    const yanit = await cagir("/v1/surum?platform=android", { yontem: "GET" });
    const veri = (await yanit.json()) as Yanit;
    expect(veri.sonSurum).toEqual({
      kod: 7,
      ad: "1.0.1-beta.7",
      indirmeAdresi: "https://ornek.test/apk",
      yayin: 1_790_000_007,
    });
  });

  it("geri çekilen (silinen) sürümden sonra bir öncekine düşer", async () => {
    await DB.prepare("DELETE FROM uygulama_surumleri WHERE platform = 'android' AND surum_kodu = 7").run();
    const yanit = await cagir("/v1/surum?platform=android", { yontem: "GET" });
    expect(((await yanit.json()) as Yanit).sonSurum?.kod).toBe(6);
  });

  it("oturum gerektirmez", async () => {
    const yanit = await cagir("/v1/surum?platform=android", { yontem: "GET" });
    expect(yanit.status).toBe(200);
  });

  it("geçersiz ya da eksik platformu reddeder", async () => {
    for (const yol of ["/v1/surum", "/v1/surum?platform=windows", "/v1/surum?platform="]) {
      const yanit = await cagir(yol, { yontem: "GET" });
      expect(yanit.status).toBe(400);
      expect(((await yanit.json()) as { hata: { kod: string } }).hata.kod).toBe("gecersiz_istek");
    }
  });

  it("aynı platform + sürüm kodu iki kez eklenemez", async () => {
    await surumEkle("android", 40, "a");
    await expect(surumEkle("android", 40, "b")).rejects.toThrow();
  });
});
