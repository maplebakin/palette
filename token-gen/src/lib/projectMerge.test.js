import { describe, it, expect } from 'vitest';
import { TinyColor } from '@ctrl/tinycolor';
import { mergeProjectColors } from './projectMerge';

const mockProject = {
  projectName: 'Test Project',
  settings: {
    neutralCap: 8,
    maxColors: 40,
    nearDupThreshold: 0.1,
    anchorsAlwaysKeep: true,
  },
  sections: [
    {
      id: 'section-1',
      label: 'Spring',
      kind: 'season',
      baseHex: '#ff0000',
      mode: 'mono',
      locked: false,
      tokens: {
        primary: '#ff0000',
        secondary: '#00ff00',
      },
      colors: [
        { name: 'Red', hex: '#ff0000' },
        { name: 'Green', hex: '#00ff00' },
        { name: 'Blue', hex: '#0000ff' },
      ],
    },
    {
      id: 'section-2',
      label: 'Summer',
      kind: 'season',
      baseHex: '#ffff00',
      mode: 'mono',
      locked: false,
      colors: [
        { name: 'Yellow', hex: '#ffff00' },
        { name: 'Red', hex: '#ff0000' }, // Duplicate
      ],
    },
  ],
};

describe('mergeProjectColors', () => {
  it('should merge colors from all sections, with roles first', () => {
    const merged = mergeProjectColors(mockProject);
    
    // Check total count (duplicates removed)
    expect(merged.length).toBe(4);

    // Check that roles are first
    expect(merged[0].name).toBe('Spring / primary');
    expect(merged[1].name).toBe('Spring / secondary');
    
    // Check that the rest of the colors are present
    const nonRoleNames = merged.slice(2).map(c => c.name);
    expect(nonRoleNames).toContain('Spring / Blue');
    expect(nonRoleNames).toContain('Summer / Yellow');
  });

  it('should remove near-duplicates', () => {
    const project = {
      ...mockProject,
      sections: [
        ...mockProject.sections,
        {
          id: 'section-3',
          label: 'Autumn',
          kind: 'season',
          baseHex: '#fe0000', // Near-duplicate of #ff0000
          mode: 'mono',
          locked: false,
          colors: [{ name: 'Slightly different red', hex: '#fe0000' }],
        },
      ],
    };
    const merged = mergeProjectColors(project);
    // Should not include the near-duplicate red
    expect(merged.find(c => c.hex === '#fe0000')).toBeUndefined();
    expect(merged.length).toBe(4); // Still 4, because the near duplicate is removed
  });

  it('should throttle neutral colors', () => {
    const project = {
      ...mockProject,
      settings: { ...mockProject.settings, neutralCap: 2 },
      sections: [
        ...mockProject.sections,
        {
          id: 'section-neutrals',
          label: 'Neutrals',
          kind: 'state',
          baseHex: '#808080',
          mode: 'mono',
          locked: false,
          colors: [
            { name: 'Gray 1', hex: '#f0f0f0' },
            { name: 'Gray 2', hex: '#e0e0e0' },
            { name: 'Gray 3', hex: '#d0d0d0' },
            { name: 'Gray 4', hex: '#c0c0c0' },
          ],
        },
      ],
    };
    const merged = mergeProjectColors(project);
    const neutrals = merged.filter(c => new TinyColor(c.hex).toHsl().s < 0.12);
    expect(neutrals.length).toBe(2);
  });

  it('should handle sections with no colors or tokens', () => {
    const project = {
      ...mockProject,
      sections: [
        ...mockProject.sections,
        {
          id: 'section-3',
          label: 'Autumn',
          kind: 'season',
          baseHex: '#ff8000',
          mode: 'mono',
          locked: false,
        }
      ]
    };
    const merged = mergeProjectColors(project);
    expect(merged.length).toBe(4);
  });
});
