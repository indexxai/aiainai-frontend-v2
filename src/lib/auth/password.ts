/** Same rules the backend enforces (aiainai-backend src/auth/password-policy.ts). */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { id: 'letter', label: 'A letter', test: (pw: string) => /\p{L}/u.test(pw) },
  { id: 'other', label: 'A number or symbol', test: (pw: string) => /[^\p{L}\s]/u.test(pw) },
] as const;

export const passwordOk = (pw: string) => PASSWORD_RULES.every((r) => r.test(pw));
