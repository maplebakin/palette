import React, { useState } from 'react';
import { buildSevenRoleSketchCode } from '../lib/sketchCode.js';

const CODE_FORMATS = [
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'tailwind', label: 'Tailwind' },
];

const PlaygroundCodeExport = ({ roles, onCopy }) => {
  const [format, setFormat] = useState('css');
  const code = buildSevenRoleSketchCode({ roles, format });

  return (
    <section className="playground-code-export tasting-panel" aria-labelledby="playground-code-title">
      <div className="playground-section-heading">
        <div>
          <p className="tasting-eyebrow">Seven roles, ready to use.</p>
          <h2 id="playground-code-title" className="tasting-panel-title">Use it in your project</h2>
        </div>
        <div className="playground-code-tabs" role="tablist" aria-label="Project code format">
          {CODE_FORMATS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={format === option.id}
              onClick={() => setFormat(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <pre className="playground-code-preview"><code>{code}</code></pre>
      <button type="button" className="playground-code-copy" onClick={() => onCopy(code)}>
        Copy code
      </button>
    </section>
  );
};

export default PlaygroundCodeExport;
