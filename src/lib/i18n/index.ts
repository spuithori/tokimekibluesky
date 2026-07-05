import { setupI18n } from 'tokimeki-i18n';

setupI18n({
    fallback: 'en',
    locales: {
        ja: [
            () => import('./locales/ja.json'),
            () => import('./locales/languageMap/ja.json'),
            () => import('./locales/labeling/ja.json'),
            () => import('./locales/labelingInfo/ja.json'),
        ],
        en: [
            () => import('./locales/en.json'),
            () => import('./locales/languageMap/en.json'),
            () => import('./locales/labeling/en.json'),
            () => import('./locales/labelingInfo/en.json'),
        ],
        pt: [() => import('./locales/pt.json')],
        'pt-BR': 'pt',
        ko: [
            () => import('./locales/ko-kr.json'),
            () => import('./locales/languageMap/ko-kr.json'),
        ],
        fa: [() => import('./locales/fa.json')],
        ar: [() => import('./locales/ar.json')],
        bg: [
            () => import('./locales/bg.json'),
            () => import('./locales/languageMap/bg.json'),
        ],
        'zh-CN': [
            () => import('./locales/zh-cn.json'),
            () => import('./locales/languageMap/zh-cn.json'),
        ],
        ru: [
            () => import('./locales/ru.json'),
            () => import('./locales/languageMap/ru.json'),
        ],
        fr: [
            () => import('./locales/fr-fr.json'),
            () => import('./locales/languageMap/fr-fr.json'),
        ],
        it: [
            () => import('./locales/it.json'),
            () => import('./locales/languageMap/it.json'),
        ],
    },
});
