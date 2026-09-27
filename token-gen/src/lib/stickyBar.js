export const STICKY_DELAY_MS = 35_000;

export const shouldShowStickyBar = ({
  elapsedMs = 0,
  hasModeConfirmation = false,
  copyCount = 0,
} = {}) => elapsedMs >= STICKY_DELAY_MS && (hasModeConfirmation || copyCount > 0);
