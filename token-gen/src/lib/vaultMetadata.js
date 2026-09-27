const FORMAT_DETAILS = {
  ase: {
    label: '.ase',
    name: 'Adobe Swatches',
    icon: 'palette',
    metadata: (manifest) => `${manifest.coreColors} core colors · ${manifest.tintsPerColor} tints per color`,
  },
  swatches: {
    label: '.swatches',
    name: 'Procreate Swatches',
    icon: 'layers',
    metadata: (manifest) => `${manifest.coreColors} core colors · ${manifest.tintsPerColor} tints per color`,
  },
  gpl: {
    label: '.gpl',
    name: 'GIMP Palette',
    icon: 'file-text',
    metadata: (manifest) => `${manifest.coreColors} core colors · ${manifest.tintsPerColor} tints per color`,
  },
  css: {
    label: 'CSS',
    name: 'Design tokens',
    icon: 'code',
    metadata: () => 'Semantic token names',
  },
  json: {
    label: 'JSON',
    name: 'Token data',
    icon: 'braces',
    metadata: () => 'Machine-readable token map',
  },
};

export const buildVaultCards = (manifest = {}) => (manifest.formats || []).map((format) => {
  const detail = FORMAT_DETAILS[format] || {
    label: `.${format}`,
    name: `${String(format).toUpperCase()} format`,
    icon: 'file-text',
    metadata: () => 'Production format metadata',
  };

  return {
    format,
    label: detail.label,
    name: detail.name,
    icon: detail.icon,
    metadata: detail.metadata(manifest),
  };
});
