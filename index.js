const path = require('node:path');
const fs = require('node:fs');

const FIRST_ATOM = 0x66747970;
const MOOV_ATOM = 0x6d6f6f76;

let [filePath, duration, timescale] = process.argv.slice(2);

filePath = path.normalize(filePath);
duration = parseInt(duration, 10);
timescale = parseInt(timescale, 10) || 1000;

if (!filePath || !duration) {
  console.log('Usage: <file_path> <new_duration> [new_timescale]');

  return;
}

if (fs.existsSync(filePath)) {
  const now = Date.now();
  const buffer = fs.readFileSync(filePath);

  if (buffer.readUInt32BE(4) !== FIRST_ATOM) {
    throw new Error('That file is not an MP4.');
  }

  let header;

  // Optimized way of looking for atoms in an MP4
  for (let i = 0; i < buffer.length; ) {
    if (buffer.readUInt32BE(i + 4) !== MOOV_ATOM) {
      i += buffer.readUInt32BE(i);
    } else {
      const offset = i + 4 * 4;

      header = buffer.slice(offset, offset + buffer.readUInt32BE(offset - 4));

      break;
    }
  }

  // Overwrite the timescale
  header.writeInt32BE(timescale, 4 * 3 /* offset of the timescale field */);
  // Overwrite the duration
  header.writeInt32BE(duration, 4 * 4 /* offset of the duration field */);

  const ext = path.extname(filePath);
  const newPath = path.join(
    __dirname,
    `${path.basename(filePath, ext)}-modified${ext}`,
  );

  fs.writeFileSync(newPath, buffer);

  console.log(`Done in ${(Date.now() - now) / 1000}s`);
  console.log(`Wrote buffer to ${newPath}`);
} else {
  throw new Error(`The file "${filePath}" does not exist`);
}
