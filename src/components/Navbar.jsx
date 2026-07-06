import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/medical-records', icon: 'folder_shared', label: 'Records' },
  { to: '/prescriptions', icon: 'medication', label: 'Prescriptions' },
  { to: '/reminders', icon: 'alarm', label: 'Reminders' },
  { to: '/bills', icon: 'receipt_long', label: 'Bills' },
  { to: '/emergency-profile', icon: 'emergency', label: 'Emergency' },
  { to: '/appointments', icon: 'calendar_month', label: 'Appointments' },
];

const SIDEBAR_WIDTH = '240px';
const SIDEBAR_WIDTH_COLLAPSED = '76px';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('medicard_sidebar_collapsed') === 'true');

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path;

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('medicard_sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  // Reserve horizontal space for the fixed sidebar on the page content;
  // pages read this via `margin-left: var(--sidebar-width, 0px)`.
  // Mirrors the CSS mobile breakpoint (768px), which forces the sidebar to
  // icon-only width regardless of the collapsed state — kept in sync here
  // so the margin never drifts out of step with the sidebar's actual width.
  useEffect(() => {
    if (!user) {
      document.documentElement.style.setProperty('--sidebar-width', '0px');
      return;
    }

    const applyWidth = () => {
      const isMobile = window.innerWidth <= 768;
      document.documentElement.style.setProperty(
        '--sidebar-width',
        (isMobile || collapsed) ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH
      );
    };

    applyWidth();
    window.addEventListener('resize', applyWidth);
    return () => {
      window.removeEventListener('resize', applyWidth);
      document.documentElement.style.setProperty('--sidebar-width', '0px');
    };
  }, [user, collapsed]);

  if (!user) {
    return (
      <nav className="navbar glass">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon material-symbols-outlined">medical_information</span>
            <span>MediCard</span>
          </Link>
          <div className="navbar-links">
            <Link to="/login" className="btn-tonal" style={{padding:'9px 22px', fontSize:'14px'}}>Login</Link>
            <Link to="/register" className="btn-primary" style={{padding:'9px 22px', fontSize:'14px'}}>Get Started</Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <aside className={`sidebar glass ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Link to="/dashboard" className="navbar-brand">
          <span className="brand-icon material-symbols-outlined">medical_information</span>
          {!collapsed && <span>MediCard</span>}
        </Link>
        <button className="sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'}>
          <span className="material-symbols-outlined">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
        </button>
      </div>

      <div className="sidebar-links">
        {NAV_ITEMS.map(item => (
          <Link key={item.to} to={item.to}
            className={`nav-link ${isActive(item.to) ? 'active' : ''}`}
            title={collapsed ? item.label : ''}>
            <span className="material-symbols-outlined">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <Link to="/profile" className="navbar-user" title={collapsed ? user.full_name : ''}>
          <div className="user-avatar">{user.full_name?.charAt(0).toUpperCase()}</div>
          {!collapsed && <span className="user-name">{user.full_name?.split(' ')[0]}</span>}
        </Link>
        <button className="btn-tonal nav-logout" onClick={handleLogout} title={collapsed ? 'Logout' : ''}>
          <span className="material-symbols-outlined">logout</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
