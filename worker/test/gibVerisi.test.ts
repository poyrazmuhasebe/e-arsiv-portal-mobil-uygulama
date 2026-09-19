/**
 * EN ÖNEMLİ TEST DOSYASI.
 *
 * Projenin temel kuralı: GİB verisi hiçbir koşulda Worker'a kabul edilmez ve
 * D1'e yazılmaz. Burası o kuralın sunucu tarafındaki bekçisini sınar.
 */

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { benzersizEposta, benzersizKullaniciAdi, cagir, hesapAc } from "./yardimci";

const DB = (env as unknown as { DB: D1Database }).DB;

/** Uygulamada bir hata olsa gövdeye sızabilecek GİB alanları. */
const GIB_ALANLARI: Record<string, unknown> = {
  gibToken: "sahte-gib-token",
  gibKullaniciKodu: "34567890",
  kullaniciBilgisi: { unvan: "Örnek Ltd", vkn: "1234567890" },
  vkn: "1234567890",
  tckn: "12345678901",
  vergiDairesi: "Kadıköy",
  faturalar: [{ belgeNo: "EAR2026000000001" }],
  aliciDefteri: [{ unvan: "Örnek Alıcı" }],
  malHizmetDefteri: ["Danışmanlık"],
  token: "sahte-token",
};

describe("GİB verisi Worker'a kabul edilmez", () => {
  it("kayıt ucu her GİB alanını tek tek reddeder", async () => {
    for (const [alan, deger] of Object.entries(GIB_ALANLARI)) {
      const yanit = await cagir("/v1/kayit", {
        govde: {
          eposta: benzersizEposta(),
          kullaniciAdi: benzersizKullaniciAdi(),
          sifre: "Kucuk-Kedi-42",
          [alan]: deger,
        },
      });
      expect(yanit.status, alan).toBe(400);
      const veri = (await yanit.json()) as { hata: { kod: string } };
      expect(veri.hata.kod, alan).toBe("bilinmeyen_alan");
    }
  });

  it("giriş ucu da bilinmeyen alanı reddeder", async () => {
    const yanit = await cagir("/v1/giris", {
      govde: { eposta: "a@b.co", sifre: "Kucuk-Kedi-42", gibToken: "x" },
    });
    expect(yanit.status).toBe(400);
  });

  it("reddedilen istekten sonra veritabanında hiçbir kullanıcı oluşmaz", async () => {
    const eposta = benzersizEposta();
    await cagir("/v1/kayit", {
      govde: {
        eposta,
        kullaniciAdi: benzersizKullaniciAdi(),
        sifre: "Kucuk-Kedi-42",
        gibToken: "sahte",
      },
    });
    const satir = await DB.prepare("SELECT id FROM kullanicilar WHERE eposta = ?1")
      .bind(eposta)
      .first();
    expect(satir).toBeNull();
  });

  it("veritabanı şemasında GİB'e ait hiçbir sütun yok", async () => {
    const tablolar = await DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'",
    ).all<{ name: string }>();

    expect(tablolar.results.map((t) => t.name).sort()).toEqual([
      "kimlik_saglayicilar",
      "kullanicilar",
      "oran_sinir",
      "oturumlar",
      "tek_kullanimlik_kodlar",
    ]);

    const yasakli = /gib|vkn|tckn|fatura|alici|malhizmet|unvan|vergi|token(?!_)/i;
    for (const tablo of tablolar.results) {
      const sutunlar = await DB.prepare(`PRAGMA table_info(${tablo.name})`).all<{
        name: string;
      }>();
      for (const sutun of sutunlar.results) {
        expect(
          yasakli.test(sutun.name),
          `${tablo.name}.${sutun.name} yasaklı bir ad taşıyor`,
        ).toBe(false);
      }
    }
  });

  it("kullanıcı adı yalnızca rakamdan oluşamaz: VKN/TCKN ve GİB kodu yazılamaz", async () => {
    for (const ad of ["12345678901", "34567890"]) {
      const yanit = await cagir("/v1/kayit", {
        govde: { eposta: benzersizEposta(), kullaniciAdi: ad, sifre: "Kucuk-Kedi-42" },
      });
      expect(yanit.status, ad).toBe(400);
    }
  });

  it("oran sınırı tablosuna e-posta ve IP düz metin yazılmaz", async () => {
    const hesap = await hesapAc();
    const satirlar = await DB.prepare("SELECT anahtar FROM oran_sinir").all<{
      anahtar: string;
    }>();
    expect(satirlar.results.length).toBeGreaterThan(0);
    for (const satir of satirlar.results) {
      expect(satir.anahtar).not.toContain(hesap.eposta);
      expect(satir.anahtar).not.toContain("203.0.113");
    }
  });
});
