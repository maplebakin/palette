export const PLAYGROUND_SESSION_KEY = 'apocapalette:playground-session:v1';

export const savePlaygroundSession = ({ playground, isCustom, copyCount } = {}) => {
  if (typeof window === 'undefined' || !playground) return;

  const payload = {
    version: 1,
    playground,
    isCustom: Boolean(isCustom),
    copyCount: Math.max(0, Number(copyCount) || 0),
  };

  try {
    // Even reading the localStorage property can throw in restricted browsers.
    window.localStorage.setItem(PLAYGROUND_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // A blocked or full browser store should never interrupt the playground.
  }
};

export const loadPlaygroundSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(PLAYGROUND_SESSION_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (payload?.version !== 1 || !payload.playground || typeof payload.playground !== 'object') return null;

    const playground = {
      ...payload.playground,
      userHasMutated: Boolean(payload.playground.userHasMutated || (
        payload.isCustom && payload.playground.kitId && !payload.playground.isChaosMinted
      )),
    };

    return {
      playground,
      isCustom: Boolean(payload.isCustom),
      copyCount: Math.max(0, Number(payload.copyCount) || 0),
    };
  } catch {
    return null;
  }
};
