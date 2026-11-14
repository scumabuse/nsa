const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const product = 'RAD_RDR_2012_220_02_25_0001_V00';
const folder = 'https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_00000_00089/';
const [sourceFile, labelFile] = process.argv.slice(2);
assert.ok(sourceFile && labelFile, 'Usage: node tools/extract-rad.cjs <NASA TXT> <NASA LBL>');
const source = readFileSync(sourceFile);
const label = readFileSync(labelFile);
const labelText = label.toString('ascii');
const hash = (data) => createHash('sha256').update(data).digest('hex');
assert.equal(hash(source), '4d08d57a55b5c48a72eaf61c554e7ebf31d5a3d50f1f7b8327d9bab8d575fc87');
assert.equal(hash(label), '6eb5e69243b26f845ebeda9575048ac92a72a6f2ae084431170452b4a328c25c');
const records = source.toString('ascii').split(/(?=^\[OBSERVATION:)/m).slice(1);
const observations = records.map((record) => {
  const [, id] = record.match(/^\[OBSERVATION: (\d+)\]/);
  const [, year, day, time] = record.match(/^START_OBS_UTC="(\d{4})-(\d{3}) (\d\d:\d\d:\d\d)"/m);
  const start = Date.UTC(Number(year), 0, Number(day));
  const detector = (name) => {
    const value = record.match(new RegExp('^\\[DOSIMETRY_TOTAL_DOSE_' + name + ': \\d+\\]\\s+([0-9]+\\.[0-9]+)', 'm'));
    return value ? Number(value[1]) : null;
  };
  const b = detector('B');
  const e = detector('E');
  for (const [name, reading] of [['B', b], ['E', e]]) {
    if (reading === null) continue;
    const pointer = labelText.match(new RegExp('\\^OBS' + id.padStart(3, '0') +
      '_TOT_DOSE_' + name + '_ELEMENT\\s*=\\s*\\("[^"]+",\\s*(\\d+) <BYTES>\\)'));
    assert.ok(pointer, 'Missing PDS pointer for ' + id + name);
    const offset = Number(pointer[1]) - 1;
    assert.equal(Number(source.subarray(offset, offset + 7).toString('ascii')), reading);
  }
  const utc = new Date(start).toISOString().slice(0, 10) + 'T' + time + 'Z';
  const [, qc] = record.match(/^QC=([0-9A-F]+)\s*$/mi);
  return { id, utc, qc, b, e };
});
assert.equal(observations.length, 14);
assert.ok(observations.every(({ b, e }) => Number.isFinite(b) && Number.isFinite(e)));
const data = {
  dataset: 'MSL-M-RAD-3-RDR-V1.0',
  product,
  sol: 1,
  unit: 'µGy/h',
  source: folder + product + '.TXT',
  label: folder + product + '.LBL',
  observations,
};
writeFileSync(join(__dirname, '../dist/rad-data.js'), 'globalThis.OrbitRadData = ' + JSON.stringify(data, null, 2) + ';\n');
