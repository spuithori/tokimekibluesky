import type { ColumnState } from "$lib/classes/columnState.svelte";
import type { DropPreview, MergeTarget, TileTarget } from "$lib/attachments/sortable.svelte";
import { mergeColumns } from "$lib/merge/mergeColumnOps";

class TilingDragState {
    draggingId = $state<string | null>(null);
    preview = $state<DropPreview | null>(null);
    pointer = $state<{ x: number; y: number } | null>(null);
    chip = $state<{ name: string; color: string } | null>(null);

    begin(columnId: string) {
        this.draggingId = columnId;
        this.preview = null;
        this.pointer = null;
        this.chip = null;
    }

    beginChip(columnId: string, chip: { name: string; color: string }) {
        this.begin(columnId);
        this.chip = chip;
    }

    setPreview(preview: DropPreview | null) {
        this.preview = preview;
    }

    setPointer(x: number, y: number) {
        this.pointer = { x, y };
    }

    end() {
        this.draggingId = null;
        this.preview = null;
        this.pointer = null;
        this.chip = null;
    }

    applySplit(columnState: ColumnState, sourceId: string, target: TileTarget) {
        const direction = target.zone === 'left' || target.zone === 'right' ? 'row' : 'column';
        const sourceFirst = target.zone === 'left' || target.zone === 'top';
        columnState.moveLeafToSplit(sourceId, target.id, direction, sourceFirst);
    }

    applyMerge(columnState: ColumnState, sourceId: string, target: MergeTarget) {
        mergeColumns(columnState, target.id, sourceId);
    }
}

export const tilingDrag = new TilingDragState();
