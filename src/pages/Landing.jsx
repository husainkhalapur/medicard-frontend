import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Landing.css';

export default function Landing() {
  const features = [
    { icon: 'id_card', title: 'Smart MediCard', desc: 'A physical card with QR and NFC giving instant access to your emergency medical profile.' },
    { icon: 'folder_shared', title: 'Medical History Vault', desc: 'Store all diagnoses, reports and records securely. Access them anywhere, anytime.' },
    { icon: 'document_scanner', title: 'AI Report Scanner', desc: 'Photograph hard copy reports and let AI digitize, interpret and categorize them instantly.' },
    { icon: 'alarm', title: 'Pill Reminders', desc: 'Never miss a dose. Smart daily reminders for all your medications with calendar view.' },
    { icon: 'location_on', title: 'GPS Locator', desc: 'Built-in GPS so emergency contacts can locate you when it matters most.' },
    { icon: 'shield', title: 'Insurance Vault', desc: 'Keep all insurance policies linked to your unique ID, accessible everywhere.' },
  ];

  const steps = [
    { num: '01', title: 'Secure Onboarding', desc: 'Register and receive your personal MC-XXXX-XXXX MediCard ID instantly.' },
    { num: '02', title: 'Build Your Profile', desc: 'Add your history, emergency info, prescriptions and medical reports.' },
    { num: '03', title: 'Receive Your Card', desc: 'Your smart card with QR, NFC and GPS is printed and delivered.' },
    { num: '04', title: 'Stay Safe Everywhere', desc: 'Anyone can scan your card in an emergency and get critical info instantly.' },
  ];

  const testimonials = [
    { name: 'Dr. Sarah Chen', role: 'Chief of Cardiology', quote: 'The interface is a breath of fresh air. It feels more like reading a premium journal than a medical portal.' },
    { name: 'Mark Thompson', role: 'Patient since 2022', quote: 'MediCard saved my life. Paramedics scanned my QR code and saw my penicillin allergy instantly.' },
    { name: 'Dr. James Aris', role: 'Family Medicine', quote: 'Our patients love having direct access to their records. The security is best-in-class.' },
  ];

  return (
    <div className="landing">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-blob hero-blob-1" />
        <div className="hero-bg-blob hero-blob-2" />
        <div className="hero-inner">
          <div className="hero-text fade-up">
            <span className="hero-pill">
              <span className="hero-pill-dot" />
              Secure · Clinical · Personal
            </span>
            <h1 className="hero-heading">
              Clinical Serenity<br />for your Health.
            </h1>
            <p className="hero-sub">
              A sophisticated ecosystem for managing health records with authoritative security and breathable clarity. Experience the next era of digital healthcare.
            </p>
            <div className="hero-portal-cards">
              <div className="portal-card patient-portal">
                <span className="material-symbols-outlined portal-icon">person</span>
                <div className="portal-title">I'm a Patient</div>
                <div className="portal-desc">Access your health records, emergency profile and prescriptions</div>
                <div className="portal-actions">
                  <Link to="/login" className="btn-primary" style={{fontSize:'14px', padding:'10px 22px'}}>Sign In</Link>
                  <Link to="/register" className="btn-secondary" style={{fontSize:'14px', padding:'10px 22px'}}>Register</Link>
                </div>
              </div>
              <div className="portal-card doctor-portal">
                <span className="material-symbols-outlined portal-icon">stethoscope</span>
                <div className="portal-title">I'm a Doctor</div>
                <div className="portal-desc">Search patients by MediCard ID and manage their records securely</div>
                <div className="portal-actions">
                  <Link to="/doctor/login" className="btn-primary doctor-btn" style={{fontSize:'14px', padding:'10px 22px'}}>Sign In</Link>
                  <Link to="/doctor/register" className="btn-secondary" style={{fontSize:'14px', padding:'10px 22px', color:'var(--secondary)'}}>Register</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-visual fade-up fade-up-delay-2">
            <div className="hero-card-stack">
              <div className="mock-card">
                <div className="mock-card-top">
                  <span style={{fontFamily:'Manrope', fontWeight:800, fontSize:'16px'}}>MediCard</span>
                  <span className="material-symbols-outlined" style={{fontSize:'20px', opacity:0.7}}>contactless</span>
                </div>
                <div className="mock-card-body">
                  <div className="mock-avatar-circle">JD</div>
                  <div className="mock-info">
                    <div className="mock-name">John Doe</div>
                    <div className="mock-id">MC-K7PX-3NQR</div>
                    <span className="badge badge-primary" style={{fontSize:'11px', marginTop:'6px'}}>Blood: O+</span>
                  </div>
                </div>
                <div className="mock-card-bottom">
                  <span style={{fontSize:'11px', opacity:0.6}}><span className="material-symbols-outlined">contactless</span> NFC</span>
                  <span style={{fontSize:'11px', opacity:0.6}}><span className="material-symbols-outlined">location_on</span> GPS</span>
                  <div className="mock-qr-dots">
                    {Array(16).fill(0).map((_, i) => (
                      <div key={i} className={`qr-dot ${Math.random() > 0.4 ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-strip">
        <div className="stats-inner">
          {[['10s','Emergency access'],['256-bit','AES encryption'],['99.9%','Uptime SLA'],['24/7','Data availability']].map(([val, label]) => (
            <div className="stat-block" key={label}>
              <div className="stat-val">{val}</div>
              <div className="stat-lbl">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-inner">
          <div className="section-eyebrow">What MediCard does</div>
          <h2 className="section-heading">Everything you need,<br />nothing you don't.</h2>
          <div className="features-grid">
            {features.map(f => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon-wrap">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="section-inner how-inner">
          <div className="how-text">
            <div className="section-eyebrow">How it works</div>
            <h2 className="section-heading">Seamlessly<br />Integrated Care.</h2>
            <p style={{color:'var(--on-surface-variant)', fontSize:'16px', lineHeight:'1.7'}}>
              Bridging the gap between data and delivery through four focused phases.
            </p>
          </div>
          <div className="steps-list">
            {steps.map(s => (
              <div className="step-item" key={s.num}>
                <div className="step-num">{s.num}</div>
                <div>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="section-inner">
          <div className="testimonials-header">
            <h2>Trusted by Medical<br />Professionals.</h2>
            <p>Real stories from patients and doctors transformed by MediCard.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map(t => (
              <div className="testimonial-card" key={t.name}>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-quote">"{t.quote}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.name.charAt(0)}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Ready for a Better<br />Health Journey?</h2>
          <p>Join thousands of patients and doctors redefining healthcare one secure record at a time.</p>
          <div className="cta-actions">
            <Link to="/register" className="btn-primary" style={{fontSize:'16px', padding:'14px 40px'}}>
              Create Your Free Account
            </Link>
            <Link to="/doctor/register" className="btn-outline" style={{fontSize:'16px', padding:'14px 40px', borderColor:'rgba(255,255,255,0.4)', color:'white'}}>
              Register as Doctor
            </Link>
          </div>
          <p style={{fontSize:'13px', opacity:0.6, marginTop:'8px'}}>No credit card required. HIPAA compliant.</p>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="material-symbols-outlined" style={{color:'var(--primary)', fontSize:'22px'}}>medical_information</span>
            <span style={{fontFamily:'Manrope', fontWeight:800, color:'var(--on-surface)'}}>MediCard</span>
          </div>
          <p className="footer-copy">© 2024 MediCard Healthcare Platform. Secure & Encrypted.</p>
          <div className="footer-links">
            <a href="/">Privacy Policy</a>
            <a href="/">Terms of Service</a>
            <a href="/">HIPAA Compliance</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
