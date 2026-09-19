/** Uç noktaların paylaştığı yanıt biçimleri ve yardımcılar. */

import type { OturumYaniti } from "../oturum";
import { gelistirmeModu, type KullaniciSatiri, type Ortam } from "../turler";
import { IstekHatasi } from "../yanit";

export interface HesapYaniti {
  kullanici: {
    id: string;
    eposta: string;
    kullaniciAdi: string;
    epostaDogrulandi: boolean;
  };
  oturum: {
    erisimToken: string;
    erisimBitis: number;
    yenilemeToken: string;
    yenilemeBitis: number;
  };
  /** YALNIZCA yerel geliştirmede (GELISTIRME="1") bulunur. */
  gelistirmeKodu?: string;
}

export function hesapYaniti(
  kullanici: KullaniciSatiri,
  oturum: OturumYaniti,
): HesapYaniti {
  return {
    kullanici: {
      id: kullanici.id,
      eposta: kullanici.eposta,
      kullaniciAdi: kullanici.kullanici_adi,
      epostaDogrulandi: kullanici.eposta_dogrulandi === 1,
    },
    oturum: {
      erisimToken: oturum.erisimToken,
      erisimBitis: oturum.erisimBitis,
      yenilemeToken: oturum.yenilemeToken,
      yenilemeBitis: oturum.yenilemeBitis,
    },
  };
}

/**
 * Geliştirme modunda üretilen kodu yanıta ekler.
 *
 * ÜRETİMDE ASLA ÇALIŞMAZ: `GELISTIRME` değişkeni yalnızca git dışı
 * `.dev.vars` dosyasından gelir, `wrangler.jsonc`'deki `vars` bloğunda
 * bilerek yoktur ve `.dev.vars` deploy edilmez.
 */
export function gelistirmeKoduEkle<T extends object>(
  env: Ortam,
  yanit: T,
  kod: string,
): T & { gelistirmeKodu?: string } {
  if (!gelistirmeModu(env)) return yanit;
  return { ...yanit, gelistirmeKodu: kod };
}

export async function kullaniciGetir(
  env: Ortam,
  kullaniciId: string,
): Promise<KullaniciSatiri> {
  const satir = await env.DB.prepare(
    `SELECT id, eposta, kullanici_adi, sifre_ozeti, eposta_dogrulandi
       FROM kullanicilar WHERE id = ?1`,
  )
    .bind(kullaniciId)
    .first<KullaniciSatiri>();
  if (satir === null) {
    // Oturum geçerli ama kullanıcı silinmiş: oturum kapatılmalı.
    throw new IstekHatasi(
      "oturum_gecersiz",
      401,
      "Oturumunuz sona erdi, lütfen tekrar giriş yapın.",
    );
  }
  return satir;
}

export async function kullaniciEpostadanGetir(
  env: Ortam,
  eposta: string,
): Promise<KullaniciSatiri | null> {
  return env.DB.prepare(
    `SELECT id, eposta, kullanici_adi, sifre_ozeti, eposta_dogrulandi
       FROM kullanicilar WHERE eposta = ?1`,
  )
    .bind(eposta)
    .first<KullaniciSatiri>();
}
