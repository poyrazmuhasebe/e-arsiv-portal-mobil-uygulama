import { describe, expect, it } from "vitest";
import { SAHTE_KAYIT, sifreDogrula, sifreOzetle } from "../src/sifre";

describe("şifre özeti", () => {
  it("doğru şifreyi doğrular, yanlışı reddeder", async () => {
    const kayit = await sifreOzetle("Kucuk-Kedi-42");
    expect(await sifreDogrula("Kucuk-Kedi-42", kayit)).toBe(true);
    expect(await sifreDogrula("Kucuk-Kedi-43", kayit)).toBe(false);
  });

  it("ŞİFREYİ DÜZ METİN OLARAK SAKLAMAZ", async () => {
    const sifre = "Cok-Gizli-Sifre-99";
    const kayit = await sifreOzetle(sifre);
    expect(kayit).not.toContain(sifre);
    expect(kayit.toLowerCase()).not.toContain(sifre.toLowerCase());
  });

  it("algoritma ve parametrelerini kayıtla birlikte taşır", async () => {
    const kayit = await sifreOzetle("Kucuk-Kedi-42");
    const parcalar = kayit.split("$");
    expect(parcalar).toHaveLength(6);
    expect(parcalar[0]).toBe("scrypt");
    expect(parcalar[1]).toBe("16384");
    expect(parcalar[2]).toBe("8");
    expect(parcalar[3]).toBe("1");
  });

  it("aynı şifre için her seferinde farklı tuz ve farklı özet üretir", async () => {
    const a = await sifreOzetle("Kucuk-Kedi-42");
    const b = await sifreOzetle("Kucuk-Kedi-42");
    expect(a).not.toBe(b);
    expect(await sifreDogrula("Kucuk-Kedi-42", a)).toBe(true);
    expect(await sifreDogrula("Kucuk-Kedi-42", b)).toBe(true);
  });

  it("pepper değişirse doğrulama başarısız olur", async () => {
    const kayit = await sifreOzetle("Kucuk-Kedi-42", "pepper-1");
    expect(await sifreDogrula("Kucuk-Kedi-42", kayit, "pepper-1")).toBe(true);
    expect(await sifreDogrula("Kucuk-Kedi-42", kayit, "pepper-2")).toBe(false);
    expect(await sifreDogrula("Kucuk-Kedi-42", kayit, "")).toBe(false);
  });

  it("bozuk kayıtlarda hata fırlatmaz, false döner", async () => {
    for (const bozuk of ["", "abc", "scrypt$1$1", "pbkdf2$1$1$1$aa$bb", "scrypt$x$8$1$aa$bb"]) {
      expect(await sifreDogrula("Kucuk-Kedi-42", bozuk), bozuk).toBe(false);
    }
  });

  it("veritabanına yazılmış devasa N değeri reddedilir (CPU tüketme koruması)", async () => {
    expect(await sifreDogrula("x", "scrypt$1073741824$8$1$aa$bb")).toBe(false);
  });

  it("sahte kayıt hiçbir şifreyi doğrulamaz ama çökmez", async () => {
    expect(await sifreDogrula("herhangi-bir-sifre", SAHTE_KAYIT)).toBe(false);
  });
});
