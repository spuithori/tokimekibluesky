import { tick } from 'svelte';

export interface RenderProbeEntry {
    reason: string;
    column: string;
    posts: number;
    created: number;
    mounted: number;
    flushMs: number;
    paintMs: number;
    msPerMounted: number;
}

let enabled: boolean | undefined;

function isEnabled(): boolean {
    if (enabled === undefined) {
        try {
            enabled = localStorage.getItem('renderProbe') === '1';
        } catch {
            enabled = false;
        }
    }
    return enabled;
}

export function probeFeedRender(reason: string, columnId: string, label: string | undefined, before: number, after: number): void {
    if (!isEnabled() || after === 0 || (before > 0 && reason !== 'restore')) {
        return;
    }

    const start = performance.now();
    const createdArticles = new Set<Element>();
    const collect = (node: Node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('article')) createdArticles.add(node);
        for (const article of node.querySelectorAll('article')) createdArticles.add(article);
    };
    const observer = new MutationObserver((records) => {
        for (const record of records) {
            record.addedNodes.forEach(collect);
            record.removedNodes.forEach(collect);
        }
    });
    const observed = document.querySelector(`[data-tile-id="${CSS.escape(columnId)}"]`);
    if (observed) {
        observer.observe(observed, { childList: true, subtree: true });
    }

    tick().then(() => {
        const flushed = performance.now();

        requestAnimationFrame(() => {
            setTimeout(() => {
                const painted = performance.now();
                observer.disconnect();
                const row = document.querySelector(`[data-tile-id="${CSS.escape(columnId)}"]`);
                const mounted = row ? row.querySelectorAll('article').length : 0;
                const entry: RenderProbeEntry = {
                    reason,
                    column: label || columnId,
                    posts: after,
                    created: createdArticles.size,
                    mounted,
                    flushMs: Math.round(flushed - start),
                    paintMs: Math.round(painted - start),
                    msPerMounted: mounted ? +((flushed - start) / mounted).toFixed(1) : 0,
                };

                const log = ((window as any).__renderProbe ??= []) as RenderProbeEntry[];
                log.push(entry);
                console.log(`[render-probe] ${entry.reason} "${entry.column}" posts=${entry.posts} created=${entry.created} mounted=${entry.mounted} flush=${entry.flushMs}ms paint=${entry.paintMs}ms (${entry.msPerMounted}ms/post)`);
            }, 0);
        });
    });
}
