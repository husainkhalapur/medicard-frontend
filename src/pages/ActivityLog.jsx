import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { toDDMMYYYY } from '../utils/dateFormat';
import './ActivityLog.css';

const ACTION_META = {
  view_profile: { icon: 'visibility', label: 'Viewed your profile', tagClass: 'tag-blue' },
  view_records: { icon: 'folder_shared', label: 'Viewed your medical records', tagClass: 'tag-blue' },
  view_prescriptions: { icon: 'medication', label: 'Viewed your prescriptions', tagClass: 'tag-blue' },
  view_consultations: { icon: 'history_edu', label: 'Viewed your consultation history', tagClass: 'tag-blue' },
  add_record: { icon: 'note_add', label: 'Added a medical record', tagClass: 'tag-green' },
  add_prescription: { icon: 'add_circle', label: 'Added a prescription', tagClass: 'tag-green' },
  add_consultation: { icon: 'assignment_turned_in', label: 'Saved a consultation', tagClass: 'tag-green' },
  check_interaction: { icon: 'science', label: 'Checked drug interactions', tagClass: 'tag-orange' },
};

const dateKey = (d) => new Date(d).toISOString().split('T')[0];

const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const detailLine = (action, details) => {
  if (!details) return null;
  switch (action) {
    case 'add_prescription':
      return [details.medicine_name, details.dosage].filter(Boolean).join(' ') +
        (details.frequency ? ` — ${details.frequency}` : '');
    case 'add_record':
      return details.category ? `${details.title} (${details.category})` : details.title;
    case 'check_interaction':
      return `Checked against: ${details.new_medicine}`;
    case 'add_consultation':
      return `${details.medicines_count} medicine${details.medicines_count === 1 ? '' : 's'} prescribed`;
    default:
      return null;
  }
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await API.get('/activity-log');
        setLogs(res.data.logs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const groups = (() => {
    const map = {};
    logs.forEach(l => {
      const key = dateKey(l.created_at);
      if (!map[key]) map[key] = [];
      map[key].push(l);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  return (
    <div className="activitylog-page">
      <Navbar />
      <div className="activitylog-inner">

        <div className="activitylog-header fade-up">
          <div>
            <h1 className="page-title">Activity Log</h1>
            <p className="page-sub">See which doctors have accessed or updated your medical data</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading activity log...</div>
        ) : logs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-icon">history</span>
              <p>No activity yet.</p>
              <span>Once a doctor views or updates your records, it'll show up here.</span>
            </div>
          </div>
        ) : (
          <div className="activitylog-list fade-up fade-up-delay-1">
            {groups.map(([groupDate, entries]) => (
              <div key={groupDate} className="activitylog-group">
                <div className="activitylog-date-header">{toDDMMYYYY(groupDate)}</div>
                <div className="card activitylog-card">
                  {entries.map(l => {
                    const meta = ACTION_META[l.action] || { icon: 'info', label: l.action, tagClass: 'tag-blue' };
                    const detail = detailLine(l.action, l.details);
                    return (
                      <div key={l.id} className="activitylog-row">
                        <div className="activitylog-avatar">{l.doctor_name?.charAt(0).toUpperCase() || '?'}</div>
                        <div className="activitylog-row-info">
                          <div className="activitylog-row-top">
                            <span className="activitylog-doctor">{l.doctor_name || 'Unknown Doctor'}</span>
                            {l.hospital_name && <span className="activitylog-hospital">{l.hospital_name}</span>}
                          </div>
                          <div className="activitylog-action-line">
                            <span className={`tag ${meta.tagClass}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{meta.icon}</span>
                              {meta.label}
                            </span>
                          </div>
                          {detail && <div className="activitylog-detail">{detail}</div>}
                        </div>
                        <div className="activitylog-time">{formatTime(l.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
