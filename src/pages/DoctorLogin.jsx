import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import API from '../api/axios';
import './Auth.css';
import './DoctorAuth.css';

export default function DoctorLogin() {
  const { doctorLogin } = useDoctorAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/doctors/login', form);
      doctorLogin(res.data.doctor, res.data.token);
      if (res.data.doctor.verification_status === 'pending') {
        navigate('/doctor/pending');
      } else {
        navigate('/doctor/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="auth-page">
      <div className="auth-left doctor-left">
        <div className="auth-brand">
          <span className="material-symbols-outlined" style={{fontSize:'26px', color:'white'}}>medical_information</span>
          MediCard
        </div>
        <div className="auth-left-content">
          <div className="doctor-badge">‍ Doctor Portal</div>
          <h2>Welcome back,<br /><em>Doctor.</em></h2>
          <p>Sign in to access and manage your patients' health records.</p>
          <div className="auth-perks">
            {[
              'Search patients by MediCard ID',
              'View complete medical history',
              'Add records and prescriptions',
              'Track recently accessed patients'
            ].map(p => (
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
          <h1 className="auth-title">Doctor Sign In</h1>
          <p className="auth-sub">Enter your credentials to access the doctor portal</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-fields">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" name="email" type="email"
                placeholder="doctor@hospital.com"
                value={form.email} onChange={handleChange} onKeyDown={handleKeyDown} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" name="password" type="password"
                placeholder="Your password"
                value={form.password} onChange={handleChange} onKeyDown={handleKeyDown} />
            </div>
            <button className="btn-primary auth-btn doctor-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign in →'}
            </button>
          </div>

          <p className="auth-switch">
            Not registered yet? <Link to="/doctor/register">Register as Doctor</Link>
          </p>
          <p className="auth-switch" style={{marginTop:'8px'}}>
            Are you a patient? <Link to="/login">Patient login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
