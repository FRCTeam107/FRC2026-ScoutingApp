import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from './components/common/Header';
import { RoleSelectPage } from './pages/RoleSelectPage';
import { PitScoutPage } from './pages/PitScoutPage';
import { MatchScoutPage } from './pages/MatchScoutPage';
import { ManagerPage } from './pages/ManagerPage';
import { DriveTeamPage } from './pages/DriveTeamPage';
import { FieldDrawPage } from './pages/FieldDrawPage';
import { AdminPage } from './pages/AdminPage';
import { FanPage } from './pages/FanPage';
import { PasswordModal } from './components/common/PasswordModal';
import { verifyScoutingPassword } from './lib/supabase';
import './App.css';
import './pinkTheme.css';

const SESSION_KEY = 'scouting_auth';

function ProtectedScoutingRoute({ children }) {
  const location = useLocation();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [showModal, setShowModal] = useState(!authed);

  const handleSuccess = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setAuthed(true);
    setShowModal(false);
  }, []);

  if (authed) return children;

  return (
    <>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <p style={{ fontSize: 15 }}>Scouting access required</p>
          <button
            onClick={() => setShowModal(true)}
            style={{ marginTop: 12, padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Enter Password
          </button>
        </div>
      </div>
      <PasswordModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        title="Scouting Access"
        verifyFn={verifyScoutingPassword}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            {/* Public */}
            <Route path="/" element={<FanPage />} />
            <Route path="/fan" element={<Navigate to="/" replace />} />
            {/* Scouting — password protected */}
            <Route path="/scouting" element={<ProtectedScoutingRoute><RoleSelectPage /></ProtectedScoutingRoute>} />
            <Route path="/pit"      element={<ProtectedScoutingRoute><PitScoutPage /></ProtectedScoutingRoute>} />
            <Route path="/match"    element={<ProtectedScoutingRoute><MatchScoutPage /></ProtectedScoutingRoute>} />
            <Route path="/analytics" element={<ProtectedScoutingRoute><ManagerPage /></ProtectedScoutingRoute>} />
            <Route path="/drive"    element={<ProtectedScoutingRoute><DriveTeamPage /></ProtectedScoutingRoute>} />
            <Route path="/field"    element={<ProtectedScoutingRoute><FieldDrawPage /></ProtectedScoutingRoute>} />
            <Route path="/admin"    element={<ProtectedScoutingRoute><AdminPage /></ProtectedScoutingRoute>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
