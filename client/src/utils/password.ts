const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export type PasswordStrengthLevel = 'weak' | 'good' | 'strong';

export const PASSWORD_COMPLEXITY_MESSAGE =
  'Minimum 8 characters, including an uppercase letter, a number, and a special character.';

const STRENGTH_UI: Record<
  PasswordStrengthLevel,
  {
    label: 'Weak' | 'Good' | 'Strong';
    colorClass: string;
    borderClass: string;
    focusClass: string;
  }
> = {
  weak: {
    label: 'Weak',
    colorClass: 'text-rose-600',
    borderClass: 'border-rose-500',
    focusClass: 'focus:ring-4 focus:ring-rose-500/25 focus:border-rose-600',
  },
  good: {
    label: 'Good',
    colorClass: 'text-amber-600',
    borderClass: 'border-amber-500',
    focusClass: 'focus:ring-4 focus:ring-amber-400/25 focus:border-amber-500',
  },
  strong: {
    label: 'Strong',
    colorClass: 'text-emerald-600',
    borderClass: 'border-emerald-500',
    focusClass: 'focus:ring-4 focus:ring-emerald-400/25 focus:border-emerald-500',
  },
};

export const meetsPasswordPolicy = (password: string): boolean => {
  if (typeof password !== 'string') {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);

  const categoriesMet = [hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  return password.length >= 8 && categoriesMet === 3;
};

export const evaluatePasswordStrength = (password: string) => {
  const value = password ?? '';

  if (!value) {
    return {
      level: 'weak' as PasswordStrengthLevel,
      label: '',
      colorClass: 'text-slate-400',
      borderClass: 'border-slate-400/45',
      focusClass: 'focus:ring-4 focus:ring-red-700/12 focus:border-red-700/60',
      meetsPolicy: false,
    };
  }

  const hasUppercase = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(value);
  const categoriesMet = [hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  const meetsPolicy = value.length >= 8 && categoriesMet === 3;

  if (!meetsPolicy) {
    return {
      level: 'weak' as PasswordStrengthLevel,
      label: STRENGTH_UI.weak.label,
      colorClass: STRENGTH_UI.weak.colorClass,
      borderClass: STRENGTH_UI.weak.borderClass,
      focusClass: STRENGTH_UI.weak.focusClass,
      meetsPolicy,
    };
  }

  const isStrong = value.length >= 12;
  const bucket: PasswordStrengthLevel = isStrong ? 'strong' : 'good';
  const ui = STRENGTH_UI[bucket];

  return {
    level: bucket,
    label: ui.label,
    colorClass: ui.colorClass,
    borderClass: ui.borderClass,
    focusClass: ui.focusClass,
    meetsPolicy,
  };
};
