import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, FolderOpen, Trash2, Pencil, LogOut, FileText, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import './Home.css';

export default function Home() {
  const { api, user, logout } = useAuth();
  const { openProject } = useProject();
  const isSuperAdmin = user?.role === 'super_admin' || !user?.role;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('Web Application');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newTags, setNewTags] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [members, setMembers] = useState([]);
  const [assignTarget, setAssignTarget] = useState(null); // project being assigned
  const [assignSelection, setAssignSelection] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);

  useEffect(() => {
    loadProjects();
    if (isSuperAdmin) {
      api.get('/organizations/members').then(res => setMembers(res.data)).catch(() => {});
    }
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      toast.error('Could not load your projects.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post('/projects', {
        name: newName,
        description: newDesc || null,
        project_type: newType || null,
        priority: newPriority || null,
        tags: newTags || null,
        repository_url: newRepo || null,
      });
      setProjects((p) => [res.data, ...p]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewType('Web Application');
      setNewPriority('Medium');
      setNewTags('');
      setNewRepo('');
      toast.success('Project created');
      openProject(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not create project.');
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete project "${name}"? This removes all its history permanently.`)) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((p) => p.filter((proj) => proj.id !== id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error('Could not delete project.');
    }
  }

  async function handleRename(id) {
    if (!editName.trim()) return;
    try {
      const res = await api.put(`/projects/${id}`, { name: editName });
      setProjects((p) => p.map((proj) => (proj.id === id ? res.data : proj)));
      setEditingId(null);
      toast.success('Project renamed');
    } catch (err) {
      toast.error('Could not rename project.');
    }
  }

  function openAssign(p) {
    setAssignTarget(p);
    setAssignSelection(p.assigned_user_ids || []);
  }

  function toggleAssignee(userId) {
    setAssignSelection((sel) =>
      sel.includes(userId) ? sel.filter((id) => id !== userId) : [...sel, userId]
    );
  }

  async function saveAssign() {
    setSavingAssign(true);
    try {
      await api.post(`/organizations/projects/${assignTarget.id}/assign`, {
        user_ids: assignSelection,
      });
      setProjects((p) =>
        p.map((proj) =>
          proj.id === assignTarget.id ? { ...proj, assigned_user_ids: assignSelection } : proj
        )
      );
      toast.success('Project access updated');
      setAssignTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not update project access.');
    } finally {
      setSavingAssign(false);
    }
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="home-page">
      <header className="home-header">
  <div className="home-header-left">
    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn-R6R8XHYlhMXEEX4aPCBAXIuLPiXY1AocvchZo4w6A&s=10" alt="Abi Tech" className="home-logo-img" />
    <div>
      <div className="home-welcome">Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋</div>
      <h1 className="home-title">Your Projects</h1>
    </div>
  </div>
  <button className="home-logout" onClick={logout}>
    <LogOut size={16} /> Logout
  </button>
</header>

      <div className="home-toolbar">
        <div className="home-search">
          <Search size={16} />
          <input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isSuperAdmin && (
          <button className="home-create-btn" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {loading ? (
        <div className="home-empty">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="home-empty">
          <FileText size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p>{projects.length === 0 ? (isSuperAdmin ? "You don't have any projects yet." : "No projects have been assigned to you yet.") : 'No projects match your search.'}</p>
          {projects.length === 0 && isSuperAdmin && (
            <button className="home-create-btn" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="project-grid">
          {filtered.map((p) => (
            <div className="project-card" key={p.id}>
              {editingId === p.id ? (
                <div className="project-edit-row">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(p.id)}
                  />
                  <button onClick={() => handleRename(p.id)}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="project-card-header">
                    <h3>{p.name}</h3>
                    {isSuperAdmin && (
                      <div className="project-card-actions">
                        <button title="Assign Team Members" onClick={() => openAssign(p)}>
                          <Users size={14} />
                        </button>
                        <button
                          title="Rename"
                          onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button title="Delete" onClick={() => handleDelete(p.id, p.name)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  {p.description && <p className="project-desc">{p.description}</p>}
                  <div className="project-badges">
                    {p.project_type && <span className="project-badge">{p.project_type}</span>}
                    {p.priority && <span className={`project-badge priority-${(p.priority || '').toLowerCase()}`}>{p.priority} priority</span>}
                    {p.tags && p.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                      <span className="project-badge tag" key={t}>#{t}</span>
                    ))}
                  </div>
                  <div className="project-meta">
                    <span>{p.test_case_counter} test cases</span>
                    <span>Updated {new Date(p.modified_at).toLocaleDateString()}</span>
                    {isSuperAdmin && (
                      <span>{(p.assigned_user_ids || []).length} member{(p.assigned_user_ids || []).length === 1 ? '' : 's'} assigned</span>
                    )}
                  </div>
                  <button className="project-open-btn" onClick={() => openProject(p)}>
                    <FolderOpen size={15} /> Open Project
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h2>Create New Project</h2>
            <label>Project Name</label>
            <input
              autoFocus
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Checkout Flow QA"
            />
            <label>Description (optional)</label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What is this project for?"
            />

            <div className="modal-form-row">
              <div>
                <label>Project Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option>Web Application</option>
                  <option>Mobile App</option>
                  <option>API / Backend</option>
                  <option>Desktop Application</option>
                  <option>ERP / CRM</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label>Priority</label>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            <label>Tags (comma separated, optional)</label>
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="e.g. regression, checkout, sprint-12"
            />

            <label>Repository / Project URL (optional)</label>
            <input
              value={newRepo}
              onChange={(e) => setNewRepo(e.target.value)}
              placeholder="https://github.com/your-org/your-repo"
            />

            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="primary">Create</button>
            </div>
          </form>
        </div>
      )}
      {assignTarget && (
        <div className="modal-overlay" onClick={() => setAssignTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Assign Team Members</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Choose which team members can access <strong>{assignTarget.name}</strong>. As Super Admin, you always have full access regardless of this list.
            </p>
            {members.filter(m => m.role !== 'super_admin').length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                You haven't added any team members yet. Add members from the Team & Subscription page first.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', marginBottom: 4 }}>
                {members.filter(m => m.role !== 'super_admin').map((m) => (
                  <label key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', opacity: m.status === 'disabled' ? 0.5 : 1 }}>
                    <input
                      type="checkbox"
                      checked={assignSelection.includes(m.user_id)}
                      disabled={m.status === 'disabled'}
                      onChange={() => toggleAssignee(m.user_id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}{m.status === 'disabled' ? ' · disabled' : ''}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" onClick={() => setAssignTarget(null)}>Cancel</button>
              <button type="button" className="primary" onClick={saveAssign} disabled={savingAssign}>
                {savingAssign ? 'Saving...' : 'Save Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
