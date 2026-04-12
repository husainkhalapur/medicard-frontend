import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ records: 0, prescriptions: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [recRes, preRes] = await Promise.all([API.get('/records'), API.get('/prescriptions')]);
        setCounts({ records: recRes.data.records.length, prescriptions: preRes.data.prescriptions.length });
      } catch (err) { console.error(err); }
    };
    fetchCounts();
  }, []);

  const quickActions = [
    { icon: 'emergency', label: 'Emergency Profile', desc: 'Update info & QR code', to: '/emergency-profile', bg: 'var(--error-container)', color: 'var(--on-error-container)' },
    { icon: 'folder_shared', label: 'Medical Records', desc: 'View & upload reports', to: '/medical-records', bg: 'var(--secondary-container)', color: 'var(--on-secondary-fixed)' },
    { icon: 'alarm', label: 'Pill Reminders', desc: 'Manage medication schedule', to: '/reminders', bg: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)' },
    { icon: 'person', label: 'My Profile', desc: 'Edit personal information', to: '/profile', bg: 'var(--primary-fixed)', color: 'var(--on-primary-fixed)' },
  ];

  return (
    <div className="dashboard-page">
      <Navbar />
      <main className="dashboard-inner">

        {/* Welcome */}
        <header className="dashboard-header fade-up">
          <div>
            <h1 className="dash-welcome">Welcome back, {user?.full_name?.split(' ')[0]}.</h1>
            <p className="dash-sub">Your health profile is active and up to date.</p>
          </div>
          <div className="dash-header-actions">
            <Link to="/emergency-profile" className="btn-tonal">
              <span className="material-symbols-outlined">qr_code_2</span>
              View QR Code
            </Link>
            <Link to="/medical-records" className="btn-primary">
              <span className="material-symbols-outlined">add</span>
              Add Record
            </Link>
          </div>
        </header>

        {/* ID Card */}
        <div className="medicard-id-card fade-up fade-up-delay-1">
          <div className="id-card-left">
            <div className="id-card-label">Your MediCard ID</div>
            <div className="id-card-value">{user?.unique_id}</div>
            <div className="id-card-sub">Present at any MediCard-enabled facility</div>
          </div>
          <div className="id-card-right">
            <div className="id-card-stat">
              <span className="material-symbols-outlined">folder_shared</span>
              <div>
                <div className="id-stat-val">{counts.records}</div>
                <div className="id-stat-lbl">Records</div>
              </div>
            </div>
            <div className="id-card-stat">
              <span className="material-symbols-outlined">medication</span>
              <div>
                <div className="id-stat-val">{counts.prescriptions}</div>
                <div className="id-stat-lbl">Prescriptions</div>
              </div>
            </div>
            <div className="id-card-stat">
              <span className="material-symbols-outlined">verified</span>
              <div>
                <div className="id-stat-val" style={{fontSize:'14px', fontWeight:700}}>Active</div>
                <div className="id-stat-lbl">Status</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <section className="fade-up fade-up-delay-2">
          <h2 className="section-title" style={{marginBottom:'16px'}}>Quick Actions</h2>
          <div className="quick-actions-grid">
            {quickActions.map(a => (
              <Link to={a.to} key={a.label} className="quick-action-card" style={{background: a.bg}}>
                <span className="material-symbols-outlined qa-icon" style={{color: a.color}}>{a.icon}</span>
                <div className="qa-label" style={{color: a.color}}>{a.label}</div>
                <div className="qa-desc">{a.desc}</div>
                <span className="material-symbols-outlined qa-arrow" style={{color: a.color}}>arrow_forward</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Bottom Grid */}
        <div className="dashboard-bottom fade-up fade-up-delay-3">
          <div className="card">
            <h2 className="card-section-title">Recent Activity</h2>
            <div className="empty-state" style={{padding:'32px 0'}}>
              <span className="material-symbols-outlined empty-icon">inbox</span>
              <p>No recent activity</p>
              <span>Upload your first medical record to get started.</span>
              <Link to="/medical-records" className="btn-primary" style={{marginTop:'16px', fontSize:'14px', padding:'10px 24px'}}>
                Upload a record
              </Link>
            </div>
          </div>
          <div className="card">
            <h2 className="card-section-title">Profile Summary</h2>
            <div className="profile-summary">
              {[
                { label: 'Full Name', value: user?.full_name },
                { label: 'Email', value: user?.email },
                { label: 'Blood Group', value: user?.blood_group || 'Not set' },
                { label: 'MediCard ID', value: user?.unique_id },
              ].map(item => (
                <div className="summary-row" key={item.label}>
                  <span className="summary-label">{item.label}</span>
                  <span className="summary-value">{item.value}</span>
                </div>
              ))}
            </div>
            <Link to="/profile" className="btn-secondary" style={{marginTop:'16px', width:'100%', justifyContent:'center', fontSize:'14px'}}>
              <span className="material-symbols-outlined" style={{fontSize:'16px !important'}}>edit</span>
              Edit Profile
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
