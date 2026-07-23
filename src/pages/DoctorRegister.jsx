import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import API from '../api/axios';
import SpecializationPicker from '../components/SpecializationPicker';
import { validatePassword, getPasswordChecklist } from '../utils/passwordPolicy';
import './Auth.css';
import './DoctorAuth.css';

export default function DoctorRegister() {
  const { doctorLogin } = useDoctorAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', specializations: [], license_number: '', hospital_name: ''
  });

  // OTP step — disabled for now, see handleSubmit and the commented-out
  // step-3 JSX below.
  // const [otp, setOtp] = useState('');
  // const [otpPhone, setOtpPhone] = useState('');
  // const [verifying, setVerifying] = useState(false);
  // const [resending, setResending] = useState(false);
  // const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  // Phone is entered as just the 10-digit local number — the +91 prefix is
  // fixed in the UI and stitched back on before it's sent to the API.
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, phone: digits });
    setError('');
  };

  const handleNext = () => {
    if (!form.full_name || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.full_name.trim().split(/\s+/).filter(Boolean).length < 3) {
      setError('Please enter your full name with first, middle and last name.');
      return;
    }
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) {
      setError(pwCheck.message);
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setStep(2);
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
  // directly (backend change to match), so this logs the doctor in
  // immediately instead of advancing to a step-3 OTP screen.
  const handleSubmit = async () => {
    if (form.phone.length !== 10 || form.specializations.length === 0 || !form.license_number || !form.hospital_name) {
      setError('Please fill in all required fields, including a valid 10-digit phone number and at least one specialization.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/doctors/register/request-otp', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: `+91${form.phone}`,
        specializations: form.specializations,
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

  // const handleVerifyOtp = async () => {
  //   if (!otp) { setError('Please enter the OTP.'); return; }
  //   setVerifying(true); setError('');
  //   try {
  //     const res = await API.post('/doctors/register/verify-otp', { phone: otpPhone, otp });
  //     doctorLogin(res.data.doctor, res.data.token);
  //     navigate('/doctor/pending');
  //   } catch (err) {
  //     setError(err.response?.data?.error || 'OTP verification failed. Please try again.');
  //   } finally {
  //     setVerifying(false);
  //   }
  // };

  // const handleResendOtp = async () => {
  //   setResending(true); setError('');
  //   try {
  //     await API.post('/doctors/register/resend-otp', { phone: otpPhone });
  //     startResendCooldown();
  //   } catch (err) {
  //     setError(err.response?.data?.error || 'Failed to resend OTP.');
  //   } finally {
  //     setResending(false);
  //   }
  // };

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
          {/* Step indicator/titles collapsed to 2 steps while OTP (step 3) is
              disabled. Restore the 3rd dot and the step===3 branches below
              when re-enabling. */}
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active doctor-step' : ''}`}>1</div>
            <div className="auth-step-line" />
            <div className={`auth-step ${step >= 2 ? 'active doctor-step' : ''}`}>2</div>
          </div>

          <h1 className="auth-title">Doctor Registration</h1>
          <p className="auth-sub">
            {step === 1 ? 'Step 1 of 2 — Account details'
              : 'Step 2 of 2 — Professional details'}
          </p>

          {error && <div className="auth-error">{error}</div>}

          {step === 1 && (
            <div className="auth-fields">
              <div className="form-group">
                <label className="form-label">Full Name * <span className="field-hint">(first, middle & last name)</span></label>
                <input className="form-input" name="full_name"
                  placeholder="Dr. Arjun Kumar Mehta"
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
                  placeholder="Min 8 chars, upper/lower/number/symbol"
                  value={form.password} onChange={handleChange} />
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
                <input className="form-input" name="confirm_password" type="password"
                  placeholder="Repeat your password"
                  value={form.confirm_password} onChange={handleChange} />
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
              <button className="btn-primary auth-btn doctor-btn" onClick={handleNext}>
                Continue →
              </button>
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
                <label className="form-label">Specializations *</label>
                <SpecializationPicker
                  value={form.specializations}
                  onChange={(specializations) => { setForm({ ...form, specializations }); setError(''); }} />
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

          {/* Step 3 (phone OTP) disabled for now — handleSubmit above logs
              the doctor in directly after step 2.
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
              <button className="btn-primary auth-btn doctor-btn" onClick={handleVerifyOtp} disabled={verifying}>
                {verifying ? <><span className="spinner" /> Verifying...</> : 'Verify & Submit for Verification'}
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
