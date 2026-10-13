// ============================================================
//  auth.js — Log masuk Google, profil pengguna & kawalan akses
// ============================================================
import { firebase, MOD_DEMO } from './firebase.js';
import { SUPERADMIN_EMAIL, DOMAIN_DELIMA } from './config.js';
import { ambil, kelompok, senarai, tulis } from './data.js';

const akar = new URL('../../', import.meta.url).href;
const KUNCI_DEMO = 'pdpr-demo-user';

export const emelDelima = (e) => (e || '').toLowerCase().endsWith('@' + DOMAIN_DELIMA);
export const adalahAdmin = (p) => !!p && p.status === 'lulus' && ['admin', 'superadmin'].includes(p.role);

/** Pengguna Firebase semasa (tunggu Firebase selesai memulihkan sesi). */
export async function penggunaSemasa() {
  if (MOD_DEMO) {
    try { return JSON.parse(sessionStorage.getItem(KUNCI_DEMO) || 'null'); } catch { return null; }
  }
  const fb = await firebase();
  if (fb.auth.authStateReady) await fb.auth.authStateReady();
  else await new Promise((ok) => { const henti = fb.au.onAuthStateChanged(fb.auth, () => { henti(); ok(); }); });
  const u = fb.auth.currentUser;
  if (u?.isAnonymous) return null; // sesi tanpa nama (ibu bapa) bukan akaun guru
  return u ? { uid: u.uid, email: (u.email || '').toLowerCase(), nama: u.displayName || '', foto: u.photoURL || '' } : null;
}

export async function logMasuk() {
  if (MOD_DEMO) {
    const u = { uid: 'demo-uid', email: 'cikgu.demo@' + DOMAIN_DELIMA, nama: 'Cikgu Demo', foto: '' };
    sessionStorage.setItem(KUNCI_DEMO, JSON.stringify(u));
    return u;
  }
  const fb = await firebase();
  const p = new fb.au.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try {
    await fb.au.signInWithPopup(fb.auth, p);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await fb.au.signInWithRedirect(fb.auth, p);
      return null;
    }
    throw e;
  }
  return penggunaSemasa();
}

export async function logKeluar() {
  if (MOD_DEMO) sessionStorage.removeItem(KUNCI_DEMO);
  else { const fb = await firebase(); await fb.au.signOut(fb.auth); }
  sessionStorage.removeItem('pdpr-profil');
  location.href = akar + 'index.html';
}

/**
 * Token untuk ibu bapa/murid (tanpa akaun). Jika guru sudah log masuk dalam browser ini,
 * sesi guru digunakan; jika tidak, log masuk tanpa nama (Firebase Anonymous Auth).
 */
export async function tokenTanpaNama() {
  if (MOD_DEMO) return { uid: 'demo-murid', token: 'demo' };
  const fb = await firebase();
  if (fb.auth.authStateReady) await fb.auth.authStateReady();
  if (!fb.auth.currentUser) await fb.au.signInAnonymously(fb.auth);
  return { uid: fb.auth.currentUser.uid, token: await fb.auth.currentUser.getIdToken() };
}

/** Token ID untuk Apps Script */
export async function tokenId() {
  if (MOD_DEMO) return 'demo';
  const fb = await firebase();
  return fb.auth.currentUser.getIdToken();
}

/**
 * Dapatkan profil users/{uid}. Jika belum wujud, cuba cipta secara automatik:
 *  1. Emel superadmin → superadmin
 *  2. Emel ada dalam jemputan (daftar awal admin) → ikut jemputan, terus lulus
 *  3. Selainnya → null (pengguna perlu pilih nama di daftar.html)
 */
export async function pastikanProfil(u) {
  let p = await ambil('users', u.uid);
  if (p) return p;

  const asas = { email: u.email, nama: u.nama || '', masa: new Date().toISOString() };
  if (!MOD_DEMO && u.email === SUPERADMIN_EMAIL.toLowerCase()) {
    await tulis('users', u.uid, { ...asas, guruId: null, role: 'superadmin', status: 'lulus' });
    return ambil('users', u.uid);
  }
  const j = await ambil('jemputan', u.email).catch(() => null);
  if (j) {
    await tulis('users', u.uid, { ...asas, guruId: j.guruId ?? null, role: j.role || 'guru', status: 'lulus' });
    return ambil('users', u.uid);
  }
  return null;
}

/** Senarai guruId yang sudah dituntut / didaftarkan */
export async function namaDituntut() {
  return new Set((await senarai('tuntutan')).map((t) => t.id));
}

/** Guru menuntut nama dari jadual. DELiMa → terus lulus; Gmail → menunggu admin. */
export async function tuntutNama(u, guruId) {
  const status = MOD_DEMO || emelDelima(u.email) ? 'lulus' : 'menunggu';
  // Mod demo: beri peranan superadmin supaya semua halaman boleh dicuba
  const role = MOD_DEMO ? 'superadmin' : 'guru';
  await kelompok([
    { kol: 'tuntutan', id: guruId, data: { uid: u.uid, email: u.email } },
    { kol: 'users', id: u.uid, data: { email: u.email, nama: u.nama || '', guruId, role, status, masa: new Date().toISOString() } },
  ]);
  return ambil('users', u.uid);
}

/**
 * Kawal akses halaman. Dipanggil di atas setiap halaman guru/admin.
 * @param {'guru'|'admin'} perlu
 * @param {{ izinMenunggu?: boolean, perluGuru?: boolean }} pilihan
 * @returns {Promise<{u, profil}>}  (atau tidak kembali — halaman diarahkan)
 */
export async function kawal(perlu = 'guru', pilihan = {}) {
  const u = await penggunaSemasa();
  const balik = encodeURIComponent(location.pathname.split('/').slice(-2).join('/') + location.search);
  if (!u) { location.replace(`${akar}login.html?ke=${balik}`); return new Promise(() => {}); }

  const profil = await pastikanProfil(u);
  if (!profil) { location.replace(`${akar}daftar.html`); return new Promise(() => {}); }

  if (perlu === 'admin' && !adalahAdmin(profil)) { location.replace(`${akar}guru/index.html`); return new Promise(() => {}); }
  if (pilihan.perluGuru && !profil.guruId && !guruDilihat(profil)) { location.replace(`${akar}admin/index.html`); return new Promise(() => {}); }
  return { u, profil };
}

/**
 * Mod Pantau Guru (lihat sahaja): admin membuka halaman guru dengan ?lihat=<guruId>.
 * @returns {string|null} guruId yang sedang dipantau, atau null
 */
export function guruDilihat(profil) {
  const id = new URLSearchParams(location.search).get('lihat');
  return id && adalahAdmin(profil) ? id : null;
}

/** Halaman pertama selepas log masuk */
export function halamanUtama(profil) {
  return profil.guruId ? 'guru/index.html' : 'admin/index.html';
}
