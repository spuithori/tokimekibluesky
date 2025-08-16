import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
    if(!Intl.Segmenter){
        console.log('Intl.Segmenter not found. Browser is too old.');
    }

    console.log('current language: ' + window.navigator.language);
}

export const ssr = false;