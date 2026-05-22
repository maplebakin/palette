import React, { lazy, Suspense } from 'react';
import { Download, Layers, PackageOpen, Sparkles } from 'lucide-react';
import { StageSection } from './StageLayout.jsx';

const ProductExportBuilder = import.meta.env.DEV
  ? lazy(() => import('../ProductExportBuilder.jsx'))
  : null;

const forgeSections = [
  {
    title: 'Individual Theme Kit',
    description: 'Package one theme with product docs, preview SVGs, tags, license notes, and the full theme pack ZIP.',
    icon: PackageOpen,
  },
  {
    title: 'Multi-Kit Bundle',
    description: 'Bundle multiple selected theme kits with per-theme preview assets and included theme pack ZIPs.',
    icon: Layers,
  },
  {
    title: 'Mini Website Palette / Freebie',
    description: 'Create a lightweight five-color sample with CSS, JSON, preview art, and a paid-product CTA.',
    icon: Sparkles,
  },
];

export default function ProductForgeStage({
  isDev = false,
  tokens,
  primaryTextColor,
  productExportThemes = [],
  onExportProductPackage,
  onDownloadThemePack,
}) {
  if (!isDev || !ProductExportBuilder) return null;

  return (
    <StageSection
      id="product-forge"
      title="Product Forge"
      eyebrow="Project Manager"
      subtitle="Dev-only product packaging hub for sale-ready kits, bundles, freebies, and future listing materials."
      collapsible
      data-testid="product-forge-stage"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-[11px] font-bold panel-muted">
          {['Product Forge', 'Bundle Builder', 'Mini Palette Freebie', 'Product Packages'].map((label) => (
            <span key={label} className="rounded-full border panel-surface-strong px-3 py-1">
              {label}
            </span>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {forgeSections.map((section) => (
            <div key={section.title} className="rounded-lg border panel-surface-soft p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold panel-text">
                <section.icon size={16} />
                {section.title}
              </div>
              <p className="text-xs panel-muted">{section.description}</p>
            </div>
          ))}
        </div>

        {onDownloadThemePack && (
          <div className="rounded-lg border panel-surface-strong p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold panel-text">Standard Theme Pack</p>
                <p className="text-xs panel-muted">Quick access to the normal theme ZIP. This remains separate from product package export.</p>
              </div>
              <button
                type="button"
                onClick={onDownloadThemePack}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shadow transition hover:-translate-y-[1px]"
                style={{
                  backgroundColor: tokens.brand.primary,
                  color: primaryTextColor,
                  boxShadow: `0 12px 30px -20px ${tokens.brand.primary}`,
                }}
              >
                <Download size={14} />
                Download Theme Pack
              </button>
            </div>
          </div>
        )}

        <Suspense fallback={null}>
          <ProductExportBuilder
            isDev={isDev}
            themes={productExportThemes}
            onExport={onExportProductPackage}
            tokens={tokens}
            primaryTextColor={primaryTextColor}
          />
        </Suspense>
      </div>
    </StageSection>
  );
}
