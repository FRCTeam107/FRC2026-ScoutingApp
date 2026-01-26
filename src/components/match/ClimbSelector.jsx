import './ClimbSelector.css';

const CLIMB_LEVELS = ['None', 'L1', 'L2', 'L3'];

export function ClimbSelector({ label = 'Climb Level', value, onChange }) {
  return (
    <div className="climb-selector">
      <label>{label}</label>
      <div className="climb-options">
        {CLIMB_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={`climb-option ${value === level ? 'selected' : ''}`}
            onClick={() => onChange(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
