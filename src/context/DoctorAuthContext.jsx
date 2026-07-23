import { createContext, useContext, useState, useEffect } from 'react';
import DoctorAPI from '../api/doctorAxios';

const DoctorAuthContext = createContext();

export const DoctorAuthProvider = ({ children }) => {
  // Never trust the cached `medicard_doctor` object by itself — see the
  // matching note in AuthContext.jsx. `doctor` starts null and is only
  // populated once the token below is confirmed valid against the server.
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('medicard_doctor_token');
    if (!token) { setLoading(false); return; }

    DoctorAPI.get('/doctors/session', { skipAuthRedirect: true })
      .then(res => setDoctor(res.data.doctor))
      .catch(() => {
        localStorage.removeItem('medicard_doctor_token');
        localStorage.removeItem('medicard_doctor');
        setDoctor(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const doctorLogin = (doctorData, token) => {
    localStorage.setItem('medicard_doctor_token', token);
    localStorage.setItem('medicard_doctor', JSON.stringify(doctorData));
    setDoctor(doctorData);
  };

  const doctorLogout = () => {
    localStorage.removeItem('medicard_doctor_token');
    localStorage.removeItem('medicard_doctor');
    setDoctor(null);
  };

  const updateDoctor = (doctorData) => {
    localStorage.setItem('medicard_doctor', JSON.stringify(doctorData));
    setDoctor(doctorData);
  };

  return (
    <DoctorAuthContext.Provider value={{ doctor, doctorLogin, doctorLogout, updateDoctor, loading }}>
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => useContext(DoctorAuthContext);
