// ============================================================
//  hantar-kerja.js — Borang ibu bapa/murid menghantar kerja bagi satu sesi
//  (tanpa akaun; nama ditulis sendiri; fail disimpan TERTUTUP di Drive)
// ============================================================
import { esc, ikon, formatTarikh, mesejRalat, toast } from './ui.js';
import { tambahHantaran } from './data.js';
import { tokenTanpaNama } from './auth.js';
import { hantarKerjaMurid, kecilkanGambar } from './upload.js';

const KUNCI_NAMA = 'pdpr-nama-murid';
const KUNCI_SEJARAH = 'pdpr-hantaran-saya';

const bacaJSON = (k, asal) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? asal; } catch { return asal; } };
const tulisJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/** Hantaran yang dibuat dari peranti ini bagi tarikh+sesi → [{ nama, n }] */
export function hantaranPeranti(tarikh, sesiId) {
  return bacaJSON(KUNCI_SEJARAH, []).filter((x) => x.tarikh === tarikh && x.sesi === sesiId);
}

function catatSejarah(rekod) {
  const s = bacaJSON(KUNCI_SEJARAH, []);
  s.push(rekod);
  tulisJSON(KUNCI_SEJARAH, s.slice(-200));
}

function bersihUrl(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { return new URL(v).href; } catch { return ''; }
}

/**
 * Buka helaian borang.
 * @param {{tarikh, sesi, kelasId, jd, tetapan, onSiap}} o
 */
export function bukaBorangKerja({ tarikh, sesi, kelasId, jd, tetapan, onSiap }) {
  const HAD = (tetapan.hadSaizMB || 10) * 1024 * 1024;
  const kelas = jd.kelas[kelasId];
  const subjek = jd.subjek[sesi.subjek] || { nama: '?', ringkas: '?' };
  const namaSimpan = bacaJSON(KUNCI_NAMA, {})[kelasId] || '';
  const k = { jenis: 'fail', fail: [] };

  const el = document.createElement('div');
  el.className = 'helaian borang-kerja';
  el.innerHTML = `
    <div class="helaian-latar" data-tutup></div>
    <div class="helaian-isi" role="dialog" aria-label="Hantar kerja">
      <div class="helaian-pegang"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><h2 style="margin:0">Hantar kerja</h2>
          <p class="lembut kecil" style="margin:2px 0 0">${esc(kelas?.nama)} · ${esc(subjek.nama)} · ${esc(formatTarikh(tarikh, 'pendek'))}</p></div>
        <button class="ik-btn" data-tutup aria-label="Tutup" style="color:var(--lembut)">${ikon('tutup')}</button>
      </div>
      <div id="bk-isi" style="margin-top:14px">
        <div class="medan">
          <label for="bk-nama">Nama murid</label>
          <input type="text" id="bk-nama" value="${esc(namaSimpan)}" placeholder="Tulis nama penuh murid" autocomplete="name" maxlength="80">
        </div>
        <div class="tab-segmen" role="tablist" style="margin-bottom:12px">
          <button type="button" data-j="fail" aria-selected="true">${ikon('kamera', 16)} Gambar / Fail</button>
          <button type="button" data-j="pautan" aria-selected="false">${ikon('pautan', 16)} Pautan video</button>
        </div>
        <div id="bk-fail">
          <div class="butang-baris" style="margin-top:0">
            <label class="btn kedua" style="margin:0;flex:1">${ikon('kamera', 18)} Ambil gambar
              <input type="file" accept="image/*" capture="environment" id="bk-kamera" hidden multiple></label>
            <label class="btn kedua" style="margin:0;flex:1">${ikon('fail', 18)} Pilih fail
              <input type="file" id="bk-pilih" hidden multiple accept="image/*,.pdf,.doc,.docx,.mp3,.m4a,.mp4,.mov"></label>
          </div>
          <div class="senarai-fail" id="bk-senarai"></div>
          <p class="bantuan">Boleh hantar beberapa gambar sekali gus. Maks ${tetapan.hadSaizMB || 10} MB setiap fail. Video panjang: gunakan tab "Pautan video".</p>
        </div>
        <div id="bk-pautan" hidden>
          <div class="medan"><label for="bk-url">Pautan</label>
            <input type="url" id="bk-url" inputmode="url" placeholder="https://youtu.be/… atau pautan Google Drive"></div>
          <p class="bantuan">Muat naik video ke YouTube (pilih <i>Unlisted</i>) atau Google Drive (kongsi "Anyone with the link"), kemudian tampal pautannya di sini.</p>
        </div>
        <div class="medan"><label for="bk-catatan">Catatan untuk guru (pilihan)</label>
          <input type="text" id="bk-catatan" maxlength="300" placeholder="cth Muka surat 12 sudah siap"></div>
        <button class="btn penuh" id="bk-hantar" disabled>${ikon('upload', 18)} Hantar</button>
        <p class="bantuan" style="text-align:center">Kerja murid hanya boleh dilihat oleh guru, tidak dipaparkan secara awam.</p>
      </div>
    </div>`;
  document.body.append(el);
  document.body.style.overflow = 'hidden';
  const $ = (s) => el.querySelector(s);

  const tutup = () => { el.remove(); document.body.style.overflow = ''; };
  el.querySelectorAll('[data-tutup]').forEach((b) => (b.onclick = tutup));

  const saizMB = (b) => (b / 1024 / 1024).toFixed(1) + ' MB';
  function lukis() {
    $('#bk-senarai').innerHTML = k.fail.map((x, i) => `
      <div class="fail-item ${x.ralat ? 'ralat' : x.siap ? 'siap' : ''}">${ikon(x.siap ? 'tanda' : 'fail', 18)}
        <span class="n">${esc(x.f.name)}</span><span class="s">${esc(x.ralat || x.status || saizMB(x.f.size))}</span>
        ${x.siap || x.sedang ? '' : `<button type="button" class="ik-btn" data-buang="${i}" style="color:var(--lembut)">${ikon('tutup', 16)}</button>`}
      </div>`).join('');
    semak();
  }
  function semak() {
    const nama = $('#bk-nama').value.trim();
    const bahanOk = k.jenis === 'fail' ? k.fail.some((x) => !x.ralat && !x.siap) : !!bersihUrl($('#bk-url').value);
    $('#bk-hantar').disabled = nama.length < 2 || !bahanOk;
  }
  const tambahFail = (fs) => {
    for (const f of fs) k.fail.push({ f, ralat: (f.type.startsWith('image/') ? f.size > HAD * 4 : f.size > HAD) ? `Melebihi ${tetapan.hadSaizMB || 10} MB` : '' });
    lukis();
  };
  $('#bk-kamera').onchange = (e) => { tambahFail(e.target.files); e.target.value = ''; };
  $('#bk-pilih').onchange = (e) => { tambahFail(e.target.files); e.target.value = ''; };
  $('#bk-senarai').onclick = (e) => { const b = e.target.closest('[data-buang]'); if (b) { k.fail.splice(+b.dataset.buang, 1); lukis(); } };
  $('#bk-nama').oninput = semak;
  $('#bk-url').oninput = semak;
  el.querySelectorAll('[data-j]').forEach((b) => (b.onclick = () => {
    k.jenis = b.dataset.j;
    el.querySelectorAll('[data-j]').forEach((x) => x.setAttribute('aria-selected', x === b));
    $('#bk-fail').hidden = k.jenis !== 'fail';
    $('#bk-pautan').hidden = k.jenis !== 'pautan';
    semak();
  }));

  $('#bk-hantar').onclick = async () => {
    const btn = $('#bk-hantar');
    btn.disabled = true;
    const namaMurid = $('#bk-nama').value.trim().replace(/\s+/g, ' ');
    const simpanan = bacaJSON(KUNCI_NAMA, {}); simpanan[kelasId] = namaMurid; tulisJSON(KUNCI_NAMA, simpanan);

    let uid;
    try { ({ uid } = await tokenTanpaNama()); }
    catch (e) { toast('Gagal menyambung: ' + mesejRalat(e), 'ralat'); btn.disabled = false; return; }

    const asas = {
      tarikh, sesi: sesi.id, kelasId, subjekId: sesi.subjek, guruIds: sesi.guru,
      namaMurid, catatan: $('#bk-catatan').value.trim(), uid,
    };
    let berjaya = 0;
    if (k.jenis === 'pautan') {
      try {
        await tambahHantaran({ ...asas, jenis: 'pautan', url: bersihUrl($('#bk-url').value), fileId: null, namaFail: '' });
        berjaya = 1;
      } catch (e) { toast(mesejRalat(e), 'ralat'); btn.disabled = false; return; }
    } else {
      const awalan = [subjek.ringkas, namaMurid].join('_').replace(/[\\/:*?"<>|\s]+/g, '-').toUpperCase();
      for (const x of k.fail) {
        if (x.ralat || x.siap) continue;
        x.sedang = true; x.status = 'Menghantar…'; lukis();
        try {
          const f = await kecilkanGambar(x.f);
          if (f.size > HAD) throw new Error(`Melebihi ${tetapan.hadSaizMB || 10} MB`);
          const r = await hantarKerjaMurid(f, { tarikh, kelas: kelas?.nama, namaMurid, awalan }, tetapan.appsScriptUrl);
          await tambahHantaran({ ...asas, jenis: 'fail', fileId: r.id, namaFail: x.f.name, url: '' });
          x.siap = true; x.status = 'Dihantar'; berjaya++;
        } catch (e) { console.error(e); x.ralat = mesejRalat(e); }
        x.sedang = false; lukis();
      }
    }
    if (!berjaya) { toast('Gagal menghantar. Cuba lagi.', 'ralat'); btn.disabled = false; return; }

    catatSejarah({ tarikh, sesi: sesi.id, nama: namaMurid, n: berjaya, masa: new Date().toISOString() });
    $('#bk-isi').innerHTML = `
      <div style="text-align:center;padding:10px 0 6px">
        <div style="font-size:2.6rem">🎉</div>
        <h3>Terima kasih, ${esc(namaMurid)}!</h3>
        <p class="lembut">${berjaya} ${k.jenis === 'pautan' ? 'pautan' : 'fail'} telah dihantar kepada guru.</p>
        <button class="btn penuh" data-tutup>Selesai</button>
      </div>`;
    el.querySelectorAll('[data-tutup]').forEach((b) => (b.onclick = tutup));
    onSiap?.();
  };
  setTimeout(() => (namaSimpan ? null : $('#bk-nama').focus()), 50);
}
