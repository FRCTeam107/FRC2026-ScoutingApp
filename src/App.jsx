import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/common/Header';
import { RoleSelectPage } from './pages/RoleSelectPage';
import { PitScoutPage } from './pages/PitScoutPage';
import { MatchScoutPage } from './pages/MatchScoutPage';
import { ManagerPage } from './pages/ManagerPage';
import { DriveTeamPage } from './pages/DriveTeamPage';
import { FieldDrawPage } from './pages/FieldDrawPage';
import { AdminPage } from './pages/AdminPage';
import './App.css';
import './pinkTheme.css';


function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<RoleSelectPage />} />
            <Route path="/pit" element={<PitScoutPage />} />
            <Route path="/match" element={<MatchScoutPage />} />
            <Route path="/analytics" element={<ManagerPage />} />
            <Route path="/drive" element={<DriveTeamPage />} />
            <Route path="/field" element={<FieldDrawPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
