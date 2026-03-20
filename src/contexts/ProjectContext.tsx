import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProjects, useProjectVersions } from '@/hooks/use-supabase-data';
import type { ProjectRow, ProjectVersionRow } from '@/hooks/use-supabase-data';
import { DEFAULT_PROJECT_NAME, DEFAULT_VERSION_NAME } from '@/lib/constants';

interface ProjectContextType {
  selectedProject: ProjectRow | null;
  selectedVersion: ProjectVersionRow | null;
  setSelectedProject: (project: ProjectRow | null) => void;
  setSelectedVersion: (version: ProjectVersionRow | null) => void;
  /** true while auto-selecting the default project/version on first load */
  autoSelecting: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersionRow | null>(null);
  const [autoSelecting, setAutoSelecting] = useState(true);
  const [didAutoSelect, setDidAutoSelect] = useState(false);

  const { data: projects = [], isFetched: projectsFetched } = useProjects();
  const defaultProject = projects.find(p => p.project_name === DEFAULT_PROJECT_NAME) ?? null;
  const { data: versions = [], isFetched: versionsFetched } = useProjectVersions(defaultProject?.id);

  // Auto-select Ice Pack NPI / DVT on first load
  useEffect(() => {
    if (didAutoSelect || selectedProject) {
      setAutoSelecting(false);
      return;
    }
    // Projects loaded but no match — stop waiting
    if (projectsFetched && !defaultProject) {
      setDidAutoSelect(true);
      setAutoSelecting(false);
      return;
    }
    // Both queries settled — attempt selection
    if (defaultProject && versionsFetched) {
      const dvt = versions.find(v => v.version_name === DEFAULT_VERSION_NAME);
      if (dvt) {
        setSelectedProject(defaultProject);
        setSelectedVersion(dvt);
      }
      setDidAutoSelect(true);
      setAutoSelecting(false);
    }
  }, [defaultProject, versions, didAutoSelect, selectedProject, projectsFetched, versionsFetched]);

  const handleSetProject = (project: ProjectRow | null) => {
    setSelectedProject(project);
    if (!project) setSelectedVersion(null);
  };

  const handleSetVersion = (version: ProjectVersionRow | null) => {
    setSelectedVersion(version);
  };

  return (
    <ProjectContext.Provider value={{
      selectedProject,
      selectedVersion,
      setSelectedProject: handleSetProject,
      setSelectedVersion: handleSetVersion,
      autoSelecting,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
};
