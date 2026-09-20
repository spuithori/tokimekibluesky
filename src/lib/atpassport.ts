import { AtPassport } from '@atpassport/client/core';
import { getLocale } from 'tokimeki-i18n';

const STATE_KEY = 'atpassport:atpstate';
const CALLBACK_PATH = '/oauth/passport';
const LANGS = ['en', 'ja', 'pt', 'de', 'fr', 'es'] as const;

export type PassportHandleResult =
    | { status: 'selected'; handle: string }
    | { status: 'redirecting' }
    | { status: 'dismissed' };

function createPassport(): AtPassport {
    const current = getLocale()?.slice(0, 2).toLowerCase();

    return new AtPassport({
        callbackUrl: `${window.location.origin}${CALLBACK_PATH}`,
        lang: LANGS.find((lang) => lang === current),
        fedcm: true,
    });
}

export async function requestPassportHandle(): Promise<PassportHandleResult> {
    const passport = createPassport();
    let redirecting = false;

    const result = await passport.requestHandleAssist({
        fallback: () => {
            const { url, atpstate } = passport.generateAuthUrl();
            sessionStorage.setItem(STATE_KEY, atpstate);
            redirecting = true;
            window.location.href = url;
            return null;
        },
    });

    if (redirecting) {
        return { status: 'redirecting' };
    }

    return result ? { status: 'selected', handle: result.username } : { status: 'dismissed' };
}

export function consumePassportCallback(currentUrl: string): string {
    const expectedState = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);

    if (!expectedState) {
        throw new Error('Missing atpstate: this sign-in was not started from this tab.');
    }

    const { handle } = createPassport().parseCallback(currentUrl, expectedState);
    if (!handle) {
        throw new Error('No handle returned from @passport.');
    }

    return handle;
}
