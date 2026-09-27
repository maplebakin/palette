export const buildCopyToastMessage = (hex, copyCount = 0) => {
  const copiedValue = String(hex ?? '').trim().toUpperCase();
  if (copyCount === 0) return `Copied ${copiedValue}.`;
  return `Copied ${copiedValue} — the full token system lives in the kit.`;
};
