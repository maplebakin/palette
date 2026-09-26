import { KITS } from '../data/kits.js';

const curatedKitIds = new Set(KITS.map((kit) => kit.id));

export const isCuratedKit = (kit) => Boolean(kit?.id && curatedKitIds.has(kit.id));

export const formatArtifactName = ({ kit, explorationName } = {}) => {
  if (isCuratedKit(kit)) {
    return `Artifact No. ${kit.artifactNo} — ${kit.name}`;
  }

  const name = String(explorationName || kit?.name || 'Unnamed exploration').trim();
  return `Exploration — ${name}`;
};

export const getArtifactDisplayName = formatArtifactName;
