import { on } from 'svelte/events';
import { publishState } from '$lib/classes/publishState.svelte';
import { settingsStore } from '$lib/settings/settings.svelte';

export function trackSideEdge(property: string) {
    return (node: HTMLElement) => {
        void publishState.isBottom;
        void settingsStore.design.layout;

        const measure = () => {
            const side = document.querySelector<HTMLElement>('.side');
            const right = side ? Math.max(0, side.getBoundingClientRect().right) : 0;
            node.style.setProperty(property, `${right}px`);
        };
        measure();
        return on(window, 'resize', measure);
    };
}
