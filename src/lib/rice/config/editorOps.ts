export interface EditOp {
    replaceStart: number;
    replaceEnd: number;
    insert: string;
    selStart: number;
    selEnd: number;
}

const INDENT = '    ';

export function lineStartOf(text: string, index: number): number {
    return text.lastIndexOf('\n', index - 1) + 1;
}

function leadingSpaces(line: string): string {
    return line.match(/^ */)?.[0] ?? '';
}

export function indentTab(text: string, selStart: number, selEnd: number, shift: boolean): EditOp | null {
    const multiline = text.slice(selStart, selEnd).includes('\n');

    if (!shift && !multiline) {
        return {
            replaceStart: selStart,
            replaceEnd: selEnd,
            insert: INDENT,
            selStart: selStart + INDENT.length,
            selEnd: selStart + INDENT.length,
        };
    }

    const blockStart = lineStartOf(text, selStart);
    const lines = text.slice(blockStart, selEnd).split('\n');
    let firstDelta = 0;
    let totalDelta = 0;
    const edited = lines.map((line, i) => {
        if (shift) {
            const removed = Math.min(leadingSpaces(line).length, INDENT.length);
            if (i === 0) firstDelta = -removed;
            totalDelta -= removed;
            return line.slice(removed);
        }
        if (i === 0) firstDelta = INDENT.length;
        totalDelta += INDENT.length;
        return INDENT + line;
    });

    return {
        replaceStart: blockStart,
        replaceEnd: selEnd,
        insert: edited.join('\n'),
        selStart: Math.max(blockStart, selStart + firstDelta),
        selEnd: Math.max(blockStart, selEnd + totalDelta),
    };
}

export function enterAutoIndent(text: string, selStart: number, selEnd: number): EditOp | null {
    const lineStart = lineStartOf(text, selStart);
    const currentLine = text.slice(lineStart, selStart);
    const indent = leadingSpaces(currentLine);

    if (selStart === selEnd && text[selStart - 1] === '{' && text[selStart] === '}') {
        const inner = indent + INDENT;
        const insert = '\n' + inner + '\n' + indent;
        const caret = selStart + 1 + inner.length;
        return { replaceStart: selStart, replaceEnd: selEnd, insert, selStart: caret, selEnd: caret };
    }

    const extra = currentLine.trimEnd().endsWith('{') ? INDENT : '';
    const insert = '\n' + indent + extra;
    const caret = selStart + insert.length;
    return { replaceStart: selStart, replaceEnd: selEnd, insert, selStart: caret, selEnd: caret };
}

export function autoClosePair(text: string, selStart: number, selEnd: number, char: '{' | '"'): EditOp | null {
    if (selStart !== selEnd) return null;
    const next = text[selStart] ?? '';

    if (char === '"') {
        if (next === '"') {
            return { replaceStart: selStart, replaceEnd: selStart, insert: '', selStart: selStart + 1, selEnd: selStart + 1 };
        }
        if (next !== '' && next !== ' ' && next !== '\n' && next !== '}' && next !== ',') {
            return null;
        }
        return { replaceStart: selStart, replaceEnd: selEnd, insert: '""', selStart: selStart + 1, selEnd: selStart + 1 };
    }

    return { replaceStart: selStart, replaceEnd: selEnd, insert: '{}', selStart: selStart + 1, selEnd: selStart + 1 };
}

export function typeThroughBrace(text: string, selStart: number, selEnd: number): EditOp | null {
    if (selStart !== selEnd) return null;

    if (text[selStart] === '}') {
        return { replaceStart: selStart, replaceEnd: selStart, insert: '', selStart: selStart + 1, selEnd: selStart + 1 };
    }

    const lineStart = lineStartOf(text, selStart);
    const beforeCaret = text.slice(lineStart, selStart);
    if (beforeCaret.length === 0 || beforeCaret.trim() !== '') return null;

    let depth = 0;
    let openIndent: string | null = null;
    let cursor = lineStart - 1;
    while (cursor > 0 || (cursor === 0 && lineStart > 0)) {
        const prevStart = lineStartOf(text, cursor);
        const line = text.slice(prevStart, cursor);
        const trimmed = line.trim();
        if (trimmed.endsWith('{')) {
            if (depth === 0) {
                openIndent = leadingSpaces(line);
                break;
            }
            depth -= 1;
        } else if (trimmed === '}') {
            depth += 1;
        }
        if (prevStart === 0) break;
        cursor = prevStart - 1;
    }

    if (openIndent === null || openIndent === beforeCaret) return null;

    return {
        replaceStart: lineStart,
        replaceEnd: selStart,
        insert: openIndent + '}',
        selStart: lineStart + openIndent.length + 1,
        selEnd: lineStart + openIndent.length + 1,
    };
}

export function smartBackspace(text: string, selStart: number, selEnd: number): EditOp | null {
    if (selStart !== selEnd || selStart === 0) return null;

    const pair = text.slice(selStart - 1, selStart + 1);
    if (pair === '{}' || pair === '""') {
        return { replaceStart: selStart - 1, replaceEnd: selStart + 1, insert: '', selStart: selStart - 1, selEnd: selStart - 1 };
    }

    const lineStart = lineStartOf(text, selStart);
    const beforeCaret = text.slice(lineStart, selStart);
    if (beforeCaret.length === 0 || beforeCaret.trim() !== '') return null;

    const column = beforeCaret.length;
    const remove = column % INDENT.length === 0 ? INDENT.length : column % INDENT.length;
    if (remove <= 1) return null;

    return { replaceStart: selStart - remove, replaceEnd: selStart, insert: '', selStart: selStart - remove, selEnd: selStart - remove };
}

export function toggleComment(text: string, selStart: number, selEnd: number): EditOp | null {
    const blockStart = lineStartOf(text, selStart);
    let blockEnd = text.indexOf('\n', Math.max(selEnd - 1, selStart));
    if (blockEnd === -1) blockEnd = text.length;

    const lines = text.slice(blockStart, blockEnd).split('\n');
    const nonBlank = lines.filter((line) => line.trim() !== '');
    if (nonBlank.length === 0) return null;

    const allCommented = nonBlank.every((line) => line.trimStart().startsWith('#'));
    let firstDelta = 0;
    let totalDelta = 0;
    const edited = lines.map((line, i) => {
        if (line.trim() === '') return line;
        const indent = leadingSpaces(line);
        const rest = line.slice(indent.length);
        let next: string;
        if (allCommented) {
            next = indent + rest.replace(/^# ?/, '');
        } else {
            next = indent + '# ' + rest;
        }
        const delta = next.length - line.length;
        if (i === 0) firstDelta = delta;
        totalDelta += delta;
        return next;
    });

    return {
        replaceStart: blockStart,
        replaceEnd: blockEnd,
        insert: edited.join('\n'),
        selStart: Math.max(blockStart, selStart + firstDelta),
        selEnd: Math.max(blockStart, selEnd + totalDelta),
    };
}
