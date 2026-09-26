/**
 * The public label is custom only when a user mutation happened or Chaos
 * minted a new exploration. Color distance is intentionally not an input.
 */
export const isCustom = (stateOrUserHasMutated = false, maybeIsChaosMinted = false) => {
  if (stateOrUserHasMutated && typeof stateOrUserHasMutated === 'object') {
    return Boolean(stateOrUserHasMutated.userHasMutated || stateOrUserHasMutated.isChaosMinted);
  }
  return Boolean(stateOrUserHasMutated || maybeIsChaosMinted);
};
