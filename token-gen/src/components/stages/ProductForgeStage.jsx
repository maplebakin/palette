import React, { lazy, Suspense } from 'react';
import { CheckCircle2, Download, FolderOpen, Layers, PackageCheck, PackageOpen, Sparkles } from 'lucide-react';
import { StageSection } from './StageLayout.jsx';

const ProductExportBuilder = import.meta.env.DEV
  ? lazy(() => import('../ProductExportBuilder.jsx'))
  : null;

const forgeSections = [
  {
    title: 'Individual Theme Kit',
    description: 'Package one saved theme kit with docs, preview SVGs, tags, license notes, and the full theme pack ZIP.',
    icon: PackageOpen,
  },
  {
    title: 'Creator Trio / Multi-Kit Bundle',
    description: 'Combine multiple saved kits into one bundle with per-theme preview assets and included theme pack ZIPs.',
    icon: Layers,
  },
  {
    title: 'Mini Website Palette',
    description: 'Export a lightweight sample palette with CSS, JSON, preview art, and a paid-product CTA.',
    icon: Sparkles,
  },
];

const workflowSteps = [
  {
    title: 'Saved Kits',
    description: 'Pick from current, saved, and project kits that are available to product exports.',
  },
  {
    title: 'Product Forge',
    description: 'Build sale-ready individual kits, bundles, and mini palette freebies from saved theme kits.',
  },
  {
    title: 'Bundles / Freebies',
    description: 'Choose the offering type in the builder, then export the matching package.',
  },
  {
    title: 'Ready to Upload',
    description: 'Move generated ZIPs and docs into the product library pattern after export.',
  },
];

const getThemeSourceLabel = (id = '') => {
  if (id === 'current') return 'Current kit';
  if (id.startsWith('saved-')) return 'Saved browser kit';
  if (id.startsWith('project-')) return 'Project kit';
  return 'Theme kit';
};

export default function ProductForgeStage({
  isDev = false,
  tokens,
  primaryTextColor,
  productExportThemes = [],
  onExportProductPackage,
  onDownloadThemePack,
}) {
  if (!isDev || !ProductExportBuilder) return null;
  const safeThemes = Array.isArray(productExportThemes) ? productExportThemes : [];

  return (
    <StageSection
      id="product-forge"
      title="Product Forge"
      eyebrow="Project Manager"
      subtitle="Build sale-ready individual kits, bundles, and mini palette freebies from saved theme kits."
      collapsible
      data-testid="product-forge-stage"
    >
      <div className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <div key={step.title} className="rounded-lg border panel-surface-strong p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold panel-muted">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border panel-surface-soft">
                  {index + 1}
                </span>
                {step.title}
              </div>
              <p className="text-xs panel-muted">{step.description}</p>
            </div>
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

        <div className="rounded-lg border panel-surface-strong p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold panel-text">
                <FolderOpen size={16} />
                Available Export Kits
              </div>
              <p className="text-xs panel-muted">These kits can be selected inside Product Export Builder.</p>
            </div>
            <span className="text-xs panel-muted">{safeThemes.length} available</span>
          </div>
          {safeThemes.length === 0 ? (
            <div className="rounded-md border panel-surface-soft p-3 text-xs panel-muted">
              No export kits are available yet. Capture a kit in Project Manager or save a palette first.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {safeThemes.map((theme) => (
                <div key={theme.id} className="rounded-md border panel-surface-soft p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold panel-text">{theme.label || 'Untitled kit'}</p>
                      <p className="text-[11px] panel-muted">{getThemeSourceLabel(theme.id)}</p>
                    </div>
                    <CheckCircle2 size={15} className="shrink-0 panel-muted" aria-hidden />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] panel-muted">
                    {theme.baseColor && <span>Base {theme.baseColor}</span>}
                    {theme.mode && <span>{theme.mode}</span>}
                    {theme.themeMode && <span>{theme.themeMode}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
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

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border panel-surface-strong p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold panel-text">
              <Layers size={16} />
              Bundle Builder
            </div>
            <p className="text-xs panel-muted">
              Multi-kit bundles are managed by choosing the bundle offering type below, then selecting every kit that belongs in the package.
            </p>
          </div>
          <div className="rounded-lg border panel-surface-strong p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold panel-text">
              <Sparkles size={16} />
              Mini Palette Freebies
            </div>
            <p className="text-xs panel-muted">
              Freebies export lightweight sample palettes and previews without the paid full token files.
            </p>
          </div>
        </div>

        <Suspense fallback={null}>
          <ProductExportBuilder
            isDev={isDev}
            themes={productExportThemes}
            onExport={onExportProductPackage}
            tokens={tokens}
            primaryTextColor={primaryTextColor}
          />
        </Suspense>

        <div className="rounded-lg border panel-surface-strong p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold panel-text">
            <PackageCheck size={16} />
            Product Library / Ready to Upload
          </div>
          <p className="text-xs panel-muted">
            Export history is not stored yet. After generating a product package, keep the ZIP and listing docs with the intended library pattern: products/&lt;product-slug&gt;/.
          </p>
        </div>
      </div>
    </StageSection>
  );
}
