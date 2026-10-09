import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TokenGroup, TokenKind } from './catalog';

export const EXCLUDED: readonly RegExp[] = [
    /^--font-body$/, /^--ui-font$/, /^--code-font$/,
    /-font-size$/,
    /^--(deck|single)-(xxs|xs|s|m|l|xl|xxl)-width$/,
    /^--safe-area-bottom$/,
    /^--bubble-canvas$/,
];

export const INTERNAL: readonly string[] = ['--deck-col-width', '--deck-inner-radius', '--popup-height', '--slider-fill', '--visual-viewport-height'];

export const ROLE_KINDS: Readonly<Record<string, TokenKind>> = {
    '--surface-panel': 'background', '--surface-raised': 'background', '--surface-overlay': 'background', '--scrim': 'background',
    '--on-accent': 'color', '--on-danger': 'color', '--state-hover': 'color', '--state-selected': 'color',
    '--accent-glow': 'shadow', '--elevation-1': 'shadow', '--elevation-2': 'shadow', '--elevation-3': 'shadow',
    '--radius-control': 'length', '--radius-card': 'length', '--radius-overlay': 'length',
    '--radius-media': 'length', '--radius-round': 'length',
    '--state-pressed': 'color', '--focus-ring': 'border', '--focus-ring-offset': 'length',
    '--selection-bg': 'color', '--selection-color': 'color', '--caret-color': 'color', '--control-accent': 'color',
    '--motion-duration-hover': 'other', '--motion-easing-hover': 'other', '--motion-duration-overlay': 'other', '--motion-easing-overlay': 'other',
};

export const UNDECLARED: readonly string[] = [
    '--warning-color',
    '--bar-current-icon-color',
    '--bubble-heading-bg-color', '--bubble-single-bg-color', '--bubble-inset', '--bubble-page-inset', '--bubble-decks-gap',
    '--bubble-decks-padding-left', '--bubble-scroll-bar-border-radius', '--bubble-column-bg-color', '--bubble-column-border-color',
    '--bubble-heading-icon-bg-color',
    '--feed-avatar-border-radius', '--timeline-embed-border-radius',
    '--thread-guide-width', '--thread-guide-color', '--thread-guide-radius', '--thread-guide-hover-color',
    '--focus-item-border', '--focus-item-bg', '--focus-item-border-radius',
];

const BASE = /^--(bg-color|text-color|border-color|color-theme|primary-color|secondary-color|success-color|danger-color|warning-color|follow-color|current-theme-color|base-|link-|box-shadow-color|blurred-|border-radius-|app-|default-|avatar-|icon-stroke)/;

export const GROUP_ORDER: readonly TokenGroup[] = ['base', 'role', 'side', 'deck', 'timeline', 'publish', 'bubble', 'other'];

export function groupOf(name: string): TokenGroup {
    if (ROLE_KINDS[name]) return 'role';
    if (/^--bubble-/.test(name)) return 'bubble';
    if (/^--(publish|popup)-/.test(name)) return 'publish';
    if (/^--(timeline|thread|notification|notifications)-/.test(name)) return 'timeline';
    if (/^--(deck|decks|single|row|column|bg-vail)-/.test(name)) return 'deck';
    if (/^--(side|nav|bar|menu|settings)-/.test(name)) return 'side';
    if (BASE.test(name)) return 'base';
    return 'other';
}

export function kindOf(name: string): TokenKind {
    if (ROLE_KINDS[name]) return ROLE_KINDS[name];
    if (/backdrop-filter$/.test(name)) return 'filter';
    if (/^--deck-rim$|-bar-color$/.test(name)) return 'background';
    if (/(shadow|glow)$/.test(name)) return 'shadow';
    if (/(-image|-bg-image)$/.test(name)) return 'image';
    if (/-bg-color$|^--(app|base|base-dark|blurred|blurred-dark)-bg-color$/.test(name)) return 'background';
    if (/-color(-\d+)?$|^--color-theme-|-color-primary-colored$/.test(name)) return 'color';
    if (/-border(-(left|right|top|bottom))?$/.test(name)) return 'border';
    if (/(radius|width|height|gap|padding|margin|inset|size|top|right|bottom|left|inset-end)(-\w+)?$/.test(name)) return 'length';
    return 'other';
}

export function definedTokens(root: string): string[] {
    const names: string[] = [];
    for (const path of ['src/routes/vars.css', 'src/routes/theme.css']) {
        for (const [, name] of readFileSync(join(root, path), 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)) {
            if (!names.includes(name)) names.push(name);
        }
    }
    return names;
}

export function referencedTokens(root: string): Set<string> {
    const names = new Set<string>();
    for (const path of globSync('src/**/*.{svelte,css}', { cwd: root })) {
        for (const [, name] of readFileSync(join(root, path), 'utf8').matchAll(/var\((--[a-z0-9-]+)/g)) names.add(name);
    }
    for (const path of globSync('src/**/*.ts', { cwd: root })) {
        for (const [, name] of readFileSync(join(root, path), 'utf8').matchAll(/getPropertyValue\('(--[a-z0-9-]+)'\)/g)) names.add(name);
    }
    return names;
}

export function collectCatalog(root: string): Array<{ name: string; group: TokenGroup; kind: TokenKind }> {
    const names = definedTokens(root).filter((name) => !EXCLUDED.some((re) => re.test(name)));
    for (const name of [...Object.keys(ROLE_KINDS), ...UNDECLARED]) {
        if (!names.includes(name)) names.push(name);
    }
    return names
        .map((name) => ({ name, group: groupOf(name), kind: kindOf(name) }))
        .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

export function renderCatalog(root: string): string {
    const body = collectCatalog(root).map((t) => `    ['${t.name}', '${t.group}', '${t.kind}'],`).join('\n');
    return `import type { TokenGroup, TokenKind } from './catalog';\n\nexport const CATALOG: ReadonlyArray<readonly [string, TokenGroup, TokenKind]> = [\n${body}\n];\n`;
}
