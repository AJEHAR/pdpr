/**
 * ============================================================
 *  Portal PDPR — Penerima fail ke Google Drive
 *  Tampal fail ini di https://script.google.com (projek baharu)
 *  Panduan penuh: README.md → "Sediakan Apps Script"
 * ============================================================
 */

// Semua nilai sudah diisi. Tiada apa perlu diubah.
const FIREBASE_API_KEY = 'AIzaSyC4it7TLf7gcU58lNqjPIgfBtxEyfpasK8';
const FIREBASE_PROJECT_ID = 'pdpr-90934';
const NAMA_FOLDER_INDUK = 'PDPR'; // dicipta automatik dalam My Drive akaun yang menjalankan skrip

const HAD_MB = 25; // had keselamatan pelayan (had sebenar ditetapkan di Admin → Tetapan)

/** GET — untuk butang "Uji sambungan" */
function doGet() {
  try {
    const f = folderInduk();
    return jawab({ ok: true, folder: f.getName(), url: f.getUrl(), masa: new Date().toISOString() });
  } catch (e) {
    return jawab({ ok: false, ralat: 'Gagal akses Google Drive: ' + e.message });
  }
}

/**
 * Folder induk "PDPR". Dicipta automatik pada kali pertama, dan ID-nya disimpan
 * dalam Script Properties. Jika folder dipadam/ke Trash, folder baharu dicipta semula.
 */
function folderInduk() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_INDUK_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* folder hilang → cipta semula */ }
  }
  const f = DriveApp.getRootFolder().createFolder(NAMA_FOLDER_INDUK);
  props.setProperty('FOLDER_INDUK_ID', f.getId());
  return f;
}

/** POST — { aksi: 'simpan' | 'padam' | 'murid' | 'lihat', token, ... } */
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const pengguna = sahkanToken(req.token);

    // Kerja murid: ibu bapa/murid (log masuk tanpa nama) — tiada semakan profil
    if (req.aksi === 'murid') return jawab(simpanMurid(req, pengguna));
    if (req.aksi === 'padamMurid') return jawab(padamMurid(req, pengguna));

    const profil = bacaProfil(req.token, pengguna.uid);
    if (!profil || profil.status !== 'lulus') throw new Error('Akaun belum diluluskan admin.');

    if (req.aksi === 'padam') return jawab(padam(req, pengguna, profil));
    if (req.aksi === 'lihat') return jawab(lihat(req));
    return jawab(simpan(req, pengguna));
  } catch (err) {
    return jawab({ ok: false, ralat: String((err && err.message) || err) });
  }
}

/**
 * Simpan kerja murid secara TERTUTUP (tidak dikongsi awam).
 * Struktur: PDPR / Kerja Murid / 4 RAUB / 2026-10 / 2026-10-13 / BI_NAMA-MURID_gambar.jpg
 */
function simpanMurid(req, pengguna) {
  const bait = Utilities.base64Decode(req.data || '');
  if (!bait.length) throw new Error('Fail kosong.');
  if (bait.length > HAD_MB * 1024 * 1024) throw new Error('Fail melebihi ' + HAD_MB + ' MB.');
  const nama = String(req.namaMurid || '').trim();
  if (nama.length < 2) throw new Error('Sila tulis nama murid.');
  const tarikh = /^\d{4}-\d{2}-\d{2}$/.test(req.tarikh) ? req.tarikh : Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');

  const folder = dapatFolder(['Kerja Murid', namaSelamat(req.kelas || 'LAIN-LAIN'), tarikh.slice(0, 7), tarikh]);
  const blob = Utilities.newBlob(bait, req.mime || 'application/octet-stream', namaSelamat(req.nama || 'kerja'));
  const fail = folder.createFile(blob);
  fail.setDescription(JSON.stringify({ jenis: 'murid', uid: pengguna.uid, namaMurid: nama, masa: new Date().toISOString() }));
  return { ok: true, id: fail.getId() };
}

/** Ibu bapa memadam kerja yang dihantar dari telefon yang sama (uid tanpa nama mesti sepadan) */
function padamMurid(req, pengguna) {
  const fail = DriveApp.getFileById(req.id);
  let meta = {};
  try { meta = JSON.parse(fail.getDescription() || '{}'); } catch (e) {}
  if (meta.jenis !== 'murid' || meta.uid !== pengguna.uid) throw new Error('Kerja ini tidak boleh dipadam dari telefon ini.');
  fail.setTrashed(true);
  return { ok: true };
}

/** Guru/admin melihat fail kerja murid (fail peribadi dihantar melalui skrip ini) */
function lihat(req) {
  const fail = DriveApp.getFileById(req.id);
  let meta = {};
  try { meta = JSON.parse(fail.getDescription() || '{}'); } catch (e) {}
  if (meta.jenis !== 'murid') throw new Error('Fail ini bukan kerja murid.');
  const blob = fail.getBlob();
  return { ok: true, nama: fail.getName(), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
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
  let meta = {};
  try { meta = JSON.parse(fail.getDescription() || '{}'); } catch (e) {}
  const admin = profil.role === 'admin' || profil.role === 'superadmin';
  // Kerja murid: mana-mana guru yang diluluskan boleh memadam (cth tersalah hantar)
  if (meta.uid !== pengguna.uid && !admin && meta.jenis !== 'murid') throw new Error('Anda bukan pemilik fail ini.');
  fail.setTrashed(true);
  return { ok: true };
}

/** Dapatkan / cipta sub-folder bertingkat. Kunci mengelakkan folder pendua bila upload serentak. */
function dapatFolder(laluan) {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    let f = folderInduk();
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

/**
 * ▶️ JALANKAN SEKALI dari editor: beri kebenaran (Drive + UrlFetch)
 * dan cipta folder PDPR. Pautan folder dipaparkan dalam Execution log.
 */
function sediakan() {
  const f = folderInduk();
  UrlFetchApp.fetch('https://www.google.com');
  Logger.log('✅ Siap! Folder PDPR: ' + f.getUrl());
}
