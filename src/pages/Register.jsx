import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import './Auth.css';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', date_of_birth: '', blood_group: ''
  });

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleNext = () => {
    if (!form.full_name || !form.email || !form.password) { setError('Please fill in all required fields.'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const res = await API.post('/auth/register', {
        full_name: form.full_name, email: form.email, password: form.password,
        phone: form.phone, date_of_birth: form.date_of_birth || null, blood_group: form.blood_group
      });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="material-symbols-outlined">medical_information</span>
          MediCard
        </div>
        <div className="auth-left-content">
          <h2>Your health identity, secured forever.</h2>
          <p>Join thousands of people who trust MediCard with their most important health data.</p>
          <div className="auth-perks">
            {['Instant emergency access via QR & NFC','AI-powered report scanning','Complete medical history vault','Daily medication reminders'].map(p => (
              <div className="perk-item" key={p}>
                <div className="perk-check">✓</div>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap fade-up">
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className="auth-step-line" />
            <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>

          <h1 className="auth-title">{step === 1 ? 'Create account' : 'Medical details'}</h1>
          <p className="auth-sub">{step === 1 ? 'Step 1 of 2 — Basic information' : 'Step 2 of 2 — Health information'}</p>

          {error && <div className="auth-error">{error}</div>}

          {step === 1 ? (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" name="full_name" placeholder="John Doe" value={form.full_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" name="password" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="form-input" name="confirm_password" type="password" placeholder="Repeat your password" value={form.confirm_password} onChange={handleChange} />
              </div>
              <button className="btn-primary auth-btn" onClick={handleNext}>Continue →</button>
            </div>
          ) : (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-input" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-input" name="blood_group" value={form.blood_group} onChange={handleChange}>
                  <option value="">Select blood group</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="auth-btn-row">
                <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary auth-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><span className="spinner" /> Creating...</> : 'Create my MediCard'}
                </button>
              </div>
            </div>
          )}

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          <p className="auth-switch" style={{marginTop:'8px'}}>Are you a doctor? <Link to="/doctor/register">Register as a doctor</Link></p>
        </div>
      </div>
    </div>
  );
}
