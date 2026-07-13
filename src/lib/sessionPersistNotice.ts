import { recordError } from '$lib/errorLog';

const notifiedDids = new Set<string>();

export function reportPersistFailure(did: string | undefined, error: unknown) {
    console.error('Session persist failed:', did, error);
    recordError(error, 'session-persist');

    const key = did ?? 'unknown';
    if (notifiedDids.has(key)) return;
    notifiedDids.add(key);

    Promise.all([import('svelte-sonner'), import('tokimeki-i18n')])
        .then(([{ toast }, { t }]) => {
            toast.warning(t('session_persist_warning'));
        })
        .catch(() => {});
}
