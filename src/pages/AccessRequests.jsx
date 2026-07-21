import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import './AccessRequests.css';

const STATUS_LABEL = {
  denied: 'Declined',
  revoked: 'Revoked',
};

export default function AccessRequests() {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchGrants(); }, []);

  const fetchGrants = async () => {
    try {
      const res = await API.get('/patient-access');
      setGrants(res.data.grants);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const act = async (grant, action, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setActingId(grant.id); setError('');
    try {
      const res = await API.put(`/patient-access/${grant.id}/${action}`);
      setGrants(prev => prev.map(g => g.id === grant.id ? { ...g, status: res.data.status } : g));
      showSuccess(
        action === 'approve' ? `Dr. ${grant.doctor_name} can now see your full records.` :
        action === 'deny' ? 'Request declined.' :
        'Access revoked.'
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setActingId(null);
    }
  };

  const pending = grants.filter(g => g.status === 'pending');
  const approved = grants.filter(g => g.status === 'approved');
  const history = grants.filter(g => ['denied', 'revoked'].includes(g.status));

  return (
    <div className="access-req-page">
      <Navbar />
      <div className="access-req-inner">

        <div className="access-req-header fade-up">
          <div>
            <h1 className="page-title">Access Requests</h1>
            <p className="page-sub">Doctors need your approval before they can see anything beyond your emergency profile</p>
          </div>
        </div>

        {success && <div className="success-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>check_circle</span>{success}</div>}
        {error && <div className="error-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>warning</span>{error}</div>}

        {loading ? (
          <div className="loading-state">Loading access requests...</div>
        ) : (
          <>
            {/* Pending */}
            <div className="access-req-section fade-up fade-up-delay-1">
              <h2 className="card-section-title">Pending Requests ({pending.length})</h2>
              {pending.length === 0 ? (
                <div className="card"><div className="empty-state">
                  <span className="material-symbols-outlined empty-icon">pending</span>
                  <p>No pending requests.</p>
                </div></div>
              ) : (
                <div className="card access-req-list">
                  {pending.map(g => (
                    <div key={g.id} className="access-req-row">
                      <div className="access-req-avatar">{g.doctor_name?.charAt(0).toUpperCase()}</div>
                      <div className="access-req-info">
                        <div className="access-req-doctor">Dr. {g.doctor_name}</div>
                        <div className="access-req-meta">
                          {g.specializations?.join(', ')}{g.hospital_name ? ` · ${g.hospital_name}` : ''}
                        </div>
                      </div>
                      <div className="access-req-actions">
                        <button className="btn-primary" style={{fontSize:'13px', padding:'8px 18px'}}
                          disabled={actingId === g.id}
                          onClick={() => act(g, 'approve')}>
                          Approve
                        </button>
                        <button className="btn-danger" style={{fontSize:'13px', padding:'8px 18px'}}
                          disabled={actingId === g.id}
                          onClick={() => act(g, 'deny')}>
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approved */}
            <div className="access-req-section fade-up fade-up-delay-2">
              <h2 className="card-section-title">Doctors With Access ({approved.length})</h2>
              {approved.length === 0 ? (
                <div className="card"><div className="empty-state">
                  <span className="material-symbols-outlined empty-icon">lock</span>
                  <p>No doctor currently has access to your full records.</p>
                </div></div>
              ) : (
                <div className="card access-req-list">
                  {approved.map(g => (
                    <div key={g.id} className="access-req-row">
                      <div className="access-req-avatar">{g.doctor_name?.charAt(0).toUpperCase()}</div>
                      <div className="access-req-info">
                        <div className="access-req-doctor">Dr. {g.doctor_name}</div>
                        <div className="access-req-meta">
                          {g.specializations?.join(', ')}{g.hospital_name ? ` · ${g.hospital_name}` : ''}
                        </div>
                      </div>
                      <div className="access-req-actions">
                        <button className="btn-outline" style={{fontSize:'13px', padding:'8px 18px'}}
                          disabled={actingId === g.id}
                          onClick={() => act(g, 'revoke', `Revoke Dr. ${g.doctor_name}'s access to your records?`)}>
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="access-req-section fade-up fade-up-delay-2">
                <h2 className="card-section-title">History</h2>
                <div className="card access-req-list">
                  {history.map(g => (
                    <div key={g.id} className="access-req-row access-req-row-muted">
                      <div className="access-req-avatar">{g.doctor_name?.charAt(0).toUpperCase()}</div>
                      <div className="access-req-info">
                        <div className="access-req-doctor">Dr. {g.doctor_name}</div>
                        <div className="access-req-meta">
                          {g.specializations?.join(', ')}{g.hospital_name ? ` · ${g.hospital_name}` : ''}
                        </div>
                      </div>
                      <span className="badge badge-secondary">{STATUS_LABEL[g.status]}</span>
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
