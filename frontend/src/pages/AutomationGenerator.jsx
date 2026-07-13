import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Code2, Upload, Download, FileSpreadsheet, Copy, Sparkles } from 'lucide-react';


export default function AutomationGenerator({ project }) {
  const { api } = useAuth();
  const [testCases, setTestCases] = useState([]);
  const [framework, setFramework] = useState('playwright');
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [rawColumns, setRawColumns] = useState([]);
  const fileRef = useRef();

  const handleUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/testcases/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('RAW BACKEND RESPONSE:', JSON.stringify(res.data, null, 2));

      const raw = res.data.test_cases;
      if (raw && raw.length > 0) {
        const keys = Object.keys(raw[0]);
        console.log('COLUMN KEYS FROM BACKEND:', keys);
        setRawColumns(keys);
      }

      // Try every possible key for each field
      const normalized = res.data.test_cases.map((tc, i) => {
        const keys = Object.keys(tc);
        console.log(`Row ${i} keys:`, keys);
        console.log(`Row ${i} values:`, tc);

        const findVal = (...names) => {
          for (const name of names) {
            // exact match
            if (tc[name] !== undefined && tc[name] !== null && String(tc[name]).trim() !== '' && String(tc[name]).trim() !== 'nan') {
              return String(tc[name]).trim();
            }
            // case-insensitive match
            const found = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
            if (found && tc[found] !== undefined && tc[found] !== null && String(tc[found]).trim() !== '' && String(tc[found]).trim() !== 'nan') {
              return String(tc[found]).trim();
            }
          }
          return '';
        };

        return {
          id:       findVal('id', 'ID', 'test id', 'TC ID', 'test case id') || `TC_${String(i+1).padStart(3,'0')}`,
          title:    findVal('title', 'Title', 'TEST TITLE', 'test title', 'Test Case Title', 'test case title', 'name', 'Name', 'description'),
          steps:    findVal('steps', 'Steps', 'test steps', 'Test Steps', 'TEST STEPS', 'actions', 'Actions'),
          expected: findVal('expected', 'Expected', 'expected result', 'Expected Result', 'EXPECTED RESULT', 'expected results', 'Expected Results', 'result', 'Result', 'outcome', 'Outcome', 'expected outcome', 'Expected Outcome'),
          type:     findVal('type', 'Type', 'test type', 'Test Type') || 'positive',
          priority: findVal('priority', 'Priority', 'test priority', 'Test Priority') || 'Medium',
        };
      });

      console.log('NORMALIZED TEST CASES:', normalized);
      setTestCases(normalized);
      toast.success(`${normalized.length} test cases loaded`);
    } catch (e) {
      console.error('Upload error:', e.response?.data);
      toast.error(e.response?.data?.detail || 'Upload failed');
    }
  };

  const generate = async () => {
    if (!project) { toast.error('Open a project first'); return; }
    if (!testCases.length) { toast.error('Upload test cases first'); return; }
    setLoading(true); setScript('');
    try {
      if (framework === 'both') {
        const res = await api.post('/automation/generate',
          { project_id: project.id, test_cases: testCases, framework: 'both' },
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url; a.download = 'automation_scripts.zip'; a.click();
        toast.success('ZIP downloaded!');
      } else {
        const res = await api.post('/automation/generate', { project_id: project.id, test_cases: testCases, framework });
        setScript(res.data.script);
        toast.success('Script generated!');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Generation failed');
    } finally { setLoading(false); }
  };

  const downloadScript = () => {
    const ext = framework === 'playwright' ? 'spec.js' : 'test.js';
    const blob = new Blob([script], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `generated.${ext}`; a.click();
    toast.success('Downloaded!');
  };

  const frameworks = [
    { id: 'playwright', label: 'Playwright JS', desc: 'Modern, fast, reliable' },
    { id: 'selenium', label: 'Selenium JS', desc: 'WebdriverIO based' },
    { id: 'both', label: 'Both', desc: 'Download as ZIP' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Code2 size={20} color="#0284c7" />
          <h1>Automation Script Generator</h1>
        </div>
        <p className="page-subtitle">Convert your test cases into ready-to-run automation scripts.</p>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Step 1 — Upload Test Cases</h2>
        <div className={`upload-zone ${dragOver ? 'active' : ''}`}
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}>
          <FileSpreadsheet size={28} color="#1a56db" style={{ opacity: 0.6 }} />
          <p><strong>Click to upload</strong> or drag & drop</p>
          <p>Supports .xlsx and .csv</p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files[0])} />

        {/* Show detected columns for debugging */}
        {rawColumns.length > 0 && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#f0f9ff', borderRadius: 7, border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>Detected columns:</div>
            <div style={{ fontSize: 11, color: '#334155' }}>{rawColumns.join(' | ')}</div>
          </div>
        )}

        {testCases.length > 0 && (
          <>
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#e0f2fe', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={14} color="#0284c7" />
              <span style={{ fontSize: 13, color: '#0c4a6e', fontWeight: 500 }}>{testCases.length} test cases loaded</span>
            </div>
            <div style={{ marginTop: 12, overflowX: 'auto' }}>
              <table className="tc-table">
                <thead><tr><th>ID</th><th>Title</th><th>Expected</th><th>Priority</th></tr></thead>
                <tbody>
                  {testCases.slice(0, 3).map((tc, i) => (
                    <tr key={i}>
                      <td><code style={{ fontSize: 11, color: '#1a56db' }}>{tc.id}</code></td>
                      <td style={{ fontSize: 12 }}>{tc.title}</td>
                      <td style={{ fontSize: 11, color: tc.expected ? '#333' : 'red' }}>
                        {tc.expected || '⚠ EMPTY'}
                      </td>
                      <td><span className={`badge badge-${(tc.priority||'medium').toLowerCase()}`}>{tc.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Step 2 — Select Framework</h2>
        <div className="framework-grid">
          {frameworks.map(f => (
            <div key={f.id} className={`framework-option ${framework === f.id ? 'selected' : ''}`} onClick={() => setFramework(f.id)}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: framework === f.id ? '#1a56db' : '#888' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Step 3 — Generate Script</h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          {framework === 'both' ? 'Both Playwright and Selenium scripts will be downloaded as ZIP.'
            : `A ${framework === 'playwright' ? 'Playwright' : 'Selenium (WebdriverIO)'} JavaScript test file will be generated.`}
        </p>
        <button className="btn btn-teal" onClick={generate} disabled={loading}>
          {loading ? <><div className="spinner" />Generating…</> : <><Sparkles size={15} />Generate {framework === 'both' ? 'Both Scripts' : `${framework.charAt(0).toUpperCase() + framework.slice(1)} Script`}</>}
        </button>
      </div>

      {script && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f0eff8' }}>
            <div>
              <h2 style={{ margin: 0 }}>Generated Script</h2>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {framework === 'playwright' ? 'Playwright · generated.spec.js' : 'Selenium WebdriverIO · generated.test.js'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(script); toast.success('Copied!'); }}><Copy size={13} /> Copy</button>
              <button className="btn btn-teal btn-sm" onClick={downloadScript}><Download size={13} /> Download</button>
            </div>
          </div>
          <div className="code-block" style={{ borderRadius: 0 }}>{script}</div>
        </div>
      )}
    </div>
  );
}
