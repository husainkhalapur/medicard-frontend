import { createContext, useContext, useState } from 'react';

const DoctorAuthContext = createContext();

export const DoctorAuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(
    JSON.parse(localStorage.getItem('medicard_doctor')) || null
  );

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
    <DoctorAuthContext.Provider value={{ doctor, doctorLogin, doctorLogout, updateDoctor }}>
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => useContext(DoctorAuthContext);
