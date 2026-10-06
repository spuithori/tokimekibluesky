<script lang="ts">
    import { liveQuery } from 'dexie';
    import { themesDb } from '$lib/db';
    import { settingsStore } from '$lib/settings/settings.svelte';

    const ID = 'nova-sample';

    const LIGHT = [
        '--current-theme-color:#764edd;',
        '--base-bg-color:#f7f6fb;',
        '--base-bg-image:linear-gradient(90deg,#f2ebff 0%,#ffe9dc 100%);',
        '--bg-color-1:#ffffff;--bg-color-2:#f7f6fb;--bg-color-3:#efedf2;',
        '--border-color-1:#e3e2e7;--border-color-2:#efedf2;',
        '--text-color-1:#180e30;--text-color-2:#3e315f;--text-color-3:#6f6099;',
        '--blurred-bg-color:transparent;--side-backdrop-filter:none;--bar-bg-color:var(--deck-heading-bg-color);--bar-backdrop-filter:var(--deck-heading-backdrop-filter);',
        '--side-padding-top:8px;--side-padding-bottom:8px;--side-padding-right:0px;',
        '--nav-content-bg-color:transparent;--nav-content-bg-image:linear-gradient(to bottom,rgba(255,255,255,0.6) 0%,rgba(255,255,255,0.6) 28%,rgba(255,255,255,0.51) 45%,rgba(255,255,255,0.36) 60%,rgba(255,255,255,0.192) 75%,rgba(255,255,255,0.06) 88%,rgba(255,255,255,0.0) 100%);--nav-content-border-width:0px;--nav-content-border-color:transparent;--nav-content-border-radius:12px;',
        '--deck-divider-width:412px;--deck-divider-compact-width:72px;',
        '--decks-margin:8px;--decks-margin-bottom:0px;--decks-height:calc(100dvh - 8px);--decks-gap:8px;--decks-padding:0px;--decks-flex:1;--decks-bg-color:transparent;--decks-border:none;--decks-border-left:none;--decks-border-bottom:none;--decks-box-shadow:none;--decks-border-radius:0px;',
        '--decks-overflow-x:scroll;--decks-scroll-bar-size:8px;--decks-scroll-bar-inset:12px;',
        '--deck-border-radius:12px;--deck-border-width:1px;--deck-border-right:1px solid var(--deck-border-color);--deck-border-color:color-mix(in srgb,#180e30 10%,transparent);--deck-box-shadow:none;--deck-content-bg-color:rgba(255,255,255,.86);',
        '--deck-heading-height:48px;--deck-heading-bg-color:rgba(255,255,255,.72);--deck-heading-backdrop-filter:blur(20px) saturate(1.8);',
        '--deck-heading-icon-bg-color:#f5ecff;--deck-heading-icon-color:var(--primary-color);--deck-heading-icon-border-radius:8px;',
        '--timeline-border-color:#efedf2;',
        '--scroll-bar-color:color-mix(in srgb,#180e30 18%,transparent);--scroll-bar-bg-color:transparent;--scroll-bar-border-radius:4px;--scroll-bar-thumb-inset:2px;--deck-scroll-bar-inset-end:11px;',
        '--publish-textarea-bg-color:var(--bg-color-1);--publish-textarea-border:1px solid color-mix(in srgb,var(--primary-color) 16%,transparent);--publish-tag-bg-color:color-mix(in srgb,var(--primary-color) 7%,transparent);',
        '--bar-current-bar-color:linear-gradient(180deg,#b89cff,#ff9565);--bar-current-icon-color:var(--primary-color);--nav-current-bar-color:linear-gradient(90deg,#b89cff,#ff9565);--settings-nav-current-bar-color:linear-gradient(180deg,#b89cff,#ff9565);',
        '--accent-glow:0 0 6px 0 rgba(184,156,255,.6);',
        '--surface-raised:#ffffff;--surface-overlay:#ffffff;',
        '--scrim:rgba(24,14,48,.32);',
        '--state-hover:color-mix(in srgb,#75669f 12%,transparent);',
        '--state-selected:color-mix(in srgb,#764edd 12%,transparent);',
        '--on-accent:#ffffff;',
        '--elevation-1:0 .25px .75px rgba(0,0,0,.03),0 2px 6px rgba(0,0,0,.05);',
        '--elevation-2:0 0 0 1px color-mix(in srgb,#180e30 8%,transparent),0 2px 6px rgba(24,14,48,.06),0 12px 28px -6px rgba(24,14,48,.14);',
        '--elevation-3:0 0 0 1px color-mix(in srgb,#180e30 6%,transparent),0 24px 64px -16px rgba(24,14,48,.3);',
        '--radius-control:8px;--radius-card:16px;--radius-overlay:24px;',
        '--menu-padding:8px 0;--menu-item-inset:8px;--menu-item-border-radius:16px;',
        '--scroll-bar-width:thin;',
        '--side-box-shadow:inset 0 1px 0 rgba(255,255,255,.95);',
        '--deck-rim-display:block;--deck-rim:linear-gradient(165deg,rgba(255,255,255,1) 0%,rgba(255,255,255,.6) 22%,rgba(255,255,255,0) 50%);',
        '--publish-schedule-button-bg-color:transparent;',
        '--bubble-canvas:var(--app-bg-image),var(--app-bg-color);--bubble-heading-bg-color:transparent;--bubble-heading-backdrop-filter:blur(20px);--bubble-single-bg-color:transparent;--bubble-decks-padding-left:12px;--bubble-scroll-bar-border-radius:4px;',
    ].join('');

    const DARK = [
        '--current-theme-color:#b89cff;',
        '--base-bg-color:#131215;',
        '--base-dark-bg-image:linear-gradient(90deg,#2a2140 0%,#2d1f33 55%,#3a1f22 100%);',
        '--bg-color-1:#252428;--bg-color-2:#1d1b1f;--bg-color-3:#312f33;',
        '--border-color-1:#3f3e42;--border-color-2:#312f33;',
        '--text-color-1:#f2f0f8;--text-color-2:#d2c8ec;--text-color-3:#a093c8;',
        '--deck-border-color:color-mix(in srgb,#f2f0f8 10%,transparent);',
        '--deck-heading-icon-bg-color:#271c48;',
        '--timeline-border-color:#312f33;',
        '--scroll-bar-color:color-mix(in srgb,#f2f0f8 22%,transparent);',
        '--surface-raised:#2b2a2e;--surface-overlay:var(--bg-color-1);',
        '--scrim:rgba(0,0,0,.5);',
        '--state-hover:color-mix(in srgb,#b6aad9 14%,transparent);',
        '--state-selected:color-mix(in srgb,#b89cff 18%,transparent);',
        '--on-accent:#252428;',
        '--elevation-1:0 .25px .75px rgba(0,0,0,.15),0 2px 6px rgba(0,0,0,.2);',
        '--elevation-2:0 0 0 1px color-mix(in srgb,#f2f0f8 8%,transparent),0 2px 6px rgba(0,0,0,.3),0 12px 28px -6px rgba(0,0,0,.5);',
        '--elevation-3:0 0 0 1px color-mix(in srgb,#f2f0f8 8%,transparent),0 24px 64px -16px rgba(0,0,0,.6);',
        '--deck-content-bg-color:rgba(37,36,40,.86);',
        '--deck-heading-bg-color:rgba(37,36,40,.72);',
        '--nav-content-bg-image:linear-gradient(to bottom,rgba(37,36,40,0.6) 0%,rgba(37,36,40,0.6) 28%,rgba(37,36,40,0.51) 45%,rgba(37,36,40,0.36) 60%,rgba(37,36,40,0.192) 75%,rgba(37,36,40,0.06) 88%,rgba(37,36,40,0.0) 100%);',
        '--side-box-shadow:inset 0 1px 0 rgba(255,255,255,.07);',
        '--deck-rim:linear-gradient(165deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,.1) 22%,rgba(255,255,255,0) 50%);',
    ].join('');

    const THUMBNAIL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2ebff"/><stop offset="1" stop-color="#ffe9dc"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><rect x="10" y="12" width="44" height="40" rx="8" fill="#fff"/><rect x="16" y="18" width="20" height="4" rx="2" fill="#764edd"/></svg>')}`;

    const installed = liveQuery(() => themesDb.themes.get(ID));

    async function install() {
        const now = new Date().toISOString();
        await themesDb.themes.put({
            id: ID,
            createdAt: now,
            updatedAt: now,
            name: 'Nova (sample)',
            description: '',
            style: LIGHT,
            options: {
                cover: THUMBNAIL,
                thumbnail: THUMBNAIL,
                colorDisabled: true,
                darkmodeDisabled: false,
                darkmodeStyle: DARK,
            },
            author: 'TOKIMEKI',
            keyword: 'sample',
            version: '0.9',
        });
        settingsStore.design.skin = ID;
        location.href = '/';
    }

    async function remove() {
        settingsStore.design.skin = 'default';
        await themesDb.themes.delete(ID);
    }
</script>

<main>
    <h1>Nova (sample)</h1>
    <button onclick={install}>{$installed ? '再適用してアプリを開く' : '導入して適用'}</button>
    {#if $installed}
        <button onclick={remove}>元に戻す</button>
    {/if}
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 360px;
        margin: 48px auto;
        padding: 0 16px;
    }

    button {
        padding: 12px 16px;
        border-radius: 10px;
        border: 1px solid #d8d0ea;
        background: #fff;
        font: inherit;
        cursor: pointer;
    }
</style>
