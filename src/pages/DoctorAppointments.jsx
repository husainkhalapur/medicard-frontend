import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorAPI from '../api/doctorAxios';
import DoctorNavbar from '../components/DoctorNavbar';
import { toDDMMYYYY, toYYYYMMDD } from '../utils/dateFormat';
import { formatCountdown } from '../utils/slotTime';
import { formatRupees } from '../utils/paymentUtils';
import './DoctorAppointments.css';

const STATUS_TABS = ['all', 'requested', 'accepted_awaiting_payment', 'confirmed', 'completed', 'cancelled'];
const CANCELLED_LIKE = ['rejected', 'expired', 'cancelled_by_patient', 'cancelled_by_doctor'];

// A visit can reserve several consecutive slots (e.g. a longer procedure).
// When accepting a request or booking a walk-in, the doctor can pick how
// many of the immediately-following available slots to reserve alongside
// the primary one.
const MAX_EXTRA_SLOTS = 10;

const TAB_LABEL = {
  all: 'All',
  requested: 'Requested',
  accepted_awaiting_payment: 'Awaiting Payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled/Other',
};

const matchesTab = (appt, tab) => {
  if (tab === 'all') return true;
  if (tab === 'cancelled') return CANCELLED_LIKE.includes(appt.status);
  return appt.status === tab;
};

const STATUS_LABEL = {
  requested: 'Requested',
  accepted_awaiting_payment: 'Awaiting Payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  expired: 'Expired',
  rejected: 'Rejected',
  cancelled_by_patient: 'Cancelled by Patient',
  cancelled_by_doctor: 'Cancelled',
  'no-show': 'No Show',
};

const statusColor = (s) => ({
  requested:                 'appt-status-pending',
  accepted_awaiting_payment: 'appt-status-pending',
  confirmed:                 'appt-status-confirmed',
  completed:                 'appt-status-completed',
  expired:                   'appt-status-cancelled',
  rejected:                  'appt-status-cancelled',
  cancelled_by_patient:      'appt-status-cancelled',
  cancelled_by_doctor:       'appt-status-cancelled',
  'no-show':                 'appt-status-noshow',
}[s] || 'appt-status-confirmed');

const statusIcon = (s) => ({
  requested:                 'pending',
  accepted_awaiting_payment: 'payments',
  confirmed:                 'event_available',
  completed:                 'check_circle',
  expired:                   'schedule',
  rejected:                  'cancel',
  cancelled_by_patient:      'cancel',
  cancelled_by_doctor:       'cancel',
  'no-show':                 'person_off',
}[s] || 'event');

const typeIcon = (t) => t === 'telehealth' ? 'videocam' : 'location_on';

// The N slots immediately following `fromTime` in `slotsList` that are still
// available, stopping at the first gap/unavailable slot — a valid extension
// can only ever be a contiguous run, so this is the full set of choices.
const getContiguousAvailableAfter = (slotsList, fromTime, max) => {
  const idx = slotsList.findIndex(s => s.time === fromTime);
  if (idx === -1) return [];
  const candidates = [];
  for (let i = idx + 1; i < slotsList.length && candidates.length < max; i++) {
    if (!slotsList[i].available) break;
    candidates.push(slotsList[i].time);
  }
  return candidates;
};

// A small "how many extra adjacent slots" stepper, shared by the Accept
// panel and the New Appointment panel.
function ExtraSlotsStepper({ candidates, count, setCount, loading }) {
  if (loading) return <div style={{fontSize:'13px', color:'var(--outline)'}}>Checking availability...</div>;
  if (candidates.length === 0) return <div style={{fontSize:'13px', color:'var(--outline)'}}>No adjacent slots free to extend into.</div>;
  return (
    <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
      <span style={{fontSize:'13px'}}>Extra adjacent slots for this visit:</span>
      <button type="button" className="btn-outline" style={{padding:'4px 10px'}}
        disabled={count === 0} onClick={() => setCount(c => Math.max(0, c - 1))}>−</button>
      <strong>{count}</strong>
      <button type="button" className="btn-outline" style={{padding:'4px 10px'}}
        disabled={count >= candidates.length} onClick={() => setCount(c => Math.min(candidates.length, c + 1))}>+</button>
      {count > 0 && (
        <span style={{fontSize:'12px', color:'var(--outline)'}}>reserves through {candidates[count - 1]}</span>
      )}
    </div>
  );
}

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
  const [createExtraCount, setCreateExtraCount] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creating, setCreating] = useState(false);

  // Patient search-as-you-type for the "Patient MediCard ID" field — partial
  // ID or name both work, same debounced-autocomplete pattern as the
  // dashboard's patient search.
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const patientSearchWrapRef = useRef(null);
  const justSelectedPatientRef = useRef(false);

  // Accepting a request — optional adjacent-slot extension.
  const [extendingId, setExtendingId] = useState(null);
  const [extendCandidates, setExtendCandidates] = useState([]);
  const [extendCount, setExtendCount] = useState(0);
  const [loadingExtend, setLoadingExtend] = useState(false);

  // Ticks every 30s so "time remaining" countdowns stay live without a refetch.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { fetchAppointments(); }, [dateFilter]);
  useEffect(() => { if (createForm.appointment_date) fetchCreateSlots(); }, [createForm.appointment_date]);

  // Live autocomplete as the doctor types a partial MediCard ID or patient name.
  useEffect(() => {
    if (justSelectedPatientRef.current) { justSelectedPatientRef.current = false; return; }
    const trimmed = createForm.patient_unique_id.trim();
    if (trimmed.length < 2) {
      setPatientSuggestions([]);
      setShowPatientSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await DoctorAPI.get('/doctor/patients/search', { params: { q: trimmed } });
        setPatientSuggestions(res.data.patients);
        setShowPatientSuggestions(true);
      } catch (err) { console.error(err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [createForm.patient_unique_id]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (patientSearchWrapRef.current && !patientSearchWrapRef.current.contains(e.target)) {
        setShowPatientSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPatient = (p) => {
    justSelectedPatientRef.current = true;
    setCreateForm(f => ({ ...f, patient_unique_id: p.unique_id }));
    setPatientSuggestions([]);
    setShowPatientSuggestions(false);
  };

  const fetchCreateSlots = async () => {
    setLoadingSlots(true); setSelectedCreateSlot(null); setCreateExtraCount(0);
    try {
      const res = await DoctorAPI.get('/appointments/doctor/slots', { params: { date: createForm.appointment_date } });
      setCreateSlots(res.data.slots);
    } catch (err) { console.error(err); }
    finally { setLoadingSlots(false); }
  };

  const resetCreateForm = () => {
    setCreateForm({ patient_unique_id: '', appointment_date: '', appointment_type: 'in-person', reason: '' });
    setCreateSlots([]); setSelectedCreateSlot(null); setCreateExtraCount(0);
    setPatientSuggestions([]); setShowPatientSuggestions(false);
  };

  const createExtendCandidates = selectedCreateSlot
    ? getContiguousAvailableAfter(createSlots, selectedCreateSlot, MAX_EXTRA_SLOTS) : [];

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
        reason: createForm.reason,
        extra_times: createExtendCandidates.slice(0, createExtraCount),
      });
      showSuccess(createExtraCount > 0 ? `Request sent — ${createExtraCount} extra slot(s) held pending the patient's acceptance.` : 'Request sent to patient — awaiting their acceptance.');
      setShowCreate(false); resetCreateForm();
      fetchAppointments();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to send appointment request.');
    } finally { setCreating(false); }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      const res = await DoctorAPI.get('/appointments/doctor', { params });
      setAppointments(res.data.appointments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000); };

  const openExtend = async (appt) => {
    setExtendingId(appt.id); setExtendCount(0); setExtendCandidates([]);
    setLoadingExtend(true);
    try {
      const res = await DoctorAPI.get('/appointments/doctor/slots', { params: { date: appt.appointment_date } });
      setExtendCandidates(getContiguousAvailableAfter(res.data.slots, appt.appointment_time, MAX_EXTRA_SLOTS));
    } catch (err) { console.error(err); }
    finally { setLoadingExtend(false); }
  };

  const cancelExtend = () => { setExtendingId(null); setExtendCandidates([]); setExtendCount(0); };

  const handleAccept = async (appt) => {
    setUpdatingStatus(appt.id);
    try {
      const extra_times = extendCandidates.slice(0, extendCount);
      const res = await DoctorAPI.post(`/appointments/${appt.id}/respond`, { action: 'accept', extra_times });
      setAppointments(prev => prev.map(a => a.id === appt.id ? res.data.appointment : a));
      showSuccess(extra_times.length > 0 ? `Accepted with ${extra_times.length} extra slot(s) reserved.` : 'Appointment accepted — patient will be asked to pay the advance.');
      cancelExtend();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to accept appointment.');
    } finally { setUpdatingStatus(null); }
  };

  const handleReject = async (id) => {
    const rejection_reason = window.prompt('Reason for declining (optional — patient will see this):');
    if (rejection_reason === null) return; // cancelled prompt
    setUpdatingStatus(id);
    try {
      const res = await DoctorAPI.post(`/appointments/${id}/respond`, { action: 'decline', rejection_reason });
      setAppointments(prev => prev.map(a => a.id === id ? res.data.appointment : a));
      showSuccess('Request declined.');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to decline request.');
    } finally { setUpdatingStatus(null); }
  };

  const handleDoctorCancel = async (id) => {
    if (!window.confirm('Cancel this confirmed appointment? Any advance the patient paid will be fully refunded.')) return;
    setUpdatingStatus(id);
    try {
      const res = await DoctorAPI.post(`/appointments/${id}/doctor-cancel`);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled_by_doctor' } : a));
      showSuccess(res.data.refund_initiated ? 'Appointment cancelled. Refund initiated.' : 'Appointment cancelled.');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to cancel appointment.');
    } finally { setUpdatingStatus(null); }
  };

  const handleStatusUpdate = async (id, status, final_fee) => {
    setUpdatingStatus(id);
    try {
      await DoctorAPI.put(`/appointments/doctor/${id}/status`, { status, final_fee });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status, ...(final_fee != null ? { final_fee } : {}) } : a));
      showSuccess(`Appointment marked as ${status}.`);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to update status.');
    } finally { setUpdatingStatus(null); }
  };

  // The consultation fee isn't fixed — it's whatever the doctor decides this
  // particular visit cost, entered right when they mark it complete.
  const handleMarkComplete = (id) => {
    const input = window.prompt('Enter the total consultation fee charged for this visit (₹):');
    if (input === null) return; // cancelled prompt
    const feeRupees = Number(input);
    if (!Number.isFinite(feeRupees) || feeRupees < 0) {
      showError('Please enter a valid, non-negative fee amount.');
      return;
    }
    handleStatusUpdate(id, 'completed', Math.round(feeRupees * 100));
  };

  const handleBalanceCollected = async (id) => {
    setUpdatingStatus(id);
    try {
      await DoctorAPI.put(`/appointments/doctor/${id}/balance-collected`);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, balance_collected: true } : a));
      showSuccess('Balance marked as collected.');
    } catch (err) {
      showError('Failed to update.');
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

  const todayStr = toYYYYMMDD(new Date());
  const pendingCount = appointments.filter(a => a.status === 'requested').length;
  const todayAppts = appointments.filter(a =>
    a.appointment_date?.split('T')[0] === todayStr && a.status === 'confirmed'
  );
  const displayed = appointments.filter(a => matchesTab(a, activeTab));

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
            <h2 className="card-section-title">Propose an Appointment</h2>
            <p style={{fontSize:'13px', color:'var(--outline)', marginTop:'-8px'}}>
              The patient will need to accept and pay the advance before this is confirmed.
            </p>
            <div className="dr-create-grid">
              <div className="form-group">
                <label className="form-label">Patient *</label>
                <div className="search-input-wrap" ref={patientSearchWrapRef}>
                  <input className="form-input search-input" placeholder="MediCard ID or patient name"
                    value={createForm.patient_unique_id}
                    onChange={e => { setCreateForm(f => ({ ...f, patient_unique_id: e.target.value })); setError(''); }}
                    onFocus={() => { if (patientSuggestions.length > 0) setShowPatientSuggestions(true); }} />
                  {showPatientSuggestions && (
                    <div className="search-suggestions">
                      {patientSuggestions.length === 0 ? (
                        <div className="search-suggestion-empty">No matching patients</div>
                      ) : (
                        patientSuggestions.map(p => (
                          <div key={p.id} className="search-suggestion-row" onClick={() => selectPatient(p)}>
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
                        onClick={() => { if (slot.available) { setSelectedCreateSlot(slot.time); setCreateExtraCount(0); } }}>
                        <span>{slot.time}</span>
                        {!slot.available
                          ? <span className="slot-status booked-label">{slot.dayOff ? 'Day Off' : slot.past ? 'Past' : 'Booked'}</span>
                          : selectedCreateSlot === slot.time
                            ? <span className="material-symbols-outlined" style={{fontSize:'16px'}}>check_circle</span>
                            : <span className="slot-status avail-label">Open</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedCreateSlot && (
              <div className="dr-create-slots">
                <ExtraSlotsStepper candidates={createExtendCandidates} count={createExtraCount} setCount={setCreateExtraCount} loading={false} />
              </div>
            )}

            <div style={{display:'flex', gap:'10px', marginTop:'8px'}}>
              <button className="btn-outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? <><span className="spinner" /> Sending...</> : 'Send Request'}
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
              <span> Switch to the Requested tab to action them.</span>
            </div>
            <button className="btn-primary" style={{fontSize:'13px', padding:'8px 20px', marginLeft:'auto', flexShrink:0}}
              onClick={() => setActiveTab('requested')}>
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
            const count = appointments.filter(a => matchesTab(a, tab)).length;
            return (
              <button key={tab}
                className={`dr-appt-tab ${activeTab === tab ? 'active' : ''} ${tab === 'requested' && pendingCount > 0 ? 'has-badge' : ''}`}
                onClick={() => setActiveTab(tab)}>
                {TAB_LABEL[tab]}
                {tab === 'requested' && pendingCount > 0 && (
                  <span className="tab-badge">{pendingCount}</span>
                )}
                {tab !== 'requested' && ` (${count})`}
              </button>
            );
          })}
        </div>

        {/* Appointments */}
        {loading ? (
          <div className="loading-state">Loading appointments...</div>
        ) : displayed.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-icon">calendar_month</span>
              <p>No appointments found.</p>
              <span>Patient appointment requests will appear here.</span>
            </div>
          </div>
        ) : (
          <div className="dr-appt-list fade-up fade-up-delay-2">
            {displayed.map(appt => {
              const balancePaise = appt.final_fee != null ? appt.final_fee - appt.advance_amount : null;
              const respondCountdown = appt.status === 'requested' && appt.request_expires_at
                ? formatCountdown(appt.request_expires_at, now) : null;
              const payCountdown = appt.status === 'accepted_awaiting_payment' && appt.payment_deadline
                ? formatCountdown(appt.payment_deadline, now) : null;
              const linkedCount = Number(appt.linked_count) || 0;
              const visitEndLabel = linkedCount > 0
                ? new Date(new Date(appt.last_slot_datetime).getTime() + 30 * 60000)
                    .toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })
                : null;

              return (
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
                      {linkedCount > 0 && <span className="badge badge-secondary" style={{fontSize:'11px', marginLeft:'6px'}}>+{linkedCount} slot{linkedCount > 1 ? 's' : ''}, until {visitEndLabel}</span>}
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
                      {STATUS_LABEL[appt.status] || appt.status}
                    </div>

                    {/* Requested by the patient — Accept (with optional adjacent-slot extension) or Decline */}
                    {appt.status === 'requested' && appt.initiated_by === 'patient' && (
                      <>
                        {respondCountdown && <div className="dr-appt-reason">{respondCountdown} left to respond</div>}
                        {extendingId === appt.id ? (
                          <div className="dr-appt-reason">
                            <ExtraSlotsStepper candidates={extendCandidates} count={extendCount} setCount={setExtendCount} loading={loadingExtend} />
                            <div className="dr-action-btns" style={{marginTop:'8px'}}>
                              <button className="btn-primary approve-btn"
                                disabled={updatingStatus === appt.id}
                                onClick={() => handleAccept(appt)}>
                                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>check</span>
                                Confirm Accept
                              </button>
                              <button className="btn-outline" onClick={cancelExtend}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="dr-action-btns">
                            <button className="btn-primary approve-btn"
                              disabled={updatingStatus === appt.id}
                              onClick={() => openExtend(appt)}>
                              <span className="material-symbols-outlined" style={{fontSize:'16px'}}>check</span>
                              Accept
                            </button>
                            <button className="btn-danger"
                              style={{fontSize:'12px', padding:'7px 16px', justifyContent:'center'}}
                              disabled={updatingStatus === appt.id}
                              onClick={() => handleReject(appt.id)}>
                              <span className="material-symbols-outlined" style={{fontSize:'16px'}}>close</span>
                              Decline
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Proposed by the doctor — nothing to do but wait for the patient */}
                    {appt.status === 'requested' && appt.initiated_by === 'doctor' && (
                      <div className="dr-appt-reason">
                        Waiting on patient to accept{respondCountdown ? ` · ${respondCountdown} left` : ''}
                      </div>
                    )}

                    {/* Awaiting payment — nothing for the doctor to do but wait */}
                    {appt.status === 'accepted_awaiting_payment' && (
                      <div className="dr-appt-reason">
                        Waiting on patient to pay the advance{payCountdown ? ` · ${payCountdown} left` : ''}
                      </div>
                    )}

                    {/* Confirmed — fee isn't known yet; Complete (enters fee) or No Show or Cancel */}
                    {appt.status === 'confirmed' && (
                      <>
                        <div className="dr-appt-reason">
                          {formatRupees(appt.advance_amount)} advance received. Enter the total fee when you mark this complete.
                        </div>
                        <div className="dr-action-btns">
                          <button className="btn-primary"
                            style={{fontSize:'12px', padding:'7px 16px', justifyContent:'center'}}
                            disabled={updatingStatus === appt.id}
                            onClick={() => handleMarkComplete(appt.id)}>
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
                      </>
                    )}

                    {/* Completed — fee is known, so the balance is too */}
                    {appt.status === 'completed' && appt.final_fee != null && (
                      <>
                        <div className="dr-appt-reason">
                          {formatRupees(appt.advance_amount)} advance received · {formatRupees(balancePaise)} to collect at clinic
                          {appt.balance_collected && ' (collected)'}
                        </div>
                        {!appt.balance_collected && (
                          <button className="btn-tonal"
                            style={{fontSize:'12px', padding:'7px 16px', justifyContent:'center'}}
                            disabled={updatingStatus === appt.id}
                            onClick={() => handleBalanceCollected(appt.id)}>
                            Mark Balance Collected
                          </button>
                        )}
                      </>
                    )}

                    {appt.status === 'rejected' && appt.doctor_notes && (
                      <div className="dr-appt-reason">Reason given: "{appt.doctor_notes}"</div>
                    )}

                    {['cancelled_by_patient', 'cancelled_by_doctor'].includes(appt.status) && appt.refund_status && (
                      <div className="dr-appt-reason">
                        {appt.refund_status === 'refunded'
                          ? `${formatRupees(appt.refund_amount)} refunded to patient`
                          : appt.refund_status === 'refund_initiated'
                            ? `${formatRupees(appt.refund_amount)} refund in progress`
                            : null}
                      </div>
                    )}

                    <div className="dr-appt-footer-actions">
                      <button className="view-patient-btn"
                        onClick={() => navigate(`/doctor/patient/${appt.patient_unique_id}`)}>
                        <span className="material-symbols-outlined" style={{fontSize:'16px'}}>open_in_new</span>
                        View Patient
                      </button>
                      {!['requested', 'accepted_awaiting_payment'].includes(appt.status) && (
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
