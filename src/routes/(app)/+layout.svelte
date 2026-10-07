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
    import { beforeNavigate, afterNavigate } from "$app/navigation";
    import { dev } from "$app/environment";
    import { injectAnalytics } from "@vercel/analytics/sveltekit";
    import { tick, untrack } from "svelte";
    import { Toaster } from "svelte-sonner";
    import viewPortSetting from "$lib/viewport";
    import Footer from "./Footer.svelte";
    import { page } from "$app/state";
    import { themesDb } from "$lib/db";
    import ReportObserver from "$lib/components/report/ReportObserver.svelte";
    import EmbedDetachObserver from "$lib/components/utils/EmbedDetachObserver.svelte";
    import ProfileStatusObserver from "$lib/components/acp/ProfileStatusObserver.svelte";
    import Side from "./Side.svelte";
    import ColumnModal from "$lib/components/column/ColumnModal.svelte";
    import Single from "./Single.svelte";
    import Decks from "./Decks.svelte";
    import NotificationCountObserver from "$lib/components/utils/NotificationCountObserver.svelte";
    import { findBuiltinTheme } from "$lib/theme/installed";
    import { compileThemeStyle, resolveVariantKey } from "$lib/theme/format";
    import OfficialListAddObserver from "$lib/components/list/OfficialListAddObserver.svelte";
    import RealtimeListenersObserver from "$lib/components/realtime/RealtimeListenersObserver.svelte";
    import LinkWarningModal from "$lib/components/post/LinkWarningModal.svelte";
    import AiConsentDialog from "$lib/components/ai/AiConsentDialog.svelte";
    import { isMobile } from "$lib/detectDevice";
    import BluefeedAddObserver from "$lib/components/list/BluefeedAddObserver.svelte";
    import ChatUpdateObserver from "$lib/components/utils/ChatUpdateObserver.svelte";
    import { getColumnState, initColumns } from "$lib/classes/columnState.svelte";
    import { onboardingState } from "$lib/onboarding/onboardingState.svelte";
    import { on } from "svelte/events";
    import { attachCompositorHeartbeat } from "$lib/compositorHeartbeat";
    import { sideState } from "$lib/classes/sideState.svelte";
    import TokBackground from "$lib/components/utils/TokBackground.svelte";
    import UpdateBanner from "$lib/components/utils/UpdateBanner.svelte";
    import BskyStatusBanner from "$lib/components/utils/BskyStatusBanner.svelte";
    import SupportPrompt from "$lib/components/utils/SupportPrompt.svelte";
    import { supportPromptState } from "$lib/support/supportPromptState.svelte";
    import { bskyStatusState } from "$lib/classes/bskyStatusState.svelte";
    import { setPostState } from "$lib/classes/postState.svelte";
    import { imageState } from "$lib/classes/imageState.svelte";
    import { comicReaderState } from "$lib/classes/comicReaderState.svelte";
    import ImageModal from "$lib/components/utils/ImageModal.svelte";
    import ComicReaderModal from "$lib/components/utils/ComicReaderModal.svelte";
    import "@fontsource-variable/inter";
    import "@fontsource-variable/noto-sans-jp";
    import BootStatus from "$lib/components/utils/BootStatus.svelte";
    import { appState } from "$lib/classes/appState.svelte";
    import { recordError } from "$lib/errorLog";
    import { shortcutManager } from "$lib/keyboard/shortcutManager.svelte";
    import ShortcutHelp from "$lib/keyboard/ShortcutHelp.svelte";

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
    let preferredDarkMode = $state(
        window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    let isDarkMode = $derived.by(() => {
        if ($theme && !$theme.record.dark) {
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
        const builtin = findBuiltinTheme(skin);

        untrack(() => {
            if (builtin) {
                $theme = builtin;
            } else {
                themesDb.themes.get(skin).then(async (value) => {
                    if (!value && typeof skin === "string" && skin.startsWith("at://")) {
                        value = await import("$lib/theme/atproto")
                            .then(async ({ fetchRemoteTheme, installRemoteTheme }) => installRemoteTheme(await fetchRemoteTheme(skin)))
                            .then(({ installed }) => installed)
                            .catch(() => undefined);
                    }
                    if ($settings.design?.skin === skin) {
                        $theme = value;
                    }
                });
            }
        });
    }

    function checkThemeUpdates() {
        import("$lib/theme/updates")
            .then(({ runThemeUpdateCheck }) => runThemeUpdateCheck())
            .catch((e) => console.error(e));
    }

    function observeColor(theme) {
        if (!theme) {
            return;
        }

        untrack(() => {
            const key = resolveVariantKey(theme.record, $settings.design?.theme);
            if (key && key !== $settings.design?.theme) {
                $settings.design.theme = key;
            }
        });
    }

    const themeImageUrls = $derived.by(() => {
        const images = $theme?.images;
        if (!images) {
            return {};
        }
        return Object.fromEntries(Object.entries(images).map(([key, blob]) => [key, URL.createObjectURL(blob)]));
    });

    $effect(() => {
        const urls = themeImageUrls;
        return () => {
            for (const url of Object.values(urls)) {
                URL.revokeObjectURL(url);
            }
        };
    });

    $effect(() => {
        if (!navigator.connection) {
            return;
        }

        const handleConnectionChange = () => {
            isMobileDataConnection.set(
                navigator.connection.type === "cellular",
            );
        };
        navigator.connection.addEventListener("change", handleConnectionChange);
        return () => navigator.connection.removeEventListener("change", handleConnectionChange);
    });

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

    $effect(() => {
        if (!settingsStore.keyboard.enabled) {
            return;
        }
        return shortcutManager.attach();
    });

    $effect(() => {
        if (localStorage.getItem("compositorHeartbeat") === "off") {
            return;
        }
        return attachCompositorHeartbeat();
    });

    function outputInlineStyle(theme) {
        if (!theme) {
            return false;
        }

        return compileThemeStyle(theme.record, {
            variant: $settings.design?.theme,
            dark: isDarkMode,
            imageUrls: themeImageUrls,
        });
    }

    appState.init();
    viewPortSetting();
    setPostState();
    initColumns();

    const columnState = getColumnState();
    const wizardVisible = $derived(
        onboardingState.wizardActive ||
        (
            appState.ready &&
            columnState.isColumnsLoaded &&
            !columnState.loadFailed &&
            columnState.columns.length === 0 &&
            !settingsStore.onboarding.completed
        ),
    );

    const savedScrollPositions = new Map<
        string,
        { scroll: { x: number; y: number } | null; modalTop: number | null }
    >();

    beforeNavigate(({ from }) => {
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
                $settings.design?.layout === "decks" &&
                saved.modalTop !== null
            ) {
                const modal = document.querySelector(
                    ".modal-page-content",
                ) as HTMLElement | null;
                if (modal && !modal.querySelector(".vl-canvas")) {
                    modal.scrollTop = saved.modalTop;
                }
            } else if (saved.scroll) {
                if (!document.querySelector(".vl-canvas")) {
                    window.scrollTo(saved.scroll.x, saved.scroll.y);
                }
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
        return on(window, "online", () => {
            appState.retryUnreachableAccounts();
        });
    });

    $effect(() => {
        if (!appState.ready) {
            return;
        }
        bskyStatusState.boot();
        supportPromptState.boot();
        (window.requestIdleCallback ?? ((callback) => window.setTimeout(callback, 3000)))(checkThemeUpdates);

        return on(document, "visibilitychange", () => {
            if (!document.hidden) {
                bskyStatusState.checkIfStale();
                checkThemeUpdates();
            }
        });
    });

    $effect(() => {
        const offError = on(window, "error", (event: ErrorEvent) => {
            recordError(event.error ?? event.message, "window");
        });
        const offRejection = on(window, "unhandledrejection", (event: PromiseRejectionEvent) => {
            recordError(event.reason, "unhandledrejection");
        });

        return () => {
            offError();
            offRejection();
        };
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

<svelte:head>
    <meta name="theme-color" content={baseColor} />
    <link rel="canonical" href="https://tokimeki.blue{page.url.pathname}" />

    {#if $settings?.embed?.x}
        <link rel="preconnect" href="https://platform.twitter.com" />
        <link rel="preconnect" href="https://cdn.syndication.twimg.com" crossorigin="anonymous" />
        <link rel="preconnect" href="https://pbs.twimg.com" />
    {/if}
</svelte:head>

<div
    class="app {$_('dir', {
        default: 'ltr',
    })} lang-{$locale} font-size-{$settings.design?.fontSize ||
        2} font-theme-{$settings?.design?.fontTheme || 'default'}"
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:single={$settings?.design.layout !== "decks"}
    class:ios={isMobile.iOS()}
    class:left-mode={$settings?.design?.leftMode}
    class:superstar={$settings.design?.reactionMode === "superstar"}
    class:bubble={$settings?.design?.bubbleTimeline}
    class:monochrome={$settings?.design?.monochrome}
    style={outputInlineStyle($theme)}
    dir={$_("dir")}
    bind:this={app}
>
    {#if appState.shellReady}
        <div
            class="wrap"
            class:layout-decks={$settings.design.layout === "decks"}
        >
            <Side></Side>

            <main
                class="main {typeof $settings.design?.singleWidth === 'string' ? `main--scw-${$settings.design.singleWidth}` : ''}"
                style:--single-column-width={typeof $settings.design?.singleWidth === 'number' ? `${$settings.design.singleWidth}px` : null}
            >
                {#if $settings.design.layout !== "decks"}
                    {#if appState.ready}
                        <Single></Single>
                    {:else}
                        <BootStatus></BootStatus>
                    {/if}
                {:else}
                    <Decks></Decks>
                {/if}

                {#if appState.ready}
                    {@render children?.()}
                {/if}
            </main>
        </div>

        {#if appState.ready}
            {#if $isColumnModalOpen}
                <ColumnModal onclose={handleColumnModalClose}></ColumnModal>
            {/if}

            {#if $listAddModal.open}
                <OfficialListAddObserver></OfficialListAddObserver>
            {/if}

            {#if $bluefeedAddModal.open}
                <BluefeedAddObserver></BluefeedAddObserver>
            {/if}

            {#if wizardVisible}
                {#await import("$lib/onboarding/OnboardingWizard.svelte") then { default: OnboardingWizard }}
                    <OnboardingWizard></OnboardingWizard>
                {/await}
            {/if}

            {#if onboardingState.tourOpen}
                {#await import("$lib/onboarding/Tour.svelte") then { default: Tour }}
                    <Tour></Tour>
                {/await}
            {/if}

            {#if shortcutManager.helpOpen}
                <ShortcutHelp onclose={() => (shortcutManager.helpOpen = false)}></ShortcutHelp>
            {/if}

            <NotificationCountObserver></NotificationCountObserver>
            <RealtimeListenersObserver></RealtimeListenersObserver>

            {#if !$settings?.general?.disableChat}
                <ChatUpdateObserver></ChatUpdateObserver>
            {/if}
        {/if}

        <Footer></Footer>
    {:else}
        <div class="top-loading">
            <BootStatus></BootStatus>
        </div>
    {/if}

    <Toaster
        position="top-center"
        theme={isDarkMode ? "dark" : "light"}
        closeButton
    ></Toaster>
    <ReportObserver></ReportObserver>
    <EmbedDetachObserver></EmbedDetachObserver>
    <ProfileStatusObserver></ProfileStatusObserver>
    <LinkWarningModal></LinkWarningModal>
    <AiConsentDialog></AiConsentDialog>
    <UpdateBanner></UpdateBanner>

    {#if bskyStatusState.isVisible}
        <BskyStatusBanner></BskyStatusBanner>
    {/if}

    {#if appState.ready && supportPromptState.isDue && !wizardVisible && !onboardingState.tourOpen}
        <SupportPrompt></SupportPrompt>
    {/if}

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

        &--scw-xxs {
            --single-column-width: var(--single-xxs-width);
        }

        &--scw-xs {
            --single-column-width: var(--single-xs-width);
        }

        &--scw-small {
            --single-column-width: var(--single-s-width);
        }

        &--scw-medium {
            --single-column-width: var(--single-m-width);
        }

        &--scw-large {
            --single-column-width: var(--single-l-width);
        }

        &--scw-xl {
            --single-column-width: var(--single-xl-width);
        }

        &--scw-xxl {
            --single-column-width: var(--single-xxl-width);
        }
    }

    .single {
        --deck-heading-height: var(--single-deck-heading-height, 56px);
        background-attachment: fixed;

        .wrap {
            margin: 0 auto;
        }
    }

    .top-loading {
        height: 100vh;
        display: grid;
        place-content: center;
    }
</style>
