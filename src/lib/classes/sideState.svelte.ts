export type SideItem = 'feeds' | 'chat' | 'notifications' | 'search' | 'profile' | 'refresher' | 'scroll-top' | 'releaseJunk' | 'bluecast' | 'columns' | 'topic' | 'tokmek' | 'workspace' | 'viewer' | 'home' | 'publish' | 'settings' | 'orbit';
const DEFAULT_ITEMS: SideItem[] = ['workspace', 'feeds', 'search', 'profile'];
export const ALL_ITEMS: SideItem[] = ['workspace', 'feeds', 'chat', 'notifications', 'search', 'topic', 'profile', 'bluecast', 'tokmek', 'orbit', 'refresher', 'scroll-top', 'columns', 'viewer'];

class SideState {
    items: SideItem[] = $state(DEFAULT_ITEMS);
    isTokStart = $state(false);
    openModal: SideItem | null = $state(null);
    anchor: HTMLElement | null = $state(null);

    constructor() {
        const storageItems = localStorage.getItem('sideItems') || JSON.stringify(DEFAULT_ITEMS);
        this.items = JSON.parse(storageItems);

        if (!Array.isArray(this.items)) {
            this.items = DEFAULT_ITEMS;
        }
    }

    pin(item: SideItem) {
        this.items.push(item);
    }

    unpin(item: SideItem) {
        this.items = this.items.filter(_item => _item !== item);
    }

    close() {
        this.openModal = null;
    }
}

export const sideState = new SideState();