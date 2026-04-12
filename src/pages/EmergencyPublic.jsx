import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api/axios';
import './EmergencyPublic.css';

export default function EmergencyPublic() {
  const { uniqueId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await API.get(`/emergency/${uniqueId}`);
        setData(res.data);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [uniqueId]);

  if (loading) return (
    <div className="pub-page">
      <div className="pub-loading">
        <div className="pub-spinner" />
        <p>Loading emergency profile...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="pub-page">
      <div className="pub-notfound">
        <div style={{fontSize:'48px', marginBottom:'16px'}}><span className="material-symbols-outlined">search</span></div>
        <h2>MediCard Not Found</h2>
        <p>The MediCard ID <strong>{uniqueId}</strong> does not exist or has been deactivated.</p>
      </div>
    </div>
  );

  return (
    <div className="pub-page">
      <div className="pub-header">
        <div className="pub-brand">
          <span className="material-symbols-outlined">medical_information</span>
          MediCard
        </div>
        <div className="pub-emergency-badge"><span className="material-symbols-outlined">emergency</span> EMERGENCY PROFILE</div>
      </div>

      <div className="pub-inner">

        <div className="pub-identity-card">
          <div className="pub-avatar">{data.full_name?.charAt(0).toUpperCase()}</div>
          <div className="pub-identity-info">
            <h1 className="pub-name">{data.full_name}</h1>
            <div className="pub-id">ID: {data.unique_id}</div>
            {data.blood_group && (
              <div className="pub-blood">
                🩸 Blood Group: <strong>{data.blood_group}</strong>
              </div>
            )}
          </div>
        </div>

        {data.allergies?.length > 0 && (
          <div className="pub-section pub-critical">
            <div className="pub-section-title"><span className="material-symbols-outlined" style={{fontSize:"16px"}}>warning</span> ALLERGIES</div>
            <div className="pub-tags">
              {data.allergies.map(a => (
                <span key={a} className="pub-tag pub-tag-red">{a}</span>
              ))}
            </div>
          </div>
        )}

        {data.chronic_conditions?.length > 0 && (
          <div className="pub-section">
            <div className="pub-section-title"><span className="material-symbols-outlined">local_hospital</span> CHRONIC CONDITIONS</div>
            <div className="pub-tags">
              {data.chronic_conditions.map(c => (
                <span key={c} className="pub-tag pub-tag-orange">{c}</span>
              ))}
            </div>
          </div>
        )}

        {data.current_medications?.length > 0 && (
          <div className="pub-section">
            <div className="pub-section-title"><span className="material-symbols-outlined">medication</span> CURRENT MEDICATIONS</div>
            <div className="pub-tags">
              {data.current_medications.map(m => (
                <span key={m} className="pub-tag pub-tag-blue">{m}</span>
              ))}
            </div>
          </div>
        )}

        {data.first_aid_notes && (
          <div className="pub-section pub-notes">
            <div className="pub-section-title"><span className="material-symbols-outlined">assignment</span> FIRST AID NOTES</div>
            <p className="pub-notes-text">{data.first_aid_notes}</p>
          </div>
        )}

        {(data.emergency_contact_name || data.emergency_contact_phone) && (
          <div className="pub-section pub-contact">
            <div className="pub-section-title"><span className="material-symbols-outlined">call</span> EMERGENCY CONTACT</div>
            {data.emergency_contact_name && (
              <div className="pub-contact-name">{data.emergency_contact_name}</div>
            )}
            {data.emergency_contact_phone && (
              <a href={`tel:${data.emergency_contact_phone}`} className="pub-call-btn">
                <span className="material-symbols-outlined">call</span> Call {data.emergency_contact_phone}
              </a>
            )}
          </div>
        )}

        <div className="pub-footer">
          <p>This emergency profile is powered by MediCard.</p>
          <p>Data last updated by patient. For medical queries contact the patient's doctor.</p>
        </div>

      </div>
    </div>
  );
}
