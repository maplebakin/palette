export const readPath = (tokens, path) => {
  const parts = path.split('.');
  let current = tokens;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  if (current && typeof current === 'object' && 'value' in current) return current.value;
  return current ?? null;
};

export const flattenTokens = (obj, prefix = []) => {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const path = [...prefix, key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('type' in val && 'value' in val) {
        return acc.concat({ name: path.join('/'), value: val });
      }
      return acc.concat(flattenTokens(val, path));
    }
    return acc.concat({ name: path.join('/'), value: val });
  }, []);
};

export const nestTokens = (root, segments, payload) => {
  let node = root;
  segments.forEach((segment, idx) => {
    if (idx === segments.length - 1) {
      node[segment] = payload;
    } else {
      node[segment] = node[segment] || {};
      node = node[segment];
    }
  });
};
