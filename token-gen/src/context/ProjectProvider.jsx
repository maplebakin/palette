import { ProjectContext } from './ProjectContext';
import { useProjectState } from '../hooks/useProjectState';

export function ProjectProvider({ children }) {
  const projectState = useProjectState();

  return (
    <ProjectContext.Provider value={projectState}>
      {children}
    </ProjectContext.Provider>
  );
}
