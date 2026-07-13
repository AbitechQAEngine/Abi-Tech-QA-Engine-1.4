import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Trash2, Ban, CheckCircle, KeyRound, X,
  Building2, CreditCard, FolderOpen, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function TeamManagement() {
  const { api, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || !user?.role;

  const [dashboard, setDashboard] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', temp_password: '' });
  const [resetTarget, setResetTarget] = useState(null); // membership_id
  const [resetPassword, setResetPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, membersRes] = await Promise.all([
        api.get('/organizations/dashboard'),
        api.get('/organizations/members'),
      ]);
      setDashboard(dashRes.data);
      setMembers(membersRes.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not load team data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email || !inviteForm.temp_password) {
      toast.error('Name, email, and a temporary password are required'); return;
    }
    try {
      await api.post('/organizations/members', inviteForm);
      toast.success('Team member added. Share the temporary password with them securely.');
      setShowInvite(false);
      setInviteForm({ name: '', email: '', temp_password: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not add member');
    }
  };

  const toggleStatus = async (m) => {
    try {
      await api.patch(`/organizations/members/${m.membership_id}`, {
        status: m.status === 'active' ? 'disabled' : 'active',
      });
      toast.success(m.status === 'active' ? 'Member disabled' : 'Member re-enabled');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not update member');
    }
  };

  const removeMember = async (m) => {
    if (!window.confirm(`Remove ${m.name} from the organization?`)) return;
    try {
      await api.delete(`/organizations/members/${m.membership_id}`);
      toast.success('Member removed');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not remove member');
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (!resetPassword || resetPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await api.post(`/organizations/members/${resetTarget}/reset-password`, { new_password: resetPassword });
      toast.success('Password reset');
      setResetTarget(null);
      setResetPassword('');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not reset password');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 6 }}>Team & Subscription</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Only your organization's Super Admin can manage team members and subscription settings.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Building2 size={20} color="#1a56db" />
          <h1>Team & Subscription</h1>
        </div>
        <p className="page-subtitle">Manage your organization's plan, seats, and team member access.</p>
      </div>

      {loading || !dashboard ? (
        <div className="card">Loading…</div>
      ) : (
        <>
          {/* Org / subscription overview */}
          <div className="stats-row" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Subscription Plan</div>
              <div className="stat-value" style={{ textTransform: 'capitalize' }}>{dashboard.organization.plan}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Available Seats</div>
              <div className="stat-value">{dashboard.available_seats === null ? '∞' : dashboard.available_seats}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Users</div>
              <div className="stat-value">{dashboard.active_users}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Projects</div>
              <div className="stat-value">{dashboard.total_projects}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={18} color="#1a56db" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{dashboard.organization.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {dashboard.organization.plan} plan · 1 Super Admin + {dashboard.organization.max_team_members} team members
                {dashboard.organization.subscription_expiry ? ` · Expires ${new Date(dashboard.organization.subscription_expiry).toLocaleDateString()}` : ''}
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a56db', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 20 }}>
              {dashboard.used_seats} / {dashboard.available_seats === null ? '∞' : dashboard.organization.max_team_members + 1} seats used
            </span>
          </div>

          {/* Members */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="section-header" style={{ padding: '16px 20px', borderBottom: '1px solid #f0eff8', margin: 0 }}>
              <div>
                <h2 style={{ margin: 0 }}>Team Members</h2>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{members.length} member{members.length === 1 ? '' : 's'} in your organization</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
                <UserPlus size={13} /> Add Member
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tc-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.membership_id}>
                      <td>{m.name}</td>
                      <td style={{ fontSize: 12 }}>{m.email}</td>
                      <td><span className={`badge ${m.role === 'super_admin' ? 'badge-high' : 'badge-low'}`}>{m.role === 'super_admin' ? 'Super Admin' : 'Team Member'}</span></td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'active' ? '#16a34a' : '#dc2626' }}>
                          {m.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {m.role !== 'super_admin' && (
                          <>
                            <button title={m.status === 'active' ? 'Disable' : 'Enable'} className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => toggleStatus(m)}>
                              {m.status === 'active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                            </button>
                            <button title="Reset Password" className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setResetTarget(m.membership_id)}>
                              <KeyRound size={14} />
                            </button>
                            <button title="Remove" className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }} onClick={() => removeMember(m)}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent AI activity */}
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkles size={16} color="#1a56db" />
              <h2 style={{ margin: 0 }}>AI Usage</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Your organization has generated <strong>{dashboard.ai_usage}</strong> AI requests across test cases, automation scripts, bug reports, and screenshot analyses.
            </p>
          </div>
        </>
      )}

      {showInvite && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Add Team Member</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
              Email invitations aren't wired up yet — set a temporary password here and share it with them securely.
              They can change it after their first login.
            </p>
            <form onSubmit={handleInvite}>
              <label>Full Name</label>
              <input value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" autoFocus />
              <label>Email</label>
              <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@company.com" />
              <label>Temporary Password</label>
              <input type="text" value={inviteForm.temp_password} onChange={e => setInviteForm(p => ({ ...p, temp_password: e.target.value }))} placeholder="At least 8 characters" />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Reset Member Password</h2>
            <form onSubmit={submitReset}>
              <label>New Password</label>
              <input type="text" autoFocus value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="At least 8 characters" />
              <div className="modal-actions">
                <button type="button" onClick={() => { setResetTarget(null); setResetPassword(''); }}>Cancel</button>
                <button type="submit" className="primary">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
