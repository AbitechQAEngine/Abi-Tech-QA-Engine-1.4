import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { ProjectProvider, useProject } from './context/ProjectContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CompanyLanding from './pages/CompanyLanding';
import Home from './pages/Home';

import Sidebar from './components/Sidebar';
import TestCaseGenerator from './pages/TestCaseGenerator';
import AutomationGenerator from './pages/AutomationGenerator';
import BugReportGenerator from './pages/BugReportGenerator';
import Dashboard from './pages/Dashboard';
import TeamManagement from './pages/TeamManagement';
import './App.css';

// ---------------------------------------------------------------------------
// DEV MODE: set to true to skip login entirely and land on the Home page
// without needing the backend or database running. Set back to false
// (or delete this block) before you deploy / connect the real backend.
// ---------------------------------------------------------------------------
const DEV_MODE_SKIP_LOGIN = false;
const DEV_MODE_FAKE_USER = { id: 0, name: 'Dev User', email: 'dev@example.com' };
// ---------------------------------------------------------------------------

function AuthGate() {
  // If the URL already has a reset token, jump straight to the reset screen.
  // Otherwise, unauthenticated visitors land on the company / about page,
  // which itself offers Login and Sign Up buttons.
  const initialView = new URLSearchParams(window.location.search).get('token')
    ? 'reset'
    : 'about';
  const [view, setView] = useState(initialView);

  if (view === 'login') return <Login onNavigate={setView} />;
  if (view === 'signup') return <Signup onNavigate={setView} />;
  if (view === 'forgot') return <ForgotPassword onNavigate={setView} />;
  if (view === 'reset') return <ResetPassword onNavigate={setView} />;
  return <CompanyLanding onNavigate={setView} />;
}

function Workspace() {
  const { activeProject, closeProject } = useProject();
  const [activePage, setActivePage] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const pages = {
    dashboard: <Dashboard onNavigate={setActivePage} project={activeProject} onBackToProjects={closeProject} />,
    testcases: <TestCaseGenerator project={activeProject} />,
    automation: <AutomationGenerator project={activeProject} />,
    bugreports: <BugReportGenerator project={activeProject} />,
    team: <TeamManagement />,
  };

  const bottomNavItems = [
    { id: 'dashboard', label: 'Home', icon: '🏠' },
    { id: 'testcases', label: 'Cases', icon: '🧪' },
    { id: 'automation', label: 'AI', icon: '🤖' },
    { id: 'bugreports', label: 'Bugs', icon: '🐞' },
    { id: 'team', label: 'Team', icon: '👤' },
  ];

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: 18 }}>☰</button>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'white', letterSpacing: '-0.3px' }}>ABI-TECH QA-ENGINE</div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <Sidebar
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); setSidebarOpen(false); }}
        darkMode={darkMode}
        toggleDark={() => setDarkMode(!darkMode)}
        isOpen={sidebarOpen}
        project={activeProject}
        onBackToProjects={closeProject}
      />

      <main className="main-content">
        {pages[activePage]}
      </main>

      <nav className="bottom-nav">
        {bottomNavItems.map(({ id, label, icon }) => (
          <button
            key={id}
            className={`bottom-nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => setActivePage(id)}
          >
            <span className="bottom-nav-icon">{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </button>
        ))}
      </nav>

      <Toaster position="top-right" toastOptions={{
        duration: 3000,
        style: {
          background: darkMode ? '#1e293b' : '#fff',
          color: darkMode ? '#f1f5f9' : '#0f172a',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        }
      }} />
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const { activeProject } = useProject();

  if (DEV_MODE_SKIP_LOGIN) {
    if (!activeProject) return <Home />;
    return <Workspace />;
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading...</div>;
  }

  if (!user) return <AuthGate />;
  if (!activeProject) return <Home />;
  return <Workspace />;
}

export default function App() {
  return (
    <ProjectProvider>
      <AppInner />
    </ProjectProvider>
  );
}
