import { setupI18n, type DictionaryLoader, type DictionarySource, type Messages } from 'tokimeki-i18n';
import jaUrl from './locales/ja.json?url';
import enUrl from './locales/en.json?url';
import ptUrl from './locales/pt.json?url';
import koUrl from './locales/ko-kr.json?url';
import faUrl from './locales/fa.json?url';
import bgUrl from './locales/bg.json?url';
import zhUrl from './locales/zh-cn.json?url';
import ruUrl from './locales/ru.json?url';
import frUrl from './locales/fr-fr.json?url';
import itUrl from './locales/it.json?url';

export function dictionaryFromUrl(url: string): DictionaryLoader {
    return () => fetch(url)
        .then((res) => {
            if (!res.ok) {
                throw new Error(`tokimeki-i18n: failed to load dictionary ${url} (${res.status})`);
            }
            return res.json() as Promise<Messages>;
        })
        .then((messages) => ({ default: messages }));
}

export const localeSources: Record<string, DictionarySource[] | string> = {
    ja: [
        dictionaryFromUrl(jaUrl),
        () => import('./locales/languageMap/ja.json'),
        () => import('./locales/labeling/ja.json'),
        () => import('./locales/labelingInfo/ja.json'),
    ],
    en: [
        dictionaryFromUrl(enUrl),
        () => import('./locales/languageMap/en.json'),
        () => import('./locales/labeling/en.json'),
        () => import('./locales/labelingInfo/en.json'),
    ],
    pt: [dictionaryFromUrl(ptUrl)],
    'pt-BR': 'pt',
    ko: [
        dictionaryFromUrl(koUrl),
        () => import('./locales/languageMap/ko-kr.json'),
    ],
    fa: [dictionaryFromUrl(faUrl)],
    ar: [() => import('./locales/ar.json')],
    bg: [
        dictionaryFromUrl(bgUrl),
        () => import('./locales/languageMap/bg.json'),
    ],
    'zh-CN': [
        dictionaryFromUrl(zhUrl),
        () => import('./locales/languageMap/zh-cn.json'),
    ],
    ru: [
        dictionaryFromUrl(ruUrl),
        () => import('./locales/languageMap/ru.json'),
    ],
    fr: [
        dictionaryFromUrl(frUrl),
        () => import('./locales/languageMap/fr-fr.json'),
    ],
    it: [
        dictionaryFromUrl(itUrl),
        () => import('./locales/languageMap/it.json'),
    ],
};

setupI18n({
    fallback: 'en',
    completeLocales: ['ja'],
    locales: localeSources,
});
