import { useState, useRef, useEffect } from 'react';
import './Select.css';

/**
 * Custom Select — matches .form-input filled-field design.
 *
 * Props:
 *   name         string   — form field name
 *   value        string   — controlled value
 *   onChange     fn(e)    — called with a synthetic { target: { name, value } }
 *   options      [{ value, label }] | string[]
 *   placeholder  string   — shown when no value selected (default "Select")
 *   disabled     bool
 */
export default function Select({ name, value, onChange, options = [], placeholder = 'Select', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Normalise options to { value, label }
  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selected = normalised.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (val) => {
    onChange({ target: { name, value: val } });
    setOpen(false);
  };

  return (
    <div className={`mc-select${open ? ' mc-select--open' : ''}${disabled ? ' mc-select--disabled' : ''}`} ref={ref}>
      <button
        type="button"
        className={`mc-select__trigger form-input${open ? ' focused' : ''}`}
        onClick={() => !disabled && setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={selected ? 'mc-select__val' : 'mc-select__placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={`material-symbols-outlined mc-select__arrow${open ? ' mc-select__arrow--up' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <ul className="mc-select__menu" role="listbox">
          {/* "No selection" option */}
          <li
            className={`mc-select__option mc-select__option--empty${!value ? ' mc-select__option--selected' : ''}`}
            role="option"
            aria-selected={!value}
            onClick={() => pick('')}
          >
            {placeholder}
          </li>
          {normalised.map(o => (
            <li
              key={o.value}
              className={`mc-select__option${o.value === value ? ' mc-select__option--selected' : ''}`}
              role="option"
              aria-selected={o.value === value}
              onClick={() => pick(o.value)}
            >
              {o.value === value && (
                <span className="material-symbols-outlined mc-select__check">check</span>
              )}
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
