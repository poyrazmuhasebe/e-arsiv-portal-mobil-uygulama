/** Uç nokta testleri için küçük yardımcılar. */

import { exports as workerExports } from "cloudflare:workers";

const TABAN = "https://hesap.test";

export interface IstekSecenekleri {
  govde?: unknown;
  token?: string;
  ip?: string;
  kaynak?: string;
  yontem?: string;
  /** JSON yerine ham gövde göndermek için (bozuk istek testleri). */
  hamGovde?: string;
  icerikTipi?: string | null;
}

export async function cagir(
  yol: string,
  secenekler: IstekSecenekleri = {},
): Promise<Response> {
  const basliklar = new Headers();
  const icerikTipi =
    secenekler.icerikTipi === undefined
      ? "application/json"
      : secenekler.icerikTipi;
  if (icerikTipi !== null) basliklar.set("content-type", icerikTipi);
  if (secenekler.token !== undefined) {
    basliklar.set("authorization", `Bearer ${secenekler.token}`);
  }
  basliklar.set("cf-connecting-ip", secenekler.ip ?? benzersizIp());
  if (secenekler.kaynak !== undefined) basliklar.set("origin", secenekler.kaynak);

  const yontem = secenekler.yontem ?? "POST";
  const govde =
    secenekler.hamGovde !== undefined
      ? secenekler.hamGovde
      : secenekler.govde === undefined
        ? undefined
        : JSON.stringify(secenekler.govde);

  return workerExports.default.fetch(
    new Request(`${TABAN}${yol}`, {
      method: yontem,
      headers: basliklar,
      body: yontem === "GET" || yontem === "OPTIONS" ? undefined : (govde ?? "{}"),
    }),
  );
}

let sayac = 0;

/** Her istek farklı bir IP'den gelsin: oran sınırları testleri etkilemesin. */
export function benzersizIp(): string {
  sayac += 1;
  return `203.0.113.${sayac % 250}:${sayac}`;
}

export function benzersizEposta(): string {
  sayac += 1;
  return `kullanici${sayac}.${Date.now()}@ornek.test`;
}

export function benzersizKullaniciAdi(): string {
  sayac += 1;
  return `kul${sayac}x${Date.now() % 100000}`;
}

export interface KayitSonucu {
  eposta: string;
  kullaniciAdi: string;
  sifre: string;
  kullaniciId: string;
  erisimToken: string;
  yenilemeToken: string;
  kod: string;
}

export async function hesapAc(
  ustuneYaz: { eposta?: string; kullaniciAdi?: string; sifre?: string } = {},
): Promise<KayitSonucu> {
  const eposta = ustuneYaz.eposta ?? benzersizEposta();
  const kullaniciAdi = ustuneYaz.kullaniciAdi ?? benzersizKullaniciAdi();
  const sifre = ustuneYaz.sifre ?? "Kucuk-Kedi-42";

  const yanit = await cagir("/v1/kayit", {
    govde: { eposta, kullaniciAdi, sifre },
  });
  if (yanit.status !== 201) {
    throw new Error(`kayıt başarısız: ${yanit.status} ${await yanit.text()}`);
  }
  const veri = (await yanit.json()) as {
    kullanici: { id: string };
    oturum: { erisimToken: string; yenilemeToken: string };
    gelistirmeKodu: string;
  };
  return {
    eposta,
    kullaniciAdi,
    sifre,
    kullaniciId: veri.kullanici.id,
    erisimToken: veri.oturum.erisimToken,
    yenilemeToken: veri.oturum.yenilemeToken,
    kod: veri.gelistirmeKodu,
  };
}

/** Hesabı açıp e-postasını doğrular. */
export async function dogrulanmisHesap(): Promise<KayitSonucu> {
  const hesap = await hesapAc();
  const yanit = await cagir("/v1/eposta/dogrula", {
    govde: { kod: hesap.kod },
    token: hesap.erisimToken,
  });
  if (yanit.status !== 200) {
    throw new Error(`doğrulama başarısız: ${yanit.status}`);
  }
  return hesap;
}
