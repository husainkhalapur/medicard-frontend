import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import API from '../api/axios';
import './Auth.css';
import './DoctorAuth.css';

const SPECIALIZATIONS = [
  'General Physician', 'Cardiology', 'Neurology', 'Orthopedic',
  'Dermatology', 'Ophthalmology', 'Pediatrics', 'Gynecology',
  'Psychiatry', 'Oncology', 'Nephrology', 'Gastroenterology',
  'Pulmonology', 'Endocrinology', 'Radiology', 'Pathology', 'Other'
];

export default function DoctorRegister() {
  const { doctorLogin } = useDoctorAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', specialization: '', license_number: '', hospital_name: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleNext = () => {
    if (!form.full_name || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.phone || !form.specialization || !form.license_number || !form.hospital_name) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/doctors/register', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        specialization: form.specialization,
        license_number: form.license_number,
        hospital_name: form.hospital_name,
      });
      doctorLogin(res.data.doctor, res.data.token);
      navigate('/doctor/pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <h2>Join the MediCard<br /><em>doctor network.</em></h2>
          <p>Register to access and manage your patients' health records securely.</p>
          <div className="auth-perks">
            {[
              'Search patients by MediCard ID',
              'View complete medical history',
              'Add records and prescriptions',
              'Verified doctor credentials'
            ].map(p => (
              <div className="perk-item" key={p}>
                <div className="perk-check">✓</div>
                <span>{p}</span>
              </div>
            ))}
          </div>
          <div className="verification-note">
            <span><span className="material-symbols-outlined">lock</span></span>
            <p>All doctor accounts are manually verified before access is granted to protect patient data.</p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap fade-up">
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active doctor-step' : ''}`}>1</div>
            <div className="auth-step-line" />
            <div className={`auth-step ${step >= 2 ? 'active doctor-step' : ''}`}>2</div>
          </div>

          <h1 className="auth-title">Doctor Registration</h1>
          <p className="auth-sub">
            {step === 1 ? 'Step 1 of 2 — Account details' : 'Step 2 of 2 — Professional details'}
          </p>

          {error && <div className="auth-error">{error}</div>}

          {step === 1 ? (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" name="full_name"
                  placeholder="Dr. Arjun Mehta"
                  value={form.full_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" name="email" type="email"
                  placeholder="doctor@hospital.com"
                  value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" name="password" type="password"
                  placeholder="Minimum 6 characters"
                  value={form.password} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="form-input" name="confirm_password" type="password"
                  placeholder="Repeat your password"
                  value={form.confirm_password} onChange={handleChange} />
              </div>
              <button className="btn-primary auth-btn doctor-btn" onClick={handleNext}>
                Continue →
              </button>
            </div>
          ) : (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" name="phone"
                  placeholder="+91 98765 43210"
                  value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization *</label>
                <select className="form-input" name="specialization"
                  value={form.specialization} onChange={handleChange}>
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Medical License Number *</label>
                <input className="form-input" name="license_number"
                  placeholder="e.g. MH-2024-CARD-00421"
                  value={form.license_number} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Hospital / Clinic Name *</label>
                <input className="form-input" name="hospital_name"
                  placeholder="e.g. Apollo Hospital Mumbai"
                  value={form.hospital_name} onChange={handleChange} />
              </div>
              <div className="auth-btn-row">
                <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary auth-btn doctor-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><span className="spinner" /> Registering...</> : 'Submit for Verification'}
                </button>
              </div>
            </div>
          )}

          <p className="auth-switch">
            Already registered? <Link to="/doctor/login">Sign in</Link>
          </p>
          <p className="auth-switch" style={{marginTop:'8px'}}>
            Are you a patient? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
