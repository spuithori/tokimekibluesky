export function attachCompositorHeartbeat(): () => void {
    const desktop = window.matchMedia('(min-width: 768px)');
    const el = document.createElement('div');
    el.style.cssText =
        'position:fixed;left:0;top:0;width:1px;height:1px;pointer-events:none;opacity:0.01;will-change:transform;';
    document.body.appendChild(el);
    let animation: Animation | null = null;

    function sync() {
        if (!document.hidden && desktop.matches) {
            animation ??= el.animate(
                [{ transform: 'translateX(0px)' }, { transform: 'translateX(0.5px)' }],
                { duration: 1000, iterations: Infinity },
            );
        } else {
            animation?.cancel();
            animation = null;
        }
    }

    const listeners = new AbortController();
    document.addEventListener('visibilitychange', sync, { signal: listeners.signal });
    desktop.addEventListener('change', sync, { signal: listeners.signal });
    sync();

    return () => {
        listeners.abort();
        animation?.cancel();
        el.remove();
    };
}
