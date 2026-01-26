import './DefenseRating.css';

export function DefenseRating({ value, onChange }) {
  return (
    <div className="defense-rating">
      <label>Defense Rating</label>
      <div className="rating-options">
        <button
          type="button"
          className={`rating-option none ${value === 0 ? 'selected-none' : ''}`}
          onClick={() => onChange(0)}
        >
          N/A
        </button>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={`rating-option ${value >= rating && value > 0 ? 'filled' : ''}`}
            onClick={() => onChange(rating)}
          >
            {rating}
          </button>
        ))}
      </div>
      <div className="rating-labels">
        <span>No defense</span>
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}
