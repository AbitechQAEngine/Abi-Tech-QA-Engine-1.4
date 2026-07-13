import React, { useState } from 'react';
import Scene3D from '../components/Scene3D';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function ForgotPassword({ onNavigate }) {
  const { api } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setDevLink('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      if (res.data.dev_reset_token) {
        setDevLink(`Dev mode — reset token: ${res.data.dev_reset_token}`);
      }
      if (res.data.dev_reset_link) {
        setDevLink(res.data.dev_reset_link);
      }
    } catch (err) {
      setMessage('Something went wrong. Please try again.');
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
        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
          />
        </div>

        {message && (
          <div style={{ fontSize: 13, color: '#2d3230', marginBottom: 14 }}>{message}</div>
        )}
        {devLink && <div className="auth-dev-note">{devLink}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div className="auth-footer">
          Remembered it?{' '}
          <span className="auth-link" onClick={() => onNavigate('login')}>Back to log in</span>
        </div>
      </form>
    </div>
  );
}
