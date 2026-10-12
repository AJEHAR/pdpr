// ============================================================
//  upload.js — Hantar fail ke Google Drive melalui Apps Script
// ============================================================
import { MOD_DEMO } from './firebase.js';
import { tokenId } from './auth.js';

/** Kecilkan gambar besar (foto telefon) supaya cepat dimuat naik. Fail lain dipulangkan asal. */
export async function kecilkanGambar(fail, sisiMaks = 1800, kualiti = 0.82) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(fail.type) || fail.size < 1.2 * 1024 * 1024) return fail;
  try {
    const bmp = await createImageBitmap(fail);
    const nisbah = Math.min(1, sisiMaks / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * nisbah);
    c.height = Math.round(bmp.height * nisbah);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', kualiti));
    if (!blob || blob.size >= fail.size) return fail;
    return new File([blob], fail.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return fail;
  }
}

const keBase64 = (fail) =>
  new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = gagal;
    r.readAsDataURL(fail);
  });

/**
 * Hantar satu fail ke Apps Script.
 * @param {File} fail
 * @param {{tarikh, kelas, guru, awalan}} meta  guru/kelas = nama folder, awalan = awalan nama fail
 * @param {string} url  URL Web App Apps Script (dari tetapan)
 * @returns {Promise<{url:string, id:string, nama:string}>}
 */
export async function hantarFail(fail, meta, url) {
  if (MOD_DEMO) {
    await new Promise((r) => setTimeout(r, 600));
    return { url: '#demo-fail-tidak-disimpan', id: 'demo', nama: fail.name };
  }
  if (!url) throw new Error('URL Apps Script belum ditetapkan. Minta admin isi di Admin → Tetapan.');
  const badan = {
    aksi: 'simpan',
    token: await tokenId(),
    nama: (meta.awalan ? meta.awalan + '_' : '') + fail.name,
    mime: fail.type || 'application/octet-stream',
    data: await keBase64(fail),
    tarikh: meta.tarikh,
    kelas: meta.kelas || 'LAIN-LAIN',
    guru: meta.guru || 'LAIN-LAIN',
  };
  // text/plain mengelakkan "preflight" CORS yang tidak disokong Apps Script
  const r = await fetch(url, { method: 'POST', body: JSON.stringify(badan), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  const j = await r.json();
  if (!j.ok) throw new Error(j.ralat || 'Gagal memuat naik');
  return { url: j.url, id: j.id, nama: fail.name };
}

/** Buang fail dari Drive (ke Trash). Gagal secara senyap jika tiada URL. */
export async function buangFail(fileId, url) {
  if (MOD_DEMO || !url || !fileId) return;
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ aksi: 'padam', token: await tokenId(), id: fileId }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
  } catch (e) {
    console.warn('Gagal buang fail Drive', e);
  }
}

/** Uji sambungan Apps Script (GET) */
export async function ujiAppsScript(url) {
  const r = await fetch(url);
  return r.json();
}
