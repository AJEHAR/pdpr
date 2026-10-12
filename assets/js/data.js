// ============================================================
//  data.js — Lapisan data. Semua halaman ambil/tulis data melalui fail ini.
//  Dua "backend":  Firestore (sebenar)  |  localStorage (mod demo)
//
//  Koleksi Firestore:
//    tetapan/sekolah        { nama, ringkas, kod, logo(dataURL), appsScriptUrl, hadSaizMB }
//    jadual/semasa          jadual aktif (lihat jadual.js)
//    pdprDays/{YYYY-MM-DD}  { aktif, kelas:'semua'|[kelasId], catatan }
//    uploads/{id}           { tarikh, sesi[], kelasIds[], subjekIds[], guruIds[], guruId,
//                             uid, olehGuruId, olehNama, bagiPihak, jenis:'fail'|'pautan',
//                             url, nama, fileId, catatan, masa }
//    users/{uid}            { email, nama, guruId|null, role:'guru'|'admin'|'superadmin',
//                             status:'menunggu'|'lulus', masa }
//    jemputan/{emel}        { guruId|null, role, oleh, masa }   ← daftar awal oleh admin
//    tuntutan/{guruId}      { uid?, email }                      ← nama guru yang sudah dipautkan
// ============================================================
import { firebase, MOD_DEMO } from './firebase.js';
import { indeksHari } from './jadual.js';

export { MOD_DEMO };

// ------------------------------------------------------------
//  Operasi generik
// ------------------------------------------------------------
const DEMO_PREFIX = 'pdpr-demo:';
const demoBaca = (kol) => {
  try { return JSON.parse(localStorage.getItem(DEMO_PREFIX + kol) || '{}'); } catch { return {}; }
};
const demoTulis = (kol, obj) => localStorage.setItem(DEMO_PREFIX + kol, JSON.stringify(obj));
const idRawak = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const padan = (d, [medan, op, nilai]) => {
  const v = d[medan];
  switch (op) {
    case '==': return v === nilai;
    case '>=': return v >= nilai;
    case '<=': return v <= nilai;
    case 'array-contains': return Array.isArray(v) && v.includes(nilai);
    default: return true;
  }
};

export async function ambil(kol, id) {
  const fb = await firebase();
  if (!fb) { const d = demoBaca(kol)[id]; return d ? { id, ...d } : null; }
  const s = await fb.fs.getDoc(fb.fs.doc(fb.db, kol, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

/** @param {Array<[string,string,any]>} tapis */
export async function senarai(kol, tapis = []) {
  const fb = await firebase();
  if (!fb) return Object.entries(demoBaca(kol)).map(([id, d]) => ({ id, ...d })).filter((d) => tapis.every((t) => padan(d, t)));
  const q = fb.fs.query(fb.fs.collection(fb.db, kol), ...tapis.map(([m, o, v]) => fb.fs.where(m, o, v)));
  const r = await fb.fs.getDocs(q);
  return r.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function tulis(kol, id, data, gabung = false) {
  const fb = await firebase();
  if (!fb) { const s = demoBaca(kol); s[id] = gabung ? { ...(s[id] || {}), ...data } : data; demoTulis(kol, s); return id; }
  await fb.fs.setDoc(fb.fs.doc(fb.db, kol, id), data, { merge: gabung });
  return id;
}

export async function tambah(kol, data) {
  const fb = await firebase();
  if (!fb) return tulis(kol, idRawak(), data);
  const r = await fb.fs.addDoc(fb.fs.collection(fb.db, kol), data);
  return r.id;
}

export async function buang(kol, id) {
  const fb = await firebase();
  if (!fb) { const s = demoBaca(kol); delete s[id]; demoTulis(kol, s); return; }
  await fb.fs.deleteDoc(fb.fs.doc(fb.db, kol, id));
}

/** Tulis beberapa dokumen serentak (atomik di Firestore). ops: [{kol,id,data}|{kol,id,padam:true}] */
export async function kelompok(ops) {
  const fb = await firebase();
  if (!fb) { for (const o of ops) o.padam ? await buang(o.kol, o.id) : await tulis(o.kol, o.id, o.data); return; }
  const b = fb.fs.writeBatch(fb.db);
  for (const o of ops) {
    const ref = fb.fs.doc(fb.db, o.kol, o.id);
    o.padam ? b.delete(ref) : b.set(ref, o.data);
  }
  await b.commit();
}

// ------------------------------------------------------------
//  Tetapan sekolah
// ------------------------------------------------------------
export const TETAPAN_ASAL = {
  nama: 'Nama Sekolah',
  ringkas: 'PDPR',
  kod: '',
  logo: '',
  appsScriptUrl: '',
  hadSaizMB: 10,
};
const KUNCI_TETAPAN = 'pdpr-tetapan';

/** Tetapan dari cache (segera, untuk paparan awal) */
export function tetapanCache() {
  try { return { ...TETAPAN_ASAL, ...JSON.parse(localStorage.getItem(KUNCI_TETAPAN) || '{}') }; } catch { return { ...TETAPAN_ASAL }; }
}

export async function muatTetapan() {
  let t = null;
  try { t = await ambil('tetapan', 'sekolah'); } catch (e) { console.warn('Gagal baca tetapan', e); }
  const hasil = { ...TETAPAN_ASAL, ...(t || {}) };
  delete hasil.id;
  try { localStorage.setItem(KUNCI_TETAPAN, JSON.stringify(hasil)); } catch {}
  return hasil;
}

export async function simpanTetapan(data) {
  await tulis('tetapan', 'sekolah', data, true);
  return muatTetapan();
}

// ------------------------------------------------------------
//  Jadual
// ------------------------------------------------------------
const KUNCI_JADUAL = 'pdpr-jadual-v1';

/** Jadual aktif: Firestore jadual/semasa, atau data/jadual.json sebagai sandaran. */
export async function muatJadual() {
  try { const c = sessionStorage.getItem(KUNCI_JADUAL); if (c) return JSON.parse(c); } catch {}
  let jadual = null;
  if (!MOD_DEMO) {
    try { jadual = await ambil('jadual', 'semasa'); } catch (e) { console.warn('Guna jadual tempatan', e); }
  }
  if (!jadual) jadual = await (await fetch(new URL('../../data/jadual.json', import.meta.url))).json();
  try { sessionStorage.setItem(KUNCI_JADUAL, JSON.stringify(jadual)); } catch {}
  return jadual;
}

// ------------------------------------------------------------
//  Hari PDPR
//  Mod demo: hari bekerja dianggap PDPR melainkan admin tutup.
// ------------------------------------------------------------
const statusDariDoc = (tarikh, d) => {
  if (!d) return MOD_DEMO && indeksHari(tarikh) >= 0 ? { aktif: true, kelas: 'semua', catatan: '' } : { aktif: false, kelas: 'semua', catatan: '' };
  return { aktif: !!d.aktif, kelas: d.kelas || 'semua', catatan: d.catatan || '' };
};

export async function statusPdpr(tarikh) {
  return statusDariDoc(tarikh, await ambil('pdprDays', tarikh));
}

/** Status setiap tarikh dalam senarai → { 'YYYY-MM-DD': status } */
export async function kalendarPdpr(dari, hingga, senaraiTarikh) {
  const docs = await senarai('pdprDays', []); // koleksi kecil (≤ ~200 dokumen setahun)
  const peta = Object.fromEntries(docs.filter((d) => d.id >= dari && d.id <= hingga).map((d) => [d.id, d]));
  return Object.fromEntries(senaraiTarikh.map((t) => [t, statusDariDoc(t, peta[t])]));
}

export async function setPdpr(tarikh, data) {
  return tulis('pdprDays', tarikh, { aktif: !!data.aktif, kelas: data.kelas || 'semua', catatan: data.catatan || '' });
}

export function kelasTerlibat(status, kelasId) {
  return status.aktif && (status.kelas === 'semua' || status.kelas.includes(kelasId));
}

// ------------------------------------------------------------
//  Bahan (uploads)
// ------------------------------------------------------------
const susunMasa = (a, b) => (b.masa || '').localeCompare(a.masa || '');

export async function bahanTarikh(tarikh) {
  return (await senarai('uploads', [['tarikh', '==', tarikh]])).sort(susunMasa);
}

export async function bahanKelas(tarikh, kelasId) {
  return (await bahanTarikh(tarikh)).filter((b) => (b.kelasIds || []).includes(kelasId));
}

export async function bahanJulat(dari, hingga) {
  return (await senarai('uploads', [['tarikh', '>=', dari], ['tarikh', '<=', hingga]])).sort(susunMasa);
}

export async function bahanSaya(uid) {
  return (await senarai('uploads', [['uid', '==', uid]])).sort((a, b) => b.tarikh.localeCompare(a.tarikh) || susunMasa(a, b));
}

export const tambahBahan = (data) => tambah('uploads', { ...data, masa: new Date().toISOString() });
export const padamBahan = (id) => buang('uploads', id);

/** Set ID sesi yang sudah diisi pada setiap tarikh → { tarikh: Set(sesiId) } */
export function petaSiap(bahan) {
  const p = {};
  for (const b of bahan) for (const s of b.sesi || []) (p[b.tarikh] ??= new Set()).add(s);
  return p;
}
