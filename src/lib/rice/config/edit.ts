import { parse } from './parser';
import type { EntryNode, SectionNode, SourceStatement, TopStatement } from './model';

export interface SectionRef {
    name: string;
    label?: string;
}

function findSection(statements: (TopStatement | EntryNode | SectionNode)[], ref: SectionRef): SectionNode | undefined {
    let found: SectionNode | undefined;
    for (const statement of statements) {
        if (statement.kind === 'section' && statement.name === ref.name && statement.label === ref.label) {
            found = statement;
        }
    }
    return found;
}

function sectionHeader(ref: SectionRef, depth: number): string {
    const indent = '    '.repeat(depth);
    return ref.label !== undefined ? `${indent}${ref.name} "${ref.label}" {` : `${indent}${ref.name} {`;
}

export function setValueInText(text: string, path: SectionRef[], key: string, value: string): string {
    const lines = text.split('\n');
    const doc = parse(text);

    let scope: (TopStatement | EntryNode | SectionNode)[] = doc.statements;
    let section: SectionNode | undefined;
    let resolvedDepth = 0;

    for (const ref of path) {
        const next = findSection(scope, ref);
        if (!next) break;
        section = next;
        scope = next.children;
        resolvedDepth++;
    }

    if (resolvedDepth === path.length && section) {
        const entry = section.children.find(
            (c): c is EntryNode => c.kind === 'entry' && c.key === key,
        );
        if (entry) {
            const raw = lines[entry.line - 1];
            lines[entry.line - 1] = raw.slice(0, entry.valueStart) + value + raw.slice(entry.valueEnd);
            return lines.join('\n');
        }
        const indent = '    '.repeat(path.length);
        lines.splice(section.endLine - 1, 0, `${indent}${key} = ${value}`);
        return lines.join('\n');
    }

    const missing = path.slice(resolvedDepth);
    const block: string[] = [];
    for (let i = 0; i < missing.length; i++) {
        block.push(sectionHeader(missing[i], resolvedDepth + i));
    }
    block.push(`${'    '.repeat(path.length)}${key} = ${value}`);
    for (let i = missing.length - 1; i >= 0; i--) {
        block.push(`${'    '.repeat(resolvedDepth + i)}}`);
    }

    if (section && resolvedDepth > 0) {
        lines.splice(section.endLine - 1, 0, ...block);
        return lines.join('\n');
    }

    const out = [...lines];
    if (out.length > 0 && out[out.length - 1].trim() !== '') {
        out.push('');
    }
    out.push(...block);
    return out.join('\n');
}

export function removeSectionInText(text: string, ref: SectionRef): string {
    const doc = parse(text);
    const section = findSection(doc.statements, ref);
    if (!section) return text;

    const lines = text.split('\n');
    let end = section.endLine;
    if (lines[end]?.trim() === '') end++;
    lines.splice(section.startLine - 1, end - section.startLine + 1);
    return lines.join('\n');
}

export function getPresetSourceInText(text: string): string | null {
    const doc = parse(text);
    for (const statement of doc.statements) {
        if (statement.kind === 'source' && statement.ref.startsWith('preset:')) {
            return statement.ref.slice('preset:'.length);
        }
    }
    return null;
}

export function setPresetSourceInText(text: string, name: string | null): string {
    const lines = text.split('\n');
    const doc = parse(text);
    const existing = doc.statements.find(
        (s): s is SourceStatement => s.kind === 'source' && s.ref.startsWith('preset:'),
    );
    if (existing) {
        if (name === null) {
            lines.splice(existing.line - 1, 1);
            return lines.join('\n');
        }
        lines[existing.line - 1] = `source = preset:${name}`;
        return lines.join('\n');
    }
    if (name === null) return text;
    return [`source = preset:${name}`, '', ...lines].join('\n');
}

export function getValueInText(text: string, path: SectionRef[], key: string): string | undefined {
    const doc = parse(text);
    let scope: (TopStatement | EntryNode | SectionNode)[] = doc.statements;
    let section: SectionNode | undefined;
    for (const ref of path) {
        section = findSection(scope, ref);
        if (!section) return undefined;
        scope = section.children;
    }
    if (!section) return undefined;
    const entry = section.children.find((c): c is EntryNode => c.kind === 'entry' && c.key === key);
    return entry?.value;
}
