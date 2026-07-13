import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Scene3D from '../components/Scene3D';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Signup({ onNavigate }) {
  const { api, loginSuccess } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function clientValidationError() {
    if (form.password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(form.password)) return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(form.password)) return 'Password must contain at least one number.';
    if (form.password !== form.confirm_password) return 'Passwords do not match.';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const clientErr = clientValidationError();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      loginSuccess(res.data.access_token, res.data.user);
      toast.success('Account created — welcome!');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || JSON.stringify(d)).join(' '));
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError('Could not reach the server. Check that the backend is running and reachable.');
      } else {
        setError(`Server error (${err?.response?.status || 'unknown'}). Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Scene3D />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn-R6R8XHYlhMXEEX4aPCBAXIuLPiXY1AocvchZo4w6A&s=10" alt="img" className="auth-logo-img"/>
         ABI-TECH QA-ENGINE
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start generating test cases in minutes.</p>

        <div className="auth-field">
          <label>Full Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Your Name"
            autoComplete="name"
          />
        </div>

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="Email"
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label>Password</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
          />
          <div className='auth-footer'>At least 8 characters, 1 uppercase, 1 number</div>
        </div>

        <div className="auth-field">
          <label>Confirm Password</label>
          <input
            type="password"
            required
            value={form.confirm_password}
            onChange={(e) => update('confirm_password', e.target.value)}
            placeholder="Confirm Password"
            autoComplete="new-password"
          />
        </div>

        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <div className="auth-footer">
          Already have an account?{' '}
          <span className="auth-link" onClick={() => onNavigate('login')}>Log in</span>
        </div>
      </form>
    </div>
  );
}
