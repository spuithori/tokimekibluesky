import { describe, it, expect } from 'vitest';
import { pullIntent } from './pullIntent';

describe('pullIntent', () => {
    it('gives up the pull when the finger first travels sideways, even if it drifts down', () => {
        expect(pullIntent(30, 8)).toBe('abandon');
        expect(pullIntent(-30, 8)).toBe('abandon');
        expect(pullIntent(12, 11)).toBe('abandon');
    });

    it('starts the pull for a downward drag, including a steep diagonal', () => {
        expect(pullIntent(0, 6)).toBe('pull');
        expect(pullIntent(8, 20)).toBe('pull');
    });

    it('stays undecided for a tiny movement or an upward one', () => {
        expect(pullIntent(3, 4)).toBe('undecided');
        expect(pullIntent(0, -40)).toBe('undecided');
    });
});
