// Shared password policy — every password field in the app (signup, staff accept,
// change password) uses this so the rules and the UI stay consistent everywhere.
export function checkPassword(pw) {
  pw = pw || ''
  const hasMinLen = pw.length >= 8
  const hasUpper = /[A-Z]/.test(pw)
  const hasLower = /[a-z]/.test(pw)
  const hasNumber = /[0-9]/.test(pw)
  const hasSymbol = /[^A-Za-z0-9]/.test(pw)
  const valid = hasMinLen && hasUpper && hasNumber && hasSymbol
  let strength = 'weak'
  if (valid && pw.length >= 12 && hasLower) strength = 'strong'
  else if (valid) strength = 'good'
  return { valid, strength, hasMinLen, hasUpper, hasLower, hasNumber, hasSymbol }
}

export const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a number, and a symbol.'
