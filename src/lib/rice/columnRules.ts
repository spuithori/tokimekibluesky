import type { Column } from '$lib/types/column';
import type { ColumnRule, ColumnRuleMatch } from './config/model';
import { clampDeckWidth, resolveDeckWidthPx } from '$lib/deckWidth';

const BORDER_STYLE_KEYWORDS = ['solid', 'dashed', 'dotted', 'double', 'none', 'hidden', 'groove', 'ridge', 'inset', 'outset'];

function parseBorder(value: string): { width: string; color: string } | null {
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    const width = parts[0];
    const colorParts = parts.slice(1).filter((p) => !BORDER_STYLE_KEYWORDS.includes(p));
    return { width, color: colorParts.join(' ') };
}

function matchText(pattern: string, target: string | undefined): boolean {
    if (target === undefined) return false;
    if (pattern.length >= 2 && pattern.startsWith('/') && pattern.endsWith('/')) {
        try {
            return new RegExp(pattern.slice(1, -1)).test(target);
        } catch {
            return false;
        }
    }
    return pattern === target;
}

export function matchColumn(match: ColumnRuleMatch, column: Column): boolean {
    if (match.type !== undefined && match.type !== column?.algorithm?.type) return false;
    if (match.name !== undefined && !matchText(match.name, column?.algorithm?.name)) return false;
    if (match.did !== undefined && match.did !== column?.did) return false;
    if (match.handle !== undefined && !matchText(match.handle, column?.handle)) return false;
    return true;
}

export function styleForColumn(rules: ColumnRule[], column: Column): string {
    let style = '';
    const props: Record<string, string> = {};
    for (const rule of rules) {
        if (matchColumn(rule.match, column)) {
            Object.assign(props, rule.props);
        }
    }
    if (props.rounding !== undefined) {
        style += `--deck-border-radius: ${props.rounding};`;
    }
    if (props.opacity !== undefined) {
        style += `--rice-column-opacity: ${props.opacity};`;
    }
    if (props.blur !== undefined) {
        style += `--deck-content-backdrop-filter: blur(${props.blur});`;
    }
    if (props.border !== undefined) {
        style += `--deck-border: ${props.border};`;
        const border = parseBorder(props.border);
        if (border?.color) {
            style += `--deck-border-color: ${border.color};`;
        }
    }
    if (props.divider !== undefined) {
        style += `--deck-divider: ${props.divider};`;
    } else if (props.border !== undefined) {
        style += `--deck-divider: none;`;
    }
    if (props.reactions !== undefined) {
        const parts = props.reactions.split(/\s+/).filter(Boolean);
        if (parts[0] === 'left') {
            style += `--timeline-reaction-justify: flex-start;--timeline-reaction-gap: ${parts[1] ?? '32px'};--timeline-reaction-compact-display: flex;--timeline-reaction-item-width: auto;`;
        } else {
            style += `--timeline-reaction-justify: space-between;--timeline-reaction-gap: 0px;--timeline-reaction-compact-display: grid;--timeline-reaction-item-width: 24px;`;
        }
    }
    if (props.heading !== undefined) {
        if (props.heading === 'show') {
            style += `--rice-heading-mb: 0px;--rice-heading-opacity: 1;--rice-heading-pe: auto;--rice-heading-hover-opacity: 1;--rice-heading-hover-pe: auto;--deck-heading-space: var(--deck-heading-height);`;
        } else {
            style += `--rice-heading-mb: calc(0px - var(--deck-heading-height));--rice-heading-opacity: 0;--rice-heading-pe: none;--deck-heading-space: 0px;`;
            if (props.heading === 'hover') {
                style += `--rice-heading-hover-opacity: 1;--rice-heading-hover-pe: auto;--rice-heading-hotzone-pe: auto;--rice-heading-hint: 0.45;`;
            }
        }
    }
    if (props.titlebar !== undefined) {
        if (props.titlebar === 'hover') {
            style += `--rice-popup-titlebar-opacity: 0;--rice-popup-pt: 0px;`;
        } else {
            style += `--rice-popup-titlebar-opacity: 1;--rice-popup-pt: var(--deck-popup-titlebar-height, 30px);`;
        }
    }
    if (props.width !== undefined) {
        const preset = WIDTH_PRESET_VARS[props.width];
        style += `--rice-column-width: ${preset ?? props.width};`;
        const px = preset ? resolveDeckWidthPx(props.width) : Number.parseFloat(props.width);
        style += `--rice-tile-weight: ${clampDeckWidth(px)};`;
    }
    if (props.background !== undefined) {
        style += `--deck-content-bg-color: ${props.background};`;
    }
    if (props.dim !== undefined) {
        style += `--rice-column-dim: ${props.dim};`;
    }
    if (props.padding !== undefined) {
        style += `--timeline-padding: ${props.padding};`;
    }
    if (props['heading-bg'] !== undefined) {
        style += `--deck-heading-bg-color: ${props['heading-bg']};`;
    }
    if (props.editorheight !== undefined) {
        if (props.editorheight === 'fill') {
            style += `--publish-editor-height: 100%;--publish-editor-flex: 1;--publish-form-flex: 1 1 auto;--publish-drafts-display: none;`;
        } else if (props.editorheight === 'auto') {
            style += `--publish-editor-height: auto;--publish-editor-flex: 0 0 auto;--publish-form-flex: 0 1 auto;--publish-drafts-display: block;`;
        } else {
            style += `--publish-editor-height: ${props.editorheight};--publish-editor-flex: 0 0 auto;`;
        }
    }
    return style;
}

const WIDTH_PRESET_VARS: Record<string, string> = {
    xxs: 'var(--deck-xxs-width)',
    xs: 'var(--deck-xs-width)',
    small: 'var(--deck-s-width)',
    medium: 'var(--deck-m-width)',
    large: 'var(--deck-l-width)',
    xl: 'var(--deck-xl-width)',
    xxl: 'var(--deck-xxl-width)',
};

export function globalStyleForTokens(tokens: Record<string, string>): string {
    let style = '';
    for (const key in tokens) {
        style += `--${key}: ${tokens[key]};`;
    }
    return style;
}
