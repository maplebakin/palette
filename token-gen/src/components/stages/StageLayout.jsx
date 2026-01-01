import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const StageNav = ({ stages, currentStage, onNavigate }) => (
  <nav className="panel-surface-soft border rounded-full px-3 py-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
    {stages.map((stage) => (
      <a
        key={stage.id}
        href={`#${stage.id}`}
        onClick={(event) => onNavigate(event, stage)}
        className={`px-3 py-1 rounded-full transition ${currentStage === stage.label ? 'panel-surface shadow-sm' : 'panel-surface-strong'}`}
        aria-current={currentStage === stage.label ? 'step' : undefined}
      >
        {stage.label}
      </a>
    ))}
  </nav>
);

export const StageSection = ({
  id,
  title,
  subtitle,
  children,
  className = '',
  collapsible = false,
  defaultOpen = true,
  open,
  onToggle,
  ...rest
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = typeof open === 'boolean';
  const isOpen = collapsible ? (isControlled ? open : internalOpen) : true;
  const panelId = id ? `${id}-panel` : undefined;
  const handleToggle = () => {
    if (!collapsible) return;
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    onToggle?.(next);
  };

  return (
    <section id={id} className={`space-y-4 scroll-mt-24 ${className}`} {...rest}>
      <div className="flex flex-col gap-1 pointer-events-auto">
        <p className="text-[10px] uppercase tracking-[0.3em] panel-muted">{title} Stage</p>
        {collapsible ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="group flex items-center justify-between gap-3 text-left relative z-10"
          >
            <span className="text-xl font-bold panel-text">{title}</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <h2 className="text-xl font-bold panel-text">{title}</h2>
        )}
        {subtitle && <p className="text-sm panel-muted">{subtitle}</p>}
      </div>
      <div id={panelId} hidden={collapsible && !isOpen}>
        {children}
      </div>
    </section>
  );
};
