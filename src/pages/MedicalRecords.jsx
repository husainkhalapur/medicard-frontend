import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import './MedicalRecords.css';

const CATEGORIES = ['General', 'Cardiology', 'Orthopedic', 'Neurology', 'Dermatology', 'Ophthalmology', 'Dental', 'Radiology', 'Pathology', 'Other'];

export default function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [form, setForm] = useState({
    title: '', category: '', doctor_name: '', visit_date: '', notes: ''
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await API.get('/records');
      setRecords(res.data.records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.title || !form.category) {
      setError('Title and category are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (file) formData.append('file', file);

      await API.post('/records', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Record added successfully!');
      setForm({ title: '', category: '', doctor_name: '', visit_date: '', notes: '' });
      setFile(null);
      setShowForm(false);
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };



  const filtered = filter === 'All' ? records : records.filter(r => r.category === filter);

  const categoryIcon = (cat) => {
    const map = {
      General:      <span className="material-symbols-outlined">local_hospital</span>,
      Cardiology:   <span className="material-symbols-outlined">favorite</span>,
      Orthopedic:   <span className="material-symbols-outlined">orthopedics</span>,
      Neurology:    <span className="material-symbols-outlined">neurology</span>,
      Dermatology:  <span className="material-symbols-outlined">dermatology</span>,
      Ophthalmology:<span className="material-symbols-outlined">visibility</span>,
      Dental:       <span className="material-symbols-outlined">dentistry</span>,
      Radiology:    <span className="material-symbols-outlined">biotech</span>,
      Pathology:    <span className="material-symbols-outlined">science</span>,
      Other:        <span className="material-symbols-outlined">description</span>,
    };
    return map[cat] || <><span className="material-symbols-outlined">description</span></>;
  };

  return (
    <div className="records-page">
      <Navbar />
      <div className="records-inner">

        <div className="records-header fade-up">
          <div>
            <h1 className="page-title">Medical Records</h1>
            <p className="page-sub">Upload and manage all your medical reports, diagnoses and doctor notes</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
            {showForm ? 'Cancel' : 'Add Record'}
          </button>
        </div>

        {success && <div className="success-banner fade-up">{success}</div>}
        {error && <div className="error-banner fade-up">{error}</div>}

        {showForm && (
          <div className="card add-record-form fade-up">
            <h2 className="card-section-title">Add New Record</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" name="title" placeholder="e.g. Annual Blood Test Results"
                  value={form.title} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input" name="category" value={form.category} onChange={handleChange}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Doctor Name</label>
                <input className="form-input" name="doctor_name" placeholder="Dr. Sharma"
                  value={form.doctor_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Visit Date</label>
                <input className="form-input" name="visit_date" type="date"
                  value={form.visit_date} onChange={handleChange} />
              </div>
              <div className="form-group form-full">
                <label className="form-label">Notes</label>
                <textarea className="form-input" name="notes" rows={3}
                  placeholder="Doctor's notes, diagnosis summary, observations..."
                  value={form.notes} onChange={handleChange} style={{resize:'vertical'}} />
              </div>
              <div className="form-group form-full">
                <label className="form-label">Attach File <span className="field-hint">(PDF or image)</span></label>
                <div className="file-upload-area" onClick={() => document.getElementById('fileInput').click()}>
                  {file ? (
                    <span className="file-selected">{file.name}</span>
                  ) : (
                    <span><span className="material-symbols-outlined">folder</span> Click to upload PDF or image</span>
                  )}
                  <input id="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png"
                    style={{display:'none'}} onChange={(e) => setFile(e.target.files[0])} />
                </div>
              </div>
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'8px'}}>
              <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : 'Save Record'}
              </button>
            </div>
          </div>
        )}

        <div className="records-filter fade-up fade-up-delay-1">
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">Loading records...</div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><span className="material-symbols-outlined">assignment</span></div>
              <p>{filter === 'All' ? 'No medical records yet.' : `No ${filter} records found.`}</p>
              <span>Add your first record using the button above.</span>
            </div>
          </div>
        ) : (
          <div className="records-layout fade-up fade-up-delay-2">
            <div className="records-list">
              {filtered.map(record => (
                <div key={record.id}
                  className={`record-item ${selectedRecord?.id === record.id ? 'active' : ''}`}
                  onClick={() => setSelectedRecord(record)}>
                  <div className="record-item-icon">{categoryIcon(record.category)}</div>
                  <div className="record-item-info">
                    <div className="record-item-title">{record.title}</div>
                    <div className="record-item-meta">
                      {record.category} {record.doctor_name && `· Dr. ${record.doctor_name}`}
                    </div>
                    {record.visit_date && (
                      <div className="record-item-date">
                        {new Date(record.visit_date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}
                      </div>
                    )}
                  </div>
                  {record.file_url && <div className="record-has-file" title="Has attachment"><span className="material-symbols-outlined">attach_file</span></div>}
                </div>
              ))}
            </div>

            <div className="record-detail card">
              {selectedRecord ? (
                <>
                  <div className="detail-header">
                    <div>
                      <div className="detail-category">
                        {categoryIcon(selectedRecord.category)} {selectedRecord.category}
                      </div>
                      <h2 className="detail-title">{selectedRecord.title}</h2>
                    </div>

                  </div>

                  <div className="detail-meta-row">
                    {selectedRecord.doctor_name && (
                      <div className="detail-meta-item">
                        <span className="meta-label">Doctor</span>
                        <span className="meta-value">Dr. {selectedRecord.doctor_name}</span>
                      </div>
                    )}
                    {selectedRecord.visit_date && (
                      <div className="detail-meta-item">
                        <span className="meta-label">Date</span>
                        <span className="meta-value">
                          {new Date(selectedRecord.visit_date).toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'})}
                        </span>
                      </div>
                    )}
                    <div className="detail-meta-item">
                      <span className="meta-label">Added</span>
                      <span className="meta-value">
                        {new Date(selectedRecord.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}
                      </span>
                    </div>
                  </div>

                  {selectedRecord.notes && (
                    <div className="detail-notes">
                      <div className="detail-notes-label">Notes</div>
                      <p>{selectedRecord.notes}</p>
                    </div>
                  )}

                  {selectedRecord.file_url && (
                    <a href={selectedRecord.file_url} target="_blank" rel="noreferrer"
                      className="btn-outline" style={{marginTop:'16px', fontSize:'14px', padding:'10px 20px'}}>
                      View Attached File
                    </a>
                  )}
                </>
              ) : (
                <div className="empty-state" style={{padding:'48px 0'}}>
                  <div className="empty-icon"><span className="material-symbols-outlined">arrow_back</span></div>
                  <p>Select a record to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
