let lastScrollY = window.pageYOffset;

export function scrollDirection(event) {
    const threshold = 80;
    let scrollDir;

    const scrollY = window.pageYOffset;

    if (Math.abs(scrollY - lastScrollY) < threshold) {
        return;
    }

    scrollDir = scrollY > lastScrollY ? 'down' : 'up';
    lastScrollY = scrollY > 0 ? scrollY : 0;

    return scrollDir;
}