import { describe, expect, it } from 'vitest';
import { DONE_KEYS, PIPELINE_STAGES, derivePipelineRailStatuses } from './forgePipeline.js';

describe('forge pipeline rail statuses', () => {
  it('derives done, current, and todo from the existing stage state', () => {
    const statuses = derivePipelineRailStatuses({
      currentStage: 'review',
      paletteExists: true,
      refineVisited: true,
      reviewVisited: true,
      packageDownloaded: true,
      manifestExported: false,
    });

    expect(statuses.map(({ status }) => status)).toEqual([
      'done',
      'done',
      'current',
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

  it('uses exactly the five pipeline stops and the honest done keys', () => {
    expect(PIPELINE_STAGES.map(({ id }) => id)).toEqual([
      'create',
      'refine',
      'review',
      'package',
      'publish',
    ]);
    expect(DONE_KEYS).toEqual({
      create: 'paletteExists',
      refine: 'refineVisited',
      review: 'reviewVisited',
      package: 'packageDownloaded',
      publish: 'manifestExported',
    });

    const fresh = derivePipelineRailStatuses({ paletteExists: true });
    expect(fresh.find(({ id }) => id === 'publish')).toMatchObject({
      done: false,
      status: 'todo',
    });

    const afterManifestExport = derivePipelineRailStatuses({
      paletteExists: true,
      manifestExported: true,
    });
    expect(afterManifestExport.find(({ id }) => id === 'publish')).toMatchObject({
      done: true,
      status: 'done',
    });
  });
});
