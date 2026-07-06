import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import Select from '../components/Select';
import './Auth.css';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', date_of_birth: '', blood_group: '',
    gender: '', address: '', pincode: ''
  });

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleNext = () => {
    if (!form.full_name || !form.email || !form.password) { setError('Please fill in all required fields.'); return; }
    if (form.full_name.trim().split(/\s+/).filter(Boolean).length < 3) {
      setError('Please enter your full name with first, middle and last name.'); return;
    }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setStep(2);
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!form.phone) { setError('Phone number is required for OTP verification.'); return; }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      setError('Pincode must be exactly 6 digits.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await API.post('/auth/register/request-otp', {
        full_name: form.full_name, email: form.email, password: form.password,
        phone: form.phone, date_of_birth: form.date_of_birth || null,
        blood_group: form.blood_group, gender: form.gender || null,
        address: form.address || null, pincode: form.pincode || null
      });
      setOtpPhone(res.data.phone);
      setStep(3);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setError('Please enter the OTP.'); return; }
    setVerifying(true); setError('');
    try {
      const res = await API.post('/auth/register/verify-otp', { phone: otpPhone, otp });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true); setError('');
    try {
      await API.post('/auth/register/resend-otp', { phone: otpPhone });
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setResending(false);
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
            <div className="auth-step-line" />
            <div className={`auth-step ${step >= 3 ? 'active' : ''}`}>3</div>
          </div>

          <h1 className="auth-title">{step === 1 ? 'Create account' : step === 2 ? 'Medical details' : 'Verify your phone'}</h1>
          <p className="auth-sub">
            {step === 1 ? 'Step 1 of 3 — Basic information'
              : step === 2 ? 'Step 2 of 3 — Health & location'
              : 'Step 3 of 3 — Enter the OTP sent to your phone'}
          </p>

          {error && <div className="auth-error">{error}</div>}

          {step === 1 && (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Full Name * <span className="field-hint">(first, middle & last name)</span></label>
                <input className="form-input" name="full_name" placeholder="John Michael Doe" value={form.full_name} onChange={handleChange} />
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
          )}

          {step === 2 && (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-input" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
              </div>
              <div className="auth-fields-row">
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <Select
                    name="blood_group"
                    value={form.blood_group}
                    onChange={handleChange}
                    placeholder="Select"
                    options={['A+','A-','B+','B-','AB+','AB-','O+','O-']}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <Select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    placeholder="Select"
                    options={['Male','Female','Other','Prefer not to say']}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" name="address" placeholder="House no., Street, Area, City" value={form.address} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-input" name="pincode" placeholder="6-digit pincode" maxLength={6} value={form.pincode} onChange={handleChange} />
              </div>
              <div className="auth-btn-row">
                <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary auth-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><span className="spinner" /> Creating...</> : 'Create my MediCard'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="auth-fields">
              <p style={{fontSize:'14px', color:'var(--outline)', marginBottom:'4px'}}>
                We sent a 6-digit code to <strong>{otpPhone}</strong>.
              </p>
              <div className="form-group">
                <label className="form-label">Enter OTP *</label>
                <input className="form-input" name="otp" inputMode="numeric" maxLength={6}
                  placeholder="123456" value={otp} onChange={e => { setOtp(e.target.value); setError(''); }} />
              </div>
              <button className="btn-primary auth-btn" onClick={handleVerifyOtp} disabled={verifying}>
                {verifying ? <><span className="spinner" /> Verifying...</> : 'Verify & Create my MediCard'}
              </button>
              <button className="btn-outline auth-btn" onClick={handleResendOtp} disabled={resending || resendCooldown > 0}>
                {resending ? 'Resending...' : resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
              </button>
              <button className="auth-switch" style={{background:'none', border:'none', cursor:'pointer', padding:0}} onClick={() => setStep(2)}>
                ← Back to edit details
              </button>
            </div>
          )}

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          <p className="auth-switch" style={{marginTop:'8px'}}>Are you a doctor? <Link to="/doctor/register">Register as a doctor</Link></p>
        </div>
      </div>
    </div>
  );
}
