// ============================================================
//  ui.js — Rangka halaman (awam & app guru/admin), ikon, toast, tarikh
// ============================================================
import { ZON_MASA } from './config.js';
import { MOD_DEMO, tetapanCache, muatTetapan } from './data.js';

export const akar = new URL('../../', import.meta.url).href;

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** "NUR KHAIRIAH BINTI ROSDI" → "Nur Khairiah binti Rosdi" */
export const namaCantik = (n) =>
  String(n || '').toLowerCase().replace(/(^|[\s'(-])(\p{L})/gu, (m, a, c) => a + c.toUpperCase()).replace(/\b(Bin|Binti|A\/L|A\/P)\b/g, (m) => m.toLowerCase());

// ---------- Tarikh ----------
export const hariIni = () => new Date().toLocaleDateString('en-CA', { timeZone: ZON_MASA });
export function tambahHari(t, n) { const d = new Date(t + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }
export function hariBekerja(t, arah = 1) { while ([0, 6].includes(new Date(t + 'T00:00:00').getDay())) t = tambahHari(t, arah); return t; }
/** Isnin bagi minggu tarikh t */
export function isninMinggu(t) { const g = new Date(t + 'T00:00:00').getDay(); return tambahHari(t, g === 0 ? -6 : 1 - g); }
export const formatTarikh = (t, gaya = 'panjang') =>
  new Date(t + 'T00:00:00').toLocaleDateString('ms-MY', gaya === 'pendek'
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ---------- Ikon (garis, 24px) ----------
const P = {
  blok: '<rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M12 3l4.5 7.5h-9z"/>',
  murid: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/><path d="M12 4v3"/>',
  mata: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  loceng: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  rumah: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  kalendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  senarai: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  carta: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pengguna: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  tetapan: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  lagi: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  dunia: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  kamera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  fail: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  pautan: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  tanda: '<path d="M4 12.5 9.5 18 20 6"/>',
  tutup: '<path d="M6 6l12 12M18 6 6 18"/>',
  kiri: '<path d="M15 5l-7 7 7 7"/>',
  kanan: '<path d="M9 5l7 7-7 7"/>',
  sampah: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
};
export const ikon = (n, saiz = 20) =>
  `<svg class="ik" width="${saiz}" height="${saiz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

// ---------- Jenama (nama & logo dari tetapan) ----------
const logoAsal = akar + 'assets/img/logo-sekolah.png';
const htmlJenama = (t) => `
  <img class="jenama-logo" src="${esc(t.logo || logoAsal)}" alt="">
  <span class="jenama-teks"><b>${esc(t.ringkas || 'PDPR')}</b><small>${esc(t.nama)}</small></span>`;

function kemasJenama(t) {
  document.querySelectorAll('[data-jenama]').forEach((el) => (el.innerHTML = htmlJenama(t)));
  document.querySelectorAll('[data-nama-sekolah]').forEach((el) => (el.textContent = t.nama));
}

function pasangJenama() {
  kemasJenama(tetapanCache());
  muatTetapan().then(kemasJenama).catch(() => {});
}

function barDemo() {
  if (!MOD_DEMO) return '';
  return `<div class="demo-bar">Mod demo — Firebase belum disambung. Data hanya disimpan dalam browser ini.</div>`;
}

// ---------- Rangka awam ----------
export function pasangRangka(aktif) {
  const MENU = [
    { href: 'index.html', label: 'Utama' },
    { href: 'kelas.html', label: 'Jadual Kelas' },
    { href: 'login.html', label: 'Log Masuk Guru' },
  ];
  const h = document.createElement('header');
  h.className = 'topbar';
  h.innerHTML = `
    <a class="jenama" href="${akar}index.html" data-jenama></a>
    <button class="menu-btn" aria-label="Menu" aria-expanded="false">☰</button>
    <nav>${MENU.map((m) => `<a href="${akar}${m.href}" ${m.href === aktif ? 'aria-current="page"' : ''}>${m.label}</a>`).join('')}</nav>`;
  document.body.prepend(h);
  h.insertAdjacentHTML('afterend', barDemo());
  const btn = h.querySelector('.menu-btn');
  btn.onclick = () => btn.setAttribute('aria-expanded', h.classList.toggle('buka'));

  const f = document.createElement('footer');
  f.className = 'kaki';
  f.innerHTML = `© ${new Date().getFullYear()} <span data-nama-sekolah></span> · Portal Pembelajaran Di Rumah`;
  document.body.append(f);
  pasangJenama();
  pasangMakluman('awam').catch(() => {});
  daftarSW();
}

// ---------- Rangka app (guru / admin) ----------
/**
 * Desktop (≥900px): sidebar kiri tetap.  Mobile: bar atas ringkas + tab bawah + helaian "Lagi".
 * @param {string} aktif  laluan relatif, cth 'guru/index.html'
 */
export async function pasangApp(aktif, { u, profil }) {
  const { adalahAdmin, logKeluar } = await import('./auth.js');
  const guru = profil.guruId
    ? [
        { href: 'guru/index.html', label: 'Jadual Saya', pendek: 'Jadual', ikon: 'kalendar' },
        { href: 'guru/upload.html', label: 'Upload Bahan', pendek: 'Upload', ikon: 'upload' },
        { href: 'guru/kerja.html', label: 'Kerja Murid', pendek: 'Murid', ikon: 'murid' },
        { href: 'guru/rekod.html', label: 'Rekod Saya', pendek: 'Rekod', ikon: 'senarai' },
      ]
    : [
        { href: 'guru/kerja.html', label: 'Kerja Murid', pendek: 'Murid', ikon: 'murid' },
        { href: 'guru/upload.html', label: 'Upload (Guru Ganti)', pendek: 'Upload', ikon: 'upload' },
      ];
  const admin = adalahAdmin(profil)
    ? [
        { href: 'admin/index.html', label: 'Papan Pemuka', pendek: 'Papan', ikon: 'carta' },
        { href: 'admin/kalendar.html', label: 'Kalendar PDPR', pendek: 'Kalendar', ikon: 'kalendar' },
        { href: 'admin/pantau.html', label: 'Pantau Guru', pendek: 'Pantau', ikon: 'mata' },
        { href: 'admin/laporan.html', label: 'Laporan', pendek: 'Laporan', ikon: 'carta' },
        { href: 'admin/jadual.html', label: 'Jadual Waktu', pendek: 'Jadual', ikon: 'grid' },
        { href: 'admin/prasekolah.html', label: 'Prasekolah', pendek: 'Pra', ikon: 'blok' },
        { href: 'admin/pengguna.html', label: 'Pengguna', pendek: 'Pengguna', ikon: 'pengguna' },
        { href: 'admin/makluman.html', label: 'Makluman', pendek: 'Makluman', ikon: 'loceng' },
        { href: 'admin/tetapan.html', label: 'Tetapan', pendek: 'Tetapan', ikon: 'tetapan' },
      ]
    : [];
  const awam = [{ href: 'index.html', label: 'Laman Awam', pendek: 'Awam', ikon: 'dunia' }];

  if (new URLSearchParams(location.search).get('lihat') && adalahAdmin(profil)) aktif = 'admin/pantau.html';
  const pautan = (m, kelas = '') =>
    `<a class="${kelas}" href="${akar}${m.href}" ${m.href === aktif ? 'aria-current="page"' : ''}>${ikon(m.ikon)}<span>${m.label}</span></a>`;

  const namaPapar = profil.nama || u.nama || u.email;
  const huruf = (namaPapar || '?').trim()[0]?.toUpperCase() || '?';
  const peranan = { superadmin: 'Superadmin', admin: 'Admin', guru: 'Guru' }[profil.role] || '';

  document.body.classList.add('app');
  const main = document.querySelector('main');

  // Sidebar (desktop)
  const sisi = document.createElement('aside');
  sisi.className = 'sisi';
  sisi.innerHTML = `
    <a class="jenama" href="${akar}${profil.guruId ? 'guru/index.html' : 'admin/index.html'}" data-jenama></a>
    <nav>
      ${profil.guruId || !admin.length ? `<div class="sisi-kump">Guru</div>${guru.map((m) => pautan(m)).join('')}` : ''}
      ${admin.length ? `<div class="sisi-kump">Admin</div>${admin.map((m) => pautan(m)).join('')}` : ''}
      ${!profil.guruId && admin.length ? `<div class="sisi-kump">Lain</div>${guru.map((m) => pautan(m)).join('')}` : ''}
      <div class="sisi-kump"></div>${awam.map((m) => pautan(m)).join('')}
    </nav>
    <div class="profil-kotak">
      <span class="avatar">${esc(huruf)}</span>
      <span class="profil-teks"><b>${esc(namaPapar)}</b><small>${esc(peranan)} · ${esc(u.email)}</small></span>
      <button class="ik-btn" data-keluar title="Log keluar">${ikon('keluar')}</button>
    </div>`;

  // Bar atas (mobile)
  const atas = document.createElement('header');
  atas.className = 'app-atas';
  atas.innerHTML = `<a class="jenama" href="${akar}index.html" data-jenama></a><span class="avatar">${esc(huruf)}</span>`;

  // Tab bawah (mobile)
  const utama = profil.guruId ? guru : [...admin.slice(0, 3)];
  const lain = profil.guruId ? [...admin, ...awam] : [...admin.slice(3), ...guru, ...awam];
  const tab = document.createElement('nav');
  tab.className = 'tab-bawah';
  tab.innerHTML =
    utama.map((m) => `<a href="${akar}${m.href}" ${m.href === aktif ? 'aria-current="page"' : ''}>${ikon(m.ikon, 22)}<span>${m.pendek}</span></a>`).join('') +
    `<button data-lagi ${lain.some((m) => m.href === aktif) ? 'aria-current="page"' : ''}>${ikon('lagi', 22)}<span>Lagi</span></button>`;

  const helaian = document.createElement('div');
  helaian.className = 'helaian';
  helaian.hidden = true;
  helaian.innerHTML = `
    <div class="helaian-latar" data-tutup></div>
    <div class="helaian-isi">
      <div class="helaian-pegang"></div>
      <div class="profil-kotak"><span class="avatar">${esc(huruf)}</span>
        <span class="profil-teks"><b>${esc(namaPapar)}</b><small>${esc(peranan)} · ${esc(u.email)}</small></span></div>
      <nav>${lain.map((m) => pautan(m)).join('')}
        <button class="pautan-keluar" data-keluar>${ikon('keluar')}<span>Log keluar</span></button></nav>
    </div>`;

  document.body.prepend(sisi);
  main.before(atas);
  main.insertAdjacentHTML('beforebegin', barDemo());
  document.body.append(tab, helaian);

  tab.querySelector('[data-lagi]').onclick = () => (helaian.hidden = false);
  helaian.querySelectorAll('[data-tutup]').forEach((e) => (e.onclick = () => (helaian.hidden = true)));
  document.querySelectorAll('[data-keluar]').forEach((b) => (b.onclick = logKeluar));

  pasangMakluman('guru').catch(() => {});
  daftarSW();
  if (profil.status === 'menunggu') {
    main.insertAdjacentHTML('afterbegin', `<div class="notis amaran"><b>Akaun menunggu kelulusan admin.</b> Anda boleh melihat jadual, tetapi belum boleh memuat naik bahan.</div>`);
  }
  pasangJenama();
}

// ---------- Toast ----------
export function toast(mesej, jenis = 'ok') {
  let bekas = document.querySelector('.toast-bekas');
  if (!bekas) { bekas = document.createElement('div'); bekas.className = 'toast-bekas'; document.body.append(bekas); }
  const t = document.createElement('div');
  t.className = `toast ${jenis}`;
  t.textContent = mesej;
  bekas.append(t);
  setTimeout(() => t.classList.add('hilang'), 3200);
  setTimeout(() => t.remove(), 3700);
}

/** Paparkan ralat yang mesra pengguna */
export function mesejRalat(e) {
  const k = e?.code || '';
  if (k.includes('permission-denied')) return 'Anda tiada kebenaran untuk tindakan ini.';
  if (k.includes('unavailable') || k.includes('network')) return 'Tiada sambungan internet. Cuba lagi.';
  if (k === 'auth/popup-closed-by-user' || k === 'auth/cancelled-popup-request') return 'Log masuk dibatalkan.';
  if (k === 'auth/unauthorized-domain') return 'Domain laman ini belum dibenarkan dalam Firebase (Authorized domains).';
  if (k === 'auth/admin-restricted-operation' || k === 'auth/operation-not-allowed')
    return 'Sistem hantar kerja belum diaktifkan oleh sekolah. Sila maklumkan kepada guru.';
  return e?.message || String(e);
}

// ---------- Pantau Guru: jalur "lihat sahaja" dengan tab ----------
/**
 * @param {string} guruId
 * @param {string} nama   nama guru
 * @param {'jadual'|'bahan'|'kerja'} tab
 */
export function pasangJalurLihat(guruId, nama, tab) {
  const q = (h) => `${akar}guru/${h}?lihat=${encodeURIComponent(guruId)}`;
  const T = [['jadual', 'index.html', 'Jadual', 'kalendar'], ['bahan', 'rekod.html', 'Bahan diupload', 'senarai'], ['kerja', 'kerja.html', 'Kerja murid', 'murid']];
  const el = document.createElement('div');
  el.className = 'jalur-lihat';
  el.innerHTML = `
    <div class="jl-atas">
      <a class="btn kedua kecil" href="${akar}admin/pantau.html">${ikon('kiri', 16)} Senarai guru</a>
      <span class="jl-teks">${ikon('mata', 18)} <span>Melihat sebagai <b>${esc(nama)}</b></span></span>
      <span class="lencana amaran">Lihat sahaja</span>
    </div>
    <nav class="tab-segmen jl-tab">${T.map(([k, h, l, i]) => `<a href="${q(h)}" ${k === tab ? 'aria-selected="true"' : ''}>${ikon(i, 16)} ${l}</a>`).join('')}</nav>`;
  document.querySelector('main').prepend(el);
  document.body.classList.add('mod-lihat');
}

// ---------- Makluman (jalur pengumuman) ----------
const KUNCI_TUTUP = 'pdpr-makluman-tutup';
export async function pasangMakluman(sasaran) {
  const { maklumanAktif } = await import('./data.js');
  let tutup = [];
  try { tutup = JSON.parse(localStorage.getItem(KUNCI_TUTUP) || '[]'); } catch {}
  const xs = (await maklumanAktif(sasaran)).filter((m) => !tutup.includes(m.id));
  if (!xs.length) return;
  const el = document.createElement('div');
  el.className = 'makluman-bekas';
  el.innerHTML = xs.map((m) => `
    <div class="makluman ${m.jenis === 'penting' ? 'penting' : ''}" data-id="${esc(m.id)}" role="status">
      <span class="mk-ikon" aria-hidden="true">${m.jenis === 'penting' ? '!' : 'i'}</span>
      <span class="mk-teks">${esc(m.teks)}</span>
      <button class="ik-btn" data-tutup-mk aria-label="Tutup makluman">${ikon('tutup', 16)}</button>
    </div>`).join('');
  document.querySelector('main').prepend(el);
  el.onclick = (e) => {
    const b = e.target.closest('[data-tutup-mk]');
    if (!b) return;
    const kad = b.closest('[data-id]');
    tutup.push(kad.dataset.id);
    try { localStorage.setItem(KUNCI_TUTUP, JSON.stringify(tutup.slice(-50))); } catch {}
    kad.remove();
  };
}

// ---------- PWA: service worker & butang "Pasang aplikasi" ----------
let promptPasang = null;
const sudahDipasang = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const iOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function daftarSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register(akar + 'sw.js').catch((e) => console.warn('SW gagal', e));
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptPasang = e;
  document.querySelectorAll('[data-pasang]').forEach((b) => (b.hidden = false));
});
window.addEventListener('appinstalled', () => document.querySelectorAll('[data-pasang]').forEach((b) => (b.hidden = true)));

/** Pasang tingkah laku pada butang [data-pasang] (tersembunyi jika sudah dipasang / tidak disokong) */
export function pasangButangPasang() {
  document.querySelectorAll('[data-pasang]').forEach((b) => {
    b.hidden = sudahDipasang() || !(promptPasang || iOS());
    b.onclick = async () => {
      if (promptPasang) {
        promptPasang.prompt();
        const r = await promptPasang.userChoice.catch(() => null);
        if (r?.outcome === 'accepted') b.hidden = true;
        promptPasang = null;
        return;
      }
      const el = document.createElement('div');
      el.className = 'helaian borang-kerja';
      el.innerHTML = `
        <div class="helaian-latar" data-tutup></div>
        <div class="helaian-isi" role="dialog" aria-label="Pasang aplikasi">
          <div class="helaian-pegang"></div>
          <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">
            <img src="${akar}assets/img/apple-touch-icon.png" alt="" style="width:56px;height:56px;border-radius:14px;border:1px solid var(--garis)">
            <div><h2 style="margin:0">Pasang PDPR CBA4082</h2><p class="lembut kecil" style="margin:2px 0 0">Buka portal terus dari skrin utama iPhone/iPad.</p></div>
          </div>
          <ol style="padding-left:20px;line-height:1.7;margin:0 0 14px">
            <li>Pastikan dibuka dalam <b>Safari</b>.</li>
            <li>Tekan butang <b>Kongsi</b> (petak dengan anak panah ke atas) di bawah skrin.</li>
            <li>Tatal dan pilih <b>Add to Home Screen / Tambah ke Skrin Utama</b>.</li>
            <li>Tekan <b>Add / Tambah</b>.</li>
          </ol>
          <button class="btn penuh" data-tutup>Faham</button>
        </div>`;
      document.body.append(el);
      el.onclick = (e) => { if (e.target.closest('[data-tutup]')) el.remove(); };
    };
  });
}
