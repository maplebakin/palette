import React from 'react';

const PlaygroundTokenInspector = ({ tokens, onCopy }) => (
  <section className="playground-token-inspector tasting-panel" aria-label="Sketch token inspector">
    <details>
      <summary>Tokens</summary>
      <div className="playground-token-inspector-content">
        <p>Current sketch&apos;s main CSS custom properties</p>
        <ul>
          {tokens.map(({ name, path, value }) => {
            const cssVariable = `--${path.replace(/\./g, '-')}`;
            return (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => onCopy({ path, value })}
                  aria-label={`Copy ${cssVariable} value ${value}`}
                  title={`Copy ${cssVariable}`}
                >
                  <span>
                    <strong>{cssVariable}</strong>
                    <small>{name}</small>
                  </span>
                  <code>{String(value)}</code>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  </section>
);

export default PlaygroundTokenInspector;
