// ============================================================
//  firebase.js — muat SDK Firebase sekali sahaja (lazy)
// ============================================================
import { FIREBASE_CONFIG } from './config.js';

export const MOD_DEMO = !FIREBASE_CONFIG.apiKey;
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
let _fb = null;

/** @returns {Promise<null | {app, db, auth, fs, au}>}  fs = modul firestore, au = modul auth */
export async function firebase() {
  if (MOD_DEMO) return null;
  if (_fb) return _fb;
  _fb = (async () => {
    const [{ initializeApp, getApps }, fs, au] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-firestore.js`),
      import(`${SDK}/firebase-auth.js`),
    ]);
    const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
    return { app, db: fs.getFirestore(app), auth: au.getAuth(app), fs, au };
  })();
  return _fb;
}
