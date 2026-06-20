<script lang="ts">
    import type { Snippet } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { afterNavigate } from '$app/navigation';
    import { settingsSchema } from '$lib/settings/schema';
    import { accessor } from '$lib/settings/settings.svelte';
    import type { SettingsCategoryId, SettingsContext } from '$lib/settings/schema.types';
    import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
    import SettingField from './SettingField.svelte';
    import { isLocalTranslateSupported } from '$lib/localTranslate';

    interface Props {
        category: SettingsCategoryId;
        title: string;
        children?: Snippet;
    }

    let { category, title, children }: Props = $props();

    const ctx: SettingsContext = {
        localTranslateSupported: isLocalTranslateSupported(),
    };

    const items = $derived(
        settingsSchema.filter(
            (item) => item.category === category && (item.visible?.(ctx) ?? true),
        ),
    );

    // Search-result jump: scroll to the field matching the URL hash and flash it.
    // Timer-free — the highlight duration is CSS-driven, removed on animationend.
    afterNavigate(({ to }) => {
        const hash = to?.url.hash;
        if (!hash) {
            return;
        }
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target) {
            return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.setAttribute('data-flash', '');
        target.addEventListener('animationend', () => target.removeAttribute('data-flash'), { once: true });
    });
</script>

<svelte:head>
    <title>{$_(title)} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>{$_(title)}</SettingsHeader>

    <div class="settings-wrap">
        {@render children?.()}

        {#each items as item (item.key)}
            <SettingField {item} acc={accessor} {ctx} />
        {/each}
    </div>
</div>

<style lang="postcss">
    :global(.settings-group[data-flash]) {
        animation: settings-flash 1.2s ease;
    }

    @keyframes -global-settings-flash {
        0%, 20% {
            background-color: color-mix(in srgb, var(--primary-color) 18%, transparent);
        }
        100% {
            background-color: transparent;
        }
    }
</style>
