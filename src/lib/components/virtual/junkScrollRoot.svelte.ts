import { untrack } from 'svelte';

class JunkScrollRoot {
    version = $state(0);

    mark(node: HTMLElement, active: boolean) {
        if (active) {
            node.dataset.junkScroll = '';
        } else {
            delete node.dataset.junkScroll;
        }
        this.version = untrack(() => this.version) + 1;
    }
}

export const junkScrollRoot = new JunkScrollRoot();
