import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import './Reminders.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doseLogs, setDoseLogs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('calendar');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [notifPermission, setNotifPermission] = useState('default');
  const [editingReminder, setEditingReminder] = useState(null);
  const [editTimes, setEditTimes] = useState([]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Check for due reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      reminders.forEach(reminder => {
        if (!reminder.is_active || !reminder.browser_enabled) return;
        reminder.reminder_times?.forEach(slot => {
          const [hours, minutes] = slot.time.split(':').map(Number);
          if (now.getHours() === hours && now.getMinutes() === minutes) {
            if (Notification.permission === 'granted') {
              new Notification(` Time to take ${reminder.medicine_name}`, {
                body: `${reminder.medicine_name} — ${reminder.frequency}`,
                icon: '/favicon.ico'
              });
            }
          }
        });
      });
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

  const fetchAll = useCallback(async () => {
    try {
      const [remRes, prescRes] = await Promise.all([
        API.get('/reminders'),
        API.get('/prescriptions')
      ]);
      setReminders(remRes.data.reminders);
      setPrescriptions(prescRes.data.prescriptions);

      // Generate dose logs for current month
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      await API.post('/reminders/generate-logs', {
        start_date: start.toISOString(),
        end_date: end.toISOString()
      });

      // Fetch logs (only non-superseded)
      const logsRes = await API.get('/reminders/logs', {
        params: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      });
      setDoseLogs(logsRes.data.logs);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Request notification permission
  const requestNotifPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  // Get dose logs for a specific date
  const getLogsForDate = (date) => {
    return doseLogs.filter(log => {
      const logDate = new Date(log.scheduled_time);
      return logDate.getDate() === date.getDate() &&
             logDate.getMonth() === date.getMonth() &&
             logDate.getFullYear() === date.getFullYear();
    });
  };

  // Mark dose as taken
  const markTaken = async (logId) => {
    try {
      await API.put(`/reminders/logs/${logId}/taken`);
      setDoseLogs(prev => prev.map(l =>
        l.id === logId
          ? { ...l, status: 'taken', taken_at: new Date().toISOString() }
          : l
      ));
      showSuccess('Dose marked as taken <span className="material-symbols-outlined" style={{color:"#166534"}}>check_circle</span>');
    } catch (err) {
      showError('Failed to update dose.');
    }
  };

  // Undo taken
  const undoTaken = async (logId) => {
    try {
      await API.put(`/reminders/logs/${logId}/undo`);
      setDoseLogs(prev => prev.map(l =>
        l.id === logId
          ? { ...l, status: 'pending', taken_at: null }
          : l
      ));
    } catch (err) {
      showError('Failed to undo.');
    }
  };

  // Add reminder from prescription
  const addReminder = async (prescription) => {
    try {
      await API.post('/reminders', {
        prescription_id: prescription.id,
        medicine_name: prescription.medicine_name,
        frequency: prescription.frequency,
        email_enabled: true,
        browser_enabled: true
      });
      showSuccess(`Reminder set for ${prescription.medicine_name}`);
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to add reminder.');
    }
  };

  // Toggle reminder on/off
  const toggleReminder = async (reminder) => {
    try {
      await API.put(`/reminders/${reminder.id}`, {
        reminder_times: reminder.reminder_times,
        is_active: !reminder.is_active,
        email_enabled: reminder.email_enabled,
        browser_enabled: reminder.browser_enabled
      });
      setReminders(prev => prev.map(r =>
        r.id === reminder.id ? { ...r, is_active: !r.is_active } : r
      ));
    } catch (err) {
      showError('Failed to toggle reminder.');
    }
  };

  // Save edited reminder times
  const saveEditedTimes = async () => {
    try {
      await API.put(`/reminders/${editingReminder.id}`, {
        reminder_times: editTimes,
        is_active: editingReminder.is_active,
        email_enabled: editingReminder.email_enabled,
        browser_enabled: editingReminder.browser_enabled
      });
      setEditingReminder(null);
      showSuccess('Reminder times updated! Calendar is refreshing...');

      // Small delay then regenerate logs with new times
      setTimeout(() => {
        fetchAll();
      }, 500);
    } catch (err) {
      showError('Failed to save times.');
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getDotColor = (logs) => {
    if (logs.length === 0) return null;
    const allTaken = logs.every(l => l.status === 'taken');
    const anyMissed = logs.some(l => l.status === 'missed');
    const anyPending = logs.some(l => l.status === 'pending');
    if (allTaken) return 'green';
    if (anyMissed && !anyPending) return 'red';
    if (anyPending) return 'yellow';
    return null;
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const selectedDateLogs = getLogsForDate(selectedDate);

  const prescriptionsWithoutReminder = prescriptions.filter(p => {
    const hasReminder = reminders.some(r => r.prescription_id === p.id);
    const isActive = !p.end_date || new Date(p.end_date) >= new Date();
    return !hasReminder && isActive;
  });

  return (
    <div className="reminders-page">
      <Navbar />
      <div className="reminders-inner">

        {/* Header */}
        <div className="reminders-header fade-up">
          <div>
            <h1 className="page-title">Pill Reminders</h1>
            <p className="page-sub">Track your medications and never miss a dose</p>
          </div>
          <div className="header-right">
            {notifPermission !== 'granted' ? (
              <button className="notif-btn" onClick={requestNotifPermission}>
                Enable Notifications
              </button>
            ) : (
              <span className="notif-active">Notifications Active</span>
            )}
          </div>
        </div>

        {success && <div className="success-banner fade-up">{success}</div>}
        {error && <div className="error-banner fade-up">{error}</div>}

        {/* Tabs */}
        <div className="reminder-tabs fade-up fade-up-delay-1">
          <button
            className={`reminder-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}>
            Calendar View
          </button>
          <button
            className={`reminder-tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}>
            Manage Reminders
          </button>
        </div>

        {/* ── CALENDAR TAB ──────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="calendar-layout fade-up fade-up-delay-2">

            {/* Calendar */}
            <div className="card calendar-card">
              <div className="calendar-nav">
                <button className="cal-nav-btn" onClick={prevMonth}>←</button>
                <h2 className="calendar-month">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button className="cal-nav-btn" onClick={nextMonth}>→</button>
              </div>

              <div className="calendar-grid">
                {DAYS.map(d => (
                  <div key={d} className="cal-day-header">{d}</div>
                ))}

                {Array(getFirstDayOfMonth(currentDate)).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} className="cal-day empty" />
                ))}

                {Array(getDaysInMonth(currentDate)).fill(null).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day
                  );
                  const logs = getLogsForDate(date);
                  const dotColor = getDotColor(logs);
                  const isSelected =
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === currentDate.getMonth() &&
                    selectedDate.getFullYear() === currentDate.getFullYear();
                  const isToday =
                    new Date().getDate() === day &&
                    new Date().getMonth() === currentDate.getMonth() &&
                    new Date().getFullYear() === currentDate.getFullYear();

                  return (
                    <div
                      key={day}
                      className={`cal-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${logs.length > 0 ? 'has-logs' : ''}`}
                      onClick={() => setSelectedDate(date)}>
                      <span className="cal-day-num">{day}</span>
                      {dotColor && <div className={`cal-dot ${dotColor}`} />}
                      {logs.length > 0 && (
                        <div className="cal-count">{logs.length}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="cal-legend">
                <div className="legend-item">
                  <div className="cal-dot green" /><span>All taken</span>
                </div>
                <div className="legend-item">
                  <div className="cal-dot yellow" /><span>Upcoming</span>
                </div>
                <div className="legend-item">
                  <div className="cal-dot red" /><span>Missed</span>
                </div>
              </div>
            </div>

            {/* Day Detail */}
            <div className="card day-detail-card">
              <h2 className="day-detail-title">
                {selectedDate.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </h2>

              {selectedDateLogs.length === 0 ? (
                <div className="empty-state" style={{padding:'40px 0'}}>
                  <div className="empty-icon"><span className="material-symbols-outlined">medication</span></div>
                  <p>No doses scheduled</p>
                  <span>No medications due on this day</span>
                </div>
              ) : (
                <div className="dose-list">
                  {selectedDateLogs
                    .sort((a, b) =>
                      new Date(a.scheduled_time) - new Date(b.scheduled_time)
                    )
                    .map(log => {
                      const time = new Date(log.scheduled_time);
                      const timeStr = time.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });

                      return (
                        <div key={log.id} className={`dose-item ${log.status}`}>
                          <div className="dose-status-icon">
                            {log.status === 'taken' ? <><span className="material-symbols-outlined" style={{color:"#166534",fontSize:"18px"}}>check_circle</span></>
                              : log.status === 'missed' ? <><span className="material-symbols-outlined" style={{color:"var(--error)",fontSize:"18px"}}>cancel</span></>
                              : <><span className="material-symbols-outlined" style={{fontSize:"18px"}}>schedule</span></>}
                          </div>
                          <div className="dose-info">
                            <div className="dose-medicine">{log.medicine_name}</div>
                            <div className="dose-time">{timeStr}</div>
                          </div>
                          <div className="dose-actions">
                            {log.status === 'taken' ? (
                              <button
                                className="dose-undo-btn"
                                onClick={() => undoTaken(log.id)}>
                                Undo
                              </button>
                            ) : log.status === 'pending' ? (
                              <button
                                className="dose-take-btn"
                                onClick={() => markTaken(log.id)}>
                                Mark Taken
                              </button>
                            ) : (
                              <span className="dose-missed-label">Missed</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MANAGE TAB ────────────────────────────────────── */}
        {activeTab === 'manage' && (
          <div className="manage-layout fade-up fade-up-delay-2">

            {/* Active Reminders */}
            <div className="manage-section">
              <h2 className="manage-section-title"><span className="material-symbols-outlined">alarm</span> Active Reminders</h2>

              {reminders.length === 0 ? (
                <div className="card">
                  <div className="empty-state" style={{padding:'40px 0'}}>
                    <div className="empty-icon"><span className="material-symbols-outlined">alarm</span></div>
                    <p>No reminders set yet.</p>
                    <span>Add reminders from your prescriptions below.</span>
                  </div>
                </div>
              ) : (
                <div className="reminders-list">
                  {reminders.map(reminder => (
                    <div
                      key={reminder.id}
                      className={`reminder-card ${!reminder.is_active ? 'inactive' : ''}`}>

                      <div className="reminder-card-header">
                        <div>
                          <div className="reminder-medicine">{reminder.medicine_name}</div>
                          <div className="reminder-frequency">{reminder.frequency}</div>
                        </div>
                        <button
                          className={`toggle-btn ${reminder.is_active ? 'on' : 'off'}`}
                          onClick={() => toggleReminder(reminder)}>
                          {reminder.is_active ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Time Slots — Edit Mode */}
                      {editingReminder?.id === reminder.id ? (
                        <div className="edit-times">
                          {editTimes.map((slot, idx) => (
                            <div key={idx} className="edit-time-row">
                              <span className="edit-time-label">{slot.label}</span>
                              <input
                                type="time"
                                className="time-input"
                                value={slot.time}
                                onChange={e => {
                                  const updated = [...editTimes];
                                  updated[idx] = { ...updated[idx], time: e.target.value };
                                  setEditTimes(updated);
                                }}
                              />
                            </div>
                          ))}
                          <div className="edit-time-actions">
                            <button
                              className="btn-outline"
                              style={{fontSize:'13px', padding:'7px 16px'}}
                              onClick={() => setEditingReminder(null)}>
                              Cancel
                            </button>
                            <button
                              className="btn-primary"
                              style={{fontSize:'13px', padding:'7px 16px'}}
                              onClick={saveEditedTimes}>
                              Save Times
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Time Slots — View Mode */
                        <div className="time-slots">
                          {reminder.reminder_times?.map((slot, idx) => (
                            <div key={idx} className="time-slot">
                              <span className="slot-label">{slot.label}</span>
                              <span className="slot-time">{formatTime(slot.time)}</span>
                            </div>
                          ))}
                          <button
                            className="edit-times-btn"
                            onClick={() => {
                              setEditingReminder(reminder);
                              setEditTimes([...reminder.reminder_times]);
                            }}>
                            Edit Times
                          </button>
                        </div>
                      )}

                      {/* Notification Toggles */}
                      <div className="notif-toggles">
                        <label className="notif-toggle">
                          <input
                            type="checkbox"
                            checked={reminder.email_enabled}
                            onChange={async () => {
                              try {
                                await API.put(`/reminders/${reminder.id}`, {
                                  reminder_times: reminder.reminder_times,
                                  is_active: reminder.is_active,
                                  email_enabled: !reminder.email_enabled,
                                  browser_enabled: reminder.browser_enabled
                                });
                                setReminders(prev => prev.map(r =>
                                  r.id === reminder.id
                                    ? { ...r, email_enabled: !r.email_enabled }
                                    : r
                                ));
                              } catch (err) {
                                showError('Failed to update email setting.');
                              }
                            }}
                          />
                          Email reminders
                        </label>
                        <label className="notif-toggle">
                          <input
                            type="checkbox"
                            checked={reminder.browser_enabled}
                            onChange={async () => {
                              try {
                                await API.put(`/reminders/${reminder.id}`, {
                                  reminder_times: reminder.reminder_times,
                                  is_active: reminder.is_active,
                                  email_enabled: reminder.email_enabled,
                                  browser_enabled: !reminder.browser_enabled
                                });
                                setReminders(prev => prev.map(r =>
                                  r.id === reminder.id
                                    ? { ...r, browser_enabled: !r.browser_enabled }
                                    : r
                                ));
                              } catch (err) {
                                showError('Failed to update browser setting.');
                              }
                            }}
                          />
                          Browser notifications
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Reminders from Prescriptions */}
            {prescriptionsWithoutReminder.length > 0 && (
              <div className="manage-section">
                <h2 className="manage-section-title">
                  Add Reminders for Your Prescriptions
                </h2>
                <div className="add-reminder-list">
                  {prescriptionsWithoutReminder.map(p => (
                    <div key={p.id} className="add-reminder-row">
                      <div className="add-reminder-info">
                        <div className="add-reminder-name">{p.medicine_name}</div>
                        <div className="add-reminder-meta">
                          {p.dosage} · {p.frequency}
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        style={{fontSize:'13px', padding:'8px 20px'}}
                        onClick={() => addReminder(p)}>
                        + Set Reminder
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
