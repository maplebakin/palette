import { useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectStorage } from './useProjectStorage';
import { useNotification } from '../context/NotificationContext';
import { buildSectionSnapshotFromPalette, createEmptyProject, normalizeProject } from '../lib/projectUtils';

export function useProjectState() {
  const { notify } = useNotification();
  const storage = useProjectStorage();

  const initialLoad = useMemo(() => {
    const { current } = storage.loadInitialState();
    if (current && typeof current === 'object') {
      return normalizeProject(current);
    }
    return createEmptyProject();
  }, [storage]);

  const [project, setProject] = useState(initialLoad);

  const { projectName, settings, sections } = project;

  const saveCurrentProjectState = storage.saveCurrentProjectState;

  useEffect(() => {
    saveCurrentProjectState(project);
  }, [project, saveCurrentProjectState]);

  const setProjectName = useCallback((name) => {
    setProject(p => ({ ...p, projectName: name }));
  }, []);

  const setSettings = useCallback((newSettings) => {
    setProject(p => ({ ...p, settings: { ...p.settings, ...newSettings } }));
  }, []);

  const setSections = useCallback((newSections) => {
    setProject(p => ({ ...p, sections: newSections }));
  }, []);

  const addSection = useCallback(() => {
    const existingLabels = new Set(sections.map((section) => section.label));
    let idx = sections.length + 1;
    let label = `Section ${idx}`;
    while (existingLabels.has(label)) {
      idx += 1;
      label = `Section ${idx}`;
    }
    const timestamp = new Date().toISOString();
    const newSection = {
      id: `section-${Date.now()}`,
      label,
      kind: 'season',
      baseHex: '',
      mode: '',
      locked: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setSections([...sections, newSection]);
    notify('Added new section', 'success');
  }, [sections, setSections, notify]);

  const updateSection = useCallback((sectionId, updatedProperties) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, ...updatedProperties } : s));
  }, [sections, setSections]);

  const removeSection = useCallback((sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
    notify('Section removed', 'success');
  }, [sections, setSections, notify]);

  const capturePalette = useCallback((sectionId, palette) => {
    const snapshot = buildSectionSnapshotFromPalette(palette);
    if (!snapshot) {
      notify('Capture failed — palette data is unavailable', 'warn');
      return;
    }
    updateSection(sectionId, snapshot);
    notify('Palette captured into section', 'success');
  }, [updateSection, notify]);

  const loadProject = useCallback((projectData) => {
    if (projectData && projectData.schemaVersion === 1) {
      const normalized = normalizeProject(projectData);
      setProject(normalized);
      notify(`Project "${normalized.projectName}" loaded`, 'success');
    } else {
      notify('Invalid project file format', 'error');
    }
  }, [notify]);
  
  const createNewProject = useCallback(() => {
    setProject(createEmptyProject());
    notify('Created a new project', 'success');
  }, [notify]);

  return {
    project,
    projectName,
    settings,
    sections,
    setProject,
    setProjectName,
    setSettings,
    setSections,
    addSection,
    updateSection,
    removeSection,
    capturePalette,
    loadProject,
    createNewProject,
    storage,
  };
}
