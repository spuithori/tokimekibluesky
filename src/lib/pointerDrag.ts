export function startPointerDrag(
    event: PointerEvent,
    onMove: (event: PointerEvent) => void,
    onEnd?: (event: PointerEvent) => void,
): void {
    const handle = event.currentTarget as HTMLElement;
    const pointerId = event.pointerId;
    event.preventDefault();
    handle.setPointerCapture?.(pointerId);

    const move = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        onMove(e);
    };
    const up = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        try { handle.releasePointerCapture?.(pointerId); } catch (_) {}
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        onEnd?.(e);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
}
