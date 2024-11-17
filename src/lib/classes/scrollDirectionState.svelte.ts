class ScrollDirectionState {
    direction = $state<'up' | 'down' | 'none'>('up');
}

export const scrollDirectionState = new ScrollDirectionState();
