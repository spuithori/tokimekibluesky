import { parse } from './parser';
import { parseCombo } from '$lib/commands/keymap';
import type { AnimationStyle, AnimationTargetConfig, BarConfig, BarGroupName, BarItemSpec, BarPosition, ColumnRule, CompiledRice, EntryNode, FabConfig, PanelConfig, PublishConfig, RiceDiagnostic, SectionNode, SwitcherConfig, TopStatement } from './model';
import { ANIMATION_TARGETS, JS_EASING_KEYWORDS, STYLE_KEYWORDS, STYLE_TARGETS, emptyBar, emptyCompiledRice } from './model';
import { WIDGET_ONLY_IDS } from '../widgetIds';
import { normalizeMediaQuery } from './breakpoints';

export type SourceResolver = (ref: string) => string | undefined;

const TOKEN_KEY_RE = /^[a-z][a-z0-9-]*$/;
const UNSAFE_VALUE_RE = /[;{}"<>]/;

function isUnsafeCssValue(value: string): boolean {
    if (UNSAFE_VALUE_RE.test(value)) return true;
    let depth = 0;
    for (const ch of value) {
        if (ch === '(') {
            depth += 1;
        } else if (ch === ')') {
            depth -= 1;
            if (depth < 0) return true;
        }
    }
    return depth !== 0;
}
const MAX_SOURCE_DEPTH = 8;

function flattenStatements(
    statements: TopStatement[],
    resolveSource: SourceResolver | undefined,
    seen: Set<string>,
    depth: number,
    diagnostics: RiceDiagnostic[],
): TopStatement[] {
    const result: TopStatement[] = [];
    for (const statement of statements) {
        if (statement.kind !== 'source') {
            result.push(statement);
            continue;
        }
        if (!resolveSource) {
            diagnostics.push({ line: statement.line, col: 1, message: 'source はこのコンテキストでは使えません', severity: 'error' });
            continue;
        }
        if (depth >= MAX_SOURCE_DEPTH || seen.has(statement.ref)) {
            diagnostics.push({ line: statement.line, col: 1, message: `source "${statement.ref}" が循環しています`, severity: 'error' });
            continue;
        }
        const text = resolveSource(statement.ref);
        if (text === undefined) {
            diagnostics.push({ line: statement.line, col: 1, message: `source "${statement.ref}" が見つかりません`, severity: 'error' });
            continue;
        }
        const sub = parse(text);
        for (const d of sub.diagnostics) {
            diagnostics.push({ ...d, message: `[${statement.ref}] ${d.message}` });
        }
        result.push(...flattenStatements(sub.statements, resolveSource, new Set([...seen, statement.ref]), depth + 1, diagnostics));
    }
    return result;
}

function substituteVars(value: string, vars: Map<string, string>, line: number, diagnostics: RiceDiagnostic[]): string {
    return value.replace(/\$([a-zA-Z][\w-]*)/g, (whole, name: string) => {
        const resolved = vars.get(name);
        if (resolved === undefined) {
            diagnostics.push({ line, col: 1, message: `未定義の変数 $${name} です`, severity: 'warning' });
            return whole;
        }
        return resolved;
    });
}

function entriesOf(section: SectionNode): EntryNode[] {
    return section.children.filter((c): c is EntryNode => c.kind === 'entry');
}

function sectionsOf(section: SectionNode): SectionNode[] {
    return section.children.filter((c): c is SectionNode => c.kind === 'section');
}

function compileThemeTokens(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    for (const entry of entriesOf(section)) {
        if (entry.key === 'reset') {
            const value = resolve(entry.value, entry.line);
            if (value !== 'true' && value !== 'false') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `theme の reset は true / false のみ指定できます`, severity: 'error' });
                continue;
            }
            out.themeReset = value === 'true';
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `theme のキー "${entry.key}" は不明です（reset / tokens { ... }）`, severity: 'warning' });
        }
    }
    for (const tokens of sectionsOf(section).filter((s) => s.name === 'tokens')) {
        for (const entry of entriesOf(tokens)) {
            if (!TOKEN_KEY_RE.test(entry.key)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `トークン名 "${entry.key}" は英小文字・数字・ハイフンのみ使えます`, severity: 'error' });
                continue;
            }
            const value = resolve(entry.value, entry.line);
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `トークン値に使用できない文字または閉じていない括弧が含まれています(; { } " < > / 括弧)`, severity: 'error' });
                continue;
            }
            out.themeTokens[entry.key] = value;
        }
    }
}

function parseMatch(value: string, line: number, diagnostics: RiceDiagnostic[]): ColumnRule['match'] | null {
    const match: ColumnRule['match'] = {};
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        diagnostics.push({ line, col: 1, message: 'match が空です', severity: 'error' });
        return null;
    }
    if (parts.includes('all')) {
        if (parts.length > 1) {
            diagnostics.push({ line, col: 1, message: `match = all は他の条件と併用できません`, severity: 'error' });
            return null;
        }
        return {};
    }
    for (const part of parts) {
        const sep = part.indexOf(':');
        if (sep === -1) {
            diagnostics.push({ line, col: 1, message: `match の条件 "${part}" は "種別:値" 形式で指定します(all または type: / name: / did: / handle:)`, severity: 'error' });
            return null;
        }
        const field = part.slice(0, sep);
        const target = part.slice(sep + 1);
        if (field !== 'type' && field !== 'name' && field !== 'did' && field !== 'handle') {
            diagnostics.push({ line, col: 1, message: `match の種別 "${field}" は不明です(type / name / did / handle)`, severity: 'error' });
            return null;
        }
        match[field] = target;
    }
    return match;
}

const RULE_PROPS = ['opacity', 'rounding', 'border', 'blur', 'divider', 'reactions', 'heading', 'titlebar', 'width', 'background', 'dim', 'padding', 'heading-bg', 'editorheight'] as const;

const HEADING_MODES = ['show', 'hover', 'hidden'] as const;
const TITLEBAR_MODES = ['show', 'hover'] as const;
export const DECK_WIDTH_PRESETS = ['xxs', 'xs', 'small', 'medium', 'large', 'xl', 'xxl'] as const;
const RULE_WIDTH_PX_RE = /^\d*\.?\d+px$/;

const REACTION_GAP_RE = /^\d*\.?\d+(px|em|rem|%)$/;

function validateReactions(value: string, line: number, diagnostics: RiceDiagnostic[]): string | null {
    const parts = value.split(/\s+/).filter(Boolean);
    const mode = parts[0];
    if (mode !== 'spread' && mode !== 'left') {
        diagnostics.push({ line, col: 1, message: `columnrule の reactions は spread / left [<gap>] で指定します（例: reactions = left 28px）`, severity: 'error' });
        return null;
    }
    if (mode === 'spread' && parts.length > 1) {
        diagnostics.push({ line, col: 1, message: `reactions = spread は引数を取りません`, severity: 'error' });
        return null;
    }
    if (parts.length > 2) {
        diagnostics.push({ line, col: 1, message: `reactions の引数が多すぎます（left [<gap>] の形式で指定します）`, severity: 'error' });
        return null;
    }
    if (parts[1] && !REACTION_GAP_RE.test(parts[1])) {
        diagnostics.push({ line, col: 1, message: `reactions の gap "${parts[1]}" を解釈できません（px / em / rem / % の長さで指定します）`, severity: 'error' });
        return null;
    }
    return parts.join(' ');
}

function compileColumnRule(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    let match: ColumnRule['match'] | null = null;
    const props: Record<string, string> = {};
    for (const entry of entriesOf(section)) {
        if (entry.key === 'match') {
            match = parseMatch(resolve(entry.value, entry.line), entry.line, out.diagnostics);
            continue;
        }
        if (entry.key === 'gap') {
            out.diagnostics.push({ line: entry.line, col: 1, message: 'gap はカラム単位では指定できません。theme > tokens の decks-gap で全体に指定してください', severity: 'warning' });
            continue;
        }
        if (!(RULE_PROPS as readonly string[]).includes(entry.key)) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `columnrule のプロパティ "${entry.key}" は不明です(${RULE_PROPS.join(' / ')})`, severity: 'warning' });
            continue;
        }
        if (entry.key === 'reactions') {
            const normalized = validateReactions(resolve(entry.value, entry.line), entry.line, out.diagnostics);
            if (normalized !== null) {
                props.reactions = normalized;
            }
            continue;
        }
        if (entry.key === 'heading') {
            const value = resolve(entry.value, entry.line);
            if (!(HEADING_MODES as readonly string[]).includes(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `columnrule の heading は ${HEADING_MODES.join(' / ')} のみ指定できます`, severity: 'error' });
                continue;
            }
            props.heading = value;
            continue;
        }
        if (entry.key === 'titlebar') {
            const value = resolve(entry.value, entry.line);
            if (!(TITLEBAR_MODES as readonly string[]).includes(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `columnrule の titlebar は ${TITLEBAR_MODES.join(' / ')} のみ指定できます`, severity: 'error' });
                continue;
            }
            props.titlebar = value;
            continue;
        }
        if (entry.key === 'width') {
            const value = resolve(entry.value, entry.line);
            if (!(DECK_WIDTH_PRESETS as readonly string[]).includes(value) && !RULE_WIDTH_PX_RE.test(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `columnrule の width はプリセット名（${DECK_WIDTH_PRESETS.join(' / ')}）または px 値で指定します（例: width = 420px）`, severity: 'error' });
                continue;
            }
            props.width = value;
            continue;
        }
        if (entry.key === 'dim') {
            const value = resolve(entry.value, entry.line);
            const dim = Number(value);
            if (!Number.isFinite(dim) || dim <= 0 || dim > 1) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `columnrule の dim は 0 より大きく 1 以下の数値で指定します`, severity: 'error' });
                continue;
            }
            props.dim = value;
            continue;
        }
        if (entry.key === 'editorheight') {
            const value = resolve(entry.value, entry.line);
            if (value !== 'fill' && value !== 'auto' && !RULE_WIDTH_PX_RE.test(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `columnrule の editorheight は fill / auto または px 値で指定します（例: editorheight = 320px）`, severity: 'error' });
                continue;
            }
            props.editorheight = value;
            continue;
        }
        const value = resolve(entry.value, entry.line);
        if (isUnsafeCssValue(value)) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字または閉じていない括弧が含まれています(; { } " < > / 括弧)`, severity: 'error' });
            continue;
        }
        props[entry.key] = value;
    }
    if (!match) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'columnrule に match がありません', severity: 'error' });
        return;
    }
    out.columnRules.push({ match, props });
}

const BAR_STYLE_PROPS = ['height', 'width', 'background', 'blur', 'rounding', 'border', 'font-size', 'margin', 'opacity'] as const;
const SWITCHER_STYLE_PROPS = ['height', 'background', 'blur', 'rounding', 'offset'] as const;
const FAB_STYLE_PROPS = ['size', 'rounding', 'offset'] as const;

function assignBar(out: CompiledRice, bar: BarConfig, line: number, inMedia: boolean) {
    const list = out.bars[bar.position];
    if (bar.position === 'left' || bar.position === 'right') {
        if (!list) {
            out.bars[bar.position] = [bar];
            return;
        }
        const index = list.findIndex((existing) => existing.label === bar.label);
        if (index >= 0) {
            if (!inMedia) {
                out.diagnostics.push({ line, col: 1, message: `バー "${bar.label ?? bar.position}" が再宣言されています（後の定義が優先されます）`, severity: 'warning' });
            }
            list[index] = bar;
        } else {
            list.push(bar);
        }
        return;
    }
    if (list && !inMedia) {
        out.diagnostics.push({ line, col: 1, message: `位置 "${bar.position}" のバーが複数定義されています（後の定義が優先されます）`, severity: 'warning' });
    }
    out.bars[bar.position] = [bar];
}

function toSpec(id: string): BarItemSpec {
    return { id, base: id.split('#')[0], options: {} };
}

function splitItems(value: string): string[] {
    return value.split(',').map((m) => m.trim()).filter(Boolean);
}

const GROUP_ALIASES: Record<string, BarGroupName> = {
    start: 'start',
    left: 'start',
    top: 'start',
    center: 'center',
    end: 'end',
    right: 'end',
    bottom: 'end',
};

interface BarSectionData {
    groups: { name: BarGroupName; ids: string[] }[];
    tabSets: { label: string; ids: string[]; line: number }[];
    itemOptions: Map<string, { options: Record<string, string>; line: number }>;
}

function compileItemSection(
    section: SectionNode,
    out: CompiledRice,
    resolve: (value: string, line: number) => string,
    itemOptions: BarSectionData['itemOptions'],
) {
    if (!section.label) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'item にはラベルが必要です（例: item "search" { placeholder = ... }）', severity: 'error' });
        return;
    }
    const options: Record<string, string> = {};
    for (const entry of entriesOf(section)) {
        options[entry.key] = resolve(entry.value, entry.line);
    }
    itemOptions.set(section.label, { options, line: section.startLine });
}

function compileBarSections(
    section: SectionNode,
    sectionName: string,
    out: CompiledRice,
    resolve: (value: string, line: number) => string,
): BarSectionData {
    const groups: BarSectionData['groups'] = [];
    const tabSets: BarSectionData['tabSets'] = [];
    const itemOptions: BarSectionData['itemOptions'] = new Map();
    for (const child of sectionsOf(section)) {
        if (child.name === 'item') {
            compileItemSection(child, out, resolve, itemOptions);
        } else if (child.name === 'tab') {
            if (!child.label) {
                out.diagnostics.push({ line: child.startLine, col: 1, message: 'tab にはラベルが必要です（例: tab "Feeds" { items = feeds }）', severity: 'error' });
                continue;
            }
            let ids: string[] = [];
            for (const entry of entriesOf(child)) {
                if (entry.key === 'items') {
                    ids = splitItems(resolve(entry.value, entry.line));
                } else {
                    out.diagnostics.push({ line: entry.line, col: 1, message: `tab のキー "${entry.key}" は不明です（items。アイテムのオプションは item "<id>" { ... } で指定します）`, severity: 'warning' });
                }
            }
            if (ids.some((id) => id === 'tabs')) {
                out.diagnostics.push({ line: child.startLine, col: 1, message: `tab の中に tabs は置けません（入れ子タブは非対応）`, severity: 'warning' });
                ids = ids.filter((id) => id !== 'tabs');
            }
            for (const inner of sectionsOf(child)) {
                if (inner.name === 'item') {
                    compileItemSection(inner, out, resolve, itemOptions);
                } else {
                    out.diagnostics.push({ line: inner.startLine, col: 1, message: `tab 内のセクション "${inner.name}" は不明です（item）`, severity: 'warning' });
                }
            }
            tabSets.push({ label: child.label, ids, line: child.startLine });
        } else if (child.name === 'group') {
            const name = child.label ? GROUP_ALIASES[child.label] : undefined;
            if (!child.label) {
                out.diagnostics.push({ line: child.startLine, col: 1, message: 'group には名前が必要です（start / center / end。left・top は start、right・bottom は end の別名）', severity: 'error' });
                continue;
            }
            if (!name) {
                out.diagnostics.push({ line: child.startLine, col: 1, message: `group の名前 "${child.label}" は不明です（start / center / end。left・top / right・bottom は別名）`, severity: 'error' });
                continue;
            }
            let ids: string[] = [];
            for (const entry of entriesOf(child)) {
                if (entry.key === 'items') {
                    ids = splitItems(resolve(entry.value, entry.line));
                } else {
                    out.diagnostics.push({ line: entry.line, col: 1, message: `group のキー "${entry.key}" は不明です（items。アイテムのオプションは item "<id>" { ... } で指定します）`, severity: 'warning' });
                }
            }
            for (const inner of sectionsOf(child)) {
                if (inner.name === 'item') {
                    compileItemSection(inner, out, resolve, itemOptions);
                } else {
                    out.diagnostics.push({ line: inner.startLine, col: 1, message: `group 内のセクション "${inner.name}" は不明です（item）`, severity: 'warning' });
                }
            }
            const existing = groups.findIndex((g) => g.name === name);
            if (existing !== -1) {
                out.diagnostics.push({ line: child.startLine, col: 1, message: `グループ "${name}" が複数定義されています（後の定義が優先されます）`, severity: 'warning' });
                groups.splice(existing, 1);
            }
            groups.push({ name, ids });
        } else {
            out.diagnostics.push({ line: child.startLine, col: 1, message: `${sectionName} 内のセクション "${child.name}" は不明です（item / group / tab）`, severity: 'warning' });
        }
    }
    return { groups, tabSets, itemOptions };
}

function finalizeBarItems(
    bar: BarConfig,
    out: CompiledRice,
    data: BarSectionData,
    itemsEntry: { ids: string[]; line: number } | null,
    itemsKey: string,
    sectionLine: number,
) {
    let specs: BarItemSpec[] | null = null;
    if (data.groups.length > 0) {
        if (itemsEntry) {
            out.diagnostics.push({ line: itemsEntry.line, col: 1, message: `${itemsKey} と group が併用されています（group が優先され、この行は無視されます）`, severity: 'warning' });
        }
        bar.groups = data.groups.map((g) => ({ name: g.name, items: g.ids.map(toSpec) }));
        specs = bar.groups.flatMap((g) => g.items);
    } else if (itemsEntry) {
        specs = itemsEntry.ids.map(toSpec);
    }
    let tabSpecs: BarItemSpec[] = [];
    if (data.tabSets.length > 0) {
        bar.tabSets = data.tabSets.map((t) => ({ label: t.label, items: t.ids.map(toSpec) }));
        tabSpecs = bar.tabSets.flatMap((t) => t.items);
        const tabsReferenced = (specs ?? []).some((s) => s.id === 'tabs');
        if (!tabsReferenced) {
            out.diagnostics.push({ line: data.tabSets[0].line, col: 1, message: `tab セクションがありますが ${itemsKey} に tabs が含まれていません（タブは描画されません）`, severity: 'warning' });
        }
    } else if ((specs ?? []).some((s) => s.id === 'tabs')) {
        out.diagnostics.push({ line: itemsEntry?.line ?? sectionLine, col: 1, message: `tabs が参照されていますが tab セクションがありません（tab "ラベル" { items = ... } を定義してください）`, severity: 'warning' });
    }
    if (specs) {
        bar.items = [...specs.map((s) => s.id), ...tabSpecs.map((s) => s.id)];
        bar.itemSpecs = specs;
    } else if (tabSpecs.length > 0) {
        bar.items = tabSpecs.map((s) => s.id);
    }
    for (const spec of [...(specs ?? []), ...tabSpecs]) {
        const item = data.itemOptions.get(spec.id);
        if (item) spec.options = item.options;
    }
    const referenced = new Set([...(specs ?? []), ...tabSpecs].map((s) => s.id));
    for (const [id, item] of data.itemOptions) {
        if (!referenced.has(id)) {
            out.diagnostics.push({ line: item.line, col: 1, message: `item "${id}" は ${itemsKey} に含まれていません（オプションは適用されません）`, severity: 'warning' });
        }
    }
    if (bar.position === 'top' || bar.position === 'bottom' || bar.position === 'footer') {
        const surface = bar.position === 'footer' ? 'footer' : '横バー（top / bottom）';
        const warned = new Set<string>();
        for (const spec of specs ?? []) {
            if ((WIDGET_ONLY_IDS as readonly string[]).includes(spec.base) && !warned.has(spec.base)) {
                warned.add(spec.base);
                out.diagnostics.push({ line: itemsEntry?.line ?? sectionLine, col: 1, message: `"${spec.base}" はウィジェットのため${surface}では描画されません（縦バー left / right に置いてください）`, severity: 'warning' });
            }
            if (spec.base === 'tabs' && !warned.has('tabs')) {
                warned.add('tabs');
                out.diagnostics.push({ line: itemsEntry?.line ?? sectionLine, col: 1, message: `tabs は${surface}では描画されません（縦バー left / right に置いてください）`, severity: 'warning' });
            }
        }
    }
}

function compileStatusbar(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string, inMedia: boolean) {
    const bar = emptyBar('top', 'rice');
    bar.style = 'bar';
    let itemsEntry: { ids: string[]; line: number } | null = null;
    for (const entry of entriesOf(section)) {
        if (entry.key === 'position') {
            const value = resolve(entry.value, entry.line);
            if (value !== 'top' && value !== 'bottom') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `statusbar の position は top / bottom のみ指定できます`, severity: 'error' });
                continue;
            }
            bar.position = value;
        } else if (entry.key === 'modules') {
            itemsEntry = { ids: splitItems(resolve(entry.value, entry.line)), line: entry.line };
        } else if (entry.key === 'float') {
            bar.float = resolve(entry.value, entry.line) !== 'false';
        } else if ((BAR_STYLE_PROPS as readonly string[]).includes(entry.key)) {
            const value = resolve(entry.value, entry.line);
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            bar.props[entry.key] = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `statusbar のキー "${entry.key}" は不明です（position / modules / float / ${BAR_STYLE_PROPS.join(' / ')}）`, severity: 'warning' });
        }
    }
    finalizeBarItems(bar, out, compileBarSections(section, 'statusbar', out, resolve), itemsEntry, 'modules', section.startLine);
    assignBar(out, bar, section.startLine, inMedia);
}

function compileBar(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string, inMedia: boolean) {
    if (!section.label) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'bar には名前が必要です（例: bar "left" { ... }）', severity: 'error' });
        return;
    }
    let position: BarPosition | null = null;
    let style: BarConfig['style'] | null = null;
    let enabled = true;
    const bar = emptyBar('top', 'rice');
    let itemsEntry: { ids: string[]; line: number } | null = null;
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'position') {
            if (value !== 'top' && value !== 'bottom' && value !== 'left' && value !== 'right') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `bar の position は top / bottom / left / right のみ指定できます`, severity: 'error' });
                return;
            }
            position = value;
        } else if (entry.key === 'enable') {
            enabled = value !== 'false';
        } else if (entry.key === 'style') {
            if (value !== 'bar' && value !== 'icons' && value !== 'menu') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `bar の style は bar / icons / menu のみ指定できます`, severity: 'error' });
                continue;
            }
            style = value;
        } else if (entry.key === 'items') {
            itemsEntry = { ids: splitItems(value), line: entry.line };
        } else if (entry.key === 'float') {
            bar.float = value !== 'false';
        } else if ((BAR_STYLE_PROPS as readonly string[]).includes(entry.key)) {
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            bar.props[entry.key] = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `bar のキー "${entry.key}" は不明です（position / style / items / float / enable / ${BAR_STYLE_PROPS.join(' / ')}）`, severity: 'warning' });
        }
    }
    if (!position) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `bar "${section.label}" に position がありません`, severity: 'error' });
        return;
    }
    if (!enabled) {
        const list = out.bars[position];
        if ((position === 'left' || position === 'right') && list?.some((existing) => existing.label === section.label)) {
            const filtered = list.filter((existing) => existing.label !== section.label);
            if (filtered.length > 0) {
                out.bars[position] = filtered;
            } else {
                delete out.bars[position];
            }
        } else {
            delete out.bars[position];
        }
        return;
    }
    bar.label = section.label;
    bar.position = position;
    bar.style = style ?? (position === 'top' || position === 'bottom' ? 'bar' : 'icons');
    if (bar.float && (position === 'left' || position === 'right')) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `float は横バー（top / bottom）でのみ使えます`, severity: 'warning' });
        bar.float = false;
    }
    if (bar.style === 'menu' && position !== 'top' && position !== 'bottom' && !bar.props.width) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `style = menu のバーには width の指定を推奨します（未指定では 64px 相当となりラベルが潰れます）`, severity: 'warning' });
    }
    finalizeBarItems(bar, out, compileBarSections(section, 'bar', out, resolve), itemsEntry, 'items', section.startLine);
    assignBar(out, bar, section.startLine, inMedia);
}

function compileFooter(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string, inMedia: boolean) {
    const bar = emptyBar('footer', 'rice');
    let itemsEntry: { ids: string[]; line: number } | null = null;
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'items') {
            itemsEntry = { ids: splitItems(value), line: entry.line };
        } else if (entry.key === 'float') {
            bar.float = value !== 'false';
        } else if (entry.key === 'reveal') {
            if (value !== 'always' && value !== 'scroll') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `footer の reveal は always / scroll のみ指定できます`, severity: 'error' });
                continue;
            }
            bar.props.reveal = value;
        } else if ((BAR_STYLE_PROPS as readonly string[]).includes(entry.key)) {
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            bar.props[entry.key] = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `footer のキー "${entry.key}" は不明です（items / float / reveal / ${BAR_STYLE_PROPS.join(' / ')}）`, severity: 'warning' });
        }
    }
    finalizeBarItems(bar, out, compileBarSections(section, 'footer', out, resolve), itemsEntry, 'items', section.startLine);
    if ((bar.items?.length ?? 0) === 0) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'footer に items がありません（ネイティブフッターのままです）', severity: 'warning' });
        return;
    }
    assignBar(out, bar, section.startLine, inMedia);
}

function compileDrawer(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string, inMedia: boolean) {
    const bar = emptyBar('drawer', 'rice');
    bar.style = 'menu';
    let itemsEntry: { ids: string[]; line: number } | null = null;
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'items') {
            itemsEntry = { ids: splitItems(value), line: entry.line };
        } else if ((BAR_STYLE_PROPS as readonly string[]).includes(entry.key)) {
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            bar.props[entry.key] = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `drawer のキー "${entry.key}" は不明です（items / ${BAR_STYLE_PROPS.join(' / ')}）`, severity: 'warning' });
        }
    }
    finalizeBarItems(bar, out, compileBarSections(section, 'drawer', out, resolve), itemsEntry, 'items', section.startLine);
    if ((bar.items?.length ?? 0) === 0) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'drawer に items がありません（既定のナビリストのままです）', severity: 'warning' });
        return;
    }
    assignBar(out, bar, section.startLine, inMedia);
}

function compileSwitcher(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    let style: SwitcherConfig['style'] = 'strip';
    let position: SwitcherConfig['position'] | null = null;
    let reveal: SwitcherConfig['reveal'] | null = null;
    let showAdd: boolean | null = null;
    const props: Record<string, string> = {};
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'style') {
            if (value !== 'strip' && value !== 'pill') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `switcher の style は strip / pill のみ指定できます`, severity: 'error' });
                continue;
            }
            style = value;
        } else if (entry.key === 'position') {
            if (value !== 'top' && value !== 'bottom') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `switcher の position は top / bottom のみ指定できます`, severity: 'error' });
                continue;
            }
            position = value;
        } else if (entry.key === 'reveal') {
            if (value !== 'always' && value !== 'scroll' && value !== 'auto') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `switcher の reveal は always / scroll / auto のみ指定できます`, severity: 'error' });
                continue;
            }
            reveal = value;
        } else if (entry.key === 'add-button') {
            showAdd = value !== 'false';
        } else if ((SWITCHER_STYLE_PROPS as readonly string[]).includes(entry.key)) {
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            props[entry.key] = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `switcher のキー "${entry.key}" は不明です（style / position / reveal / add-button / ${SWITCHER_STYLE_PROPS.join(' / ')}）`, severity: 'warning' });
        }
    }
    const pill = style === 'pill';
    out.switcher = {
        style,
        position: position ?? (pill ? 'bottom' : 'top'),
        reveal: reveal ?? (pill ? 'auto' : 'scroll'),
        showAdd: showAdd ?? !pill,
        props,
    };
}

function compileFab(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const fab: FabConfig = out.fab ?? { show: true, position: 'right', props: {} };
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'show') {
            fab.show = value !== 'false';
        } else if (entry.key === 'position') {
            if (value !== 'left' && value !== 'right') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `fab の position は left / right のみ指定できます`, severity: 'error' });
                continue;
            }
            fab.position = value;
        } else if (entry.key === 'on-click') {
            fab.onClick = value;
        } else if ((FAB_STYLE_PROPS as readonly string[]).includes(entry.key)) {
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            fab.props[entry.key] = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `fab のキー "${entry.key}" は不明です（show / position / on-click / ${FAB_STYLE_PROPS.join(' / ')}）`, severity: 'warning' });
        }
    }
    out.fab = fab;
}

function compilePublish(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const publish: PublishConfig = out.publish ?? { lengthRing: false };
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'length-ring') {
            if (value !== 'true' && value !== 'false') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `publish の ${entry.key} は true / false のみ指定できます`, severity: 'error' });
                continue;
            }
            publish.lengthRing = value === 'true';
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `publish のキー "${entry.key}" は不明です（length-ring）`, severity: 'warning' });
        }
    }
    out.publish = publish;
}

function compileSidebar(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const existingNative = out.bars.left?.find((candidate) => candidate.kind === 'native');
    const bar = existingNative ?? emptyBar('left', 'native');
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        switch (entry.key) {
            case 'items':
                bar.items = value.split(',').map((m) => m.trim()).filter(Boolean);
                break;
            case 'width':
                if (isUnsafeCssValue(value)) {
                    out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                    break;
                }
                bar.props.width = value;
                break;
            case 'publish-button':
                bar.showPublish = value !== 'false';
                break;
            case 'add-button':
                bar.showAdd = value !== 'false';
                break;
            case 'settings-button':
                bar.showSettings = value !== 'false';
                break;
            default:
                out.diagnostics.push({ line: entry.line, col: 1, message: `sidebar のキー "${entry.key}" は不明です（items / width / publish-button / add-button / settings-button）`, severity: 'warning' });
        }
    }
    if (out.bars.left?.some((candidate) => candidate.kind === 'rice')) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `bar 定義と sidebar 定義が競合しています（bar が優先されます）`, severity: 'warning' });
        return;
    }
    out.bars.left = [bar];
}

const PANEL_PROPS = ['width', 'background', 'blur', 'rounding', 'border', 'shadow', 'offset'] as const;

function compilePanel(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const panel: PanelConfig = out.panel ?? { position: 'auto', props: {} };
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'position') {
            const normalized = value === 'side' ? 'left' : value;
            if (normalized !== 'auto' && normalized !== 'anchor' && normalized !== 'left' && normalized !== 'right' && normalized !== 'center') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `panel の position は auto / anchor / left / right / center のみ指定できます（side は left の別名）`, severity: 'error' });
                continue;
            }
            panel.position = normalized;
        } else if (entry.key === 'dim') {
            const dim = Number(value);
            if (!Number.isFinite(dim) || dim <= 0 || dim > 1) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `panel の dim は 0 より大きく 1 以下の数値で指定します`, severity: 'error' });
                continue;
            }
            panel.dim = value;
        } else if ((PANEL_PROPS as readonly string[]).includes(entry.key)) {
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            panel.props[entry.key] = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `panel のキー "${entry.key}" は不明です（position / dim / ${PANEL_PROPS.join(' / ')}）`, severity: 'warning' });
        }
    }
    out.panel = panel;
}

const OUTLINE_WIDTH_RE = /(?:^|\s)(\d*\.?\d+(?:px|em|rem))(?:\s|$)/;

function compileFocus(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const focus = out.focus ?? {};
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'outline') {
            if (isUnsafeCssValue(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `プロパティ値に使用できない文字が含まれています（; { } " < > / 括弧不均衡）`, severity: 'error' });
                continue;
            }
            focus.outline = value;
            const width = OUTLINE_WIDTH_RE.exec(value);
            if (width) {
                focus.outlineWidth = width[1];
            }
        } else if (entry.key === 'dim') {
            const dim = Number(value);
            if (!Number.isFinite(dim) || dim <= 0 || dim > 1) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `focus の dim は 0 より大きく 1 以下の数値で指定します`, severity: 'error' });
                continue;
            }
            focus.dim = value;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `focus のキー "${entry.key}" は不明です（outline / dim）`, severity: 'warning' });
        }
    }
    out.focus = focus;
}

const EASING_KEYWORDS = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'];

function parseAnimationDuration(value: string): number | null {
    const match = /^(\d*\.?\d+)(ms|s)?$/.exec(value.trim());
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount < 0) return null;
    return match[2] === 's' ? amount * 1000 : amount;
}

function parseAnimationStyle(tokens: string[], entry: EntryNode, out: CompiledRice): AnimationStyle | null {
    const [head, ...rest] = tokens;
    if (head === 'fade') {
        if (rest.length > 0) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `style "fade" は引数を取りません`, severity: 'error' });
            return null;
        }
        return { kind: 'fade' };
    }
    if (head === 'popin') {
        if (rest.length > 1) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `style "popin" の引数はパーセント1つのみです（例: popin 95%）`, severity: 'error' });
            return null;
        }
        let scale = 0.95;
        if (rest.length === 1) {
            const match = /^(\d*\.?\d+)%?$/.exec(rest[0]);
            const percent = match ? Number(match[1]) : NaN;
            if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `popin のパーセントは 0 より大きく 100 以下で指定します（例: popin 95%）`, severity: 'error' });
                return null;
            }
            scale = percent / 100;
        }
        return { kind: 'popin', scale };
    }
    if (head === 'blur') {
        if (rest.length > 1) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `style "blur" の引数は半径1つのみです（例: blur 8px）`, severity: 'error' });
            return null;
        }
        if (rest.length === 1) {
            const match = /^(\d*\.?\d+)(px)?$/.exec(rest[0]);
            const radius = match ? Number(match[1]) : NaN;
            if (!Number.isFinite(radius)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `blur の半径を解釈できません（例: blur 8px）`, severity: 'error' });
                return null;
            }
            return { kind: 'blur', radius };
        }
        return { kind: 'blur' };
    }
    const style: AnimationStyle = { kind: 'slide' };
    for (const token of rest) {
        if (token === 'left' || token === 'right' || token === 'top' || token === 'bottom') {
            if (style.direction) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `slide の方向が重複しています`, severity: 'error' });
                return null;
            }
            style.direction = token;
        } else if (/^\d/.test(token)) {
            const match = /^(\d*\.?\d+)(px)?$/.exec(token);
            const distance = match ? Number(match[1]) : NaN;
            if (!Number.isFinite(distance) || style.distance !== undefined) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `slide の距離を解釈できません（例: slide left 24px）`, severity: 'error' });
                return null;
            }
            style.distance = distance;
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `slide のトークン "${token}" は不明です（left / right / top / bottom / <距離>px）`, severity: 'error' });
            return null;
        }
    }
    return style;
}

function compileAnimation(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const animations = out.animations ?? { enabled: true, targets: {} };
    const beziers: Record<string, { css: string; points: [number, number, number, number] }> = {};

    for (const entry of entriesOf(section)) {
        if (entry.key !== 'bezier') continue;
        const parts = resolve(entry.value, entry.line).split(',').map((p) => p.trim());
        if (parts.length !== 5) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `bezier は "名前, x1, y1, x2, y2" 形式で指定します`, severity: 'error' });
            continue;
        }
        const [name, ...rest] = parts;
        const numbers = rest.map(Number);
        if (!name || numbers.some((n) => !Number.isFinite(n))) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `bezier は "名前, x1, y1, x2, y2" 形式で指定します`, severity: 'error' });
            continue;
        }
        if ((STYLE_KEYWORDS as readonly string[]).includes(name)) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `bezier 名 "${name}" は style キーワードのため使えません（${STYLE_KEYWORDS.join(' / ')}）`, severity: 'error' });
            continue;
        }
        if (numbers[0] < 0 || numbers[0] > 1 || numbers[2] < 0 || numbers[2] > 1) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `bezier の x1 / x2 は 0〜1 の範囲で指定します`, severity: 'error' });
            continue;
        }
        beziers[name] = { css: `cubic-bezier(${numbers.join(', ')})`, points: numbers as [number, number, number, number] };
    }

    for (const entry of entriesOf(section)) {
        if (entry.key === 'bezier') continue;
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'enabled') {
            animations.enabled = value !== 'false';
            continue;
        }
        if (!(ANIMATION_TARGETS as readonly string[]).includes(entry.key)) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `animation のキー "${entry.key}" は不明です（enabled / bezier / ${ANIMATION_TARGETS.join(' / ')}）`, severity: 'warning' });
            continue;
        }
        if (value === 'off') {
            animations.targets[entry.key] = { duration: 0, easing: 'linear' };
            continue;
        }
        const fields = value.split(',').map((p) => p.trim());
        const duration = parseAnimationDuration(fields[0] ?? '');
        if (duration === null) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `duration を解釈できません（例: 250ms / 0.25s / 250）`, severity: 'error' });
            continue;
        }
        let easing = 'ease';
        let easingFn: string | undefined;
        let bezier: [number, number, number, number] | undefined;
        const styles: AnimationStyle[] = [];
        let curveSeen = false;
        let failed = false;
        for (const field of fields.slice(1)) {
            const tokens = field.split(/\s+/).filter(Boolean);
            const head = tokens[0];
            if (!head) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `空のフィールドがあります（duration[, curve][, style...] の形式で指定します）`, severity: 'error' });
                failed = true;
                break;
            }
            if ((STYLE_KEYWORDS as readonly string[]).includes(head)) {
                const parsed = parseAnimationStyle(tokens, entry, out);
                if (!parsed) {
                    failed = true;
                    break;
                }
                if (styles.some((s) => s.kind === parsed.kind)) {
                    out.diagnostics.push({ line: entry.line, col: 1, message: `style "${parsed.kind}" が重複しています`, severity: 'error' });
                    failed = true;
                    break;
                }
                if (!(STYLE_TARGETS as readonly string[]).includes(entry.key)) {
                    out.diagnostics.push({ line: entry.line, col: 1, message: `target "${entry.key}" は style に対応していません（duration / curve のみ）`, severity: 'warning' });
                } else {
                    styles.push(parsed);
                }
            } else if (beziers[head] || EASING_KEYWORDS.includes(head) || (JS_EASING_KEYWORDS as readonly string[]).includes(head)) {
                if (curveSeen) {
                    out.diagnostics.push({ line: entry.line, col: 1, message: `curve が重複しています`, severity: 'error' });
                    failed = true;
                    break;
                }
                if (tokens.length > 1) {
                    out.diagnostics.push({ line: entry.line, col: 1, message: `curve に余分なトークンがあります（"${field}"）`, severity: 'error' });
                    failed = true;
                    break;
                }
                curveSeen = true;
                const named = beziers[head];
                if (named) {
                    easing = named.css;
                    bezier = named.points;
                } else if ((JS_EASING_KEYWORDS as readonly string[]).includes(head)) {
                    easing = 'ease-out';
                    easingFn = head;
                } else {
                    easing = head;
                }
            } else {
                out.diagnostics.push({ line: entry.line, col: 1, message: `"${head}" を解釈できません（curve: ${[...EASING_KEYWORDS, ...JS_EASING_KEYWORDS, ...Object.keys(beziers)].join(' / ')} / style: ${STYLE_KEYWORDS.join(' / ')}）`, severity: 'error' });
                failed = true;
                break;
            }
        }
        if (failed) continue;
        const target: AnimationTargetConfig = { duration, easing };
        if (easingFn) target.easingFn = easingFn;
        if (bezier) target.bezier = bezier;
        if (styles.length) target.styles = styles;
        animations.targets[entry.key] = target;
    }

    out.animations = animations;
}

function compileLayout(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const layout = out.layout ?? { align: 'left' as const };
    let touchedShellFields = false;
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'style' || entry.key === 'shell' || entry.key === 'shellwidth') {
            touchedShellFields = true;
        }
        if (entry.key === 'align') {
            if (value !== 'left' && value !== 'center' && value !== 'right') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `layout の align は left / center / right のみ指定できます`, severity: 'error' });
                continue;
            }
            layout.align = value;
        } else if (entry.key === 'mode') {
            if (value !== 'scroll' && value !== 'tile') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `layout の mode は scroll / tile のみ指定できます`, severity: 'error' });
                continue;
            }
            layout.mode = value;
        } else if (entry.key === 'shell') {
            if (value !== 'none' && value !== 'centered') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `layout の shell は none / centered のみ指定できます`, severity: 'error' });
                continue;
            }
            layout.shell = value;
        } else if (entry.key === 'shellwidth') {
            if (!/^\d*\.?\d+(px|rem|vw)$/.test(value)) {
                out.diagnostics.push({ line: entry.line, col: 1, message: `layout の shellwidth は px / rem / vw 単位で指定してください（例: 1240px）`, severity: 'error' });
                continue;
            }
            layout.shellWidth = value;
        } else if (entry.key === 'feedtabs') {
            if (value !== 'pinned') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `layout の feedtabs は pinned のみ指定できます`, severity: 'error' });
                continue;
            }
            layout.feedTabs = 'pinned';
        } else if (entry.key === 'style') {
            if (value !== 'deck' && value !== 'single') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `layout の style は deck / single のみ指定できます`, severity: 'error' });
                continue;
            }
            layout.style = value;
        } else if (entry.key === 'composer') {
            if (value !== 'top') {
                out.diagnostics.push({ line: entry.line, col: 1, message: `layout の composer は top のみ指定できます`, severity: 'error' });
                continue;
            }
            layout.composer = 'top';
        } else {
            out.diagnostics.push({ line: entry.line, col: 1, message: `layout のキー "${entry.key}" は不明です（align / mode / shell / shellwidth / feedtabs / style / composer）`, severity: 'warning' });
        }
    }
    if (touchedShellFields && layout.style === 'single' && layout.shell === 'centered' && layout.shellWidth !== undefined) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `style = single では shellwidth は無視されます（シェル幅はカラム幅から導出されます）`, severity: 'warning' });
    }
    out.layout = layout;
}

function compileBind(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    for (const entry of entriesOf(section)) {
        if (parseCombo(entry.key) === null) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `キーコンボ "${entry.key}" を解釈できません（例: ctrl+k / mod+shift+l / alt+1）`, severity: 'error' });
            continue;
        }
        const command = resolve(entry.value, entry.line);
        if (!command) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `bind のコマンドが空です`, severity: 'error' });
            continue;
        }
        out.binds.push({ combo: entry.key, command });
    }
}

function compileSubmap(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    if (!section.label) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'submap にはラベルが必要です（例: submap "resize" { l = column.width +50 }）', severity: 'error' });
        return;
    }
    const binds = out.submaps[section.label] ?? [];
    for (const entry of entriesOf(section)) {
        const combo = parseCombo(entry.key);
        if (combo === null) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `キーコンボ "${entry.key}" を解釈できません（例: ctrl+k / mod+shift+l / alt+1）`, severity: 'error' });
            continue;
        }
        if (combo.key === 'escape' && !combo.ctrl && !combo.alt && !combo.shift && !combo.meta) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `esc は常に submap を抜けるため submap 内でバインドできません`, severity: 'warning' });
            continue;
        }
        const command = resolve(entry.value, entry.line);
        if (!command) {
            out.diagnostics.push({ line: entry.line, col: 1, message: `bind のコマンドが空です`, severity: 'error' });
            continue;
        }
        binds.push({ combo: entry.key, command });
    }
    out.submaps[section.label] = binds;
}

function checkSubmapReferences(out: CompiledRice) {
    const allBinds = [...out.binds, ...Object.values(out.submaps).flat()];
    for (const bind of allBinds) {
        const parts = bind.command.split(/\s+/);
        if (parts[0] === 'submap.enter' && parts[1] && out.submaps[parts[1]] === undefined) {
            out.diagnostics.push({ line: 1, col: 1, message: `submap "${parts[1]}" が定義されていません（submap "${parts[1]}" { ... } を追加してください）`, severity: 'warning' });
        }
    }
}

function compileModule(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    if (!section.label) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'module にはラベルが必要です(例: module "clock" { ... })', severity: 'error' });
        return;
    }
    const config = out.modules[section.label] ?? { enable: true, options: {} };
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'enable') {
            config.enable = value !== 'false';
        } else {
            config.options[entry.key] = value;
        }
    }
    out.modules[section.label] = config;
}

const PLUGIN_ID_RE = /^[a-z][a-z0-9-]*$/;

function compilePlugin(section: SectionNode, out: CompiledRice, resolve: (value: string, line: number) => string) {
    const id = section.name.slice('plugin:'.length);
    if (!PLUGIN_ID_RE.test(id)) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `プラグインID "${id}" が不正です(小文字英数字とハイフンのみ: plugin:aurora { ... })`, severity: 'error' });
        return;
    }
    if (section.label) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `plugin:${id} にラベルは不要です`, severity: 'warning' });
    }
    const config = out.plugins[id] ?? { enable: true, options: {} };
    for (const entry of entriesOf(section)) {
        const value = resolve(entry.value, entry.line);
        if (entry.key === 'enable') {
            config.enable = value !== 'false';
        } else {
            config.options[entry.key] = value;
        }
    }
    out.plugins[id] = config;
}

export type MediaMatcher = (query: string) => boolean;

function dispatchSection(
    statement: SectionNode,
    out: CompiledRice,
    resolve: (value: string, line: number) => string,
    isActive: MediaMatcher,
    inMedia: boolean,
) {
    if (statement.name.startsWith('plugin:')) {
        compilePlugin(statement, out, resolve);
        return;
    }
    switch (statement.name) {
        case 'theme':
            compileThemeTokens(statement, out, resolve);
            break;
        case 'columnrule':
            compileColumnRule(statement, out, resolve);
            break;
        case 'statusbar':
            compileStatusbar(statement, out, resolve, inMedia);
            break;
        case 'footer':
            compileFooter(statement, out, resolve, inMedia);
            break;
        case 'drawer':
            compileDrawer(statement, out, resolve, inMedia);
            break;
        case 'switcher':
            compileSwitcher(statement, out, resolve);
            break;
        case 'fab':
            compileFab(statement, out, resolve);
            break;
        case 'publish':
            compilePublish(statement, out, resolve);
            break;
        case 'sidebar':
            compileSidebar(statement, out, resolve);
            break;
        case 'bar':
            compileBar(statement, out, resolve, inMedia);
            break;
        case 'bind':
            compileBind(statement, out, resolve);
            break;
        case 'submap':
            compileSubmap(statement, out, resolve);
            break;
        case 'panel':
            compilePanel(statement, out, resolve);
            break;
        case 'layout':
            compileLayout(statement, out, resolve);
            break;
        case 'focus':
            compileFocus(statement, out, resolve);
            break;
        case 'animation':
            compileAnimation(statement, out, resolve);
            break;
        case 'module':
            compileModule(statement, out, resolve);
            break;
        case 'media':
            compileMedia(statement, out, resolve, isActive, inMedia);
            break;
        default:
            out.diagnostics.push({
                line: statement.startLine,
                col: 1,
                message: `セクション "${statement.name}" は不明です(このバージョンでは無視されます)`,
                severity: 'warning',
            });
    }
}

function compileMedia(
    section: SectionNode,
    out: CompiledRice,
    resolve: (value: string, line: number) => string,
    isActive: MediaMatcher,
    inMedia: boolean,
) {
    if (inMedia) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'media はネストできません', severity: 'error' });
        return;
    }
    const query = section.label !== undefined ? normalizeMediaQuery(section.label) : null;
    if (!query) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: 'media には条件が必要です（例: media "mobile" { ... } / media "max-width: 767px" { ... }）', severity: 'error' });
        return;
    }
    if (UNSAFE_VALUE_RE.test(query)) {
        out.diagnostics.push({ line: section.startLine, col: 1, message: `media の条件 "${section.label}" はメディアクエリとして解釈できない可能性があります`, severity: 'warning' });
    }
    if (!out.mediaQueries.includes(query)) {
        out.mediaQueries.push(query);
    }
    const active = isActive(query);
    const target = active ? out : emptyCompiledRice();
    for (const child of section.children) {
        if (child.kind === 'entry') {
            out.diagnostics.push({ line: child.line, col: 1, message: `media 直下にキー "${child.key}" は書けません（セクションで囲んでください）`, severity: 'error' });
            continue;
        }
        dispatchSection(child, target, resolve, isActive, true);
    }
    if (!active) {
        out.diagnostics.push(...target.diagnostics);
    }
}

export function compile(text: string, resolveSource?: SourceResolver, isActive: MediaMatcher = () => false): CompiledRice {
    const out = emptyCompiledRice();
    const doc = parse(text);
    out.diagnostics.push(...doc.diagnostics);

    const statements = flattenStatements(doc.statements, resolveSource, new Set(), 0, out.diagnostics);
    const vars = new Map<string, string>();
    const resolve = (value: string, line: number) => substituteVars(value, vars, line, out.diagnostics);

    for (const statement of statements) {
        switch (statement.kind) {
            case 'var':
                vars.set(statement.name, resolve(statement.value, statement.line));
                break;
            case 'set':
                out.sets.push({ path: statement.path, value: resolve(statement.value, statement.line) });
                break;
            case 'section':
                dispatchSection(statement, out, resolve, isActive, false);
                break;
        }
    }

    checkSubmapReferences(out);

    return out;
}
