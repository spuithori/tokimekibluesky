export type LineToken =
    | { kind: 'blank'; line: number }
    | { kind: 'comment'; line: number }
    | { kind: 'var'; line: number; name: string; value: string; valueStart: number; valueEnd: number }
    | { kind: 'set'; line: number; path: string; value: string; valueStart: number; valueEnd: number }
    | { kind: 'source'; line: number; ref: string }
    | { kind: 'sectionOpen'; line: number; name: string; label?: string }
    | { kind: 'sectionClose'; line: number }
    | { kind: 'entry'; line: number; key: string; value: string; valueStart: number; valueEnd: number }
    | { kind: 'invalid'; line: number; message: string };

const VAR_RE = /^(\s*)\$([a-zA-Z][\w-]*)\s*=\s*(.*)$/;
const SECTION_OPEN_RE = /^(\s*)([a-zA-Z][\w-]*(?::[a-zA-Z][\w-]*)?)(?:\s+"([^"]*)")?\s*\{\s*$/;
const SECTION_CLOSE_RE = /^\s*\}\s*$/;
const SET_RE = /^(\s*)set\s+([a-zA-Z][\w.]*)\s*=\s*(.*)$/;
const SOURCE_RE = /^\s*source\s*=\s*(.*?)\s*$/;
const ENTRY_RE = /^(\s*)([a-zA-Z0-9][\w+-]*)\s*=\s*(.*)$/;

function valueSpan(raw: string, prefixLength: number): { value: string; valueStart: number; valueEnd: number } {
    const trimmed = raw.replace(/\s+$/, '');
    return { value: trimmed, valueStart: prefixLength, valueEnd: prefixLength + trimmed.length };
}

export function tokenizeLine(raw: string, line: number): LineToken {
    if (raw.trim() === '') return { kind: 'blank', line };
    if (raw.trimStart().startsWith('#')) return { kind: 'comment', line };
    if (SECTION_CLOSE_RE.test(raw)) return { kind: 'sectionClose', line };

    const sectionMatch = raw.match(SECTION_OPEN_RE);
    if (sectionMatch) {
        return { kind: 'sectionOpen', line, name: sectionMatch[2], label: sectionMatch[3] };
    }

    const varMatch = raw.match(VAR_RE);
    if (varMatch) {
        const prefix = raw.length - varMatch[3].length;
        return { kind: 'var', line, name: varMatch[2], ...valueSpan(varMatch[3], prefix) };
    }

    const setMatch = raw.match(SET_RE);
    if (setMatch) {
        const prefix = raw.length - setMatch[3].length;
        return { kind: 'set', line, path: setMatch[2], ...valueSpan(setMatch[3], prefix) };
    }

    const sourceMatch = raw.match(SOURCE_RE);
    if (sourceMatch) {
        return { kind: 'source', line, ref: sourceMatch[1] };
    }

    const entryMatch = raw.match(ENTRY_RE);
    if (entryMatch) {
        const prefix = raw.length - entryMatch[3].length;
        return { kind: 'entry', line, key: entryMatch[2], ...valueSpan(entryMatch[3], prefix) };
    }

    return { kind: 'invalid', line, message: `unrecognized statement: "${raw.trim().slice(0, 40)}"` };
}

export function tokenize(text: string): LineToken[] {
    return text.split('\n').map((raw, i) => tokenizeLine(raw, i + 1));
}
