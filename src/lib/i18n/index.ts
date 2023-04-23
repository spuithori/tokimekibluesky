import { browser } from '$app/environment'
import { init, register } from 'svelte-i18n'

const defaultLocale = 'en'

register('ja', () => import('./locales/ja.json'));
register('en', () => import('./locales/en.json'));
register('pt', () => import('./locales/pt.json'));
register('ko', () => import('./locales/ko-kr.json'));

init({
    fallbackLocale: defaultLocale,
    initialLocale: browser ? window.navigator.language : defaultLocale,
})
