import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import './Bills.css';

const CATEGORIES = [
  'Consultation', 'Pharmacy', 'Laboratory',
  'Radiology', 'Surgery', 'Hospitalization', 'Insurance', 'Other'
];

const categoryIcon = (cat) => {
  const map = {
    Consultation: 'stethoscope',
    Pharmacy: 'medication',
    Laboratory: 'science',
    Radiology: 'radiology',
    Surgery: 'surgical',
    Hospitalization: 'local_hospital',
    Insurance: 'shield',
    Other: 'receipt_long',
  };
  return map[cat] || 'receipt_long';
};

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [filter, setFilter] = useState('All');
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    title: '', provider: '', bill_date: '',
    amount: '', category: '', notes: ''
  });

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async () => {
    try {
      const res = await API.get('/bills');
      setBills(res.data.bills);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.title) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (file) formData.append('file', file);

      await API.post('/bills', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Bill added successfully!');
      setForm({ title: '', provider: '', bill_date: '', amount: '', category: '', notes: '' });
      setFile(null);
      setShowForm(false);
      fetchBills();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save bill.');
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const totalSpend = bills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  const filtered = filter === 'All' ? bills : bills.filter(b => b.category === filter);

  return (
    <div className="bills-page">
      <Navbar />
      <div className="bills-inner">

        {/* Header */}
        <div className="bills-header fade-up">
          <div>
            <h1 className="page-title">Medical Bills</h1>
            <p className="page-sub">Upload and manage your medical bills and receipts</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>add</span>
            {showForm ? 'Cancel' : 'Add Bill'}
          </button>
        </div>

        {success && <div className="success-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>check_circle</span>{success}</div>}
        {error && <div className="error-banner fade-up"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>warning</span>{error}</div>}

        {/* Summary Cards */}
        <div className="bills-summary fade-up fade-up-delay-1">
          <div className="summary-card">
            <span className="material-symbols-outlined summary-icon">receipt_long</span>
            <div>
              <div className="summary-val">{bills.length}</div>
              <div className="summary-lbl">Total Bills</div>
            </div>
          </div>
          <div className="summary-card">
            <span className="material-symbols-outlined summary-icon">currency_rupee</span>
            <div>
              <div className="summary-val">{formatAmount(totalSpend) || '₹0'}</div>
              <div className="summary-lbl">Total Spent</div>
            </div>
          </div>
          <div className="summary-card">
            <span className="material-symbols-outlined summary-icon">attach_file</span>
            <div>
              <div className="summary-val">{bills.filter(b => b.file_url).length}</div>
              <div className="summary-lbl">With Attachments</div>
            </div>
          </div>
          <div className="summary-card privacy-card">
            <span className="material-symbols-outlined summary-icon">lock</span>
            <div>
              <div className="summary-val" style={{fontSize:'14px', fontWeight:700}}>Private</div>
              <div className="summary-lbl">Not visible to doctors</div>
            </div>
          </div>
        </div>

        {/* Add Bill Form */}
        {showForm && (
          <div className="card fade-up">
            <h2 className="card-section-title">Add New Bill</h2>
            <div className="bill-form-grid">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" name="title"
                  placeholder="e.g. Apollo Hospital Consultation"
                  value={form.title} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Provider / Hospital</label>
                <input className="form-input" name="provider"
                  placeholder="e.g. Apollo Hospital"
                  value={form.provider} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" name="category" value={form.category} onChange={handleChange}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="form-input" name="amount" type="number"
                  placeholder="e.g. 2500"
                  value={form.amount} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Bill Date</label>
                <input className="form-input" name="bill_date" type="date"
                  value={form.bill_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" name="notes"
                  placeholder="Any additional notes"
                  value={form.notes} onChange={handleChange} />
              </div>
              <div className="form-group bill-form-full">
                <label className="form-label">
                  Attach Bill <span className="field-hint">(PDF, image or receipt)</span>
                </label>
                <div className="file-upload-area" onClick={() => document.getElementById('billFileInput').click()}>
                  {file ? (
                    <span style={{color:'var(--primary)', fontWeight:600, display:'flex', alignItems:'center', gap:'8px'}}>
                      <span className="material-symbols-outlined" style={{fontSize:'18px'}}>attach_file</span>
                      {file.name}
                    </span>
                  ) : (
                    <span style={{display:'flex', alignItems:'center', gap:'8px', justifyContent:'center'}}>
                      <span className="material-symbols-outlined">upload_file</span>
                      Click to upload PDF or image
                    </span>
                  )}
                  <input id="billFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png"
                    style={{display:'none'}} onChange={e => setFile(e.target.files[0])} />
                </div>
              </div>
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'16px'}}>
              <button className="btn-tonal" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : 'Save Bill'}
              </button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bills-filter fade-up fade-up-delay-2">
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}>
              {cat}
            </button>
          ))}
        </div>

        {/* Bills List */}
        {loading ? (
          <div className="loading-state">Loading bills...</div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-icon">receipt_long</span>
              <p>{filter === 'All' ? 'No bills uploaded yet.' : `No ${filter} bills found.`}</p>
              <span>Add your first bill using the button above.</span>
            </div>
          </div>
        ) : (
          <div className="bills-layout fade-up fade-up-delay-3">

            {/* Bills List Panel */}
            <div className="bills-list">
              {filtered.map(bill => (
                <div key={bill.id}
                  className={`bill-item ${selectedBill?.id === bill.id ? 'active' : ''}`}
                  onClick={() => setSelectedBill(bill)}>
                  <div className="bill-item-icon">
                    <span className="material-symbols-outlined">{categoryIcon(bill.category)}</span>
                  </div>
                  <div className="bill-item-info">
                    <div className="bill-item-title">{bill.title}</div>
                    <div className="bill-item-meta">
                      {bill.category || 'Uncategorized'}
                      {bill.provider ? ` · ${bill.provider}` : ''}
                    </div>
                    {bill.bill_date && (
                      <div className="bill-item-date">
                        {new Date(bill.bill_date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                  <div className="bill-item-right">
                    {bill.amount && (
                      <div className="bill-item-amount">{formatAmount(bill.amount)}</div>
                    )}
                    {bill.file_url && (
                      <span className="material-symbols-outlined" style={{fontSize:'16px', color:'var(--outline)'}}>attach_file</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Detail Panel */}
            <div className="card bill-detail">
              {selectedBill ? (
                <>
                  <div className="bill-detail-header">
                    <div className="bill-detail-icon-wrap">
                      <span className="material-symbols-outlined">{categoryIcon(selectedBill.category)}</span>
                    </div>
                    <div>
                      <div className="bill-detail-category">{selectedBill.category || 'Uncategorized'}</div>
                      <h2 className="bill-detail-title">{selectedBill.title}</h2>
                    </div>
                  </div>

                  <div className="bill-detail-meta">
                    {selectedBill.amount && (
                      <div className="bill-meta-item">
                        <div className="bill-meta-label">Amount</div>
                        <div className="bill-meta-val amount-val">{formatAmount(selectedBill.amount)}</div>
                      </div>
                    )}
                    {selectedBill.provider && (
                      <div className="bill-meta-item">
                        <div className="bill-meta-label">Provider</div>
                        <div className="bill-meta-val">{selectedBill.provider}</div>
                      </div>
                    )}
                    {selectedBill.bill_date && (
                      <div className="bill-meta-item">
                        <div className="bill-meta-label">Date</div>
                        <div className="bill-meta-val">
                          {new Date(selectedBill.bill_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                    <div className="bill-meta-item">
                      <div className="bill-meta-label">Added</div>
                      <div className="bill-meta-val">
                        {new Date(selectedBill.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {selectedBill.notes && (
                    <div className="bill-detail-notes">
                      <div className="bill-notes-label">Notes</div>
                      <p>{selectedBill.notes}</p>
                    </div>
                  )}

                  {selectedBill.file_url && (
                    <a href={selectedBill.file_url} target="_blank" rel="noreferrer"
                      className="btn-primary" style={{marginTop:'16px', fontSize:'14px', padding:'10px 22px', display:'inline-flex'}}>
                      <span className="material-symbols-outlined" style={{fontSize:'18px'}}>visibility</span>
                      View Attached Bill
                    </a>
                  )}
                </>
              ) : (
                <div className="empty-state" style={{padding:'48px 0'}}>
                  <span className="material-symbols-outlined empty-icon">touch_app</span>
                  <p>Select a bill to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
