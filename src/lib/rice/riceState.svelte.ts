import type { Column } from '$lib/types/column';
import { settingsStore } from '$lib/settings/settings.svelte';
import { compile } from './config/compile';
import { emptyCompiledRice, type CompiledRice } from './config/model';
import { resolvePresetSource } from './presets';
import { globalStyleForTokens, styleForColumn } from './columnRules';
import { shellGeometryVars } from './shellGeometry';
import { moduleThemeTokens } from './modules/registries.svelte';

class RiceState {
    readonly compiled: CompiledRice = $derived.by(() => {
        const rice = settingsStore.rice;
        if (!rice?.enabled) return emptyCompiledRice();
        return compile(rice.config ?? '', (ref) => resolvePresetSource(ref) ?? rice.sources?.[ref]);
    });

    readonly enabled = $derived(settingsStore.rice?.enabled ?? false);
    readonly themeReset = $derived(this.compiled.themeReset);
    readonly diagnostics = $derived(this.compiled.diagnostics);
    readonly bars = $derived(this.compiled.bars);

    readonly statusbar = $derived.by(() => {
        for (const position of ['top', 'bottom'] as const) {
            const bar = this.compiled.bars[position];
            if (bar?.kind === 'rice' && bar.style === 'bar' && (bar.items?.length ?? 0) > 0) {
                return { position, modules: bar.items ?? [], float: bar.float, props: bar.props };
            }
        }
        return null;
    });

    readonly sidebar = $derived.by(() => {
        const bar = this.compiled.bars.left;
        if (bar?.kind !== 'native') return null;
        return {
            items: bar.items,
            width: bar.props.width,
            showPublish: bar.showPublish,
            showAdd: bar.showAdd,
            showSettings: bar.showSettings,
        };
    });

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
        return shellGeometryVars(this.compiled.bars, this.compiled.layout, this.compiled.focus, this.compiled.animations) + globalStyleForTokens(merged);
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
