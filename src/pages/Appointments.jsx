import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import './Appointments.css';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const SPECIALIZATIONS = [
  'All','General Physician','Cardiology','Neurology','Orthopedic',
  'Dermatology','Ophthalmology','Pediatrics','Gynecology',
  'Psychiatry','Oncology','Gastroenterology','Other'
];

const statusColor = (s) => ({
  pending:   'badge-warning',
  confirmed: 'badge-primary',
  completed: 'badge-green',
  cancelled: 'badge-error',
  rejected:  'badge-error',
  'no-show': 'badge-warning',
}[s] || 'badge-secondary');

const statusIcon = (s) => ({
  pending:   'pending',
  confirmed: 'event_available',
  completed: 'check_circle',
  cancelled: 'cancel',
  rejected:  'cancel',
  'no-show': 'person_off',
}[s] || 'event');

const typeIcon = (t) => t === 'telehealth' ? 'videocam' : 'location_on';

export default function Appointments() {
  const [tab, setTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [apptType, setApptType] = useState('in-person');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => { fetchAppointments(); }, []);
  useEffect(() => { fetchDoctors(); }, [selectedSpec]);
  useEffect(() => { if (selectedDoctor && selectedDate) fetchSlots(); }, [selectedDoctor, selectedDate]);

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/appointments/patient');
      setAppointments(res.data.appointments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDoctors = async () => {
    try {
      const params = selectedSpec !== 'All' ? { specialization: selectedSpec } : {};
      const res = await API.get('/appointments/doctors', { params });
      setDoctors(res.data.doctors);
    } catch (err) { console.error(err); }
  };

  const fetchSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await API.get('/appointments/slots', {
        params: { doctor_id: selectedDoctor.id, date: dateStr }
      });
      setSlots(res.data.slots);
      setSelectedSlot(null);
    } catch (err) { console.error(err); }
  };

  const handleBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setError('Please select a doctor, date and time slot.'); return;
    }
    setBooking(true); setError('');
    try {
      await API.post('/appointments/patient', {
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: selectedSlot,
        appointment_type: apptType,
        reason
      });
      setSuccess('Appointment request sent! Waiting for doctor approval.');
      setShowBook(false); resetBooking(); fetchAppointments();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally { setBooking(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setCancelling(id);
    try {
      await API.put(`/appointments/patient/${id}/cancel`);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      setSuccess('Appointment cancelled.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to cancel appointment.');
    } finally { setCancelling(null); }
  };

  const resetBooking = () => {
    setSelectedDoctor(null); setSelectedDate(null);
    setSelectedSlot(null); setSlots([]);
    setReason(''); setApptType('in-person');
  };

  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDay = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const isPast = (day) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date(); today.setHours(0,0,0,0);
    return d < today;
  };

  const isSelected = (day) =>
    selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === currentDate.getMonth() &&
    selectedDate.getFullYear() === currentDate.getFullYear();

  const isToday = (day) => {
    const t = new Date();
    return t.getDate() === day && t.getMonth() === currentDate.getMonth() && t.getFullYear() === currentDate.getFullYear();
  };

  const upcoming = appointments.filter(a =>
    ['pending', 'confirmed'].includes(a.status) && new Date(a.appointment_date) >= new Date()
  );
  const past = appointments.filter(a =>
    !['pending', 'confirmed'].includes(a.status) || new Date(a.appointment_date) < new Date()
  );
  const displayed = tab === 'upcoming' ? upcoming : past;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday:'short', day:'numeric', month:'long', year:'numeric'
  });

  return (
    <div className="appt-page">
      <Navbar />
      <div className="appt-inner">

        <div className="appt-header fade-up">
          <div>
            <h1 className="page-title">Appointments</h1>
            <p className="page-sub">Request and manage your doctor appointments</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowBook(!showBook); setError(''); }}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>add</span>
            {showBook ? 'Cancel' : 'Request Appointment'}
          </button>
        </div>

        {success && <div className="success-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>check_circle</span>{success}</div>}
        {error && <div className="error-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>warning</span>{error}</div>}

        {/* Pending notice */}
        {upcoming.filter(a => a.status === 'pending').length > 0 && (
          <div className="pending-notice fade-up">
            <span className="material-symbols-outlined">pending</span>
            <div>
              <strong>{upcoming.filter(a => a.status === 'pending').length} appointment request{upcoming.filter(a => a.status === 'pending').length > 1 ? 's' : ''} awaiting doctor approval.</strong>
              <span> You will see the status update once the doctor responds.</span>
            </div>
          </div>
        )}

        {/* Booking Panel */}
        {showBook && (
          <div className="booking-panel fade-up">
            <h2 className="card-section-title">Request an Appointment</h2>

            {/* Step 1 */}
            <div className="booking-step">
              <div className="step-label"><div className="step-num">1</div><span>Select a Doctor</span></div>
              <div className="spec-filter">
                {SPECIALIZATIONS.map(s => (
                  <button key={s} className={`filter-btn ${selectedSpec === s ? 'active' : ''}`}
                    onClick={() => { setSelectedSpec(s); setSelectedDoctor(null); }}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="doctors-grid">
                {doctors.length === 0 ? (
                  <div className="no-doctors">
                    <span className="material-symbols-outlined">stethoscope</span>
                    <p>No verified doctors found for this specialty.</p>
                  </div>
                ) : doctors.map(doc => (
                  <div key={doc.id}
                    className={`doctor-card ${selectedDoctor?.id === doc.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedDoctor(doc); setSelectedDate(null); setSlots([]); setSelectedSlot(null); }}>
                    <div className="doctor-card-avatar">{doc.full_name.charAt(0)}</div>
                    <div className="doctor-card-info">
                      <div className="doctor-card-name">{doc.full_name}</div>
                      <div className="doctor-card-spec">{doc.specialization}</div>
                      <div className="doctor-card-hosp">
                        <span className="material-symbols-outlined" style={{fontSize:'14px'}}>local_hospital</span>
                        {doc.hospital_name}
                      </div>
                    </div>
                    {selectedDoctor?.id === doc.id && (
                      <span className="material-symbols-outlined doctor-selected-check">check_circle</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            {selectedDoctor && (
              <div className="booking-step">
                <div className="step-label"><div className="step-num">2</div><span>Select Date & Time</span></div>
                <div className="booking-calendar-row">
                  <div className="booking-calendar">
                    <div className="cal-nav">
                      <button className="cal-nav-btn" onClick={prevMonth}>
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <span className="cal-month-label">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                      <button className="cal-nav-btn" onClick={nextMonth}>
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                    <div className="cal-grid">
                      {DAYS.map(d => <div key={d} className="cal-head">{d}</div>)}
                      {Array(getFirstDay(currentDate)).fill(null).map((_, i) => <div key={`e${i}`} className="cal-cell empty" />)}
                      {Array(getDaysInMonth(currentDate)).fill(null).map((_, i) => {
                        const day = i + 1;
                        const past = isPast(day);
                        return (
                          <div key={day}
                            className={`cal-cell ${past ? 'past' : 'available'} ${isSelected(day) ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                            onClick={() => { if (!past) { setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setSelectedSlot(null); } }}>
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedDate && (
                    <div className="time-slots-panel">
                      <div className="time-slots-title">
                        {selectedDate.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })}
                      </div>
                      {slots.length === 0 ? (
                        <div style={{color:'var(--outline)', fontSize:'14px', padding:'16px 0'}}>Loading slots...</div>
                      ) : (
                        <div className="time-slots-grid">
                          {slots.map(slot => (
                            <button key={slot.time} disabled={!slot.available}
                              className={`time-slot-btn ${!slot.available ? 'booked' : ''} ${selectedSlot === slot.time ? 'selected' : ''}`}
                              onClick={() => slot.available && setSelectedSlot(slot.time)}>
                              <span>{slot.time}</span>
                              {!slot.available
                                ? <span className="slot-status booked-label">Booked</span>
                                : selectedSlot === slot.time
                                  ? <span className="material-symbols-outlined" style={{fontSize:'16px'}}>check_circle</span>
                                  : <span className="slot-status avail-label">Open</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {selectedDoctor && selectedDate && selectedSlot && (
              <div className="booking-step">
                <div className="step-label"><div className="step-num">3</div><span>Appointment Details</span></div>
                <div className="booking-details-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <div className="type-toggle">
                      <button className={`type-btn ${apptType === 'in-person' ? 'active' : ''}`} onClick={() => setApptType('in-person')}>
                        <span className="material-symbols-outlined" style={{fontSize:'18px'}}>location_on</span>In-Person
                      </button>
                      <button className={`type-btn ${apptType === 'telehealth' ? 'active' : ''}`} onClick={() => setApptType('telehealth')}>
                        <span className="material-symbols-outlined" style={{fontSize:'18px'}}>videocam</span>Telehealth
                      </button>
                    </div>
                  </div>
                  <div className="form-group" style={{flex:1}}>
                    <label className="form-label">Reason <span className="field-hint">(optional)</span></label>
                    <input className="form-input" placeholder="e.g. Routine checkup, Follow-up..."
                      value={reason} onChange={e => setReason(e.target.value)} />
                  </div>
                </div>

                <div className="booking-summary">
                  <div className="summary-row-item">
                    <span className="material-symbols-outlined">stethoscope</span>
                    <span>{selectedDoctor.full_name} — {selectedDoctor.specialization}</span>
                  </div>
                  <div className="summary-row-item">
                    <span className="material-symbols-outlined">calendar_today</span>
                    <span>{formatDate(selectedDate)}</span>
                  </div>
                  <div className="summary-row-item">
                    <span className="material-symbols-outlined">schedule</span>
                    <span>{selectedSlot}</span>
                  </div>
                  <div className="summary-row-item">
                    <span className="material-symbols-outlined">{typeIcon(apptType)}</span>
                    <span>{apptType === 'telehealth' ? 'Telehealth Call' : 'In-Person Visit'}</span>
                  </div>
                </div>

                <div className="booking-request-note">
                  <span className="material-symbols-outlined" style={{fontSize:'18px'}}>info</span>
                  Your request will be sent to the doctor for approval. You will see the status update once they respond.
                </div>

                <button className="btn-primary confirm-btn" onClick={handleBook} disabled={booking}>
                  {booking ? <><span className="spinner" /> Sending Request...</> : 'Send Appointment Request'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="appt-tabs fade-up fade-up-delay-1">
          <button className={`appt-tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
            <span className="material-symbols-outlined" style={{fontSize:'17px'}}>event_available</span>
            Upcoming ({upcoming.length})
          </button>
          <button className={`appt-tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
            <span className="material-symbols-outlined" style={{fontSize:'17px'}}>history</span>
            Past & Cancelled ({past.length})
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="loading-state">Loading appointments...</div>
        ) : displayed.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-icon">calendar_month</span>
              <p>{tab === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments.'}</p>
              <span>{tab === 'upcoming' ? 'Request your first appointment using the button above.' : 'Your completed appointments will appear here.'}</span>
            </div>
          </div>
        ) : (
          <div className="appt-list fade-up fade-up-delay-2">
            {displayed.map(appt => (
              <div key={appt.id} className={`appt-card ${appt.status}`}>
                <div className="appt-card-left">
                  <div className="appt-doctor-avatar">{appt.doctor_name?.charAt(0)}</div>
                  <div className="appt-card-info">
                    <div className="appt-doctor-name">{appt.doctor_name}</div>
                    <div className="appt-spec">
                      <span className="badge badge-secondary" style={{fontSize:'11px'}}>{appt.specialization}</span>
                    </div>
                    <div className="appt-hospital">{appt.hospital_name}</div>
                    {appt.reason && <div className="appt-reason">"{appt.reason}"</div>}
                  </div>
                </div>

                <div className="appt-card-center">
                  <div className="appt-meta-item">
                    <span className="material-symbols-outlined">event</span>
                    {formatDate(appt.appointment_date)}
                  </div>
                  <div className="appt-meta-item">
                    <span className="material-symbols-outlined">schedule</span>
                    {appt.appointment_time}
                  </div>
                  <div className="appt-meta-item">
                    <span className="material-symbols-outlined">{typeIcon(appt.appointment_type)}</span>
                    {appt.appointment_type === 'telehealth' ? 'Telehealth' : 'In-Person'}
                  </div>
                </div>

                <div className="appt-card-right">
                  <span className={`badge ${statusColor(appt.status)}`}>
                    <span className="material-symbols-outlined" style={{fontSize:'13px'}}>{statusIcon(appt.status)}</span>
                    {appt.status?.charAt(0).toUpperCase() + appt.status?.slice(1)}
                  </span>

                  {appt.status === 'pending' && (
                    <div className="appt-pending-msg">Awaiting doctor approval</div>
                  )}
                  {appt.status === 'rejected' && appt.doctor_notes && (
                    <div className="appt-notes">
                      <span className="material-symbols-outlined" style={{fontSize:'14px'}}>note</span>
                      {appt.doctor_notes}
                    </div>
                  )}
                  {['pending', 'confirmed'].includes(appt.status) && (
                    <button className="btn-danger" style={{fontSize:'12px', padding:'6px 14px', marginTop:'4px'}}
                      disabled={cancelling === appt.id}
                      onClick={() => handleCancel(appt.id)}>
                      {cancelling === appt.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                  {appt.status === 'completed' && appt.doctor_notes && (
                    <div className="appt-notes">
                      <span className="material-symbols-outlined" style={{fontSize:'14px'}}>note</span>
                      {appt.doctor_notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
