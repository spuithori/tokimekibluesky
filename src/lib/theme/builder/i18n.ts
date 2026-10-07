import { addLocales, getLocale } from 'tokimeki-i18n';

const ja = () => import('./locales/ja.json');
const en = () => import('./locales/en.json');

let loading: Promise<void> | null = null;

export function ensureBuilderLocale(): Promise<void> {
    const current = getLocale() ?? 'en';
    loading ??= addLocales({ ja: [ja], en: [en], ...(current === 'ja' || current === 'en' ? {} : { [current]: [en] }) }).catch((e) => {
        loading = null;
        throw e;
    });
    return loading;
}
