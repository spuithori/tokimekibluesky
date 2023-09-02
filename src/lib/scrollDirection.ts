let lastScrollY = 0;

export function scrollDirection(event) {
    if (!event.target) {
        return false;
    }

    const threshold = 80;
    let scrollDir;

    const scrollY = event.target.scrollTop;

    if (Math.abs(scrollY - lastScrollY) < threshold) {
        return;
    }

    scrollDir = scrollY > lastScrollY ? 'down' : 'up';
    lastScrollY = scrollY > 0 ? scrollY : 0;

    return scrollDir;
}

export function detectScrollDirection(event) {
    const scroll = scrollDirection(event);

    if (!scroll) {
        return null;
    }

    return scroll;
}