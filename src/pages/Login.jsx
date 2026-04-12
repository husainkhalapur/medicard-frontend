import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const res = await API.post('/auth/login', form);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
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
          <h2>Welcome back to Clinical Serenity.</h2>
          <p>Sign in to access your complete medical profile, records and emergency settings.</p>
          <div className="auth-perks">
            {['View your full medical history','Manage prescriptions & reminders','Update your emergency profile','Download & share records securely'].map(p => (
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
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">Enter your credentials to access your MediCard account</p>

          {error && <div className="auth-error"><span className="material-symbols-outlined" style={{fontSize:'18px !important'}}>error</span>{error}</div>}

          <div className="auth-fields">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" name="email" type="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} onKeyDown={handleKeyDown} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" name="password" type="password" placeholder="Your password"
                value={form.password} onChange={handleChange} onKeyDown={handleKeyDown} />
            </div>
            <button className="btn-primary auth-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign in'}
            </button>
          </div>

          <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
          <p className="auth-switch" style={{marginTop:'8px'}}>Are you a doctor? <Link to="/doctor/login">Doctor login</Link></p>
        </div>
      </div>
    </div>
  );
}
