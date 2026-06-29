export async function reloadApp(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        location.reload();
        return;
    }

    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
            location.reload();
            return;
        }

        await reg.update();

        const waiting = reg.waiting;
        if (!waiting) {
            location.reload();
            return;
        }

        navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => location.reload(),
            { once: true },
        );
        waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch {
        location.reload();
    }
}
