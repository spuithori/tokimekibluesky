export function clickOutside(node, options) {
    const handleClick = (event) => {

        const ignore = document.querySelector(options.ignoreElement);

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
