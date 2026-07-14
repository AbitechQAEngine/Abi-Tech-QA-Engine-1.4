import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function FirstLoginPasswordModal() {
  const { api, user, loginSuccess, token } = useAuth();
  const [mode, setMode] = useState('prompt'); // prompt | form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function clientError() {
    if (newPassword.length < 8) return 'Minimum 8 characters.';
    if (!/[A-Z]/.test(newPassword)) return 'Must include an uppercase letter.';
    if (!/[a-z]/.test(newPassword)) return 'Must include a lowercase letter.';
    if (!/[0-9]/.test(newPassword)) return 'Must include a number.';
    if (!/[^A-Za-z0-9]/.test(newPassword)) return 'Must include a special character.';
    if (newPassword !== confirmPassword) return 'Passwords do not match.';
    return '';
  }

  async function submitReset(e) {
    e.preventDefault();
    const err = clientError();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-temp-password', { new_password: newPassword, confirm_password: confirmPassword });
      toast.success('Password updated.');
      loginSuccess(token, { ...user, must_reset_password: false });
    } catch (err2) {
      setError(err2?.response?.data?.detail || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  async function skip() {
    try {
      await api.post('/auth/skip-temp-password-reset');
    } catch { /* non-blocking */ }
    loginSuccess(token, { ...user, must_reset_password: false });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, maxWidth: '90vw' }}>
        {mode === 'prompt' ? (
          <>
            <h2 style={{ marginTop: 0 }}>Welcome to ABI-TECH QA-Engine</h2>
            <p style={{ color: '#475569' }}>
              You are currently using a temporary password. Would you like to reset it now?
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="auth-submit" onClick={() => setMode('form')}>Reset Password</button>
              <button className="auth-submit" style={{ background: '#64748b' }} onClick={skip}>Skip</button>
            </div>
          </>
        ) : (
          <form onSubmit={submitReset}>
            <h2 style={{ marginTop: 0 }}>Set a New Password</h2>
            <div className="auth-field">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              Minimum 8 characters, uppercase, lowercase, number, special character.
            </div>
            {error && <div className="field-error" style={{ marginBottom: 10 }}>{error}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
