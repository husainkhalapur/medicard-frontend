import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DoctorNavbar from '../components/DoctorNavbar';
import DoctorAPI from '../api/doctorAxios';
import './DoctorPatientView.css';

const CATEGORIES = ['General', 'Cardiology', 'Orthopedic', 'Neurology', 'Dermatology', 'Ophthalmology', 'Dental', 'Radiology', 'Pathology', 'Other'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Weekly', 'As needed'];

export default function DoctorPatientView() {
  const { uniqueId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Record form
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({
    title: '', category: '', doctor_name: '', visit_date: '', notes: ''
  });
  const [recordFile, setRecordFile] = useState(null);

  // Prescription form
  const [showPrescForm, setShowPrescForm] = useState(false);
  const [savingPresc, setSavingPresc] = useState(false);
  const [prescForm, setPrescForm] = useState({
    medicine_name: '', dosage: '', frequency: '', start_date: '', end_date: ''
  });
  const [checkingInteraction, setCheckingInteraction] = useState(false);
  const [interactionResult, setInteractionResult] = useState(null);
  const [interactionAcknowledged, setInteractionAcknowledged] = useState(false);

  const fetchAll = useCallback () => {
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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Add Record
  const handleAddRecord = async () => {
    if (!recordForm.title || !recordForm.category) {
      setError('Title and category are required.');
      return;
    }
    setSavingRecord(true);
    setError('');
    try {
      const formData = new FormData();
      Object.entries(recordForm).forEach(([k, v]) => formData.append(k, v));
      if (recordFile) formData.append('file', recordFile);

      await DoctorAPI.post(`/doctor/patient/${uniqueId}/records`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setRecordForm({ title: '', category: '', doctor_name: '', visit_date: '', notes: '' });
      setRecordFile(null);
      setShowRecordForm(false);
      showSuccess('Record added successfully!');

      const res = await DoctorAPI.get(`/doctor/patient/${uniqueId}/records`);
      setRecords(res.data.records);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add record.');
    } finally {
      setSavingRecord(false);
    }
  };

  // Check drug interactions
  const checkInteraction = async () => {
    if (!prescForm.medicine_name) {
      setError('Please enter a medicine name first.');
      return;
    }
    setCheckingInteraction(true);
    setInteractionResult(null);
    setInteractionAcknowledged(false);
    try {
      const res = await DoctorAPI.post(`/doctor/patient/${uniqueId}/check-interaction`, {
        new_medicine: prescForm.medicine_name
      });
      setInteractionResult(res.data);
    } catch (err) {
      setError('Could not check interactions. You may proceed with caution.');
    } finally {
      setCheckingInteraction(false);
    }
  };

  // Add Prescription
  const handleAddPresc = async () => {
    if (!prescForm.medicine_name || !prescForm.dosage || !prescForm.frequency) {
      setError('Medicine name, dosage and frequency are required.');
      return;
    }
    setSavingPresc(true);
    setError('');
    try {
      // Build interaction warning string if interactions were found and acknowledged
      let interactionWarning = null;
      if (interactionResult?.has_interaction && interactionAcknowledged) {
        interactionWarning = interactionResult.summary;
      }

      await DoctorAPI.post(`/doctor/patient/${uniqueId}/prescriptions`, {
        ...prescForm,
        interaction_warning: interactionWarning
      });
      setPrescForm({ medicine_name: '', dosage: '', frequency: '', start_date: '', end_date: '' });
      setInteractionResult(null);
      setInteractionAcknowledged(false);
      setShowPrescForm(false);
      showSuccess('Prescription added successfully!');

      const res = await DoctorAPI.get(`/doctor/patient/${uniqueId}/prescriptions`);
      setPrescriptions(res.data.prescriptions);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add prescription.');
    } finally {
      setSavingPresc(false);
    }
  };

  const tags = (arr) => arr?.filter(Boolean) || [];

  if (loading) return (
    <div className="dpv-page">
      <DoctorNavbar />
      <div className="loading-state" style={{height:'60vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--grey-400)'}}>
        Loading patient data...
      </div>
    </div>
  );

  if (notFound) return (
    <div className="dpv-page">
      <DoctorNavbar />
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:'16px'}}>
        <div style={{fontSize:'48px'}}><span className="material-symbols-outlined">search</span></div>
        <h2 style={{color:'var(--green-deep)'}}>Patient Not Found</h2>
        <p style={{color:'var(--grey-400)'}}>No patient found with ID: {uniqueId}</p>
        <button className="btn-primary" onClick={() => navigate('/doctor/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="dpv-page">
      <DoctorNavbar />
      <div className="dpv-inner">

        {/* Back + Header */}
        <div className="dpv-top fade-up">
          <button className="back-btn" onClick={() => navigate('/doctor/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {success && <div className="success-banner fade-up">{success}</div>}
        {error && <div className="error-banner fade-up">{error}</div>}

        {/* Patient Identity Card */}
        <div className="dpv-identity-card fade-up">
          <div className="dpv-avatar">{patient?.full_name?.charAt(0).toUpperCase()}</div>
          <div className="dpv-identity-info">
            <h1 className="dpv-name">{patient?.full_name}</h1>
            <div className="dpv-meta-row">
              <span className="dpv-id">🪪 {patient?.unique_id}</span>
              {patient?.blood_group && (
                <span className="badge badge-green">🩸 {patient?.blood_group}</span>
              )}
              {patient?.date_of_birth && (
                <span className="dpv-dob">
                  <span className="material-symbols-outlined">calendar_today</span> {new Date(patient.date_of_birth).toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'})}
                </span>
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
            { id: 'records', label: ` Records (${records.length})` },
            { id: 'prescriptions', label: ` Prescriptions (${prescriptions.length})` },
          ].map(tab => (
            <button key={tab.id}
              className={`dpv-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setShowRecordForm(false); setShowPrescForm(false); setError(''); }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
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
                    <div style={{fontSize:'16px', fontWeight:'600', marginBottom:'8px'}}>{patient.emergency_contact_name}</div>
                    {patient?.emergency_contact_phone && (
                      <a href={`tel:${patient.emergency_contact_phone}`} className="btn-primary"
                        style={{fontSize:'14px', padding:'9px 20px'}}>
                        <span className="material-symbols-outlined">call</span> {patient.emergency_contact_phone}
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="not-set">No emergency contact recorded</span>
                )}
              </div>

              {patient?.first_aid_notes && (
                <div className="card dpv-notes-card">
                  <h2 className="card-section-title">First Aid Notes</h2>
                  <p style={{fontSize:'15px', color:'var(--grey-700)', lineHeight:'1.7'}}>{patient.first_aid_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <div className="dpv-tab-content fade-up">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h2 className="page-title" style={{fontSize:'22px'}}>Medical Records</h2>
              <button className="dpv-add-btn" onClick={() => { setShowRecordForm(!showRecordForm); setError(''); }}>
                {showRecordForm ? 'Cancel' : 'Add Record'}
              </button>
            </div>

            {showRecordForm && (
              <div className="card dpv-form fade-up">
                <h3 className="card-section-title">Add New Record</h3>
                <div className="dpv-form-grid">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-input" placeholder="e.g. ECG Report"
                      value={recordForm.title} onChange={e => setRecordForm({...recordForm, title: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-input" value={recordForm.category}
                      onChange={e => setRecordForm({...recordForm, category: e.target.value})}>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor Name</label>
                    <input className="form-input" placeholder="Your name"
                      value={recordForm.doctor_name} onChange={e => setRecordForm({...recordForm, doctor_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Visit Date</label>
                    <input className="form-input" type="date"
                      value={recordForm.visit_date} onChange={e => setRecordForm({...recordForm, visit_date: e.target.value})} />
                  </div>
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <label className="form-label">Notes / Diagnosis</label>
                    <textarea className="form-input" rows={3} style={{resize:'vertical'}}
                      placeholder="Diagnosis, observations, recommendations..."
                      value={recordForm.notes} onChange={e => setRecordForm({...recordForm, notes: e.target.value})} />
                  </div>
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <label className="form-label">Attach File <span className="field-hint">(PDF or image)</span></label>
                    <div className="file-upload-area" onClick={() => document.getElementById('drFileInput').click()}>
                      {recordFile ? <span style={{color:'var(--green-mid)', fontWeight:'500'}}>{recordFile.name}</span>
                        : <span>Click to upload PDF or image</span>}
                      <input id="drFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png"
                        style={{display:'none'}} onChange={e => setRecordFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>
                <div style={{display:'flex', gap:'10px', marginTop:'8px'}}>
                  <button className="btn-outline" onClick={() => setShowRecordForm(false)}>Cancel</button>
                  <button className="dpv-add-btn" onClick={handleAddRecord} disabled={savingRecord}>
                    {savingRecord ? <><span className="spinner" style={{borderTopColor:'white'}} /> Saving...</> : 'Save Record'}
                  </button>
                </div>
              </div>
            )}

            {records.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon"><span className="material-symbols-outlined">assignment</span></div>
                <p>No records found for this patient.</p>
                <span>Add the first record using the button above.</span>
              </div></div>
            ) : (
              <div className="dpv-records-list">
                {records.map(r => (
                  <div key={r.id} className="dpv-record-card">
                    <div className="dpv-record-header">
                      <div>
                        <div className="dpv-record-category">{r.category}</div>
                        <div className="dpv-record-title">{r.title}</div>
                      </div>
                      <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                        {r.uploaded_by === 'doctor' && (
                          <span className="badge badge-blue" style={{fontSize:'11px'}}>‍ Doctor</span>
                        )}
                        {r.uploaded_by === 'patient' && (
                          <span className="badge badge-green" style={{fontSize:'11px'}}>Patient</span>
                        )}
                      </div>
                    </div>
                    <div className="dpv-record-meta">
                      {r.doctor_name && <span>‍ Dr. {r.doctor_name}</span>}
                      {r.visit_date && <span><span className="material-symbols-outlined">calendar_today</span> {new Date(r.visit_date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>}
                    </div>
                    {r.notes && <p className="dpv-record-notes">{r.notes}</p>}
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noreferrer"
                        className="btn-outline" style={{fontSize:'13px', padding:'7px 16px', marginTop:'8px', display:'inline-flex'}}>
                        View Attached File
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="dpv-tab-content fade-up">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h2 className="page-title" style={{fontSize:'22px'}}>Prescriptions</h2>
              <button className="dpv-add-btn" onClick={() => { setShowPrescForm(!showPrescForm); setError(''); }}>
                {showPrescForm ? 'Cancel' : 'Add Prescription'}
              </button>
            </div>

            {showPrescForm && (
              <div className="card dpv-form fade-up">
                <h3 className="card-section-title">Add New Prescription</h3>
                <div className="dpv-form-grid">
                  <div className="form-group">
                    <label className="form-label">Medicine Name *</label>
                    <input className="form-input" placeholder="e.g. Metoprolol"
                      value={prescForm.medicine_name} onChange={e => setPrescForm({...prescForm, medicine_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage *</label>
                    <input className="form-input" placeholder="e.g. 25mg"
                      value={prescForm.dosage} onChange={e => setPrescForm({...prescForm, dosage: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Frequency *</label>
                    <select className="form-input" value={prescForm.frequency}
                      onChange={e => setPrescForm({...prescForm, frequency: e.target.value})}>
                      <option value="">Select frequency</option>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date"
                      value={prescForm.start_date} onChange={e => setPrescForm({...prescForm, start_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date"
                      value={prescForm.end_date} onChange={e => setPrescForm({...prescForm, end_date: e.target.value})} />
                  </div>
                </div>
                <div className="interaction-checker">
                  <button
                    type="button"
                    className="check-interaction-btn"
                    onClick={checkInteraction}
                    disabled={checkingInteraction || !prescForm.medicine_name}>
                    {checkingInteraction
                      ? <><span className="spinner" style={{borderTopColor:'#7e22ce'}} /> Checking...</>
                      : 'Check Drug Interactions'}
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
                            <input type="checkbox" checked={interactionAcknowledged}
                              onChange={e => setInteractionAcknowledged(e.target.checked)} />
                            I have reviewed the interactions and acknowledge the risks
                          </label>
                        </>
                      ) : (
                        <div className="no-interaction-msg">No significant drug interactions detected</div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{display:'flex', gap:'10px', marginTop:'8px'}}>
                  <button className="btn-outline" onClick={() => { setShowPrescForm(false); setInteractionResult(null); setInteractionAcknowledged(false); }}>Cancel</button>
                  <button className="dpv-add-btn" onClick={handleAddPresc}
                    disabled={savingPresc || (interactionResult?.has_interaction && !interactionAcknowledged)}>
                    {savingPresc ? <><span className="spinner" style={{borderTopColor:'white'}} /> Saving...</>
                      : interactionResult?.has_interaction && !interactionAcknowledged
                      ? 'Acknowledge to proceed' : 'Save Prescription'}
                  </button>
                </div>
              </div>
            )}

            {prescriptions.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon"><span className="material-symbols-outlined">medication</span></div>
                <p>No prescriptions found for this patient.</p>
                <span>Add the first prescription using the button above.</span>
              </div></div>
            ) : (
              <div className="dpv-presc-grid">
                {prescriptions.map(p => (
                  <div key={p.id} className="dpv-presc-card">
                    <div className="dpv-presc-name">{p.medicine_name}</div>
                    <div className="dpv-presc-dosage">{p.dosage}</div>
                    <div className="dpv-presc-meta">
                      <div><span className="material-symbols-outlined">alarm</span> {p.frequency}</div>
                      {p.prescribed_by && <div>‍ Dr. {p.prescribed_by}</div>}
                      {p.start_date && <div>{new Date(p.start_date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</div>}
                      {p.end_date && <div>{new Date(p.end_date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
