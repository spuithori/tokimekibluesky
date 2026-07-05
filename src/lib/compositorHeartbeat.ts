const TAIL_MS = 90_000;
const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'] as const;

let el: HTMLDivElement | null = null;
let animation: Animation | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivity = 0;

function ensureRunning() {
    if (!el) {
        el = document.createElement('div');
        el.style.cssText =
            'position:fixed;left:0;top:0;width:1px;height:1px;pointer-events:none;opacity:0.01;will-change:transform;';
        document.body.appendChild(el);
    }
    if (!animation) {
        animation = el.animate(
            [{ transform: 'translateX(0px)' }, { transform: 'translateX(0.5px)' }],
            { duration: 1000, iterations: Infinity },
        );
    }
}

function stop() {
    animation?.cancel();
    animation = null;
    if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
    }
}

function scheduleStopCheck() {
    if (stopTimer) return;
    const remaining = TAIL_MS - (performance.now() - lastActivity);
    stopTimer = setTimeout(() => {
        stopTimer = null;
        if (performance.now() - lastActivity >= TAIL_MS) {
            stop();
        } else {
            scheduleStopCheck();
        }
    }, Math.max(remaining, 1000));
}

function poke() {
    lastActivity = performance.now();
    if (document.hidden) return;
    if (!matchMedia('(min-width: 768px)').matches) return;
    ensureRunning();
    scheduleStopCheck();
}

export function initCompositorHeartbeat() {
    if (typeof window === 'undefined') return;
    for (const type of ACTIVITY_EVENTS) {
        window.addEventListener(type, poke, { passive: true, capture: true });
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stop();
        } else {
            poke();
        }
    });
    (window as any).__compositorHeartbeat = {
        get active() {
            return animation !== null;
        },
    };
    poke();
}
