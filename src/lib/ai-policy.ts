export const AI_POLICY_VERSION = '2026-09-19.v1';

export const AI_FEATURES = [
    {
        id: 'altText',
        endpoint: '/api/ai/alt',
        trigger: 'manual',
        model: 'google/gemini-2.5-flash-lite',
        provider: 'Google',
    },
    {
        id: 'columnIcon',
        endpoint: '/api/ai/column-icon',
        trigger: 'auto',
        model: 'typesafe-ai/jev',
        provider: 'TypeSafe AI',
    },
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];
export type AiFeatureId = AiFeature['id'];

export const AI_POLICY_SECTIONS = [
    'choice',
    'features',
    'route',
    'retention',
    'terms',
    'withdrawal',
    'changes',
    'contact',
] as const;

export function aiFeature<T extends AiFeatureId>(id: T): Extract<AiFeature, { id: T }> {
    return AI_FEATURES.find(feature => feature.id === id) as Extract<AiFeature, { id: T }>;
}

export function aiEndpoint(id: AiFeatureId, params: Record<string, string>): string {
    return `${aiFeature(id).endpoint}?${new URLSearchParams({ ...params, policy: AI_POLICY_VERSION })}`;
}

export function hasAiPolicyConsent(general: { aiPolicyConsent: string }): boolean {
    return general.aiPolicyConsent === AI_POLICY_VERSION;
}

export function isAutoColumnIconEnabled(general: { autoColumnIcon: boolean; aiPolicyConsent: string }): boolean {
    return general.autoColumnIcon && hasAiPolicyConsent(general);
}
