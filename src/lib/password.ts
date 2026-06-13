const commonPasswords = new Set([
  "12345678",
  "123456789",
  "password",
  "contraseña",
  "qwerty123",
  "admin1234",
  "juntada123",
]);

export function getPasswordStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    uncommon: !commonPasswords.has(password.toLowerCase()),
  };
  const score = Object.values(checks).filter(Boolean).length;

  return {
    checks,
    score,
    ok: Object.values(checks).every(Boolean),
    label: score >= 6 ? "Segura" : score >= 4 ? "Media" : "Débil",
  };
}
