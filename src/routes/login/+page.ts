import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    console.log('current language: ' + window.navigator.language);
}
export const ssr = false;
