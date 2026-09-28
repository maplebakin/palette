export const PIPELINE_STAGES = [
  { id: 'create', label: 'Create' },
  { id: 'refine', label: 'Refine' },
  { id: 'review', label: 'Review' },
  { id: 'package', label: 'Package' },
  { id: 'publish', label: 'Publish' },
];

export const DONE_KEYS = {
  create: 'paletteExists',
  refine: 'refineVisited',
  review: 'reviewVisited',
  package: 'packageDownloaded',
  publish: 'manifestExported',
};

export const derivePipelineRailStatuses = ({
  currentStage = 'create',
  paletteExists = false,
  refineVisited = false,
  reviewVisited = false,
  packageDownloaded = false,
  manifestExported = false,
} = {}) => {
  const stageState = {
    paletteExists,
    refineVisited,
    reviewVisited,
    packageDownloaded,
    manifestExported,
  };

  return PIPELINE_STAGES.map((stage) => {
    const done = Boolean(stageState[DONE_KEYS[stage.id]]);
    const current = stage.id === currentStage;

    return {
      ...stage,
      done,
      current,
      status: current ? 'current' : done ? 'done' : 'todo',
    };
  });
};
