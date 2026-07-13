import React, { useEffect, useState } from 'react';
import { FlaskConical, Code2, Bug, Camera, ArrowRight, Users, FolderKanban, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const features = [
  { id: 'testcases',  icon: FlaskConical, color: '#1a56db', bg: '#eff6ff',  border: '#bfdbfe', title: 'Test Case Generator',       desc: 'Generate positive, negative, validation & boundary test cases — including from multiple UI screenshots — with sequential numbering, edit & delete.', actions: ['Generate from text','Multi-screenshot → cases','Edit & delete'] },
  { id: 'automation', icon: Code2,        color: '#0284c7', bg: '#e0f2fe',  border: '#bae6fd', title: 'Automation Scripts',         desc: 'Convert your test cases into ready-to-run Playwright or Selenium JavaScript scripts.', actions: ['Playwright JS','Selenium JS','Download ZIP'] },
  { id: 'bugreports', icon: Bug,          color: '#1344b4', bg: '#eff6ff',  border: '#93c5fd', title: 'Bug Report Generator',       desc: 'Create standardized bug reports with severity, priority, and reproduction steps.', actions: ['Auto severity','Steps to reproduce','Download'] },
];

const quickActions = [
  { id: 'testcases', label: 'Create Test Cases', icon: FlaskConical },
  { id: 'testcases', label: 'Upload Screenshots', icon: Camera },
  { id: 'automation', label: 'Generate Automation', icon: Code2 },
  { id: 'bugreports', label: 'Generate Bug Report', icon: Bug },
];

export default function Dashboard({ onNavigate, project }) {
  const { api, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || !user?.role;
  const [org, setOrg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/organizations/dashboard')
      .then(res => { if (!cancelled) setOrg(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [api]);

  const stats = org ? [
    { label: 'Total Projects',   value: org.total_projects },
    { label: 'Team Members',     value: org.active_users },
    { label: 'Available Seats',  value: org.available_seats === null ? '∞' : org.available_seats },
    { label: 'AI Requests',      value: org.ai_usage },
  ] : [
    { label: 'Manual effort saved', value: '70%+' },
    { label: 'Script gen speed',    value: '30s'  },
    { label: 'Frameworks',          value: '2'    },
    { label: 'Export formats',      value: '2'    },
  ];

  return (
    <div className="dash-page">
      {/* Hero */}
      <div className="dash-hero">
        <div className="dash-hero-blob" />
        <div className="dash-hero-eyebrow">Testing Tool{project ? ` · ${project.name}` : ''}</div>
        <h1 className="dash-hero-title">ABI-TECH QA-ENGINE</h1>
        <p className="dash-hero-sub">Generate test cases, screenshot-driven test cases, automation scripts, and bug reports in seconds. Built for QA engineers who want to move faster.</p>
      </div>

      {/* Subscription status */}
      {org && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FolderKanban size={18} color="#1a56db" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{org.organization.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ textTransform: 'capitalize' }}>{org.organization.plan}</span> plan · {org.used_seats} seat{org.used_seats === 1 ? '' : 's'} in use
            </div>
          </div>
          {isSuperAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('team')}>
              <Users size={13} /> Manage Team
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="stats-row dash-stats">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} color="#1a56db" />
          <h2 style={{ margin: 0 }}>Quick Actions</h2>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            return (
              <button key={i} className="btn btn-secondary btn-sm" onClick={() => onNavigate(a.id)}>
                <Icon size={13} /> {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="dash-feature-list">
        {features.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.id} className="card dash-feature-card" style={{ borderLeft: `4px solid ${f.color}` }} onClick={() => onNavigate(f.id)}>
              <div className="dash-feature-icon" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                <Icon size={19} color={f.color} />
              </div>
              <div className="dash-feature-body">
                <h2 style={{ marginBottom: 3 }}>{f.title}</h2>
                <p className="dash-feature-desc">{f.desc}</p>
                <div className="dash-feature-tags">
                  {f.actions.map(a => (
                    <span key={a} style={{ background: f.bg, color: f.color, border: `1px solid ${f.border}` }}>{a}</span>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ background: f.color }} onClick={e => { e.stopPropagation(); onNavigate(f.id); }}>
                  Open <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase 2 */}
      <div className="dash-roadmap">
        <div className="dash-roadmap-body">
          <div className="dash-roadmap-eyebrow">Coming in Phase 2</div>
          <div className="dash-roadmap-text">Stripe/Razorpay billing · Email invitations · Usage-based AI credits · Activity audit logs</div>
        </div>
        <div className="dash-roadmap-badge">Roadmap →</div>
      </div>
    </div>
  );
}
