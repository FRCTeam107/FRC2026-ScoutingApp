import './ClimbSelector.css';

const DEFAULT_CLIMB_LEVELS = ['None', 'L1', 'L2', 'L3'];

export function ClimbSelector({ label = 'Climb Level', value, onChange, levels }) {
  const levelsToUse = levels ?? DEFAULT_CLIMB_LEVELS;

  return (
    <div className="climb-selector">
      <label>{label}</label>
      <div className="climb-options">
        {levelsToUse.map((level) => (
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
