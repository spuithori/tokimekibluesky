let junkModalOpenAtNavStart = false;

export function markJunkModalNavStart(): void {
    junkModalOpenAtNavStart =
        typeof document !== 'undefined' &&
        document.querySelector('.modal-page-content') !== null;
}

export function isJunkModalContinuation(): boolean {
    return junkModalOpenAtNavStart;
}
