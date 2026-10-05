import packageMetadata from '../../package.json';

export const KIT_SUGGESTION_FORM_NAME = 'kit-suggestion';
export const KIT_SUGGESTION_SCHEMA_VERSION = 'kit-suggestion/1';
export const KIT_SUGGESTION_TIMEOUT_MS = 15000;

const cloneJsonValue = (value) => JSON.parse(JSON.stringify(value));

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

export const captureKitSuggestion = ({ playground, swatches, shareLink }) => {
  const state = cloneJsonValue(playground);
  const finalRenderedPalette = swatches.map(({ name, color, locked }, order) => ({
    order: order + 1,
    role: name,
    value: color,
    locked: Boolean(locked),
  }));

  return deepFreeze({
    playground: state,
    finalRenderedPalette,
    shareLink,
  });
};

export const buildKitSuggestionSnapshot = (capture, submittedAt = new Date().toISOString()) => {
  const state = cloneJsonValue(capture.playground);
  const finalRenderedPalette = cloneJsonValue(capture.finalRenderedPalette);

  return {
    schemaVersion: KIT_SUGGESTION_SCHEMA_VERSION,
    engineVersion: packageMetadata.version,
    submittedAt,
    seed: {
      id: state.kitId,
      name: state.explorationName,
      baseColor: state.baseColor,
      baseInput: state.baseInput,
    },
    harmony: state.harmony,
    themeMode: state.themeMode,
    refinementSettings: {
      hueNudge: state.hueNudge,
      satNudge: state.satNudge,
    },
    finalRenderedPalette,
    swatchEdits: {
      overrides: cloneJsonValue(state.swatchOverrides),
      locks: cloneJsonValue(state.lockedSwatches),
    },
    regenerationState: {
      regenerateCount: state.regenerateCount,
      chaosIndex: state.chaosIndex,
      isChaosMinted: state.isChaosMinted,
      userHasMutated: state.userHasMutated,
    },
    modeStates: {
      currentMode: state.themeMode,
      confirmedModes: cloneJsonValue(state.confirmedModes),
    },
    playgroundState: state,
    shareLink: capture.shareLink,
  };
};

export const submitKitSuggestion = async (
  { email, note, creditOptIn, creditName, snapshot },
  { fetchImpl = globalThis.fetch, timeoutMs = KIT_SUGGESTION_TIMEOUT_MS } = {},
) => {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable');

  const body = new URLSearchParams({
    'form-name': KIT_SUGGESTION_FORM_NAME,
    email: email.trim(),
    note: note.trim(),
    'credit-opt-in': creditOptIn ? 'yes' : '',
    'credit-name': creditOptIn ? creditName.trim() : '',
    snapshot,
  }).toString();
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((resolve, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      controller.abort();
      reject(new Error('Suggestion request timed out'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      Promise.resolve().then(() => fetchImpl('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      })),
      timeout,
    ]);

    if (response?.status !== 200) throw new Error('Suggestion request was not accepted');
    return response;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};
