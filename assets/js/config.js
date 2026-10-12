// ============================================================
//  config.js — tetapan PEMASANGAN (diisi sekali sahaja)
//  Nama sekolah, logo, URL Apps Script dsb. diurus di halaman
//  Admin → Tetapan (disimpan dalam Firestore).
// ============================================================

// Salin dari Firebase Console → Project settings → Your apps → Web app.
// Selagi apiKey kosong, laman berjalan dalam MOD DEMO (data disimpan dalam browser sahaja).
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC4it7TLf7gcU58lNqjPIgfBtxEyfpasK8',
  authDomain: 'pdpr-90934.firebaseapp.com',
  projectId: 'pdpr-90934',
  storageBucket: 'pdpr-90934.firebasestorage.app',
  messagingSenderId: '975373020028',
  appId: '1:975373020028:web:fd27584148cfe761a6d2f9',
  measurementId: 'G-N43J9GN69R',
};

// Emel superadmin (pemilik sistem). MESTI sama dengan EMEL_SUPERADMIN dalam firestore.rules.
export const SUPERADMIN_EMAIL = 'g-39150004@moe-dl.edu.my';

// Domain DELiMa — akaun dengan domain ini diluluskan automatik.
export const DOMAIN_DELIMA = 'moe-dl.edu.my';

export const ZON_MASA = 'Asia/Kuala_Lumpur';
