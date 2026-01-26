import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/common/Header';
import { RoleSelectPage } from './pages/RoleSelectPage';
import { PitScoutPage } from './pages/PitScoutPage';
import { MatchScoutPage } from './pages/MatchScoutPage';
import { ManagerPage } from './pages/ManagerPage';
import './App.css';


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
            <Route path="/manager" element={<ManagerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
