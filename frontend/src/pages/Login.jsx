import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Scene3D from '../components/Scene3D';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login({ onNavigate }) {
  const { api, loginSuccess } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      loginSuccess(res.data.access_token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}!`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError('Could not reach the server. Check that the backend is running and reachable.');
      } else {
        setError(`Login failed (${err?.response?.status || 'unknown'}). Please try again.`);
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
  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn-R6R8XHYlhMXEEX4aPCBAXIuLPiXY1AocvchZo4w6A&s=10" alt="Abi Tech" className="auth-logo-img" />
  <span className="auth-logo-text">ABI-TECH QA-ENGINE</span>
</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Log in to access your QA projects.</p>

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
            autoComplete="current-password"
          />
        </div>

        <div className="auth-forgot-row">
          <span className="auth-link" onClick={() => onNavigate('forgot')}>
            Forgot password ?
          </span>
        </div>

        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <div className="auth-footer">
          Don't have an account?{' '}
          <span className="auth-link" onClick={() => onNavigate('signup')}>Sign up</span>
        </div>
      </form>
    </div>
  );
}
