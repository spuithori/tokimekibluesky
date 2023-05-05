export function clickOutside(node, options) {
    const handleClick = (event) => {

        const ignore = typeof options.ignoreElement === 'string'
            ? document.querySelector(options.ignoreElement)
            : options.ignoreElement;

        if (ignore?.contains(event.target)) {
            return;
        }

        if (!node.contains(event.target)) {
            node.dispatchEvent(new CustomEvent('outclick'));
        }
    };

    document.addEventListener('click', handleClick, true);

    return {
        destroy() {
            document.removeEventListener('click', handleClick, true);
        },
    };
}
