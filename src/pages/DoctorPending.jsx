import { useDoctorAuth } from '../context/DoctorAuthContext';
import { useNavigate } from 'react-router-dom';
import './DoctorPending.css';

export default function DoctorPending() {
  const { doctor, doctorLogout } = useDoctorAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    doctorLogout();
    navigate('/doctor/login');
  };

  return (
    <div className="pending-page">
      <div className="pending-navbar">
        <div className="navbar-brand">
          <span className="material-symbols-outlined" style={{color:'var(--secondary)', fontSize:'24px'}}>medical_information</span>
          <span>MediCard</span>
        </div>
        <button className="btn-outline" onClick={handleLogout}
          style={{fontSize:'13px', padding:'7px 16px'}}>
          Logout
        </button>
      </div>

      <div className="pending-inner">
        <div className="pending-card fade-up">
          <div className="pending-icon"><span className="material-symbols-outlined" style={{fontSize:"32px"}}>hourglass_empty</span></div>
          <h1 className="pending-title">Account Pending Verification</h1>
          <p className="pending-sub">
            Thank you for registering, <strong>{doctor?.full_name}</strong>.
            Your account has been submitted for review.
          </p>

          <div className="pending-details">
            <div className="pending-detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{doctor?.email}</span>
            </div>
            <div className="pending-detail-row">
              <span className="detail-label">Specialization</span>
              <span className="detail-value">{doctor?.specialization}</span>
            </div>
            <div className="pending-detail-row">
              <span className="detail-label">License Number</span>
              <span className="detail-value">{doctor?.license_number}</span>
            </div>
            <div className="pending-detail-row">
              <span className="detail-label">Hospital</span>
              <span className="detail-value">{doctor?.hospital_name}</span>
            </div>
            <div className="pending-detail-row">
              <span className="detail-label">Status</span>
              <span className="badge badge-orange"><span className="material-symbols-outlined" style={{fontSize:"64px"}}>hourglass_empty</span> Pending Verification</span>
            </div>
          </div>

          <div className="pending-steps">
            <h3>What happens next?</h3>
            <div className="pending-step-list">
              <div className="pending-step done">
                <div className="step-dot done">✓</div>
                <div>
                  <div className="step-title">Registration submitted</div>
                  <div className="step-desc">Your details have been received</div>
                </div>
              </div>
              <div className="pending-step current">
                <div className="step-dot current">2</div>
                <div>
                  <div className="step-title">Admin review</div>
                  <div className="step-desc">Your license and credentials are being verified</div>
                </div>
              </div>
              <div className="pending-step">
                <div className="step-dot">3</div>
                <div>
                  <div className="step-title">Account activated</div>
                  <div className="step-desc">You will be able to access patient records</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pending-note">
            <span className="material-symbols-outlined">mail</span>
            <p>
              Verification typically takes 24 to 48 hours. Once approved you can
              log in and access the doctor portal immediately.
              If you have questions contact <strong>support@medicard.in</strong>
            </p>
          </div>

          <button className="btn-outline" onClick={handleLogout}
            style={{marginTop:'8px', width:'100%', justifyContent:'center'}}>
            Sign out and come back later
          </button>
        </div>
      </div>
    </div>
  );
}
