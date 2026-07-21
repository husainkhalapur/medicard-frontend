import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import DoctorNavbar from '../components/DoctorNavbar';
import DoctorAPI from '../api/doctorAxios';
import { toDDMMYYYY } from '../utils/dateFormat';
import './DoctorDashboard.css';

export default function DoctorDashboard() {
  const { doctor } = useDoctorAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const searchWrapRef = useRef(null);

  useEffect(() => {
    fetchRecentPatients();
  }, []);

  // Live autocomplete as the doctor types a partial MediCard ID or patient name
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await DoctorAPI.get('/doctor/patients/search', { params: { q: trimmed } });
        setSuggestions(res.data.patients);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const goToPatient = (uniqueId) => {
    setShowSuggestions(false);
    navigate(`/doctor/patient/${uniqueId}`);
  };

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchError('Please enter a MediCard ID or patient name.');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res = await DoctorAPI.get('/doctor/patients/search', { params: { q: trimmed } });
      const results = res.data.patients;
      if (results.length === 0) {
        setSearchError('No matching patients found. Please check the ID or name and try again.');
        setShowSuggestions(false);
      } else if (results.length === 1) {
        goToPatient(results[0].unique_id);
      } else {
        const exact = results.find(p => p.unique_id.toLowerCase() === trimmed.toLowerCase());
        if (exact) {
          goToPatient(exact.unique_id);
        } else {
          setSuggestions(results);
          setShowSuggestions(true);
        }
      }
    } catch (err) {
      setSearchError('Something went wrong. Please try again.');
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
            <p className="welcome-sub">{doctor?.specializations?.join(', ')} · {doctor?.hospital_name}</p>
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
          <p className="search-desc">Search by MediCard ID or patient name — partial matches work too</p>
          <div className="search-row">
            <div className="search-input-wrap" ref={searchWrapRef}>
              <input
                className="form-input search-input"
                placeholder="e.g. medicard-id or patient name"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchError(''); }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              />
              {showSuggestions && (
                <div className="search-suggestions">
                  {suggestions.length === 0 ? (
                    <div className="search-suggestion-empty">No matching patients</div>
                  ) : (
                    suggestions.map(p => (
                      <div key={p.id} className="search-suggestion-row" onClick={() => goToPatient(p.unique_id)}>
                        <div className="search-suggestion-avatar">{p.full_name?.charAt(0).toUpperCase()}</div>
                        <div className="search-suggestion-info">
                          <div className="search-suggestion-name">{p.full_name}</div>
                          <div className="search-suggestion-id">
                            {[p.unique_id, p.sex, p.age != null ? `${p.age}y` : null].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {p.blood_group && <span className="badge badge-green">{p.blood_group}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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
            { icon: <><span className="material-symbols-outlined">group</span></>, label: 'Patients Accessed', value: recentPatients.length },
            { icon: <><span className="material-symbols-outlined">local_hospital</span></>, label: 'Hospital', value: doctor?.hospital_name },
            { icon: <><span className="material-symbols-outlined">stethoscope</span></>, label: 'Specializations', value: doctor?.specializations?.join(', ') },
            { icon: <><span className="material-symbols-outlined" style={{color:"#166534",fontSize:"18px"}}>check_circle</span></>, label: 'Account Status', value: 'Verified' },
          ].map(s => (
            <div className="doctor-stat-card" key={s.label}>
              <div className="stat-icon">{s.icon}</div>
              <div className="doctor-stat-val">{s.value}</div>
              <div className="doctor-stat-lbl">{s.label}</div>
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
                    {toDDMMYYYY(p.accessed_at)}
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
