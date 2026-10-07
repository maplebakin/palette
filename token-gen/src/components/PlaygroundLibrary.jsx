import React from 'react';

const PlaygroundLibrary = ({
  swatches = [],
  savedPalettes,
  selectedPaletteId,
  saveStatus,
  linkCopied = false,
  onSave,
  onSelectedPaletteChange,
  onLoad,
  onCopyLink,
}) => (
  <section className={`playground-library tasting-panel${['success', 'loaded'].includes(saveStatus) ? ' is-saved' : ''}`} aria-labelledby="playground-library-title">
    <div className="playground-library-heading">
      <div>
        <p className="tasting-eyebrow">Keep it in this browser or share a link</p>
        <h2 id="playground-library-title" className="tasting-panel-title">Save or share this palette</h2>
      </div>
      <div className="playground-library-miniature" aria-hidden="true">
        {swatches.map(({ id, color }) => <span key={id} style={{ backgroundColor: color }} />)}
      </div>
      {savedPalettes.length > 0 && (
        <span className="playground-section-meta">{savedPalettes.length} saved {savedPalettes.length === 1 ? 'palette' : 'palettes'}</span>
      )}
    </div>

    <div className="playground-library-actions">
      <div className="playground-library-save">
        <button type="button" aria-label="Save in this browser" className="playground-library-primary" onClick={onSave}>
          {saveStatus === 'success' ? 'Saved in this browser' : 'Save in this browser'}
        </button>
      </div>

      <button type="button" aria-label="Copy share link" className={`playground-library-secondary${linkCopied ? ' is-copied' : ''}`} onClick={onCopyLink}>
        {linkCopied ? 'Link copied' : 'Copy share link'}
      </button>

      <div className="playground-library-load">
        <label htmlFor="saved-playground-palette">Load a saved palette</label>
        <div>
          <select
            id="saved-playground-palette"
            value={selectedPaletteId}
            onChange={(event) => onSelectedPaletteChange(event.target.value)}
          >
            <option value="">Choose a saved palette</option>
            {savedPalettes.map((palette) => (
              <option key={palette.id} value={palette.id}>
                {palette.name} — {new Date(palette.savedAt).toLocaleString()}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="playground-library-secondary"
            onClick={onLoad}
            disabled={!selectedPaletteId}
          >
            Load palette
          </button>
        </div>
      </div>
    </div>

    <p className="playground-library-promise">
      Free to use and copy. Want the full system with files? <a href="#kit-collection">See the kit ↓</a>
    </p>

    {saveStatus === 'success' && <p className="playground-library-status" role="status">Palette saved in this browser.</p>}
    {saveStatus === 'loaded' && <p className="playground-library-status" role="status">Saved palette loaded.</p>}
    {saveStatus === 'error' && <p className="playground-library-status is-error" role="alert">Couldn&apos;t save this palette. Browser storage may be unavailable or full.</p>}
  </section>
);

export default PlaygroundLibrary;
