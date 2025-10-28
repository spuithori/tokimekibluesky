let lastScrollY = 0;
let ticking = false;

export function scrollDirection(node, threshold, callback): 'up' | 'down' | undefined {
    if (!node) {
        return;
    }

    const scrollY = node.scrollTop ?? node.scrollY ?? window.scrollY;
    if (ticking) {
        return;
    }

    ticking = true;
    requestAnimationFrame(() => {
        let scrollDir;

        if (Math.abs(scrollY - lastScrollY) < threshold) {
            ticking = false;
            return;
        }

        scrollDir = scrollY > lastScrollY ? 'down' : 'up';
        lastScrollY = scrollY > 0 ? scrollY : 0;
        ticking = false;

        callback(scrollDir);
    });
}
