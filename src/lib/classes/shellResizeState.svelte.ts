class ShellResizeState {
    previewWidth = $state<number | null>(null);
    singlePreviewWidth = $state<number | null>(null);
}

export const shellResizeState = new ShellResizeState();
