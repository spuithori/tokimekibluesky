import { describe, it, expect, vi, afterEach } from 'vitest';

const { restoreMock } = vi.hoisted(() => ({ restoreMock: vi.fn() }));

vi.mock('./oauth/client', () => ({
    OAuthClient: class {
        restore(...args: unknown[]) {
            return restoreMock(...args);
        }
    },
}));

vi.mock('./oauth/confidential-fetch', () => ({
    createConfidentialFetch: () => globalThis.fetch,
}));

import { restoreSession } from './oauth';

afterEach(() => {
    vi.clearAllMocks();
});

describe('restoreSession', () => {
    it('restores without an eager token refresh at boot', async () => {
        const ensureValid = vi.fn(async () => {
            throw new Error('token endpoint must not be hit during restore');
        });
        restoreMock.mockResolvedValue({
            did: 'did:plc:x',
            fetchHandler: vi.fn(),
            ensureValid,
            dead: false,
        });

        const session = await restoreSession('did:plc:x');

        expect(session?.did).toBe('did:plc:x');
        expect(ensureValid).not.toHaveBeenCalled();
    });

    it('returns null when no stored session exists', async () => {
        restoreMock.mockResolvedValue(null);

        const session = await restoreSession('did:plc:x');

        expect(session).toBeNull();
    });
});
