/**
 * Applies the full token set to the document root as CSS variables
 * @param {Object} tokens - The full tokens object from generateTokens()
 * @param {string} prefix - Optional prefix for the CSS variables
 */
export const applyTokensToDocument = (tokens, prefix = '') => {
  if (!tokens || typeof tokens !== 'object') {
    console.warn('Invalid tokens object provided to applyTokensToDocument');
    return;
  }

  const root = document.documentElement;
  const safePrefix = prefix ? `${prefix}-` : '';

  // Clear existing token variables to avoid conflicts
  for (let i = 0; i < root.style.length; i++) {
    const property = root.style.item(i);
    if (property.startsWith('--')) {
      // Only remove properties that we know we added (those that follow our naming pattern)
      if (property.includes(safePrefix) || property.startsWith('--foundation') || 
          property.startsWith('--brand') || property.startsWith('--typography') ||
          property.startsWith('--surfaces') || property.startsWith('--cards') ||
          property.startsWith('--glass') || property.startsWith('--entity') ||
          property.startsWith('--status') || property.startsWith('--admin') ||
          property.startsWith('--aliases') || property.startsWith('--dawn')) {
        root.style.removeProperty(property);
      }
    }
  }

  // Recursively apply all token values as CSS variables
  const applyTokenSection = (section, sectionName) => {
    if (!section || typeof section !== 'object') return;

    for (const [key, value] of Object.entries(section)) {
      if (value !== null && value !== undefined) {
        const cssVarName = `--${safePrefix}${sectionName}-${key.replace(/\./g, '-')}`;
        root.style.setProperty(cssVarName, value);
      }
    }
  };

  // Apply each section of tokens
  for (const [sectionName, section] of Object.entries(tokens)) {
    if (section && typeof section === 'object') {
      applyTokenSection(section, sectionName);
    }
  }
};

/**
 * Alternative implementation using the orderedStack approach from buildCssVariables
 * @param {Object} themeMaster - The theme master object containing orderedStack
 * @param {string} prefix - Optional prefix for the CSS variables
 */
export const applyOrderedTokensToDocument = (themeMaster, prefix = '') => {
  if (!themeMaster || !themeMaster.orderedStack) {
    console.warn('Invalid themeMaster object or missing orderedStack');
    return;
  }

  const root = document.documentElement;
  const safePrefix = prefix ? `${prefix}-` : '';

  // Clear existing token variables
  for (let i = 0; i < root.style.length; i++) {
    const property = root.style.item(i);
    if (property.startsWith('--') && (property.includes(safePrefix) || 
        property.includes('-foundation-') || property.includes('-brand-') || 
        property.includes('-typography-') || property.includes('-surfaces-') ||
        property.includes('-cards-') || property.includes('-glass-') ||
        property.includes('-entity-') || property.includes('-status-'))) {
      root.style.removeProperty(property);
    }
  }

  // Apply tokens from orderedStack
  themeMaster.orderedStack?.forEach(({ path, value }) => {
    if (value !== null && value !== undefined) {
      const cssVarName = `--${safePrefix}${path.replace(/\./g, '-')}`;
      root.style.setProperty(cssVarName, value);
    }
  });
};
