import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).Worker = class {
        onmessage: ((e: any) => void) | null = null;
        postMessage() {}
        terminate() {}
        addEventListener() {}
        removeEventListener() {}
    };
});

vi.mock('$lib/classes/appState.svelte', () => ({
    appState: { profile: { current: 1 }, labelDefs: { current: [] } },
}));
vi.mock('$lib/classes/settingsState.svelte', () => ({
    settingsState: { settings: { markedUnread: false } },
}));
vi.mock('$lib/db', () => ({
    accountsDb: {
        profiles: {
            get: vi.fn(async () => null),
            update: vi.fn(async () => 1),
        },
    },
}));

import ColumnBoundaryFixture from '$lib/test-fixtures/ColumnBoundaryFixture.svelte';

function column() {
    return {
        id: 'col-1',
        algorithm: { type: 'default' },
        settings: { width: 'medium' },
        data: { feed: [], cursor: '' },
    };
}

describe('column svelte:boundary isolation', () => {
    it('shows the error panel instead of crashing when a column child throws', () => {
        const onerror = vi.fn();
        render(ColumnBoundaryFixture, { props: { column: column(), shouldThrow: true, onerror } });

        expect(screen.getByText('This column hit an error')).toBeTruthy();
        expect(screen.queryByTestId('child-ok')).toBeNull();
        expect(onerror).toHaveBeenCalled();
    });

    it('escalates to clear/delete options after a failed retry, then recovers via reset', async () => {
        const { rerender } = render(ColumnBoundaryFixture, { props: { column: column(), shouldThrow: true } });

        expect(screen.queryByText('Clear column data and retry')).toBeNull();

        screen.getByText('Retry').click();
        await vi.waitFor(() => expect(screen.getByText('Clear column data and retry')).toBeTruthy());

        await rerender({ column: column(), shouldThrow: false });
        expect(screen.queryByTestId('child-ok')).toBeNull();

        screen.getByText('Retry').click();
        await vi.waitFor(() => expect(screen.getByTestId('child-ok')).toBeTruthy());
    });
});
