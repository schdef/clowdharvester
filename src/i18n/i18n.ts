import de from './de.json';
import en from './en.json';

export type Language = 'de' | 'en';

const translations: Record<Language, typeof de> = {
  de,
  en,
};

const STORAGE_KEY = 'cloud_harvesters_lang';

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'de' || saved === 'en') {
      return saved;
    }
    const browserLang = navigator.language?.slice(0, 2).toLowerCase();
    if (browserLang === 'de') return 'de';
  } catch {
    // fallback if localStorage is inaccessible
  }
  return 'de';
}

let currentLanguage: Language = getInitialLanguage();
const listeners: Set<(lang: Language) => void> = new Set();

export function setLanguage(lang: Language): void {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((listener) => listener(lang));
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function onLanguageChange(listener: (lang: Language) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Nested key lookup with dot notation (e.g. t('header.week'))
 */
export function t(key: string): string {
  const keys = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = translations[currentLanguage];

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      // Fallback to German if key missing in English
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fallback: any = translations.de;
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return key;
        }
      }
      return typeof fallback === 'string' ? fallback : key;
    }
  }

  return typeof result === 'string' ? result : key;
}
