import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('medicard_token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // skipAuthRedirect lets a caller (e.g. the silent session check on app
    // load) handle a 401 itself without forcing a hard navigation to
    // /login — that check can run on any public page and shouldn't yank
    // the user away from it just because a stale token expired.
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('medicard_token');
      localStorage.removeItem('medicard_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
