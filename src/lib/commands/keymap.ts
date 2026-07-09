export interface KeyCombo {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    key: string;
}

const KEY_ALIASES: Record<string, string> = {
    space: ' ',
    esc: 'escape',
    return: 'enter',
    comma: ',',
    period: '.',
    slash: '/',
    plus: '+',
    minus: '-',
    up: 'arrowup',
    down: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright',
};

export function isMacPlatform(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
}

export function parseCombo(text: string, isMac: boolean = isMacPlatform()): KeyCombo | null {
    const parts = text.toLowerCase().split('+').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;

    const combo: KeyCombo = { ctrl: false, alt: false, shift: false, meta: false, key: '' };
    for (const part of parts) {
        switch (part) {
            case 'ctrl':
            case 'control':
                combo.ctrl = true;
                break;
            case 'alt':
            case 'option':
                combo.alt = true;
                break;
            case 'shift':
                combo.shift = true;
                break;
            case 'meta':
            case 'cmd':
            case 'super':
            case 'win':
                combo.meta = true;
                break;
            case 'mod':
                if (isMac) combo.meta = true;
                else combo.ctrl = true;
                break;
            default:
                if (combo.key) return null;
                combo.key = KEY_ALIASES[part] ?? part;
        }
    }
    if (!combo.key) return null;
    return combo;
}

export function comboKey(combo: KeyCombo): string {
    return `${combo.ctrl ? 'c' : ''}${combo.alt ? 'a' : ''}${combo.shift ? 's' : ''}${combo.meta ? 'm' : ''}:${combo.key}`;
}

export function eventMatches(combo: KeyCombo, event: KeyboardEvent): boolean {
    if (
        event.ctrlKey !== combo.ctrl ||
        event.altKey !== combo.alt ||
        event.shiftKey !== combo.shift ||
        event.metaKey !== combo.meta
    ) {
        return false;
    }
    if (event.key.toLowerCase() === combo.key) return true;
    if (/^[0-9]$/.test(combo.key) && event.code === `Digit${combo.key}`) return true;
    return false;
}

export const DEFAULT_BINDS: { combo: string; command: string }[] = [
    { combo: 'mod+k', command: 'palette.toggle' },
    { combo: 'mod+o', command: 'orbit.toggle' },
];

export interface ResolvedBind {
    combo: KeyCombo;
    command: string;
}

export function resolveBindList(
    defs: { combo: string; command: string }[],
    fallback: { combo: string; command: string }[] = [],
): ResolvedBind[] {
    const seen = new Set<string>();
    const result: ResolvedBind[] = [];
    for (const bind of [...defs].reverse()) {
        const combo = parseCombo(bind.combo);
        if (!combo) continue;
        const key = comboKey(combo);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ combo, command: bind.command });
    }
    for (const def of fallback) {
        const combo = parseCombo(def.combo);
        if (!combo) continue;
        const key = comboKey(combo);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ combo, command: def.command });
    }
    return result;
}
