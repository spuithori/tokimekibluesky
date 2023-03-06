import { writable } from 'svelte/store';
import {AtpAgent} from "@atproto/api";

export const agent = writable({});

function createTimeline () {
    const { subscribe, set, update } = writable([]);

    return {
        subscribe,
        set,
        update,
        asyncUpdate: async () => {
            await update(n => n);
        },
    };
}

export const timeline = createTimeline();
