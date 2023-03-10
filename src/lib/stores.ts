import { writable } from 'svelte/store';
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
export const cursor = writable('');

export const notificationCount = writable(0);

export const isLogin = writable(false);

export const theme = writable(localStorage.getItem('theme') || 'default');

export const nonoto = writable(localStorage.getItem('nonoto') || 'false');