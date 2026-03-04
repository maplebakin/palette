import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTheme } from '../theme/engine.js';

vi.mock('../export/index.js', async () => {
  const actual = await vi.importActual('../export/index.js');
  return {
    ...actual,
    downloadFile: vi.fn(),
    exportJson: vi.fn(),
  };
});

const exportIndex = await import('../export/index.js');
const tokenExports = await import('./tokenExports.js');

const buildSampleTheme = () => buildTheme({
  name: 'Test Theme',
  baseColor: '#6633ff',
  mode: 'Monochromatic',
  themeMode: 'dark',
  isDark: true,
  printMode: false,
  apocalypseIntensity: 100,
  harmonyIntensity: 100,
  neutralCurve: 100,
  accentStrength: 100,
  popIntensity: 100,
  importedOverrides: null,
});

describe('token export helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a penpot payload with prefixed token names and export metadata', () => {
    const theme = buildSampleTheme();

    const payload = tokenExports.buildPenpotExportPayload({
      finalTokens: theme.finalTokens,
      orderedStack: theme.orderedStack,
      themeName: 'Test Theme',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      isDark: true,
      printMode: false,
      tokenPrefix: 'demo',
    });

    expect(payload.brand['demo.primary'].value).toBe(theme.finalTokens.brand.primary);
    expect(payload.meta.themeName.value).toBe('Test Theme');
    expect(payload.meta.generatedAt.value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('exports a saved palette collection with schema metadata', () => {
    const palettes = [{ id: 1, name: 'Sunrise' }];

    tokenExports.exportSavedPalettesJson(palettes);

    expect(exportIndex.exportJson).toHaveBeenCalledWith(
      'apocapalette-saved-palettes',
      '',
      expect.objectContaining({
        schemaVersion: 1,
        palettes,
        exportedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });

  it('exports penpot bundles and returns the canonical payload', () => {
    const theme = buildSampleTheme();

    const payload = tokenExports.exportPenpotJsonBundle({
      finalTokens: theme.finalTokens,
      orderedStack: theme.orderedStack,
      themeName: 'Test Theme',
      suffix: '-PRINT',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      isDark: true,
      printMode: true,
      tokenPrefix: 'demo',
    });

    expect(exportIndex.exportJson).toHaveBeenCalledTimes(2);
    expect(exportIndex.exportJson).toHaveBeenNthCalledWith(1, 'Test Theme', '-PRINT', payload);
    expect(exportIndex.exportJson).toHaveBeenNthCalledWith(
      2,
      'Test Theme',
      '-PRINT-PENPOT',
      expect.objectContaining({
        brand: expect.objectContaining({
          demo: expect.objectContaining({
            primary: theme.finalTokens.brand.primary,
          }),
        }),
      })
    );
  });

  it('exports generic, figma, and style dictionary payloads with the expected roots', () => {
    const theme = buildSampleTheme();

    tokenExports.exportGenericJsonTokens({
      finalTokens: theme.finalTokens,
      themeName: 'Generic Theme',
      mode: 'Monochromatic',
      baseColor: '#6633ff',
      isDark: true,
      printMode: false,
      tokenPrefix: 'demo',
    });
    tokenExports.exportFigmaTokensJson({
      finalTokens: theme.finalTokens,
      tokenPrefix: 'fig',
    });
    tokenExports.exportStyleDictionaryJson({
      finalTokens: theme.finalTokens,
      tokenPrefix: 'sd',
    });

    expect(exportIndex.exportJson).toHaveBeenNthCalledWith(
      1,
      'generic-tokens',
      '',
      expect.objectContaining({
        meta: expect.objectContaining({
          schema: 'generic-token-pack-v1',
          themeName: 'Generic Theme',
        }),
      })
    );
    expect(exportIndex.exportJson).toHaveBeenNthCalledWith(
      2,
      'figma-tokens',
      '',
      expect.objectContaining({
        fig: expect.objectContaining({
          brand: expect.any(Object),
        }),
      })
    );
    expect(exportIndex.exportJson).toHaveBeenNthCalledWith(
      3,
      'style-dictionary',
      '',
      expect.objectContaining({
        sd: expect.objectContaining({
          brand: expect.any(Object),
        }),
      })
    );
  });

  it('downloads CSS-based exports with the right filenames and mime types', () => {
    const theme = buildSampleTheme();

    tokenExports.exportCssVariablesFile({
      themeMaster: theme,
      themeName: 'Test Theme',
      tokenPrefix: 'demo',
    });
    tokenExports.exportUiThemeCssFile({
      uiTheme: { '--panel-bg': '#111111' },
      themeClass: 'dark',
      themeName: 'Test Theme',
    });
    tokenExports.exportDesignSpacePaletteFile({
      baseColor: '#6633ff',
      themeName: 'Test Theme',
      mode: 'Monochromatic',
      themeMode: 'dark',
    });

    expect(exportIndex.downloadFile).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filename: 'test-theme-tokens.css',
      mime: 'text/css',
      data: expect.stringContaining('--demo-brand-primary'),
    }));
    expect(exportIndex.downloadFile).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filename: 'test-theme-ui-theme.css',
      mime: 'text/css',
      data: expect.stringContaining(':root.dark'),
    }));
    expect(exportIndex.downloadFile).toHaveBeenNthCalledWith(3, expect.objectContaining({
      filename: 'test-theme-designspace.json',
      mime: 'application/json',
      data: expect.any(String),
    }));

    const paletteJson = JSON.parse(exportIndex.downloadFile.mock.calls[2][0].data);
    expect(paletteJson.name).toBe('Test Theme');
    expect(paletteJson.mode).toBe('dark');
    expect(paletteJson.brandPrimary).toMatch(/^#/);
  });
});
