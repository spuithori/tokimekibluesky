import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
import type { Column, currentAlgorithm } from '$lib/types/column';

export type JunkColumnDescriptor = {
    id: string;
    algorithm: currentAlgorithm;
    style?: Column['style'];
    did: string;
    handle?: string;
    settings?: Partial<Column['settings']>;
    seedFeed?: any[];
};

export type JunkColumnHost = {
    hasColumn: (id: string) => boolean;
    add: (column: Column) => void;
    getColumnIndex: (id: string) => number;
};

export function buildJunkColumn(descriptor: JunkColumnDescriptor): Column {
    return {
        id: descriptor.id,
        algorithm: { name: '', ...descriptor.algorithm },
        style: descriptor.style ?? 'default',
        did: descriptor.did,
        handle: descriptor.handle,
        settings: {
            ...structuredClone(defaultDeckSettings),
            ...(descriptor.settings ?? {}),
        } as Column['settings'],
        data: {
            feed: descriptor.seedFeed ?? [],
            cursor: '',
        },
    };
}

export function openJunkColumn(host: JunkColumnHost, descriptor: JunkColumnDescriptor): number {
    if (!host.hasColumn(descriptor.id)) {
        host.add(buildJunkColumn(descriptor));
    }
    return host.getColumnIndex(descriptor.id);
}
