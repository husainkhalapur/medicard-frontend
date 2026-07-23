import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import Select from '../components/Select';
import { validatePassword, getPasswordChecklist } from '../utils/passwordPolicy';
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

  // OTP step — disabled for now, see handleSubmit and the commented-out
  // step-3 JSX below.
  // const [otp, setOtp] = useState('');
  // const [otpPhone, setOtpPhone] = useState('');
  // const [verifying, setVerifying] = useState(false);
  // const [resending, setResending] = useState(false);
  // const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  // Phone is entered as just the 10-digit local number — the +91 prefix is
  // fixed in the UI and stitched back on before it's sent to the API.
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, phone: digits });
    setError('');
  };

  const handleNext = () => {
    if (!form.full_name || !form.email || !form.password) { setError('Please fill in all required fields.'); return; }
    if (form.full_name.trim().split(/\s+/).filter(Boolean).length < 3) {
      setError('Please enter your full name with first, middle and last name.'); return;
    }
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) { setError(pwCheck.message); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    setError(''); setStep(2);
  };

  // const startResendCooldown = () => {
  //   setResendCooldown(30);
  //   const interval = setInterval(() => {
  //     setResendCooldown(prev => {
  //       if (prev <= 1) { clearInterval(interval); return 0; }
  //       return prev - 1;
  //     });
  //   }, 1000);
  // };

  // OTP verification disabled for now — request-otp creates the account
  // directly (backend change to match), so this logs the user in immediately
  // instead of advancing to a step-3 OTP screen.
  const handleSubmit = async () => {
    if (form.phone.length !== 10) { setError('Enter a valid 10-digit phone number.'); return; }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      setError('Pincode must be exactly 6 digits.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await API.post('/auth/register/request-otp', {
        full_name: form.full_name, email: form.email, password: form.password,
        phone: `+91${form.phone}`, date_of_birth: form.date_of_birth || null,
        blood_group: form.blood_group, gender: form.gender || null,
        address: form.address || null, pincode: form.pincode || null
      });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // const handleVerifyOtp = async () => {
  //   if (!otp) { setError('Please enter the OTP.'); return; }
  //   setVerifying(true); setError('');
  //   try {
  //     const res = await API.post('/auth/register/verify-otp', { phone: otpPhone, otp });
  //     login(res.data.user, res.data.token);
  //     navigate('/dashboard');
  //   } catch (err) {
  //     setError(err.response?.data?.error || 'OTP verification failed. Please try again.');
  //   } finally {
  //     setVerifying(false);
  //   }
  // };

  // const handleResendOtp = async () => {
  //   setResending(true); setError('');
  //   try {
  //     await API.post('/auth/register/resend-otp', { phone: otpPhone });
  //     startResendCooldown();
  //   } catch (err) {
  //     setError(err.response?.data?.error || 'Failed to resend OTP.');
  //   } finally {
  //     setResending(false);
  //   }
  // };

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
          {/* Step indicator/titles collapsed to 2 steps while OTP (step 3) is
              disabled. Restore the 3rd dot and the step===3 branches below
              when re-enabling. */}
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className="auth-step-line" />
            <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>

          <h1 className="auth-title">{step === 1 ? 'Create account' : 'Medical details'}</h1>
          <p className="auth-sub">
            {step === 1 ? 'Step 1 of 2 — Basic information'
              : 'Step 2 of 2 — Health & location'}
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
                <input className="form-input" name="password" type="password" placeholder="Min 8 chars, upper/lower/number/symbol" value={form.password} onChange={handleChange} />
                {form.password && (
                  <div className="pw-checklist">
                    {getPasswordChecklist(form.password).map(rule => (
                      <div key={rule.label} className={`pw-check-item ${rule.met ? 'met' : ''}`}>
                        <span className="material-symbols-outlined pw-check-icon">{rule.met ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="form-input" name="confirm_password" type="password" placeholder="Repeat your password" value={form.confirm_password} onChange={handleChange} />
                {form.confirm_password && (
                  <div className="pw-checklist">
                    <div className={`pw-check-item ${form.confirm_password === form.password ? 'met' : ''}`}>
                      <span className="material-symbols-outlined pw-check-icon">
                        {form.confirm_password === form.password ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Passwords match</span>
                    </div>
                  </div>
                )}
              </div>
              <button className="btn-primary auth-btn" onClick={handleNext}>Continue →</button>
            </div>
          )}

          {step === 2 && (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <div className="form-input phone-input-group">
                  <span className="phone-input-prefix">+91</span>
                  <input className="phone-input-field" name="phone" type="tel" inputMode="numeric"
                    placeholder="98765 43210" value={form.phone} onChange={handlePhoneChange} />
                </div>
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

          {/* Step 3 (phone OTP) disabled for now — handleSubmit above logs
              the user in directly after step 2.
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
          */}

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          <p className="auth-switch" style={{marginTop:'8px'}}>Are you a doctor? <Link to="/doctor/register">Register as a doctor</Link></p>
        </div>
      </div>
    </div>
  );
}
