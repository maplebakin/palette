import React from 'react';
import { Check, Circle } from 'lucide-react';

const PipelineRail = ({ stages, onNavigate }) => (
  <aside className="forge-pipeline-rail" aria-label="Forge pipeline">
    <p className="forge-pipeline-rail-label">Pipeline</p>
    <nav className="forge-pipeline-rail-nav">
      {stages.map((stage) => {
        const isCurrent = stage.status === 'current';
        const isDone = stage.done;
        return (
          <button
            key={stage.id}
            type="button"
            className={`forge-pipeline-rail-item${isCurrent ? ' is-current' : ''}${isDone ? ' is-done' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
            data-status={stage.status}
            onClick={() => onNavigate(stage.id)}
          >
            <span className="forge-pipeline-rail-mark" aria-hidden="true">
              {isDone ? <Check size={13} strokeWidth={2.5} /> : <Circle size={11} />}
            </span>
            <span>{stage.label}</span>
          </button>
        );
      })}
    </nav>
  </aside>
);

export default PipelineRail;
