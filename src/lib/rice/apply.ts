import { accessor } from '$lib/settings/settings.svelte';
import { riceState } from './riceState.svelte';

const BLOCKED_SET_PREFIXES = ['rice', 'version'];

function coerce(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
    return value;
}

export interface ApplySetsResult {
    applied: number;
    skipped: string[];
}

export function applyRiceSets(): ApplySetsResult {
    const result: ApplySetsResult = { applied: 0, skipped: [] };
    for (const { path, value } of riceState.compiled.sets) {
        if (BLOCKED_SET_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '.'))) {
            result.skipped.push(path);
            continue;
        }
        if (accessor.get(path) === undefined) {
            result.skipped.push(path);
            continue;
        }
        accessor.set(path, coerce(value));
        result.applied += 1;
    }
    return result;
}
