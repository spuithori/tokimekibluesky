import type { NotificationView } from './notificationPipeline';

export type NotificationSource = 'bluesky' | 'mochott';

export interface NotificationLedger {
    notifications: NotificationView[];
    epoch: number;
    fetchedReasons?: string[];
    lastChimedAt: number;
}

const ledgers = new Map<string, NotificationLedger>();
const seenEpochs = new Map<string, number>();
const unreadCounts = new Map<string, number>();

export function getNotificationLedger(columnId: string): NotificationLedger {
    let ledger = ledgers.get(columnId);
    if (!ledger) {
        ledger = { notifications: [], epoch: 0, fetchedReasons: undefined, lastChimedAt: Date.now() };
        ledgers.set(columnId, ledger);
    }
    return ledger;
}

function sourceKey(did: string, source: NotificationSource): string {
    return `${did}\n${source}`;
}

function unreadKey(did: string, source: NotificationSource, priority: boolean): string {
    return source === 'bluesky' ? `${did}\nbluesky\n${priority}` : sourceKey(did, source);
}

export function getSeenEpoch(did: string, source: NotificationSource = 'bluesky'): number {
    return seenEpochs.get(sourceKey(did, source)) ?? 0;
}

export function bumpSeenEpoch(did: string, source: NotificationSource = 'bluesky'): void {
    seenEpochs.set(sourceKey(did, source), getSeenEpoch(did, source) + 1);
}

export function getSourceUnreadCount(did: string, source: NotificationSource, priority: boolean): number {
    return unreadCounts.get(unreadKey(did, source, priority)) ?? 0;
}

export function setSourceUnreadCount(did: string, source: NotificationSource, priority: boolean, count: number): void {
    unreadCounts.set(unreadKey(did, source, priority), count);
}

export function clearSourceUnreadCount(did: string, source: NotificationSource): void {
    unreadCounts.delete(unreadKey(did, source, false));
    if (source === 'bluesky') {
        unreadCounts.delete(unreadKey(did, source, true));
    }
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
    seenEpochs.clear();
    unreadCounts.clear();
}
