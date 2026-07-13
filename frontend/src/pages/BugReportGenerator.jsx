import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Bug, Copy, Download, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


const severityColors = {
  Critical: { badge: 'badge-critical' },
  High: { badge: 'badge-high' },
  Medium: { badge: 'badge-medium' },
  Low: { badge: 'badge-low' },
};

export default function BugReportGenerator({ project }) {
  const { api } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', environment: '', browser: '', actual_behavior: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!project) { toast.error('Open a project first'); return; }
    if (!form.title || !form.description) { toast.error('Title and Description are required'); return; }
    setLoading(true);
    try {
      const res = await api.post('/bugreports/generate', { project_id: project.id, ...form });
      setReport(res.data);
      toast.success('Bug report generated!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Generation failed');
    } finally { setLoading(false); }
  };

  const copyReport = () => {
    if (!report) return;
    const text = `BUG REPORT\n==========\nSummary: ${report.summary}\nSeverity: ${report.severity}\nPriority: ${report.priority}\n\nPreconditions:\n${report.preconditions}\n\nSteps to Reproduce:\n${(report.steps_to_reproduce || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nExpected Result:\n${report.expected_result}\n\nActual Result:\n${report.actual_result}\n\nWorkaround:\n${report.workaround || 'None'}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const downloadReport = () => {
    if (!report) return;
    const content = `BUG REPORT\n==========\nSummary: ${report.summary}\nSeverity: ${report.severity}\nPriority: ${report.priority}\n\nPreconditions:\n${report.preconditions}\n\nSteps to Reproduce:\n${(report.steps_to_reproduce || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nExpected Result:\n${report.expected_result}\n\nActual Result:\n${report.actual_result}\n\nWorkaround:\n${report.workaround || 'None'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bug_report.txt'; a.click();
    toast.success('Downloaded!');
  };

  const sev = report ? (severityColors[report.severity] || severityColors.Medium) : null;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Bug size={20} color="#1344b4" />
          <h1>Bug Report Generator</h1>
        </div>
        <p className="page-subtitle">Generate standardized, professional bug reports.</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Bug Title *</label>
          <input type="text" placeholder="e.g. Login button unresponsive on Safari mobile"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Description *</label>
          <textarea style={{ minHeight: 100 }} placeholder="Describe the bug in detail..."
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Environment</label>
            <input type="text" placeholder="e.g. Production, Staging"
              value={form.environment} onChange={e => setForm(p => ({ ...p, environment: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Browser / Device</label>
            <input type="text" placeholder="e.g. Chrome 120, Safari iOS 17"
              value={form.browser} onChange={e => setForm(p => ({ ...p, browser: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Actual Behavior</label>
          <textarea placeholder="What actually happened..."
            value={form.actual_behavior} onChange={e => setForm(p => ({ ...p, actual_behavior: e.target.value }))} />
        </div>
        <button className="btn btn-primary" style={{ background: '#1344b4' }} onClick={generate} disabled={loading}>
          {loading ? <><div className="spinner" />Generating…</> : <><Sparkles size={15} />Generate Bug Report</>}
        </button>
      </div>

      {report && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: '#eff6ff', padding: '16px 20px', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className={`badge ${sev.badge}`}>{report.severity}</span>
                <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>{report.priority}</span>
              </div>
              <h2 style={{ color: '#1e3a8a', margin: 0 }}>{report.summary}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={copyReport}><Copy size={13} />Copy</button>
              <button className="btn btn-secondary btn-sm" onClick={downloadReport}><Download size={13} />Download</button>
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div className="bug-report-grid">
              <div>
                <div className="bug-field"><div className="bug-field-label">Environment</div><div className="bug-field-value">{report.environment || form.environment || '—'}</div></div>
                <div className="bug-field"><div className="bug-field-label">Preconditions</div><div className="bug-field-value" style={{ fontSize: 13, color: '#555' }}>{report.preconditions}</div></div>
                <div className="bug-field"><div className="bug-field-label">Expected Result</div><div className="bug-field-value" style={{ fontSize: 13, color: '#555' }}>{report.expected_result}</div></div>
              </div>
              <div>
                <div className="bug-field"><div className="bug-field-label">Actual Result</div><div className="bug-field-value" style={{ fontSize: 13, color: '#1344b4' }}>{report.actual_result}</div></div>
                {report.workaround && <div className="bug-field"><div className="bug-field-label">Workaround</div><div className="bug-field-value" style={{ fontSize: 13, color: '#555' }}>{report.workaround}</div></div>}
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="bug-field-label" style={{ marginBottom: 8 }}>Steps to Reproduce</div>
              <ol className="steps-list">
                {(report.steps_to_reproduce || []).map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
