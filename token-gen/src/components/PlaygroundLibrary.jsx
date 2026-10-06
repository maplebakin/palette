import React from 'react';

const SAVED_PALETTES_COPY = "Saved palettes stay in this browser. They won't sync across devices, and clearing browser data can remove them. Keep a share link if you want to return elsewhere.";

const PlaygroundLibrary = ({
  savedPalettes,
  selectedPaletteId,
  saveStatus,
  onSave,
  onSelectedPaletteChange,
  onLoad,
  onCopyLink,
  showShareLink,
}) => (
  <section className="playground-library tasting-panel" aria-labelledby="playground-library-title">
    <div className="playground-library-heading">
      <div>
        <p className="tasting-eyebrow">Save in this browser</p>
        <h2 id="playground-library-title" className="tasting-panel-title">Save and return</h2>
      </div>
      {savedPalettes.length > 0 && (
        <span className="playground-section-meta">{savedPalettes.length} saved {savedPalettes.length === 1 ? 'palette' : 'palettes'}</span>
      )}
    </div>

    <div className="playground-library-actions">
      <div className="playground-library-save">
        <button type="button" className="playground-library-primary" onClick={onSave}>
          Save palette
        </button>
        <p>{SAVED_PALETTES_COPY}</p>
      </div>

      {showShareLink && (
        <button type="button" className="playground-library-secondary" onClick={onCopyLink}>
          Copy link to this palette
        </button>
      )}

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

    {saveStatus === 'success' && <p className="playground-library-status" role="status">Palette saved in this browser.</p>}
    {saveStatus === 'error' && <p className="playground-library-status is-error" role="alert">Couldn&apos;t save this palette. Browser storage may be unavailable or full.</p>}
  </section>
);

export default PlaygroundLibrary;
