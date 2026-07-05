import type { AnimationsConfig, CompiledRice, FocusConfig, LayoutConfig, SwitcherConfig } from './config/model';
import { ANIMATION_TARGETS } from './config/model';

export function shellGeometryVars(
    bars: CompiledRice['bars'],
    layout: LayoutConfig | null = null,
    focus: FocusConfig | null = null,
    animations: AnimationsConfig | null = null,
    switcher: SwitcherConfig | null = null,
): string {
    let style = '';

    const left = bars.left;
    if (left?.props.width) {
        style += `--side-width: ${left.props.width};`;
    }

    const right = bars.right;
    if (right?.kind === 'rice' && (right.items?.length ?? 0) > 0) {
        style += `--side-right-width: ${right.props.width ?? '64px'};`;
    }

    for (const position of ['top', 'bottom'] as const) {
        const bar = bars[position];
        if (bar?.kind === 'rice' && (bar.items?.length ?? 0) > 0) {
            const height = bar.props.height ?? '32px';
            const total = bar.float
                ? `calc(${height} + ${bar.props.margin ?? '8px'} * 2)`
                : height;
            style += `--rice-statusbar-${position}-height: ${total};`;
        }
    }

    const footer = bars.footer;
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

    if (layout?.align === 'center') {
        style += '--deck-justify: safe center;';
    } else if (layout?.align === 'right') {
        style += '--deck-justify: safe flex-end;--single-align-mr: 0;';
    } else if (layout?.align === 'left') {
        style += '--single-align-ml: 0;';
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
