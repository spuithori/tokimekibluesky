import { addMessages, init } from 'svelte-i18n';
import en from './src/lib/i18n/locales/en.json';

addMessages('en', en as Record<string, any>);
init({ fallbackLocale: 'en', initialLocale: 'en' });
