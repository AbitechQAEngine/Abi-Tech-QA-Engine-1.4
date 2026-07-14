import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const STATUS_LABEL = {
  pending_payment: 'Pending Payment',
  waiting_approval: 'Pending Approval',
  active: 'Active',
  rejected: 'Rejected',
  suspended: 'Suspended',
  expired: 'Expired',
};

export default function PlatformAdminDashboard({ onLogout }) {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [filter, setFilter] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  async function load() {
    try {
      const [s, o] = await Promise.all([
        api.get('/platform-admin/stats'),
        api.get('/platform-admin/organizations', { params: filter ? { status_filter: filter } : {} }),
      ]);
      setStats(s.data);
      setOrgs(o.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load admin dashboard');
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function act(orgId, action) {
    try {
      if (action === 'reject') {
        await api.post(`/platform-admin/organizations/${orgId}/reject`, { reason });
        setRejectingId(null);
        setReason('');
      } else if (action === 'delete') {
        if (!window.confirm('Delete this organization permanently?')) return;
        await api.delete(`/platform-admin/organizations/${orgId}`);
      } else {
        await api.post(`/platform-admin/organizations/${orgId}/${action}`);
      }
      toast.success('Done');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed');
    }
  }

  const cards = stats ? [
    { label: 'Total Registered Companies', value: stats.total_registered },
    { label: 'Pending Approvals', value: stats.pending_approvals },
    { label: 'Active Companies', value: stats.active_companies },
    { label: 'Expired Companies', value: stats.expired_companies },
    { label: 'Revenue Generated', value: `$${stats.revenue_generated}` },
    { label: 'Monthly Registrations', value: stats.monthly_registrations },
    { label: 'Active Users', value: stats.active_users },
    { label: 'Total Projects', value: stats.total_projects },
  ] : [];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>ABI-TECH QA-Engine Admin Dashboard</h1>
        <button className="auth-submit" style={{ width: 'auto', padding: '8px 16px' }} onClick={onLogout}>Logout</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: 'var(--card-bg, #fff)', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['', 'pending_payment', 'waiting_approval', 'active', 'rejected', 'suspended', 'expired'].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: filter === s ? '#0f172a' : '#fff', color: filter === s ? '#fff' : '#0f172a', cursor: 'pointer' }}>
            {s ? STATUS_LABEL[s] : 'All'}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              {['Company', 'Administrator', 'Email', 'Country', 'Plan', 'Amount', 'Payment', 'Registered', 'Expiry', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: 8, fontSize: 12, color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>{o.name}</td>
                <td style={{ padding: 8 }}>{o.admin_name}</td>
                <td style={{ padding: 8 }}>{o.admin_email}</td>
                <td style={{ padding: 8 }}>{o.country}</td>
                <td style={{ padding: 8 }}>{o.subscription_plan_code}</td>
                <td style={{ padding: 8 }}>${o.subscription_amount}</td>
                <td style={{ padding: 8 }}>{o.payment_status}</td>
                <td style={{ padding: 8 }}>{new Date(o.registration_date).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>{o.subscription_expiry ? new Date(o.subscription_expiry).toLocaleDateString() : '-'}</td>
                <td style={{ padding: 8 }}>{STATUS_LABEL[o.registration_status] || o.registration_status}</td>
                <td style={{ padding: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {o.registration_status === 'waiting_approval' && (
                    <>
                      <button onClick={() => act(o.id, 'approve')}>Approve</button>
                      <button onClick={() => setRejectingId(o.id)}>Reject</button>
                    </>
                  )}
                  {o.registration_status === 'active' && (
                    <button onClick={() => act(o.id, 'suspend')}>Suspend</button>
                  )}
                  {['suspended', 'expired'].includes(o.registration_status) && (
                    <button onClick={() => act(o.id, 'renew')}>Renew</button>
                  )}
                  <button onClick={() => act(o.id, 'delete')}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 360 }}>
            <h3>Reject Organization</h3>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection"
              style={{ width: '100%', minHeight: 80, marginTop: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => act(rejectingId, 'reject')} disabled={!reason}>Confirm Reject</button>
              <button onClick={() => { setRejectingId(null); setReason(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
