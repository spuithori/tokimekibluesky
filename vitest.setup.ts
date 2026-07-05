import { setupI18n, setLocale } from 'tokimeki-i18n';
import en from './src/lib/i18n/locales/en.json';

setupI18n({ fallback: 'en', locales: { en: [en as Record<string, string>] } });
setLocale('en');
