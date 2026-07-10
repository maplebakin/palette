import React, { useState } from 'react';

const FILTERS = {
  protanopia: [
    0.567, 0.433, 0, 0, 0,
    0.558, 0.442, 0, 0, 0,
    0, 0.242, 0.758, 0, 0,
    0, 0, 0, 1, 0,
  ].join(' '),
  deuteranopia: [
    0.625, 0.375, 0, 0, 0,
    0.7, 0.3, 0, 0, 0,
    0, 0.3, 0.7, 0, 0,
    0, 0, 0, 1, 0,
  ].join(' '),
  tritanopia: [
    0.95, 0.05, 0, 0, 0,
    0, 0.433, 0.567, 0, 0,
    0, 0.475, 0.525, 0, 0,
    0, 0, 0, 1, 0,
  ].join(' '),
};

const ColorBlindnessSimulator = ({ children }) => {
  const [simulationType, setSimulationType] = useState('none');
  const filterId = simulationType === 'none' ? '' : `${simulationType}-filter`;

  return (
    <div className="color-blindness-simulator">
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          {Object.entries(FILTERS).map(([type, values]) => (
            <filter key={type} id={`${type}-filter`}>
              <feColorMatrix type="matrix" values={values} />
            </filter>
          ))}
          <filter id="grayscale-filter">
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="contrast-filter">
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1" exponent="0.7" offset="0" />
              <feFuncG type="gamma" amplitude="1" exponent="0.7" offset="0" />
              <feFuncB type="gamma" amplitude="1" exponent="0.7" offset="0" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div data-testid="color-vision-preview" style={filterId ? { filter: `url(#${filterId})` } : undefined}>
        {children}
      </div>

      <div className="color-blindness-controls mt-4 p-3 rounded-lg border panel-surface-soft">
        <label className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium panel-text">Color Vision Simulation:</span>
          <select
            value={simulationType}
            onChange={(event) => setSimulationType(event.target.value)}
            className="px-3 py-1.5 rounded-md text-sm border panel-surface-strong focus:ring-2 focus:ring-[var(--panel-accent)]"
            aria-label="Color vision simulation"
          >
            <option value="none">None</option>
            <option value="protanopia">Protanopia (Red-Green)</option>
            <option value="deuteranopia">Deuteranopia (Red-Green)</option>
            <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
            <option value="grayscale">Grayscale</option>
            <option value="contrast">High Contrast</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export default ColorBlindnessSimulator;
