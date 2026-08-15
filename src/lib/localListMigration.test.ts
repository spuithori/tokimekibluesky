import { describe, it, expect, vi } from 'vitest';
import { migrateLocalList, migrateLocalLists, sanitizeMembers, unmigratedLocalLists, type LocalList } from './localListMigration';

function list(overrides: Partial<LocalList> = {}): LocalList {
    return {
        id: '1700000000000',
        name: 'My List',
        members: ['did:plc:a', 'did:plc:b'],
        owner: 'did:plc:me',
        ...overrides,
    };
}

describe('sanitizeMembers', () => {
    it('drops corrupted entries and duplicates', () => {
        expect(sanitizeMembers(['did:plc:a', undefined, 'did:plc:a', 'not-a-did', 42, 'did:plc:b']))
            .toEqual(['did:plc:a', 'did:plc:b']);
    });

    it('returns empty array for non-array input', () => {
        expect(sanitizeMembers(undefined)).toEqual([]);
        expect(sanitizeMembers('did:plc:a')).toEqual([]);
    });
});

describe('unmigratedLocalLists', () => {
    it('filters by owner and migration flag', () => {
        const lists = [
            list({ id: '1', owner: 'did:plc:me' }),
            list({ id: '2', owner: 'did:plc:other' }),
            list({ id: '3', owner: 'did:plc:me', cloudMigrated: true }),
        ];
        expect(unmigratedLocalLists(lists, 'did:plc:me').map(l => l.id)).toEqual(['1']);
    });

    it('handles missing input safely', () => {
        expect(unmigratedLocalLists(undefined, 'did:plc:me')).toEqual([]);
        expect(unmigratedLocalLists([list()], undefined)).toEqual([]);
    });
});

describe('migrateLocalList', () => {
    it('creates a cloud list with sanitized members and marks the local list', async () => {
        const addCloudList = vi.fn().mockResolvedValue({ list: { id: 10 } });
        const target = list({ members: ['did:plc:a', undefined as any, 'did:plc:a', 'junk' as any] });

        await migrateLocalList({ addCloudList }, target);

        expect(addCloudList).toHaveBeenCalledWith({
            name: 'My List',
            members: ['did:plc:a'],
        });
        expect(target.cloudMigrated).toBe(true);
    });

    it('falls back to a default name for unnamed lists', async () => {
        const addCloudList = vi.fn().mockResolvedValue({});
        await migrateLocalList({ addCloudList }, list({ name: '  ' }));
        expect(addCloudList.mock.calls[0][0].name).toBe('List');
    });

    it('does not mark the list when the request fails', async () => {
        const addCloudList = vi.fn().mockRejectedValue(new Error('network'));
        const target = list();

        await expect(migrateLocalList({ addCloudList }, target)).rejects.toThrow('network');
        expect(target.cloudMigrated).toBeUndefined();
    });
});

describe('migrateLocalLists', () => {
    it('continues past failures and reports counts', async () => {
        const addCloudList = vi.fn()
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce({});
        const lists = [list({ id: '1' }), list({ id: '2' }), list({ id: '3' })];

        const result = await migrateLocalLists({ addCloudList }, lists);

        expect(result).toEqual({ success: 2, failed: 1 });
        expect(lists[0].cloudMigrated).toBe(true);
        expect(lists[1].cloudMigrated).toBeUndefined();
        expect(lists[2].cloudMigrated).toBe(true);
    });
});
