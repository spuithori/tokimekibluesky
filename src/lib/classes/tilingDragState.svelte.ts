import type { ColumnState } from "$lib/classes/columnState.svelte";
import type { DropPreview, TileTarget } from "$lib/attachments/sortable.svelte";

class TilingDragState {
    draggingId = $state<string | null>(null);
    preview = $state<DropPreview | null>(null);
    pointer = $state<{ x: number; y: number } | null>(null);

    begin(columnId: string) {
        this.draggingId = columnId;
        this.preview = null;
        this.pointer = null;
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
    }

    applySplit(columnState: ColumnState, sourceId: string, target: TileTarget) {
        if (target.zone === 'center') {
            columnState.tabifyColumn(sourceId, target.id);
            return;
        }
        const direction = target.zone === 'left' || target.zone === 'right' ? 'row' : 'column';
        const sourceFirst = target.zone === 'left' || target.zone === 'top';
        columnState.moveLeafToSplit(sourceId, target.id, direction, sourceFirst);
    }
}

export const tilingDrag = new TilingDragState();
