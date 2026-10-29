// Session data -> files: trials.csv, questionnaires.csv, events.csv, session.json, packed in one ZIP.

const FIRST = ['participant_id', 'session_id', 'step_id', 'attempt', 'task', 'variant', 'block', 'trial'];

export function toCsv(rows, first = FIRST) {
  if (!rows.length) return '';
  const cols = [...new Set([...first.filter((c) => rows.some((r) => c in r)), ...rows.flatMap(Object.keys)])];
  const cell = (v) => {
    if (v === undefined || v === null) return '';
    const s = typeof v === 'boolean' ? String(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}

const safe = (s) => String(s || 'none').replace(/[^A-Za-z0-9_-]+/g, '-');
export const baseName = (s) => `${safe(s.participant_id)}_${safe(s.session_id)}_${(s.started_at || '').slice(0, 10)}${s.demo ? '_demo' : ''}`;

export function sessionFiles(s) {
  const b = baseName(s);
  const fields = Object.fromEntries(Object.entries(s.fields || {}).map(([k, v]) => [`field_${k}`, v]));
  const withFields = (rows) => rows.map((r) => ({ ...r, ...fields }));
  return [
    [`${b}_trials.csv`, toCsv(withFields(s.trials))],
    [`${b}_questionnaires.csv`, toCsv(withFields(s.answers), ['participant_id', 'session_id', 'step_id', 'attempt', 'questionnaire_id', 'item_id'])],
    [`${b}_events.csv`, toCsv(s.events, ['participant_id', 'session_id', 'step_id', 'event', 'detail', 'time', 'elapsed_ms'])],
    [`${b}_session.json`, JSON.stringify(s, null, 2)],
  ];
}

// ---- minimal ZIP writer (stored, no compression) ------------------------------------------------------------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (u8) => { let c = 0xFFFFFFFF; for (const b of u8) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

export function zip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const [name, content] of files) {
    const data = typeof content === 'string' ? enc.encode(content) : content;
    const fname = enc.encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true); local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, fname.length, true);
    chunks.push(new Uint8Array(local.buffer), fname, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true); cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, fname.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), fname);
    offset += 30 + fname.length + data.length;
  }
  const size = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
