export interface KeyCombo {
    key: string;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
    shift: boolean;
}

const NAMED_KEY_ALIASES: Record<string, string> = {
    ' ': 'Space',
    space: 'Space',
    spacebar: 'Space',
    esc: 'Escape',
    escape: 'Escape',
    enter: 'Enter',
    return: 'Enter',
    tab: 'Tab',
    backspace: 'Backspace',
    delete: 'Delete',
    del: 'Delete',
    home: 'Home',
    end: 'End',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    up: 'ArrowUp',
    arrowup: 'ArrowUp',
    down: 'ArrowDown',
    arrowdown: 'ArrowDown',
    left: 'ArrowLeft',
    arrowleft: 'ArrowLeft',
    right: 'ArrowRight',
    arrowright: 'ArrowRight',
    plus: '+',
};

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'Fn', 'Hyper', 'Super', 'OS', 'NumLock', 'ScrollLock']);
const MODIFIER_TOKENS = new Set(['ctrl', 'control', 'alt', 'option', 'meta', 'cmd', 'command', 'win', 'shift']);
const UNUSABLE_KEYS = new Set(['Process', 'Dead', 'Unidentified', 'Compose']);

function isLetter(key: string): boolean {
    return key.length === 1 && /[a-z]/i.test(key);
}

export function normalizeKey(raw: string): string {
    if (raw.length === 1) {
        if (raw === ' ') {
            return 'Space';
        }
        return isLetter(raw) ? raw.toLowerCase() : raw;
    }
    const alias = NAMED_KEY_ALIASES[raw.toLowerCase()];
    if (alias) {
        return alias;
    }
    if (/^f\d{1,2}$/i.test(raw)) {
        return raw.toUpperCase();
    }
    return raw;
}

function canonicalize(combo: KeyCombo): KeyCombo {
    const printableSymbol = combo.key.length === 1 && !isLetter(combo.key);
    return {
        key: combo.key,
        ctrl: combo.ctrl,
        alt: combo.alt,
        meta: combo.meta,
        shift: printableSymbol ? false : combo.shift,
    };
}

export function parseCombo(text: string): KeyCombo | null {
    const trimmed = text.trim();
    if (!trimmed) {
        return null;
    }
    const combo: KeyCombo = { key: '', ctrl: false, alt: false, meta: false, shift: false };
    const parts = trimmed === '+' ? ['+'] : trimmed.split('+').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) {
        return null;
    }
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const lower = part.toLowerCase();
        const isLast = i === parts.length - 1;
        if (!isLast && (lower === 'ctrl' || lower === 'control')) {
            combo.ctrl = true;
        } else if (!isLast && (lower === 'alt' || lower === 'option')) {
            combo.alt = true;
        } else if (!isLast && (lower === 'meta' || lower === 'cmd' || lower === 'command' || lower === 'win')) {
            combo.meta = true;
        } else if (!isLast && lower === 'shift') {
            combo.shift = true;
        } else if (isLast) {
            if (MODIFIER_TOKENS.has(lower)) {
                return null;
            }
            combo.key = normalizeKey(part);
        } else {
            return null;
        }
    }
    if (!combo.key) {
        return null;
    }
    return canonicalize(combo);
}

export function comboToString(combo: KeyCombo): string {
    const c = canonicalize(combo);
    let out = '';
    if (c.ctrl) out += 'ctrl+';
    if (c.alt) out += 'alt+';
    if (c.meta) out += 'meta+';
    if (c.shift) out += 'shift+';
    return out + c.key;
}

export function normalizeComboString(text: string): string | null {
    const combo = parseCombo(text);
    return combo ? comboToString(combo) : null;
}

export function eventToCombo(event: KeyboardEvent): string | null {
    if (event.isComposing) {
        return null;
    }
    const raw = event.key;
    if (!raw || UNUSABLE_KEYS.has(raw) || MODIFIER_KEYS.has(raw)) {
        return null;
    }
    return comboToString({
        key: normalizeKey(raw),
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
        shift: event.shiftKey,
    });
}

const DISPLAY_KEYS: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Escape: 'Esc',
    Enter: 'Enter',
    Space: 'Space',
    Backspace: '⌫',
    Delete: 'Del',
};

export function isApplePlatform(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }
    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '';
    return /mac|iphone|ipad|ipod/i.test(platform);
}

export function formatComboParts(text: string, apple: boolean = isApplePlatform()): string[] {
    const combo = parseCombo(text);
    if (!combo) {
        return [text];
    }
    const parts: string[] = [];
    if (combo.ctrl) parts.push(apple ? '⌃' : 'Ctrl');
    if (combo.alt) parts.push(apple ? '⌥' : 'Alt');
    if (combo.meta) parts.push(apple ? '⌘' : 'Meta');
    if (combo.shift) parts.push(apple ? '⇧' : 'Shift');
    const key = DISPLAY_KEYS[combo.key] ?? (isLetter(combo.key) ? combo.key.toUpperCase() : combo.key);
    parts.push(key);
    return parts;
}
