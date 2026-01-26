import './AccuracySlider.css';

export function AccuracySlider({ label, value, onChange }) {
  return (
    <div className="accuracy-slider">
      <div className="slider-header">
        <label>{label}</label>
        <span className="slider-value">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="slider"
      />
      <div className="slider-labels">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
