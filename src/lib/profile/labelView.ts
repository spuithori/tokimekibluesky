import type { ModerationCause, ModerationDecision } from '$lib/atproto-moderation';
import { TOKIMEKI_LABELER_DID, getSupporterPlan } from '$lib/support/supporterLabels';

export const BSKY_LABELER_DID = 'did:plc:ar7c4by46qjdydhdevvrndac';

export type ProfileRelation = 'followedBy' | 'muted' | 'blocking' | 'blockedBy';

export interface MediaBlur {
    blur: boolean;
    noOverride: boolean;
}

export interface ProfileLabelView {
    plans: ModerationCause[];
    alerts: ModerationCause[];
    informs: ModerationCause[];
    relations: ProfileRelation[];
    avatar: MediaBlur;
    banner: MediaBlur;
}

interface ProfileViewerLike {
    viewer?: {
        followedBy?: string;
        muted?: boolean;
        blocking?: string;
        blockedBy?: boolean;
    };
}

function causeKey(cause: ModerationCause): string {
    return `${cause.label?.src}\n${cause.label?.val}`;
}

function isShownLabel(cause: ModerationCause): boolean {
    return cause.type === 'label' && !!cause.label && cause.label.val !== '!no-unauthenticated';
}

function isPlan(cause: ModerationCause): boolean {
    return cause.label?.src === TOKIMEKI_LABELER_DID && !!getSupporterPlan(cause.label.val);
}

function collect(seen: Set<string>, causes: ModerationCause[]): ModerationCause[] {
    const out: ModerationCause[] = [];
    for (const cause of causes) {
        if (!isShownLabel(cause)) continue;
        const key = causeKey(cause);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cause);
    }
    return out;
}

export function buildProfileLabelView(profile: ProfileViewerLike, decision: ModerationDecision, viewerDid: string | undefined): ProfileLabelView {
    const view = decision.ui('profileView');
    const avatar = decision.ui('avatar');
    const banner = decision.ui('banner');

    const seen = new Set<string>();
    const serious = collect(seen, [...view.blurs, ...view.alerts]);
    const mild = collect(seen, [...view.informs, ...avatar.blurs, ...banner.blurs]);

    const relations: ProfileRelation[] = [];
    const viewer = profile.viewer;
    if (viewer?.followedBy) relations.push('followedBy');
    if (viewer?.muted) relations.push('muted');
    if (viewer?.blocking && viewerDid && viewer.blocking.split('/')[2] === viewerDid) relations.push('blocking');
    if (viewer?.blockedBy) relations.push('blockedBy');

    return {
        plans: [...serious, ...mild].filter(isPlan),
        alerts: serious.filter((cause) => !isPlan(cause)),
        informs: mild.filter((cause) => !isPlan(cause)),
        relations,
        avatar: { blur: avatar.blur, noOverride: avatar.noOverride },
        banner: { blur: banner.blur, noOverride: banner.noOverride },
    };
}

export function labelDisplayName(cause: ModerationCause, language: string | undefined, translate: (key: string) => string): string {
    const locales = cause.labelDef?.locales ?? [];
    const fromLabeler = cause.source.type !== 'user' && cause.label?.src !== BSKY_LABELER_DID;
    if (!fromLabeler || !locales[0]?.name) {
        return translate('labeling_' + cause.label?.val);
    }
    return locales.find((locale) => locale.lang === language)?.name ?? locales[0].name;
}

export function labelSourceKey(cause: ModerationCause): 'labeling_source_user' | 'labeling_source_labeler_official' | 'labeling_source_labeler' {
    if (cause.source.type === 'user') return 'labeling_source_user';
    return cause.label?.src === BSKY_LABELER_DID ? 'labeling_source_labeler_official' : 'labeling_source_labeler';
}
