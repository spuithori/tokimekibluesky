import { createSubscriber } from "svelte/reactivity";

class RelativeTimeClock {
    #subscribe = createSubscriber((update) => {
        const interval = setInterval(update, 10000);
        return () => clearInterval(interval);
    });

    get now(): number {
        this.#subscribe();
        return Date.now();
    }
}

export const relativeTimeClock = new RelativeTimeClock();
