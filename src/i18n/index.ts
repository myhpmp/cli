import ko from './ko.js';
import en from './en.js';

interface Messages {
  title: Record<number, string>;
  status: Record<string, string>;
  unit: Record<string, string>;
  exp: Record<string, string>;
}
type Locale = 'ko' | 'en';

const locales: Record<Locale, Messages> = { ko, en };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export function detectLocale(): Locale {
  const env = process.env.LANG || process.env.LC_ALL || '';
  if (env.startsWith('ko')) return 'ko';
  return 'en';
}

export function createI18n(locale?: string) {
  const resolved: Locale = locale === 'ko' ? 'ko' : 'en';
  const messages = locales[resolved];

  return {
    locale: resolved,
    t(key: string): string {
      return getNestedValue(messages as unknown as Record<string, unknown>, key);
    },
  };
}
