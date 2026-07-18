import {resetNotificationColumnData} from "$lib/components/notification/notificationPipeline";
import type {Column} from "$lib/types/column";

export function resetColumnForRefresh(column: Column, columnState: { clearFeed: (id: string) => void }): void {
    columnState.clearFeed(column.id);
    column.data.cursor = undefined;
    column.data.scrollState = undefined;

    if (column.algorithm?.type === 'notification') {
        resetNotificationColumnData(column);
    }
}
