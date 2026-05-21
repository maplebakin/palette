import React, { useEffect, useMemo, useState } from 'react';
import { Download, Package } from 'lucide-react';
import { PRODUCT_OFFERINGS, DEFAULT_USAGE_LICENSE } from '../lib/exports/productExports.js';

const defaultProductState = {
  offering: 'individual',
  title: 'Untitled Apocapalette Product',
  slug: 'untitled-apocapalette-product',
  price: '$9',
  shortDescription: '',
  longDescription: '',
  tags: 'color palette\ndesign tokens\ncss variables\nfigma tokens\npenpot',
  usageLicense: DEFAULT_USAGE_LICENSE,
};

const miniRoles = ['background', 'text', 'primary', 'accent', 'surface'];

const slugifyInput = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export default function ProductExportBuilder({
  isDev = false,
  themes = [],
  onExport,
  tokens,
  primaryTextColor,
}) {
  const [product, setProduct] = useState(defaultProductState);
  const [selectedIds, setSelectedIds] = useState(['current']);
  const selectedSource = themes.find((theme) => theme.id === selectedIds[0]) || themes[0];
  const [miniPalette, setMiniPalette] = useState({});

  const defaultMiniPalette = useMemo(() => selectedSource?.miniPalette || {}, [selectedSource]);

  useEffect(() => {
    setMiniPalette(defaultMiniPalette);
  }, [defaultMiniPalette]);

  if (!isDev) return null;

  const updateProduct = (key, value) => {
    setProduct((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'title' && (!prev.slug || prev.slug === slugifyInput(prev.title))
        ? { slug: slugifyInput(value) }
        : {}),
    }));
  };

  const toggleTheme = (id) => {
    if (product.offering !== 'bundle') {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const setOffering = (offering) => {
    setProduct((prev) => ({ ...prev, offering }));
    setSelectedIds((prev) => {
      if (offering === 'bundle') return prev.length ? prev : ['current'];
      return [prev[0] || 'current'];
    });
  };

  const submitExport = () => {
    onExport?.({
      offering: product.offering,
      product: {
        title: product.title,
        slug: product.slug,
        price: product.price,
        shortDescription: product.shortDescription,
        longDescription: product.longDescription,
        tags: product.tags,
        usageLicense: product.usageLicense,
        miniPalette: product.offering === 'mini' ? miniPalette : undefined,
      },
      selectedThemeIds: selectedIds,
    });
  };

  const selectedCount = selectedIds.length;
  const canExport = Boolean(product.title.trim() && product.slug.trim() && selectedCount);

  return (
    <div className="mt-5 rounded-lg border panel-surface-soft p-4 space-y-4" data-testid="product-export-builder">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold panel-text">
            <Package size={16} />
            Product Export Builder
          </div>
          <p className="text-xs panel-muted">DEV ONLY - sale-ready product packages, separate from normal theme pack export.</p>
        </div>
        <span className="rounded-md border px-2 py-1 text-[10px] font-bold uppercase panel-muted">Product packaging</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-bold panel-text">
          Offering type
          <select
            value={product.offering}
            onChange={(event) => setOffering(event.target.value)}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          >
            {Object.entries(PRODUCT_OFFERINGS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold panel-text">
          Product title
          <input
            value={product.title}
            onChange={(event) => updateProduct('title', event.target.value)}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          />
        </label>
        <label className="text-xs font-bold panel-text">
          Product slug
          <input
            value={product.slug}
            onChange={(event) => updateProduct('slug', slugifyInput(event.target.value))}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-[140px_1fr_1fr]">
        <label className="text-xs font-bold panel-text">
          Price
          <input
            value={product.price}
            onChange={(event) => updateProduct('price', event.target.value)}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          />
        </label>
        <label className="text-xs font-bold panel-text">
          Short description
          <textarea
            value={product.shortDescription}
            onChange={(event) => updateProduct('shortDescription', event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          />
        </label>
        <label className="text-xs font-bold panel-text">
          Long description
          <textarea
            value={product.longDescription}
            onChange={(event) => updateProduct('longDescription', event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-bold panel-text">
          Tags, one per line
          <textarea
            value={product.tags}
            onChange={(event) => updateProduct('tags', event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          />
        </label>
        <label className="text-xs font-bold panel-text">
          Usage/license
          <textarea
            value={product.usageLicense}
            onChange={(event) => updateProduct('usageLicense', event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text"
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold panel-text">
          {product.offering === 'bundle' ? 'Select theme kits' : 'Select source theme'}
        </legend>
        <div className="grid gap-2 md:grid-cols-2">
          {themes.map((theme) => (
            <label key={theme.id} className="flex items-center gap-2 rounded-md border panel-surface-strong px-3 py-2 text-sm panel-text">
              <input
                type={product.offering === 'bundle' ? 'checkbox' : 'radio'}
                checked={selectedIds.includes(theme.id)}
                onChange={() => toggleTheme(theme.id)}
              />
              {theme.label}
            </label>
          ))}
        </div>
      </fieldset>

      {product.offering === 'mini' && (
        <div className="grid gap-3 md:grid-cols-5">
          {miniRoles.map((role) => (
            <label key={role} className="text-xs font-bold capitalize panel-text">
              {role}
              <input
                type="color"
                value={miniPalette[role] || defaultMiniPalette[role] || '#6366f1'}
                onChange={(event) => setMiniPalette((prev) => ({ ...prev, [role]: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border panel-surface-strong"
              />
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={!canExport}
        onClick={submitExport}
        className="flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shadow transition hover:-translate-y-[1px] disabled:opacity-50"
        style={{
          backgroundColor: tokens.brand.primary,
          color: primaryTextColor,
          boxShadow: `0 12px 30px -20px ${tokens.brand.primary}`,
        }}
      >
        <Download size={14} />
        Export Product Package
      </button>
    </div>
  );
}
