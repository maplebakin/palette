export const PIPELINE_STAGES = [
  { id: 'create', label: 'Create' },
  { id: 'refine', label: 'Refine' },
  { id: 'review', label: 'Review' },
  { id: 'package', label: 'Package' },
  { id: 'export', label: 'Export' },
  { id: 'publish', label: 'Publish' },
];

const DONE_KEYS = {
  create: 'paletteExists',
  refine: 'refineVisited',
  review: 'reviewVisited',
  package: 'packageReady',
  export: 'exportDownloaded',
  publish: 'manifestGenerated',
};

export const derivePipelineRailStatuses = ({
  currentStage = 'create',
  paletteExists = false,
  refineVisited = false,
  reviewVisited = false,
  packageReady = false,
  exportDownloaded = false,
  manifestGenerated = false,
} = {}) => {
  const stageState = {
    paletteExists,
    refineVisited,
    reviewVisited,
    packageReady,
    exportDownloaded,
    manifestGenerated,
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
