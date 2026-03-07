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
    trenchCapability: [] // default: empty array for multiple choice
  });

  useEffect(() => {
    if (teamNumber) {
      const existing = getTeamProfile(teamNumber);
      setFormData({
        teamNumber: existing?.teamNumber ?? teamNumber,
        description: existing?.description || '',
        ballsPerSecond: existing?.ballsPerSecond || '',
        photoBase64: existing?.photoBase64 || existing?.photoUrl || null,
        trenchCapability: existing?.trenchCapability || 'trench'
      });
      if (existing) {
        setFormData({
          teamNumber: existing.teamNumber,
          description: existing.description || '',
          ballsPerSecond: existing.ballsPerSecond || '',
          photoBase64: existing.photoBase64 || existing.photoUrl || null,
          trenchCapability: Array.isArray(existing.trenchCapability)
            ? existing.trenchCapability
            : existing.trenchCapability
              ? [existing.trenchCapability]
              : []
        });
      }
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
      trenchCapability: formData.trenchCapability
    };

    saveTeamProfile(profile);
    onSave(profile);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleTrenchCapabilityChange = (option) => {
    setFormData(prev => {
      const current = prev.trenchCapability || [];
      if (current.includes(option)) {
        return { ...prev, trenchCapability: current.filter(o => o !== option) };
      } else {
        return { ...prev, trenchCapability: [...current, option] };
      }
    });
  };
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
          max="10"
        />
        <span className="hint">Their firing rate (used for fuel calculations)</span>
      </div>

      <div className="form-group">
        <label>Trench/Bump Capability</label>
        <button
          type="button"
          className={`trench-toggle ${formData.trenchCapability === 'trench' ? 'can-trench' : 'bump-only'}`}
          onClick={() => handleChange('trenchCapability', formData.trenchCapability === 'trench' ? 'bump' : 'trench')}
        >
          <span className="trench-toggle-label">{formData.trenchCapability === 'trench' ? 'Can Go Under Trench' : 'Over Bump Only'}</span>
        </button>
        <div className="toggle-group">
          <label>
            <input
              type="checkbox"
              name="trenchCapability"
              value="bump"
              checked={formData.trenchCapability.includes('bump')}
              onChange={() => handleTrenchCapabilityChange('bump')}
            />
            Bump
          </label>
          <label>
            <input
              type="checkbox"
              name="trenchCapability"
              value="trench"
              checked={formData.trenchCapability.includes('trench')}
              onChange={() => handleTrenchCapabilityChange('trench')}
            />
            Trench
          </label>
          <label>
            <input
              type="checkbox"
              name="trenchCapability"
              value="bumpOrTrench"
              checked={formData.trenchCapability.includes('bumpOrTrench')}
              onChange={() => handleTrenchCapabilityChange('bumpOrTrench')}
            />
            Bump or Trench
          </label>
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
