import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Scene3D from '../components/Scene3D';
import { API_BASE } from '../config';
import './Auth.css';

const PLANS = [
  { code: '1_year', label: '1 Year - $200' },
  { code: '2_years', label: '2 Years - $350' },
];

const EMPTY = {
  company_name: '', country: '', state: '', city: '', registration_number: '',
  administrator_name: '', email: '', confirm_email: '',
  subscription_plan: '1_year',
  mobile_number: '', landline_number: '', address_line1: '', address_line2: '', postal_code: '',
};

export default function AddCompany({ onNavigate }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const api = axios.create({ baseURL: API_BASE });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.email.toLowerCase() !== form.confirm_email.toLowerCase()) {
      setError('Email and Confirm Email do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/register-company', form);
      toast.success('Registration received! Redirecting to payment...');
      onNavigate('payment', { organizationId: res.data.organization_id });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d) => d.msg || JSON.stringify(d)).join(' '));
      else if (err?.code === 'ERR_NETWORK' || !err?.response) setError('Could not reach the server.');
      else setError(`Server error (${err?.response?.status || 'unknown'}). Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Scene3D />
      <form className="auth-card" style={{ maxWidth: 640 }} onSubmit={handleSubmit}>
        <div className="auth-logo">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn-R6R8XHYlhMXEEX4aPCBAXIuLPiXY1AocvchZo4w6A&s=10" alt="img" className="auth-logo-img" />
          ABI-TECH QA-ENGINE
        </div>
        <h1 className="auth-title">Add Company</h1>
        <p className="auth-subtitle">Register your organization to subscribe to QA-Engine.</p>

        <h3 style={{ margin: '10px 0' }}>Company Information</h3>
        <div className="auth-field"><label>Company Name *</label>
          <input required value={form.company_name} onChange={(e) => update('company_name', e.target.value)} /></div>
        <div className="auth-field"><label>Country *</label>
          <input required value={form.country} onChange={(e) => update('country', e.target.value)} /></div>
        <div className="auth-field"><label>State *</label>
          <input required value={form.state} onChange={(e) => update('state', e.target.value)} /></div>
        <div className="auth-field"><label>City *</label>
          <input required value={form.city} onChange={(e) => update('city', e.target.value)} /></div>
        <div className="auth-field"><label>Registration Number *</label>
          <input required value={form.registration_number} onChange={(e) => update('registration_number', e.target.value)} /></div>

        <h3 style={{ margin: '10px 0' }}>Administrator Information</h3>
        <div className="auth-field"><label>Administrator Name *</label>
          <input required value={form.administrator_name} onChange={(e) => update('administrator_name', e.target.value)} /></div>
        <div className="auth-field"><label>Email Address *</label>
          <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
        <div className="auth-field"><label>Confirm Email Address *</label>
          <input type="email" required value={form.confirm_email} onChange={(e) => update('confirm_email', e.target.value)} /></div>

        <h3 style={{ margin: '10px 0' }}>Subscription</h3>
        <div className="auth-field"><label>Subscription Plan *</label>
          <select required value={form.subscription_plan} onChange={(e) => update('subscription_plan', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8 }}>
            {PLANS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select></div>

        <h3 style={{ margin: '10px 0' }}>Contact Details</h3>
        <div className="auth-field"><label>Mobile Number *</label>
          <input required value={form.mobile_number} onChange={(e) => update('mobile_number', e.target.value)} /></div>
        <div className="auth-field"><label>Landline Number</label>
          <input value={form.landline_number} onChange={(e) => update('landline_number', e.target.value)} /></div>
        <div className="auth-field"><label>Address Line 1 *</label>
          <input required value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} /></div>
        <div className="auth-field"><label>Address Line 2</label>
          <input value={form.address_line2} onChange={(e) => update('address_line2', e.target.value)} /></div>
        <div className="auth-field"><label>Postal Code *</label>
          <input required value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} /></div>

        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
          <button type="button" className="auth-submit" style={{ background: '#64748b' }}
            onClick={() => onNavigate('about')}>Cancel</button>
        </div>

        <div className="auth-footer">
          Already registered?{' '}
          <span className="auth-link" onClick={() => onNavigate('login')}>Log in</span>
        </div>
      </form>
    </div>
  );
}
