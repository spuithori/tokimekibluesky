export interface RiceDiagnostic {
    line: number;
    col: number;
    message: string;
    severity: 'error' | 'warning';
}

export interface EntryNode {
    kind: 'entry';
    key: string;
    value: string;
    line: number;
    valueStart: number;
    valueEnd: number;
}

export interface SectionNode {
    kind: 'section';
    name: string;
    label?: string;
    children: (EntryNode | SectionNode)[];
    startLine: number;
    endLine: number;
}

export interface VarStatement {
    kind: 'var';
    name: string;
    value: string;
    line: number;
}

export interface SetStatement {
    kind: 'set';
    path: string;
    value: string;
    line: number;
}

export interface SourceStatement {
    kind: 'source';
    ref: string;
    line: number;
}

export type TopStatement = VarStatement | SetStatement | SourceStatement | SectionNode;

export interface RiceDocument {
    statements: TopStatement[];
    diagnostics: RiceDiagnostic[];
}

export interface ColumnRuleMatch {
    type?: string;
    name?: string;
    did?: string;
    handle?: string;
}

export interface ColumnRule {
    match: ColumnRuleMatch;
    props: Record<string, string>;
}

export interface StatusbarConfig {
    position: 'top' | 'bottom';
    modules: string[];
    float: boolean;
    props: Record<string, string>;
}

export interface SidebarConfig {
    items: string[] | null;
    width?: string;
    showPublish: boolean;
    showAdd: boolean;
    showSettings: boolean;
}

export type BarPosition = 'top' | 'bottom' | 'left' | 'right';
export type BarStyle = 'bar' | 'icons' | 'menu';
export type BarGroupName = 'start' | 'center' | 'end';

export interface BarItemSpec {
    id: string;
    base: string;
    options: Record<string, string>;
}

export interface BarGroup {
    name: BarGroupName;
    items: BarItemSpec[];
}

export interface BarTabSet {
    label: string;
    items: BarItemSpec[];
}

export interface BarConfig {
    kind: 'rice' | 'native';
    position: BarPosition;
    style: BarStyle;
    items: string[] | null;
    itemSpecs: BarItemSpec[] | null;
    groups: BarGroup[] | null;
    tabSets: BarTabSet[] | null;
    float: boolean;
    props: Record<string, string>;
    showPublish: boolean;
    showAdd: boolean;
    showSettings: boolean;
}

export function emptyBar(position: BarPosition, kind: 'rice' | 'native'): BarConfig {
    return {
        kind,
        position,
        style: position === 'top' || position === 'bottom' ? 'bar' : 'icons',
        items: null,
        itemSpecs: null,
        groups: null,
        tabSets: null,
        float: false,
        props: {},
        showPublish: true,
        showAdd: true,
        showSettings: true,
    };
}

export interface RiceBind {
    combo: string;
    command: string;
}

export interface PanelConfig {
    position: 'auto' | 'anchor' | 'left' | 'right' | 'center';
    dim?: string;
    props: Record<string, string>;
}

export interface LayoutConfig {
    align: 'left' | 'center' | 'right';
}

export interface FocusConfig {
    outline?: string;
    outlineWidth?: string;
    dim?: string;
}

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

export type AnimationStyle =
    | { kind: 'slide'; direction?: SlideDirection; distance?: number }
    | { kind: 'fade' }
    | { kind: 'popin'; scale: number }
    | { kind: 'blur'; radius?: number };

export interface AnimationTargetConfig {
    duration: number;
    easing: string;
    easingFn?: string;
    bezier?: [number, number, number, number];
    styles?: AnimationStyle[];
}

export interface AnimationsConfig {
    enabled: boolean;
    targets: Record<string, AnimationTargetConfig>;
}

export const ANIMATION_TARGETS = ['panel', 'menu', 'modal', 'tooltip', 'reorder', 'hover'] as const;

export const STYLE_TARGETS = ['panel', 'menu', 'modal'] as const;

export const STYLE_KEYWORDS = ['slide', 'fade', 'popin', 'blur'] as const;

export const JS_EASING_KEYWORDS = ['bounce', 'elastic', 'back'] as const;

export interface CompiledRice {
    themeTokens: Record<string, string>;
    themeReset: boolean;
    columnRules: ColumnRule[];
    bars: Partial<Record<BarPosition, BarConfig>>;
    panel: PanelConfig | null;
    layout: LayoutConfig | null;
    focus: FocusConfig | null;
    animations: AnimationsConfig | null;
    binds: RiceBind[];
    submaps: Record<string, RiceBind[]>;
    modules: Record<string, { enable: boolean; options: Record<string, string> }>;
    sets: { path: string; value: string }[];
    diagnostics: RiceDiagnostic[];
}

export function emptyCompiledRice(): CompiledRice {
    return {
        themeTokens: {},
        themeReset: false,
        columnRules: [],
        bars: {},
        panel: null,
        layout: null,
        focus: null,
        animations: null,
        binds: [],
        submaps: {},
        modules: {},
        sets: [],
        diagnostics: [],
    };
}
