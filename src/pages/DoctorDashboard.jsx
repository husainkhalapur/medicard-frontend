import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import DoctorNavbar from '../components/DoctorNavbar';
import DoctorAPI from '../api/doctorAxios';
import './DoctorDashboard.css';

export default function DoctorDashboard() {
  const { doctor } = useDoctorAuth();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentPatients, setRecentPatients] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    fetchRecentPatients();
  }, []);

  const fetchRecentPatients = async () => {
    try {
      const res = await DoctorAPI.get('/doctor/recent-patients');
      setRecentPatients(res.data.patients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSearch = async () => {
    const trimmed = searchId.trim().toUpperCase();
    if (!trimmed) {
      setSearchError('Please enter a MediCard ID.');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      await DoctorAPI.get(`/doctor/patient/${trimmed}`);
      navigate(`/doctor/patient/${trimmed}`);
    } catch (err) {
      setSearchError(err.response?.data?.error || 'Patient not found. Please check the ID and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="doctor-dashboard-page">
      <DoctorNavbar />
      <div className="doctor-dashboard-inner">

        {/* Welcome */}
        <div className="doctor-welcome fade-up">
          <div className="doctor-welcome-text">
            <p className="welcome-greeting">Good day,</p>
            <h1 className="welcome-name">{doctor?.full_name} </h1>
            <p className="welcome-sub">{doctor?.specialization} · {doctor?.hospital_name}</p>
          </div>
          <div className="doctor-license-badge">
            <div className="license-label">License Number</div>
            <div className="license-value">{doctor?.license_number}</div>
            <div className="license-sub">Verified Medical Professional</div>
          </div>
        </div>

        {/* Search */}
        <div className="card search-card fade-up fade-up-delay-1">
          <h2 className="card-section-title">Search Patient</h2>
          <p className="search-desc">Enter the patient's MediCard ID to access their records</p>
          <div className="search-row">
            <input
              className="form-input search-input"
              placeholder="e.g. MC-K7PX-3NQR"
              value={searchId}
              onChange={(e) => { setSearchId(e.target.value); setSearchError(''); }}
              onKeyDown={handleKeyDown}
              style={{textTransform:'uppercase'}}
            />
            <button className="btn-primary search-btn" onClick={handleSearch} disabled={searching}>
              {searching ? <><span className="spinner" /> Searching...</> : 'Search Patient →'}
            </button>
          </div>
          {searchError && (
            <div className="search-error">{searchError}</div>
          )}
          <div className="search-hint">
            Ask the patient to show their MediCard ID from their profile or physical card
          </div>
        </div>

        {/* Stats */}
        <div className="doctor-stats fade-up fade-up-delay-2">
          {[
            { icon: '', label: 'Patients Accessed', value: recentPatients.length },
            { icon: <><span className="material-symbols-outlined">local_hospital</span></>, label: 'Hospital', value: doctor?.hospital_name },
            { icon: <><span className="material-symbols-outlined">stethoscope</span></>, label: 'Specialization', value: doctor?.specialization },
            { icon: <><span className="material-symbols-outlined" style={{color:"#166534",fontSize:"18px"}}>check_circle</span></>, label: 'Account Status', value: 'Verified' },
          ].map(s => (
            <div className="doctor-stat-card" key={s.label}>
              <div className="stat-icon">{s.icon}</div>
              <div className="doctor-stat-val">{s.value}</div>
              <div className="stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Patients */}
        <div className="card fade-up fade-up-delay-3">
          <h2 className="card-section-title">Recently Accessed Patients</h2>
          {loadingRecent ? (
            <div className="loading-state">Loading...</div>
          ) : recentPatients.length === 0 ? (
            <div className="empty-state" style={{padding:'40px 0'}}>
              <div className="empty-icon"></div>
              <p>No patients accessed yet.</p>
              <span>Search for a patient above to get started.</span>
            </div>
          ) : (
            <div className="recent-patients-list">
              {recentPatients.map(p => (
                <div key={p.id} className="recent-patient-row"
                  onClick={() => navigate(`/doctor/patient/${p.unique_id}`)}>
                  <div className="recent-patient-avatar">
                    {p.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="recent-patient-info">
                    <div className="recent-patient-name">{p.full_name}</div>
                    <div className="recent-patient-id">{p.unique_id}</div>
                  </div>
                  {p.blood_group && (
                    <span className="badge badge-green">{p.blood_group}</span>
                  )}
                  <div className="recent-patient-time">
                    {new Date(p.accessed_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </div>
                  <div className="recent-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
