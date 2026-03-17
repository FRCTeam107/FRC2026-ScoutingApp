import { useState, useEffect } from 'react';
import { PhotoCapture } from './PhotoCapture';
import { saveTeamProfile, getTeamProfile } from '../../lib/storage';
import './PitScoutForm.css';

export function PitScoutForm({ teamNumber, onSave }) {
  const [formData, setFormData] = useState({
    teamNumber: teamNumber || '',
    description: '',
    ballsPerSecond: '',
    photoBase64: null,
    trenchCapability: 'trench',
    climbSide: 'doNotClimb'
  });

  useEffect(() => {
    if (teamNumber) {
      const existing = getTeamProfile(teamNumber);
      setFormData({
        teamNumber: existing?.teamNumber ?? teamNumber,
        description: existing?.description || '',
        ballsPerSecond: existing?.ballsPerSecond || '',
        photoBase64: existing?.photoBase64 || existing?.photoUrl || null,
        trenchCapability: typeof existing?.trenchCapability === 'string' ? existing.trenchCapability : 'trench',
        climbSide: typeof existing?.climbSide === 'string' ? existing.climbSide : 'doNotClimb'
      });
    }
  }, [teamNumber]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.teamNumber) {
      alert('Please enter a team number');
      return;
    }

    const profile = {
      teamNumber: parseInt(formData.teamNumber),
      description: formData.description,
      ballsPerSecond: formData.ballsPerSecond ? parseFloat(formData.ballsPerSecond) : null,
      photoBase64: formData.photoBase64,
      trenchCapability: formData.trenchCapability,
      climbSide: formData.climbSide
    };

    saveTeamProfile(profile);
    onSave(profile);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form className="pit-scout-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="teamNumber">Team Number *</label>
        <input
          type="number"
          id="teamNumber"
          value={formData.teamNumber}
          onChange={(e) => handleChange('teamNumber', e.target.value)}
          placeholder="e.g., 107"
          required
          min="1"
          max="9999"
        />
      </div>

      <div className="form-group">
        <label htmlFor="ballsPerSecond">Balls Per Second</label>
        <input
          type="number"
          id="ballsPerSecond"
          value={formData.ballsPerSecond}
          onChange={(e) => handleChange('ballsPerSecond', e.target.value)}
          placeholder="e.g., 2.5"
          step="0.1"
          min="0"
          max="50"
        />
        <span className="hint">Their firing rate (used for fuel calculations)</span>
      </div>

      <div className="form-group">
        <label>Trench/Bump Capability</label>
        <div className="toggle-group">
          <label>
            <input
              type="radio"
              name="trenchCapability"
              value="bump"
              checked={formData.trenchCapability === 'bump'}
              onChange={() => handleChange('trenchCapability', 'bump')}
            />
            Bump
          </label>
          <label>
            <input
              type="radio"
              name="trenchCapability"
              value="trench"
              checked={formData.trenchCapability === 'trench'}
              onChange={() => handleChange('trenchCapability', 'trench')}
            />
            Trench
          </label>
          <label>
            <input
              type="radio"
              name="trenchCapability"
              value="bumpAndTrench"
              checked={formData.trenchCapability === 'bumpAndTrench'}
              onChange={() => handleChange('trenchCapability', 'bumpAndTrench')}
            />
            Bump and Trench
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Ladder Climb Side</label>
        <span className="hint">Position on the ladder relative to the driver station</span>
        <div className="pit-choice-group">
          {[
            { value: 'left',       label: 'Left' },
            { value: 'middle',     label: 'Middle' },
            { value: 'right',      label: 'Right' },
            { value: 'doNotClimb', label: 'Do Not Climb' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`pit-choice-btn${formData.climbSide === opt.value ? ' selected' : ''}`}
              onClick={() => handleChange('climbSide', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description">Robot Description</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Drivetrain type, mechanisms, capabilities, notes..."
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>Robot Photo</label>
        <PhotoCapture
          value={formData.photoBase64}
          onChange={(base64) => handleChange('photoBase64', base64)}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="save-button">
          Save Team Profile
        </button>
      </div>
    </form>
  );
}
