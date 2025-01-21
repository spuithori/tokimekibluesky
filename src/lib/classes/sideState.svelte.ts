export type SideItem = 'feeds' | 'chat' | 'notifications' | 'search' | 'profile' | 'refresher' | 'scroll-top' | 'releaseJunk' | 'bluecast' | 'columns' | 'topic' | 'tokmek';
const DEFAULT_ITEMS: SideItem[] = ['feeds', 'columns', 'search', 'profile'];
export const ALL_ITEMS: SideItem[] = ['feeds', 'chat', 'notifications', 'search', 'topic', 'profile', 'bluecast', 'tokmek', 'refresher', 'scroll-top', 'columns'];

class SideState {
    items: SideItem[] = $state(DEFAULT_ITEMS);
    isTokStart = $state(false);

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
}

export const sideState = new SideState();