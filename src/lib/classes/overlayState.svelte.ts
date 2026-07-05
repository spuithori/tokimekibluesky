class OverlayState {
    palette = $state(false);
    orbit = $state(false);
    actionCenter = $state(false);

    closeAll() {
        this.palette = false;
        this.orbit = false;
        this.actionCenter = false;
    }
}

export const overlayState = new OverlayState();
