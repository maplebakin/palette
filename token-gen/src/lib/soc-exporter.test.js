import { describe, it, expect } from 'vitest';
import { generateSoc } from './soc-exporter';

describe('soc-exporter', () => {
  it('escapes XML-sensitive characters in color names', () => {
    const colors = [
      { name: 'Alpha & Beta <Gamma> "Delta" \'Epsilon\'', hex: '#ffffff' },
    ];
    const xml = generateSoc('Test', colors, { sanitizeNames: false });
    expect(xml).toContain('draw:name="Alpha &amp; Beta &lt;Gamma&gt; &quot;Delta&quot; &apos;Epsilon&apos;"');
  });
});
