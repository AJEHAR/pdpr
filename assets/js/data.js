// ============================================================
//  data.js — Lapisan data. Semua halaman ambil/tulis data melalui fail ini.
//  Dua "backend":  Firestore (sebenar)  |  localStorage (mod demo)
//
//  Koleksi Firestore:
//    tetapan/sekolah        { nama, ringkas, kod, logo(dataURL), appsScriptUrl, hadSaizMB }
//    jadual/indeks, jadual/{versi}  jadual berversi ikut tarikh berkuat kuasa
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
import { ZON_MASA } from './config.js';
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

// ---------- Cache bacaan (jimat kuota Firestore) ----------
// Hasil senarai() disimpan 90 saat dalam tab ini (memori + sessionStorage, merentas halaman).
// Sebarang tulisan oleh pengguna ini mengosongkan cache supaya paparan sentiasa terkini.
const CACHE_TTL = 90 * 1000;
const PRA_Q = 'pdpr-q:';
const memori = new Map();
export function bersihCache() {
  memori.clear();
  try { Object.keys(sessionStorage).filter((k) => k.startsWith(PRA_Q)).forEach((k) => sessionStorage.removeItem(k)); } catch {}
}
function cacheAmbil(k) {
  const m = memori.get(k);
  if (m && Date.now() - m.t < CACHE_TTL) return m.d;
  try {
    const c = JSON.parse(sessionStorage.getItem(PRA_Q + k) || 'null');
    if (c && Date.now() - c.t < CACHE_TTL) { memori.set(k, c); return c.d; }
  } catch {}
  return null;
}
function cacheSimpan(k, d) {
  const c = { t: Date.now(), d };
  memori.set(k, c);
  try { sessionStorage.setItem(PRA_Q + k, JSON.stringify(c)); } catch {}
}

/**
 * @param {Array<[string,string,any]>} tapis
 * @param {{segar?: boolean}} pilihan  segar = abaikan cache
 */
export async function senarai(kol, tapis = [], { segar = false } = {}) {
  const fb = await firebase();
  if (!fb) return Object.entries(demoBaca(kol)).map(([id, d]) => ({ id, ...d })).filter((d) => tapis.every((t) => padan(d, t)));
  const kunci = kol + JSON.stringify(tapis);
  if (!segar) { const c = cacheAmbil(kunci); if (c) return c; }
  const q = fb.fs.query(fb.fs.collection(fb.db, kol), ...tapis.map(([m, o, v]) => fb.fs.where(m, o, v)));
  const r = await fb.fs.getDocs(q);
  const hasil = r.docs.map((d) => ({ id: d.id, ...d.data() }));
  cacheSimpan(kunci, hasil);
  return hasil;
}

/**
 * Pertanyaan bersasar (cth hanya bahan kelas/guru tertentu) yang memerlukan indeks komposit.
 * Jika indeks belum dicipta, guna pertanyaan umum dan tapis di browser (tetap berfungsi, cuma lebih banyak bacaan).
 */
async function senaraiBersasar(kol, tapisSasar, tapisUmum, saring) {
  try {
    return await senarai(kol, tapisSasar);
  } catch (e) {
    if (!String(e?.code || '').includes('failed-precondition')) throw e;
    console.warn(`[PDPR] Indeks Firestore untuk "${kol}" belum dicipta — guna pertanyaan umum. Cipta indeks melalui pautan ini:`, e.message);
    return (await senarai(kol, tapisUmum)).filter(saring);
  }
}

export async function tulis(kol, id, data, gabung = false) {
  bersihCache();
  const fb = await firebase();
  if (!fb) { const s = demoBaca(kol); s[id] = gabung ? { ...(s[id] || {}), ...data } : data; demoTulis(kol, s); return id; }
  await fb.fs.setDoc(fb.fs.doc(fb.db, kol, id), data, { merge: gabung });
  return id;
}

export async function tambah(kol, data) {
  bersihCache();
  const fb = await firebase();
  if (!fb) return tulis(kol, idRawak(), data);
  const r = await fb.fs.addDoc(fb.fs.collection(fb.db, kol), data);
  return r.id;
}

export async function buang(kol, id) {
  bersihCache();
  const fb = await firebase();
  if (!fb) { const s = demoBaca(kol); delete s[id]; demoTulis(kol, s); return; }
  await fb.fs.deleteDoc(fb.fs.doc(fb.db, kol, id));
}

/** Tulis beberapa dokumen serentak (atomik di Firestore). ops: [{kol,id,data}|{kol,id,padam:true}] */
export async function kelompok(ops) {
  bersihCache();
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
//  Jadual — BERVERSI mengikut tarikh berkuat kuasa
//    jadual/indeks   { versi: [{ id, mulai:'YYYY-MM-DD', nama, fail, kelas, guru, slot, masa, oleh }] }
//    jadual/{id}     data jadual penuh (lihat jadual.js)
//  Tarikh T menggunakan versi dengan `mulai` terbesar ≤ T.
//  Jika tiada indeks lagi → data/jadual.json (jadual asal dalam repo).
// ------------------------------------------------------------
const PRA_CACHE = 'pdpr-jv:';
const KUNCI_INDEKS = 'pdpr-jadual-indeks';
const TEMPOH_INDEKS = 10 * 60 * 1000; // 10 minit

const tarikhKini = () => new Date().toLocaleDateString('en-CA', { timeZone: ZON_MASA });

export function bersihCacheJadual() {
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith(PRA_CACHE) || k === KUNCI_INDEKS).forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

export async function indeksJadual(segar = false) {
  if (!segar) {
    try {
      const c = JSON.parse(sessionStorage.getItem(KUNCI_INDEKS) || 'null');
      if (c && Date.now() - c.t < TEMPOH_INDEKS) return c.d;
    } catch {}
  }
  let d = null;
  try { d = await ambil('jadual', 'indeks'); } catch (e) { console.warn('Gagal baca indeks jadual', e); }
  const hasil = d?.versi?.length ? { versi: [...d.versi].sort((a, b) => a.mulai.localeCompare(b.mulai)) } : { versi: [] };
  try { sessionStorage.setItem(KUNCI_INDEKS, JSON.stringify({ t: Date.now(), d: hasil })); } catch {}
  return hasil;
}

/** Versi yang berkuat kuasa pada tarikh (null jika tiada indeks) */
export function pilihVersi(indeks, tarikh) {
  if (!indeks?.versi?.length) return null;
  let p = null;
  for (const v of indeks.versi) if (v.mulai <= tarikh) p = v;
  return p || indeks.versi[0];
}

export async function muatVersiJadual(id) {
  const kunci = PRA_CACHE + id;
  try { const c = sessionStorage.getItem(kunci); if (c) return JSON.parse(c); } catch {}
  let j;
  if (id === 'fail-asal') {
    j = await (await fetch(new URL('../../data/jadual.json', import.meta.url))).json();
  } else {
    j = await ambil('jadual', id);
    if (!j) throw new Error('Versi jadual tidak dijumpai: ' + id);
    delete j.id;
  }
  try { sessionStorage.setItem(kunci, JSON.stringify(j)); } catch {}
  return j;
}

// ------------------------------------------------------------
//  Prasekolah — mod harian (disimpan dalam tetapan/pra)
//    { kelas: { [kelasId]: { harian: true, guru: [guruId] } },
//      guru:  { ['pra-xxx']: { nama, ringkas } } }   ← guru yang tiada dalam aSc
// ------------------------------------------------------------
const KUNCI_PRA = 'pdpr-pra';

export async function muatPra(segar = false) {
  if (!segar) {
    try {
      const c = JSON.parse(sessionStorage.getItem(KUNCI_PRA) || 'null');
      if (c && Date.now() - c.t < TEMPOH_INDEKS) return c.d;
    } catch {}
  }
  let d = null;
  try { d = await ambil('tetapan', 'pra'); } catch (e) { console.warn('Gagal baca tetapan prasekolah', e); }
  const hasil = { kelas: d?.kelas || {}, guru: d?.guru || {} };
  try { sessionStorage.setItem(KUNCI_PRA, JSON.stringify({ t: Date.now(), d: hasil })); } catch {}
  return hasil;
}

export async function simpanPra(data) {
  await tulis('tetapan', 'pra', { kelas: data.kelas || {}, guru: data.guru || {} });
  try { sessionStorage.removeItem(KUNCI_PRA); } catch {}
}

/** Gabungkan guru tambahan & kelas mod harian ke dalam jadual (salinan, cache tidak diubah) */
function tambahPra(j, pra) {
  const kelas = {};
  for (const [id, k] of Object.entries(pra.kelas || {})) if (k.harian && j.kelas[id]) kelas[id] = k;
  return {
    ...j,
    guru: { ...j.guru, ...pra.guru },
    subjek: { ...j.subjek, harian: { nama: 'Aktiviti Harian', ringkas: 'HARIAN' } },
    pra: kelas,
  };
}

/**
 * Jadual yang berkuat kuasa pada tarikh (lalai: hari ini), termasuk sesi harian prasekolah.
 * { mentah: true } → jadual aSc asal sahaja (untuk import/bandingan).
 */
export async function muatJadual(tarikh = tarikhKini(), { mentah = false } = {}) {
  const v = pilihVersi(await indeksJadual(), tarikh);
  const j = await muatVersiJadual(v ? v.id : 'fail-asal');
  return mentah ? j : tambahPra(j, await muatPra());
}

/** { tarikh: jadual } bagi beberapa tarikh (versi sama dimuat sekali sahaja) */
export async function muatJadualUntuk(senaraiTarikh) {
  const [ind, pra] = await Promise.all([indeksJadual(), muatPra()]);
  const ids = Object.fromEntries(senaraiTarikh.map((t) => [t, pilihVersi(ind, t)?.id || 'fail-asal']));
  const unik = [...new Set(Object.values(ids))];
  const dimuat = Object.fromEntries(await Promise.all(unik.map(async (id) => [id, tambahPra(await muatVersiJadual(id), pra)])));
  return Object.fromEntries(senaraiTarikh.map((t) => [t, dimuat[ids[t]]]));
}

/**
 * Simpan versi jadual baharu. Jika tiada indeks lagi, jadual asal (data/jadual.json)
 * didaftarkan dahulu sebagai versi pertama supaya tarikh lama kekal menggunakannya.
 */
export async function simpanVersiJadual(jadual, meta) {
  const ind = await indeksJadual(true);
  let versi = [...ind.versi];
  const ops = [];
  if (!versi.length) {
    const asal = await muatVersiJadual('fail-asal');
    ops.push({ kol: 'jadual', id: 'v-asal', data: asal });
    versi.push({ id: 'v-asal', mulai: '2000-01-01', nama: 'Jadual asal', fail: 'data/jadual.json',
      kelas: Object.keys(asal.kelas).length, guru: Object.keys(asal.guru).length, slot: asal.slot.length, masa: new Date().toISOString(), oleh: meta.oleh });
  }
  const id = 'v-' + meta.mulai;
  versi = versi.filter((v) => v.id !== id);
  versi.push({ id, mulai: meta.mulai, nama: meta.nama || '', fail: meta.fail || '',
    kelas: Object.keys(jadual.kelas).length, guru: Object.keys(jadual.guru).length, slot: jadual.slot.length,
    masa: new Date().toISOString(), oleh: meta.oleh });
  versi.sort((a, b) => a.mulai.localeCompare(b.mulai));
  ops.push({ kol: 'jadual', id, data: jadual });
  ops.push({ kol: 'jadual', id: 'indeks', data: { versi } });
  await kelompok(ops);
  bersihCacheJadual();
  return id;
}

export async function padamVersiJadual(id) {
  const ind = await indeksJadual(true);
  const versi = ind.versi.filter((v) => v.id !== id);
  if (!versi.length) throw new Error('Tidak boleh memadam satu-satunya versi jadual.');
  await kelompok([{ kol: 'jadual', id, padam: true }, { kol: 'jadual', id: 'indeks', data: { versi } }]);
  bersihCacheJadual();
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

/** Bahan satu kelas pada satu tarikh (indeks: uploads · kelasIds array-contains + tarikh) */
export async function bahanKelas(tarikh, kelasId) {
  return (await senaraiBersasar('uploads',
    [['kelasIds', 'array-contains', kelasId], ['tarikh', '==', tarikh]],
    [['tarikh', '==', tarikh]],
    (b) => (b.kelasIds || []).includes(kelasId))).sort(susunMasa);
}

/**
 * Bahan dalam julat tarikh. Dengan guruId: hanya sesi guru itu
 * (indeks: uploads · guruIds array-contains + tarikh) — jauh lebih jimat untuk Jadual Saya.
 */
export async function bahanJulat(dari, hingga, guruId = null) {
  const julat = [['tarikh', '>=', dari], ['tarikh', '<=', hingga]];
  if (!guruId) return (await senarai('uploads', julat)).sort(susunMasa);
  return (await senaraiBersasar('uploads', [['guruIds', 'array-contains', guruId], ...julat], julat,
    (b) => (b.guruIds || []).includes(guruId))).sort(susunMasa);
}

export async function bahanSaya(uid) {
  return (await senarai('uploads', [['uid', '==', uid]])).sort((a, b) => b.tarikh.localeCompare(a.tarikh) || susunMasa(a, b));
}

/**
 * Semua bahan berkaitan seorang guru (Pantau Guru):
 * bahan untuk sesinya (termasuk oleh guru ganti) + bahan yang dia muat naik bagi pihak guru lain.
 */
export async function bahanGuru(guruId) {
  const [a, b] = await Promise.all([senarai('uploads', [['guruId', '==', guruId]]), senarai('uploads', [['olehGuruId', '==', guruId]])]);
  const peta = new Map([...a, ...b].map((x) => [x.id, x]));
  return [...peta.values()].sort((x, y) => y.tarikh.localeCompare(x.tarikh) || susunMasa(x, y));
}

export const tambahBahan = (data) => tambah('uploads', { ...data, masa: new Date().toISOString() });
export const padamBahan = (id) => buang('uploads', id);

/** Set ID sesi yang sudah diisi pada setiap tarikh → { tarikh: Set(sesiId) } */
export function petaSiap(bahan) {
  const p = {};
  for (const b of bahan) for (const s of b.sesi || []) (p[b.tarikh] ??= new Set()).add(s);
  return p;
}

// ------------------------------------------------------------
//  Kerja murid (hantaran) — hanya guru/admin yang diluluskan boleh membaca
//    hantaran/{id} { tarikh, sesi, kelasId, subjekId, guruIds[], namaMurid,
//                    jenis:'fail'|'pautan', url?, fileId?, namaFail?, catatan, uid, masa }
// ------------------------------------------------------------
export const tambahHantaran = (data) => tambah('hantaran', { ...data, masa: new Date().toISOString() });

/** Kerja murid dalam julat tarikh. Dengan guruId: hanya sesi guru itu (indeks: hantaran · guruIds array-contains + tarikh) */
export async function hantaranJulat(dari, hingga, guruId = null) {
  const julat = [['tarikh', '>=', dari], ['tarikh', '<=', hingga]];
  const xs = guruId
    ? await senaraiBersasar('hantaran', [['guruIds', 'array-contains', guruId], ...julat], julat, (h) => (h.guruIds || []).includes(guruId))
    : await senarai('hantaran', julat);
  return xs.sort((a, b) => (a.masa || '').localeCompare(b.masa || ''));
}

/** Bilangan murid unik yang menghantar bagi setiap tarikh+sesi → { 'tarikh|sesi': n } */
export function kiraHantaran(senaraiHantaran) {
  const m = {};
  for (const h of senaraiHantaran) (m[h.tarikh + '|' + h.sesi] ??= new Set()).add((h.namaMurid || '').trim().toUpperCase());
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.size]));
}

// ------------------------------------------------------------
//  Makluman / pengumuman
//    makluman/{id} { teks, sasaran:'awam'|'guru'|'semua', jenis:'info'|'penting', mula, tamat, masa, oleh }
// ------------------------------------------------------------
export async function maklumanAktif(sasaran) {
  const t = tarikhKini();
  const xs = await senarai('makluman').catch(() => []);
  return xs.filter((m) => (m.sasaran === 'semua' || m.sasaran === sasaran) && (!m.mula || m.mula <= t) && (!m.tamat || m.tamat >= t))
    .sort((a, b) => (a.jenis === 'penting' ? -1 : 0) - (b.jenis === 'penting' ? -1 : 0) || (b.masa || '').localeCompare(a.masa || ''));
}
