// Mirrors medicard-backend/utils/slotTime.js — the whole app assumes a
// single fixed clinic timezone (IST, UTC+5:30), so appointment slot times
// and payment/cancellation deadlines can be computed/displayed consistently
// regardless of which timezone the patient's or doctor's browser is in.
const IST_OFFSET_MINUTES = 330;

export function slotToMinutes(timeStr) {
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

// dateStr: 'YYYY-MM-DD', timeStr: "09:00 AM" — returns the real UTC instant.
export function computeSlotDatetime(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const minutes = slotToMinutes(timeStr);
  const h = Math.floor(minutes / 60);
  const mi = minutes % 60;
  const utcMs = Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MINUTES * 60000;
  return new Date(utcMs);
}

// Display helper: "Fri, 24 Mar, 8:00 PM"
export function formatIst(date) {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// Live "Xh Ym" / "Ym" countdown string; null once the deadline has passed.
export function formatCountdown(deadline, now = new Date()) {
  const ms = new Date(deadline).getTime() - now.getTime();
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// Pure time-of-day string conversions (no timezone involved) — for binding
// a doctor's available_start_time/available_end_time ("hh:mm AM/PM", as
// stored/returned by the backend) to a native <input type="time">, which
// works in 24-hour "HH:MM".
export function to24Hour(label12h) {
  const minutes = slotToMinutes(label12h);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function to12Hour(value24h) {
  let [h, m] = value24h.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}
