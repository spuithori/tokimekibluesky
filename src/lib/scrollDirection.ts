type ScrollDirectionState = {
    lastScrollY: number;
    ticking: boolean;
};

const states = new WeakMap<object, ScrollDirectionState>();

export function scrollDirection(node, threshold, callback): 'up' | 'down' | undefined {
    if (!node) {
        return;
    }

    let state = states.get(node);
    if (!state) {
        state = { lastScrollY: 0, ticking: false };
        states.set(node, state);
    }

    const scrollY = node.scrollTop ?? node.scrollY ?? window.scrollY;
    if (state.ticking) {
        return;
    }

    state.ticking = true;
    requestAnimationFrame(() => {
        let scrollDir;

        if (Math.abs(scrollY - state.lastScrollY) < threshold) {
            state.ticking = false;
            return;
        }

        scrollDir = scrollY > state.lastScrollY ? 'down' : 'up';
        state.lastScrollY = scrollY > 0 ? scrollY : 0;
        state.ticking = false;

        callback(scrollDir);
    });
}
