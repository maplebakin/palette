import React, { useState } from 'react';

const ColorBlindnessSimulator = ({ children }) => {
  const [simulationType, setSimulationType] = useState('none');
  
  // SVG filter matrices for different types of color blindness
  const filters = {
    none: '',
    protanopia: `
      <filter id="protanopia-filter">
        <feColorMatrix type="matrix" values="
          0.567, 0.433, 0,     0, 0
          0.558, 0.442, 0,     0, 0
          0,     0.242, 0.758, 0, 0
          0,     0,     0,     1, 0
        "/>
      </filter>
    `,
    deuteranopia: `
      <filter id="deuteranopia-filter">
        <feColorMatrix type="matrix" values="
          0.625, 0.375, 0,     0, 0
          0.7,   0.3,   0,     0, 0
          0,     0.3,   0.7,   0, 0
          0,     0,     0,     1, 0
        "/>
      </filter>
    `,
    tritanopia: `
      <filter id="tritanopia-filter">
        <feColorMatrix type="matrix" values="
          0.95,  0.05,  0,     0, 0
          0,     0.433, 0.567, 0, 0
          0,     0.475, 0.525, 0, 0
          0,     0,     0,     1, 0
        "/>
      </filter>
    `,
    grayscale: `
      <filter id="grayscale-filter">
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    `,
    contrast: `
      <filter id="high-contrast-filter">
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="1" exponent="0.7" offset="0"/>
          <feFuncG type="gamma" amplitude="1" exponent="0.7" offset="0"/>
          <feFuncB type="gamma" amplitude="1" exponent="0.7" offset="0"/>
        </feComponentTransfer>
      </filter>
    `
  };

  const filterId = simulationType === 'none' ? '' : `${simulationType}-filter`;

  return (
    <div className="color-blindness-simulator">
      <svg width="0" height="0" className="absolute">
        {filters.protanopia}
        {filters.deuteranopia}
        {filters.tritanopia}
        {filters.grayscale}
        {filters.contrast}
      </svg>
      
      <div style={filterId ? { filter: `url(#${filterId})` } : {}}>
        {children}
      </div>
      
      <div className="color-blindness-controls mt-4 p-3 rounded-lg border panel-surface-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium panel-text">Color Vision Simulation:</span>
          <select
            value={simulationType}
            onChange={(e) => setSimulationType(e.target.value)}
            className="px-3 py-1.5 rounded-md text-sm border panel-surface-strong focus:ring-2 focus:ring-[var(--panel-accent)]"
          >
            <option value="none">None</option>
            <option value="protanopia">Protanopia (Red-Green)</option>
            <option value="deuteranopia">Deuteranopia (Red-Green)</option>
            <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
            <option value="grayscale">Grayscale</option>
            <option value="contrast">High/Low Contrast</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ColorBlindnessSimulator;