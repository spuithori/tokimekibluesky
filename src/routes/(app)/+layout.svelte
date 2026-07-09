<script lang="ts">
    import { _, locale, setLocale } from "tokimeki-i18n";
    import { settingsStore } from "$lib/settings/settings.svelte";
    import { intlRelativeTimeFormatState } from "$lib/classes/intlRelativeTimeFormatState.svelte";
    import "../styles.css";
    import {
        isColumnModalOpen,
        isMobileDataConnection,
        listAddModal,
        settings,
        theme,
        bluefeedAddModal,
    } from "$lib/stores";
    import { goto, beforeNavigate, afterNavigate } from "$app/navigation";
    import { markJunkModalNavStart } from "$lib/junkModalTransition";
    import { dev } from "$app/environment";
    import { injectAnalytics } from "@vercel/analytics/sveltekit";
    import { tick, untrack } from "svelte";
    import { Toaster } from "svelte-sonner";
    import viewPortSetting from "$lib/viewport";
    import FooterHost from "./FooterHost.svelte";
    import { page } from "$app/state";
    import { themesDb } from "$lib/db";
    import ReportObserver from "$lib/components/report/ReportObserver.svelte";
    import ProfileStatusObserver from "$lib/components/acp/ProfileStatusObserver.svelte";
    import Side from "./Side.svelte";
    import ColumnModal from "$lib/components/column/ColumnModal.svelte";
    import Decks from "./Decks.svelte";
    import NotificationCountObserver from "$lib/components/utils/NotificationCountObserver.svelte";
    import { builtInThemes } from "$lib/builtInThemes";
    import { defaultColors } from "$lib/defaultColors";
    import OfficialListAddObserver from "$lib/components/list/OfficialListAddObserver.svelte";
    import RealtimeListenersObserver from "$lib/components/realtime/RealtimeListenersObserver.svelte";
    import LinkWarningModal from "$lib/components/post/LinkWarningModal.svelte";
    import { isMobile } from "$lib/detectDevice";
    import WelcomeModal from "$lib/components/utils/WelcomeModal.svelte";
    import BluefeedAddObserver from "$lib/components/list/BluefeedAddObserver.svelte";
    import ChatUpdateObserver from "$lib/components/utils/ChatUpdateObserver.svelte";
    import { initColumns } from "$lib/classes/columnState.svelte";
    import { on } from "svelte/events";
    import { sideState } from "$lib/classes/sideState.svelte";
    import TokBackground from "$lib/components/utils/TokBackground.svelte";
    import UpdateBanner from "$lib/components/utils/UpdateBanner.svelte";
    import { setPostState } from "$lib/classes/postState.svelte";
    import { imageState } from "$lib/classes/imageState.svelte";
    import { comicReaderState } from "$lib/classes/comicReaderState.svelte";
    import ImageModal from "$lib/components/utils/ImageModal.svelte";
    import ComicReaderModal from "$lib/components/utils/ComicReaderModal.svelte";
    import "@fontsource-variable/inter";
    import "@fontsource-variable/noto-sans-jp";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import { appState } from "$lib/classes/appState.svelte";
    import { revealState } from "$lib/classes/revealState.svelte";
    import { riceState } from "$lib/rice/riceState.svelte";
    import { shellResizeState } from "$lib/classes/shellResizeState.svelte";

    const shellPreviewStyle = $derived(
        shellResizeState.previewWidth != null
            ? `--shell-max-width: ${shellResizeState.previewWidth}px;--shell-inset: max(0px, calc((100vw - ${shellResizeState.previewWidth}px) / 2));`
            : ''
    );
    const singleColumnStyle = $derived.by(() => {
        if (shellResizeState.singlePreviewWidth != null) return `--single-column-width: ${shellResizeState.singlePreviewWidth}px;`;
        if (!riceState.declaresSingleWidth && typeof $settings.design?.singleWidth === 'number') return `--single-column-width: ${$settings.design.singleWidth}px;`;
        return '';
    });
    import { themeInlineStyle } from "$lib/theme/inlineStyle";
    import { applyRiceSets } from "$lib/rice/apply";
    import StatusBar from "$lib/components/rice/StatusBar.svelte";
    import RiceBar from "$lib/components/rice/RiceBar.svelte";
    import { verticalBarOffset } from "$lib/rice/shellGeometry";
    import RiceModulesObserver from "$lib/components/rice/RiceModulesObserver.svelte";
    import RiceLayoutObserver from "$lib/components/rice/RiceLayoutObserver.svelte";
    import RiceEffectLayers from "$lib/components/rice/RiceEffectLayers.svelte";
    import CoreCommandsObserver from "$lib/components/commands/CoreCommandsObserver.svelte";
    import KeybindsObserver from "$lib/components/commands/KeybindsObserver.svelte";
    import CommandPalette from "$lib/components/commands/CommandPalette.svelte";
    import ActionCenter from "$lib/components/commands/ActionCenter.svelte";
    import Orbit from "$lib/components/commands/Orbit.svelte";
    import SidePanel from "$lib/components/side/SidePanel.svelte";
    import RiceDrawer from "$lib/components/rice/RiceDrawer.svelte";
    import { initCompositorHeartbeat } from "$lib/compositorHeartbeat";

    if (typeof window !== 'undefined') {
        if (localStorage.getItem('compositorHeartbeat') !== 'off') {
            initCompositorHeartbeat();
        }
        const jankProbeMode = localStorage.getItem('jankProbe');
        if (jankProbeMode) {
            import('$lib/jankProbe').then((m) => m.initJankProbe(jankProbeMode));
        }
    }

    injectAnalytics({
        mode: dev ? "development" : "production",
        beforeSend(event) {
            if (
                event.url === "https://tokimeki.blue/" ||
                event.url === "https://tokimekibluesky.vercel.app/"
            ) {
                return event;
            }
            return null;
        },
    });

    interface Props {
        children?: import("svelte").Snippet;
    }
    let { children }: Props = $props();

    let app = $state();
    let baseColor = $state("#fff");
    let isRepeater = $state(localStorage.getItem("isRepeater") === "true");
    let preferredDarkMode = $state(
        window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    let isDarkMode = $derived.by(() => {
        if ($theme?.options?.darkmodeDisabled) {
            return false;
        }

        if ($settings?.design?.darkmode === true) {
            return true;
        } else if ($settings?.design?.darkmode === "prefer") {
            return preferredDarkMode;
        } else {
            return false;
        }
    });

    function detectHeadThemeColor(theme) {
        tick().then(() => {
            baseColor = app
                ? getComputedStyle(app).getPropertyValue("--base-bg-color")
                : "#fff";
            document.documentElement.style.backgroundColor = baseColor;
        });
    }

    function getCurrentTheme(skin) {
        const isBuiltInTheme = builtInThemes.find(
            (_theme) => _theme.name === skin,
        );

        untrack(() => {
            if (isBuiltInTheme) {
                $theme = isBuiltInTheme;
            } else {
                themesDb.themes.get(skin).then((value) => {
                    $theme = value;
                });
            }
        });
    }

    function observeColor(theme) {
        if (!theme) {
            return false;
        }

        untrack(() => {
            const colors = Array.isArray(theme.options?.colors)
                ? theme.options.colors
                : defaultColors;

            if (!colors.length) {
                return false;
            }

            if (!colors.some((color) => color.id === $settings.design?.theme)) {
                $settings.design.theme = colors[0].id;
            }
        });
    }

    if (navigator.connection) {
        navigator.connection.addEventListener("change", () => {
            isMobileDataConnection.set(
                navigator.connection.type === "cellular",
            );
        });
    }

    $effect(() => {
        const language = settingsStore.general?.language || window.navigator.language;
        setLocale(language);
        intlRelativeTimeFormatState.changeLocale(language);
    });

    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then((res) => {
            console.log(`Storage persisted: ${res}`);
        });
    }

    function handleColumnModalClose() {
        isColumnModalOpen.set(false);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!event.shiftKey || event.key !== "S") return;

        const activeElement = document.activeElement;
        if (
            activeElement?.tagName === "INPUT" ||
            activeElement?.tagName === "TEXTAREA" ||
            activeElement?.classList.contains("tiptap")
        ) {
            return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element =
            container.nodeType === Node.TEXT_NODE
                ? container.parentElement
                : (container as Element);
        if (!element?.closest("[data-timeline-text]")) return;

        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        event.preventDefault();
        goto(`/search?q=${encodeURIComponent(selectedText)}`);
    }

    function outputInlineStyle(theme) {
        if (riceState.themeReset) {
            return '';
        }
        return themeInlineStyle(theme, {
            colorId: $settings.design?.theme,
            bubble: $settings?.design?.bubbleTimeline,
            darkmode: isDarkMode,
        });
    }

    appState.init();
    viewPortSetting();
    setPostState();
    initColumns({ isDeckLayout: () => riceState.layoutStyle === 'deck' });
    applyRiceSets();

    const savedScrollPositions = new Map<
        string,
        { scroll: { x: number; y: number } | null; modalTop: number | null }
    >();

    beforeNavigate(({ from }) => {
        markJunkModalNavStart();
        if (!from?.url) return;
        const key = from.url.pathname + from.url.search;
        const modal = document.querySelector(
            ".modal-page-content",
        ) as HTMLElement | null;
        savedScrollPositions.set(key, {
            scroll: from.scroll,
            modalTop: modal ? modal.scrollTop : null,
        });
    });

    afterNavigate(({ to, type }) => {
        if (type !== "popstate" || !to?.url) return;
        const key = to.url.pathname + to.url.search;
        const saved = savedScrollPositions.get(key);
        if (!saved) return;

        tick().then(() => {
            if (
                riceState.layoutStyle === 'deck' &&
                saved.modalTop !== null
            ) {
                const modal = document.querySelector(
                    ".modal-page-content",
                ) as HTMLElement | null;
                if (modal) modal.scrollTop = saved.modalTop;
            } else if (saved.scroll) {
                window.scrollTo(saved.scroll.x, saved.scroll.y);
            }
        });
    });

    $effect(() => {
        getCurrentTheme($settings.design?.skin);
    });

    $effect(() => {
        observeColor($theme);
        detectHeadThemeColor($theme);
    });

    $effect(() => {
        if ($settings?.design?.darkmode === "prefer") {
            const query = window.matchMedia("(prefers-color-scheme: dark)");

            return on(query, "change", (e) => {
                preferredDarkMode = e.matches;
            });
        }
    });

    $effect(() => {
        const visualViewport = window.visualViewport;

        return on(visualViewport, "resize", () => {
            document.documentElement.style.setProperty(
                "--visual-viewport-height",
                `${visualViewport.height}px`,
            );
        });
    });

    $effect(() => {
        if ($locale === "ko") {
            import("@fontsource-variable/noto-sans-kr/wght.css");
        }
    });

    $effect(() => {
        if ($settings?.design?.fontTheme === "murecho") {
            import("@fontsource-variable/murecho/wght.css");
        }

        if ($settings?.design?.fontTheme === "zenmaru") {
            import("@fontsource/zen-maru-gothic/index.css");
        }
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
    <meta name="theme-color" content={baseColor} />
    <link rel="canonical" href="https://tokimeki.blue{page.url.pathname}" />

    {#if $settings?.embed?.x}
        <script>
            window.twttr = (function (d, s, id) {
                var js,
                    fjs = d.getElementsByTagName(s)[0],
                    t = window.twttr || {};
                if (d.getElementById(id)) return t;
                js = d.createElement(s);
                js.id = id;
                js.src = "https://platform.twitter.com/widgets.js";
                fjs.parentNode.insertBefore(js, fjs);

                t._e = [];
                t.ready = function (f) {
                    t._e.push(f);
                };

                return t;
            })(document, "script", "twitter-wjs");
        </script>
    {/if}
</svelte:head>

<div
    class="app {$_('dir', {
        default: 'ltr',
    })} lang-{$locale} font-size-{$settings.design?.fontSize ||
        2} font-theme-{$settings?.design?.fontTheme || 'default'}"
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:single={riceState.layoutStyle === 'single'}
    class:ios={isMobile.iOS()}
    class:left-mode={$settings?.design?.leftMode}
    class:superstar={$settings.design?.reactionMode === "superstar"}
    class:bubble={$settings?.design?.bubbleTimeline}
    class:monochrome={$settings?.design?.monochrome}
    class:rice-headings-reveal={revealState.headings}
    style={outputInlineStyle($theme) + riceState.globalStyle + shellPreviewStyle + singleColumnStyle}
    dir={$_("dir")}
    bind:this={app}
>
    {#if appState.ready}
        <StatusBar position="top"></StatusBar>

        <div
            class="wrap"
            class:layout-decks={riceState.layoutStyle === 'deck'}
        >
            <Side></Side>

            <main class="main">
                <Decks></Decks>

                {@render children?.()}
            </main>
        </div>

        <StatusBar position="bottom"></StatusBar>
        {#each riceState.leftBars as bar, index (bar.label ?? index)}
            <RiceBar position="left" config={bar} offset={verticalBarOffset(riceState.leftBars, index)}></RiceBar>
        {/each}
        {#each riceState.rightBars as bar, index (bar.label ?? index)}
            <RiceBar position="right" config={bar} offset={verticalBarOffset(riceState.rightBars, index)}></RiceBar>
        {/each}

        {#if $isColumnModalOpen}
            <ColumnModal onclose={handleColumnModalClose}></ColumnModal>
        {/if}

        {#if $listAddModal.open}
            <OfficialListAddObserver></OfficialListAddObserver>
        {/if}

        {#if $bluefeedAddModal.open}
            <BluefeedAddObserver></BluefeedAddObserver>
        {/if}

        {#if !isRepeater}
            <WelcomeModal on:close={() => (isRepeater = true)}></WelcomeModal>
        {/if}

        <NotificationCountObserver></NotificationCountObserver>
        <RealtimeListenersObserver></RealtimeListenersObserver>

        {#if !$settings?.general?.disableChat}
            <ChatUpdateObserver></ChatUpdateObserver>
        {/if}

        <FooterHost></FooterHost>
    {:else}
        <div class="top-loading">
            <LoadingSpinner></LoadingSpinner>
        </div>
    {/if}

    <Toaster
        position="top-center"
        theme={isDarkMode ? "dark" : "light"}
        closeButton
    ></Toaster>
    <ReportObserver></ReportObserver>
    <ProfileStatusObserver></ProfileStatusObserver>
    <LinkWarningModal></LinkWarningModal>
    <UpdateBanner></UpdateBanner>
    <CoreCommandsObserver></CoreCommandsObserver>
    <KeybindsObserver></KeybindsObserver>
    <CommandPalette></CommandPalette>
    <ActionCenter></ActionCenter>
    <Orbit></Orbit>
    <SidePanel></SidePanel>
    <RiceDrawer></RiceDrawer>
    <RiceModulesObserver></RiceModulesObserver>
    <RiceLayoutObserver></RiceLayoutObserver>
    <RiceEffectLayers></RiceEffectLayers>

    {#if sideState.isTokStart}
        <TokBackground></TokBackground>
    {/if}

    {#if imageState.images.length}
        <ImageModal></ImageModal>
    {/if}

    {#if comicReaderState.pages.length}
        <ComicReaderModal></ComicReaderModal>
    {/if}
</div>

<style lang="postcss">
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
    }

    .wrap {
        display: flex;

        @media (max-width: 767px) {
            display: block;
        }
    }

    .main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .single {
        --deck-heading-height: calc(52px + 4px);
        background-attachment: fixed;

        .wrap {
            width: var(--shell-content-width, auto);
            max-width: 100%;
            margin: 0 var(--single-align-mr, auto) 0 var(--single-align-ml, auto);
            padding-right: var(--side-right-width, 0px);

            @media (max-width: 767px) {
                padding-right: 0;
            }
        }
    }

    .top-loading {
        height: 100vh;
        display: grid;
        place-content: center;
    }
</style>
