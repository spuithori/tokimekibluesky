import type { AnimationsConfig, BarConfig, CompiledRice, FocusConfig, LayoutConfig, LayoutStyle, SwitcherConfig } from './config/model';
import { ANIMATION_TARGETS } from './config/model';

export function renderedVerticalBars(bars: CompiledRice['bars'], position: 'left' | 'right'): BarConfig[] {
    return (bars[position] ?? []).filter(
        (bar) => bar.kind === 'native' || (bar.kind === 'rice' && (bar.items?.length ?? 0) > 0),
    );
}

function sumWidths(widths: string[]): string | null {
    if (widths.length === 0) return null;
    if (widths.length === 1) return widths[0];
    return `calc(${widths.join(' + ')})`;
}

export function verticalBarOffset(rendered: BarConfig[], index: number): string {
    const preceding = rendered.slice(0, index).map((bar) => bar.props.width ?? '64px');
    return sumWidths(preceding) ?? '0px';
}

export function shellGeometryVars(
    bars: CompiledRice['bars'],
    layout: LayoutConfig | null = null,
    focus: FocusConfig | null = null,
    animations: AnimationsConfig | null = null,
    switcher: SwitcherConfig | null = null,
    resolvedStyle: LayoutStyle = 'deck',
): string {
    let style = '';

    const left = bars.left ?? [];
    if (left.some((bar) => bar.props.width)) {
        const total = sumWidths(left.map((bar) => bar.props.width ?? '64px'));
        if (total) style += `--side-width: ${total};`;
    }

    const right = (bars.right ?? []).filter((bar) => bar.kind === 'rice' && (bar.items?.length ?? 0) > 0);
    if (right.length > 0) {
        const total = sumWidths(right.map((bar) => bar.props.width ?? '64px'));
        if (total) style += `--side-right-width: ${total};`;
    }

    for (const position of ['top', 'bottom'] as const) {
        const bar = bars[position]?.[0];
        if (bar?.kind === 'rice' && (bar.items?.length ?? 0) > 0) {
            const height = bar.props.height ?? '32px';
            const total = bar.float
                ? `calc(${height} + ${bar.props.margin ?? '8px'} * 2)`
                : height;
            style += `--rice-statusbar-${position}-height: ${total};`;
        }
    }

    const footer = bars.footer?.[0];
    if (footer?.kind === 'rice' && (footer.items?.length ?? 0) > 0) {
        const height = footer.props.height ?? '56px';
        const total = footer.float
            ? `calc(${height} + ${footer.props.margin ?? '8px'} * 2)`
            : height;
        style += `--rice-footer-height: ${total};`;
    }

    if (switcher && (switcher.style === 'pill' || switcher.position === 'bottom')) {
        style += '--rice-switcher-top-height: 0px;';
    }

    if (layout?.shell === 'centered') {
        if (resolvedStyle === 'single') {
            style += '--shell-content-width: calc(var(--side-width, 64px) + var(--single-column-width, var(--single-m-width, 528px)) + var(--side-right-width, 0px));';
            style += '--shell-inset: max(0px, calc((100vw - var(--shell-content-width)) / 2));';
        } else {
            const shellWidth = layout.shellWidth ?? '1280px';
            style += `--shell-inset: max(0px, calc((100vw - ${shellWidth}) / 2));--shell-max-width: ${shellWidth};`;
        }
    }

    if (layout?.align === 'center') {
        style += '--deck-justify: safe center;';
    } else if (layout?.align === 'right') {
        style += '--deck-justify: safe flex-end;--single-align-mr: var(--shell-inset, 0px);';
    } else if (layout?.align === 'left') {
        style += '--single-align-ml: var(--shell-inset, 0px);';
    }

    if (focus?.outline) {
        style += `--deck-focused-outline: ${focus.outline};`;
        if (focus.outlineWidth) {
            style += `--deck-focused-outline-width: ${focus.outlineWidth};`;
        }
    }
    if (focus?.dim) {
        style += `--deck-unfocused-dim: ${focus.dim};`;
    }

    if (animations) {
        if (!animations.enabled) {
            for (const target of ANIMATION_TARGETS) {
                style += `--anim-${target}-duration: 0ms;`;
            }
        } else {
            for (const [target, config] of Object.entries(animations.targets)) {
                style += `--anim-${target}-duration: ${config.duration}ms;`;
                if (config.duration > 0) {
                    style += `--anim-${target}-easing: ${config.easing};`;
                }
            }
        }
    }

    return style;
}
