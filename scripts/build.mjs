// Static app: package portable source as a standard ZIP, without dependencies.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['README.md', 'LICENSE', 'package.json', '.gitignore'];
for (const directory of ['dist', 'scripts', 'tests', 'docs']) {
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (entry.isFile() && !entry.name.endsWith('.zip')) files.push(`${directory}/${entry.name}`);
  }
}
files.sort();
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = data => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
let offset = 0;
const local = [], central = [];
for (const name of files) {
  const filename = Buffer.from(`retirement-simulator/${name}`);
  const bytes = await readFile(resolve(root, name));
  const compressed = deflateRawSync(bytes);
  const crc = crc32(bytes);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0x21, 12); // Stable 1980-01-01 DOS date.
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(bytes.length, 22);
  header.writeUInt16LE(filename.length, 26);
  local.push(header, filename, compressed);
  const record = Buffer.alloc(46);
  record.writeUInt32LE(0x02014b50, 0);
  record.writeUInt16LE(20, 4);
  header.copy(record, 6, 4, 30);
  record.writeUInt32LE(offset, 42);
  central.push(record, filename);
  offset += header.length + filename.length + compressed.length;
}
const directory = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const archive = Buffer.concat([...local, directory, end]);
await writeFile(resolve(root, 'dist/source-code.zip'), archive);
console.log(`Static site ready in dist/; source-code.zip: ${files.length} files, ${archive.length} bytes.`);
