import { tokenizeLine } from './lexer';

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

interface Segment {
    start: number;
    end: number;
    cls: string;
}

function segmentsFor(raw: string, line: number): Segment[] {
    const token = tokenizeLine(raw, line);
    switch (token.kind) {
        case 'comment':
            return [{ start: 0, end: raw.length, cls: 'rc-comment' }];
        case 'sectionClose':
            return [];
        case 'source':
            return [{ start: 0, end: raw.length, cls: 'rc-keyword' }];
        case 'invalid':
            return [{ start: 0, end: raw.length, cls: 'rc-invalid' }];
        case 'sectionOpen': {
            const nameStart = raw.length - raw.trimStart().length;
            const nameEnd = nameStart + token.name.length;
            const segments: Segment[] = [{ start: nameStart, end: nameEnd, cls: 'rc-section' }];
            if (token.label !== undefined) {
                const labelStart = raw.indexOf('"', nameEnd);
                const labelEnd = raw.indexOf('"', labelStart + 1) + 1;
                if (labelStart !== -1 && labelEnd > labelStart) {
                    segments.push({ start: labelStart, end: labelEnd, cls: 'rc-label' });
                }
            }
            return segments;
        }
        case 'var':
        case 'set':
        case 'entry': {
            const eq = raw.indexOf('=');
            const cls = token.kind === 'var' ? 'rc-var' : token.kind === 'set' ? 'rc-keyword' : 'rc-key';
            return [
                { start: 0, end: eq, cls },
                { start: eq + 1, end: raw.length, cls: 'rc-value' },
            ];
        }
        default:
            return [];
    }
}

export function highlightLine(raw: string, line: number): string {
    const segments = segmentsFor(raw, line)
        .filter((segment) => segment.end > segment.start)
        .sort((a, b) => a.start - b.start);

    let html = '';
    let cursor = 0;
    for (const segment of segments) {
        if (segment.start > cursor) {
            html += escapeHtml(raw.slice(cursor, segment.start));
        }
        html += `<span class="${segment.cls}">${escapeHtml(raw.slice(segment.start, segment.end))}</span>`;
        cursor = segment.end;
    }
    if (cursor < raw.length) {
        html += escapeHtml(raw.slice(cursor));
    }
    return html;
}
