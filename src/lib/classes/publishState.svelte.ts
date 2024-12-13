type Layout = 'left' | 'bottom' | 'popup';

class PublishState {
    layout: Layout = $state('left');
    show: boolean = $state(false);
    pinned: boolean = $state(false);
    isSideShown = $derived(this.layout === 'left' && this.show);
    isBottom = $derived(this.layout !== 'left' || !this.show);

    constructor() {
        const storagePinned = localStorage.getItem('pinned') || JSON.stringify(false);
        this.pinned = JSON.parse(storagePinned);
        this.layout = localStorage.getItem('layout') as Layout || 'left';

        if (this.pinned && this.layout === 'left') {
            this.show = true;
        }

        $effect.root(() => {
            $effect(() => {
                localStorage.setItem('layout', this.layout);
                localStorage.setItem('pinned', JSON.stringify(this.pinned));
            });
            return () => {};
        })
    }
}

export const publishState = new PublishState();