/**
 * "e-Arşiv Faturalarım" (Dijital Vergi Dairesi) listesinin PDF'i — içerik ve
 * dosya adı.
 *
 * PDF'i UYGULAMA ÜRETİR (kullanıcı isteği, 2026-09-22): Dijital VD'nin kendi
 * "PDF'e Aktar" sistemi (GET /eislemler/report/download?uuid=…) kullanılmaz.
 * Kaynak, zaten çekilen `alici-list` verisidir; bu modül onu yatay A4'lük bir
 * tabloya çevirir. Metinlerin tamamı HTML kaçışından geçer (satıcı unvanı gibi
 * dışarıdan gelen alanlar sayfaya kod olarak karışamaz).
 *
 * SAF modül — testlidir.
 */

import type { DvdEarsivFatura, DvdKullanici } from '../services/dvdApi';
import { tutarEtiketi } from './paraBirimi';
import { VKN_BICIMI, type Mukellef } from './yedekleme';

/**
 * Dijital VD oturumunun mükellefi (`/auth/tdvd/user-info`): önce VKN, geçerli
 * değilse TCKN. Kullanıcı kodu mükellefi tanımlamaz; geçerli bir VKN/TCKN
 * yoksa null (PDF yanlış mükellefin klasörüne yazılmasın).
 */
export function dvdMukellefi(k: DvdKullanici | undefined | null): Mukellef | null {
  for (const aday of [k?.vkn, k?.tckn]) {
    const v = aday?.trim();
    if (v && VKN_BICIMI.test(v)) return { vkn: v, unvan: k?.adSoyad?.trim() || undefined };
  }
  return null;
}

export const DVD_RAPOR_ON_EKI = 'e-Arsiv-Faturalarim_';

/** Toplu PDF'e Aktar dönemi: kaç ay geriye. */
export type TopluSure = '1a' | '2a';

/**
 * Toplu PDF'e Aktar dönem başlangıcı (kullanıcı tarifi, 2026-09-22):
 * "Son 1 ay" = önceki ayın 1'i, "Son 2 ay" = iki önceki ayın 1'i; bitiş
 * bugün. Eylül'de: son 1 ay → 01.08, son 2 ay → 01.07. Yıl geçişi: Ocak'ta
 * son 1 ay → 01.12 (önceki yıl).
 */
export function topluDonemBaslangici(sure: TopluSure, bugun: Date = new Date()): Date {
  const ay = sure === '1a' ? 1 : 2;
  return new Date(bugun.getFullYear(), bugun.getMonth() - ay, 1);
}

function iki(n: number): string {
  return String(n).padStart(2, '0');
}

function siralanabilirTarih(d: Date): string {
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

function noktaliTarih(d: Date): string {
  return `${iki(d.getDate())}.${iki(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function kimlikTemizle(k: string): string {
  return k.replace(/[^0-9A-Za-z]/g, '').slice(0, 20) || 'mukellef';
}

/**
 * Dosya adı: `e-Arsiv-Faturalarim_<YYYYAAGG-SSDDss>_<VKN>_<başlangıç>_<bitiş>.pdf`.
 * Oluşturma zamanı başta: ada göre sıralayınca en yenisi üstte, aynı dönem
 * tekrar aktarılsa bile üzerine yazılmaz.
 */
export function dvdRaporDosyaAdi(b: { kimlik: string; baslangic: Date; bitis: Date; olusturma: Date }): string {
  const o = b.olusturma;
  const zaman = `${o.getFullYear()}${iki(o.getMonth() + 1)}${iki(o.getDate())}-${iki(o.getHours())}${iki(o.getMinutes())}${iki(o.getSeconds())}`;
  return `${DVD_RAPOR_ON_EKI}${zaman}_${kimlikTemizle(b.kimlik)}_${siralanabilirTarih(b.baslangic)}_${siralanabilirTarih(b.bitis)}.pdf`;
}

/** Dosya adından ekranda gösterilecek bilgiler; tanınmazsa null. */
export function dvdRaporDosyaAdiniCoz(ad: string): {
  olusturma: string;
  kimlik: string;
  donem: string;
} | null {
  const m = /^e-Arsiv-Faturalarim_(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})\d{2}_([0-9A-Za-z]+)_(\d{4})-(\d{2})-(\d{2})_(\d{4})-(\d{2})-(\d{2})\.pdf$/.exec(
    ad,
  );
  if (!m) return null;
  return {
    olusturma: `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]}`,
    kimlik: m[6],
    donem: `${m[9]}.${m[8]}.${m[7]} – ${m[12]}.${m[11]}.${m[10]}`,
  };
}

export interface ParaToplami {
  paraBirimi: string;
  adet: number;
  toplamTutar: number;
  vergilerTutari: number;
  odenecekTutar: number;
}

/** Para birimine göre toplamlar (TRY önce, sonra alfabetik). */
export function paraToplamlari(faturalar: DvdEarsivFatura[]): ParaToplami[] {
  const harita = new Map<string, ParaToplami>();
  for (const f of faturalar) {
    const pb = f.paraBirimi || 'TRY';
    const t = harita.get(pb) ?? { paraBirimi: pb, adet: 0, toplamTutar: 0, vergilerTutari: 0, odenecekTutar: 0 };
    t.adet += 1;
    t.toplamTutar += f.toplamTutar ?? 0;
    t.vergilerTutari += f.vergilerTutari ?? 0;
    t.odenecekTutar += f.odenecekTutar ?? 0;
    harita.set(pb, t);
  }
  // Kuruş kayması olmasın diye 2 haneye yuvarlanır.
  const yuvarla = (n: number) => Math.round(n * 100) / 100;
  return [...harita.values()]
    .map((t) => ({
      ...t,
      toplamTutar: yuvarla(t.toplamTutar),
      vergilerTutari: yuvarla(t.vergilerTutari),
      odenecekTutar: yuvarla(t.odenecekTutar),
    }))
    .sort((a, b) => (a.paraBirimi === 'TRY' ? -1 : b.paraBirimi === 'TRY' ? 1 : a.paraBirimi.localeCompare(b.paraBirimi)));
}

export function htmlKacis(metin: string): string {
  return metin
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const k = (v: string | undefined | null) => htmlKacis(v ?? '');

function tutar(n: number | undefined, pb: string | undefined): string {
  return n === undefined ? '' : tutarEtiketi(n, pb || 'TRY');
}

/** "2026-08-07 14:29:30" → "07.08.2026 14:29" */
function tarihGoster(t: string | undefined): string {
  const m = t ? /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(t) : null;
  if (!m) return t ?? '';
  return `${m[3]}.${m[2]}.${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

function gonderim(s: string | undefined): string {
  if (s === 'KAGIT') return 'Kâğıt';
  if (s === 'ELEKTRONIK') return 'Elektronik';
  return s ?? '';
}

/**
 * PDF'e basılacak HTML (yatay A4). Başlık: alıcı (mükellef), dönem,
 * oluşturma zamanı, fatura sayısı; para birimine göre toplamlar; fatura
 * tablosu (yeniden eskiye). Betik içermez.
 */
export function dvdRaporHtml(b: {
  faturalar: DvdEarsivFatura[];
  alici?: DvdKullanici;
  kullaniciKodu?: string;
  baslangic: Date;
  bitis: Date;
  olusturma: Date;
}): string {
  const alici = b.alici;
  const aliciKimlik = alici?.vkn || alici?.tckn;
  const aliciSatiri = [alici?.adSoyad, aliciKimlik ? `VKN/TCKN: ${aliciKimlik}` : undefined, b.kullaniciKodu && !aliciKimlik ? `Kullanıcı kodu: ${b.kullaniciKodu}` : undefined]
    .filter(Boolean)
    .join(' · ');
  const o = b.olusturma;
  const olusturma = `${noktaliTarih(o)} ${iki(o.getHours())}:${iki(o.getMinutes())}`;

  const toplamSatirlari = paraToplamlari(b.faturalar)
    .map(
      (t) => `<tr>
        <td>${k(t.paraBirimi)}</td><td class="sag">${t.adet}</td>
        <td class="sag">${k(tutar(t.toplamTutar, t.paraBirimi))}</td>
        <td class="sag">${k(tutar(t.vergilerTutari, t.paraBirimi))}</td>
        <td class="sag"><b>${k(tutar(t.odenecekTutar, t.paraBirimi))}</b></td></tr>`,
    )
    .join('');

  const satirlar = b.faturalar
    .map(
      (f, i) => `<tr>
        <td class="sag">${i + 1}</td>
        <td class="no">${k(f.faturaNo)}</td>
        <td>${k(tarihGoster(f.duzenlenmeTarihi))}</td>
        <td>${k(f.saticiUnvan)}</td>
        <td>${k(f.saticiVknTckn)}</td>
        <td>${k(f.tesisatNumarasi)}</td>
        <td class="sag">${k(tutar(f.toplamTutar, f.paraBirimi))}</td>
        <td class="sag">${k(tutar(f.vergilerTutari, f.paraBirimi))}</td>
        <td class="sag"><b>${k(tutar(f.odenecekTutar, f.paraBirimi))}</b></td>
        <td>${k(gonderim(f.gonderimSekli))}</td>
        <td>${k([f.iptalItirazDurum, f.iptalItirazTarihi].filter(Boolean).join(' '))}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<title>e-Arşiv Faturalarım</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 9.5px; margin: 0; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .alt { color: #555; margin: 0 0 8px; font-size: 10px; }
  .bilgi { margin: 0 0 8px; font-size: 10.5px; }
  .bilgi b { display: inline-block; min-width: 92px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 3px 4px; vertical-align: top; }
  th { background: #eee; text-align: left; font-size: 9px; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .sag { text-align: right; white-space: nowrap; }
  .no { white-space: nowrap; font-family: 'Courier New', monospace; }
  .toplamlar { width: auto; margin: 0 0 10px; }
  .dip { margin-top: 8px; color: #666; font-size: 8.5px; }
</style></head>
<body>
  <h1>e-Arşiv Faturalarım</h1>
  <p class="alt">Dijital Vergi Dairesi — adınıza düzenlenen e-Arşiv faturaları</p>
  <div class="bilgi">
    ${aliciSatiri ? `<div><b>Alıcı:</b> ${k(aliciSatiri)}</div>` : ''}
    <div><b>Dönem:</b> ${k(noktaliTarih(b.baslangic))} – ${k(noktaliTarih(b.bitis))}</div>
    <div><b>Oluşturulma:</b> ${k(olusturma)}</div>
    <div><b>Fatura sayısı:</b> ${b.faturalar.length}</div>
  </div>
  ${
    b.faturalar.length > 0
      ? `<table class="toplamlar"><thead><tr><th>Para birimi</th><th>Adet</th><th>Toplam tutar</th><th>Vergiler</th><th>Ödenecek tutar</th></tr></thead><tbody>${toplamSatirlari}</tbody></table>
  <table>
    <thead><tr>
      <th>#</th><th>Fatura No</th><th>Düzenlenme Tarihi</th><th>Satıcı Unvanı</th><th>Satıcı VKN/TCKN</th>
      <th>Tesisat No</th><th>Toplam Tutar</th><th>Vergiler</th><th>Ödenecek Tutar</th><th>Gönderim</th><th>İptal/İtiraz</th>
    </tr></thead>
    <tbody>${satirlar}</tbody>
  </table>`
      : '<p>Bu dönemde adınıza düzenlenmiş e-Arşiv faturası bulunmuyor.</p>'
  }
  <p class="dip">Bu belge, Dijital Vergi Dairesi "e-Arşiv Faturalarım" listesinden e-Arşiv Portal mobil uygulaması tarafından oluşturulmuştur; faturaların kendisi değildir. Tutarlar GİB'in bildirdiği gibidir.</p>
</body></html>`;
}
