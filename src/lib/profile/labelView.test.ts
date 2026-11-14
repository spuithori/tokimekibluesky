import { describe, it, expect } from 'vitest';
import { interpretLabelValueDefinition } from '$lib/atproto-moderation';
import { profileLabelling } from '$lib/timelineFilter';
import { TOKIMEKI_LABELER_DID } from '$lib/support/supporterLabels';
import { BSKY_LABELER_DID, buildProfileLabelView, labelDisplayName } from './labelView';

const ME = 'did:plc:me';
const THEM = 'did:plc:them';
const LABELER = 'did:plc:customlabeler';

const labelDefs = {
    [LABELER]: [
        interpretLabelValueDefinition({
            identifier: 'bird-watcher',
            severity: 'inform',
            blurs: 'none',
            defaultSetting: 'warn',
            locales: [
                { lang: 'en', name: 'Bird watcher', description: '' },
                { lang: 'ja', name: '野鳥観察', description: '' },
            ],
        }, LABELER),
        interpretLabelValueDefinition({
            identifier: 'scammer',
            severity: 'alert',
            blurs: 'none',
            defaultSetting: 'warn',
            locales: [{ lang: 'en', name: 'Scammer', description: '' }],
        }, LABELER),
    ],
    [TOKIMEKI_LABELER_DID]: [
        interpretLabelValueDefinition({
            identifier: 'tokimeki-gold',
            severity: 'inform',
            blurs: 'none',
            defaultSetting: 'warn',
            locales: [{ lang: 'en', name: 'TOKIMEKI GOLD', description: '' }],
        }, TOKIMEKI_LABELER_DID),
    ],
};

function settingsWith(labelers: { did: string; labels: Record<string, string> }[]) {
    return { moderation: { contentLabels: { porn: 'warn', sexual: 'warn', nudity: 'warn', 'graphic-media': 'warn' }, labelers } };
}

const subscribed = settingsWith([
    { did: BSKY_LABELER_DID, labels: {} },
    { did: LABELER, labels: {} },
    { did: TOKIMEKI_LABELER_DID, labels: {} },
]);

function label(src: string, val: string, uri: string = THEM) {
    return { src, val, uri, cts: '2026-01-01T00:00:00Z' };
}

function viewOf(profile: any, settings: any = subscribed) {
    return buildProfileLabelView(profile, profileLabelling(profile, ME, settings, labelDefs), ME);
}

function vals(causes: { label?: { val: string } }[]) {
    return causes.map((cause) => cause.label?.val);
}

describe('buildProfileLabelView', () => {
    it('keeps an inform label out of the alerts, and an alert label out of the informs', () => {
        const view = viewOf({ did: THEM, labels: [label(LABELER, 'bird-watcher'), label(LABELER, 'scammer')] });
        expect(vals(view.alerts)).toEqual(['scammer']);
        expect(vals(view.informs)).toEqual(['bird-watcher']);
    });

    it('separates the supporter plan from both lists', () => {
        const view = viewOf({ did: THEM, labels: [label(TOKIMEKI_LABELER_DID, 'tokimeki-gold'), label(LABELER, 'bird-watcher')] });
        expect(vals(view.plans)).toEqual(['tokimeki-gold']);
        expect(vals(view.informs)).toEqual(['bird-watcher']);
        expect(view.alerts).toEqual([]);
    });

    it('shows nothing for a label the user set to ignore or from a labeler they do not subscribe to', () => {
        const ignored = settingsWith([{ did: LABELER, labels: { 'bird-watcher': 'ignore' } }]);
        expect(viewOf({ did: THEM, labels: [label(LABELER, 'bird-watcher')] }, ignored).informs).toEqual([]);
        expect(viewOf({ did: THEM, labels: [label(LABELER, 'scammer')] }, settingsWith([])).alerts).toEqual([]);
    });

    it('lists a label once when it sits on both the account and the profile record', () => {
        const profileRecord = `at://${THEM}/app.bsky.actor.profile/self`;
        const view = viewOf({ did: THEM, labels: [label(LABELER, 'scammer'), label(LABELER, 'scammer', profileRecord)] });
        expect(vals(view.alerts)).toEqual(['scammer']);
    });

    it('blurs the avatar and banner for an adult label and names the label that caused it', () => {
        const view = viewOf({ did: THEM, labels: [label(BSKY_LABELER_DID, 'porn')] });
        expect(view.avatar).toEqual({ blur: true, noOverride: false });
        expect(view.banner).toEqual({ blur: true, noOverride: false });
        expect(vals(view.informs)).toEqual(['porn']);
    });

    it('leaves the avatar alone when there is nothing to blur', () => {
        const view = viewOf({ did: THEM, labels: [label(LABELER, 'bird-watcher')] });
        expect(view.avatar.blur).toBe(false);
        expect(view.banner.blur).toBe(false);
    });

    it('blurs a blocked account without a way to reveal it', () => {
        const view = viewOf({ did: THEM, labels: [], viewer: { blocking: `at://${ME}/app.bsky.graph.block/abc` } });
        expect(view.avatar).toEqual({ blur: true, noOverride: true });
        expect(view.relations).toEqual(['blocking']);
        expect(view.alerts).toEqual([]);
    });

    it('reports a block only when the viewer created it', () => {
        const byList = viewOf({ did: THEM, labels: [], viewer: { blocking: 'at://did:plc:someone/app.bsky.graph.listblock/abc' } });
        expect(byList.relations).toEqual([]);
    });

    it('orders relations as follows-you, muted, blocking, blocked-by', () => {
        const view = viewOf({ did: THEM, labels: [], viewer: { blockedBy: true, muted: true, followedBy: `at://${THEM}/app.bsky.graph.follow/abc` } });
        expect(view.relations).toEqual(['followedBy', 'muted', 'blockedBy']);
    });
});

describe('labelDisplayName', () => {
    const translate = (key: string) => `t:${key}`;

    it('uses the labeler definition in the user language, then the first locale', () => {
        const [cause] = viewOf({ did: THEM, labels: [label(LABELER, 'bird-watcher')] }).informs;
        expect(labelDisplayName(cause, 'ja', translate)).toBe('野鳥観察');
        expect(labelDisplayName(cause, 'ko', translate)).toBe('Bird watcher');
    });

    it('falls back to the bundled translation for global labels', () => {
        const [cause] = viewOf({ did: THEM, labels: [label(BSKY_LABELER_DID, 'porn')] }).informs;
        expect(labelDisplayName(cause, 'ja', translate)).toBe('t:labeling_porn');
    });
});
