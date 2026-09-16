export const TOKIMEKI_LABELER_DID = 'did:plc:45scnhbnhc6zm4vn4br4q3wp';
export const TOKIMEKI_LABELER_ENDPOINT = 'https://ozone.tokimeki.tech';

export interface SupporterPlan {
    id: string;
    name: string;
    shortName: string;
    rank: number;
}

export const SUPPORTER_PLANS: readonly SupporterPlan[] = [
    { id: 'supporter', name: 'Supporter', shortName: 'Supporter', rank: 1 },
    { id: 'sponsor', name: 'Sponsor', shortName: 'Sponsor', rank: 2 },
    { id: 'tokimeki-gold', name: 'TOKIMEKI GOLD', shortName: 'GOLD', rank: 3 },
    { id: 'tokimeki-platinum', name: 'TOKIMEKI PLATINUM', shortName: 'PLATINUM', rank: 4 },
];

const PLAN_BY_ID = new Map(SUPPORTER_PLANS.map((plan) => [plan.id, plan]));

export interface LabelLike {
    src?: string;
    val?: string;
    neg?: boolean;
    exp?: string;
    uri?: string;
}

export function getSupporterPlan(id: string): SupporterPlan | undefined {
    return PLAN_BY_ID.get(id);
}

export function findSupporterPlan(labels: readonly LabelLike[] | undefined, now: number = Date.now()): SupporterPlan | undefined {
    if (!labels?.length) {
        return undefined;
    }
    let best: SupporterPlan | undefined;
    for (const label of labels) {
        if (label.src !== TOKIMEKI_LABELER_DID || label.neg || !label.val) continue;
        if (label.exp && Date.parse(label.exp) <= now) continue;
        const plan = PLAN_BY_ID.get(label.val);
        if (plan && (!best || plan.rank > best.rank)) {
            best = plan;
        }
    }
    return best;
}

export function withAppLabelers(dids: readonly string[]): string[] {
    return dids.includes(TOKIMEKI_LABELER_DID) ? [...dids] : [...dids, TOKIMEKI_LABELER_DID];
}

export async function fetchSupporterPlan(dids: readonly string[], fetcher: typeof fetch = fetch): Promise<SupporterPlan | undefined> {
    if (!dids.length) {
        return undefined;
    }
    const params = new URLSearchParams();
    for (const did of dids) {
        params.append('uriPatterns', did);
    }
    params.append('sources', TOKIMEKI_LABELER_DID);
    const res = await fetcher(`${TOKIMEKI_LABELER_ENDPOINT}/xrpc/com.atproto.label.queryLabels?${params}`);
    if (!res.ok) {
        throw new Error(`queryLabels failed: ${res.status}`);
    }
    const data = (await res.json()) as { labels?: LabelLike[] };
    return findSupporterPlan(data.labels);
}
