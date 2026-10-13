// ============================================================
//  hantar-kerja.js — Borang ibu bapa/murid menghantar kerja bagi satu sesi
//  • tanpa akaun (log masuk tanpa nama), nama murid ditulis sendiri
//  • fail disimpan TERTUTUP di Drive (hanya guru boleh buka)
//  • pratonton kerja yang sudah dihantar dari telefon ini + boleh padam
//  • butang Hantar menunjukkan penunjuk loading & kemajuan
// ============================================================
import { esc, ikon, formatTarikh, mesejRalat, toast } from './ui.js';
import { tambahHantaran, buang } from './data.js';
import { tokenTanpaNama } from './auth.js';
import { hantarKerjaMurid, kecilkanGambar, padamKerjaMurid } from './upload.js';

const KUNCI_NAMA = 'pdpr-nama-murid';
const KUNCI_SEJARAH = 'pdpr-hantaran-saya';
const HAD_SEJARAH = 80; // rekod disimpan dalam telefon (dengan gambar kecil)

const bacaJSON = (k, asal) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? asal; } catch { return asal; } };
const tulisJSON = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); }
  catch { // storan penuh: buang gambar kecil rekod lama dan cuba lagi
    try { localStorage.setItem(k, JSON.stringify(v.map((x, i) => (i < v.length - 20 ? { ...x, thumb: '' } : x)))); } catch {}
  }
};
const sejarah = () => bacaJSON(KUNCI_SEJARAH, []);

/** Item yang dihantar dari peranti ini bagi tarikh+sesi */
const itemSesi = (tarikh, sesiId) => sejarah().filter((x) => x.tarikh === tarikh && x.sesi === sesiId);

/** Ringkasan untuk cip di halaman kelas → [{ nama, n }] */
export function hantaranPeranti(tarikh, sesiId) {
  const m = new Map();
  for (const x of itemSesi(tarikh, sesiId)) m.set(x.nama, (m.get(x.nama) || 0) + (x.n || 1));
  return [...m].map(([nama, n]) => ({ nama, n }));
}

function tambahSejarah(rekod) {
  tulisJSON(KUNCI_SEJARAH, [...sejarah(), rekod].slice(-HAD_SEJARAH));
}
function buangSejarah(kunci) {
  tulisJSON(KUNCI_SEJARAH, sejarah().filter((x) => x.kunci !== kunci));
}

/** Gambar kecil (JPEG ~240px) untuk pratonton — disimpan dalam telefon sahaja */
async function buatThumb(fail) {
  if (!fail.type.startsWith('image/')) return '';
  try {
    const bmp = await createImageBitmap(fail);
    const n = Math.min(1, 200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * n); c.height = Math.round(bmp.height * n);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.65);
  } catch { return ''; }
}

function bersihUrl(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { return new URL(v).href; } catch { return ''; }
}

const masaPendek = (iso) => (iso ? new Date(iso).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : '');

/**
 * Buka helaian borang.
 * @param {{tarikh, sesi, kelasId, jd, tetapan, onSiap}} o
 */
export function bukaBorangKerja({ tarikh, sesi, kelasId, jd, tetapan, onSiap }) {
  const HAD = (tetapan.hadSaizMB || 10) * 1024 * 1024;
  const kelas = jd.kelas[kelasId];
  const subjek = jd.subjek[sesi.subjek] || { nama: '?', ringkas: '?' };
  const namaSimpan = bacaJSON(KUNCI_NAMA, {})[kelasId] || '';
  const k = { jenis: 'fail', fail: [], baru: new Set() }; // baru = kunci item yang dihantar dalam sesi borang ini
  let berubah = false;

  const el = document.createElement('div');
  el.className = 'helaian borang-kerja';
  el.innerHTML = `
    <div class="helaian-latar" data-tutup></div>
    <div class="helaian-isi" role="dialog" aria-label="Hantar kerja">
      <div class="helaian-pegang"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><h2 style="margin:0" id="bk-tajuk">Hantar kerja</h2>
          <p class="lembut kecil" style="margin:2px 0 0">${esc(kelas?.nama)} · ${esc(subjek.nama)} · ${esc(formatTarikh(tarikh, 'pendek'))}</p></div>
        <button class="ik-btn" data-tutup aria-label="Tutup" style="color:var(--lembut)">${ikon('tutup')}</button>
      </div>
      <div id="bk-sudah"></div>
      <div id="bk-isi" style="margin-top:14px"></div>
    </div>`;
  document.body.append(el);
  document.body.style.overflow = 'hidden';
  const $ = (s) => el.querySelector(s);

  const tutup = () => {
    el.remove(); document.body.style.overflow = '';
    if (berubah) onSiap?.();
  };
  el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-tutup]')) return;
    if ($('#bk-hantar')?.classList.contains('memuat')) return toast('Sila tunggu sehingga selesai menghantar…');
    tutup();
  });

  // ---------- Senarai kerja yang sudah dihantar (pratonton + padam) ----------
  function lukisSudah(sorot = false) {
    const xs = itemSesi(tarikh, sesi.id);
    if (!xs.length) { $('#bk-sudah').innerHTML = ''; return; }
    $('#bk-sudah').innerHTML = `
      <div class="pratonton-kerja ${sorot ? 'sorot' : ''}">
        <div class="pk-kepala"><b>${sorot ? '✓ Kerja telah dihantar' : 'Sudah dihantar dari telefon ini'}</b><span class="lembut kecil">${xs.length} item</span></div>
        <div class="pk-senarai">${xs.map((x) => `
          <div class="pk-item ${k.baru.has(x.kunci) ? 'baru' : ''}">
            ${x.thumb ? `<img src="${x.thumb}" alt="" class="pk-thumb">`
              : `<span class="pk-ikon">${ikon(x.jenis === 'pautan' ? 'pautan' : 'fail', 22)}</span>`}
            <span class="pk-teks">
              <b>${esc(x.jenis === 'pautan' ? (x.url || 'Pautan') : (x.namaFail || 'Fail'))}</b>
              <small>${esc(x.nama)} · ${masaPendek(x.masa)}${x.catatan ? ' · ' + esc(x.catatan) : ''}</small>
            </span>
            ${x.id ? `<button type="button" class="btn bahaya kecil" data-padam="${esc(x.kunci)}" aria-label="Padam ${esc(x.namaFail || 'item')}">${ikon('sampah', 16)}<span>Padam</span></button>` : ''}
          </div>`).join('')}
        </div>
        <p class="bantuan" style="margin:6px 0 0">Tersalah hantar? Tekan <b>Padam</b>, kemudian hantar semula.</p>
      </div>`;
  }

  $('#bk-sudah').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-padam]');
    if (!b) return;
    const x = sejarah().find((y) => y.kunci === b.dataset.padam);
    if (!x || !confirm(`Padam "${x.namaFail || x.url || 'item ini'}"? Guru tidak akan nampak lagi kerja ini.`)) return;
    b.disabled = true;
    b.classList.add('memuat');
    try {
      await tokenTanpaNama();
      await buang('hantaran', x.id);
      if (x.fileId) padamKerjaMurid(x.fileId, tetapan.appsScriptUrl); // fail Drive → Trash (latar belakang)
      buangSejarah(x.kunci);
      berubah = true;
      toast('Kerja dipadam');
      lukisSudah();
    } catch (err) {
      console.error(err);
      b.disabled = false; b.classList.remove('memuat');
      toast(String(err?.code || '').includes('permission') || String(err?.code || '').includes('not-found')
        ? 'Tidak dapat dipadam dari telefon ini. Sila minta guru memadamnya.' : mesejRalat(err), 'ralat');
    }
  });

  // ---------- Borang ----------
  function lukisBorang() {
    k.fail = [];
    $('#bk-isi').innerHTML = `
      <div class="medan">
        <label for="bk-nama">Nama murid</label>
        <input type="text" id="bk-nama" value="${esc(bacaJSON(KUNCI_NAMA, {})[kelasId] || namaSimpan)}" placeholder="Tulis nama penuh murid" autocomplete="name" maxlength="80">
      </div>
      <div class="tab-segmen" role="tablist" style="margin-bottom:12px">
        <button type="button" data-j="fail" aria-selected="${k.jenis === 'fail'}">${ikon('kamera', 16)} Gambar / Fail</button>
        <button type="button" data-j="pautan" aria-selected="${k.jenis === 'pautan'}">${ikon('pautan', 16)} Pautan video</button>
      </div>
      <div id="bk-fail" ${k.jenis === 'fail' ? '' : 'hidden'}>
        <div class="butang-baris" style="margin-top:0">
          <label class="btn kedua" style="margin:0;flex:1">${ikon('kamera', 18)} Ambil gambar
            <input type="file" accept="image/*" capture="environment" id="bk-kamera" hidden multiple></label>
          <label class="btn kedua" style="margin:0;flex:1">${ikon('fail', 18)} Pilih fail
            <input type="file" id="bk-pilih" hidden multiple accept="image/*,.pdf,.doc,.docx,.mp3,.m4a,.mp4,.mov"></label>
        </div>
        <div class="senarai-fail" id="bk-senarai"></div>
        <p class="bantuan">Boleh pilih beberapa gambar sekali gus. Maks ${tetapan.hadSaizMB || 10} MB setiap fail. Video panjang: gunakan tab "Pautan video".</p>
      </div>
      <div id="bk-pautan" ${k.jenis === 'pautan' ? '' : 'hidden'}>
        <div class="medan"><label for="bk-url">Pautan</label>
          <input type="url" id="bk-url" inputmode="url" placeholder="https://youtu.be/… atau pautan Google Drive"></div>
        <p class="bantuan">Muat naik video ke YouTube (pilih <i>Unlisted</i>) atau Google Drive (kongsi "Anyone with the link"), kemudian tampal pautannya di sini.</p>
      </div>
      <div class="medan"><label for="bk-catatan">Catatan untuk guru (pilihan)</label>
        <input type="text" id="bk-catatan" maxlength="300" placeholder="cth Muka surat 12 sudah siap"></div>
      <button class="btn penuh" id="bk-hantar" disabled>${ikon('upload', 18)}<span>Hantar</span></button>
      <p class="bantuan" style="text-align:center">Kerja murid hanya boleh dilihat oleh guru, tidak dipaparkan secara awam.</p>`;
    pasangBorang();
  }

  const saizMB = (b) => (b / 1024 / 1024).toFixed(1) + ' MB';
  function lukisFail() {
    $('#bk-senarai').innerHTML = k.fail.map((x, i) => `
      <div class="fail-item ${x.ralat ? 'ralat' : x.siap ? 'siap' : ''}">
        ${x.pratonton ? `<img src="${x.pratonton}" alt="" class="fi-thumb">` : ikon(x.siap ? 'tanda' : 'fail', 18)}
        <span class="n">${esc(x.f.name)}</span>
        <span class="s">${x.sedang ? '<i class="pusing"></i>' : ''}${esc(x.ralat || x.status || saizMB(x.f.size))}</span>
        ${x.siap || x.sedang ? '' : `<button type="button" class="ik-btn" data-buang="${i}" style="color:var(--lembut)" aria-label="Buang">${ikon('tutup', 16)}</button>`}
      </div>`).join('');
    semak();
  }
  function semak() {
    const btn = $('#bk-hantar');
    if (!btn || btn.classList.contains('memuat')) return;
    const nama = $('#bk-nama').value.trim();
    const bahanOk = k.jenis === 'fail' ? k.fail.some((x) => !x.ralat && !x.siap) : !!bersihUrl($('#bk-url').value);
    btn.disabled = nama.length < 2 || !bahanOk;
  }
  function setButang(memuat, teks) {
    const btn = $('#bk-hantar');
    btn.classList.toggle('memuat', memuat);
    btn.disabled = memuat;
    btn.innerHTML = memuat ? `<i class="pusing putih"></i><span>${esc(teks)}</span>` : `${ikon('upload', 18)}<span>Hantar</span>`;
    el.querySelectorAll('#bk-isi input, #bk-isi [data-j], #bk-isi label.btn').forEach((x) => x.toggleAttribute('inert', memuat));
  }

  function pasangBorang() {
    const tambahFail = async (fs) => {
      for (const f of fs) {
        const item = { f, ralat: (f.type.startsWith('image/') ? f.size > HAD * 4 : f.size > HAD) ? `Melebihi ${tetapan.hadSaizMB || 10} MB` : '' };
        k.fail.push(item);
        buatThumb(f).then((t) => { item.pratonton = t; lukisFail(); });
      }
      lukisFail();
    };
    $('#bk-kamera').onchange = (e) => { tambahFail(e.target.files); e.target.value = ''; };
    $('#bk-pilih').onchange = (e) => { tambahFail(e.target.files); e.target.value = ''; };
    $('#bk-senarai').onclick = (e) => { const b = e.target.closest('[data-buang]'); if (b) { k.fail.splice(+b.dataset.buang, 1); lukisFail(); } };
    $('#bk-nama').oninput = semak;
    $('#bk-url').oninput = semak;
    el.querySelectorAll('[data-j]').forEach((b) => (b.onclick = () => {
      k.jenis = b.dataset.j;
      el.querySelectorAll('[data-j]').forEach((x) => x.setAttribute('aria-selected', x === b));
      $('#bk-fail').hidden = k.jenis !== 'fail';
      $('#bk-pautan').hidden = k.jenis !== 'pautan';
      semak();
    }));
    $('#bk-hantar').onclick = hantar;
  }

  // ---------- Hantar ----------
  async function hantar() {
    const namaMurid = $('#bk-nama').value.trim().replace(/\s+/g, ' ');
    const catatan = $('#bk-catatan').value.trim();
    const simpanan = bacaJSON(KUNCI_NAMA, {}); simpanan[kelasId] = namaMurid; tulisJSON(KUNCI_NAMA, simpanan);
    setButang(true, 'Menyambung…');

    let uid;
    try { ({ uid } = await tokenTanpaNama()); }
    catch (e) { console.error(e); toast(mesejRalat(e), 'ralat'); setButang(false); semak(); return; }

    const asas = { tarikh, sesi: sesi.id, kelasId, subjekId: sesi.subjek, guruIds: sesi.guru, namaMurid, catatan, uid };
    const rekodAsas = { tarikh, sesi: sesi.id, nama: namaMurid, catatan, n: 1 };
    let berjaya = 0;

    if (k.jenis === 'pautan') {
      setButang(true, 'Menghantar…');
      try {
        const url = bersihUrl($('#bk-url').value);
        const id = await tambahHantaran({ ...asas, jenis: 'pautan', url, fileId: null, namaFail: '' });
        const kunci = id;
        tambahSejarah({ ...rekodAsas, kunci, id, jenis: 'pautan', url, fileId: null, namaFail: '', thumb: '', masa: new Date().toISOString() });
        k.baru.add(kunci);
        berjaya = 1;
      } catch (e) { console.error(e); toast(mesejRalat(e), 'ralat'); setButang(false); semak(); return; }
    } else {
      const senarai = k.fail.filter((x) => !x.ralat && !x.siap);
      const awalan = [subjek.ringkas, namaMurid].join('_').replace(/[\\/:*?"<>|\s]+/g, '-').toUpperCase();
      for (const [i, x] of senarai.entries()) {
        setButang(true, senarai.length > 1 ? `Menghantar ${i + 1}/${senarai.length}…` : 'Menghantar…');
        x.sedang = true; x.status = 'Menghantar…'; lukisFail();
        try {
          const f = await kecilkanGambar(x.f);
          if (f.size > HAD) throw new Error(`Melebihi ${tetapan.hadSaizMB || 10} MB`);
          const r = await hantarKerjaMurid(f, { tarikh, kelas: kelas?.nama, namaMurid, awalan }, tetapan.appsScriptUrl);
          const thumb = x.pratonton || (await buatThumb(x.f));
          // Gambar kecil turut disimpan bersama rekod supaya guru boleh pratonton (hanya guru boleh baca)
          const thumbGuru = thumb && thumb.length < 45000 ? thumb : '';
          const id = await tambahHantaran({ ...asas, jenis: 'fail', fileId: r.id, namaFail: x.f.name, url: '', thumb: thumbGuru });
          tambahSejarah({ ...rekodAsas, kunci: id, id, jenis: 'fail', fileId: r.id, namaFail: x.f.name, url: '', thumb, masa: new Date().toISOString() });
          k.baru.add(id);
          x.siap = true; x.status = 'Dihantar'; berjaya++;
        } catch (e) { console.error(e); x.ralat = mesejRalat(e); }
        x.sedang = false; lukisFail();
      }
    }

    if (!berjaya) { toast('Gagal menghantar. Cuba lagi.', 'ralat'); setButang(false); semak(); return; }
    berubah = true;
    const gagal = k.jenis === 'fail' ? k.fail.filter((x) => x.ralat).length : 0;

    // Paparan selepas hantar: pratonton + butang padam (di atas) dan pilihan seterusnya
    $('#bk-tajuk').textContent = `Terima kasih, ${namaMurid.split(' ')[0]}!`;
    lukisSudah(true);
    $('#bk-isi').innerHTML = `
      ${gagal ? `<div class="notis amaran">${gagal} fail gagal dihantar. Tekan "Hantar lagi" untuk cuba semula.</div>` : ''}
      <div class="butang-baris" style="margin-top:4px">
        <button type="button" class="btn kedua" id="bk-lagi" style="flex:1">${ikon('upload', 18)} Hantar lagi</button>
        <button type="button" class="btn" data-tutup style="flex:1">Selesai</button>
      </div>`;
    $('#bk-lagi').onclick = () => {
      $('#bk-tajuk').textContent = 'Hantar kerja';
      lukisSudah();
      lukisBorang();
    };
    el.querySelector('.helaian-isi').scrollTop = 0;
  }

  lukisSudah();
  lukisBorang();
  setTimeout(() => (namaSimpan ? null : $('#bk-nama')?.focus()), 50);
}
