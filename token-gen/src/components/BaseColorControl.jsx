import React, { useCallback, useRef, useState } from 'react';

const normalizeHexInput = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) return null;
  let hex = match[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6);
  }
  return `#${hex}`;
};

const BaseColorControl = ({
  value,
  onCommit,
  tokens,
  label = 'Base color hex value',
  wrapperClassName = '',
  containerClassName = '',
  inputClassName = '',
  swatchClassName = '',
  showErrorText = true,
  errorTextClassName = '',
}) => {
  const [error, setError] = useState('');
  const [lastValidColor, setLastValidColor] = useState(() => normalizeHexInput(value) || '#000000');
  const colorInputRef = useRef(null);
  const errorColor = tokens?.status?.error || '#ef4444';
  const swatchColor = normalizeHexInput(value) || lastValidColor;

  const commitValue = useCallback((nextValue) => {
    const normalized = normalizeHexInput(nextValue);
    if (!normalized) {
      setError('Enter a hex value like #FF00FF or #ABC');
      return;
    }
    setError('');
    setLastValidColor(normalized);
    if (normalized !== value) {
      onCommit(normalized);
    }
  }, [onCommit, value]);

  const handleInputChange = (event) => {
    commitValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.currentTarget.blur();
  };

  const handleBlur = (event) => {
    commitValue(event.target.value);
  };

  const handleSwatchClick = () => {
    colorInputRef.current?.click();
  };

  const handleColorPick = (event) => {
    commitValue(event.target.value);
  };

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      <div className={`flex items-center gap-2 panel-surface-strong p-1.5 rounded-lg border ${containerClassName}`}>
        <button
          type="button"
          onClick={handleSwatchClick}
          className={`relative rounded overflow-hidden border border-transparent focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2 ${swatchClassName}`}
          aria-label="Choose base color"
        >
          <span className="block w-full h-full" style={{ backgroundColor: swatchColor }} />
        </button>
        <input
          ref={colorInputRef}
          type="color"
          value={swatchColor}
          onChange={handleColorPick}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`bg-transparent panel-text outline-none uppercase border-b border-transparent ${inputClassName}`}
          style={{ borderColor: error ? errorColor : 'transparent' }}
          aria-label={label}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
      {showErrorText && error && (
        <p className={`text-xs font-semibold ${errorTextClassName}`} style={{ color: errorColor }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default BaseColorControl;