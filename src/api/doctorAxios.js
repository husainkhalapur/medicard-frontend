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
    if (error.response?.status === 401) {
      localStorage.removeItem('medicard_doctor_token');
      localStorage.removeItem('medicard_doctor');
      window.location.href = '/doctor/login';
    }
    return Promise.reject(error);
  }
);

export default DoctorAPI;
