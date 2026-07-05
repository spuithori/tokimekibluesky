class DrawerState {
    open = $state<{ items?: string[] } | null>(null);

    show(items?: string[]) {
        this.open = { items };
    }

    close() {
        this.open = null;
    }
}

export const drawerState = new DrawerState();
