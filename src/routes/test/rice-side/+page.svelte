<script lang="ts">
    import '../../styles.css';
    import { tick } from 'svelte';
    import Side from '../../(app)/Side.svelte';
    import Decks from '../../(app)/Decks.svelte';
    import StatusBar from '$lib/components/rice/StatusBar.svelte';
    import RiceBar from '$lib/components/rice/RiceBar.svelte';
    import FooterHost from '../../(app)/FooterHost.svelte';
    import RiceDrawer from '$lib/components/rice/RiceDrawer.svelte';
    import SidePanel from '$lib/components/side/SidePanel.svelte';
    import RiceModulesObserver from '$lib/components/rice/RiceModulesObserver.svelte';
    import RiceLayoutObserver from '$lib/components/rice/RiceLayoutObserver.svelte';
    import RiceEffectLayers from '$lib/components/rice/RiceEffectLayers.svelte';
    import CoreCommandsObserver from '$lib/components/commands/CoreCommandsObserver.svelte';
    import KeybindsObserver from '$lib/components/commands/KeybindsObserver.svelte';
    import { agent } from '$lib/stores';
    import { appState } from '$lib/classes/appState.svelte';
    import { shellResizeState } from '$lib/classes/shellResizeState.svelte';

    const shellPreviewStyle = $derived(
        shellResizeState.previewWidth != null
            ? `--shell-max-width: ${shellResizeState.previewWidth}px;--shell-inset: max(0px, calc((100vw - ${shellResizeState.previewWidth}px) / 2));`
            : ''
    );
    const singleColumnStyle = $derived.by(() => {
        if (shellResizeState.singlePreviewWidth != null) return `--single-column-width: ${shellResizeState.singlePreviewWidth}px;`;
        if (!riceState.declaresSingleWidth && typeof settingsStore.design?.singleWidth === 'number') return `--single-column-width: ${settingsStore.design.singleWidth}px;`;
        return '';
    });
    import { riceState } from '$lib/rice/riceState.svelte';
    import { verticalBarOffset } from '$lib/rice/shellGeometry';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { getColumnState, initColumns } from '$lib/classes/columnState.svelte';
    import { keymodeState } from '$lib/classes/keymodeState.svelte';
    import { scratchpadState } from '$lib/classes/scratchpadState.svelte';
    import { firstLeafId, findTabsNodeOf } from '$lib/classes/deckLayout';
    import { setPostState } from '$lib/classes/postState.svelte';
    import { publishState } from '$lib/classes/publishState.svelte';
    import { sideState } from '$lib/classes/sideState.svelte';
    import { overlayState } from '$lib/classes/overlayState.svelte';
    import { revealState } from '$lib/classes/revealState.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';
    import { db } from '$lib/db';

    const postState = setPostState();
    initColumns({ isDeckLayout: () => riceState.layoutStyle === 'deck' });
    const columnState = getColumnState(false);

    $effect(() => {
        if (columnState.slots.length === 0) {
            columnState.add({
                id: 'rice-side-clock',
                algorithm: { type: 'module:clock', name: 'Clock' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
            columnState.add({
                id: 'rice-side-dummy',
                algorithm: { type: 'module:dummytimeline', name: 'Dummy' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
        }
    });

    let themeStyle = $state(defaultThemeInline());

    if (typeof window !== 'undefined') {
        (window as any).__riceSideTest = {
            ready: true,
            setRiceConfig(config: string) {
                settingsStore.rice.enabled = true;
                settingsStore.rice.config = config;
            },
            setRiceEnabled(enabled: boolean) {
                settingsStore.rice.enabled = enabled;
            },
            setDesignLayout(value: 'decks' | 'default') {
                settingsStore.design.layout = value;
            },
            getRiceConfig() {
                return settingsStore.rice.config;
            },
            keepFirstColumnOnly() {
                columnState.slots = columnState.slots.slice(0, 1);
            },
            keepOnlyDummy() {
                columnState.slots = columnState.slots.filter((slot) => firstLeafId(slot.layout) === 'rice-side-dummy');
            },
            async remountSlots() {
                const slots = columnState.slots;
                columnState.slots = [];
                await tick();
                columnState.slots = slots;
            },
            installFakeAgent(pinnedCount: number = 2) {
                const feeds = ['cats', 'news', 'art', 'games', 'music', 'photo'].slice(0, Math.max(0, pinnedCount - 1));
                const calls = { getV2PinnedFeeds: 0, xrpcGet: 0, getTimeline: 0 };
                (window as any).__agentCalls = calls;
                const base: any = {
                    did: () => 'did:plc:rice-side',
                    handle: () => 'rice-side.test',
                    getV2PinnedFeeds: async () => {
                        calls.getV2PinnedFeeds++;
                        return [
                            { type: 'timeline', value: 'following' },
                            ...feeds.map((name) => ({ type: 'feed', value: `at://did:plc:rice/app.bsky.feed.generator/${name}` })),
                        ];
                    },
                    getTimeline: async () => {
                        calls.getTimeline++;
                        return { cursor: undefined, feed: [] };
                    },
                    xrpc: {
                        get: async (_nsid: string, params: any) => {
                            calls.xrpcGet++;
                            return {
                                view: { displayName: (params?.feed ?? '').split('/').pop() ?? 'Feed' },
                                list: { name: 'List' },
                            };
                        },
                    },
                };
                agent.set(new Proxy(base, {
                    get(target, prop) {
                        if (prop in target) return target[prop];
                        return async () => ({});
                    },
                }) as any);
                appState.ready = true;
            },
            makeFeedTabsDemo() {
                const names: [string, string][] = [
                    ['ft-following', 'Following'],
                    ['ft-discover', 'Discover'],
                    ['ft-cats', 'Cats'],
                    ['ft-news', 'News JP'],
                    ['ft-art', 'Art & Illustration'],
                ];
                for (const [id, name] of names) {
                    if (!columnState.hasColumn(id)) {
                        columnState.add({
                            id,
                            algorithm: { type: 'module:dummytimeline', name },
                            style: 'default',
                            did: '',
                            settings: { width: 'xxs' },
                            data: { cursor: '' },
                        } as any);
                    }
                }
                for (const [id] of names.slice(1)) {
                    columnState.tabifyColumn(id, names[0][0]);
                }
                const node = columnState.tabsNodeOf(names[0][0]);
                if (node) columnState.setTabsMeta(node, { kind: 'feedtabs' });
                columnState.slots = columnState.slots.filter((slot) => firstLeafId(slot.layout) === names[0][0] || findTabsNodeOf(slot.layout, names[0][0]));
            },
            addDummyColumn(id: string, name: string, width: string = 'medium') {
                columnState.add({
                    id,
                    algorithm: { type: 'module:dummytimeline', name },
                    style: 'default',
                    did: '',
                    settings: { width },
                    data: { cursor: '' },
                } as any);
            },
            setColumnIcon(id: string, icon: string) {
                const column = columnState.columns.find((c) => c.id === id);
                if (column) column.settings = { ...column.settings, icon } as any;
            },
            async addDraft(text: string) {
                await db.drafts.add({
                    id: `rice-side-draft-${text}`,
                    createdAt: Date.now(),
                    text,
                    quotePost: undefined,
                    replyRef: undefined,
                    images: [],
                    owner: 'did:plc:rice-side',
                } as any);
            },
            async clearDrafts() {
                await db.drafts.clear();
            },
            addPublishColumn(settings: Record<string, unknown> = {}) {
                if (!columnState.hasColumn('rice-side-publish')) {
                    columnState.add({
                        id: 'rice-side-publish',
                        algorithm: { type: 'publish', name: 'Publish' },
                        style: 'default',
                        did: '',
                        settings: { width: 'medium', ...settings },
                        data: { cursor: '' },
                    } as any);
                }
            },
            seedComposer({ text = '', images = 0, poll = false }: { text?: string; images?: number; poll?: boolean } = {}) {
                const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
                const post = postState.posts?.[postState.index];
                if (!post) return;
                post.text = text;
                post.images = Array.from({ length: images }, (_, i) => ({
                    id: `seed-${i}`,
                    alt: '',
                    file: undefined,
                    base64: px,
                    isGif: false,
                    width: 1,
                    height: 1,
                })) as any;
                if (poll) {
                    post.poll = { options: ['A', 'B'], duration: '1d' } as any;
                }
                postState.pulse = !postState.pulse;
            },
            addPopupColumn() {
                columnState.add({
                    id: 'rice-side-popup',
                    algorithm: { type: 'module:clock', name: 'Popup' },
                    style: 'default',
                    did: '',
                    settings: { width: 'medium', isPopup: true },
                    data: { cursor: '' },
                } as any);
            },
            setThemeStyle(style: string) {
                themeStyle = style;
            },
            appendThemeStyle(extra: string) {
                themeStyle = themeStyle + extra;
            },
            openPublishOverlay() {
                publishState.intercept = undefined;
                publishState.show = true;
            },
            closePublishOverlay() {
                publishState.show = false;
            },
            getPublishMetrics() {
                const measure = (root: Element | null) => {
                    const form = root?.querySelector('.publish-form');
                    if (!form) return null;
                    const scrollArea = root!.querySelector('.editor-scroll-area');
                    const tiptap = root!.querySelector('.tiptap');
                    const toolbar = root!.querySelector('.publish-toolbar');
                    const meta = root!.querySelector('.publish-meta');
                    const tags = root!.querySelector('.publish-tags');
                    const wrap = root!.querySelector('.publish-wrap') ?? (root!.classList?.contains('publish-wrap') ? root : null);
                    return {
                        formRect: form.getBoundingClientRect().toJSON(),
                        formRadius: getComputedStyle(form).borderRadius,
                        formOverflow: getComputedStyle(form).overflow,
                        scrollAreaClientHeight: scrollArea ? scrollArea.clientHeight : null,
                        scrollAreaScrollHeight: scrollArea ? scrollArea.scrollHeight : null,
                        scrollAreaMaxHeight: scrollArea ? getComputedStyle(scrollArea).maxHeight : null,
                        tiptapHeight: tiptap ? tiptap.getBoundingClientRect().height : null,
                        toolbarPosition: toolbar ? getComputedStyle(toolbar).position : null,
                        toolbarRect: toolbar ? toolbar.getBoundingClientRect().toJSON() : null,
                        metaRect: meta ? meta.getBoundingClientRect().toJSON() : null,
                        tagsRect: tags ? tags.getBoundingClientRect().toJSON() : null,
                        wrapScroll: wrap ? { scrollHeight: wrap.scrollHeight, clientHeight: wrap.clientHeight } : null,
                        wrapRect: wrap ? wrap.getBoundingClientRect().toJSON() : null,
                    };
                };
                return {
                    overlay: measure(document.querySelector('.publish-group')),
                    column: measure(document.querySelector('.publish-wrap--column')),
                };
            },
            probePublishCorners(scope: 'overlay' | 'column' = 'column') {
                const root = scope === 'overlay'
                    ? document.querySelector('.publish-group')
                    : document.querySelector('.publish-wrap--column');
                const form = root?.querySelector('.publish-form');
                if (!form) return null;
                const r = form.getBoundingClientRect();
                const probe = (x: number, y: number) => {
                    const el = document.elementFromPoint(x, y);
                    return el
                        ? { insideForm: form.contains(el), tag: el.tagName, cls: String((el as HTMLElement).className ?? '').slice(0, 80) }
                        : null;
                };
                return {
                    bottomLeft: probe(r.left + 4, r.bottom - 5),
                    bottomRight: probe(r.right - 5, r.bottom - 5),
                    bottomCenter: probe(r.left + r.width / 2, r.bottom - 5),
                    center: probe(r.left + r.width / 2, r.top + r.height / 2),
                };
            },
            runCommand(id: string, arg?: string) {
                runCommand(id, arg);
            },
            getMetrics() {
                const side = document.querySelector('.side');
                const panel = document.querySelector('.side-modal');
                const scrim = document.querySelector('.side-panel-scrim');
                const menuBar = document.querySelector('.rice-bar--menu');
                const icon = document.querySelector('.rice-menu-item svg');
                const deck = document.querySelector('.deck');
                const leftSpacer = document.querySelector('.deck-divider--compact');
                const rightSpacer = document.querySelector('.deck-divider--right');
                const rightBar = document.querySelector('.rice-bar--edge-right');
                const statusbar = document.querySelector('.rice-statusbar');
                return {
                    deckWraps: [...document.querySelectorAll('.deck-row-wrap')].map((el) => {
                        const cs = getComputedStyle(el);
                        return {
                            outlineStyle: cs.outlineStyle,
                            outlineWidth: cs.outlineWidth,
                            outlineColor: cs.outlineColor,
                            outlineOffset: cs.outlineOffset,
                            opacity: cs.opacity,
                            hasFocusVisible: !!el.querySelector('.deck-row:focus-visible'),
                        };
                    }),
                    rightBarRect: rightBar ? rightBar.getBoundingClientRect().toJSON() : null,
                    rightSpacerWidth: rightSpacer ? rightSpacer.getBoundingClientRect().width : null,
                    sideRect: side ? side.getBoundingClientRect().toJSON() : null,
                    menuBarRect: menuBar ? menuBar.getBoundingClientRect().toJSON() : null,
                    menuLabels: [...document.querySelectorAll('.rice-menu-item__label')].map((el) => el.textContent),
                    labelWidths: [...document.querySelectorAll('.rice-menu-item__label')].map(
                        (el) => el.getBoundingClientRect().width,
                    ),
                    iconWidth: icon ? icon.getBoundingClientRect().width : null,
                    deckRect: deck ? deck.getBoundingClientRect().toJSON() : null,
                    deckWrapRects: [...document.querySelectorAll('.deck-row-wrap')].map((el) => el.getBoundingClientRect().toJSON()),
                    deckScrollWidth: deck ? deck.scrollWidth : null,
                    deckClientWidth: deck ? deck.clientWidth : null,
                    deckScrollLeft: deck ? deck.scrollLeft : null,
                    leftSpacerWidth: leftSpacer ? leftSpacer.getBoundingClientRect().width : null,
                    statusbarPaddingLeft: statusbar ? getComputedStyle(statusbar).paddingLeft : null,
                    statusbarPaddingRight: statusbar ? getComputedStyle(statusbar).paddingRight : null,
                    verticalBarVisible: !!document.querySelector('.rice-bar--vertical'),
                    nativeSideBarVisible: [...document.querySelectorAll('.side-bar')].some(
                        (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0,
                    ),
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    slotCount: columnState.slots.length,
                    columnsLoaded: columnState.isColumnsLoaded,
                    activeSlotIndex: columnState.activeSlotIndex,
                    windowScrollY: window.scrollY,
                    singleFlow: !!document.querySelector('.deck-single'),
                    deckBox: !!document.querySelector('.deck-box'),
                    keymode: keymodeState.mode,
                    keymodeChip: document.querySelector('.rice-keymode')?.textContent ?? null,
                    slotIds: columnState.slots.map((slot) => firstLeafId(slot.layout)),
                    popupCount: columnState.columns.filter((c) => c.settings?.isPopup).length,
                    scratchpadHidden: scratchpadState.hidden,
                    firstSlotWidth: (() => {
                        const el = document.querySelector('.deck .deck-row-slot');
                        return el ? el.getBoundingClientRect().width : null;
                    })(),
                    sideModalOpen: sideState.openModal,
                    actionCenterOpen: overlayState.actionCenter,
                    panelRect: panel ? panel.getBoundingClientRect().toJSON() : null,
                    scrim: scrim ? { opacity: getComputedStyle(scrim).opacity } : null,
                    diagnosticsCount: riceState.diagnostics.length,
                    deckTabs: (() => {
                        const strip = document.querySelector('.deck-tabs__strip');
                        if (!strip) return null;
                        return {
                            labels: [...strip.querySelectorAll('.deck-tabs__label')].map((el) => el.textContent),
                            activeLabel: strip.querySelector('.deck-tabs__tab--active .deck-tabs__label')?.textContent ?? null,
                            paneCount: document.querySelectorAll('.deck-tabs__pane').length,
                            mountedRows: document.querySelectorAll('.deck-tabs__pane .deck-row').length,
                            inactiveVisibility: [...document.querySelectorAll('.deck-tabs__pane--inactive')].map(
                                (el) => getComputedStyle(el).visibility,
                            ),
                            paneScrollTops: [...document.querySelectorAll('.deck-tabs__pane .deck-row')].map(
                                (el) => (el as HTMLElement).scrollTop,
                            ),
                        };
                    })(),
                    headings: [...document.querySelectorAll('.deck .deck-heading')].map((el) => {
                        const cs = getComputedStyle(el);
                        return { opacity: cs.opacity, marginBottom: cs.marginBottom, pointerEvents: cs.pointerEvents };
                    }),
                    headingHints: [...document.querySelectorAll('.deck .deck-heading-hotzone')].map(
                        (el) => getComputedStyle(el, '::after').opacity,
                    ),
                    popupTitlebar: (() => {
                        const el = document.querySelector('.deck-popup-titlebar');
                        if (!el) return null;
                        const wrap = document.querySelector('.deck-popup-wrap');
                        return {
                            opacity: getComputedStyle(el).opacity,
                            wrapPaddingTop: wrap ? getComputedStyle(wrap).paddingTop : null,
                        };
                    })(),
                    columnWidgets: [...document.querySelectorAll('.rice-widget-column')].map((el) => {
                        const rect = el.getBoundingClientRect();
                        return {
                            height: rect.height,
                            width: rect.width,
                            dummyPosts: el.querySelectorAll('.rice-dummy-post').length,
                            hasLogin: !!el.querySelector('.rice-widget-login'),
                        };
                    }),
                };
            },
        };
    }
</script>

<RiceModulesObserver></RiceModulesObserver>
<RiceLayoutObserver></RiceLayoutObserver>
<CoreCommandsObserver></CoreCommandsObserver>
<KeybindsObserver></KeybindsObserver>
<div class="app-mock app" class:single={riceState.layoutStyle === 'single'} class:rice-headings-reveal={revealState.headings} style={(riceState.themeReset ? '' : themeStyle) + riceState.globalStyle + shellPreviewStyle + singleColumnStyle}>
    <SidePanel></SidePanel>
    <RiceEffectLayers></RiceEffectLayers>
    <StatusBar position="top"></StatusBar>

    <div class="wrap-mock">
        <Side></Side>

        <main class="main-mock">
            <Decks></Decks>
        </main>
    </div>

    <StatusBar position="bottom"></StatusBar>
    {#each riceState.leftBars as bar, index (bar.label ?? index)}
        <RiceBar position="left" config={bar} offset={verticalBarOffset(riceState.leftBars, index)}></RiceBar>
    {/each}
    {#each riceState.rightBars as bar, index (bar.label ?? index)}
        <RiceBar position="right" config={bar} offset={verticalBarOffset(riceState.rightBars, index)}></RiceBar>
    {/each}
    <FooterHost></FooterHost>
    <RiceDrawer></RiceDrawer>
</div>

<style>
    :global(body) {
        margin: 0;
    }

    .app-mock {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
        background-color: var(--app-bg-color);
        color: var(--app-color);
    }

    .wrap-mock {
        display: flex;
        flex: 1;
        min-height: 0;
        min-width: 0;
    }

    .app-mock.single .wrap-mock {
        width: var(--shell-content-width, auto);
        max-width: 100%;
        margin: 0 auto;
        padding-right: var(--side-right-width, 0px);
    }

    @media (max-width: 767px) {
        .wrap-mock {
            display: block;
        }

        .app-mock.single .wrap-mock {
            padding-right: 0;
        }
    }

    .main-mock {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
</style>
