import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [activeProject, setActiveProject] = useState(() => {
    const raw = localStorage.getItem('qa_active_project');
    return raw ? JSON.parse(raw) : null;
  });

  function openProject(project) {
    localStorage.setItem('qa_active_project', JSON.stringify(project));
    setActiveProject(project);
  }

  function closeProject() {
    localStorage.removeItem('qa_active_project');
    setActiveProject(null);
  }

  function updateActiveProjectCounter(newCounter) {
    setActiveProject((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, test_case_counter: newCounter };
      localStorage.setItem('qa_active_project', JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <ProjectContext.Provider
      value={{ activeProject, openProject, closeProject, updateActiveProjectCounter }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
