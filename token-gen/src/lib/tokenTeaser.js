export const getTokenTeaser = (tokens = [], manifest = {}) => {
  const teaserTokenCount = Math.max(0, Number(manifest.teaserTokenCount) || 0);
  const totalTokens = Math.max(teaserTokenCount, Number(manifest.totalTokens) || 0);

  return {
    tokens: tokens.slice(0, teaserTokenCount),
    moreCount: totalTokens - teaserTokenCount,
  };
};
