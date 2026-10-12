// ============================================================
//  jadual.js — Penukar jadual aSc (XML) + enjin sesi PDPR
//  Fail ini tiada kebergantungan: boleh digunakan di browser
//  (halaman admin import jadual) dan di Node (tools/tukar-jadual.mjs).
// ============================================================

export const HARI = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];

const pad = (t) => (t && t.length === 4 ? '0' + t : t || '');
const attr = (el, n) => (el.getAttribute(n) || '').trim();
const senarai = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);

/** Jana slug mesra URL daripada nama kelas, cth "2 MARAN 1" → "2-maran-1" */
export function slugKelas(nama) {
  return nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Tukar dokumen XML aSc kepada objek jadual PDPR.
 * @param {Document} doc  hasil DOMParser (browser) atau @xmldom/xmldom (Node)
 */
export function parseAscXml(doc) {
  const tag = (n) => Array.from(doc.getElementsByTagName(n));

  const waktu = tag('period')
    .map((p) => ({ no: +attr(p, 'period'), mula: pad(attr(p, 'starttime')), tamat: pad(attr(p, 'endtime')) }))
    .sort((a, b) => a.no - b.no);

  const subjek = {};
  tag('subject').forEach((s) => (subjek[attr(s, 'id')] = { nama: attr(s, 'name'), ringkas: attr(s, 'short') }));

  const guru = {};
  tag('teacher').forEach((t) => (guru[attr(t, 'id')] = { nama: attr(t, 'name'), ringkas: attr(t, 'short') }));

  const kelas = {};
  tag('class').forEach((c) => {
    const nama = attr(c, 'name');
    kelas[attr(c, 'id')] = {
      nama,
      slug: slugKelas(nama),
      jenis: /^PRA\b/i.test(nama) ? 'pra' : 'biasa',
    };
  });

  const kumpulan = {};
  tag('group').forEach((g) => (kumpulan[attr(g, 'id')] = { nama: attr(g, 'name'), seluruh: attr(g, 'entireclass') === '1' }));

  const pelajaran = {};
  tag('lesson').forEach((l) => {
    pelajaran[attr(l, 'id')] = {
      subjek: attr(l, 'subjectid'),
      kelas: senarai(attr(l, 'classids')),
      guru: senarai(attr(l, 'teacherids')),
      kumpulan: senarai(attr(l, 'groupids')),
    };
  });

  const slot = [];
  const amaran = [];
  tag('card').forEach((c) => {
    const l = pelajaran[attr(c, 'lessonid')];
    if (!l) return amaran.push('Kad tanpa pelajaran: ' + attr(c, 'lessonid'));
    const h = attr(c, 'days').indexOf('1');
    const w = +attr(c, 'period');
    if (h < 0 || !w) return;
    const kump = l.kumpulan
      .map((id) => kumpulan[id])
      .filter((g) => g && !g.seluruh)
      .map((g) => g.nama);
    l.kelas.forEach((k) =>
      slot.push({ h, w, kelas: k, subjek: l.subjek, guru: l.guru, kumpulan: kump, pelajaran: attr(c, 'lessonid'), sumber: 'asc' })
    );
  });

  slot.sort((a, b) => a.h - b.h || a.w - b.w || a.kelas.localeCompare(b.kelas));

  return {
    versi: 1,
    dijana: new Date().toISOString(),
    sumber: 'aSc Timetables',
    waktu,
    kelas,
    guru,
    subjek,
    slot,
    amaran,
  };
}

/** Indeks hari (0=Isnin … 4=Jumaat) daripada 'YYYY-MM-DD'; -1 jika hujung minggu. */
export function indeksHari(tarikh) {
  const d = new Date(tarikh + 'T00:00:00');
  const g = d.getDay(); // 0 Ahad … 6 Sabtu
  return g >= 1 && g <= 5 ? g - 1 : -1;
}

/**
 * Bina senarai SESI untuk satu hari.
 * Waktu berturut-turut (tamat waktu sebelum == mula waktu seterusnya) bagi
 * kelas + subjek + guru + kumpulan yang sama digabung secara automatik.
 * Rehat (10:10–10:30) memutuskan gabungan.
 *
 * @param {object} jadual    hasil parseAscXml
 * @param {number} h         indeks hari 0–4
 * @param {object} [tapis]   { kelasId, guruId }
 * @returns {Array<{id,h,kelas,subjek,guru,kumpulan,waktu:number[],mula,tamat}>}
 */
export function sesiHari(jadual, h, tapis = {}) {
  const W = Object.fromEntries(jadual.waktu.map((w) => [w.no, w]));
  const kunci = (s) => [s.kelas, s.subjek, [...s.guru].sort().join('+'), s.kumpulan.join('+')].join('|');

  const slot = jadual.slot
    .filter((s) => s.h === h)
    .filter((s) => !tapis.kelasId || s.kelas === tapis.kelasId)
    .filter((s) => !tapis.guruId || s.guru.includes(tapis.guruId))
    .sort((a, b) => a.kelas.localeCompare(b.kelas) || a.w - b.w);

  const sesi = [];
  let akhir = null;
  for (const s of slot) {
    const sambung =
      akhir &&
      akhir._k === kunci(s) &&
      W[akhir.waktu[akhir.waktu.length - 1]]?.tamat === W[s.w]?.mula;
    if (sambung) {
      akhir.waktu.push(s.w);
      akhir.tamat = W[s.w]?.tamat;
    } else {
      akhir = {
        _k: kunci(s),
        h,
        kelas: s.kelas,
        subjek: s.subjek,
        guru: [...s.guru],
        kumpulan: [...s.kumpulan],
        waktu: [s.w],
        mula: W[s.w]?.mula,
        tamat: W[s.w]?.tamat,
      };
      sesi.push(akhir);
    }
  }

  return sesi
    .map(({ _k, ...x }) => ({ id: `${x.kelas}_${x.subjek}_${h}_${x.waktu[0]}`, ...x }))
    .sort((a, b) => a.waktu[0] - b.waktu[0] || a.kelas.localeCompare(b.kelas));
}

/** Label waktu ringkas, cth [4,5] → "Waktu 4–5" */
export function labelWaktu(waktu) {
  return waktu.length > 1 ? `Waktu ${waktu[0]}–${waktu[waktu.length - 1]}` : `Waktu ${waktu[0]}`;
}
