import './AccuracySlider.css';

export function AccuracySlider({ label, value, onChange }) {
  const dec = () => onChange(Math.max(0, value - 5));
  const inc = () => onChange(Math.min(100, value + 5));

  return (
    <div className="accuracy-slider">
      <div className="accuracy-header">
        <label className="accuracy-label">{label}</label>
        <span className="accuracy-value">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="slider"
      />
      <div className="slider-labels">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <div className="accuracy-stepper">
        <button type="button" className="stepper-btn" onClick={dec} disabled={value <= 0}>−</button>
        <button type="button" className="stepper-btn" onClick={inc} disabled={value >= 100}>+</button>
      </div>
    </div>
  );
}
