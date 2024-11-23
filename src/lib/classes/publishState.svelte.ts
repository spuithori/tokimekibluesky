type Layout = 'left' | 'bottom' | 'popup';

class PublishState {
    layout: Layout = $state('left');
    show: boolean = $state(false);
    isSideShown = $derived(this.layout === 'left' && this.show);
    isBottom = $derived(this.layout !== 'left' || !this.show);

    constructor() {
        this.layout = localStorage.getItem('layout') as Layout || 'left';

        if (this.layout === 'left') {
            // this.show = true;
        }

        $effect.root(() => {
            $effect(() => {
                localStorage.setItem('layout', this.layout);
            });
            return () => {};
        })
    }
}

export const publishState = new PublishState();