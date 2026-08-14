import {resetNotificationColumnData} from "$lib/components/notification/notificationPipeline";
import {soloFeedKey} from "$lib/merge/mergeSolo";
import type {Column} from "$lib/types/column";

export function resetColumnForRefresh(column: Column, columnState: { clearFeed: (id: string) => void, deleteFeed?: (id: string) => void }): void {
    columnState.clearFeed(column.id);
    column.data.cursor = undefined;
    column.data.scrollState = undefined;

    if (column.data.mergeSolo) {
        column.data.mergeSolo = undefined;
        column.data.mergeSoloCursor = undefined;
        column.data.mergeSoloComplete = undefined;
        columnState.deleteFeed?.(soloFeedKey(column.id));
    }

    if (column.algorithm?.type === 'notification') {
        resetNotificationColumnData(column);
    }
}
