import { useState } from 'react';
import { SPECIALIZATIONS } from '../constants/specializations';

export default function SpecializationPicker({ value, onChange }) {
  const [customSpec, setCustomSpec] = useState('');

  const toggle = (spec) => {
    onChange(value.includes(spec) ? value.filter(s => s !== spec) : [...value, spec]);
  };

  const addCustom = () => {
    const trimmed = customSpec.trim();
    if (!trimmed) return;
    if (!value.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setCustomSpec('');
  };

  const remove = (spec) => onChange(value.filter(s => s !== spec));

  return (
    <div>
      <div className="spec-chip-grid">
        {SPECIALIZATIONS.map(s => (
          <button type="button" key={s}
            className={`spec-chip ${value.includes(s) ? 'active' : ''}`}
            onClick={() => toggle(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="spec-custom-row">
        <input className="form-input" placeholder="Not listed? Add your own"
          value={customSpec}
          onChange={e => setCustomSpec(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
        <button type="button" className="btn-outline spec-add-btn" onClick={addCustom}>
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="spec-selected-list">
          {value.map(s => (
            <span className="spec-selected-tag" key={s}>
              {s}
              <button type="button" onClick={() => remove(s)} aria-label={`Remove ${s}`}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
