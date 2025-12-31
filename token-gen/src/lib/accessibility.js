import { hexToRgb, normalizeHex } from './colorUtils';

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));
const toHex = (value) => clampByte(value).toString(16).padStart(2, '0');

const VISION_MATRICES = {
  protanopia: [
    [0.56667, 0.43333, 0],
    [0.55833, 0.44167, 0],
    [0, 0.24167, 0.75833],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.43333, 0.56667],
    [0, 0.475, 0.525],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
};

export const colorVisionOptions = [
  { key: 'normal', label: 'Normal' },
  { key: 'protanopia', label: 'Protanopia' },
  { key: 'deuteranopia', label: 'Deuteranopia' },
  { key: 'tritanopia', label: 'Tritanopia' },
  { key: 'achromatopsia', label: 'Achromatopsia' },
];

const applyMatrix = ({ r, g, b }, matrix) => ({
  r: r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2],
  g: r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2],
  b: r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2],
});

export const simulateColorVision = (hex, mode = 'normal') => {
  if (mode === 'normal') return normalizeHex(hex, hex);
  const matrix = VISION_MATRICES[mode];
  if (!matrix) return normalizeHex(hex, hex);
  const clean = normalizeHex(hex, null);
  if (!clean) return hex;
  const rgb = hexToRgb(clean);
  const adjusted = applyMatrix(rgb, matrix);
  return `#${toHex(adjusted.r)}${toHex(adjusted.g)}${toHex(adjusted.b)}`;
};
