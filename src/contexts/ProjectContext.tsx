import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ProjectRow, ProjectVersionRow } from '@/hooks/use-supabase-data';

interface ProjectContextType {
  selectedProject: ProjectRow | null;
  selectedVersion: ProjectVersionRow | null;
  setSelectedProject: (project: ProjectRow | null) => void;
  setSelectedVersion: (version: ProjectVersionRow | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersionRow | null>(null);

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
