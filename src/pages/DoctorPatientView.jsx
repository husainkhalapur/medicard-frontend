import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DoctorNavbar from '../components/DoctorNavbar';
import NotesDisplay from '../components/NotesDisplay';
import DoctorAPI from '../api/doctorAxios';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import { toDDMMYYYY } from '../utils/dateFormat';
import './DoctorPatientView.css';

const CATEGORIES = ['General', 'Cardiology', 'Orthopedic', 'Neurology', 'Dermatology', 'Ophthalmology', 'Dental', 'Radiology', 'Pathology', 'Other'];
const FREQUENCIES = ['Once Daily', 'Twice Daily', 'Thrice Daily', 'Four Times Daily', 'Alternate Day', 'Weekly', 'Fortnightly', 'Monthly', 'SOS (As Needed)'];
const WHEN_OPTIONS = ['Before Food', 'After Food', 'Before Breakfast', 'After Breakfast', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner', 'Bed Time', 'SOS', 'Empty Stomach'];
const DOSAGE_OPTIONS = [
  '¼-0-0', '0-¼-0', '0-0-¼',
  '½-0-0', '0-½-0', '0-0-½',
  '1-0-0', '0-1-0', '0-0-1',
  '1½-0-0', '0-1½-0', '0-0-1½',
  '2-0-0', '0-2-0', '0-0-2',
  '½-0-½', '½-½-0', '0-½-½', '½-½-½',
  '1-0-1', '1-1-0', '0-1-1', '1-1-1',
  '1½-0-1½', '1½-1½-0', '0-1½-1½', '1½-1½-1½',
  '2-0-2', '2-2-0', '0-2-2', '2-2-2',
  '1-2-1', '2-1-2', '2-1-1', '1-2-2', '2-2-1',
  '1-½-1', '½-1-½', '1-½-0', '0-½-1',
  '3-0-0', '0-3-0', '0-0-3', '3-3-3'
];
const NEXT_VISIT_UNITS = ['Days', 'Weeks', 'Months'];

const emptyMedicine = () => ({ name: '', dosage: '', dosageCustom: false, when: '', frequency: '', duration: '', notes: '' });
const emptyConsult = () => ({
  complaints: '', diagnosis: [], diagnosisInput: '',
  vitals: { bp_sys: '', bp_dia: '', pulse: '', height: '', weight: '', temperature: '', bmi: '', waist_hip: '' },
  medicines: [emptyMedicine()],
  assessment: '', advice: '', tests: '',
  referral: { name: '', speciality: '', phone: '', email: '' },
  next_visit_num: '', next_visit_unit: 'Days', next_visit_date: '', next_visit_time: ''
});

export default function DoctorPatientView() {
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const { doctor } = useDoctorAuth();

  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Visit Log filters
  const [visitLogDoctorSearch, setVisitLogDoctorSearch] = useState('');
  const [visitLogDateFilter, setVisitLogDateFilter] = useState('');

  // Record form
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ title: '', category: '', doctor_name: '', visit_date: '', notes: '' });
  const [recordFile, setRecordFile] = useState(null);

  // Prescription form
  const [showPrescForm, setShowPrescForm] = useState(false);
  const [savingPresc, setSavingPresc] = useState(false);
  const [prescForm, setPrescForm] = useState({ medicine_name: '', dosage: '', frequency: '', start_date: '', end_date: '' });
  const [checkingInteraction, setCheckingInteraction] = useState(false);
  const [interactionResult, setInteractionResult] = useState(null);
  const [interactionAcknowledged, setInteractionAcknowledged] = useState(false);

  // Consultation (Write Prescription) form
  const [consult, setConsult] = useState(emptyConsult());
  const [savingConsult, setSavingConsult] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [savedConsult, setSavedConsult] = useState(null);

  // Next visit auto-booking
  const [nextVisitSlots, setNextVisitSlots] = useState([]);
  const [loadingNextVisitSlots, setLoadingNextVisitSlots] = useState(false);

  useEffect(() => { fetchAll(); }, [uniqueId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [patientRes, recordsRes, prescRes] = await Promise.all([
        DoctorAPI.get(`/doctor/patient/${uniqueId}`),
        DoctorAPI.get(`/doctor/patient/${uniqueId}/records`),
        DoctorAPI.get(`/doctor/patient/${uniqueId}/prescriptions`)
      ]);
      setPatient(patientRes.data.patient);
      setRecords(recordsRes.data.records);
      setPrescriptions(prescRes.data.prescriptions);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  // ── Record ──
  const handleAddRecord = async () => {
    if (!recordForm.title || !recordForm.category) { setError('Title and category are required.'); return; }
    setSavingRecord(true); setError('');
    try {
      const formData = new FormData();
      Object.entries(recordForm).forEach(([k, v]) => formData.append(k, v));
      if (recordFile) formData.append('file', recordFile);
      await DoctorAPI.post(`/doctor/patient/${uniqueId}/records`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setRecordForm({ title: '', category: '', doctor_name: '', visit_date: '', notes: '' });
      setRecordFile(null); setShowRecordForm(false);
      showSuccess('Record added successfully!');
      const res = await DoctorAPI.get(`/doctor/patient/${uniqueId}/records`);
      setRecords(res.data.records);
    } catch (err) { setError(err.response?.data?.error || 'Failed to add record.'); }
    finally { setSavingRecord(false); }
  };

  // ── Drug interaction ──
  const checkInteraction = async () => {
    if (!prescForm.medicine_name) { setError('Please enter a medicine name first.'); return; }
    setCheckingInteraction(true); setInteractionResult(null); setInteractionAcknowledged(false);
    try {
      const res = await DoctorAPI.post(`/doctor/patient/${uniqueId}/check-interaction`, { new_medicine: prescForm.medicine_name });
      setInteractionResult(res.data);
    } catch { setError('Could not check interactions. You may proceed with caution.'); }
    finally { setCheckingInteraction(false); }
  };

  // ── Prescription ──
  const handleAddPresc = async () => {
    if (!prescForm.medicine_name || !prescForm.dosage || !prescForm.frequency) { setError('Medicine name, dosage and frequency are required.'); return; }
    setSavingPresc(true); setError('');
    try {
      let interactionWarning = null;
      if (interactionResult?.has_interaction && interactionAcknowledged) interactionWarning = interactionResult.summary;
      await DoctorAPI.post(`/doctor/patient/${uniqueId}/prescriptions`, { ...prescForm, interaction_warning: interactionWarning });
      setPrescForm({ medicine_name: '', dosage: '', frequency: '', start_date: '', end_date: '' });
      setInteractionResult(null); setInteractionAcknowledged(false); setShowPrescForm(false);
      showSuccess('Prescription added successfully!');
      const res = await DoctorAPI.get(`/doctor/patient/${uniqueId}/prescriptions`);
      setPrescriptions(res.data.prescriptions);
    } catch (err) { setError(err.response?.data?.error || 'Failed to add prescription.'); }
    finally { setSavingPresc(false); }
  };

  // ── Consultation helpers ──
  const updateVital = (k, v) => setConsult(c => ({ ...c, vitals: { ...c.vitals, [k]: v } }));

  const addDiagnosis = () => {
    const val = consult.diagnosisInput.trim();
    if (!val) return;
    setConsult(c => ({ ...c, diagnosis: [...c.diagnosis, val], diagnosisInput: '' }));
  };
  const removeDiagnosis = (i) => setConsult(c => ({ ...c, diagnosis: c.diagnosis.filter((_, idx) => idx !== i) }));

  const updateMed = (i, k, v) => setConsult(c => {
    const meds = [...c.medicines]; meds[i] = { ...meds[i], [k]: v }; return { ...c, medicines: meds };
  });
  const addMed = () => setConsult(c => ({ ...c, medicines: [...c.medicines, emptyMedicine()] }));
  const removeMed = (i) => setConsult(c => ({ ...c, medicines: c.medicines.filter((_, idx) => idx !== i) }));

  const updateReferral = (k, v) => setConsult(c => ({ ...c, referral: { ...c.referral, [k]: v } }));

  const calcNextVisitDate = (num, unit) => {
    const n = parseInt(num, 10);
    if (!n || n <= 0) return null;
    const d = new Date();
    if (unit === 'Weeks') d.setDate(d.getDate() + n * 7);
    else if (unit === 'Months') d.setMonth(d.getMonth() + n);
    else d.setDate(d.getDate() + n);
    return d;
  };

  const resolvedNextVisitDate = () => {
    if (consult.next_visit_date) return consult.next_visit_date;
    const calc = calcNextVisitDate(consult.next_visit_num, consult.next_visit_unit);
    return calc ? calc.toISOString().split('T')[0] : null;
  };

  useEffect(() => {
    const dateStr = resolvedNextVisitDate();
    if (!dateStr) { setNextVisitSlots([]); return; }
    setConsult(c => ({ ...c, next_visit_time: '' }));
    setLoadingNextVisitSlots(true);
    DoctorAPI.get('/appointments/doctor/slots', { params: { date: dateStr } })
      .then(res => setNextVisitSlots(res.data.slots))
      .catch(() => setNextVisitSlots([]))
      .finally(() => setLoadingNextVisitSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consult.next_visit_num, consult.next_visit_unit, consult.next_visit_date]);

  const handleSaveConsult = async () => {
    const validMeds = consult.medicines.filter(m => m.name.trim());
    if (!consult.complaints && consult.diagnosis.length === 0 && validMeds.length === 0) {
      setError('Please fill in at least complaints, diagnosis or medicines before saving.'); return;
    }
    setSavingConsult(true); setError('');
    try {
      // Save each medicine as a prescription
      for (const med of validMeds) {
        await DoctorAPI.post(`/doctor/patient/${uniqueId}/prescriptions`, {
          medicine_name: med.name,
          dosage: [med.dosage, med.when].filter(Boolean).join(' — '),
          frequency: [med.frequency, med.duration].filter(Boolean).join(', '),
          start_date: null, end_date: null, interaction_warning: null
        });
      }
      // Save notes/record if anything else was filled
      const notesParts = [];
      if (consult.complaints) notesParts.push(`Complaints: ${consult.complaints}`);
      if (consult.diagnosis.length) notesParts.push(`Diagnosis: ${consult.diagnosis.join(', ')}`);
      if (consult.vitals.bp_sys) notesParts.push(`BP: ${consult.vitals.bp_sys}/${consult.vitals.bp_dia} mmHg`);
      if (consult.vitals.pulse) notesParts.push(`Pulse: ${consult.vitals.pulse} bpm`);
      if (consult.vitals.height) notesParts.push(`Height: ${consult.vitals.height} cm`);
      if (consult.vitals.weight) notesParts.push(`Weight: ${consult.vitals.weight} kg`);
      if (consult.vitals.temperature) notesParts.push(`Temperature: ${consult.vitals.temperature} °C`);
      if (consult.assessment) notesParts.push(`Assessment: ${consult.assessment}`);
      if (consult.advice) notesParts.push(`Advice: ${consult.advice}`);
      if (consult.tests) notesParts.push(`Tests: ${consult.tests}`);
      const nextVisitCalc = calcNextVisitDate(consult.next_visit_num, consult.next_visit_unit);
      const nextVisit = nextVisitCalc
        ? `${consult.next_visit_num} ${consult.next_visit_unit} (${toDDMMYYYY(nextVisitCalc)})`
        : consult.next_visit_date || '';
      if (nextVisit) notesParts.push(`Next Visit: ${nextVisit}`);

      if (notesParts.length) {
        await DoctorAPI.post(`/doctor/patient/${uniqueId}/records`, {
          title: `Consultation — ${toDDMMYYYY(new Date())}`,
          category: 'General', notes: notesParts.join('\n'), visit_date: new Date().toISOString().split('T')[0]
        });
      }

      // Auto-book the next visit on the calendar if a date and time slot were chosen
      let bookingNote = '';
      const nextVisitDateStr = resolvedNextVisitDate();
      if (nextVisitDateStr && consult.next_visit_time) {
        try {
          await DoctorAPI.post('/appointments/doctor', {
            patient_unique_id: uniqueId,
            appointment_date: nextVisitDateStr,
            appointment_time: consult.next_visit_time,
            appointment_type: 'in-person',
            reason: 'Follow-up visit'
          });
          bookingNote = ` Next visit booked for ${toDDMMYYYY(nextVisitDateStr)} at ${consult.next_visit_time}.`;
        } catch (bookErr) {
          bookingNote = ` Note: next visit could not be auto-booked (${bookErr.response?.data?.error || 'slot no longer available'}) — please book it manually from Appointments.`;
        }
      }

      setSavedConsult({ ...consult, medicines: validMeds, date: new Date() });
      showSuccess(`Consultation saved successfully!${bookingNote}`);
      await fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save consultation.'); }
    finally { setSavingConsult(false); }
  };

  const handlePrint = () => { setShowPrint(true); setTimeout(() => window.print(), 400); };

  const handlePrintPresc = (p) => {
    // dosage/frequency may be stored merged with when/duration (see handleSaveConsult), so split them back apart
    const [dosage, when] = (p.dosage || '').split(' — ');
    const [frequency, duration] = (p.frequency || '').split(', ');
    setSavedConsult({
      diagnosis: [],
      medicines: [{ name: p.medicine_name, dosage: dosage || '', when: when || '', frequency: frequency || '', duration: duration || '', notes: '' }],
      advice: '', tests: '',
      next_visit_num: '', next_visit_unit: 'Days', next_visit_date: '',
      date: p.created_at ? new Date(p.created_at) : new Date()
    });
    setShowPrint(true);
    setTimeout(() => window.print(), 400);
  };

  const tags = (arr) => arr?.filter(Boolean) || [];

  // ── Visit Log: combined, date-grouped view of records + prescriptions ──
  const dpvDateKey = (d) => d ? new Date(d).toISOString().split('T')[0] : null;

  const formatGroupDate = (key) => key === 'unknown'
    ? 'Date not recorded'
    : toDDMMYYYY(key);

  const visitGroups = (() => {
    const doctorQuery = visitLogDoctorSearch.trim().toLowerCase();
    const matchesDoctor = (name) => !doctorQuery || name?.toLowerCase().includes(doctorQuery);
    const matchesDate = (key) => !visitLogDateFilter || key === visitLogDateFilter;

    const map = {};
    records.forEach(r => {
      const key = dpvDateKey(r.visit_date) || dpvDateKey(r.created_at) || 'unknown';
      if (!matchesDoctor(r.doctor_name) || !matchesDate(key)) return;
      if (!map[key]) map[key] = { records: [], prescriptions: [] };
      map[key].records.push(r);
    });
    prescriptions.forEach(p => {
      const key = dpvDateKey(p.start_date) || dpvDateKey(p.created_at) || 'unknown';
      if (!matchesDoctor(p.prescribed_by) || !matchesDate(key)) return;
      if (!map[key]) map[key] = { records: [], prescriptions: [] };
      map[key].prescriptions.push(p);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  // Reports tab: records that have an attached file, grouped by date (its own filters, independent of Visit Log)
  const reportGroups = (() => {
    const map = {};
    records.forEach(r => {
      if (!r.file_url) return;
      const key = dpvDateKey(r.visit_date) || dpvDateKey(r.created_at) || 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const renderRecordCard = (r) => (
    <div key={`r-${r.id}`} className="dpv-record-card">
      <div className="dpv-record-header">
        <div>
          <div className="dpv-record-category">{r.category}</div>
          <div className="dpv-record-title">{r.title}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {r.uploaded_by === 'doctor' && <span className="badge badge-blue" style={{ fontSize: '11px' }}><span className="material-symbols-outlined" style={{ fontSize: '13px' }}>stethoscope</span> Doctor</span>}
          {r.uploaded_by === 'patient' && <span className="badge badge-green" style={{ fontSize: '11px' }}>Patient</span>}
        </div>
      </div>
      <div className="dpv-record-meta">
        {r.doctor_name && <span><span className="material-symbols-outlined">stethoscope</span> Dr. {r.doctor_name}</span>}
        {r.visit_date && <span><span className="material-symbols-outlined">calendar_today</span> {toDDMMYYYY(r.visit_date)}</span>}
      </div>
      <NotesDisplay notes={r.notes} className="dpv-record-notes" />
      {r.file_url && (
        <a href={r.file_url} target="_blank" rel="noreferrer" className="btn-outline"
          style={{ fontSize: '13px', padding: '7px 16px', marginTop: '8px', display: 'inline-flex' }}>View Attached File</a>
      )}
    </div>
  );

  if (loading) return (
    <div className="dpv-page"><DoctorNavbar />
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-400)' }}>
        Loading patient data...
      </div>
    </div>
  );

  if (notFound) return (
    <div className="dpv-page"><DoctorNavbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>search</span>
        <h2 style={{ color: 'var(--secondary)' }}>Patient Not Found</h2>
        <p style={{ color: 'var(--outline)' }}>No patient found with ID: {uniqueId}</p>
        <button className="btn-primary" onClick={() => navigate('/doctor/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="dpv-page">
      <DoctorNavbar />
      <div className="dpv-inner">

        {/* Back */}
        <div className="dpv-top fade-up">
          <button className="back-btn" onClick={() => navigate('/doctor/dashboard')}>Back to Dashboard</button>
        </div>

        {success && <div className="success-banner fade-up">{success}</div>}
        {error && <div className="error-banner fade-up">{error}</div>}

        {/* Identity Card */}
        <div className="dpv-identity-card fade-up">
          <div className="dpv-avatar">{patient?.full_name?.charAt(0).toUpperCase()}</div>
          <div className="dpv-identity-info">
            <h1 className="dpv-name">{patient?.full_name}</h1>
            <div className="dpv-meta-row">
              <span className="dpv-id"><span className="material-symbols-outlined">badge</span> {patient?.unique_id}</span>
              {patient?.blood_group && (
                <span className="badge badge-green"><span className="material-symbols-outlined">water_drop</span> {patient?.blood_group}</span>
              )}
              {patient?.date_of_birth && (
                <span className="dpv-dob"><span className="material-symbols-outlined">calendar_today</span> {toDDMMYYYY(patient.date_of_birth)}</span>
              )}
              {patient?.phone && (
                <span className="dpv-phone"><span className="material-symbols-outlined">call</span> {patient.phone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dpv-tabs fade-up fade-up-delay-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'visitlog', label: `Visit Log (${records.length + prescriptions.length})` },
            { id: 'reports', label: `Reports (${records.length})` },
            { id: 'consult', label: 'Patient Consultation' },
          ].map(tab => (
            <button key={tab.id}
              className={`dpv-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setShowRecordForm(false); setShowPrescForm(false); setError(''); }}>
              {tab.id === 'consult' && <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_note</span>}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="dpv-tab-content fade-up">
            <div className="dpv-overview-grid">
              <div className="card">
                <h2 className="card-section-title">Allergies</h2>
                <div className="tag-list">
                  {tags(patient?.allergies).length > 0
                    ? tags(patient.allergies).map(a => <span key={a} className="tag tag-red">{a}</span>)
                    : <span className="not-set">No allergies recorded</span>}
                </div>
              </div>
              <div className="card">
                <h2 className="card-section-title">Chronic Conditions</h2>
                <div className="tag-list">
                  {tags(patient?.chronic_conditions).length > 0
                    ? tags(patient.chronic_conditions).map(c => <span key={c} className="tag tag-orange">{c}</span>)
                    : <span className="not-set">No conditions recorded</span>}
                </div>
              </div>
              <div className="card">
                <h2 className="card-section-title"><span className="material-symbols-outlined">medication</span> Current Medications</h2>
                <div className="tag-list">
                  {tags(patient?.current_medications).length > 0
                    ? tags(patient.current_medications).map(m => <span key={m} className="tag tag-blue">{m}</span>)
                    : <span className="not-set">No medications recorded</span>}
                </div>
              </div>
              <div className="card">
                <h2 className="card-section-title">Emergency Contact</h2>
                {patient?.emergency_contact_name ? (
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{patient.emergency_contact_name}</div>
                    {patient?.emergency_contact_phone && (
                      <a href={`tel:${patient.emergency_contact_phone}`} className="btn-primary" style={{ fontSize: '14px', padding: '9px 20px' }}>
                        <span className="material-symbols-outlined">call</span> {patient.emergency_contact_phone}
                      </a>
                    )}
                  </div>
                ) : <span className="not-set">No emergency contact recorded</span>}
              </div>
              {patient?.first_aid_notes && (
                <div className="card dpv-notes-card">
                  <h2 className="card-section-title">First Aid Notes</h2>
                  <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)', lineHeight: '1.7' }}>{patient.first_aid_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VISIT LOG TAB ── */}
        {activeTab === 'visitlog' && (
          <div className="dpv-tab-content fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 className="page-title" style={{ fontSize: '22px' }}>Visit Log</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="dpv-add-btn" onClick={() => { setShowRecordForm(!showRecordForm); setShowPrescForm(false); setError(''); }}>
                  {showRecordForm ? 'Cancel' : 'Add Record'}
                </button>
                <button className="dpv-add-btn" onClick={() => { setShowPrescForm(!showPrescForm); setShowRecordForm(false); setError(''); }}>
                  {showPrescForm ? 'Cancel' : 'Add Prescription'}
                </button>
              </div>
            </div>

            <div className="dpv-visitlog-filters">
              <div className="dpv-filter-input">
                <span className="material-symbols-outlined">search</span>
                <input type="text" placeholder="Search by doctor name..."
                  value={visitLogDoctorSearch} onChange={e => setVisitLogDoctorSearch(e.target.value)} />
              </div>
              <div className="dpv-filter-input">
                <span className="material-symbols-outlined">calendar_today</span>
                <input type="date" value={visitLogDateFilter} onChange={e => setVisitLogDateFilter(e.target.value)} />
              </div>
              {(visitLogDoctorSearch || visitLogDateFilter) && (
                <button className="btn-tonal" onClick={() => { setVisitLogDoctorSearch(''); setVisitLogDateFilter(''); }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                  Clear Filters
                </button>
              )}
            </div>

            {showRecordForm && (
              <div className="card dpv-form fade-up">
                <h3 className="card-section-title">Add New Record</h3>
                <div className="dpv-form-grid">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-input" placeholder="e.g. ECG Report" value={recordForm.title} onChange={e => setRecordForm({ ...recordForm, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-input" value={recordForm.category} onChange={e => setRecordForm({ ...recordForm, category: e.target.value })}>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor Name</label>
                    <input className="form-input" placeholder="Your name" value={recordForm.doctor_name} onChange={e => setRecordForm({ ...recordForm, doctor_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Visit Date</label>
                    <input className="form-input" type="date" value={recordForm.visit_date} onChange={e => setRecordForm({ ...recordForm, visit_date: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Notes / Diagnosis</label>
                    <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Diagnosis, observations, recommendations..."
                      value={recordForm.notes} onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Attach File <span className="field-hint">(PDF or image)</span></label>
                    <div className="file-upload-area" onClick={() => document.getElementById('drFileInput').click()}>
                      {recordFile ? <span style={{ color: 'var(--primary)', fontWeight: '500' }}>{recordFile.name}</span>
                        : <span>Click to upload PDF or image</span>}
                      <input id="drFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setRecordFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button className="btn-outline" onClick={() => setShowRecordForm(false)}>Cancel</button>
                  <button className="dpv-add-btn" onClick={handleAddRecord} disabled={savingRecord}>
                    {savingRecord ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Saving...</> : 'Save Record'}
                  </button>
                </div>
              </div>
            )}
            {showPrescForm && (
              <div className="card dpv-form fade-up">
                <h3 className="card-section-title">Add New Prescription</h3>
                <div className="dpv-form-grid">
                  <div className="form-group">
                    <label className="form-label">Medicine Name *</label>
                    <input className="form-input" placeholder="e.g. Metoprolol" value={prescForm.medicine_name} onChange={e => setPrescForm({ ...prescForm, medicine_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage *</label>
                    <input className="form-input" placeholder="e.g. 25mg" value={prescForm.dosage} onChange={e => setPrescForm({ ...prescForm, dosage: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Frequency *</label>
                    <select className="form-input" value={prescForm.frequency} onChange={e => setPrescForm({ ...prescForm, frequency: e.target.value })}>
                      <option value="">Select frequency</option>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" value={prescForm.start_date} onChange={e => setPrescForm({ ...prescForm, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date" value={prescForm.end_date} onChange={e => setPrescForm({ ...prescForm, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="interaction-checker">
                  <button type="button" className="check-interaction-btn" onClick={checkInteraction} disabled={checkingInteraction || !prescForm.medicine_name}>
                    {checkingInteraction ? <><span className="spinner" style={{ borderTopColor: '#7e22ce' }} /> Checking...</> : 'Check Drug Interactions'}
                  </button>
                  {interactionResult && (
                    <div className={`interaction-result ${interactionResult.has_interaction ? 'has-interaction' : 'no-interaction'}`}>
                      {interactionResult.has_interaction ? (
                        <>
                          <p className="interaction-summary">{interactionResult.summary}</p>
                          {interactionResult.interactions?.map((item, i) => (
                            <div key={i} className="interaction-item">
                              <div className="interaction-drug">{item.drug}</div>
                              <div className="interaction-desc">{item.description}</div>
                              <div className="interaction-rec">{item.recommendation}</div>
                            </div>
                          ))}
                          {interactionResult.allergy_warning && (
                            <div className="interaction-item allergy">
                              <div className="interaction-drug">Allergy Warning</div>
                              <div className="interaction-desc">{interactionResult.allergy_warning}</div>
                            </div>
                          )}
                          <label className="acknowledge-check">
                            <input type="checkbox" checked={interactionAcknowledged} onChange={e => setInteractionAcknowledged(e.target.checked)} />
                            I have reviewed the interactions and acknowledge the risks
                          </label>
                        </>
                      ) : (
                        <div className="no-interaction-msg">No significant drug interactions detected</div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button className="btn-outline" onClick={() => { setShowPrescForm(false); setInteractionResult(null); setInteractionAcknowledged(false); }}>Cancel</button>
                  <button className="dpv-add-btn" onClick={handleAddPresc}
                    disabled={savingPresc || (interactionResult?.has_interaction && !interactionAcknowledged)}>
                    {savingPresc ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Saving</>
                      : interactionResult?.has_interaction && !interactionAcknowledged ? 'Acknowledge to proceed' : 'Save Prescription'}
                  </button>
                </div>
              </div>
            )}
            {visitGroups.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon"><span className="material-symbols-outlined">history</span></div>
                <p>{(visitLogDoctorSearch || visitLogDateFilter)
                  ? 'No records or prescriptions match your filters.'
                  : 'No records or prescriptions found for this patient.'}</p>
                <span>{(visitLogDoctorSearch || visitLogDateFilter)
                  ? 'Try a different doctor name or date, or clear the filters.'
                  : 'Add the first entry using the buttons above.'}</span>
              </div></div>
            ) : (
              <div className="visit-log">
                {visitGroups.map(([groupDate, group]) => (
                  <div key={groupDate} className="visit-log-group">
                    <div className="visit-log-date-header">
                      <span className="material-symbols-outlined">calendar_today</span>
                      {formatGroupDate(groupDate)}
                    </div>

                    {group.records.length > 0 && (
                      <div className="dpv-records-list">
                        {group.records.map(renderRecordCard)}
                      </div>
                    )}

                    {group.prescriptions.length > 0 && (
                      <div className="dpv-presc-grid">
                        {group.prescriptions.map(p => (
                          <div key={`p-${p.id}`} className="dpv-presc-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div className="dpv-presc-name">{p.medicine_name}</div>
                              <button className="btn-outline" onClick={() => handlePrintPresc(p)} title="Print Prescription"
                                style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                              </button>
                            </div>
                            <div className="dpv-presc-dosage">{p.dosage}</div>
                            <div className="dpv-presc-meta">
                              <div><span className="material-symbols-outlined">alarm</span> {p.frequency}</div>
                              {p.prescribed_by && <div><span className="material-symbols-outlined">stethoscope</span> Dr. {p.prescribed_by}</div>}
                              {p.start_date && <div>{toDDMMYYYY(p.start_date)}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <div className="dpv-tab-content fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="page-title" style={{ fontSize: '22px' }}>Reports</h2>
              <button className="dpv-add-btn" onClick={() => { setShowRecordForm(!showRecordForm); setShowPrescForm(false); setError(''); }}>
                {showRecordForm ? 'Cancel' : 'Upload Report'}
              </button>
            </div>
            {showRecordForm && (
              <div className="card dpv-form fade-up">
                <h3 className="card-section-title">Upload Report</h3>
                <div className="dpv-form-grid">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-input" placeholder="e.g. Blood Test Report" value={recordForm.title} onChange={e => setRecordForm({ ...recordForm, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-input" value={recordForm.category} onChange={e => setRecordForm({ ...recordForm, category: e.target.value })}>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor Name</label>
                    <input className="form-input" placeholder="Your name" value={recordForm.doctor_name} onChange={e => setRecordForm({ ...recordForm, doctor_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Visit Date</label>
                    <input className="form-input" type="date" value={recordForm.visit_date} onChange={e => setRecordForm({ ...recordForm, visit_date: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Notes / Diagnosis</label>
                    <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Diagnosis, observations, recommendations..."
                      value={recordForm.notes} onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Attach File <span className="field-hint">(PDF or image)</span></label>
                    <div className="file-upload-area" onClick={() => document.getElementById('reportFileInput').click()}>
                      {recordFile ? <span style={{ color: 'var(--primary)', fontWeight: '500' }}>{recordFile.name}</span>
                        : <span>Click to upload PDF or image</span>}
                      <input id="reportFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setRecordFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button className="btn-outline" onClick={() => setShowRecordForm(false)}>Cancel</button>
                  <button className="dpv-add-btn" onClick={handleAddRecord} disabled={savingRecord}>
                    {savingRecord ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Saving...</> : 'Save Report'}
                  </button>
                </div>
              </div>
            )}
            {reportGroups.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon"><span className="material-symbols-outlined">description</span></div>
                <p>No reports found for this patient.</p>
                <span>Upload the first report using the button above.</span>
              </div></div>
            ) : (
              <div className="visit-log">
                {reportGroups.map(([groupDate, recs]) => (
                  <div key={groupDate} className="visit-log-group">
                    <div className="visit-log-date-header">
                      <span className="material-symbols-outlined">calendar_today</span>
                      {formatGroupDate(groupDate)}
                    </div>
                    <div className="report-items-list">
                      {recs.map(r => (
                        <div key={`rep-${r.id}`} className="report-item">
                          <div className="report-item-info">
                            <span className="material-symbols-outlined">description</span>
                            <span className="report-item-name">{r.title}</span>
                          </div>
                          <a href={r.file_url} target="_blank" rel="noreferrer" className="btn-outline report-item-view">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                            View Report
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WRITE PRESCRIPTION TAB ── */}
        {activeTab === 'consult' && (
          <div className="dpv-tab-content fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="page-title" style={{ fontSize: '22px' }}>Patient Consultation</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {savedConsult && (
                  <button className="btn-outline" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined">print</span> Print Prescription
                  </button>
                )}
                <button className="dpv-add-btn" onClick={handleSaveConsult} disabled={savingConsult}>
                  {savingConsult ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Saving...</> : <><span className="material-symbols-outlined">save</span> Save Consultation</>}
                </button>
              </div>
            </div>

            {/* VITALS */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">monitor_heart</span> Vitals</h3>
              <div className="vitals-grid">
                <div className="vital-field">
                  <label className="form-label">BP (mmHg)</label>
                  <div className="bp-row">
                    <input className="form-input" placeholder="Sys" value={consult.vitals.bp_sys} onChange={e => updateVital('bp_sys', e.target.value)} />
                    <span className="bp-slash">/</span>
                    <input className="form-input" placeholder="Dia" value={consult.vitals.bp_dia} onChange={e => updateVital('bp_dia', e.target.value)} />
                  </div>
                </div>
                <div className="vital-field">
                  <label className="form-label">Pulse (bpm)</label>
                  <input className="form-input" placeholder="72" value={consult.vitals.pulse} onChange={e => updateVital('pulse', e.target.value)} />
                </div>
                <div className="vital-field">
                  <label className="form-label">Height (cm)</label>
                  <input className="form-input" placeholder="170" value={consult.vitals.height} onChange={e => updateVital('height', e.target.value)} />
                </div>
                <div className="vital-field">
                  <label className="form-label">Weight (kg)</label>
                  <input className="form-input" placeholder="70" value={consult.vitals.weight} onChange={e => updateVital('weight', e.target.value)} />
                </div>
                <div className="vital-field">
                  <label className="form-label">Temperature (°C)</label>
                  <input className="form-input" placeholder="37.0" value={consult.vitals.temperature} onChange={e => updateVital('temperature', e.target.value)} />
                </div>
                <div className="vital-field">
                  <label className="form-label">BMI (kg/m²)</label>
                  <input className="form-input" placeholder="24.2" value={consult.vitals.bmi} onChange={e => updateVital('bmi', e.target.value)} />
                </div>
                <div className="vital-field">
                  <label className="form-label">Waist/Hip</label>
                  <input className="form-input" placeholder="0.85" value={consult.vitals.waist_hip} onChange={e => updateVital('waist_hip', e.target.value)} />
                </div>
              </div>
            </div>

            {/* COMPLAINTS */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">chat_bubble</span> Complaints</h3>
              <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Patient's chief complaints..."
                value={consult.complaints} onChange={e => setConsult(c => ({ ...c, complaints: e.target.value }))} />
            </div>

            {/* DIAGNOSIS */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">diagnosis</span> Diagnosis</h3>
              <div className="diagnosis-tag-row">
                {consult.diagnosis.map((d, i) => (
                  <span key={i} className="diagnosis-tag">
                    {d}
                    <button onClick={() => removeDiagnosis(i)} className="diagnosis-tag-remove">×</button>
                  </span>
                ))}
                <input
                  className="diagnosis-input"
                  placeholder="Type diagnosis and press Enter..."
                  value={consult.diagnosisInput}
                  onChange={e => setConsult(c => ({ ...c, diagnosisInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDiagnosis(); } }}
                />
              </div>
            </div>

            {/* MEDICINES */}
            <div className="card consult-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="consult-section-title" style={{ margin: 0 }}><span className="material-symbols-outlined">medication</span> Medicines (Rx)</h3>
                <button className="dpv-add-btn" style={{ padding: '7px 16px', fontSize: '13px' }} onClick={addMed}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> Add Medicine
                </button>
              </div>
              <div className="rx-table-wrap">
                <table className="rx-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>When</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {consult.medicines.map((med, i) => (
                      <tr key={i}>
                        <td className="rx-num">{i + 1}</td>
                        <td><input className="rx-input" placeholder="Medicine name" value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} /></td>
                        <td>
                          {med.dosageCustom ? (
                            <input className="rx-input" placeholder="e.g. 1-2-1" value={med.dosage}
                              onChange={e => updateMed(i, 'dosage', e.target.value)}
                              onBlur={() => { if (!med.dosage) updateMed(i, 'dosageCustom', false); }} />
                          ) : (
                            <select className="rx-input rx-select" value={med.dosage}
                              onChange={e => {
                                if (e.target.value === '__custom__') { updateMed(i, 'dosage', ''); updateMed(i, 'dosageCustom', true); }
                                else updateMed(i, 'dosage', e.target.value);
                              }}>
                              <option value="">—</option>
                              {DOSAGE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                              <option value="__custom__">Custom…</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <select className="rx-input rx-select" value={med.when} onChange={e => updateMed(i, 'when', e.target.value)}>
                            <option value="">—</option>
                            {WHEN_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="rx-input rx-select" value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}>
                            <option value="">—</option>
                            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </td>
                        <td><input className="rx-input" placeholder="e.g. 10 days" value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} /></td>
                        <td><input className="rx-input" placeholder="Optional" value={med.notes} onChange={e => updateMed(i, 'notes', e.target.value)} /></td>
                        <td>
                          {consult.medicines.length > 1 && (
                            <button className="rx-remove-btn" onClick={() => removeMed(i)}>
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ASSESSMENT */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">summarize</span> Assessment / Plan</h3>
              <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Clinical assessment and treatment plan..."
                value={consult.assessment} onChange={e => setConsult(c => ({ ...c, assessment: e.target.value }))} />
            </div>

            {/* ADVICE */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">tips_and_updates</span> Advice</h3>
              <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Lifestyle advice, dietary recommendations..."
                value={consult.advice} onChange={e => setConsult(c => ({ ...c, advice: e.target.value }))} />
            </div>

            {/* TESTS */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">biotech</span> Tests Requested</h3>
              <input className="form-input" placeholder="e.g. CBC, LFT, X-Ray Chest PA..."
                value={consult.tests} onChange={e => setConsult(c => ({ ...c, tests: e.target.value }))} />
            </div>

            {/* REFERRAL */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">transfer_within_a_station</span> Referred To</h3>
              <div className="dpv-form-grid">
                <div className="form-group">
                  <label className="form-label">Doctor Name</label>
                  <input className="form-input" placeholder="Dr. Name" value={consult.referral.name} onChange={e => updateReferral('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Speciality</label>
                  <input className="form-input" placeholder="e.g. Cardiologist" value={consult.referral.speciality} onChange={e => updateReferral('speciality', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="+91 ..." value={consult.referral.phone} onChange={e => updateReferral('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="doctor@hospital.com" value={consult.referral.email} onChange={e => updateReferral('email', e.target.value)} />
                </div>
              </div>
            </div>

            {/* NEXT VISIT */}
            <div className="card consult-section">
              <h3 className="consult-section-title"><span className="material-symbols-outlined">event</span> Next Visit</h3>
              <div className="next-visit-row">
                <input className="form-input next-visit-num" placeholder="e.g. 2" type="number" min="1"
                  value={consult.next_visit_num} onChange={e => setConsult(c => ({ ...c, next_visit_num: e.target.value, next_visit_date: '' }))} />
                {NEXT_VISIT_UNITS.map(u => (
                  <button key={u}
                    className={`next-visit-unit-btn ${consult.next_visit_unit === u ? 'active' : ''}`}
                    onClick={() => setConsult(c => ({ ...c, next_visit_unit: u }))}>
                    {u}
                  </button>
                ))}
                <span className="next-visit-or">Or</span>
                <input className="form-input" type="date"
                  value={consult.next_visit_date} onChange={e => setConsult(c => ({ ...c, next_visit_date: e.target.value, next_visit_num: '' }))} />
              </div>
              {resolvedNextVisitDate() && (
                <div className="next-visit-booking">
                  <div className="next-visit-calculated">
                    <span className="material-symbols-outlined">event_available</span>
                    {toDDMMYYYY(resolvedNextVisitDate())}
                  </div>

                  <div className="next-visit-slot-label">
                    Pick a time to add this to the calendar <span className="field-hint">(optional)</span>
                  </div>
                  {loadingNextVisitSlots ? (
                    <div style={{ color: 'var(--outline)', fontSize: '13px' }}>Loading available slots...</div>
                  ) : (
                    <div className="next-visit-slots">
                      {nextVisitSlots.map(slot => (
                        <button key={slot.time} type="button" disabled={!slot.available}
                          className={`next-visit-slot-btn ${!slot.available ? 'booked' : ''} ${consult.next_visit_time === slot.time ? 'active' : ''}`}
                          onClick={() => slot.available && setConsult(c => ({ ...c, next_visit_time: slot.time }))}>
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                  {consult.next_visit_time && (
                    <div className="next-visit-confirmed">
                      <span className="material-symbols-outlined">event_available</span>
                      Will be added to your appointments calendar at {consult.next_visit_time} when you save.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom save bar */}
            <div className="consult-bottom-bar">
              <button className="btn-outline" onClick={() => setConsult(emptyConsult())}>Clear All</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                {savedConsult && (
                  <button className="btn-outline" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined">print</span> Print Prescription
                  </button>
                )}
                <button className="dpv-add-btn" onClick={handleSaveConsult} disabled={savingConsult}>
                  {savingConsult ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Saving...</> : <><span className="material-symbols-outlined">save</span> Save Consultation</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── PRINT PRESCRIPTION (hidden, shown on print) ── */}
      {showPrint && savedConsult && (
        <div className="print-overlay" ref={printRef}>
          <div className="rx-print-sheet">
            {/* Header */}
            <div className="rx-print-header">
              <div className="rx-print-doctor">
                <div className="rx-print-doctor-name">Dr. {doctor?.full_name || 'MediCard Doctor'}</div>
                <div className="rx-print-doctor-sub">MediCard Health Platform</div>
              </div>
              <div className="rx-print-patient-info">
                <div><strong>Name:</strong> {patient?.full_name}</div>
                <div><strong>Phone:</strong> {patient?.phone || '—'}</div>
                <div><strong>ID:</strong> {patient?.unique_id}</div>
                <div><strong>Date & Time:</strong> {toDDMMYYYY(savedConsult.date)} {savedConsult.date?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            <hr className="rx-print-divider" />

            {/* Diagnosis */}
            {savedConsult.diagnosis.length > 0 && (
              <div className="rx-print-section">
                <div className="rx-print-label">Diagnosis:</div>
                {savedConsult.diagnosis.map((d, i) => <div key={i} className="rx-print-diagnosis-item">{d}</div>)}
              </div>
            )}

            {/* Rx medicines */}
            {savedConsult.medicines.filter(m => m.name).length > 0 && (
              <div className="rx-print-section">
                <div className="rx-symbol">℞</div>
                <table className="rx-print-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>When</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedConsult.medicines.filter(m => m.name).map((med, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><strong>{med.name}</strong></td>
                        <td>{med.dosage || '—'}</td>
                        <td>{med.when || '—'}</td>
                        <td>{med.frequency || '—'}</td>
                        <td>{med.duration || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Advice */}
            {savedConsult.advice && (
              <div className="rx-print-section">
                <div className="rx-print-label">Advice:</div>
                <div className="rx-print-text">{savedConsult.advice}</div>
              </div>
            )}

            {/* Tests */}
            {savedConsult.tests && (
              <div className="rx-print-section">
                <div className="rx-print-label">Tests Prescribed:</div>
                <div className="rx-print-text">{savedConsult.tests}</div>
              </div>
            )}

            {/* Next Visit */}
            {(savedConsult.next_visit_num || savedConsult.next_visit_date) && (
              <div className="rx-print-section">
                <div className="rx-print-label">Next Visit:</div>
                <div className="rx-print-text">
                  {savedConsult.next_visit_num
                    ? `${savedConsult.next_visit_num} ${savedConsult.next_visit_unit} (${toDDMMYYYY(calcNextVisitDate(savedConsult.next_visit_num, savedConsult.next_visit_unit))})`
                    : toDDMMYYYY(savedConsult.next_visit_date)}
                </div>
              </div>
            )}

            {/* Footer signature */}
            <div className="rx-print-footer">
              <div className="rx-print-footer-left">
                <div className="rx-print-qr-placeholder">[ MediCard QR ]</div>
                <div className="rx-print-qr-caption">Scan to view digital prescription on MediCard</div>
              </div>
              <div className="rx-print-signature">Dr. {doctor?.full_name || 'MediCard Doctor'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
