import { MediaQuery } from 'svelte/reactivity';
import type { Column } from '$lib/types/column';
import { settingsStore } from '$lib/settings/settings.svelte';
import { compile } from './config/compile';
import { emptyCompiledRice, type CompiledRice, type LayoutStyle } from './config/model';
import { resolvePresetSource } from './presets';
import { globalStyleForTokens, styleForColumn } from './columnRules';
import { renderedVerticalBars, shellGeometryVars } from './shellGeometry';
import { moduleThemeTokens } from './modules/registries.svelte';

class RiceState {
    #matchers = new Map<string, MediaQuery>();

    #isActive = (query: string): boolean => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
        let matcher = this.#matchers.get(query);
        if (!matcher) {
            matcher = new MediaQuery(query);
            this.#matchers.set(query, matcher);
        }
        return matcher.current;
    };

    readonly compiled: CompiledRice = $derived.by(() => {
        const rice = settingsStore.rice;
        if (!rice?.enabled) return emptyCompiledRice();
        return compile(rice.config ?? '', (ref) => resolvePresetSource(ref) ?? rice.sources?.[ref], this.#isActive);
    });

    readonly enabled = $derived(settingsStore.rice?.enabled ?? false);
    readonly themeReset = $derived(this.compiled.themeReset);
    readonly diagnostics = $derived(this.compiled.diagnostics);
    readonly bars = $derived(this.compiled.bars);

    readonly statusbar = $derived.by(() => {
        for (const position of ['top', 'bottom'] as const) {
            const bar = this.compiled.bars[position]?.[0];
            if (bar?.kind === 'rice' && bar.style === 'bar' && (bar.items?.length ?? 0) > 0) {
                return { position, modules: bar.items ?? [], float: bar.float, props: bar.props };
            }
        }
        return null;
    });

    readonly sidebar = $derived.by(() => {
        const bar = this.compiled.bars.left?.find((candidate) => candidate.kind === 'native');
        if (!bar) return null;
        return {
            items: bar.items,
            width: bar.props.width,
            showPublish: bar.showPublish,
            showAdd: bar.showAdd,
            showSettings: bar.showSettings,
        };
    });

    readonly footer = $derived.by(() => {
        const bar = this.compiled.bars.footer?.[0];
        if (bar?.kind !== 'rice' || (bar.items?.length ?? 0) === 0) return null;
        return bar;
    });

    readonly leftBars = $derived(renderedVerticalBars(this.compiled.bars, 'left').filter((bar) => bar.kind === 'rice'));
    readonly rightBars = $derived(renderedVerticalBars(this.compiled.bars, 'right').filter((bar) => bar.kind === 'rice'));

    readonly switcher = $derived(this.compiled.switcher);
    readonly fab = $derived(this.compiled.fab);
    readonly publish = $derived(this.compiled.publish);
    readonly layoutMode: 'scroll' | 'tile' = $derived(this.compiled.layout?.mode ?? 'scroll');
    readonly layoutComposer = $derived(this.compiled.layout?.composer ?? null);
    readonly layoutStyle: LayoutStyle = $derived(
        this.compiled.layout?.style ?? (settingsStore.design?.layout === 'decks' ? 'deck' : 'single')
    );
    readonly declaresSingleWidth = $derived('single-m-width' in this.compiled.themeTokens);

    readonly panel = $derived(this.compiled.panel);
    readonly binds = $derived(this.compiled.binds);
    readonly submaps = $derived(this.compiled.submaps);

    readonly globalStyle = $derived.by(() => {
        if (!this.enabled) return '';
        const merged: Record<string, string> = {};
        for (const tokens of moduleThemeTokens.values()) {
            Object.assign(merged, tokens);
        }
        Object.assign(merged, this.compiled.themeTokens);
        return shellGeometryVars(this.compiled.bars, this.compiled.layout, this.compiled.focus, this.compiled.animations, this.compiled.switcher, this.layoutStyle) + globalStyleForTokens(merged);
    });

    styleForColumn(column: Column | undefined): string {
        const rules = this.compiled.columnRules;
        if (!column || rules.length === 0) return '';
        return styleForColumn(rules, column);
    }

    moduleConfig(id: string): { enable: boolean; options: Record<string, string> } | undefined {
        return this.compiled.modules[id];
    }
}

export const riceState = new RiceState();
