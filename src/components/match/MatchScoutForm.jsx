import { useState } from 'react';
import { FiringButton } from './FiringButton';
import { AccuracySlider } from './AccuracySlider';
import { ClimbSelector } from './ClimbSelector';
import { AUTON_CLIMB_LEVELS } from '../../config/autonClimb';
import { TELEOP_CLIMB_LEVELS } from '../../config/teleopClimb';
import { DefenseRating } from './DefenseRating';
import { useFiringTimer } from '../../hooks/useFiringTimer';
import { saveMatchRecord, getMatchRecords, getCurrentEvent, getMatchSchedule } from '../../lib/storage';
import './MatchScoutForm.css';

const STAGES = ['setup', 'auto', 'teleop', 'postmatch'];

export function MatchScoutForm({ onSave }) {
  const currentEvent = getCurrentEvent();
  const eventTeams = currentEvent?.teams
    ? [...currentEvent.teams].sort((a, b) => a.team_number - b.team_number)
    : [];
  const schedule = getMatchSchedule() || [];

  const getMatchLineup = (num) => {
    const match = schedule.find(m => m.comp_level === 'qm' && m.match_number === parseInt(num));
    if (!match) return null;
    const parse = keys => (keys || []).map(k => parseInt(k.replace('frc', '')));
    return {
      blue: parse(match.alliances?.blue?.team_keys),
      red: parse(match.alliances?.red?.team_keys),
    };
  };

  const getNextMatchNumber = () => {
    const records = getMatchRecords();
    if (records.length === 0) return 1;
    const maxMatch = Math.max(...records.map(r => r.matchNumber));
    return maxMatch + 1;
  };

  const [stage, setStage] = useState('setup');
  const [teamNumber, setTeamNumber] = useState('');
  const [matchNumber, setMatchNumber] = useState(getNextMatchNumber());
  const [allianceColor, setAllianceColor] = useState('red');

  // Auto period
  const [autoAccuracy, setAutoAccuracy] = useState(50);
  const [autoClimb, setAutoClimb] = useState('None');
  const [autonFocus, setAutonFocus] = useState('shooting');
  const [autoPickupLocation, setAutoPickupLocation] = useState([]);

  // Teleop/Endgame
  const [teleopAccuracy, setTeleopAccuracy] = useState(50);
  const [teleopClimb, setTeleopClimb] = useState('None');
  const [pickupLocation, setPickupLocation] = useState([]);
  const [endgameFocus, setEndgameFocus] = useState('shooting');

  const lineup = getMatchLineup(matchNumber);

  // Post-match
  const [defenseRating, setDefenseRating] = useState(0);
  const [notes, setNotes] = useState('');

  const { autoSeconds, teleopSeconds, startFiring, stopFiring, reset: resetTimer } = useFiringTimer();

  const nextStage = () => {
    const idx = STAGES.indexOf(stage);
    if (idx < STAGES.length - 1) {
      setStage(STAGES[idx + 1]);
    }
  };

  const prevStage = () => {
    const idx = STAGES.indexOf(stage);
    if (idx > 0) {
      setStage(STAGES[idx - 1]);
    }
  };

  const handleSubmit = () => {
    if (!teamNumber) {
      alert('Please enter a team number');
      setStage('setup');
      return;
    }

    const record = {
      teamNumber: parseInt(teamNumber),
      matchNumber: parseInt(matchNumber),
      allianceColor,
      autoFiringSeconds: autoSeconds,
      autoAccuracy,
      autoClimb,
      autoPickupLocation,
      autonFocus,
      teleopFiringSeconds: teleopSeconds,
      teleopAccuracy,
      teleopClimb,
      pickupLocation,
      endgameFocus,
      defenseRating,
      notes
    };

    saveMatchRecord(record);
    onSave(record);

    // Reset for next match
    setTeamNumber('');
    setMatchNumber(parseInt(matchNumber) + 1);
    setAutoAccuracy(50);
    setAutoClimb('None');
    setTeleopAccuracy(50);
    setTeleopClimb('None');
    setPickupLocation([]);
    setDefenseRating(0);
    setNotes('');
    resetTimer();
    setStage('setup');
  };

  const stageIndex = STAGES.indexOf(stage);

  return (
    <div className="match-scout-form">
      <div className="stage-progress">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`stage-dot ${i <= stageIndex ? 'active' : ''} ${i === stageIndex ? 'current' : ''}`}
          />
        ))}
      </div>

      {/* Stage: Setup */}
      {stage === 'setup' && (
        <div className="stage-content">
          <h2 className="stage-title">Match Setup</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Team #</label>
              {eventTeams.length > 0 ? (
                <select
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  className="team-select"
                  autoFocus
                >
                  <option value="">Select a team...</option>
                  {eventTeams.map(t => (
                    <option key={t.team_number} value={t.team_number}>
                      #{t.team_number} — {t.nickname}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  placeholder="107"
                  autoFocus
                />
              )}
            </div>
            <div className="form-group">
              <label>Match #</label>
              <input
                type="number"
                value={matchNumber}
                onChange={(e) => setMatchNumber(e.target.value)}
              />
            </div>
          </div>

          {lineup && (
            <div className="match-lineup">
              <div className="lineup-alliance blue">
                {lineup.blue.map((num, i) => (
                  <button
                    key={num}
                    type="button"
                    className={`lineup-team-btn blue${parseInt(teamNumber) === num && allianceColor === 'blue' ? ' selected' : ''}`}
                    onClick={() => { setTeamNumber(String(num)); setAllianceColor('blue'); }}
                  >
                    <span className="lineup-pos">B{i + 1}</span>
                    <span className="lineup-num">#{num}</span>
                  </button>
                ))}
              </div>
              <div className="lineup-alliance red">
                {lineup.red.map((num, i) => (
                  <button
                    key={num}
                    type="button"
                    className={`lineup-team-btn red${parseInt(teamNumber) === num && allianceColor === 'red' ? ' selected' : ''}`}
                    onClick={() => { setTeamNumber(String(num)); setAllianceColor('red'); }}
                  >
                    <span className="lineup-pos">R{i + 1}</span>
                    <span className="lineup-num">#{num}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Alliance</label>
            <div className="alliance-toggle">
              <button
                type="button"
                className={`alliance-btn red ${allianceColor === 'red' ? 'active' : ''}`}
                onClick={() => setAllianceColor('red')}
              >
                Red
              </button>
              <button
                type="button"
                className={`alliance-btn blue ${allianceColor === 'blue' ? 'active' : ''}`}
                onClick={() => setAllianceColor('blue')}
              >
                Blue
              </button>
            </div>
          </div>

          <button
            type="button"
            className="next-button"
            onClick={nextStage}
            disabled={!teamNumber}
          >
            Start Match →
          </button>
        </div>
      )}

      {/* Stage: Auto */}
      {stage === 'auto' && (
        <div className="stage-content">
          <h2 className="stage-title">Auto Period</h2>
          <p className="stage-subtitle">Team #{teamNumber} · Match #{matchNumber}</p>

          <div className="form-group">
            <label>Auton Focus</label>
            <div className="focus-toggle">
              {[
                { value: 'shooting', label: 'Shooting' },
                { value: 'shuttling', label: 'Shuttling' },
                { value: 'both', label: 'Both' },
                { value: 'neither', label: 'Neither' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`focus-btn${autonFocus === opt.value ? ' active' : ''}`}
                  onClick={() => setAutonFocus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <FiringButton
            mode="auto"
            onStart={startFiring}
            onStop={stopFiring}
            totalSeconds={autoSeconds}
          />

          <AccuracySlider
            label="Auto Accuracy"
            value={autoAccuracy}
            onChange={setAutoAccuracy}
          />

          <ClimbSelector
            label="Auto Climb"
            value={autoClimb}
            onChange={setAutoClimb}
            levels={AUTON_CLIMB_LEVELS}
          />

          <ClimbSelector
            label="Auto Pickup Location"
            value={autoPickupLocation}
            onChange={setAutoPickupLocation}
            multiple={true}
            levels={[
              'Neutral Zone',
              'Depot',
              'Outpost',
              'Alliance Zone'
            ]}
          />

          <div className="stage-nav">
            <button type="button" className="back-button" onClick={prevStage}>← Back</button>
            <button type="button" className="next-button" onClick={nextStage}>Teleop →</button>
          </div>
        </div>
      )}

      {/* Stage: Teleop */}
      {stage === 'teleop' && (
        <div className="stage-content">
          <h2 className="stage-title">Teleop / Endgame</h2>
          <p className="stage-subtitle">Team #{teamNumber} · Match #{matchNumber}</p>

          <div className="form-group">
            <label>Teleop Focus</label>
            <div className="focus-toggle">
              {[
                { value: 'shooting', label: 'Shooting' },
                { value: 'shuttling', label: 'Shuttling' },
                { value: 'both', label: 'Both' },
                { value: 'neither', label: 'Neither' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`focus-btn${endgameFocus === opt.value ? ' active' : ''}`}
                  onClick={() => setEndgameFocus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <FiringButton
            mode="teleop"
            onStart={startFiring}
            onStop={stopFiring}
            totalSeconds={teleopSeconds}
          />

          <AccuracySlider
            label="Teleop Accuracy"
            value={teleopAccuracy}
            onChange={setTeleopAccuracy}
          />

          <ClimbSelector
            label="Pickup Location"
            value={pickupLocation}
            onChange={setPickupLocation}
            multiple={true}
            levels={[
              'Neutral Zone',
              'Depot',
              'Outpost',
              'Alliance Zone'
            ]}
          />


          <ClimbSelector
            label="Endgame Climb"
            value={teleopClimb}
            onChange={setTeleopClimb}
            levels={TELEOP_CLIMB_LEVELS}
          />

          <div className="stage-nav">
            <button type="button" className="back-button" onClick={prevStage}>← Auto</button>
            <button type="button" className="next-button" onClick={nextStage}>Finish →</button>
          </div>
        </div>
      )}

      {/* Stage: Post-Match */}
      {stage === 'postmatch' && (
        <div className="stage-content">
          <h2 className="stage-title">Post-Match</h2>
          <p className="stage-subtitle">Team #{teamNumber} · Match #{matchNumber}</p>

          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Auto</span>
              <span className="stat-value">{autoSeconds.toFixed(1)}s</span>
              <span className="stat-detail">{autoAccuracy}% · {autoClimb}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Teleop</span>
              <span className="stat-value">{teleopSeconds.toFixed(1)}s</span>
                <span className="stat-detail">
                  {teleopAccuracy}% · {teleopClimb} · {Array.isArray(pickupLocation) ? (pickupLocation.length ? pickupLocation.join(', ') : 'None') : pickupLocation}
                </span>
            </div>
          </div>

          <DefenseRating value={defenseRating} onChange={setDefenseRating} />

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Match observations, issues, standout plays..."
              rows={3}
            />
          </div>

          <div className="stage-nav">
            <button type="button" className="back-button" onClick={prevStage}>← Back</button>
            <button type="button" className="submit-button" onClick={handleSubmit}>
              Save & Next Match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
