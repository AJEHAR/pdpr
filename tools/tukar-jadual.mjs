// Tukar fail XML aSc kepada data/jadual.json (pilihan — admin juga boleh import terus di laman web)
// Guna:  npm i @xmldom/xmldom   kemudian   node tools/tukar-jadual.mjs "Jadual.xml" data/jadual.json
import { readFileSync, writeFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { parseAscXml } from '../assets/js/jadual.js';

const [, , masuk, keluar = 'data/jadual.json'] = process.argv;
if (!masuk) {
  console.error('Guna: node tools/tukar-jadual.mjs <fail.xml> [keluar.json]');
  process.exit(1);
}
const teks = readFileSync(masuk, 'latin1'); // fail aSc dieksport sebagai windows-1252
const doc = new DOMParser().parseFromString(teks, 'text/xml');
const jadual = parseAscXml(doc);
writeFileSync(keluar, JSON.stringify(jadual));
console.log(
  `OK: ${Object.keys(jadual.kelas).length} kelas, ${Object.keys(jadual.guru).length} guru, ` +
    `${jadual.slot.length} slot → ${keluar}`
);
if (jadual.amaran.length) console.warn('Amaran:', jadual.amaran);
