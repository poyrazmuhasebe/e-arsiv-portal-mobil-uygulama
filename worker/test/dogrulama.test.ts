import { describe, expect, it } from "vitest";
import {
  epostaHatasi,
  epostaNormalize,
  kullaniciAdiHatasi,
  kullaniciAdiNormalize,
  sifreHatasi,
} from "../src/dogrulama";

describe("e-posta", () => {
  it("normalize eder", () => {
    expect(epostaNormalize("  Ali@Ornek.COM ")).toBe("ali@ornek.com");
  });

  it("geçerli adresleri kabul eder", () => {
    for (const adres of ["a@b.co", "ali.veli@ornek.com.tr", "x_y+z@alt.ornek.org"]) {
      expect(epostaHatasi(adres), adres).toBeNull();
    }
  });

  it("bozuk adresleri reddeder", () => {
    for (const adres of ["", "ali", "ali@", "@ornek.com", "ali@ornek", "a b@c.com"]) {
      expect(epostaHatasi(adres), adres).not.toBeNull();
    }
  });
});

describe("uygulama kullanıcı adı", () => {
  it("normalize eder", () => {
    expect(kullaniciAdiNormalize(" AliVeli ")).toBe("aliveli");
  });

  it("geçerli adları kabul eder", () => {
    for (const ad of ["ali", "ali.veli", "ali_veli99", "a1b"]) {
      expect(kullaniciAdiHatasi(ad), ad).toBeNull();
    }
  });

  it("YALNIZCA RAKAMDAN oluşan değerleri reddeder (VKN/TCKN ve GİB kodu koruması)", () => {
    // Bu kuralın tek amacı budur: GİB kullanıcı kodu ve VKN/TCKN gibi
    // yalnızca rakamlı değerlerin Cloudflare'e gitmesini engellemek.
    for (const ad of ["12345678901", "1234567890", "34567890", "000"]) {
      expect(kullaniciAdiHatasi(ad), ad).toMatch(/en az bir harf/);
    }
  });

  it("uzunluk, karakter kümesi ve kenar noktalama kurallarını uygular", () => {
    expect(kullaniciAdiHatasi("ab")).not.toBeNull();
    expect(kullaniciAdiHatasi("a".repeat(21))).not.toBeNull();
    expect(kullaniciAdiHatasi("ali veli")).not.toBeNull();
    expect(kullaniciAdiHatasi("ali-veli")).not.toBeNull();
    expect(kullaniciAdiHatasi("şükrü")).not.toBeNull();
    expect(kullaniciAdiHatasi(".ali")).not.toBeNull();
    expect(kullaniciAdiHatasi("ali_")).not.toBeNull();
  });
});

describe("şifre", () => {
  it("geçerli şifreyi kabul eder", () => {
    expect(sifreHatasi("Kucuk-Kedi-42", "ali@ornek.com", "aliveli")).toBeNull();
  });

  it("kısa, uzun, yaygın ve tek karakterli şifreleri reddeder", () => {
    expect(sifreHatasi("kisa12", "a@b.co", "ali")).not.toBeNull();
    expect(sifreHatasi("a".repeat(129), "a@b.co", "ali")).not.toBeNull();
    expect(sifreHatasi("password123", "a@b.co", "ali")).not.toBeNull();
    expect(sifreHatasi("PASSWORD123", "a@b.co", "ali")).not.toBeNull();
    expect(sifreHatasi("aaaaaaaa", "a@b.co", "ali")).not.toBeNull();
  });

  it("e-posta ya da kullanıcı adıyla aynı şifreyi reddeder", () => {
    expect(sifreHatasi("ali@ornek.com", "ali@ornek.com", "aliveli")).not.toBeNull();
    expect(sifreHatasi("AliVeli1", "ali@ornek.com", "aliveli1")).not.toBeNull();
  });
});
