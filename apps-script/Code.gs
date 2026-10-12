/**
 * ============================================================
 *  Portal PDPR — Penerima fail ke Google Drive
 *  Tampal fail ini di https://script.google.com (projek baharu)
 *  Panduan penuh: README.md → "Sediakan Apps Script"
 * ============================================================
 */

// ⚠️ ISI 3 NILAI INI
const FIREBASE_API_KEY = 'TAMPAL_apiKey_DARI_config.js';
const FIREBASE_PROJECT_ID = 'TAMPAL_projectId_DARI_config.js';
const FOLDER_INDUK_ID = 'TAMPAL_ID_FOLDER_DRIVE'; // ID folder "PDPR" (bahagian akhir URL folder)

const HAD_MB = 25; // had keselamatan pelayan (had sebenar ditetapkan di Admin → Tetapan)

/** GET — untuk butang "Uji sambungan" */
function doGet() {
  try {
    const f = DriveApp.getFolderById(FOLDER_INDUK_ID);
    return jawab({ ok: true, folder: f.getName(), masa: new Date().toISOString() });
  } catch (e) {
    return jawab({ ok: false, ralat: 'Folder Drive tidak dijumpai. Semak FOLDER_INDUK_ID.' });
  }
}

/** POST — { aksi: 'simpan' | 'padam', token, ... } */
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const pengguna = sahkanToken(req.token);
    const profil = bacaProfil(req.token, pengguna.uid);
    if (!profil || profil.status !== 'lulus') throw new Error('Akaun belum diluluskan admin.');

    if (req.aksi === 'padam') return jawab(padam(req, pengguna, profil));
    return jawab(simpan(req, pengguna));
  } catch (err) {
    return jawab({ ok: false, ralat: String((err && err.message) || err) });
  }
}

/** Sahkan Firebase ID token melalui Identity Toolkit */
function sahkanToken(token) {
  if (!token) throw new Error('Tiada token. Sila log masuk semula.');
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: token }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) throw new Error('Sesi log masuk tamat. Sila log masuk semula.');
  const u = JSON.parse(r.getContentText()).users[0];
  return { uid: u.localId, email: (u.email || '').toLowerCase() };
}

/** Baca users/{uid} dari Firestore menggunakan token pengguna (peraturan Firestore terpakai) */
function bacaProfil(token, uid) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/users/' + uid;
  const r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  const f = JSON.parse(r.getContentText()).fields || {};
  return {
    status: f.status && f.status.stringValue,
    role: f.role && f.role.stringValue,
  };
}

function simpan(req, pengguna) {
  const bait = Utilities.base64Decode(req.data || '');
  if (!bait.length) throw new Error('Fail kosong.');
  if (bait.length > HAD_MB * 1024 * 1024) throw new Error('Fail melebihi ' + HAD_MB + ' MB.');

  const tarikh = /^\d{4}-\d{2}-\d{2}$/.test(req.tarikh) ? req.tarikh : Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
  // Struktur: PDPR / KRY - NUR KHAIRIAH BINTI ROSDI / 2026-10 / 2026-10-13 / 4 RAUB / fail
  // (folder guru = guru ASAL sesi, walaupun dimuat naik oleh guru ganti)
  const folder = dapatFolder([
    namaSelamat(req.guru || 'LAIN-LAIN'),
    tarikh.slice(0, 7),
    tarikh,
    namaSelamat(req.kelas || 'LAIN-LAIN'),
  ]);
  const blob = Utilities.newBlob(bait, req.mime || 'application/octet-stream', namaSelamat(req.nama || 'fail'));
  const fail = folder.createFile(blob);
  fail.setDescription(JSON.stringify({ uid: pengguna.uid, email: pengguna.email, masa: new Date().toISOString() }));

  let dikongsi = true;
  try {
    fail.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    dikongsi = false; // akaun Workspace (cth DELiMa) mungkin menyekat perkongsian luar
  }
  return { ok: true, id: fail.getId(), url: fail.getUrl(), dikongsi: dikongsi };
}

function padam(req, pengguna, profil) {
  const fail = DriveApp.getFileById(req.id);
  let pemilik = '';
  try { pemilik = JSON.parse(fail.getDescription() || '{}').uid; } catch (e) {}
  const admin = profil.role === 'admin' || profil.role === 'superadmin';
  if (pemilik !== pengguna.uid && !admin) throw new Error('Anda bukan pemilik fail ini.');
  fail.setTrashed(true);
  return { ok: true };
}

/** Dapatkan / cipta sub-folder bertingkat. Kunci mengelakkan folder pendua bila upload serentak. */
function dapatFolder(laluan) {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    let f = DriveApp.getFolderById(FOLDER_INDUK_ID);
    for (const nama of laluan) {
      const ada = f.getFoldersByName(nama);
      f = ada.hasNext() ? ada.next() : f.createFolder(nama);
    }
    return f;
  } finally {
    kunci.releaseLock();
  }
}

function namaSelamat(s) {
  return String(s).replace(/[\\/:*?"<>|]+/g, '-').slice(0, 150);
}

function jawab(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Jalankan sekali dari editor untuk memberi kebenaran (Drive + UrlFetch) */
function ujiKebenaran() {
  Logger.log(DriveApp.getFolderById(FOLDER_INDUK_ID).getName());
  Logger.log(UrlFetchApp.fetch('https://www.google.com').getResponseCode());
}
