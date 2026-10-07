import React, { useState } from 'react';
import { buildSevenRoleSketchCode } from '../lib/sketchCode.js';

const CODE_FORMATS = [
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'tailwind', label: 'Tailwind' },
];

const PlaygroundCodeExport = ({ roles, onCopy, copied = false }) => {
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
      <pre className="playground-code-preview"><code>{code.split(/(#[0-9a-f]{6}|--color-[\w-]+|"[^"]+"|'[^']+'|:root)/gi).map((part, index) => (
        <span key={index} className={/^["']?#[0-9a-f]{6}/i.test(part) ? 'code-value' : /^(--|"|'|:root)/.test(part) ? 'code-property' : undefined}>{part}</span>
      ))}</code></pre>
      <button type="button" aria-label="Copy code" className={`playground-code-copy${copied ? ' is-copied' : ''}`} onClick={() => onCopy(code)}>
        {copied ? 'Copied' : 'Copy code'}
      </button>
    </section>
  );
};

export default PlaygroundCodeExport;
