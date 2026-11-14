export const PULL_START_PX = 5;

export type PullIntent = 'undecided' | 'pull' | 'abandon';

export function pullIntent(dx: number, dy: number): PullIntent {
    const horizontal = Math.abs(dx);
    if (horizontal > PULL_START_PX && horizontal > Math.abs(dy)) {
        return 'abandon';
    }
    if (dy > PULL_START_PX) {
        return 'pull';
    }
    return 'undecided';
}
