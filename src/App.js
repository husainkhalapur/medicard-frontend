import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DoctorAuthProvider, useDoctorAuth } from './context/DoctorAuthContext';

// Doctor pages
import DoctorRegister from './pages/DoctorRegister';
import DoctorLogin from './pages/DoctorLogin';
import DoctorPending from './pages/DoctorPending';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatientView from './pages/DoctorPatientView';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EmergencyProfile from './pages/EmergencyProfile';
import EmergencyPublic from './pages/EmergencyPublic';
import MedicalRecords from './pages/MedicalRecords';
import Prescriptions from './pages/Prescriptions';
import './styles/global.css';

// Patient route guards
function PatientProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PatientPublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// Doctor route guards
function DoctorProtectedRoute({ children }) {
  const { doctor } = useDoctorAuth();
  if (!doctor) return <Navigate to="/doctor/login" replace />;
  if (doctor.verification_status === 'pending')
    return <Navigate to="/doctor/pending" replace />;
  return children;
}

function DoctorPublicRoute({ children }) {
  const { doctor } = useDoctorAuth();
  if (doctor && doctor.verification_status === 'verified')
    return <Navigate to="/doctor/dashboard" replace />;
  return children;
}

function DoctorPendingRoute({ children }) {
  const { doctor } = useDoctorAuth();
  if (!doctor) return <Navigate to="/doctor/login" replace />;
  if (doctor.verification_status === 'verified')
    return <Navigate to="/doctor/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />

      {/* Patient Auth */}
      <Route path="/register" element={
        <PatientPublicRoute><Register /></PatientPublicRoute>
      } />
      <Route path="/login" element={
        <PatientPublicRoute><Login /></PatientPublicRoute>
      } />

      {/* Patient Protected */}
      <Route path="/dashboard" element={
        <PatientProtectedRoute><Dashboard /></PatientProtectedRoute>
      } />
      <Route path="/profile" element={
        <PatientProtectedRoute><Profile /></PatientProtectedRoute>
      } />
      <Route path="/emergency-profile" element={
        <PatientProtectedRoute><EmergencyProfile /></PatientProtectedRoute>
      } />
      <Route path="/medical-records" element={
        <PatientProtectedRoute><MedicalRecords /></PatientProtectedRoute>
      } />
      <Route path="/prescriptions" element={
        <PatientProtectedRoute><Prescriptions /></PatientProtectedRoute>
      } />
      <Route path="/reminders" element={
        <PatientProtectedRoute><Reminders /></PatientProtectedRoute>
      } />
      <Route path="/bills" element={
        <PatientProtectedRoute><Bills /></PatientProtectedRoute>
      } />

      {/* Emergency Public — no login needed */}
      <Route path="/emergency/:uniqueId" element={<EmergencyPublic />} />

      {/* Doctor Auth */}
      <Route path="/doctor/register" element={
        <DoctorPublicRoute><DoctorRegister /></DoctorPublicRoute>
      } />
      <Route path="/doctor/login" element={
        <DoctorPublicRoute><DoctorLogin /></DoctorPublicRoute>
      } />
      <Route path="/reminders" element={
        <PatientProtectedRoute><Reminders /></PatientProtectedRoute>
      } />

      {/* Doctor Pending */}
      <Route path="/doctor/pending" element={
        <DoctorPendingRoute><DoctorPending /></DoctorPendingRoute>
      } />

      {/* Doctor Protected */}
      <Route path="/doctor/dashboard" element={
        <DoctorProtectedRoute><DoctorDashboard /></DoctorProtectedRoute>
      } />
      <Route path="/doctor/patient/:uniqueId" element={
        <DoctorProtectedRoute><DoctorPatientView /></DoctorProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DoctorAuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DoctorAuthProvider>
    </AuthProvider>
  );
}

export default App;
