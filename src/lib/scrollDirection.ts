type ScrollTarget = { scrollTop: number } | Window;

type ScrollDirectionState = {
    lastScrollY: number;
    ticking: boolean;
};

const states = new WeakMap<object, ScrollDirectionState>();

export function scrollDirection(
    node: ScrollTarget | null | undefined,
    threshold: number,
    callback: (direction: 'up' | 'down') => void,
): void {
    if (!node) {
        return;
    }

    let state = states.get(node);
    if (!state) {
        state = { lastScrollY: 0, ticking: false };
        states.set(node, state);
    }

    const scrollY = 'scrollTop' in node ? node.scrollTop : node.scrollY;
    if (state.ticking) {
        return;
    }

    state.ticking = true;
    requestAnimationFrame(() => {
        if (Math.abs(scrollY - state.lastScrollY) < threshold) {
            state.ticking = false;
            return;
        }

        const scrollDir = scrollY > state.lastScrollY ? 'down' : 'up';
        state.lastScrollY = scrollY > 0 ? scrollY : 0;
        state.ticking = false;

        callback(scrollDir);
    });
}
