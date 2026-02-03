import './ClimbSelector.css';

const DEFAULT_CLIMB_LEVELS = ['None', 'L1', 'L2', 'L3'];

export function ClimbSelector({ label = 'Climb Level', value, onChange, levels, multiple = false }) {
  const levelsToUse = levels ?? DEFAULT_CLIMB_LEVELS;

  const handleClick = (level) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      if (current.includes(level)) {
        onChange(current.filter((v) => v !== level));
      } else {
        onChange([...current, level]);
      }
    } else {
      onChange(level);
    }
  };

  const isSelected = (level) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(level);
    }
    return value === level;
  };

  return (
    <div className="climb-selector">
      <label>{label}</label>
      <div className="climb-options">
        {levelsToUse.map((level) => (
          <button
            key={level}
            type="button"
            className={`climb-option ${isSelected(level) ? 'selected' : ''}`}
            onClick={() => handleClick(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
