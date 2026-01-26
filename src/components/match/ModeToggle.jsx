import './ModeToggle.css';

export function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-button ${mode === 'auto' ? 'active' : ''}`}
        onClick={() => onChange('auto')}
      >
        AUTO
      </button>
      <button
        className={`mode-button ${mode === 'teleop' ? 'active' : ''}`}
        onClick={() => onChange('teleop')}
      >
        TELEOP
      </button>
    </div>
  );
}
