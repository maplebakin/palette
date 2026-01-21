import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const StageNav = ({ stages, currentStage, onNavigate }) => {
  const getStageIndex = (stageLabel) => stages.findIndex(s => s.label === stageLabel);
  const currentIndex = getStageIndex(currentStage);
  
  return (
    <nav className="panel-surface-soft border rounded-full px-2 py-2 flex items-center gap-1 text-xs font-semibold overflow-x-auto max-w-full">
      {stages.map((stage, index) => {
        const isActive = currentStage === stage.label;
        const isCompleted = index < currentIndex;
        
        return (
          <a
            key={stage.id}
            href={`#${stage.id}`}
            onClick={(event) => onNavigate(event, stage)}
            className={`
              px-2.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap flex items-center gap-1
              ${isActive 
                ? 'panel-surface shadow-md scale-105' 
                : isCompleted
                ? 'panel-surface-strong opacity-80 hover:opacity-100'
                : 'panel-surface-strong opacity-60 hover:opacity-80'
              }
            `}
            aria-current={isActive ? 'step' : undefined}
            title={`${stage.label} Stage${isActive ? ' (Current)' : isCompleted ? ' (Completed)' : ' (Upcoming)'}`}
          >
            <span className={`
              w-1.5 h-1.5 rounded-full
              ${isActive 
                ? 'bg-blue-500 dark:bg-blue-400' 
                : isCompleted 
                ? 'bg-green-500 dark:bg-green-400' 
                : 'bg-gray-400 dark:bg-gray-500'
              }
            `} />
            <span className="hidden sm:inline">{stage.label}</span>
            <span className="sm:hidden">
              {stage.label.charAt(0)}
            </span>
          </a>
        );
      })}
    </nav>
  );
};

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
