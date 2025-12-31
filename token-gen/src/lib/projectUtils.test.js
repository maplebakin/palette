import { describe, it, expect } from 'vitest';
import { normalizeProject, DEFAULT_PROJECT_SETTINGS } from './projectUtils';

describe('projectUtils normalizeProject', () => {
  it('fills missing settings with defaults', () => {
    const project = { schemaVersion: 1, projectName: 'Test', sections: [] };
    const normalized = normalizeProject(project);
    expect(normalized.settings).toEqual(DEFAULT_PROJECT_SETTINGS);
  });

  it('accepts palettes as sections input', () => {
    const project = {
      palettes: [
        { id: 'one', label: 'Section One', baseHex: '#fff' },
      ],
    };
    const normalized = normalizeProject(project);
    expect(normalized.sections).toHaveLength(1);
    expect(normalized.sections[0].label).toBe('Section One');
    expect(normalized.sections[0].baseHex).toBe('#ffffff');
  });
});
