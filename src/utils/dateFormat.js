// Formats any date-like value as dd-mm-yyyy.
export const toDDMMYYYY = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Formats a Date using its LOCAL date parts as yyyy-mm-dd.
// Do not use date.toISOString() for this — it converts to UTC first, which
// shifts the calendar day for any timezone ahead of UTC.
export const toYYYYMMDD = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};
