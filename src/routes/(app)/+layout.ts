import '$lib/i18n';
import { locale, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
    if(!Intl.Segmenter){
        console.log('Intl.Segmenter polyfill used');
        
        const IntlSegmenterPolyfill = await import('intl-segmenter-polyfill');
        const Segmenter = await IntlSegmenterPolyfill.createIntlSegmenterPolyfill(
          fetch('./break_iterator.wasm')
        )

        Intl.Segmenter = Segmenter;
    }

    locale.set(window.navigator.language);
    console.log('current language: ' + window.navigator.language);
    await waitLocale();
}

export const ssr = false;