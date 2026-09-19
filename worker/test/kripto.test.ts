import { describe, expect, it } from "vitest";
import {
  rastgeleBase64Url,
  rastgeleSayisalKod,
  sabitZamanliEsit,
  sha256Base64Url,
  tokenDogrula,
  tokenUret,
} from "../src/kripto";

const ANAHTAR = "test-imza-anahtari";
const SIMDI = 1_800_000_000;

describe("sabitZamanliEsit", () => {
  it("aynı dizgilerde true, farklılarda false döner", () => {
    expect(sabitZamanliEsit("abc", "abc")).toBe(true);
    expect(sabitZamanliEsit("abc", "abd")).toBe(false);
    expect(sabitZamanliEsit("abc", "abcd")).toBe(false);
    expect(sabitZamanliEsit("", "")).toBe(true);
    expect(sabitZamanliEsit("", "a")).toBe(false);
  });
});

describe("rastgele değerler", () => {
  it("her çağrıda farklı token üretir", () => {
    const kume = new Set(Array.from({ length: 50 }, () => rastgeleBase64Url(32)));
    expect(kume.size).toBe(50);
  });

  it("kod her zaman 6 hane ve yalnızca rakam", () => {
    for (let i = 0; i < 200; i++) {
      const kod = rastgeleSayisalKod(6);
      expect(kod).toMatch(/^[0-9]{6}$/);
    }
  });
});

describe("erişim token'ı", () => {
  it("üretilen token doğrulanır", async () => {
    const token = await tokenUret(
      { sub: "kullanici-1", iat: SIMDI, exp: SIMDI + 3600, tur: "erisim" },
      ANAHTAR,
    );
    const yuk = await tokenDogrula(token, ANAHTAR, SIMDI);
    expect(yuk?.sub).toBe("kullanici-1");
  });

  it("YANLIŞ ANAHTARLA imzalanmış token reddedilir", async () => {
    const token = await tokenUret(
      { sub: "kullanici-1", iat: SIMDI, exp: SIMDI + 3600, tur: "erisim" },
      "baska-anahtar",
    );
    expect(await tokenDogrula(token, ANAHTAR, SIMDI)).toBeNull();
  });

  it("gövdesi değiştirilmiş token reddedilir", async () => {
    const token = await tokenUret(
      { sub: "kullanici-1", iat: SIMDI, exp: SIMDI + 3600, tur: "erisim" },
      ANAHTAR,
    );
    const [baslik, , imza] = token.split(".") as [string, string, string];
    const sahteGovde = Buffer.from(
      JSON.stringify({ sub: "baskasi", iat: SIMDI, exp: SIMDI + 3600, tur: "erisim" }),
    ).toString("base64url");
    expect(await tokenDogrula(`${baslik}.${sahteGovde}.${imza}`, ANAHTAR, SIMDI)).toBeNull();
  });

  it("süresi dolmuş token reddedilir", async () => {
    const token = await tokenUret(
      { sub: "kullanici-1", iat: SIMDI - 7200, exp: SIMDI - 1, tur: "erisim" },
      ANAHTAR,
    );
    expect(await tokenDogrula(token, ANAHTAR, SIMDI)).toBeNull();
  });

  it("bozuk biçimli token reddedilir", async () => {
    for (const bozuk of ["", "a", "a.b", "a.b.c.d", "....."]) {
      expect(await tokenDogrula(bozuk, ANAHTAR, SIMDI)).toBeNull();
    }
  });
});

describe("sha256Base64Url", () => {
  it("aynı girdi için aynı, farklı girdi için farklı özet üretir", async () => {
    expect(await sha256Base64Url("abc")).toBe(await sha256Base64Url("abc"));
    expect(await sha256Base64Url("abc")).not.toBe(await sha256Base64Url("abd"));
  });
});
