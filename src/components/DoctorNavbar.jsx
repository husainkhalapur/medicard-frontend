import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import './DoctorAuth.css';
import './Navbar.css';

export default function DoctorNavbar() {
  const { doctor, doctorLogout } = useDoctorAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { doctorLogout(); navigate('/doctor/login'); };
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar glass doctor-navbar">
      <div className="navbar-inner">
        <Link to="/doctor/dashboard" className="navbar-brand">
          <span className="material-symbols-outlined" style={{color:'var(--secondary)', fontSize:'24px'}}>medical_information</span>
          <span style={{color:'var(--secondary)'}}>MediCard</span>
        </Link>

        <div className="navbar-links">
          <span className="doctor-badge">
            <span className="material-symbols-outlined" style={{fontSize:'14px !important'}}>stethoscope</span>
            Doctor Portal
          </span>
          <Link to="/doctor/dashboard" className={`doctor-nav-link ${isActive('/doctor/dashboard') ? 'active' : ''}`}>
            <span className="material-symbols-outlined" style={{fontSize:'17px'}}>dashboard</span>
            Dashboard
          </Link>
          <div className="navbar-divider" />
          <div className="navbar-user">
            <div className="doctor-avatar">{doctor?.full_name?.charAt(0).toUpperCase()}</div>
            <span className="user-name">{doctor?.full_name?.split(' ').slice(0,2).join(' ')}</span>
          </div>
          <button className="btn-tonal doctor-logout-btn" onClick={handleLogout} style={{padding:'8px 18px', fontSize:'13px', marginLeft:'4px'}}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
