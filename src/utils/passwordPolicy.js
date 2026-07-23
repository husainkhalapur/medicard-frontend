// Keep in sync with medicard-backend/utils/passwordPolicy.js
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export function validatePassword(password) {
  if (!password || !PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message: 'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'
    };
  }
  return { valid: true };
}

export function getPasswordChecklist(password) {
  const pwd = password || '';
  return [
    { label: 'At least 8 characters', met: pwd.length >= 8 && pwd.length <= 72 },
    { label: 'An uppercase letter', met: /[A-Z]/.test(pwd) },
    { label: 'A lowercase letter', met: /[a-z]/.test(pwd) },
    { label: 'A number', met: /\d/.test(pwd) },
    { label: 'A special character', met: /[^A-Za-z0-9]/.test(pwd) },
  ];
}
