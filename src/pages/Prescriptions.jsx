import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import './Prescriptions.css';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPrescriptions(); }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await API.get('/prescriptions');
      setPrescriptions(res.data.prescriptions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (p) => {
    if (!p.end_date) return true;
    return new Date(p.end_date) >= new Date();
  };

  const daysRemaining = (endDate) => {
    if (!endDate) return null;
    return Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const isRefillSoon = (p) => {
    if (!p.end_date) return false;
    const days = daysRemaining(p.end_date);
    return days !== null && days <= 3 && days >= 0;
  };

  const active = prescriptions.filter(isActive);
  const past = prescriptions.filter(p => !isActive(p));
  const refillAlerts = active.filter(isRefillSoon);

  return (
    <div className="prescriptions-page">
      <Navbar />
      <div className="prescriptions-inner">

        <div className="prescriptions-header fade-up">
          <div>
            <h1 className="page-title">Prescriptions</h1>
            <p className="page-sub">Your prescriptions as added by your doctor</p>
          </div>
          <div className="presc-info-badge">
            <span><span className="material-symbols-outlined">stethoscope</span></span>
            <span>Prescriptions are added by your doctor only</span>
          </div>
        </div>

        {/* Refill Alert Banner */}
        {refillAlerts.length > 0 && (
          <div className="refill-alert-banner fade-up">
            <div className="refill-alert-icon"><span className="material-symbols-outlined" style={{color:"var(--tertiary)",fontSize:"18px"}}>warning</span></div>
            <div className="refill-alert-content">
              <div className="refill-alert-title">Refill Needed Soon</div>
              <div className="refill-alert-desc">
                {refillAlerts.map(p => {
                  const days = daysRemaining(p.end_date);
                  return (
                    <span key={p.id} className="refill-medicine-tag">
                      <span className="material-symbols-outlined">medication</span> {p.medicine_name} —
                      {days === 0 ? ' expires today'
                        : days === 1 ? ' 1 day left'
                        : ` ${days} days left`}
                    </span>
                  );
                })}
              </div>
              <p className="refill-alert-note">
                Please contact your doctor or pharmacy to arrange a refill before your prescription runs out.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><span className="material-symbols-outlined">medication</span></div>
              <p>No prescriptions yet.</p>
              <span>Your doctor will add prescriptions here after your consultation.</span>
            </div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="fade-up fade-up-delay-1">
                <h2 className="presc-section-heading">Active Medications ({active.length})</h2>
                <div className="presc-grid">
                  {active.map(p => {
                    const days = daysRemaining(p.end_date);
                    const refillAlert = isRefillSoon(p);
                    return (
                      <div key={p.id} className={`presc-card ${refillAlert ? 'refill-warning' : ''}`}>

                        {/* Refill warning badge */}
                        {refillAlert && (
                          <div className="refill-badge">
                            <span className="material-symbols-outlined" style={{fontSize:"16px"}}>warning</span> Refill needed
                            {days === 0 ? ' — expires today'
                              : days === 1 ? ' — 1 day left'
                              : ` — ${days} days left`}
                          </div>
                        )}

                        {/* Interaction warning */}
                        {p.interaction_warning && (
                          <div className="interaction-badge">
                            {p.interaction_warning}
                          </div>
                        )}

                        <div className="presc-medicine">{p.medicine_name}</div>
                        <div className="presc-dosage">{p.dosage}</div>
                        <div className="presc-meta-rows">
                          <div className="presc-meta-row"><span><span className="material-symbols-outlined">alarm</span></span><span>{p.frequency}</span></div>
                          {p.prescribed_by && (
                            <div className="presc-meta-row"><span><span className="material-symbols-outlined">stethoscope</span></span><span>Dr. {p.prescribed_by}</span></div>
                          )}
                          {p.start_date && (
                            <div className="presc-meta-row">
                              <span><span className="material-symbols-outlined">calendar_today</span></span>
                              <span>Started: {new Date(p.start_date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</span>
                            </div>
                          )}
                          {p.end_date && (
                            <div className="presc-meta-row">
                              <span><span className="material-symbols-outlined">flag</span></span>
                              <span>Ends: {new Date(p.end_date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</span>
                            </div>
                          )}
                        </div>
                        {days !== null && (
                          <div className={`presc-days-badge ${days <= 3 ? 'urgent' : days <= 7 ? 'warning' : 'normal'}`}>
                            {days <= 0 ? 'Expires today' : `${days} days remaining`}
                          </div>
                        )}
                        {!p.end_date && (
                          <div className="presc-days-badge normal">Ongoing</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div className="fade-up fade-up-delay-2">
                <h2 className="presc-section-heading past">Past Medications ({past.length})</h2>
                <div className="presc-grid">
                  {past.map(p => (
                    <div key={p.id} className="presc-card past-card">
                      <div className="presc-medicine past">{p.medicine_name}</div>
                      <div className="presc-dosage">{p.dosage}</div>
                      <div className="presc-meta-rows">
                        <div className="presc-meta-row"><span><span className="material-symbols-outlined">alarm</span></span><span>{p.frequency}</span></div>
                        {p.prescribed_by && (
                          <div className="presc-meta-row"><span><span className="material-symbols-outlined">stethoscope</span></span><span>Dr. {p.prescribed_by}</span></div>
                        )}
                        {p.end_date && (
                          <div className="presc-meta-row">
                            <span><span className="material-symbols-outlined" style={{color:"#166534",fontSize:"18px"}}>check_circle</span></span>
                            <span>Completed: {new Date(p.end_date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</span>
                          </div>
                        )}
                      </div>
                      <div className="presc-days-badge expired">Expired</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
