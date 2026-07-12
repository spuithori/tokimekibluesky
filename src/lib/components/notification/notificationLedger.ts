import type { NotificationView } from './notificationPipeline';

export interface NotificationLedger {
    notifications: NotificationView[];
    epoch: number;
    fetchedReasons?: string[];
}

const ledgers = new Map<string, NotificationLedger>();

export function getNotificationLedger(columnId: string): NotificationLedger {
    let ledger = ledgers.get(columnId);
    if (!ledger) {
        ledger = { notifications: [], epoch: 0, fetchedReasons: undefined };
        ledgers.set(columnId, ledger);
    }
    return ledger;
}

export function resetNotificationLedger(columnId: string): void {
    const ledger = ledgers.get(columnId);
    if (ledger) {
        ledger.notifications = [];
        ledger.fetchedReasons = undefined;
        ledger.epoch += 1;
    }
}

export function deleteNotificationLedger(columnId: string): void {
    const ledger = ledgers.get(columnId);
    if (ledger) {
        ledger.epoch += 1;
        ledgers.delete(columnId);
    }
}

export function moveNotificationLedger(fromId: string, toId: string): void {
    const ledger = ledgers.get(fromId);
    if (ledger) {
        ledgers.delete(fromId);
        ledgers.set(toId, ledger);
    }
}

export function clearAllNotificationLedgers(): void {
    for (const ledger of ledgers.values()) {
        ledger.epoch += 1;
    }
    ledgers.clear();
}
