import React from 'react';

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

export const StageSection = ({ id, title, subtitle, children, className = '', ...rest }) => (
  <section id={id} className={`space-y-4 scroll-mt-24 ${className}`} {...rest}>
    <div className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-[0.3em] panel-muted">{title} Stage</p>
      <h2 className="text-xl font-bold panel-text">{title}</h2>
      {subtitle && <p className="text-sm panel-muted">{subtitle}</p>}
    </div>
    {children}
  </section>
);
