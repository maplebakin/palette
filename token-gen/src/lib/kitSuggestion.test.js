import { describe, expect, it, vi } from 'vitest';
import packageMetadata from '../../package.json';
import {
  buildKitSuggestionSnapshot,
  captureKitSuggestion,
  submitKitSuggestion,
} from './kitSuggestion.js';

const makePlayground = () => ({
  kitId: 'nuclear-winter',
  explorationName: '',
  baseColor: '#7f1d1d',
  baseInput: '#7f1d1d',
  harmony: 'Apocalypse',
  themeMode: 'dark',
  hueNudge: 7,
  satNudge: -3,
  lockedSwatches: { 1: '#441122' },
  swatchOverrides: { 0: '#661122' },
  regenerateCount: 2,
  userHasMutated: true,
  isChaosMinted: false,
  chaosIndex: 0,
  confirmedModes: { dark: true, light: true },
});

describe('kit suggestion snapshot and delivery', () => {
  it('freezes a copy of the exact shown palette and full playground state', () => {
    const playground = makePlayground();
    const swatches = [
      { name: 'Primary', color: '#661122', locked: false },
      { name: 'Secondary', color: '#441122', locked: true },
    ];
    const capture = captureKitSuggestion({ playground, swatches, shareLink: 'https://example.test/#play=abc' });
    playground.baseColor = '#ffffff';
    swatches[0].color = '#ffffff';

    const snapshot = buildKitSuggestionSnapshot(capture, '2026-10-05T15:04:05.000Z');

    expect(snapshot).toMatchObject({
      schemaVersion: 'kit-suggestion/1',
      engineVersion: packageMetadata.version,
      submittedAt: '2026-10-05T15:04:05.000Z',
      seed: { id: 'nuclear-winter', baseColor: '#7f1d1d' },
      harmony: 'Apocalypse',
      themeMode: 'dark',
      refinementSettings: { hueNudge: 7, satNudge: -3 },
      swatchEdits: {
        overrides: { 0: '#661122' },
        locks: { 1: '#441122' },
      },
      regenerationState: { regenerateCount: 2, chaosIndex: 0 },
      modeStates: { confirmedModes: { dark: true, light: true } },
      shareLink: 'https://example.test/#play=abc',
    });
    expect(snapshot.finalRenderedPalette).toEqual([
      { order: 1, role: 'Primary', value: '#661122', locked: false },
      { order: 2, role: 'Secondary', value: '#441122', locked: true },
    ]);
    expect(snapshot.playgroundState.baseColor).toBe('#7f1d1d');
    expect(Object.isFrozen(capture.playground)).toBe(true);
  });

  it('posts every named field as form encoded data and accepts only HTTP 200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200 });

    await submitKitSuggestion({
      email: ' person@example.test ',
      note: '  Keep the warmth.  ',
      creditOptIn: false,
      creditName: 'ignored',
      snapshot: '{"schemaVersion":"kit-suggestion/1"}',
    }, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, request] = fetchImpl.mock.calls[0];
    const body = new URLSearchParams(request.body);
    expect(url).toBe('/');
    expect(request.method).toBe('POST');
    expect(request.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(body.get('form-name')).toBe('kit-suggestion');
    expect(body.get('email')).toBe('person@example.test');
    expect(body.get('note')).toBe('Keep the warmth.');
    expect(body.get('credit-opt-in')).toBe('');
    expect(body.get('credit-name')).toBe('');
    expect(body.get('snapshot')).toBe('{"schemaVersion":"kit-suggestion/1"}');
    expect([...body.keys()]).not.toContain('marketing');

    await expect(submitKitSuggestion({
      email: 'person@example.test', note: '', creditOptIn: false, creditName: '', snapshot: '{}',
    }, { fetchImpl: vi.fn().mockResolvedValue({ status: 202 }) })).rejects.toThrow();
  });

  it('rejects timed out requests', async () => {
    const fetchImpl = vi.fn((_url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));

    await expect(submitKitSuggestion({
      email: 'person@example.test', note: '', creditOptIn: false, creditName: '', snapshot: '{}',
    }, { fetchImpl, timeoutMs: 5 })).rejects.toThrow(/timed out|aborted/i);
  });
});
