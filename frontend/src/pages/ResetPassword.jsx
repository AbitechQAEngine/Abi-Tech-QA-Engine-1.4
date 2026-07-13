import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Scene3D from '../components/Scene3D';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function ResetPassword({ onNavigate }) {
  const { api } = useAuth();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, []);

  function clientValidationError() {
    if (!token.trim()) return 'Please enter the reset token from your email.';
    if (newPassword.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(newPassword)) return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(newPassword)) return 'Password must contain at least one number.';
    if (newPassword !== confirmPassword) return 'Passwords do not match.';
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
      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
      toast.success('Password reset — you can log in now.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <Scene3D />
        <div className="auth-card">
          <div className="auth-logo">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn-R6R8XHYlhMXEEX4aPCBAXIuLPiXY1AocvchZo4w6A&s=10" alt="Abi Tech" className="auth-logo-img" />
        <span className="auth-logo-text">ABI-TECH QA-ENGINE</span>
        </div>
          <h1 className="auth-title">Password reset ✅</h1>
          <p className="auth-subtitle">Your password has been updated successfully.</p>
          <button className="auth-submit" onClick={() => onNavigate('login')}>
            Go to Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Scene3D />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">ABI-TECH QA-ENGINE</div>
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">Paste the reset token from your email and choose a new password.</p>

        <div className="auth-field">
          <label>Reset Token</label>
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your reset token"
          />
        </div>

        <div className="auth-field">
          <label>New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters, 1 uppercase, 1 number"
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field">
          <label>Confirm New Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            autoComplete="new-password"
          />
        </div>

        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        <div className="auth-footer">
          <span className="auth-link" onClick={() => onNavigate('login')}>Back to log in</span>
        </div>
      </form>
    </div>
  );
}
