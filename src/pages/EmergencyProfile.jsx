import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import './EmergencyProfile.css';

export default function EmergencyProfile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    first_aid_notes: '',
  });

  const qrUrl = `${window.location.origin}/emergency/${user?.unique_id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&color=0a3d2e&bgcolor=f4fbf7`;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/emergency/profile');
        const d = res.data;
        setForm({
          allergies: d.allergies?.join(', ') || '',
          chronic_conditions: d.chronic_conditions?.join(', ') || '',
          current_medications: d.current_medications?.join(', ') || '',
          emergency_contact_name: d.emergency_contact_name || '',
          emergency_contact_phone: d.emergency_contact_phone || '',
          first_aid_notes: d.first_aid_notes || '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await API.put('/emergency/profile', {
        allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
        chronic_conditions: form.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean),
        current_medications: form.current_medications.split(',').map(s => s.trim()).filter(Boolean),
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        first_aid_notes: form.first_aid_notes,
      });
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save emergency profile.');
    } finally {
      setSaving(false);
    }
  };

  const tags = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (loading) return (
    <div className="emergency-page">
      <Navbar />
      <div className="loading-state">Loading emergency profile...</div>
    </div>
  );

  return (
    <div className="emergency-page">
      <Navbar />
      <div className="emergency-inner">

        <div className="emergency-header fade-up">
          <div>
            <h1 className="page-title">Emergency Profile</h1>
            <p className="page-sub">This information is shown when your QR code or NFC card is scanned in an emergency</p>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            {!editing ? (
              <button className="btn-primary" onClick={() => setEditing(true)}><span className="material-symbols-outlined">edit</span> Edit Profile</button>
            ) : (
              <>
                <button className="btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {success && <div className="success-banner fade-up"> Emergency profile updated successfully!</div>}
        {error && <div className="error-banner fade-up"> {error}</div>}

        <div className="emergency-grid fade-up fade-up-delay-1">

          <div className="card qr-card">
            <div className="qr-top">
              <div className="qr-label">Your Emergency QR Code</div>
              <div className="qr-img-wrap">
                <img src={qrImageUrl} alt="QR Code" className="qr-image" />
              </div>
              <div className="qr-id">{user?.unique_id}</div>
              <div className="qr-sub">Scan to view emergency profile</div>
            </div>
            <div className="qr-actions">
              <a href={qrImageUrl} download="medicard-qr.png" className="btn-outline"
                style={{fontSize:'13px', padding:'9px 18px', width:'100%', justifyContent:'center'}}>
                Download QR
              </a>
              <a href={qrUrl} target="_blank" rel="noreferrer" className="btn-primary"
                style={{fontSize:'13px', padding:'9px 18px', width:'100%', justifyContent:'center'}}>
                Preview Page
              </a>
            </div>
            <div className="nfc-badge">
              <strong> NFC chip URL:</strong><br />
              <code>{qrUrl}</code>
            </div>
          </div>

          <div className="emergency-details">
            <div className="card emergency-card">
              <h2 className="card-section-title">Critical Medical Information</h2>
              <div className="emergency-fields">

                <div className="form-group">
                  <label className="form-label">Allergies <span className="field-hint">(comma separated)</span></label>
                  {editing
                    ? <input className="form-input" name="allergies" placeholder="e.g. Penicillin, Peanuts, Latex" value={form.allergies} onChange={handleChange} />
                    : <div className="tag-list">
                        {tags(form.allergies).length > 0
                          ? tags(form.allergies).map(t => <span key={t} className="tag tag-red">{t}</span>)
                          : <span className="not-set">None recorded</span>}
                      </div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Chronic Conditions <span className="field-hint">(comma separated)</span></label>
                  {editing
                    ? <input className="form-input" name="chronic_conditions" placeholder="e.g. Diabetes Type 2, Hypertension" value={form.chronic_conditions} onChange={handleChange} />
                    : <div className="tag-list">
                        {tags(form.chronic_conditions).length > 0
                          ? tags(form.chronic_conditions).map(t => <span key={t} className="tag tag-orange">{t}</span>)
                          : <span className="not-set">None recorded</span>}
                      </div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Current Medications <span className="field-hint">(comma separated)</span></label>
                  {editing
                    ? <input className="form-input" name="current_medications" placeholder="e.g. Metformin 500mg, Lisinopril 10mg" value={form.current_medications} onChange={handleChange} />
                    : <div className="tag-list">
                        {tags(form.current_medications).length > 0
                          ? tags(form.current_medications).map(t => <span key={t} className="tag tag-blue">{t}</span>)
                          : <span className="not-set">None recorded</span>}
                      </div>}
                </div>

                <div className="form-group">
                  <label className="form-label">First Aid Notes</label>
                  {editing
                    ? <textarea className="form-input" name="first_aid_notes" rows={3}
                        placeholder="e.g. Patient uses EpiPen. Do not administer NSAIDs."
                        value={form.first_aid_notes} onChange={handleChange}
                        style={{resize:'vertical'}} />
                    : <div className="first-aid-text">
                        {form.first_aid_notes || <span className="not-set">No notes added</span>}
                      </div>}
                </div>
              </div>
            </div>

            <div className="card emergency-card">
              <h2 className="card-section-title">Emergency Contact</h2>
              <div className="emergency-fields">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  {editing
                    ? <input className="form-input" name="emergency_contact_name" placeholder="e.g. Jane Doe (Spouse)" value={form.emergency_contact_name} onChange={handleChange} />
                    : <div className="profile-value">{form.emergency_contact_name || <span className="not-set">Not set</span>}</div>}
                </div>
                <div className="form-group" style={{marginTop:'16px'}}>
                  <label className="form-label">Contact Phone</label>
                  {editing
                    ? <input className="form-input" name="emergency_contact_phone" placeholder="+91 98765 43210" value={form.emergency_contact_phone} onChange={handleChange} />
                    : <div className="profile-value">{form.emergency_contact_phone || <span className="not-set">Not set</span>}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
