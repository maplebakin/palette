export const buildCssVariables = (themeMaster, prefix = '') => {
  const stack = themeMaster?.orderedStack ?? [];
  const safePrefix = prefix ? `${prefix}-` : '';
  const lines = stack.map(({ path, value }) => `  --${safePrefix}${path.replace(/\./g, '-')}: ${value};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
};
