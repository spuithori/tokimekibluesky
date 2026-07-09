import type { ColumnState } from '$lib/classes/columnState.svelte';
import { clampDeckWidth, resolveDeckWidthPx } from '$lib/deckWidth';

export function measureTileContext(
    columnState: ColumnState,
    excludeSlotIndex: number,
    deckEl?: HTMLElement | null,
): { containerPx: number; otherWeightsSum: number } | null {
    if (typeof document === 'undefined') return null;
    const deck = deckEl ?? document.querySelector<HTMLElement>('.deck');
    if (!deck) return null;
    const wraps = Array.from(deck.querySelectorAll<HTMLElement>(':scope > .deck-row-wrap'));
    const containerPx = wraps.reduce((sum, el) => sum + el.offsetWidth, 0);
    if (containerPx <= 0) return null;
    let otherWeightsSum = 0;
    for (let i = 0; i < columnState.slots.length; i++) {
        if (i === excludeSlotIndex) continue;
        const other = columnState.getSlotColumn(i);
        if (!other || other.settings?.isPopup) continue;
        otherWeightsSum += clampDeckWidth(resolveDeckWidthPx(other.settings?.width));
    }
    return { containerPx, otherWeightsSum };
}
