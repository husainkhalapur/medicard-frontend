// Paise (as returned by the API) -> a "₹1,234" display string.
export function formatRupees(paise) {
  if (paise == null) return '₹0';
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
