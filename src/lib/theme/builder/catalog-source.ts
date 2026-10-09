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
    '--focus-ring': 'border', '--focus-ring-offset': 'length',
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
    '--side-column-add-button-box-shadow',
    '--app-wallpaper', '--app-wallpaper-display', '--side-bg-image',
    '--side-rail-fade', '--deck-under-side', '--button-border-bg-color',
    '--bar-bottom-bg', '--bar-bottom-backdrop-filter', '--bar-bottom-box-shadow', '--bar-bottom-item-bg',
    '--publish-mobile-bg', '--publish-backdrop-display', '--publish-backdrop-filter', '--publish-toggle-bg', '--publish-toggle-box-shadow',
    '--glass-wallpaper', '--surface-overlay-backdrop-filter', '--surface-overlay-inner',
    '--side-popup-bg', '--side-popup-backdrop-filter',
    '--overlay-bg-color-1', '--overlay-bg-color-2', '--overlay-bg-color-3', '--overlay-deck-bg', '--overlay-heading-bg', '--overlay-heading-backdrop-filter',
    '--side-popup-item-bg', '--side-popup-item-border', '--side-menu-divider-icon-bg',
    '--radio-boxed-bg', '--radio-boxed-box-shadow', '--radio-boxed-hover-bg', '--radio-boxed-checked-bg', '--radio-boxed-checked-box-shadow',
    '--layout-radio-bg', '--layout-radio-current-bg', '--layout-radio-current-box-shadow',
    '--toggle-track-bg', '--toggle-track-box-shadow', '--toggle-track-checked-bg', '--toggle-track-checked-box-shadow', '--toggle-knob-bg', '--toggle-knob-box-shadow',
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
    if (/^--deck-rim$|-bar-color$|^--(app|glass)-wallpaper$|^--side-rail-fade$|^--surface-overlay-inner$|^--side-popup-bg$|^--overlay-(bg-color-[123]|deck-bg|heading-bg)$/.test(name) || (/-bg$/.test(name) && !/^--color-theme-/.test(name))) return 'background';
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
