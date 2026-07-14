import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Scene3D from '../components/Scene3D';
import { API_BASE } from '../config';
import './Auth.css';

export default function Payment({ organizationId, onNavigate }) {
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const api = axios.create({ baseURL: API_BASE });

  useEffect(() => {
    if (!organizationId) return;
    api.get(`/register-company/${organizationId}`).then((res) => setReg(res.data)).catch(() => setError('Registration not found.'));
    
  }, [organizationId]);

  async function pay(gateway) {
    setLoading(true);
    setError('');
    try {
      await api.post(`/register-company/${organizationId}/pay`, { gateway });
      toast.success('Payment successful! Waiting for ABI-TECH admin approval.');
      onNavigate('login');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!organizationId) {
    return (
      <div className="auth-page">
        <Scene3D />
        <div className="auth-card">
          <p>No registration selected. Please register your company first.</p>
          <button className="auth-submit" onClick={() => onNavigate('addcompany')}>Add Company</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Scene3D />
      <div className="auth-card">
        <div className="auth-logo">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn-R6R8XHYlhMXEEX4aPCBAXIuLPiXY1AocvchZo4w6A&s=10" alt="img" className="auth-logo-img" />
          ABI-TECH QA-ENGINE
        </div>
        <h1 className="auth-title">Complete Payment</h1>
        {reg ? (
          <>
            <p className="auth-subtitle">{reg.company_name} — {reg.subscription_plan} plan</p>
            <p style={{ fontSize: 28, fontWeight: 700, margin: '12px 0' }}>${reg.amount}</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              Test Payment Gateway (sandbox mode) — no real charge is made.
            </p>
            {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="auth-submit" disabled={loading} onClick={() => pay('stripe_test')}>
              {loading ? 'Processing...' : 'Pay with Stripe Test Mode'}
            </button>
            <button className="auth-submit" style={{ marginTop: 10, background: '#334155' }} disabled={loading} onClick={() => pay('razorpay_test')}>
              Pay with Razorpay Test Mode
            </button>
            <button className="auth-submit" style={{ marginTop: 10, background: '#334155' }} disabled={loading} onClick={() => pay('paypal_sandbox')}>
              Pay with PayPal Sandbox
            </button>
          </>
        ) : (
          <p>{error || 'Loading registration details...'}</p>
        )}
      </div>
    </div>
  );
}
