# Portal PDPR (Pembelajaran Di Rumah)

Laman web berbilang halaman untuk guru memuat naik bahan PDPR mengikut jadual waktu,
dan untuk murid/ibu bapa melihat bahan mengikut kelas dan tarikh. Ada susun atur
**desktop** (sidebar, grid mingguan) dan **mobile** (tab bawah, senarai hari, kamera).

**Teknologi:** GitHub Pages · Firebase Auth + Firestore · Google Apps Script + Drive

## Status pembinaan

| Fasa | Kandungan | Status |
|---|---|---|
| 1 | Penukar jadual aSc, enjin gabung sesi, laman utama, halaman awam kelas | ✅ |
| 2 | Log masuk Google, pilih nama, Jadual Saya, Upload (fail/kamera/pautan, gabung sesi, guru ganti), Rekod Saya, Admin: papan pemuka, kalendar PDPR, pengguna, tetapan; Apps Script | ✅ |
| 3a | Import jadual XML di laman (versi bertarikh, ID stabil) | ✅ |
| 3b | Prasekolah mod harian | ✅ |
| 3c | Laporan julat tarikh | ⏳ |

## Halaman

| Laluan | Siapa | Fungsi |
|---|---|---|
| `index.html` | Awam | Status hari ini, senarai kelas |
| `kelas.html?k=4-raub&t=2026-10-13` | Awam | Jadual & bahan satu kelas |
| `login.html` → `daftar.html` | Guru | Log masuk Google; pilih nama (kali pertama sahaja) |
| `guru/index.html` | Guru | Jadual Saya: grid mingguan (desktop) / tab hari (mobile) dengan status ✅/⭕ |
| `guru/upload.html` | Guru | Pilih sesi (boleh gabung), fail/gambar kamera/pautan, catatan, guru ganti |
| `guru/kerja.html` | Guru | Kerja murid yang dihantar bagi setiap sesi (fail dibuka secara peribadi) |
| `guru/rekod.html` | Guru | Semua upload saya, padam |
| `guru/cuti.html` | Guru / Admin | Rekod **Cuti** atau urusan **Rasmi** (sepanjang hari / waktu tertentu). Admin boleh rekod untuk mana-mana guru |
| `admin/index.html` | Admin | Pematuhan harian ikut guru/kelas, CSV |
| `admin/kalendar.html` | Admin | Tanda hari PDPR (semua / kelas tertentu, julat tarikh) |
| `admin/pantau.html` | Admin | Pantau Guru: senarai guru, % diisi minggu ini, upload terakhir → lihat jadual/bahan/kerja murid guru (lihat sahaja) |
| `admin/laporan.html` | Admin | Laporan julat tarikh ikut guru/kelas/tarikh · Excel · Cetak/PDF dengan ruang tandatangan |
| `admin/makluman.html` | Admin | Pengumuman untuk ibu bapa / guru dengan tarikh mula & tamat |
| `admin/jadual.html` | Admin | Import XML aSc baharu, pratonton perubahan, versi bertarikh |
| `admin/prasekolah.html` | Admin | Mod harian prasekolah: guru setiap kelas pra, guru tambahan (tiada dalam aSc) |
| `admin/pengguna.html` | Admin | Luluskan Gmail, daftar awal emel (satu/pukal), lantik admin, pautkan semula nama |
| `admin/tetapan.html` | Admin | Nama sekolah, logo, URL Apps Script, had saiz fail |

## Cuba dahulu (mod demo)

Selagi `apiKey` dalam `assets/js/config.js` kosong, laman berjalan dalam **mod demo**:
semua data disimpan dalam browser anda sahaja, semua hari bekerja dianggap PDPR, dan akaun demo
diberi peranan superadmin supaya semua halaman boleh dicuba.

```bash
npx serve .        # atau: python -m http.server 8000
```

## Pemasangan sebenar

### 1. GitHub Pages + domain `pdpr.syazr.com`
1. Cipta repositori (cth `pdpr`), push semua fail (termasuk fail `CNAME`).
2. **Settings → Pages** → Branch `main`, folder `/ (root)`.
3. Di panel DNS domain `syazr.com`, tambah rekod:

   | Jenis | Nama / Host | Nilai |
   |---|---|---|
   | CNAME | `pdpr` | `<akaun-github>.github.io` |

   (Jika guna Cloudflare, set proksi kepada **DNS only** / awan kelabu.)
4. **Settings → Pages → Custom domain** → `pdpr.syazr.com` → Save. Tunggu semakan DNS lulus,
   kemudian tanda **Enforce HTTPS** (sijil mengambil masa beberapa minit hingga sejam).
5. Laman: `https://pdpr.syazr.com`

### 2. Firebase
1. **Project settings → Your apps → Web** → salin config ke `assets/js/config.js`.
2. Dalam `config.js`, isi `SUPERADMIN_EMAIL` dengan emel anda (huruf kecil).
3. **Firestore Database → Create** (lokasi `asia-southeast1`).
4. **Firestore → Rules**: tampal `firestore.rules`, **tukar `EMEL_SUPERADMIN()`** kepada emel yang sama → Publish.
5. **Authentication → Sign-in method → Google** → Enable.
6. **Authentication → Settings → Authorized domains** → tambah `pdpr.syazr.com`.
7. Log masuk pertama kali dengan emel superadmin → anda terus masuk ke Papan Pemuka.
   Pautkan diri anda kepada nama dalam jadual di **Admin → Pengguna** jika anda juga guru.

### 3. Apps Script (simpan fail ke Google Drive)

> ⚠️ Gunakan **akaun Gmail biasa** (bukan DELiMa) untuk Apps Script dan folder Drive.
> Akaun DELiMa biasanya menyekat perkongsian "sesiapa yang ada pautan", jadi ibu bapa tidak dapat membuka fail.

1. Buka https://script.google.com dengan akaun tersebut → **New project** → tampal isi `apps-script/Code.gs`.
2. Pilih fungsi `sediakan` → **Run** → benarkan akses. Folder `PDPR` dicipta automatik dalam My Drive.
3. **Deploy → New deployment → Web app**: *Execute as* = **Me**, *Who has access* = **Anyone** → Deploy.
4. Salin URL `.../exec` → tampal di **Admin → Tetapan → URL Web App** → **Uji sambungan** → Simpan.

Fail disusun automatik **ikut guru**:

```
PDPR / KRY - NUR KHAIRIAH BINTI ROSDI / 2026-10 / 2026-10-13 / 4 RAUB / 4-RAUB_BI_KRY_lembaran.pdf
```

Folder guru ialah **guru asal** sesi (fail guru ganti masuk ke folder guru yang tidak hadir).
Tip: kongsi folder setiap guru kepada guru itu (Viewer) supaya mereka boleh semak bukti sendiri di Drive.
Jika anda ubah `Code.gs`, buat **Deploy → Manage deployments → Edit → New version** (URL kekal sama).

## Aliran akaun guru

1. Admin boleh **daftar awal** emel guru (Admin → Pengguna → Daftar Awal). Guru ini terus masuk ke Jadual Saya.
2. Guru yang belum didaftar memilih nama sendiri selepas log masuk:
   - **DELiMa** (@moe-dl.edu.my) → diluluskan automatik
   - **Gmail** → menunggu kelulusan admin (boleh lihat jadual, belum boleh upload)
3. Satu nama hanya boleh dituntut sekali. Emel kedua untuk guru yang sama didaftar oleh admin.

## Peraturan sesi

- Waktu **berturut-turut** bagi kelas + subjek + guru yang sama digabung automatik (1 upload). Rehat memutuskan gabungan.
- Guru boleh tanda beberapa sesi pada hari yang sama (berjauhan atau kelas gabungan) dan upload sekali.
- Slot berkongsi guru (Tasmik, PI/PM): satu upload oleh mana-mana guru dikira selesai untuk semua.
- **Guru ganti**: tanda "Upload bagi pihak guru lain". Rekod menyimpan guru asal dan siapa yang upload.

## Struktur kod

```
assets/js/config.js    tetapan pemasangan (Firebase, superadmin)
assets/js/firebase.js  muat SDK Firebase
assets/js/data.js      semua akses data (Firestore / localStorage demo)
assets/js/auth.js      log masuk, profil, kawalan akses
assets/js/jadual.js    penukar XML aSc + enjin sesi
assets/js/upload.js    hantar fail ke Apps Script, kecilkan gambar
assets/js/ui.js        rangka awam & app (sidebar/tab bawah), ikon, toast
apps-script/Code.gs    penerima fail Google Drive
firestore.rules        peraturan keselamatan
data/jadual.json       jadual semasa (tukar dengan tools/tukar-jadual.mjs)
```

## Kemas kini jadual waktu

1. Dalam aSc: **File → Export → aSc Timetables 2012 XML**.
2. **Admin → Jadual Waktu** → pilih fail XML → tetapkan **Berkuat kuasa mulai** → semak perubahan → **Simpan**.

- Setiap import ialah **versi bertarikh**. Tarikh sebelum `mulai` kekal menggunakan jadual lama,
  jadi papan pemuka dan rekod minggu lepas tidak berubah.
- ID guru, kelas dan subjek **dipadankan semula ikut nama dan kod** dengan jadual sebelumnya, jadi akaun
  guru kekal terpaut walaupun aSc menjana ID baharu.
- Guru yang tiada dalam jadual baharu disenaraikan dalam pratonton; pautkan semula di **Admin → Pengguna** jika perlu.
- Import pertama turut menyimpan jadual asal (`data/jadual.json`) sebagai versi "Asal" secara automatik.

## Prasekolah (mod harian)

**Admin → Prasekolah**: hidupkan *Mod harian* untuk kelas PRA, dan tandakan guru yang memuat naik.
Setiap kelas mendapat satu sesi **"Aktiviti Harian"** setiap hari PDPR, iaitu 1 upload sehari.
Guru prasekolah yang tiada dalam aSc ditambah sebagai **guru tambahan**, dan boleh memilih nama sendiri semasa log masuk.
Slot aSc kelas pra (cth Pendidikan Islam waktu 7) kekal seperti biasa.

## Cuti & Rasmi

Guru (untuk diri sendiri) atau admin (untuk mana-mana guru) merekod **Cuti** atau **Rasmi** di menu **Cuti & Rasmi**:
julat tarikh, sepanjang hari atau waktu tertentu (cth W6–W11), dan catatan pilihan.

- **Pemantauan adil**: slot guru yang tiada dan belum diisi ditanda 🏠 Cuti / 🏛️ Rasmi dan **tidak dikira** "belum diisi"
  di Pantau Guru, Papan Pemuka, Laporan dan Jadual Saya. Laporan ada lajur Cuti dan Rasmi.
- **Ibu bapa**: slot itu **disembunyikan** di halaman kelas (tiada label atau sebab). Jika bahan sudah dimuat naik
  (diupload awal atau oleh guru ganti), slot dipaparkan seperti biasa.
- Slot berkongsi 2 guru hanya disembunyikan jika **semua** guru slot itu tiada.
- Jenis dan catatan hanya boleh dibaca oleh admin dan guru itu sendiri (koleksi `ketiadaanInfo`);
  koleksi awam `ketiadaan` hanya menyimpan guru, tarikh dan waktu.
- Rekod lewat (cth MC dihantar keesokan hari) dibenarkan; status pemantauan terus dikemas kini.

## Kerja murid

Di halaman kelas, setiap sesi PDPR ada butang **📤 Hantar kerja**. Ibu bapa/murid menulis nama,
kemudian mengambil gambar, memilih fail atau menampal pautan video. Tiada akaun diperlukan
(Firebase **Anonymous Auth** digunakan di belakang tabir).

- Fail disimpan **tertutup** di `PDPR / Kerja Murid / KELAS / bulan / tarikh /` (tidak dikongsi awam).
- Guru melihat kerja di **Guru → Kerja Murid**; fail dibuka melalui Apps Script.
- Jadual Saya menunjukkan "📥 n murid", dan Papan Pemuka menunjukkan bilangan murid yang menghantar.

**Persediaan (sekali):**
1. Firebase → Authentication → Sign-in method → **Anonymous** → Enable.
2. Firestore → Rules → tampal `firestore.rules` terkini → Publish.
3. Apps Script → tampal `apps-script/Code.gs` terkini → **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.

## Indeks Firestore (jimat kuota bacaan)

Cipta 3 indeks komposit di **Firestore → Indexes → Composite → Create index** (rujuk `firestore.indexes.json`):

| Collection | Medan 1 | Medan 2 |
|---|---|---|
| `uploads` | `kelasIds` · Array contains | `tarikh` · Ascending |
| `uploads` | `guruIds` · Array contains | `tarikh` · Ascending |
| `hantaran` | `guruIds` · Array contains | `tarikh` · Ascending |

Tanpa indeks, laman tetap berfungsi tetapi membaca lebih banyak dokumen. Hasil bacaan juga di-cache 90 saat dalam setiap tab.

## Aplikasi telefon (PWA)

Portal boleh dipasang sebagai aplikasi **PDPR CBA4082** (ikon logo sekolah):
- **Android (Chrome):** butang *📲 Pasang aplikasi di telefon* di laman utama, atau menu ⋮ → *Install app*.
- **iPhone (Safari):** Kongsi → *Add to Home Screen*.

Fail: `manifest.webmanifest`, `sw.js`, ikon dalam `assets/img/`.
