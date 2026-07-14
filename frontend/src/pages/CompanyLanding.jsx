import React from 'react';
import {
  FlaskConical, Code2, Bug, Camera, ArrowRight, CheckCircle2,
  Globe2, Users, Briefcase, Award, Building2,
} from 'lucide-react';
import './CompanyLanding.css';

const stats = [
  { label: 'Completed Projects', value: '1000+' },
  { label: 'Years of Experience', value: '18+' },
  { label: 'Happy Customers', value: '500+' },
  { label: 'Founded', value: '2015' },
];

const services = [
  { icon: Code2, title: 'Custom Software Development', desc: 'Bespoke, scalable software built around how your business actually works.' },
  { icon: Globe2, title: 'Web & E-Commerce Development', desc: 'Interactive web platforms, CMS builds and online marketplaces.' },
  { icon: Briefcase, title: 'Mobile App Development', desc: 'iOS and Android apps carried through ideation, build, testing and support.' },
  { icon: Building2, title: 'ERP & Business Management', desc: 'ERP, CRM and business-process solutions that streamline operations.' },
  { icon: Users, title: 'Cloud & IT Managed Services', desc: 'Cloud infrastructure and IT support for businesses without an in-house team.' },
  { icon: Award, title: 'AR / VR & Emerging Tech', desc: 'Immersive AR/VR, IoT and big-data solutions for forward-looking teams.' },
];

const qaFeatures = [
  { icon: FlaskConical, title: 'Test Case Generator', desc: 'Turn a module and feature description into positive, negative, validation and boundary test cases in seconds.' },
  { icon: Camera, title: 'Screenshot → Test Cases', desc: 'Drop in a UI screenshot and get a full set of test cases based on what is actually on screen — right inside the Test Cases module.' },
  { icon: Code2, title: 'Automation Scripts', desc: 'Convert generated test cases into ready-to-run Playwright or Selenium scripts.' },
  { icon: Bug, title: 'Bug Report Generator', desc: 'Standardized bug reports with severity, priority and reproduction steps, generated automatically.' },
];

export default function CompanyLanding({ onNavigate }) {
  return (
    <div className="landing-page">
      {/* Top nav */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn-R6R8XHYlhMXEEX4aPCBAXIuLPiXY1AocvchZo4w6A&s=10"
              alt="ABI-Tech"
              className="landing-brand-img"
            />
            <span>ABI-TECH QA-ENGINE</span>
          </div>
          <div className="landing-nav-actions">
            <button className="landing-btn landing-btn-ghost" onClick={() => onNavigate('login')}>Login</button>
            <button className="landing-btn landing-btn-primary" onClick={() => onNavigate('addcompany')}>Add Company</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">Built by ABI-Tech Solution</div>
            <h1>QA testing, generated in seconds — not sprints.</h1>
            <p>
              ABI-TECH QA-ENGINE is our in-house AI-powered QA platform. It generates test cases, UI-driven
              test cases from screenshots, automation scripts and bug reports so QA teams spend less time on
              repetitive documentation and more time on real testing.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={() => onNavigate('addcompany')}>
                Get Started Free <ArrowRight size={16} />
              </button>
              <button className="landing-btn landing-btn-ghost landing-btn-lg" onClick={() => onNavigate('login')}>
                I already have an account
              </button>
            </div>
          </div>
          <div className="landing-hero-stats">
            {stats.map(s => (
              <div className="landing-stat-card" key={s.label}>
                <div className="landing-stat-value">{s.value}</div>
                <div className="landing-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About ABI-Tech */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <div className="landing-eyebrow">About Our Company</div>
            <h2>ABI-Tech Solution</h2>
          </div>
          <div className="landing-about-grid">
            <div className="landing-about-copy">
              <p>
                ABI-Tech Solution is a digital transformation company founded in 2015, with its head office in
                Singapore and branches across Malaysia and India, including delivery teams in Puducherry and
                Chennai. Over 18 years of combined industry experience, the team has grown into one of the
                fastest-growing technology partners for organizations looking to modernize how they build and
                run software.
              </p>
              <p>
                The company works across custom software development, web and e-commerce platforms, mobile
                applications, ERP and CRM implementation, Microsoft solutions (Office 365, Dynamics, SharePoint),
                cloud and managed IT services, and emerging technology such as AR/VR and IoT. ABI-Tech also
                builds its own product suite, ABIWHIZ, covering payroll, HR, project-based resourcing and sales
                force automation.
              </p>
              <p>
                ABI-Tech has delivered more than a thousand projects for clients across construction, marine
                engineering, oil &amp; gas, energy, retail, transportation, healthcare, sports and education,
                combining deep domain expertise with hands-on delivery. ABI-TECH QA-ENGINE is a natural extension
                of that same engineering discipline — built to bring the same speed and rigor to software quality
                assurance.
              </p>
              <ul className="landing-checklist">
                <li><CheckCircle2 size={16} /> 1000+ projects delivered across 8+ industries</li>
                <li><CheckCircle2 size={16} /> Offices in Singapore, Malaysia, Puducherry &amp; Chennai</li>
                <li><CheckCircle2 size={16} /> In-house product suite: ABIWHIZ HRMS, Payroll &amp; PRMS</li>
              </ul>
              <a href="https://abi-tech.in/" target="_blank" rel="noreferrer" className="landing-link">
                Visit abi-tech.in <ArrowRight size={13} />
              </a>
            </div>
            <div className="landing-services-grid">
              {services.map(s => {
                const Icon = s.icon;
                return (
                  <div className="landing-service-card" key={s.title}>
                    <div className="landing-service-icon"><Icon size={18} /></div>
                    <div className="landing-service-title">{s.title}</div>
                    <div className="landing-service-desc">{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Product features */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <div className="landing-eyebrow">The Product</div>
            <h2>Everything your QA workflow needs, in one place</h2>
          </div>
          <div className="landing-feature-grid">
            {qaFeatures.map(f => {
              const Icon = f.icon;
              return (
                <div className="landing-feature-card" key={f.title}>
                  <div className="landing-feature-icon"><Icon size={20} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Ready to speed up your QA process?</h2>
          <p>Create a free account and generate your first batch of test cases in minutes.</p>
          <div className="landing-hero-actions" style={{ justifyContent: 'center' }}>
            <button className="landing-btn landing-btn-white landing-btn-lg" onClick={() => onNavigate('addcompany')}>
              Sign Up <ArrowRight size={16} />
            </button>
            <button className="landing-btn landing-btn-outline landing-btn-lg" onClick={() => onNavigate('login')}>
              Log In
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} ABI-Tech Solution · ABI-TECH QA-ENGINE</span>
      </footer>
    </div>
  );
}
