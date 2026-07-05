class KeymodeState {
    mode = $state<string | null>(null);

    enter(name: string) {
        this.mode = name;
    }

    exit() {
        this.mode = null;
    }
}

export const keymodeState = new KeymodeState();
