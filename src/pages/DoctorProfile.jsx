import { useState } from 'react';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import DoctorNavbar from '../components/DoctorNavbar';
import SpecializationPicker from '../components/SpecializationPicker';
import DoctorAPI from '../api/doctorAxios';
import { to12Hour, to24Hour } from '../utils/slotTime';
import './Profile.css';
import './DoctorAuth.css';

const emptyForm = (doctor) => ({
  full_name: doctor?.full_name || '',
  phone: doctor?.phone || '',
  specializations: doctor?.specializations || [],
  hospital_name: doctor?.hospital_name || '',
});

// advance_amount is stored server-side in paise; the settings form works in
// whole rupees for a doctor to reason about. There is no consultation fee
// setting here — the actual fee for a visit is entered by the doctor when
// they mark that specific appointment completed. available_start/end_time
// come back from the API as "hh:mm AM/PM" but <input type="time"> needs
// 24-hour "HH:MM", hence the to24Hour() conversion.
const emptySettingsForm = (doctor) => ({
  advance_amount_rupees: doctor?.advance_amount != null ? String(Math.round(doctor.advance_amount / 100)) : '',
  auto_accept: doctor?.auto_accept || false,
  cancellation_cutoff_hours: doctor?.cancellation_cutoff_hours != null ? String(doctor.cancellation_cutoff_hours) : '24',
  working_days: doctor?.working_days || [0, 1, 2, 3, 4, 5, 6],
  available_start_time: doctor?.available_start_time ? to24Hour(doctor.available_start_time) : '09:00',
  available_end_time: doctor?.available_end_time ? to24Hour(doctor.available_end_time) : '17:00',
  max_patients_per_slot: doctor?.max_patients_per_slot != null ? String(doctor.max_patients_per_slot) : '1',
});

const MAX_PATIENTS_PER_SLOT_MIN = 1;
const MAX_PATIENTS_PER_SLOT_MAX = 20;

// 0=Sunday..6=Saturday, matching doctors.working_days and JS Date.getDay().
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorProfile() {
  const { doctor, updateDoctor } = useDoctorAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(emptyForm(doctor));

  const [dndSaving, setDndSaving] = useState(false);
  const handleToggleDnd = async () => {
    setDndSaving(true);
    setError('');
    try {
      const res = await DoctorAPI.put('/doctors/dnd', { dnd_enabled: !doctor?.dnd_enabled });
      updateDoctor(res.data.doctor);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update Do Not Disturb.');
    } finally {
      setDndSaving(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (!form.full_name || !form.phone || !form.hospital_name || form.specializations.length === 0) {
      setError('Please fill in all required fields, including at least one specialization.');
      return;
    }
    if (form.full_name.trim().split(/\s+/).filter(Boolean).length < 3) {
      setError('Please enter your full name with first, middle and last name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await DoctorAPI.put('/doctors/profile', form);
      updateDoctor(res.data.doctor);
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
    setForm(emptyForm(doctor));
    setEditing(false);
    setError('');
  };

  const [settingsForm, setSettingsForm] = useState(emptySettingsForm(doctor));
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettingsForm({ ...settingsForm, [name]: type === 'checkbox' ? checked : value });
  };

  const toggleWorkingDay = (day) => {
    setSettingsForm(f => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter(d => d !== day)
        : [...f.working_days, day],
    }));
  };

  const handleSettingsSave = async () => {
    const advanceRupees = Number(settingsForm.advance_amount_rupees);
    const cutoffHours = Number(settingsForm.cancellation_cutoff_hours);
    const maxPatientsPerSlot = Number(settingsForm.max_patients_per_slot);

    if (!Number.isFinite(advanceRupees) || advanceRupees < 0) {
      setSettingsError('Enter a valid advance amount.'); return;
    }
    if (!Number.isInteger(cutoffHours) || cutoffHours < 0) {
      setSettingsError('Cancellation cutoff hours must be a non-negative whole number.'); return;
    }
    if (settingsForm.working_days.length === 0) {
      setSettingsError('Select at least one working day.'); return;
    }
    if (settingsForm.available_start_time >= settingsForm.available_end_time) {
      setSettingsError('Available start time must be before the end time.'); return;
    }
    if (!Number.isInteger(maxPatientsPerSlot) ||
        maxPatientsPerSlot < MAX_PATIENTS_PER_SLOT_MIN || maxPatientsPerSlot > MAX_PATIENTS_PER_SLOT_MAX) {
      setSettingsError(`Max patients per slot must be a whole number between ${MAX_PATIENTS_PER_SLOT_MIN} and ${MAX_PATIENTS_PER_SLOT_MAX}.`); return;
    }

    setSettingsSaving(true);
    setSettingsError('');
    try {
      const res = await DoctorAPI.put('/doctors/settings', {
        advance_amount: Math.round(advanceRupees * 100),
        auto_accept: settingsForm.auto_accept,
        cancellation_cutoff_hours: cutoffHours,
        working_days: settingsForm.working_days,
        available_start_time: to12Hour(settingsForm.available_start_time),
        available_end_time: to12Hour(settingsForm.available_end_time),
        max_patients_per_slot: maxPatientsPerSlot,
      });
      updateDoctor(res.data.doctor);
      setSettingsForm(emptySettingsForm(res.data.doctor));
      setSettingsEditing(false);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Failed to update settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSettingsCancel = () => {
    setSettingsForm(emptySettingsForm(doctor));
    setSettingsEditing(false);
    setSettingsError('');
  };

  return (
    <div className="profile-page">
      <DoctorNavbar />
      <div className="profile-inner">

        <div className="profile-header fade-up">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-sub">Manage the professional information on your doctor account</p>
          </div>
          <div className="header-actions" style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <button
              className={doctor?.dnd_enabled ? 'btn-primary' : 'btn-outline'}
              style={doctor?.dnd_enabled ? {background:'#dc2626', borderColor:'#dc2626'} : undefined}
              onClick={handleToggleDnd}
              disabled={dndSaving}
              title="Toggle whether patients can book new appointments with you">
              <span className="material-symbols-outlined">{doctor?.dnd_enabled ? 'do_not_disturb_on' : 'do_not_disturb_off'}</span>
              {dndSaving ? 'Updating...' : doctor?.dnd_enabled ? 'Do Not Disturb: On' : 'Do Not Disturb: Off'}
            </button>
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
            <div className="big-avatar doctor-btn">{doctor?.full_name?.charAt(0).toUpperCase()}</div>
            <div className="avatar-name">{doctor?.full_name}</div>
            <div className="avatar-email">{doctor?.email}</div>
            <span className={`badge ${doctor?.verification_status === 'verified' ? 'badge-green' : 'badge-orange'}`} style={{fontSize:'13px', padding:'6px 16px', marginTop:'8px'}}>
              {doctor?.verification_status === 'verified' ? 'Verified Doctor' : 'Pending Verification'}
            </span>
            <div className="avatar-note">
              Your license number and email are fixed and cannot be changed here.
            </div>
          </div>

          <div className="card">
            <h2 className="card-section-title">Professional Information</h2>
            <div className="profile-fields">

              <div className="form-group">
                <label className="form-label">Full Name</label>
                {editing
                  ? <input className="form-input" name="full_name" placeholder="Dr. Arjun Kumar Mehta" value={form.full_name} onChange={handleChange} />
                  : <div className="profile-value">{form.full_name || <span className="not-set">Not set</span>}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                {editing
                  ? <input className="form-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
                  : <div className="profile-value">{form.phone || <span className="not-set">Not set</span>}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Hospital / Clinic Name</label>
                {editing
                  ? <input className="form-input" name="hospital_name" placeholder="e.g. Apollo Hospital Mumbai" value={form.hospital_name} onChange={handleChange} />
                  : <div className="profile-value">{form.hospital_name || <span className="not-set">Not set</span>}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Specializations</label>
                {editing ? (
                  <SpecializationPicker
                    value={form.specializations}
                    onChange={(specializations) => { setForm({ ...form, specializations }); setError(''); }} />
                ) : (
                  <div className="profile-value">
                    {form.specializations.length > 0
                      ? form.specializations.map(s => (
                          <span className="badge badge-secondary" style={{marginRight:'6px', marginBottom:'4px', display:'inline-block'}} key={s}>{s}</span>
                        ))
                      : <span className="not-set">Not set</span>}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="profile-value">
                  {doctor?.email}
                  <span className="badge badge-green" style={{marginLeft:'10px', fontSize:'11px'}}>Verified</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Medical License Number</label>
                <div className="profile-value">{doctor?.license_number}</div>
              </div>

            </div>
          </div>
        </div>

        <div className="card fade-up fade-up-delay-2">
          <div className="profile-header" style={{marginBottom:'12px'}}>
            <h2 className="card-section-title" style={{margin:0}}>Booking Settings</h2>
            {!settingsEditing ? (
              <button className="btn-primary" onClick={() => setSettingsEditing(true)}>
                <span className="material-symbols-outlined">edit</span> Edit Settings
              </button>
            ) : (
              <div style={{display:'flex', gap:'10px'}}>
                <button className="btn-outline" onClick={handleSettingsCancel}>Cancel</button>
                <button className="btn-primary" onClick={handleSettingsSave} disabled={settingsSaving}>
                  {settingsSaving ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {settingsSuccess && <div className="success-banner"><span className="material-symbols-outlined" style={{color:"#166534"}}>check_circle</span> Payment settings updated!</div>}
          {settingsError && <div className="error-banner"><span className="material-symbols-outlined" style={{fontSize:"16px"}}>warning</span> {settingsError}</div>}

          <div className="profile-fields">
            <div className="form-group">
              <label className="form-label">Advance Amount (₹)</label>
              {settingsEditing
                ? <input className="form-input" name="advance_amount_rupees" type="number" min="0" step="1"
                    placeholder="e.g. 125" value={settingsForm.advance_amount_rupees} onChange={handleSettingsChange} />
                : <div className="profile-value">₹{settingsForm.advance_amount_rupees || 0}</div>}
              <span className="field-hint">Same fixed amount for every patient, charged after you accept their request. The full consultation fee is set per-visit when you mark it complete.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Cancellation Cutoff (hours)</label>
              {settingsEditing
                ? <input className="form-input" name="cancellation_cutoff_hours" type="number" min="0" step="1"
                    value={settingsForm.cancellation_cutoff_hours} onChange={handleSettingsChange} />
                : <div className="profile-value">{settingsForm.cancellation_cutoff_hours}h before the appointment</div>}
              <span className="field-hint">Patients get a full refund if they cancel a confirmed appointment before this cutoff.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Max Patients per Slot</label>
              {settingsEditing
                ? <input className="form-input" name="max_patients_per_slot" type="number"
                    min={MAX_PATIENTS_PER_SLOT_MIN} max={MAX_PATIENTS_PER_SLOT_MAX} step="1"
                    value={settingsForm.max_patients_per_slot} onChange={handleSettingsChange} />
                : <div className="profile-value">{settingsForm.max_patients_per_slot}</div>}
              <span className="field-hint">How many patients can be booked into the same time slot. Set above 1 to let multiple patients share one slot (e.g. a walk-in clinic).</span>
            </div>

            <div className="form-group">
              <label className="form-label">Auto-Accept Requests</label>
              {settingsEditing ? (
                <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                  <input type="checkbox" name="auto_accept" checked={settingsForm.auto_accept} onChange={handleSettingsChange} />
                  <span>Skip manual approval — new requests go straight to "awaiting payment"</span>
                </label>
              ) : (
                <div className="profile-value">{settingsForm.auto_accept ? 'On' : 'Off'}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Weekly Schedule</label>
              {settingsEditing ? (
                <div className="spec-chip-grid">
                  {DAY_LABELS.map((label, day) => (
                    <button type="button" key={day}
                      className={`spec-chip ${settingsForm.working_days.includes(day) ? 'active' : ''}`}
                      onClick={() => toggleWorkingDay(day)}>
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="profile-value">
                  {settingsForm.working_days.length === 7
                    ? 'Every day'
                    : DAY_LABELS.filter((_, day) => settingsForm.working_days.includes(day)).join(', ') || <span className="not-set">No days selected</span>}
                </div>
              )}
              <span className="field-hint">Days patients can book you at all — only these days show as available on their booking calendar.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Available Hours</label>
              {settingsEditing ? (
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <input className="form-input" type="time" style={{width:'auto'}}
                    value={settingsForm.available_start_time}
                    onChange={e => setSettingsForm(f => ({ ...f, available_start_time: e.target.value }))} />
                  <span>to</span>
                  <input className="form-input" type="time" style={{width:'auto'}}
                    value={settingsForm.available_end_time}
                    onChange={e => setSettingsForm(f => ({ ...f, available_end_time: e.target.value }))} />
                </div>
              ) : (
                <div className="profile-value">{to12Hour(settingsForm.available_start_time)} – {to12Hour(settingsForm.available_end_time)}</div>
              )}
              <span className="field-hint">Appointment slots are generated in 30-minute steps across this range on your working days.</span>
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
          </div>
        </div>

      </div>
    </div>
  );
}
