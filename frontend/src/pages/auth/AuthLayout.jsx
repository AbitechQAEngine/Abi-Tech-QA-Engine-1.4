import React from 'react';
import Scene3D from '../../components/Scene3D';
import './auth.css';

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      <Scene3D />
      <div className="auth-vignette" />

      <div className="auth-brand">
        <span className="auth-brand-mark">◈</span>
        <span>ABI-TECH QA-ENGINE</span>
      </div>

      <div className="auth-card">
        {eyebrow && <div className="auth-eyebrow">{eyebrow}</div>}
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        <div className="auth-body">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}
