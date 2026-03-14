import './AccuracySlider.css';

export function AccuracySlider({ label, value, onChange }) {
  const dec = () => onChange(Math.max(0, value - 5));
  const inc = () => onChange(Math.min(100, value + 5));

  return (
    <div className="accuracy-slider">
      <label className="accuracy-label">{label}</label>
      <div className="accuracy-stepper">
        <button type="button" className="stepper-btn" onClick={dec} disabled={value <= 0}>−</button>
        <span className="stepper-value">{value}%</span>
        <button type="button" className="stepper-btn" onClick={inc} disabled={value >= 100}>+</button>
      </div>
    </div>
  );
}
