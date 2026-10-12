// ============================================================
//  cari-kelas.js — Carian kelas yang mesra (laman utama & halaman kelas)
//  "raub", "4 raub", "4raub", "tahun 4", "pra" semuanya berfungsi.
// ============================================================
import { esc, ikon } from './ui.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Adakah kelas sepadan dengan carian? */
export function padanKelas(q, kelas) {
  const t = String(q || '').toLowerCase().trim();
  if (!t) return true;
  const nama = kelas.nama.toLowerCase();
  const tahun = t.match(/^(tahun|thn|darjah)\s*(\d)$/);
  if (tahun) return nama.startsWith(tahun[2] + ' ');
  // setiap perkataan carian mesti ada dalam nama (tertib bebas), atau padanan tanpa ruang
  const kata = t.split(/\s+/).filter(Boolean);
  return kata.every((k) => nama.includes(k)) || norm(nama).includes(norm(t));
}

/** Susun kelas: prasekolah dahulu, kemudian ikut nombor tahun */
export function susunKelas(kamus) {
  return Object.entries(kamus).sort((a, b) =>
    (a[1].jenis === 'pra' ? -1 : 0) - (b[1].jenis === 'pra' ? -1 : 0) ||
    a[1].nama.localeCompare(b[1].nama, 'ms', { numeric: true }));
}

// ---------- Kelas terakhir dilihat (per peranti) ----------
const KUNCI = 'pdpr-kelas-terakhir';
export function kelasTerakhir() {
  try { return JSON.parse(localStorage.getItem(KUNCI) || '[]'); } catch { return []; }
}
export function catatKelas(id) {
  try {
    const s = [id, ...kelasTerakhir().filter((x) => x !== id)].slice(0, 3);
    localStorage.setItem(KUNCI, JSON.stringify(s));
    localStorage.setItem('pdpr-kelas', id);
  } catch {}
}

/**
 * Helaian "Pilih kelas" dengan kotak carian (untuk halaman kelas).
 * @param {{kelas: object, semasa?: string, onPilih: (id) => void}} o
 */
export function bukaPilihKelas({ kelas, semasa, onPilih }) {
  const senarai = susunKelas(kelas);
  const el = document.createElement('div');
  el.className = 'helaian helaian-kelas';
  el.innerHTML = `
    <div class="helaian-latar" data-tutup></div>
    <div class="helaian-isi" role="dialog" aria-label="Pilih kelas">
      <div class="helaian-pegang"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px">
        <h2 style="margin:0">Pilih kelas</h2>
        <button class="ik-btn" data-tutup aria-label="Tutup" style="color:var(--lembut)">${ikon('tutup')}</button>
      </div>
      <div class="cari-kelas" style="position:static;padding-top:0">
        <div class="kotak"><span class="ik-cari">${ikonCari}</span>
          <input type="search" id="pk-cari" placeholder="Taip nama kelas, cth: raub, 4, pra" autocomplete="off" enterkeyhint="go"></div>
      </div>
      <div class="senarai-pilih" id="pk-senarai"></div>
    </div>`;
  document.body.append(el);
  document.body.style.overflow = 'hidden';
  const tutup = () => { el.remove(); document.body.style.overflow = ''; };
  el.querySelectorAll('[data-tutup]').forEach((b) => (b.onclick = tutup));

  const elS = el.querySelector('#pk-senarai');
  const lukis = (q = '') => {
    const ada = senarai.filter(([, k]) => padanKelas(q, k));
    const kump = [['Prasekolah', ada.filter(([, k]) => k.jenis === 'pra')], ['Tahun 1 – 6', ada.filter(([, k]) => k.jenis !== 'pra')]].filter(([, x]) => x.length);
    elS.innerHTML = ada.length ? kump.map(([t, x]) => `
      <div class="seksyen-tajuk" style="margin:12px 0 8px"><h3 style="margin:0">${t}</h3></div>
      <div class="grid-kelas">${x.map(([id, k]) => `<button class="kelas-kad" data-id="${id}" ${id === semasa ? 'aria-current="true"' : ''}><b>${esc(k.nama)}</b></button>`).join('')}</div>`).join('')
      : `<p class="tiada-padanan">Tiada kelas sepadan dengan "${esc(q)}".</p>`;
  };
  lukis();
  const input = el.querySelector('#pk-cari');
  input.oninput = () => lukis(input.value);
  input.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    const pertama = elS.querySelector('[data-id]');
    if (pertama) pertama.click();
  };
  elS.onclick = (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    tutup();
    onPilih(b.dataset.id);
  };
  if (window.matchMedia('(min-width: 700px)').matches) setTimeout(() => input.focus(), 50);
}

export const ikonCari = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
