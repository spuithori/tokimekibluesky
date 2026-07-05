const lastScrollYByNode = new WeakMap<object, number>();
const tickingByNode = new WeakMap<object, boolean>();

export function scrollDirection(node, threshold, callback): 'up' | 'down' | undefined {
    if (!node) {
        return;
    }

    const scrollY = node.scrollTop ?? node.scrollY ?? window.scrollY;
    if (tickingByNode.get(node)) {
        return;
    }

    tickingByNode.set(node, true);
    requestAnimationFrame(() => {
        const lastScrollY = lastScrollYByNode.get(node) ?? 0;

        if (Math.abs(scrollY - lastScrollY) < threshold) {
            tickingByNode.set(node, false);
            return;
        }

        const scrollDir = scrollY > lastScrollY ? 'down' : 'up';
        lastScrollYByNode.set(node, scrollY > 0 ? scrollY : 0);
        tickingByNode.set(node, false);

        callback(scrollDir);
    });
}
