import React, { useMemo, useState } from 'react';
import { Check, Clipboard, Download, TriangleAlert } from 'lucide-react';
import { KITS } from '../../data/kits.js';
import {
  buildKitManifestEntry,
  formatKitManifestEntry,
  getNextArtifactNumber,
  validateArtifactNumber,
} from '../../lib/kitManifest.js';
import { StageSection } from './StageLayout';

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

const downloadJson = (entry) => {
  const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${entry.id}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const PublishStage = ({ palette, onManifestGenerated }) => {
  const [name, setName] = useState('Untitled Forge Kit');
  const [artifactNo, setArtifactNo] = useState(() => getNextArtifactNumber(KITS));
  const [price, setPrice] = useState(9);
  const [teaserTokenCount, setTeaserTokenCount] = useState(12);
  const [copyState, setCopyState] = useState('');

  const artifactValidation = useMemo(
    () => validateArtifactNumber(artifactNo, KITS),
    [artifactNo],
  );
  const manifest = useMemo(
    () => buildKitManifestEntry(palette, {
      name,
      artifactNo: artifactValidation.value,
      price,
      teaserTokenCount,
    }),
    [artifactValidation.value, name, palette, price, teaserTokenCount],
  );
  const manifestCode = useMemo(() => formatKitManifestEntry(manifest), [manifest]);
  const isValid = Boolean(name.trim())
    && artifactValidation.valid
    && Number(price) >= 0
    && Number(teaserTokenCount) >= 0;

  const handleCopy = async () => {
    if (!isValid) return;
    await copyText(manifestCode);
    setCopyState('copied');
    onManifestGenerated?.();
  };

  const handleDownload = () => {
    if (!isValid) return;
    downloadJson(manifest);
    onManifestGenerated?.();
  };

  return (
    <StageSection
      id="publish"
      title="Publish"
      subtitle="Turn the current palette into a collection-ready kit manifest."
    >
      <div className="space-y-5">
        <div className="grid gap-4 rounded-2xl border panel-surface-soft p-4 md:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold panel-text">
            <span>Kit display name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border panel-surface-strong px-3 py-2 text-sm font-normal"
              aria-label="Kit display name"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold panel-text">
            <span>Artifact number</span>
            <input
              value={artifactNo}
              onChange={(event) => setArtifactNo(event.target.value)}
              className="w-full rounded-lg border panel-surface-strong px-3 py-2 text-sm font-normal font-mono"
              aria-label="Artifact number"
              aria-invalid={!artifactValidation.valid}
            />
            <span className={`text-[11px] ${artifactValidation.valid ? 'panel-muted' : 'text-red-600'}`}>
              {artifactValidation.valid ? 'Suggested next free number.' : artifactValidation.message}
            </span>
          </label>
          <label className="space-y-1 text-xs font-semibold panel-text">
            <span>Price</span>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-full rounded-lg border panel-surface-strong px-3 py-2 text-sm font-normal"
              aria-label="Kit price"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold panel-text">
            <span>Teaser token count</span>
            <input
              type="number"
              min="0"
              value={teaserTokenCount}
              onChange={(event) => setTeaserTokenCount(event.target.value)}
              className="w-full rounded-lg border panel-surface-strong px-3 py-2 text-sm font-normal"
              aria-label="Teaser token count"
            />
          </label>
        </div>

        <div className="grid gap-2 rounded-2xl border panel-surface-strong p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="panel-muted">Core colors</span> <strong>{manifest.coreColors}</strong></p>
          <p><span className="panel-muted">Tints per color</span> <strong>{manifest.tintsPerColor}</strong></p>
          <p><span className="panel-muted">Total tokens</span> <strong>{manifest.totalTokens}</strong></p>
          <p><span className="panel-muted">Formats</span> <strong>{manifest.formats.length}</strong></p>
          <p><span className="panel-muted">Modes</span> <strong>{manifest.modes.join(' / ')}</strong></p>
          <p><span className="panel-muted">Contrast matrix</span> <strong>{manifest.includesContrastMatrix ? 'Included' : 'Not included'}</strong></p>
        </div>

        <div className="space-y-3">
          <p className="text-sm panel-muted">
            Paste this object into the KITS array in token-gen/src/data/kits.js, then commit and push — the kit appears in the tasting room&apos;s collection.
          </p>
          <pre
            className="max-h-[32rem] overflow-auto rounded-2xl border bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 shadow-inner"
            data-testid="kit-manifest-code"
          >
            <code>{manifestCode}</code>
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!isValid}
              className="inline-flex items-center gap-2 rounded-full border panel-surface-strong px-4 py-2 text-xs font-bold shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copyState === 'copied' ? <Check size={14} /> : <Clipboard size={14} />}
              {copyState === 'copied' ? 'Manifest copied' : 'Copy manifest entry'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!isValid}
              className="inline-flex items-center gap-2 rounded-full border panel-surface-strong px-4 py-2 text-xs font-bold shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} />
              Download entry (.json)
            </button>
            {!isValid && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600" role="alert">
                <TriangleAlert size={13} />
                Fix the artifact number before generating this entry.
              </span>
            )}
          </div>
        </div>
      </div>
    </StageSection>
  );
};

export default PublishStage;
