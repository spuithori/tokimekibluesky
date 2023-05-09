import '$lib/i18n';
import { locale, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';
import { invalidate } from '$app/navigation';
import {
    PUBLIC_SUPABASE_ANON_KEY,
    PUBLIC_SUPABASE_URL
} from '$env/static/public';
import { createSupabaseLoadClient } from '@supabase/auth-helpers-sveltekit';

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

    depends('supabase:auth');

    const supabase = createSupabaseLoadClient({
        supabaseUrl: PUBLIC_SUPABASE_URL,
        supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
        event: { fetch },
        serverSession: data?.session
    });

    const {
        data: { session }
    } = await supabase.auth.getSession();

    return { supabase, session };
}

export const ssr = false;