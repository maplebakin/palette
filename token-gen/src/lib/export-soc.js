import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';
import process from 'node:process';
import { processColors, generateSoc } from './soc-exporter.js';
import { mergeProjectColors } from './projectMerge.js';
import { normalizeProject } from './projectUtils.js';

const sanitizeFileName = (value, fallback = 'export') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const withoutSeparators = trimmed.replace(/[\\/]+/g, '-');
  const safe = withoutSeparators.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^\.+/, '').replace(/\.+$/, '');
  const normalized = safe.replace(/\.\.+/g, '.').slice(0, 64);
  if (!normalized || normalized === '.' || normalized === '..') return fallback;
  return normalized;
};

const argv = yargs(hideBin(process.argv))
  .option('input', {
    alias: 'i',
    description: 'Input file (JSON or .apocaproject.json)',
    type: 'string',
    demandOption: true,
  })
  .option('out', {
    alias: 'o',
    description: 'Output file or directory',
    type: 'string',
    demandOption: true,
  })
  .option('name', {
    alias: 'n',
    description: 'Name of the color palette (for single file export)',
    type: 'string',
  })
  .option('project', {
      description: 'Indicates the input is a project file',
      type: 'boolean',
      default: false,
  })
  .option('single-file', {
      description: 'Export a single .soc file for the whole project',
      type: 'boolean',
      default: false,
  })
  .option('deltaE', {
    description: 'Delta E threshold for near-duplicate removal',
    type: 'number',
    default: 2.0,
  })
  .option('maxNeutrals', {
    description: 'Maximum number of neutrals to keep',
    type: 'number',
    default: 8,
  })
  .option('maxColors', {
    description: 'Maximum number of non-neutral colors to keep',
    type: 'number',
    default: 32,
  }).argv;

let inputData = null;
try {
  inputData = JSON.parse(fs.readFileSync(argv.input, 'utf-8'));
} catch (err) {
  console.error(`Failed to read or parse input file: ${argv.input}`);
  console.error(err?.message || err);
  process.exit(1);
}

const isProject = argv.project || Array.isArray(inputData.sections) || inputData.schemaVersion === 1;

try {
  if (isProject) {
    const project = normalizeProject(inputData);
    const overrides = {
      neutralCap: argv.maxNeutrals ?? argv.neutralCap,
      maxColors: argv.maxColors,
      nearDupThreshold: argv.deltaE ?? argv.nearDupThreshold,
    };

    if (argv.singleFile) {
      const merged = mergeProjectColors(project, overrides);
      const socContent = generateSoc(project.projectName, merged, { sanitizeNames: false });
      fs.writeFileSync(argv.out, socContent);
      console.log(`Successfully exported project to ${argv.out}`);
    } else {
      const indexEntries = [];
      if (!fs.existsSync(argv.out)) {
        fs.mkdirSync(argv.out, { recursive: true });
      }
      project.sections.forEach((section, sectionIndex) => {
        const sectionProject = { ...project, sections: [section] };
        const merged = mergeProjectColors(sectionProject, overrides);
        const socContent = generateSoc(section.label, merged, { sanitizeNames: false });
        const safeLabel = sanitizeFileName(section.label, `section-${sectionIndex + 1}`);
        const outFile = path.join(argv.out, `${safeLabel}.soc`);
        fs.writeFileSync(outFile, socContent);
        indexEntries.push({
          name: section.label,
          file: outFile,
        });
      });
      fs.writeFileSync(path.join(argv.out, 'index.json'), JSON.stringify(indexEntries, null, 2));
      console.log(`Successfully exported sections to ${argv.out}`);
    }
  } else {
    const rawColors = inputData.settings || {};
    const processedColors = processColors(rawColors, argv);
    const socContent = generateSoc(argv.name, processedColors);
    fs.writeFileSync(argv.out, socContent);
    console.log(`Successfully exported ${processedColors.length} colors to ${argv.out}`);
  }
} catch (err) {
  console.error('Export failed.');
  console.error(err?.message || err);
  process.exit(1);
}
