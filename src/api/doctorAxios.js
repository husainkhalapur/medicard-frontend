import axios from 'axios';

const DoctorAPI = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

DoctorAPI.interceptors.request.use((req) => {
  const token = localStorage.getItem('medicard_doctor_token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

DoctorAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    // skipAuthRedirect lets a caller (e.g. the silent session check on app
    // load) handle a 401 itself without forcing a hard navigation to
    // /doctor/login — that check can run on any public page and shouldn't
    // yank the doctor away from it just because a stale token expired.
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('medicard_doctor_token');
      localStorage.removeItem('medicard_doctor');
      window.location.href = '/doctor/login';
    }
    return Promise.reject(error);
  }
);

export default DoctorAPI;
