import { describe, it, expect } from 'vitest';
import {
    getNotificationLedger,
    resetNotificationLedger,
    deleteNotificationLedger,
    moveNotificationLedger,
    clearAllNotificationLedgers,
} from './notificationLedger';

let seq = 0;
const uid = () => `ledger-test-${++seq}`;

describe('notificationLedger', () => {
    it('creates a ledger on first access and returns the same instance afterwards', () => {
        const id = uid();
        const ledger = getNotificationLedger(id);
        expect(ledger.notifications).toEqual([]);
        expect(ledger.epoch).toBe(0);
        expect(ledger.fetchedReasons).toBeUndefined();
        expect(getNotificationLedger(id)).toBe(ledger);
    });

    it('reset clears content and bumps the epoch, but only for existing ledgers', () => {
        const id = uid();
        resetNotificationLedger(id);
        const ledger = getNotificationLedger(id);
        expect(ledger.epoch).toBe(0);

        ledger.notifications = [{ uri: 'x' } as any];
        ledger.fetchedReasons = ['like'];
        resetNotificationLedger(id);
        expect(ledger.notifications).toEqual([]);
        expect(ledger.fetchedReasons).toBeUndefined();
        expect(ledger.epoch).toBe(1);
    });

    it('delete bumps the epoch on the orphaned reference before removal', () => {
        const id = uid();
        const ledger = getNotificationLedger(id);
        const epoch = ledger.epoch;
        deleteNotificationLedger(id);
        expect(ledger.epoch).toBe(epoch + 1);
        expect(getNotificationLedger(id)).not.toBe(ledger);
    });

    it('move transfers the ledger to a new id', () => {
        const from = uid();
        const to = uid();
        const ledger = getNotificationLedger(from);
        ledger.fetchedReasons = ['like'];
        moveNotificationLedger(from, to);
        expect(getNotificationLedger(to)).toBe(ledger);
        expect(getNotificationLedger(from)).not.toBe(ledger);
    });

    it('clearAll bumps every epoch and empties the map', () => {
        const a = getNotificationLedger(uid());
        const b = getNotificationLedger(uid());
        const aEpoch = a.epoch;
        const bEpoch = b.epoch;
        clearAllNotificationLedgers();
        expect(a.epoch).toBe(aEpoch + 1);
        expect(b.epoch).toBe(bEpoch + 1);
    });
});
