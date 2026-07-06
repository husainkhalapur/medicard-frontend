import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorAPI from '../api/doctorAxios';
import DoctorNavbar from '../components/DoctorNavbar';
import { toDDMMYYYY } from '../utils/dateFormat';
import './DoctorAppointments.css';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no-show'];

const statusColor = (s) => ({
  pending:   'appt-status-pending',
  confirmed: 'appt-status-confirmed',
  completed: 'appt-status-completed',
  cancelled: 'appt-status-cancelled',
  rejected:  'appt-status-cancelled',
  'no-show': 'appt-status-noshow',
}[s] || 'appt-status-confirmed');

const statusIcon = (s) => ({
  pending:   'pending',
  confirmed: 'event_available',
  completed: 'check_circle',
  cancelled: 'cancel',
  rejected:  'cancel',
  'no-show': 'person_off',
}[s] || 'event');

const typeIcon = (t) => t === 'telehealth' ? 'videocam' : 'location_on';

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState({});
  const [savingNotes, setSavingNotes] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // New appointment (doctor-initiated)
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ patient_unique_id: '', appointment_date: '', appointment_type: 'in-person', reason: '' });
  const [createSlots, setCreateSlots] = useState([]);
  const [selectedCreateSlot, setSelectedCreateSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchAppointments(); }, [activeTab, dateFilter]);
  useEffect(() => { if (createForm.appointment_date) fetchCreateSlots(); }, [createForm.appointment_date]);

  const fetchCreateSlots = async () => {
    setLoadingSlots(true); setSelectedCreateSlot(null);
    try {
      const res = await DoctorAPI.get('/appointments/doctor/slots', { params: { date: createForm.appointment_date } });
      setCreateSlots(res.data.slots);
    } catch (err) { console.error(err); }
    finally { setLoadingSlots(false); }
  };

  const resetCreateForm = () => {
    setCreateForm({ patient_unique_id: '', appointment_date: '', appointment_type: 'in-person', reason: '' });
    setCreateSlots([]); setSelectedCreateSlot(null);
  };

  const handleCreate = async () => {
    if (!createForm.patient_unique_id || !createForm.appointment_date || !selectedCreateSlot) {
      showError('Patient MediCard ID, date and time are required.'); return;
    }
    setCreating(true);
    try {
      await DoctorAPI.post('/appointments/doctor', {
        patient_unique_id: createForm.patient_unique_id.trim(),
        appointment_date: createForm.appointment_date,
        appointment_time: selectedCreateSlot,
        appointment_type: createForm.appointment_type,
        reason: createForm.reason
      });
      showSuccess('Appointment booked for patient.');
      setShowCreate(false); resetCreateForm();
      fetchAppointments();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to book appointment.');
    } finally { setCreating(false); }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (dateFilter) params.date = dateFilter;
      const res = await DoctorAPI.get('/appointments/doctor', { params });
      setAppointments(res.data.appointments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000); };

  const handleApprove = async (id) => {
    setUpdatingStatus(id);
    try {
      await DoctorAPI.put(`/appointments/doctor/${id}/approve`);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
      showSuccess('Appointment approved successfully.');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to approve appointment.');
    } finally { setUpdatingStatus(null); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional — patient will see this):');
    if (reason === null) return; // cancelled prompt
    setUpdatingStatus(id);
    try {
      await DoctorAPI.put(`/appointments/doctor/${id}/reject`, { rejection_reason: reason });
      setAppointments(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'rejected', doctor_notes: reason } : a
      ));
      showSuccess('Appointment rejected.');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to reject appointment.');
    } finally { setUpdatingStatus(null); }
  };

  const handleDoctorCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    await handleStatusUpdate(id, 'cancelled');
  };

  const handleStatusUpdate = async (id, status) => {
    setUpdatingStatus(id);
    try {
      await DoctorAPI.put(`/appointments/doctor/${id}/status`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      showSuccess(`Appointment marked as ${status}.`);
    } catch (err) {
      showError('Failed to update status.');
    } finally { setUpdatingStatus(null); }
  };

  const handleSaveNotes = async (id) => {
    setSavingNotes(id);
    try {
      await DoctorAPI.put(`/appointments/doctor/${id}/notes`, { notes: notes[id] || '' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, doctor_notes: notes[id] } : a));
      showSuccess('Notes saved.');
    } catch (err) {
      showError('Failed to save notes.');
    } finally { setSavingNotes(null); }
  };

  const formatDate = (d) => toDDMMYYYY(d);

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const todayAppts = appointments.filter(a =>
    a.appointment_date?.split('T')[0] === todayStr && a.status === 'confirmed'
  );

  return (
    <div className="dr-appt-page">
      <DoctorNavbar />
      <div className="dr-appt-inner">

        <div className="dr-appt-header fade-up">
          <div>
            <h1 className="page-title">Appointments</h1>
            <p className="page-sub">Review requests and manage patient appointments</p>
          </div>
          <div className="dr-appt-header-actions">
            <input type="date" className="form-input date-filter"
              value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              style={{width:'auto', borderRadius:'var(--radius-full)', padding:'10px 16px'}} />
            {dateFilter && (
              <button className="btn-tonal" onClick={() => setDateFilter('')}>
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>close</span>Clear
              </button>
            )}
            <button className="btn-primary" onClick={() => { setShowCreate(!showCreate); setError(''); }}>
              <span className="material-symbols-outlined" style={{fontSize:'18px'}}>add</span>
              {showCreate ? 'Cancel' : 'New Appointment'}
            </button>
          </div>
        </div>

        {success && <div className="success-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>check_circle</span>{success}</div>}
        {error && <div className="error-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>warning</span>{error}</div>}

        {/* Doctor-initiated booking panel */}
        {showCreate && (
          <div className="card dr-create-panel fade-up">
            <h2 className="card-section-title">Book Appointment for a Patient</h2>
            <div className="dr-create-grid">
              <div className="form-group">
                <label className="form-label">Patient MediCard ID *</label>
                <input className="form-input" placeholder="e.g. MC-12345"
                  value={createForm.patient_unique_id}
                  onChange={e => setCreateForm(f => ({ ...f, patient_unique_id: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" min={todayStr}
                  value={createForm.appointment_date}
                  onChange={e => setCreateForm(f => ({ ...f, appointment_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <div className="type-toggle">
                  <button type="button" className={`type-btn ${createForm.appointment_type === 'in-person' ? 'active' : ''}`}
                    onClick={() => setCreateForm(f => ({ ...f, appointment_type: 'in-person' }))}>
                    <span className="material-symbols-outlined" style={{fontSize:'18px'}}>location_on</span>In-Person
                  </button>
                  <button type="button" className={`type-btn ${createForm.appointment_type === 'telehealth' ? 'active' : ''}`}
                    onClick={() => setCreateForm(f => ({ ...f, appointment_type: 'telehealth' }))}>
                    <span className="material-symbols-outlined" style={{fontSize:'18px'}}>videocam</span>Telehealth
                  </button>
                </div>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Reason <span className="field-hint">(optional)</span></label>
                <input className="form-input" placeholder="e.g. Follow-up, Routine checkup..."
                  value={createForm.reason}
                  onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>

            {createForm.appointment_date && (
              <div className="dr-create-slots">
                <label className="form-label">Time Slot *</label>
                {loadingSlots ? (
                  <div style={{color:'var(--outline)', fontSize:'14px', padding:'8px 0'}}>Loading slots...</div>
                ) : (
                  <div className="time-slots-grid">
                    {createSlots.map(slot => (
                      <button key={slot.time} type="button" disabled={!slot.available}
                        className={`time-slot-btn ${!slot.available ? 'booked' : ''} ${selectedCreateSlot === slot.time ? 'selected' : ''}`}
                        onClick={() => slot.available && setSelectedCreateSlot(slot.time)}>
                        <span>{slot.time}</span>
                        {!slot.available
                          ? <span className="slot-status booked-label">Booked</span>
                          : selectedCreateSlot === slot.time
                            ? <span className="material-symbols-outlined" style={{fontSize:'16px'}}>check_circle</span>
                            : <span className="slot-status avail-label">Open</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{display:'flex', gap:'10px', marginTop:'8px'}}>
              <button className="btn-outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? <><span className="spinner" /> Booking...</> : 'Book Appointment'}
              </button>
            </div>
          </div>
        )}

        {/* Pending requests banner */}
        {pendingCount > 0 && activeTab === 'all' && (
          <div className="dr-pending-banner fade-up">
            <span className="material-symbols-outlined">pending_actions</span>
            <div>
              <strong>{pendingCount} pending appointment request{pendingCount > 1 ? 's' : ''} need your review.</strong>
              <span> Switch to the Pending tab to action them.</span>
            </div>
            <button className="btn-primary" style={{fontSize:'13px', padding:'8px 20px', marginLeft:'auto', flexShrink:0}}
              onClick={() => setActiveTab('pending')}>
              Review Now
            </button>
          </div>
        )}

        {/* Today's appointments */}
        {todayAppts.length > 0 && !dateFilter && activeTab === 'all' && (
          <div className="dr-today-banner fade-up">
            <span className="material-symbols-outlined">today</span>
            <div>
              <div className="today-title">
                {todayAppts.length} confirmed appointment{todayAppts.length > 1 ? 's' : ''} today
              </div>
              <div className="today-names">{todayAppts.map(a => a.patient_name).join(', ')}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="dr-appt-tabs fade-up fade-up-delay-1">
          {STATUS_TABS.map(tab => {
            const count = tab === 'all'
              ? appointments.length
              : appointments.filter(a => a.status === tab).length;
            return (
              <button key={tab}
                className={`dr-appt-tab ${activeTab === tab ? 'active' : ''} ${tab === 'pending' && pendingCount > 0 ? 'has-badge' : ''}`}
                onClick={() => setActiveTab(tab)}>
                {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                {tab === 'pending' && pendingCount > 0 && (
                  <span className="tab-badge">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Appointments */}
        {loading ? (
          <div className="loading-state">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-icon">calendar_month</span>
              <p>No appointments found.</p>
              <span>Patient appointment requests will appear here.</span>
            </div>
          </div>
        ) : (
          <div className="dr-appt-list fade-up fade-up-delay-2">
            {appointments.map(appt => (
              <div key={appt.id} className={`dr-appt-card ${appt.status}`}>
                <div className="dr-appt-main">

                  {/* Patient */}
                  <div className="dr-appt-patient">
                    <div className="dr-patient-avatar">{appt.patient_name?.charAt(0)}</div>
                    <div>
                      <div className="dr-patient-name">{appt.patient_name}</div>
                      <div className="dr-patient-id">{appt.patient_unique_id}</div>
                      {appt.patient_blood_group && (
                        <span className="badge badge-primary" style={{fontSize:'11px', marginTop:'4px'}}>
                          {appt.patient_blood_group}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="dr-appt-details">
                    <div className="dr-appt-meta">
                      <span className="material-symbols-outlined">event</span>
                      {formatDate(appt.appointment_date)}
                    </div>
                    <div className="dr-appt-meta">
                      <span className="material-symbols-outlined">schedule</span>
                      {appt.appointment_time}
                    </div>
                    <div className="dr-appt-meta">
                      <span className="material-symbols-outlined">{typeIcon(appt.appointment_type)}</span>
                      {appt.appointment_type === 'telehealth' ? 'Telehealth' : 'In-Person'}
                    </div>
                    {appt.reason && <div className="dr-appt-reason">"{appt.reason}"</div>}
                  </div>

                  {/* Status & Actions */}
                  <div className="dr-appt-actions">
                    <div className={`dr-appt-status ${statusColor(appt.status)}`}>
                      <span className="material-symbols-outlined" style={{fontSize:'14px'}}>{statusIcon(appt.status)}</span>
                      {appt.status?.charAt(0).toUpperCase() + appt.status?.slice(1).replace('-',' ')}
                    </div>

                    {/* Pending — Approve or Reject */}
                    {appt.status === 'pending' && (
                      <div className="dr-action-btns">
                        <button className="btn-primary approve-btn"
                          disabled={updatingStatus === appt.id}
                          onClick={() => handleApprove(appt.id)}>
                          <span className="material-symbols-outlined" style={{fontSize:'16px'}}>check</span>
                          Approve
                        </button>
                        <button className="btn-danger"
                          style={{fontSize:'12px', padding:'7px 16px', justifyContent:'center'}}
                          disabled={updatingStatus === appt.id}
                          onClick={() => handleReject(appt.id)}>
                          <span className="material-symbols-outlined" style={{fontSize:'16px'}}>close</span>
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Confirmed — Complete or No Show */}
                    {appt.status === 'confirmed' && (
                      <div className="dr-action-btns">
                        <button className="btn-primary"
                          style={{fontSize:'12px', padding:'7px 16px', justifyContent:'center'}}
                          disabled={updatingStatus === appt.id}
                          onClick={() => handleStatusUpdate(appt.id, 'completed')}>
                          Mark Complete
                        </button>
                        <button className="btn-tonal"
                          style={{fontSize:'12px', padding:'7px 16px', justifyContent:'center'}}
                          disabled={updatingStatus === appt.id}
                          onClick={() => handleStatusUpdate(appt.id, 'no-show')}>
                          No Show
                        </button>
                        <button className="btn-danger"
                          style={{fontSize:'12px', padding:'7px 16px', justifyContent:'center'}}
                          disabled={updatingStatus === appt.id}
                          onClick={() => handleDoctorCancel(appt.id)}>
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="dr-appt-footer-actions">
                      <button className="view-patient-btn"
                        onClick={() => navigate(`/doctor/patient/${appt.patient_unique_id}`)}>
                        <span className="material-symbols-outlined" style={{fontSize:'16px'}}>open_in_new</span>
                        View Patient
                      </button>
                      {appt.status !== 'pending' && (
                        <button className="toggle-notes-btn"
                          onClick={() => {
                            setExpandedId(expandedId === appt.id ? null : appt.id);
                            if (!notes[appt.id]) setNotes(prev => ({ ...prev, [appt.id]: appt.doctor_notes || '' }));
                          }}>
                          <span className="material-symbols-outlined" style={{fontSize:'16px'}}>
                            {expandedId === appt.id ? 'expand_less' : 'note_add'}
                          </span>
                          {expandedId === appt.id ? 'Hide Notes' : 'Add Notes'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes Panel */}
                {expandedId === appt.id && (
                  <div className="dr-notes-panel">
                    <label className="form-label">Consultation Notes</label>
                    <textarea className="form-input dr-notes-textarea"
                      placeholder="Add consultation notes, diagnosis, follow-up instructions..."
                      rows={3}
                      value={notes[appt.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [appt.id]: e.target.value }))}
                    />
                    <button className="btn-primary"
                      style={{fontSize:'13px', padding:'9px 22px', alignSelf:'flex-start'}}
                      disabled={savingNotes === appt.id}
                      onClick={() => handleSaveNotes(appt.id)}>
                      {savingNotes === appt.id ? <><span className="spinner" /> Saving...</> : 'Save Notes'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
