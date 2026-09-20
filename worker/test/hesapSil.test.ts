/** Hesap silme: uygulama içi uç ve herkese açık web sayfası. */

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { cagir, dogrulanmisHesap, hesapAc } from "./yardimci";

const DB = (env as unknown as { DB: D1Database }).DB;

async function kullaniciVarMi(kullaniciId: string): Promise<boolean> {
  const satir = await DB.prepare("SELECT id FROM kullanicilar WHERE id = ?1")
    .bind(kullaniciId)
    .first();
  return satir !== null;
}

describe("DELETE /v1/hesap", () => {
  it("doğru şifreyle hesabı ve tüm izlerini siler", async () => {
    const hesap = await dogrulanmisHesap();
    expect(await kullaniciVarMi(hesap.kullaniciId)).toBe(true);

    const yanit = await cagir("/v1/hesap", {
      yontem: "DELETE",
      govde: { sifre: hesap.sifre },
      token: hesap.erisimToken,
    });
    expect(yanit.status).toBe(200);

    expect(await kullaniciVarMi(hesap.kullaniciId)).toBe(false);

    for (const tablo of ["oturumlar", "tek_kullanimlik_kodlar", "kimlik_saglayicilar"]) {
      const kalan = await DB.prepare(
        `SELECT COUNT(*) AS n FROM ${tablo} WHERE kullanici_id = ?1`,
      )
        .bind(hesap.kullaniciId)
        .first<{ n: number }>();
      expect(kalan?.n, tablo).toBe(0);
    }
  });

  it("yanlış şifreyle silmez", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/hesap", {
      yontem: "DELETE",
      govde: { sifre: "Baska-Bir-Sifre-77" },
      token: hesap.erisimToken,
    });
    expect(yanit.status).toBe(401);
    expect(await kullaniciVarMi(hesap.kullaniciId)).toBe(true);
  });

  it("oturum olmadan silinemez", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/hesap", {
      yontem: "DELETE",
      govde: { sifre: hesap.sifre },
    });
    expect(yanit.status).toBe(401);
    expect(await kullaniciVarMi(hesap.kullaniciId)).toBe(true);
  });

  it("silinen hesabın token'ı artık geçmez", async () => {
    const hesap = await dogrulanmisHesap();
    await cagir("/v1/hesap", {
      yontem: "DELETE",
      govde: { sifre: hesap.sifre },
      token: hesap.erisimToken,
    });

    const sonra = await cagir("/v1/eposta/kod-gonder", { token: hesap.erisimToken });
    expect(sonra.status).toBe(401);

    const yenile = await cagir("/v1/oturum/yenile", {
      govde: { yenilemeToken: hesap.yenilemeToken },
    });
    expect(yenile.status).toBe(401);
  });

  it("silinen e-postayla yeniden kayıt olunabilir", async () => {
    const hesap = await dogrulanmisHesap();
    await cagir("/v1/hesap", {
      yontem: "DELETE",
      govde: { sifre: hesap.sifre },
      token: hesap.erisimToken,
    });

    const yeniden = await cagir("/v1/kayit", {
      govde: {
        eposta: hesap.eposta,
        kullaniciAdi: hesap.kullaniciAdi,
        sifre: "Yeni-Guclu-Sifre-77",
      },
    });
    expect(yeniden.status).toBe(201);
  });

  it("bilinmeyen alan reddedilir", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/hesap", {
      yontem: "DELETE",
      govde: { sifre: hesap.sifre, gibToken: "x" },
      token: hesap.erisimToken,
    });
    expect(yanit.status).toBe(400);
    expect(await kullaniciVarMi(hesap.kullaniciId)).toBe(true);
  });
});

describe("herkese açık /hesap-sil sayfası", () => {
  it("oturum gerektirmeden HTML form döner", async () => {
    const yanit = await cagir("/hesap-sil", { yontem: "GET" });
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("content-type")).toContain("text/html");
    const html = await yanit.text();
    expect(html).toContain("<form");
    expect(html).toContain("geri alınamaz");
    // Telefondaki verinin silinmediği açıkça söylenmeli.
    expect(html).toContain("etkilenmez");
    // Hiçbir dış kaynak yüklenmemeli.
    expect(yanit.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(html).not.toContain("http://");
  });

  it("doğru e-posta ve şifreyle hesabı siler", async () => {
    const hesap = await dogrulanmisHesap();
    const yanit = await cagir("/hesap-sil", {
      icerikTipi: "application/x-www-form-urlencoded",
      hamGovde: `eposta=${encodeURIComponent(hesap.eposta)}&sifre=${encodeURIComponent(hesap.sifre)}`,
    });
    expect(yanit.status).toBe(200);
    expect(await yanit.text()).toContain("silindi");
    expect(await kullaniciVarMi(hesap.kullaniciId)).toBe(false);
  });

  it("yanlış şifrede silmez ve kullanıcının varlığını sızdırmaz", async () => {
    const hesap = await hesapAc();

    const yanlisSifre = await cagir("/hesap-sil", {
      icerikTipi: "application/x-www-form-urlencoded",
      hamGovde: `eposta=${encodeURIComponent(hesap.eposta)}&sifre=Yanlis-Sifre-11`,
    });
    const olmayanHesap = await cagir("/hesap-sil", {
      icerikTipi: "application/x-www-form-urlencoded",
      hamGovde: "eposta=yok" + Date.now() + "@ornek.test&sifre=Yanlis-Sifre-11",
    });

    expect(await yanlisSifre.text()).toBe(await olmayanHesap.text());
    expect(await kullaniciVarMi(hesap.kullaniciId)).toBe(true);
  });

  it("e-posta alanı HTML'e kaçışlanarak yazılır", async () => {
    // Silme başarılıysa e-posta sayfada gösteriliyor; XSS'e kapalı olmalı.
    const hesap = await dogrulanmisHesap();
    const yanit = await cagir("/hesap-sil", {
      icerikTipi: "application/x-www-form-urlencoded",
      hamGovde: `eposta=${encodeURIComponent(hesap.eposta)}&sifre=${encodeURIComponent(hesap.sifre)}`,
    });
    const html = await yanit.text();
    expect(html).not.toContain("<script");
    expect(html).toContain(hesap.eposta);
  });
});
