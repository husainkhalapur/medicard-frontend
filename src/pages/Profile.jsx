import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import './Profile.css';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth?.slice(0, 10) || '',
    blood_group: user?.blood_group || '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await API.put('/users/profile', form);
      updateUser(res.data.user);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      date_of_birth: user?.date_of_birth?.slice(0, 10) || '',
      blood_group: user?.blood_group || '',
    });
    setEditing(false);
    setError('');
  };

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-inner">

        <div className="profile-header fade-up">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-sub">Manage your personal information linked to your MediCard</p>
          </div>
          <div className="header-actions">
            {!editing ? (
              <button className="btn-primary" onClick={() => setEditing(true)}><span className="material-symbols-outlined">edit</span> Edit Profile</button>
            ) : (
              <div style={{display:'flex', gap:'10px'}}>
                <button className="btn-outline" onClick={handleCancel}>Cancel</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {success && <div className="success-banner fade-up"><span className="material-symbols-outlined" style={{color:"#166534"}}>check_circle</span> Profile updated successfully!</div>}
        {error && <div className="error-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:"16px"}}>warning</span> {error}</div>}

        <div className="profile-grid fade-up fade-up-delay-1">

          <div className="card profile-avatar-card">
            <div className="big-avatar">{user?.full_name?.charAt(0).toUpperCase()}</div>
            <div className="avatar-name">{user?.full_name}</div>
            <div className="avatar-email">{user?.email}</div>
            <span className="badge badge-green" style={{fontSize:'14px', padding:'6px 16px', marginTop:'8px'}}>
              🪪 {user?.unique_id}
            </span>
            <div className="avatar-note">
              This is your unique MediCard ID. It is linked to your QR code and NFC chip.
            </div>
          </div>

          <div className="card">
            <h2 className="card-section-title">Personal Information</h2>
            <div className="profile-fields">

              <div className="form-group">
                <label className="form-label">Full Name</label>
                {editing
                  ? <input className="form-input" name="full_name" placeholder="John Doe" value={form.full_name} onChange={handleChange} />
                  : <div className="profile-value">{form.full_name || <span className="not-set">Not set</span>}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                {editing
                  ? <input className="form-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
                  : <div className="profile-value">{form.phone || <span className="not-set">Not set</span>}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                {editing
                  ? <input className="form-input" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
                  : <div className="profile-value">{form.date_of_birth || <span className="not-set">Not set</span>}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Blood Group</label>
                {editing ? (
                  <select className="form-input" name="blood_group" value={form.blood_group} onChange={handleChange}>
                    <option value="">Select blood group</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                ) : (
                  <div className="profile-value">
                    {form.blood_group
                      ? <span className="badge badge-green">{form.blood_group}</span>
                      : <span className="not-set">Not set</span>}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="profile-value">
                  {user?.email}
                  <span className="badge badge-green" style={{marginLeft:'10px', fontSize:'11px'}}>Verified</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="card fade-up fade-up-delay-2">
          <h2 className="card-section-title">Account Security</h2>
          <div className="security-rows">
            <div className="security-row">
              <div>
                <div className="security-label">Password</div>
                <div className="security-sub">Change your account password</div>
              </div>
              <button className="btn-outline" style={{fontSize:'13px', padding:'8px 18px'}}>
                Change Password
              </button>
            </div>
            <div className="security-row">
              <div>
                <div className="security-label">Two-Factor Authentication</div>
                <div className="security-sub">Add an extra layer of security to your account</div>
              </div>
              <span className="badge badge-green">Coming Soon</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
