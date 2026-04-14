import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar glass">
      <div className="navbar-inner">
        <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
          <span className="brand-icon material-symbols-outlined">medical_information</span>
          <span>MediCard</span>
        </Link>

        {user ? (
          <div className="navbar-links">
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
              <span className="material-symbols-outlined">dashboard</span>Dashboard
            </Link>
            <Link to="/medical-records" className={`nav-link ${isActive('/medical-records') ? 'active' : ''}`}>
              <span className="material-symbols-outlined">folder_shared</span>Records
            </Link>
            <Link to="/prescriptions" className={`nav-link ${isActive('/prescriptions') ? 'active' : ''}`}>
              <span className="material-symbols-outlined">medication</span>Prescriptions
            </Link>
            <Link to="/reminders" className={`nav-link ${isActive('/reminders') ? 'active' : ''}`}>
              <span className="material-symbols-outlined">alarm</span>Reminders
            </Link>
            <Link to="/bills" className={`nav-link ${isActive('/bills') ? 'active' : ''}`}>
              <span className="material-symbols-outlined">receipt_long</span>Bills
            </Link>
            <Link to="/emergency-profile" className={`nav-link ${isActive('/emergency-profile') ? 'active' : ''}`}>
              <span className="material-symbols-outlined">emergency</span>Emergency
            </Link>
            <div className="navbar-divider" />
            <Link to="/profile" className="navbar-user">
              <div className="user-avatar">{user.full_name?.charAt(0).toUpperCase()}</div>
              <span className="user-name">{user.full_name?.split(' ')[0]}</span>
            </Link>
            <button className="btn-tonal nav-logout" onClick={handleLogout} style={{padding:'8px 18px', fontSize:'13px'}}>
              Logout
            </button>
          </div>
        ) : (
          <div className="navbar-links">
            <Link to="/login" className="btn-tonal" style={{padding:'9px 22px', fontSize:'14px'}}>Login</Link>
            <Link to="/register" className="btn-primary" style={{padding:'9px 22px', fontSize:'14px'}}>Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
