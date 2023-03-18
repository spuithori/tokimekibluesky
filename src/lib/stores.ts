import { writable } from 'svelte/store';

export const service = writable(localStorage.getItem('service') || 'https://bsky.social');
export const accounts = writable(JSON.parse(localStorage.getItem('accounts')) || []);

export const currentAccount = writable(localStorage.getItem('currentAccount') || '0');
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

export const isDarkMode = writable(localStorage.getItem('darkmode') || 'false');

export const theme = writable(localStorage.getItem('theme') || 'lightpink');

export const nonoto = writable(localStorage.getItem('nonoto') || 'false');

export const quotePost = writable({});