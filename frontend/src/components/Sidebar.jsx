import React from 'react';
import { FlaskConical, Code2, Bug, LayoutDashboard, ChevronRight, Moon, Sun, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const baseNavItems = [
  { id: 'dashboard',  label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'testcases',  label: 'Test Cases',           icon: FlaskConical },
  { id: 'automation', label: 'Automation',           icon: Code2 },
  { id: 'bugreports', label: 'Bug Reports',          icon: Bug },
];

export default function Sidebar({ activePage, onNavigate, darkMode, toggleDark, isOpen, project, onBackToProjects }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || !user?.role;
  const navItems = isSuperAdmin
    ? [...baseNavItems, { id: 'team', label: 'Team & Subscription', icon: Users }]
    : baseNavItems;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
      width: '240px',
      position: 'fixed', top: 0, left: 0,
      height: '100vh',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100,
      boxShadow: '2px 0 12px rgba(26,86,219,0.06)',
      transition: 'left 0.3s',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FlaskConical size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', letterSpacing: '-0.3px' }}>ABI-TECH QA-ENGINE</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>by ABI-Tech Solution</div>
          </div>
        </div>
      </div>

      {project && onBackToProjects && (
        <button
          onClick={onBackToProjects}
          style={{
            margin: '10px 10px 0', padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-page)',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            textAlign: 'left',
          }}
          title="Back to all projects"
        >
          ← <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
        </button>
      )}

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '4px 10px 8px' }}>
          Main Menu
        </div>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button key={id} onClick={() => onNavigate(id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--primary)' : 'var(--text-secondary)',
              background: active ? 'var(--primary-light)' : 'transparent',
              marginBottom: 3, textAlign: 'left', transition: 'all 0.15s',
              borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={12} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        {/* Dark mode toggle */}
        <button onClick={toggleDark} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: '1.5px solid var(--border)', cursor: 'pointer',
          background: 'var(--bg-page)', color: 'var(--text-secondary)',
          fontSize: 12, fontWeight: 600, marginBottom: 10, transition: 'all 0.15s',
        }}>
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'capitalize' }}>
            {user?.organization_name || 'Your Organization'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
            {isSuperAdmin ? 'Super Admin' : 'Team Member'}{user?.role ? ` · Professional Plan` : ''}
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>© 2025 ABI-Tech · ABI-TECH QA-ENGINE</div>
      </div>
    </aside>
  );
}
