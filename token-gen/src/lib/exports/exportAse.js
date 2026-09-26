import { parse } from 'culori';

// Adobe Swatch Exchange (.ase) writer.
//
// Layout (all multi-byte values big-endian):
//   "ASEF" magic, uint16 version major (1), uint16 version minor (0),
//   uint32 block count, then one block per color:
//     uint16 block type (0xC001 = color entry), uint32 payload length,
//     uint16 name length in UTF-16 code units INCLUDING the null terminator,
//     name as UTF-16BE + 0x0000, 4-char color model ("RGB "),
//     three float32 values in 0..1, uint16 color type (2 = normal).
//
// One swatch per color, no groups — kept intentionally simple.

const pushUint16BE = (bytes, value) => {
  bytes.push((value >>> 8) & 0xff, value & 0xff);
};

const pushUint32BE = (bytes, value) => {
  bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
};

const pushFloat32BE = (bytes, value) => {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setFloat32(0, value, false);
  const view = new Uint8Array(buffer);
  bytes.push(view[0], view[1], view[2], view[3]);
};

const clamp01 = (value) => Math.min(1, Math.max(0, value ?? 0));

const hexToRgb01 = (hex) => {
  const parsed = parse(String(hex || '').trim());
  if (!parsed || parsed.mode !== 'rgb') return null;
  return [clamp01(parsed.r), clamp01(parsed.g), clamp01(parsed.b)];
};

const pushUtf16BE = (bytes, text) => {
  for (let i = 0; i < text.length; i += 1) {
    pushUint16BE(bytes, text.charCodeAt(i));
  }
};

export function generateAse(colors) {
  const entries = (colors || [])
    .map((color) => {
      const rgb = hexToRgb01(color?.hex);
      if (!rgb) return null;
      return { name: String(color?.name ?? 'Color'), rgb };
    })
    .filter(Boolean);

  const bytes = [];
  for (const char of 'ASEF') bytes.push(char.charCodeAt(0));
  pushUint16BE(bytes, 1); // version major
  pushUint16BE(bytes, 0); // version minor
  pushUint32BE(bytes, entries.length);

  for (const { name, rgb } of entries) {
    const payload = [];
    // Name length counts UTF-16 code units and includes the null terminator.
    pushUint16BE(payload, name.length + 1);
    pushUtf16BE(payload, name);
    pushUint16BE(payload, 0); // null terminator
    for (const char of 'RGB ') payload.push(char.charCodeAt(0));
    for (const channel of rgb) pushFloat32BE(payload, channel);
    pushUint16BE(payload, 2); // color type: normal

    pushUint16BE(bytes, 0xc001); // color entry block
    pushUint32BE(bytes, payload.length);
    bytes.push(...payload);
  }

  return new Uint8Array(bytes);
}
