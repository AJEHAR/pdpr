// ============================================================
//  config.js — tetapan PEMASANGAN (diisi sekali sahaja)
//  Nama sekolah, logo, URL Apps Script dsb. diurus di halaman
//  Admin → Tetapan (disimpan dalam Firestore).
// ============================================================

// Salin dari Firebase Console → Project settings → Your apps → Web app.
// Selagi apiKey kosong, laman berjalan dalam MOD DEMO (data disimpan dalam browser sahaja).
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Emel superadmin (pemilik sistem). MESTI sama dengan EMEL_SUPERADMIN dalam firestore.rules.
export const SUPERADMIN_EMAIL = 'emel.anda@moe-dl.edu.my';

// Domain DELiMa — akaun dengan domain ini diluluskan automatik.
export const DOMAIN_DELIMA = 'moe-dl.edu.my';

export const ZON_MASA = 'Asia/Kuala_Lumpur';
