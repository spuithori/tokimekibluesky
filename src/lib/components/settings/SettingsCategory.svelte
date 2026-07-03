<script lang="ts">
    import type { Snippet } from "svelte";
    import { _ } from "svelte-i18n";
    import { toast } from "svelte-sonner";
    import { afterNavigate } from "$app/navigation";
    import { settingsSchema } from "$lib/settings/schema";
    import { accessor } from "$lib/settings/settings.svelte";
    import { createDefaultSettings } from "$lib/settings/defaults";
    import type {
        SettingItem,
        SettingsCategoryId,
        SettingsContext,
    } from "$lib/settings/schema.types";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import SettingField from "./SettingField.svelte";
    import { isLocalTranslateSupported } from "$lib/localTranslate";

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
            (item) =>
                item.category === category && (item.visible?.(ctx) ?? true),
        ),
    );

    const groups = $derived.by(() => {
        const result: { section: string; items: SettingItem[] }[] = [];
        let current: { section: string; items: SettingItem[] } | null = null;
        for (const item of items) {
            const section = item.section ?? "";
            if (!current || current.section !== section) {
                current = { section, items: [] };
                result.push(current);
            }
            current.items.push(item);
        }
        return result;
    });

    function valueAtPath(object: any, path: string): unknown {
        return path.split(".").reduce((value, key) => value?.[key], object);
    }

    function resetToDefaults() {
        if (!confirm($_("settings_reset_confirm"))) {
            return;
        }
        const defaults = createDefaultSettings();
        for (const item of settingsSchema.filter(
            (entry) => entry.category === category,
        )) {
            accessor.set(item.key, valueAtPath(defaults, item.key));
        }
        toast.success($_("settings_reset_done"));
    }

    afterNavigate(({ to }) => {
        const hash = to?.url.hash;
        if (!hash) {
            return;
        }
        const target = document.getElementById(
            decodeURIComponent(hash.slice(1)),
        );
        if (!target) {
            return;
        }
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.setAttribute("data-flash", "");
        target.addEventListener(
            "animationend",
            () => target.removeAttribute("data-flash"),
            { once: true },
        );
    });
</script>

<svelte:head>
    <title>{$_(title)} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>{$_(title)}</SettingsHeader>

    <div class="settings-wrap">
        {@render children?.()}

        {#each groups as group (group.section + "::" + group.items[0].key)}
            {#if group.section}
                <h2 class="settings-section-title">{$_(group.section)}</h2>
            {/if}

            {#each group.items as item (item.key)}
                <SettingField {item} acc={accessor} {ctx} />
            {/each}
        {/each}

        <div class="settings-reset">
            <button
                class="settings-reset__button"
                type="button"
                onclick={resetToDefaults}
            >
                {$_("settings_reset_to_default")}
            </button>
        </div>
    </div>
</div>

<style lang="postcss">
    .settings-section-title {
        font-size: 18px;
        color: var(--text-color-1);
        margin-top: 32px;
        margin-bottom: 8px;
    }

    .settings-section-title:first-child {
        margin-top: 0;
    }

    .settings-reset {
        margin-top: 40px;
        padding-top: 16px;
        border-top: 1px solid var(--border-color-2);
    }

    .settings-reset__button {
        color: var(--danger-color);
        font-size: 14px;

        &:hover {
            text-decoration: underline;
        }
    }

    :global(.settings-group[data-flash]) {
        animation: settings-flash 1.2s ease;
    }

    @keyframes -global-settings-flash {
        0%,
        20% {
            background-color: color-mix(
                in srgb,
                var(--primary-color) 18%,
                transparent
            );
        }
        100% {
            background-color: transparent;
        }
    }
</style>
