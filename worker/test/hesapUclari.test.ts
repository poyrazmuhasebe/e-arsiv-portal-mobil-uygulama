/** Kayıt, giriş, oturum, e-posta doğrulama ve şifre sıfırlama uçları. */

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  benzersizEposta,
  benzersizIp,
  benzersizKullaniciAdi,
  cagir,
  dogrulanmisHesap,
  hesapAc,
} from "./yardimci";

const DB = (env as unknown as { DB: D1Database }).DB;
const ORTAM = env as unknown as Record<string, unknown>;

async function govde<T>(yanit: Response): Promise<T> {
  expect(yanit.headers.get("content-type")).toContain("application/json");
  return (await yanit.json()) as T;
}

describe("kayıt", () => {
  it("hesap açar ve oturum döndürür", async () => {
    const hesap = await hesapAc();
    expect(hesap.kullaniciId).toMatch(/^[0-9a-f-]{36}$/);
    expect(hesap.erisimToken.split(".")).toHaveLength(3);
    expect(hesap.yenilemeToken.length).toBeGreaterThan(20);
  });

  it("şifreyi düz metin saklamaz, scrypt özeti yazar", async () => {
    const hesap = await hesapAc({ sifre: "Cok-Gizli-Sifre-99" });
    const satir = await DB.prepare(
      "SELECT sifre_ozeti, eposta_dogrulandi FROM kullanicilar WHERE id = ?1",
    )
      .bind(hesap.kullaniciId)
      .first<{ sifre_ozeti: string; eposta_dogrulandi: number }>();
    expect(satir?.sifre_ozeti).not.toContain("Cok-Gizli-Sifre-99");
    expect(satir?.sifre_ozeti.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(satir?.eposta_dogrulandi).toBe(0);
  });

  it("doğrulama kodunu düz metin saklamaz", async () => {
    const hesap = await hesapAc();
    const satir = await DB.prepare(
      "SELECT kod_ozeti FROM tek_kullanimlik_kodlar WHERE kullanici_id = ?1",
    )
      .bind(hesap.kullaniciId)
      .first<{ kod_ozeti: string }>();
    expect(satir?.kod_ozeti).not.toBe(hesap.kod);
    expect(satir?.kod_ozeti).not.toContain(hesap.kod);
  });

  it("aynı e-postayla ikinci kayıt reddedilir", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/kayit", {
      govde: {
        eposta: hesap.eposta.toUpperCase(),
        kullaniciAdi: benzersizKullaniciAdi(),
        sifre: "Kucuk-Kedi-42",
      },
    });
    expect(yanit.status).toBe(409);
    expect((await govde<{ hata: { kod: string } }>(yanit)).hata.kod).toBe(
      "eposta_kullanimda",
    );
  });

  it("aynı kullanıcı adıyla ikinci kayıt reddedilir", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/kayit", {
      govde: {
        eposta: benzersizEposta(),
        kullaniciAdi: hesap.kullaniciAdi.toUpperCase(),
        sifre: "Kucuk-Kedi-42",
      },
    });
    expect(yanit.status).toBe(409);
    expect((await govde<{ hata: { kod: string } }>(yanit)).hata.kod).toBe(
      "kullanici_adi_kullanimda",
    );
  });

  it("zayıf şifre reddedilir ve hesap oluşmaz", async () => {
    const eposta = benzersizEposta();
    const yanit = await cagir("/v1/kayit", {
      govde: { eposta, kullaniciAdi: benzersizKullaniciAdi(), sifre: "password123" },
    });
    expect(yanit.status).toBe(400);
    const satir = await DB.prepare("SELECT id FROM kullanicilar WHERE eposta = ?1")
      .bind(eposta)
      .first();
    expect(satir).toBeNull();
  });

  it("eksik alan reddedilir", async () => {
    const yanit = await cagir("/v1/kayit", { govde: { eposta: benzersizEposta() } });
    expect(yanit.status).toBe(400);
  });
});

describe("giriş", () => {
  it("doğru şifreyle oturum açar", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/giris", {
      govde: { eposta: hesap.eposta, sifre: hesap.sifre },
    });
    expect(yanit.status).toBe(200);
    const veri = await govde<{ kullanici: { id: string } }>(yanit);
    expect(veri.kullanici.id).toBe(hesap.kullaniciId);
  });

  it("yanlış şifre ve olmayan e-posta AYNI yanıtı verir (enumeration koruması)", async () => {
    const hesap = await hesapAc();

    const yanlisSifre = await cagir("/v1/giris", {
      govde: { eposta: hesap.eposta, sifre: "Baska-Bir-Sifre-77" },
    });
    const olmayanHesap = await cagir("/v1/giris", {
      govde: { eposta: benzersizEposta(), sifre: "Baska-Bir-Sifre-77" },
    });

    expect(yanlisSifre.status).toBe(401);
    expect(olmayanHesap.status).toBe(401);
    expect(await yanlisSifre.text()).toBe(await olmayanHesap.text());
  });

  it("büyük harfli ve boşluklu e-posta ile de giriş yapılır", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/giris", {
      govde: { eposta: `  ${hesap.eposta.toUpperCase()} `, sifre: hesap.sifre },
    });
    expect(yanit.status).toBe(200);
  });
});

describe("oturum", () => {
  it("yenileme token'ı döndürülür ve eskisi bir daha geçmez (rotasyon)", async () => {
    const hesap = await hesapAc();

    const ilk = await cagir("/v1/oturum/yenile", {
      govde: { yenilemeToken: hesap.yenilemeToken },
    });
    expect(ilk.status).toBe(200);
    const veri = await govde<{ oturum: { yenilemeToken: string } }>(ilk);
    expect(veri.oturum.yenilemeToken).not.toBe(hesap.yenilemeToken);

    const tekrar = await cagir("/v1/oturum/yenile", {
      govde: { yenilemeToken: hesap.yenilemeToken },
    });
    expect(tekrar.status).toBe(401);
  });

  it("geçersiz yenileme token'ı 401 döner", async () => {
    const yanit = await cagir("/v1/oturum/yenile", {
      govde: { yenilemeToken: "uydurma-token" },
    });
    expect(yanit.status).toBe(401);
  });

  it("çıkış yenileme token'ını iptal eder", async () => {
    const hesap = await hesapAc();
    const cikis = await cagir("/v1/cikis", {
      govde: { yenilemeToken: hesap.yenilemeToken },
    });
    expect(cikis.status).toBe(200);

    const yenile = await cagir("/v1/oturum/yenile", {
      govde: { yenilemeToken: hesap.yenilemeToken },
    });
    expect(yenile.status).toBe(401);
  });

  it("çıkış geçersiz token'da da başarı döner", async () => {
    const yanit = await cagir("/v1/cikis", { govde: { yenilemeToken: "yok" } });
    expect(yanit.status).toBe(200);
  });

  it("korumalı uç token'sız ve bozuk token'la 401 döner", async () => {
    expect((await cagir("/v1/eposta/kod-gonder", {})).status).toBe(401);
    expect(
      (await cagir("/v1/eposta/kod-gonder", { token: "bozuk.token.degeri" })).status,
    ).toBe(401);
  });
});

describe("e-posta doğrulama", () => {
  it("doğru kodla doğrulanır", async () => {
    const hesap = await hesapAc();
    const yanit = await cagir("/v1/eposta/dogrula", {
      govde: { kod: hesap.kod },
      token: hesap.erisimToken,
    });
    expect(yanit.status).toBe(200);

    const satir = await DB.prepare(
      "SELECT eposta_dogrulandi FROM kullanicilar WHERE id = ?1",
    )
      .bind(hesap.kullaniciId)
      .first<{ eposta_dogrulandi: number }>();
    expect(satir?.eposta_dogrulandi).toBe(1);
  });

  it("yanlış kod reddedilir ve hesap doğrulanmamış kalır", async () => {
    const hesap = await hesapAc();
    const yanlis = hesap.kod === "000000" ? "111111" : "000000";
    const yanit = await cagir("/v1/eposta/dogrula", {
      govde: { kod: yanlis },
      token: hesap.erisimToken,
    });
    expect(yanit.status).toBe(400);
    const satir = await DB.prepare(
      "SELECT eposta_dogrulandi FROM kullanicilar WHERE id = ?1",
    )
      .bind(hesap.kullaniciId)
      .first<{ eposta_dogrulandi: number }>();
    expect(satir?.eposta_dogrulandi).toBe(0);
  });

  it("kod TEK KULLANIMLIK: ikinci kez geçmez", async () => {
    const hesap = await dogrulanmisHesap();
    // Doğrulama bayrağını geri alıp AYNI kodu tekrar deniyoruz: kod tüketildiği
    // için bir daha geçmemeli.
    await DB.prepare("UPDATE kullanicilar SET eposta_dogrulandi = 0 WHERE id = ?1")
      .bind(hesap.kullaniciId)
      .run();
    const yanit = await cagir("/v1/eposta/dogrula", {
      govde: { kod: hesap.kod },
      token: hesap.erisimToken,
    });
    expect(yanit.status).toBe(400);
  });

  it("5 yanlış denemeden sonra doğru kod da geçmez", async () => {
    const hesap = await hesapAc();
    const yanlis = hesap.kod === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      await cagir("/v1/eposta/dogrula", {
        govde: { kod: yanlis },
        token: hesap.erisimToken,
      });
    }
    const yanit = await cagir("/v1/eposta/dogrula", {
      govde: { kod: hesap.kod },
      token: hesap.erisimToken,
    });
    expect(yanit.status).toBe(400);
  });

  it("yeni kod istenince eskisi geçersizleşir", async () => {
    const hesap = await hesapAc();
    const gonder = await cagir("/v1/eposta/kod-gonder", { token: hesap.erisimToken });
    expect(gonder.status).toBe(200);
    const yeniKod = (await govde<{ gelistirmeKodu: string }>(gonder)).gelistirmeKodu;

    const eskiyle = await cagir("/v1/eposta/dogrula", {
      govde: { kod: hesap.kod },
      token: hesap.erisimToken,
    });
    expect(eskiyle.status).toBe(400);

    const yeniyle = await cagir("/v1/eposta/dogrula", {
      govde: { kod: yeniKod },
      token: hesap.erisimToken,
    });
    expect(yeniyle.status).toBe(200);
  });

  it("doğrulanmış hesapta kod-gönder yeniden kod üretmez", async () => {
    const hesap = await dogrulanmisHesap();
    const yanit = await cagir("/v1/eposta/kod-gonder", { token: hesap.erisimToken });
    expect(yanit.status).toBe(200);
    const veri = await govde<{ zatenDogrulandi?: boolean; gelistirmeKodu?: string }>(
      yanit,
    );
    expect(veri.zatenDogrulandi).toBe(true);
    expect(veri.gelistirmeKodu).toBeUndefined();
  });
});

describe("şifre sıfırlama", () => {
  it("olmayan e-posta için de aynı başarı yanıtı döner", async () => {
    const yanit = await cagir("/v1/sifre/sifirlama-baslat", {
      govde: { eposta: benzersizEposta() },
    });
    expect(yanit.status).toBe(200);
    const veri = await govde<{ tamam: boolean; gelistirmeKodu?: string }>(yanit);
    expect(veri.tamam).toBe(true);
    expect(veri.gelistirmeKodu).toBeUndefined();
  });

  it("doğru kodla şifre değişir, eski şifre geçmez", async () => {
    const hesap = await hesapAc();
    const baslat = await cagir("/v1/sifre/sifirlama-baslat", {
      govde: { eposta: hesap.eposta },
    });
    const kod = (await govde<{ gelistirmeKodu: string }>(baslat)).gelistirmeKodu;

    const tamamla = await cagir("/v1/sifre/sifirlama-tamamla", {
      govde: { eposta: hesap.eposta, kod, yeniSifre: "Yeni-Guclu-Sifre-77" },
    });
    expect(tamamla.status).toBe(200);

    const eskiyle = await cagir("/v1/giris", {
      govde: { eposta: hesap.eposta, sifre: hesap.sifre },
    });
    expect(eskiyle.status).toBe(401);

    const yeniyle = await cagir("/v1/giris", {
      govde: { eposta: hesap.eposta, sifre: "Yeni-Guclu-Sifre-77" },
    });
    expect(yeniyle.status).toBe(200);
  });

  it("şifre sıfırlama MEVCUT TÜM OTURUMLARI düşürür", async () => {
    const hesap = await hesapAc();
    const baslat = await cagir("/v1/sifre/sifirlama-baslat", {
      govde: { eposta: hesap.eposta },
    });
    const kod = (await govde<{ gelistirmeKodu: string }>(baslat)).gelistirmeKodu;

    await cagir("/v1/sifre/sifirlama-tamamla", {
      govde: { eposta: hesap.eposta, kod, yeniSifre: "Yeni-Guclu-Sifre-77" },
    });

    const yenile = await cagir("/v1/oturum/yenile", {
      govde: { yenilemeToken: hesap.yenilemeToken },
    });
    expect(yenile.status).toBe(401);
  });

  it("yanlış kodla şifre değişmez", async () => {
    const hesap = await hesapAc();
    const baslat = await cagir("/v1/sifre/sifirlama-baslat", {
      govde: { eposta: hesap.eposta },
    });
    const kod = (await govde<{ gelistirmeKodu: string }>(baslat)).gelistirmeKodu;
    const yanlis = kod === "000000" ? "111111" : "000000";

    const tamamla = await cagir("/v1/sifre/sifirlama-tamamla", {
      govde: { eposta: hesap.eposta, kod: yanlis, yeniSifre: "Yeni-Guclu-Sifre-77" },
    });
    expect(tamamla.status).toBe(400);

    const eskiyle = await cagir("/v1/giris", {
      govde: { eposta: hesap.eposta, sifre: hesap.sifre },
    });
    expect(eskiyle.status).toBe(200);
  });

  it("zayıf yeni şifre reddedilir", async () => {
    const hesap = await hesapAc();
    const baslat = await cagir("/v1/sifre/sifirlama-baslat", {
      govde: { eposta: hesap.eposta },
    });
    const kod = (await govde<{ gelistirmeKodu: string }>(baslat)).gelistirmeKodu;

    const tamamla = await cagir("/v1/sifre/sifirlama-tamamla", {
      govde: { eposta: hesap.eposta, kod, yeniSifre: "12345678" },
    });
    expect(tamamla.status).toBe(400);
  });
});

describe("oran sınırlama", () => {
  it("aynı IP'den 6. kayıt denemesi 429 döner", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 250)}:${Date.now()}`;
    const durumlar: number[] = [];
    for (let i = 0; i < 6; i++) {
      const yanit = await cagir("/v1/kayit", {
        ip,
        govde: {
          eposta: benzersizEposta(),
          kullaniciAdi: benzersizKullaniciAdi(),
          sifre: "Kucuk-Kedi-42",
        },
      });
      durumlar.push(yanit.status);
    }
    expect(durumlar.slice(0, 5).every((d) => d === 201)).toBe(true);
    expect(durumlar[5]).toBe(429);
  });

  it("aynı hesaba farklı IP'lerden çok sayıda yanlış girişten sonra 429 döner", async () => {
    const hesap = await hesapAc();
    let sonDurum = 0;
    for (let i = 0; i < 10; i++) {
      const yanit = await cagir("/v1/giris", {
        ip: benzersizIp(),
        govde: { eposta: hesap.eposta, sifre: "Yanlis-Sifre-11" },
      });
      sonDurum = yanit.status;
    }
    expect(sonDurum).toBe(429);
  });
});

describe("yanıt biçimi ve CORS", () => {
  it("bilinmeyen yol JSON 404 döner, HTML değil", async () => {
    const yanit = await cagir("/olmayan-yol", { yontem: "GET" });
    expect(yanit.status).toBe(404);
    expect(yanit.headers.get("content-type")).toContain("application/json");
    expect(await yanit.text()).not.toContain("<");
  });

  it("sağlık ucu çalışır ve hiçbir yapılandırma sızdırmaz", async () => {
    const yanit = await cagir("/v1/saglik", { yontem: "GET" });
    expect(yanit.status).toBe(200);
    expect(await yanit.text()).toBe('{"tamam":true}');
  });

  it("JSON olmayan içerik tipi reddedilir", async () => {
    const yanit = await cagir("/v1/giris", {
      icerikTipi: "text/plain",
      hamGovde: "eposta=a@b.co",
    });
    expect(yanit.status).toBe(415);
  });

  it("bozuk JSON reddedilir", async () => {
    const yanit = await cagir("/v1/giris", { hamGovde: "{bozuk" });
    expect(yanit.status).toBe(400);
  });

  it("dizi gövde reddedilir", async () => {
    const yanit = await cagir("/v1/giris", { govde: ["a", "b"] });
    expect(yanit.status).toBe(400);
  });

  it("çok büyük gövde reddedilir", async () => {
    const yanit = await cagir("/v1/giris", {
      govde: { eposta: "a@b.co", sifre: "x".repeat(5000) },
    });
    expect(yanit.status).toBe(413);
  });

  it("izinli kaynağa CORS başlığı döner, izinsize dönmez", async () => {
    const izinli = await cagir("/v1/saglik", {
      yontem: "GET",
      kaynak: "http://localhost:8081",
    });
    expect(izinli.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:8081",
    );

    const izinsiz = await cagir("/v1/saglik", {
      yontem: "GET",
      kaynak: "https://kotu-site.example",
    });
    expect(izinsiz.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("CORS başlığı hiçbir koşulda wildcard olmaz", async () => {
    for (const kaynak of ["http://localhost:8081", "https://kotu-site.example"]) {
      const yanit = await cagir("/v1/saglik", { yontem: "GET", kaynak });
      expect(yanit.headers.get("access-control-allow-origin")).not.toBe("*");
    }
  });

  it("yanıtlar önbelleğe alınmaz", async () => {
    const yanit = await cagir("/v1/saglik", { yontem: "GET" });
    expect(yanit.headers.get("cache-control")).toBe("no-store");
  });
});

describe("geliştirme modu", () => {
  it("GELISTIRME kapalıyken doğrulama kodu yanıta EKLENMEZ", async () => {
    // Üretimde bu değişken YOKTUR: `wrangler.jsonc`'deki `vars` bloğunda
    // bilerek tanımlı değil ve yalnızca git dışı `.dev.vars`'tan gelir.
    // Bu test, kodun yanlışlıkla üretim yanıtına sızmadığını doğrular.
    const onceki = ORTAM.GELISTIRME;
    ORTAM.GELISTIRME = undefined;
    try {
      const yanit = await cagir("/v1/kayit", {
        govde: {
          eposta: benzersizEposta(),
          kullaniciAdi: benzersizKullaniciAdi(),
          sifre: "Kucuk-Kedi-42",
        },
      });
      expect(yanit.status).toBe(201);
      const metin = await yanit.text();
      expect(metin).not.toContain("gelistirmeKodu");
    } finally {
      ORTAM.GELISTIRME = onceki;
    }
  });

  it("posta yapılandırılmamışsa kayıt 503 ile başarısız olur, sessizce geçmez", async () => {
    const oncekiGelistirme = ORTAM.GELISTIRME;
    const oncekiGonderen = ORTAM.POSTA_GONDEREN;
    ORTAM.GELISTIRME = undefined;
    ORTAM.POSTA_GONDEREN = "";
    try {
      const yanit = await cagir("/v1/kayit", {
        govde: {
          eposta: benzersizEposta(),
          kullaniciAdi: benzersizKullaniciAdi(),
          sifre: "Kucuk-Kedi-42",
        },
      });
      expect(yanit.status).toBe(503);
      expect(await yanit.text()).toContain("posta_yapilandirilmamis");
    } finally {
      ORTAM.GELISTIRME = oncekiGelistirme;
      ORTAM.POSTA_GONDEREN = oncekiGonderen;
    }
  });
});

describe("yapılandırma", () => {
  it("imza anahtarı yoksa istek 500 ile reddedilir, çökmez", async () => {
    const onceki = ORTAM.OTURUM_IMZA_ANAHTARI;
    ORTAM.OTURUM_IMZA_ANAHTARI = "";
    try {
      const yanit = await cagir("/v1/saglik", { yontem: "GET" });
      expect(yanit.status).toBe(500);
      expect((await govde<{ hata: { kod: string } }>(yanit)).hata.kod).toBe(
        "yapilandirma_eksik",
      );
    } finally {
      ORTAM.OTURUM_IMZA_ANAHTARI = onceki;
    }
  });
});
