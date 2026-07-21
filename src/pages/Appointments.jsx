import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { toDDMMYYYY, toYYYYMMDD } from '../utils/dateFormat';
import { formatIst, formatCountdown, computeSlotDatetime } from '../utils/slotTime';
import { formatRupees } from '../utils/paymentUtils';
import './Appointments.css';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const SPECIALIZATIONS = [
  'All','General Physician','Cardiology','Neurology','Orthopedic',
  'Dermatology','Ophthalmology','Pediatrics','Gynecology',
  'Psychiatry','Oncology','Gastroenterology','Other'
];

const PENDING_STATUSES = ['requested', 'accepted_awaiting_payment'];

const STATUS_LABEL = {
  requested: 'Requested',
  accepted_awaiting_payment: 'Pay Now',
  confirmed: 'Confirmed',
  expired: 'Expired',
  rejected: 'Rejected',
  cancelled_by_patient: 'Cancelled',
  cancelled_by_doctor: 'Cancelled by Doctor',
  completed: 'Completed',
  'no-show': 'No Show',
};

const statusColor = (s) => ({
  requested: 'badge-warning',
  accepted_awaiting_payment: 'badge-orange',
  confirmed: 'badge-primary',
  completed: 'badge-green',
  expired: 'badge-secondary',
  rejected: 'badge-error',
  cancelled_by_patient: 'badge-error',
  cancelled_by_doctor: 'badge-error',
  'no-show': 'badge-warning',
}[s] || 'badge-secondary');

const statusIcon = (s) => ({
  requested: 'pending',
  accepted_awaiting_payment: 'payments',
  confirmed: 'event_available',
  completed: 'check_circle',
  expired: 'schedule',
  rejected: 'cancel',
  cancelled_by_patient: 'cancel',
  cancelled_by_doctor: 'cancel',
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
  const [doctorSearch, setDoctorSearch] = useState('');
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
  const [payingId, setPayingId] = useState(null);

  // Ticks every 30s so "Pay now" countdowns stay live without a full refetch.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

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
      const dateStr = toYYYYMMDD(selectedDate);
      const res = await API.get('/appointments/slots', {
        params: { doctor_id: selectedDoctor.id, date: dateStr }
      });
      setSlots(res.data.slots);
      setSelectedSlot(null);
    } catch (err) { console.error(err); }
  };

  const handleRequest = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setError('Please select a doctor, date and time slot.'); return;
    }
    setBooking(true); setError('');
    try {
      const res = await API.post('/appointments/request', {
        doctor_id: selectedDoctor.id,
        appointment_date: toYYYYMMDD(selectedDate),
        appointment_time: selectedSlot,
        appointment_type: apptType,
        reason
      });
      const appt = res.data.appointment;
      setSuccess(appt.status === 'accepted_awaiting_payment'
        ? 'Your request was auto-accepted! Pay the advance from the Pending tab to confirm your slot.'
        : 'Appointment request sent! Waiting for doctor approval.');
      setShowBook(false); resetBooking(); fetchAppointments();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally { setBooking(false); }
  };

  const handlePayNow = async (appt) => {
    setPayingId(appt.id); setError('');
    try {
      const res = await API.post(`/appointments/${appt.id}/pay`);
      const { order_id, amount, currency, key_id, appointment } = res.data;

      if (!window.Razorpay) {
        setError('Payment gateway failed to load. Please check your connection and try again.');
        setPayingId(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: key_id,
        order_id,
        amount,
        currency,
        name: 'MediCard',
        description: `Advance for appointment with ${appointment.doctor_name}`,
        handler: async (response) => {
          try {
            await API.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccess('Payment confirmed! Your appointment is booked.');
            fetchAppointments();
            setTimeout(() => setSuccess(''), 5000);
          } catch (err) {
            setError(err.response?.data?.error || 'Payment verification failed. If money was deducted, it will be confirmed automatically shortly.');
          } finally {
            setPayingId(null);
          }
        },
        modal: { ondismiss: () => setPayingId(null) },
        theme: { color: '#1a6b4a' },
      });
      rzp.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error?.description || 'Please try again.'}`);
        setPayingId(null);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start payment. Please try again.');
      setPayingId(null);
    }
  };

  const handleCancel = async (appt) => {
    let confirmMsg = 'Are you sure you want to cancel this appointment request?';
    if (appt.status === 'confirmed' && appt.advance_status === 'captured') {
      const hours = (new Date(appt.slot_datetime) - new Date()) / 3600000;
      const withinWindow = hours >= (appt.cancellation_cutoff_hours - 0.5);
      const advanceText = formatRupees(appt.advance_amount);
      confirmMsg = withinWindow
        ? `Cancel this confirmed appointment? Your ${advanceText} advance will be fully refunded.`
        : `Your ${advanceText} advance will NOT be refunded — you're past the free-cancellation window. Cancel anyway?`;
    }
    if (!window.confirm(confirmMsg)) return;

    setCancelling(appt.id);
    try {
      const res = await API.post(`/appointments/${appt.id}/cancel`);
      setSuccess(res.data.refund_initiated ? 'Appointment cancelled. Refund initiated.' : 'Appointment cancelled.');
      fetchAppointments();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel appointment.');
    } finally {
      setCancelling(null);
    }
  };

  // Accept/decline an appointment the DOCTOR proposed (the reverse of the
  // usual flow, where the patient requests and the doctor responds).
  const handlePatientRespond = async (appt, action) => {
    if (action === 'decline' && !window.confirm('Decline this proposed appointment?')) return;
    setCancelling(appt.id);
    try {
      const res = await API.post(`/appointments/${appt.id}/patient-respond`, { action });
      setAppointments(prev => prev.map(a => a.id === appt.id ? res.data.appointment : a));
      setSuccess(action === 'accept' ? 'Accepted — pay the advance to confirm.' : 'Appointment declined.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to respond to this appointment.');
    } finally {
      setCancelling(null);
    }
  };

  const resetBooking = () => {
    setSelectedDoctor(null); setSelectedDate(null);
    setSelectedSlot(null); setSlots([]);
    setReason(''); setApptType('in-person');
  };

  const filteredDoctors = doctors.filter(d => {
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return true;
    return d.full_name?.toLowerCase().includes(q)
      || d.specializations?.some(s => s.toLowerCase().includes(q))
      || d.hospital_name?.toLowerCase().includes(q);
  });

  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDay = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const isPast = (day) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date(); today.setHours(0,0,0,0);
    return d < today;
  };

  // A local Date built from explicit Y/M/D components (no ISO/UTC round
  // trip involved), so .getDay() is always the correct calendar weekday —
  // this isn't the earlier toISOString() timezone-shift pitfall.
  const isDayOff = (day) => {
    if (!selectedDoctor) return false;
    const weekday = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay();
    return !selectedDoctor.working_days.includes(weekday);
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

  const pending = appointments.filter(a => PENDING_STATUSES.includes(a.status));
  const upcoming = appointments.filter(a => a.status === 'confirmed' && new Date(a.slot_datetime) >= now);
  const past = appointments.filter(a =>
    !PENDING_STATUSES.includes(a.status) && !(a.status === 'confirmed' && new Date(a.slot_datetime) >= now)
  );
  const displayed = tab === 'upcoming' ? upcoming : tab === 'pending' ? pending : past;

  const formatDate = (d) => toDDMMYYYY(d);

  // Booking-summary preview (server always recomputes the real charge at
  // /pay time — this is just so the patient knows what to expect up front).
  // There's no consultation-fee/balance preview here: the full fee isn't
  // fixed — the doctor sets it per-visit once the consultation is done.
  const advancePreview = selectedDoctor ? selectedDoctor.advance_amount : 0;
  const cutoffPreview = (selectedDoctor && selectedDate && selectedSlot)
    ? formatIst(new Date(
        computeSlotDatetime(toYYYYMMDD(selectedDate), selectedSlot).getTime()
        - selectedDoctor.cancellation_cutoff_hours * 3600000
      ))
    : null;

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
        {pending.length > 0 && tab !== 'pending' && (
          <div className="pending-notice fade-up">
            <span className="material-symbols-outlined">pending</span>
            <div>
              <strong>{pending.length} appointment{pending.length > 1 ? 's' : ''} need{pending.length > 1 ? '' : 's'} your attention.</strong>
              <span> Waiting on doctor approval, or a "Pay now" advance to confirm.</span>
            </div>
            <button className="btn-primary" style={{fontSize:'13px', padding:'8px 20px', marginLeft:'auto', flexShrink:0}}
              onClick={() => setTab('pending')}>
              View
            </button>
          </div>
        )}

        {/* Booking Panel */}
        {showBook && (
          <div className="booking-panel fade-up">
            <h2 className="card-section-title">Request an Appointment</h2>

            {/* Step 1 */}
            <div className="booking-step">
              <div className="step-label"><div className="step-num">1</div><span>Select a Doctor</span></div>
              <div className="doctor-search-bar">
                <span className="material-symbols-outlined">search</span>
                <input type="text" className="doctor-search-input"
                  placeholder="Search by doctor name, specialty or hospital..."
                  value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} />
                {doctorSearch && (
                  <button className="doctor-search-clear" onClick={() => setDoctorSearch('')}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
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
                ) : filteredDoctors.length === 0 ? (
                  <div className="no-doctors">
                    <span className="material-symbols-outlined">search_off</span>
                    <p>No doctors match "{doctorSearch}".</p>
                  </div>
                ) : filteredDoctors.map(doc => (
                  <div key={doc.id}
                    className={`doctor-card ${selectedDoctor?.id === doc.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedDoctor(doc); setSelectedDate(null); setSlots([]); setSelectedSlot(null); }}>
                    <div className="doctor-card-avatar">{doc.full_name.charAt(0)}</div>
                    <div className="doctor-card-info">
                      <div className="doctor-card-name">{doc.full_name}</div>
                      <div className="doctor-card-spec">{doc.specializations?.join(', ')}</div>
                      <div className="doctor-card-hosp">
                        <span className="material-symbols-outlined" style={{fontSize:'14px'}}>local_hospital</span>
                        {doc.hospital_name}
                      </div>
                      <div className="doctor-card-hosp">
                        <span className="material-symbols-outlined" style={{fontSize:'14px'}}>payments</span>
                        {formatRupees(doc.advance_amount)} advance to secure your slot
                      </div>
                      <div className="doctor-card-hosp">
                        <span className="material-symbols-outlined" style={{fontSize:'14px'}}>schedule</span>
                        Available {doc.available_start_time} – {doc.available_end_time}
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
                        const dayOff = !past && isDayOff(day);
                        const disabled = past || dayOff;
                        return (
                          <div key={day}
                            title={dayOff ? "Doctor doesn't take appointments this day" : undefined}
                            className={`cal-cell ${disabled ? 'past' : 'available'} ${isSelected(day) ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                            onClick={() => { if (!disabled) { setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setSelectedSlot(null); } }}>
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedDate && (
                    <div className="time-slots-panel">
                      <div className="time-slots-title">
                        {toDDMMYYYY(selectedDate)}
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
                                ? <span className="slot-status booked-label">{slot.dayOff ? 'Day Off' : slot.past ? 'Past' : 'Booked'}</span>
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
                    <span>{selectedDoctor.full_name} — {selectedDoctor.specializations?.join(', ')}</span>
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
                  <div className="summary-row-item">
                    <span className="material-symbols-outlined">payments</span>
                    <span>Advance to secure your slot: {formatRupees(advancePreview)}. The full consultation fee will be set by the doctor at the end of your visit.</span>
                  </div>
                </div>

                <div className="booking-request-note">
                  <span className="material-symbols-outlined" style={{fontSize:'18px'}}>info</span>
                  Your request will be sent to the doctor for approval. If accepted, you'll pay the advance to confirm.
                  Free cancellation of a confirmed appointment until <strong>{cutoffPreview}</strong> — after that, the advance is forfeited if you cancel.
                </div>

                <button className="btn-primary confirm-btn" onClick={handleRequest} disabled={booking}>
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
          <button className={`appt-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            <span className="material-symbols-outlined" style={{fontSize:'17px'}}>pending</span>
            Pending ({pending.length})
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
              <p>{tab === 'upcoming' ? 'No upcoming appointments.' : tab === 'pending' ? 'No pending requests.' : 'No past appointments.'}</p>
              <span>{tab === 'upcoming' ? 'Request your first appointment using the button above.' : tab === 'pending' ? 'Appointment requests awaiting a doctor or payment will appear here.' : 'Your completed appointments will appear here.'}</span>
            </div>
          </div>
        ) : (
          <div className="appt-list fade-up fade-up-delay-2">
            {displayed.map(appt => {
              const balancePaise = appt.final_fee != null ? appt.final_fee - appt.advance_amount : null;
              const cutoffDate = appt.slot_datetime
                ? new Date(new Date(appt.slot_datetime).getTime() - (appt.cancellation_cutoff_hours || 24) * 3600000)
                : null;
              const countdown = appt.status === 'accepted_awaiting_payment' && appt.payment_deadline
                ? formatCountdown(appt.payment_deadline, now)
                : null;
              const linkedCount = Number(appt.linked_count) || 0;
              const visitEndLabel = linkedCount > 0
                ? new Date(new Date(appt.last_slot_datetime).getTime() + 30 * 60000)
                    .toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })
                : null;

              return (
                <div key={appt.id} className={`appt-card ${appt.status}`}>
                  <div className="appt-card-left">
                    <div className="appt-doctor-avatar">{appt.doctor_name?.charAt(0)}</div>
                    <div className="appt-card-info">
                      <div className="appt-doctor-name">{appt.doctor_name}</div>
                      <div className="appt-spec">
                        {appt.specializations?.map(s => (
                          <span className="badge badge-secondary" style={{fontSize:'11px'}} key={s}>{s}</span>
                        ))}
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
                      {appt.appointment_time}{linkedCount > 0 && ` – ${visitEndLabel}`}
                    </div>
                    <div className="appt-meta-item">
                      <span className="material-symbols-outlined">{typeIcon(appt.appointment_type)}</span>
                      {appt.appointment_type === 'telehealth' ? 'Telehealth' : 'In-Person'}
                    </div>
                  </div>

                  <div className="appt-card-right">
                    <span className={`badge ${statusColor(appt.status)}`}>
                      <span className="material-symbols-outlined" style={{fontSize:'13px'}}>{statusIcon(appt.status)}</span>
                      {STATUS_LABEL[appt.status] || appt.status}
                    </span>

                    {appt.status === 'requested' && appt.initiated_by === 'patient' && (
                      <div className="appt-pending-msg">Awaiting doctor approval</div>
                    )}

                    {appt.status === 'requested' && appt.initiated_by === 'doctor' && (
                      <>
                        <div className="appt-pending-msg">Dr. {appt.doctor_name} proposed this appointment</div>
                        <div style={{display:'flex', gap:'8px', marginTop:'4px'}}>
                          <button className="btn-primary" style={{fontSize:'12px', padding:'6px 14px'}}
                            disabled={cancelling === appt.id}
                            onClick={() => handlePatientRespond(appt, 'accept')}>
                            Accept
                          </button>
                          <button className="btn-danger" style={{fontSize:'12px', padding:'6px 14px'}}
                            disabled={cancelling === appt.id}
                            onClick={() => handlePatientRespond(appt, 'decline')}>
                            Decline
                          </button>
                        </div>
                      </>
                    )}

                    {appt.status === 'accepted_awaiting_payment' && (
                      <>
                        <div className="appt-pending-msg">
                          Advance due: <strong>{formatRupees(appt.doctor_advance_amount)}</strong>
                          {countdown && <> · {countdown} left</>}
                        </div>
                        <button className="btn-primary" style={{fontSize:'12px', padding:'6px 14px', marginTop:'4px'}}
                          disabled={payingId === appt.id}
                          onClick={() => handlePayNow(appt)}>
                          {payingId === appt.id ? 'Opening...' : 'Pay Now'}
                        </button>
                      </>
                    )}

                    {appt.status === 'confirmed' && (
                      <div className="appt-pending-msg">
                        {formatRupees(appt.advance_amount)} advance paid. The full fee will be set by your doctor at the end of the visit.
                        {cutoffDate && <><br />Free cancellation until {formatIst(cutoffDate)}</>}
                      </div>
                    )}

                    {appt.status === 'completed' && appt.final_fee != null && (
                      <div className="appt-pending-msg">
                        {formatRupees(appt.advance_amount)} paid · {formatRupees(balancePaise)} at clinic
                      </div>
                    )}

                    {appt.status === 'rejected' && appt.doctor_notes && (
                      <div className="appt-notes">
                        <span className="material-symbols-outlined" style={{fontSize:'14px'}}>note</span>
                        {appt.doctor_notes}
                      </div>
                    )}

                    {['cancelled_by_patient', 'cancelled_by_doctor'].includes(appt.status) && appt.refund_status && (
                      <div className="appt-pending-msg">
                        {appt.refund_status === 'refunded'
                          ? `${formatRupees(appt.refund_amount)} refunded`
                          : appt.refund_status === 'refund_initiated'
                            ? `${formatRupees(appt.refund_amount)} refund in progress`
                            : null}
                      </div>
                    )}

                    {['requested', 'accepted_awaiting_payment', 'confirmed'].includes(appt.status) &&
                      !(appt.status === 'requested' && appt.initiated_by === 'doctor') && (
                      <button className="btn-danger" style={{fontSize:'12px', padding:'6px 14px', marginTop:'4px'}}
                        disabled={cancelling === appt.id}
                        onClick={() => handleCancel(appt)}>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
