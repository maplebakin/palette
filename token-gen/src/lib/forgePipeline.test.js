import { describe, expect, it } from 'vitest';
import { derivePipelineRailStatuses } from './forgePipeline.js';

describe('forge pipeline rail statuses', () => {
  it('derives done, current, and todo from the existing stage state', () => {
    const statuses = derivePipelineRailStatuses({
      currentStage: 'review',
      paletteExists: true,
      refineVisited: true,
      reviewVisited: true,
      packageReady: false,
      exportDownloaded: true,
      manifestGenerated: false,
    });

    expect(statuses.map(({ status }) => status)).toEqual([
      'done',
      'done',
      'current',
      'todo',
      'done',
      'todo',
    ]);
    expect(statuses.find(({ id }) => id === 'review')).toMatchObject({
      current: true,
      done: true,
    });
  });

  it('keeps an untouched pipeline at Create with later stages todo', () => {
    const statuses = derivePipelineRailStatuses({ paletteExists: true });

    expect(statuses[0]).toMatchObject({ id: 'create', status: 'current', done: true });
    expect(statuses.slice(1).every(({ status }) => status === 'todo')).toBe(true);
  });
});
