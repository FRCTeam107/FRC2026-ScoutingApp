import { useState } from 'react';
import { MatchScoutForm } from '../components/match/MatchScoutForm';
import { getMatchRecords } from '../lib/storage';
import './MatchScoutPage.css';

export function MatchScoutPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSave = () => {
    setRefreshKey(k => k + 1);
  };

  const records = getMatchRecords();
  const recentRecords = records.slice(-5).reverse();

  return (
    <div className="match-scout-page">
      <div className="page-header">
        <h1>Match Scouting</h1>
        <p>Track robot performance during matches</p>
      </div>

      <div className="page-content">
        <MatchScoutForm onSave={handleSave} />

        {recentRecords.length > 0 && (
          <div className="recent-matches" key={refreshKey}>
            <h3>Recent Records</h3>
            <div className="records-list">
              {recentRecords.map((record, idx) => (
                <div key={idx} className="record-item">
                  <span className="record-team">#{record.teamNumber}</span>
                  <span className="record-match">Match {record.matchNumber}</span>
                  <span className={`record-alliance ${record.allianceColor}`}>
                    {record.allianceColor}
                  </span>
                  <span className="record-fuel">
                    {((record.autoFiringSeconds + record.teleopFiringSeconds) || 0).toFixed(1)}s firing
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
