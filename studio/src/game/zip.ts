// Assembleur ZIP minimaliste (change pack-zip-diff-tuiles) : méthode STORE
// (sans compression — les PNG sont déjà compressés), sans dépendance, adapté
// aux gros packs (morceaux concaténés en Blob, jamais une seule chaîne).
// Suffisant pour le lecteur ZipInputStream du player (noms UTF-8, CRC32).

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
}

function u32(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
}

function dateDos(d = new Date()): { date: number; heure: number } {
  return {
    heure: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
    date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31),
  };
}

export interface EntreeZip {
  path: string;
  data: Uint8Array;
}

export function assemblerZip(entrees: EntreeZip[]): Blob {
  const morceaux: BlobPart[] = [];
  const centrale: Uint8Array[] = [];
  let decalage = 0;
  const { heure, date } = dateDos();
  const encode = new TextEncoder();
  for (const e of entrees) {
    const nom = encode.encode(e.path);
    const crc = crc32(e.data);
    const tete = new Uint8Array(30);
    const vue = new DataView(tete.buffer);
    vue.setUint32(0, 0x04034b50, true);
    vue.setUint16(4, 20, true);
    vue.setUint16(6, 0x0800, true); // drapeau UTF-8
    vue.setUint16(8, 0, true); // méthode STORE
    vue.setUint16(10, heure, true);
    vue.setUint16(12, date, true);
    vue.setUint32(14, crc, true);
    vue.setUint32(18, e.data.length, true);
    vue.setUint32(22, e.data.length, true);
    vue.setUint16(26, nom.length, true);
    vue.setUint16(28, 0, true);
    morceaux.push(tete, nom, e.data as BlobPart);
    const fiche = new Uint8Array(46);
    const cvue = new DataView(fiche.buffer);
    cvue.setUint32(0, 0x02014b50, true);
    cvue.setUint16(4, 20, true);
    cvue.setUint16(6, 20, true);
    cvue.setUint16(8, 0x0800, true);
    cvue.setUint16(10, 0, true);
    cvue.setUint16(12, heure, true);
    cvue.setUint16(14, date, true);
    cvue.setUint32(16, crc, true);
    cvue.setUint32(20, e.data.length, true);
    cvue.setUint32(24, e.data.length, true);
    cvue.setUint16(28, nom.length, true);
    cvue.setUint16(30, 0, true);
    cvue.setUint16(32, 0, true);
    cvue.setUint16(34, 0, true);
    cvue.setUint16(36, 0, true);
    cvue.setUint32(38, 0, true);
    cvue.setUint32(42, decalage, true);
    centrale.push(fiche, nom);
    decalage += 30 + nom.length + e.data.length;
  }
  const tailleCentrale = centrale.reduce((n, m) => n + m.length, 0);
  const fin = new Uint8Array(22);
  const fvue = new DataView(fin.buffer);
  fvue.setUint32(0, 0x06054b50, true);
  fvue.setUint16(8, entrees.length, true);
  fvue.setUint16(10, entrees.length, true);
  fvue.setUint32(12, tailleCentrale, true);
  fvue.setUint32(16, decalage, true);
  return new Blob([...morceaux, ...centrale, fin], { type: "application/zip" });
}
