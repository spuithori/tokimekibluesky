type VisibleCallback = () => void;

const callbacks = new Map<Element, Set<VisibleCallback>>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
    if (!observer) {
        observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;

                    const set = callbacks.get(entry.target);
                    if (!set) continue;

                    callbacks.delete(entry.target);
                    observer?.unobserve(entry.target);
                    for (const cb of set) {
                        cb();
                    }
                }
            },
            { rootMargin: '1000px' },
        );
    }
    return observer;
}

export function observeVisible(target: Element, cb: VisibleCallback): () => void {
    if (typeof IntersectionObserver === 'undefined') {
        cb();
        return () => {};
    }

    let set = callbacks.get(target);
    if (!set) {
        set = new Set();
        callbacks.set(target, set);
        getObserver().observe(target);
    }
    set.add(cb);

    return () => {
        const current = callbacks.get(target);
        if (!current) return;
        current.delete(cb);
        if (current.size === 0) {
            callbacks.delete(target);
            observer?.unobserve(target);
        }
    };
}
