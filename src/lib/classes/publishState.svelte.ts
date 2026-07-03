class PublishState {
    #show: boolean = $state(false);
    pinned: boolean = $state(false);
    focusTick = $state(0);
    intercept: (() => boolean) | undefined;

    get show(): boolean {
        return this.#show;
    }

    set show(value: boolean) {
        if (value && !this.#show && this.intercept?.()) {
            return;
        }
        this.#show = value;
    }

    constructor() {
        const storagePinned = localStorage.getItem('pinned') || JSON.stringify(false);
        this.pinned = JSON.parse(storagePinned);

        $effect.root(() => {
            $effect(() => {
                localStorage.setItem('pinned', JSON.stringify(this.pinned));
            });
            return () => {};
        })
    }
}

export const publishState = new PublishState();
