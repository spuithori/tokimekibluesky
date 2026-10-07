import { CATALOG } from './catalog.generated';

export type TokenGroup = 'base' | 'role' | 'side' | 'deck' | 'timeline' | 'publish' | 'bubble' | 'other';
export type TokenKind = 'color' | 'background' | 'image' | 'shadow' | 'filter' | 'border' | 'length' | 'other';

export interface CatalogToken {
    name: string;
    group: TokenGroup;
    kind: TokenKind;
}

export const TOKEN_GROUPS: readonly TokenGroup[] = ['base', 'role', 'side', 'deck', 'timeline', 'publish', 'bubble', 'other'];

export const TOKEN_CATALOG: readonly CatalogToken[] = CATALOG.map(([name, group, kind]) => ({ name, group, kind }));

const byName = new Map(TOKEN_CATALOG.map((token) => [token.name, token]));

export function catalogToken(name: string): CatalogToken {
    return byName.get(name) ?? { name, group: 'other', kind: 'other' };
}
