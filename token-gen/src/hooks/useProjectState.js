import { useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectStorage } from './useProjectStorage';
import { useNotification } from '../context/NotificationContext';
import newThemeTemplate from '../../new-theme-template.json';

const DEFAULT_PROJECT = {
  ...newThemeTemplate,
  projectName: 'New Project',
};

export function useProjectState() {
  const { notify } = useNotification();
  const storage = useProjectStorage();

  const initialLoad = useMemo(() => {
    const { current } = storage.loadInitialState();
    return current && typeof current === 'object' ? current : DEFAULT_PROJECT;
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
    const newSection = {
      id: `section-${Date.now()}`,
      label: 'New Section',
      kind: 'season',
      baseHex: '#ffffff',
      mode: 'mono',
      locked: false,
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
    const { baseColor, mode, tokens } = palette;
    const colors = Object.entries(tokens).map(([name, { hex }]) => ({ name, hex }));
    updateSection(sectionId, { baseHex: baseColor, mode, colors, tokens });
    notify('Palette captured into section', 'success');
  }, [updateSection, notify]);

  const loadProject = useCallback((projectData) => {
    // Basic validation
    if (projectData && projectData.schemaVersion === 1) {
      setProject(projectData);
      notify(`Project "${projectData.projectName}" loaded`, 'success');
    } else {
      notify('Invalid project file format', 'error');
    }
  }, [notify]);
  
  const createNewProject = useCallback(() => {
    setProject({
      ...newThemeTemplate,
      projectName: 'New Project',
      sections: [],
    });
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