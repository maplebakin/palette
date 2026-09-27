export const GATE_EVENT = 'apocapalette:request-gate';

export const requestGate = (source) => {
  if (typeof window === 'undefined') return;

  // Gate sources: token-fade, vault-click, multi-select, sticky-bar, see-full-kit.
  window.dispatchEvent(new CustomEvent(GATE_EVENT, { detail: { source } }));
};
