class ScratchpadState {
    hidden = $state(false);

    toggle() {
        this.hidden = !this.hidden;
    }

    show() {
        this.hidden = false;
    }
}

export const scratchpadState = new ScratchpadState();
