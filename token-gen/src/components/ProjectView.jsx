import React, { useContext } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { PaletteContext } from '../context/PaletteContext';
import { mergeProjectColors } from '../lib/projectMerge';
import { generateSoc } from '../lib/soc-exporter';

const StartPanel = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const NamePanel = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const BuildPanel = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const ReviewPanel = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const ExportPanel = ({ children, className }) => (
  <div className={className}>{children}</div>
);

function ProjectView({ onImportCss }) {
  const { 
    project, 
    projectName, 
    settings, 
    sections,
    setProjectName,
    addSection,
    updateSection,
    removeSection,
    capturePalette,
    loadProject,
    createNewProject
  } = useContext(ProjectContext);

  const palette = useContext(PaletteContext); // To capture palette

  const handleFileLoad = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          loadProject(json);
        } catch (error) {
          console.error("Failed to parse project file", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileSave = () => {
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.apocaproject.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSoc = () => {
    const mergedColors = mergeProjectColors(project);
    const socContent = generateSoc(projectName, mergedColors);
    const blob = new Blob([socContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.soc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const safeSections = Array.isArray(sections) ? sections : [];
  const sectionCount = safeSections.length;
  const totalColors = safeSections.reduce((sum, section) => (
    sum + (Array.isArray(section.colors) ? section.colors.length : 0)
  ), 0);
  const totalTokens = safeSections.reduce((sum, section) => (
    sum + (section.tokens ? Object.keys(section.tokens).length : 0)
  ), 0);
  const safeSettings = settings && typeof settings === 'object' ? settings : {};
  const settingsItems = [
    { label: 'Max colors', value: safeSettings.maxColors },
    { label: 'Neutral cap', value: safeSettings.neutralCap },
    { label: 'Near-dup threshold', value: safeSettings.nearDupThreshold },
    { label: 'Anchors kept', value: safeSettings.anchorsAlwaysKeep ? 'Yes' : 'No' },
  ];

  const handleImportCss = onImportCss || (() => {});

  return (
    <div className="p-4 panel-surface rounded-lg">
      <div className="space-y-6">
        <StartPanel className="panel-surface-strong border rounded-lg p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Project Manager</h2>
              <p className="text-sm panel-muted">Start a new project or load an existing build file.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={createNewProject} className="btn-primary">New Project</button>
              <input type="file" accept=".apocaproject.json" onChange={handleFileLoad} className="hidden" id="load-project-file" />
              <label htmlFor="load-project-file" className="btn-secondary cursor-pointer">Load Project</label>
              <input
                type="file"
                accept=".css,text/css"
                onChange={handleImportCss}
                className="hidden"
                id="import-css-file"
              />
              <label htmlFor="import-css-file" className="btn-secondary cursor-pointer">Import CSS</label>
            </div>
          </div>
        </StartPanel>

        <NamePanel className="panel-surface-strong border rounded-lg p-4">
          <label htmlFor="projectName" className="block text-sm font-medium panel-muted">Project Name</label>
          <input
            type="text"
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-2 block w-full rounded-md border panel-surface-strong shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="panel-surface border rounded-md p-2">
              <p className="text-[10px] uppercase tracking-wider panel-muted">Sections</p>
              <p className="text-sm font-semibold">{sectionCount}</p>
            </div>
            <div className="panel-surface border rounded-md p-2">
              <p className="text-[10px] uppercase tracking-wider panel-muted">Captured colors</p>
              <p className="text-sm font-semibold">{totalColors}</p>
            </div>
            <div className="panel-surface border rounded-md p-2">
              <p className="text-[10px] uppercase tracking-wider panel-muted">Captured tokens</p>
              <p className="text-sm font-semibold">{totalTokens}</p>
            </div>
            <div className="panel-surface border rounded-md p-2">
              <p className="text-[10px] uppercase tracking-wider panel-muted">Schema</p>
              <p className="text-sm font-semibold">{project?.schemaVersion ?? '—'}</p>
            </div>
          </div>
        </NamePanel>

        <BuildPanel className="panel-surface-strong border rounded-lg p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Build Sections</h3>
              <p className="text-sm panel-muted">Create sections before capturing palettes.</p>
            </div>
            <button onClick={addSection} className="btn-primary">Add Section</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settingsItems.map((item) => (
              <div key={item.label} className="panel-chip text-[11px] font-semibold px-3 py-1 rounded-full border">
                {item.label}: {item.value ?? '—'}
              </div>
            ))}
          </div>
        </BuildPanel>

        <ReviewPanel className="panel-surface-strong border rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Sections</h3>
              <p className="text-sm panel-muted">Capture the live palette into each section as needed.</p>
            </div>
            <span className="text-xs panel-muted">{sectionCount} total</span>
          </div>
          {sectionCount === 0 ? (
            <div className="panel-surface border rounded-md p-4 text-sm panel-muted">
              No sections yet. Add your first section to start capturing palettes.
            </div>
          ) : (
            safeSections.map((section) => {
              const swatchCount = Array.isArray(section.colors) ? section.colors.length : 0;
              const tokenCount = section.tokens ? Object.keys(section.tokens).length : 0;
              const mainSwatches = [];
              if (typeof section.baseHex === 'string' && section.baseHex) {
                mainSwatches.push(section.baseHex);
              }
              if (Array.isArray(section.colors)) {
                for (const color of section.colors) {
                  const hex = color?.hex;
                  if (typeof hex === 'string' && hex && !mainSwatches.includes(hex)) {
                    mainSwatches.push(hex);
                  }
                  if (mainSwatches.length >= 2) break;
                }
              }
              const previewSwatches = mainSwatches.slice(0, 2);
              const previewColors = Array.isArray(section.colors)
                ? section.colors.slice(0, 6).map((color) => color.hex)
                : [];
              return (
                <div key={section.id} className="p-4 border panel-surface rounded-lg mb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        value={section.label}
                        onChange={(e) => updateSection(section.id, { label: e.target.value })}
                        className="font-semibold bg-transparent text-lg panel-text flex-1 min-w-[160px]"
                        aria-label="Section label"
                      />
                      {previewSwatches.length > 0 && (
                        <div className="flex items-center gap-2">
                          {previewSwatches.map((color, index) => (
                            <span
                              key={`${section.id}-main-${index}`}
                              className="h-6 w-6 rounded-full border shadow-inner"
                              style={{ backgroundColor: color, borderColor: 'rgba(0,0,0,0.12)' }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => capturePalette(section.id, palette)} className="btn-sm">Capture</button>
                      <button onClick={() => removeSection(section.id)} className="btn-sm-danger">Remove</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs panel-muted">
                    <span>Base {section.baseHex ? section.baseHex.toUpperCase() : '—'}</span>
                    <span>Mode {section.mode ?? '—'}</span>
                    <span>Kind {section.kind ?? '—'}</span>
                    <span>{tokenCount} tokens</span>
                    <span>{swatchCount} colors</span>
                    <span>{section.locked ? 'Locked' : 'Unlocked'}</span>
                  </div>
                  {previewColors.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {previewColors.map((color, index) => (
                        <span
                          key={`${section.id}-preview-${index}`}
                          className="h-6 w-6 rounded-full border shadow-inner"
                          style={{ backgroundColor: color, borderColor: 'rgba(0,0,0,0.12)' }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </ReviewPanel>

        <ExportPanel className="panel-surface-strong border rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Export</h3>
              <p className="text-sm panel-muted">Save the project file or export a .soc bundle.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleFileSave} className="btn-secondary">Save Project</button>
              <button onClick={handleExportSoc} className="btn-primary">Export Project .soc</button>
            </div>
          </div>
        </ExportPanel>
      </div>
    </div>
  );
}

export default ProjectView;
