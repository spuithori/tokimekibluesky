<script lang="ts">
    import { _ } from "svelte-i18n";
    import { settings } from "$lib/stores";
    import { languageMap } from "$lib/langs/languageMap";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import {
        isLocalTranslateSupported,
        normalizeTranslateLang,
        getTranslatorAvailability,
        warmUpTranslator,
    } from "$lib/localTranslate";

    type Row = { code: string; name: string; norm: string };
    type Phase = "idle" | "downloading" | "error";
    type RowState = {
        availability: TranslatorAvailability;
        phase: Phase;
        progress: number;
    };

    const localSupported = isLocalTranslateSupported();
    const target = $derived(
        normalizeTranslateLang($settings?.general?.userLanguage),
    );

    const rows: Row[] = [
        ...[...languageMap].map(([code, v]) => ({
            code,
            name: v.name,
            norm: normalizeTranslateLang(code) as string,
        })),
        {
            code: "zh-Hant",
            name: "translation_traditional_chinese",
            norm: "zh-Hant",
        },
    ].filter((r) => r.norm);

    let states = $state<Record<string, RowState>>({});
    let loading = $state(true);

    $effect(() => {
        const t = target;
        if (!localSupported || !t) {
            loading = false;
            return;
        }
        let cancelled = false;
        loading = true;
        (async () => {
            const list = rows.filter((r) => r.norm !== t);
            const next: Record<string, RowState> = {};
            for (let start = 0; start < list.length; start += 8) {
                if (cancelled) return;
                const batch = list.slice(start, start + 8);
                const results = await Promise.all(
                    batch.map((r) => getTranslatorAvailability(r.code, t)),
                );
                batch.forEach((r, i) => {
                    next[r.norm] = {
                        availability: results[i],
                        phase: "idle",
                        progress: 0,
                    };
                });
            }
            if (!cancelled) {
                states = next;
                loading = false;
            }
        })();
        return () => {
            cancelled = true;
        };
    });

    const rank: Record<string, number> = {
        available: 0,
        downloadable: 1,
        downloading: 2,
        unavailable: 3,
    };
    const sortedRows = $derived(
        rows
            .filter((r) => r.norm !== target && states[r.norm])
            .sort(
                (a, b) =>
                    rank[states[a.norm].availability] -
                    rank[states[b.norm].availability],
            ),
    );
    const supportedRows = $derived(
        sortedRows.filter((r) => states[r.norm].availability !== "unavailable"),
    );
    const unsupportedRows = $derived(
        sortedRows.filter((r) => states[r.norm].availability === "unavailable"),
    );

    const MAJOR = [
        "en",
        "es",
        "fr",
        "de",
        "it",
        "pt",
        "ru",
        "ja",
        "ko",
        "zh",
        "vi",
        "tr",
        "hi",
        "id",
        "th",
        "ar",
    ];

    function download(r: Row) {
        if (!target) return;
        const st = states[r.norm];
        if (st) {
            st.phase = "downloading";
            st.progress = 0;
        }
        warmUpTranslator(r.code, target, (p) => {
            const s = states[r.norm];
            if (s) s.progress = p;
        }).then((result) => {
            const prev = states[r.norm];
            states[r.norm] = {
                availability:
                    result === "ready"
                        ? "available"
                        : result === "unavailable"
                          ? "unavailable"
                          : (prev?.availability ?? "downloadable"),
                phase: result === "retry" ? "error" : "idle",
                progress: result === "ready" ? 1 : 0,
            };
        });
    }

    const pendingMajor = $derived(
        MAJOR.map((c) => normalizeTranslateLang(c))
            .filter((n): n is string => !!n && n !== target)
            .map((n) => rows.find((r) => r.norm === n))
            .filter(
                (r): r is Row =>
                    !!r &&
                    states[r.norm]?.availability === "downloadable" &&
                    states[r.norm]?.phase !== "downloading",
            ),
    );

    function downloadNextMajor() {
        const r = pendingMajor[0];
        if (r) download(r);
    }
</script>

<svelte:head>
    <title>{$_("settings_translation")} - TOKIMEKI</title>
</svelte:head>

{#snippet row(r: Row)}
    <div class="translation-list__item">
        <p class="translation-list__name">{$_(r.name)}</p>
        <div class="translation-list__status">
            {#if states[r.norm].phase === "downloading"}
                <span class="dl-progress"
                    ><span
                        class="dl-progress__fill"
                        style="width: {Math.floor(
                            states[r.norm].progress * 100,
                        )}%"
                    ></span></span
                >
                <span class="translation-list__percent"
                    >{Math.floor(states[r.norm].progress * 100)}%</span
                >
            {:else if states[r.norm].phase === "error"}
                <button class="dl-retry" onclick={() => download(r)}
                    >{$_("retry")}</button
                >
            {:else if states[r.norm].availability === "available"}
                <span class="translation-badge translation-badge--available"
                    >{$_("translation_availability_available")}</span
                >
            {:else if states[r.norm].availability === "unavailable"}
                <span class="translation-badge translation-badge--unavailable"
                    >{$_("translation_availability_unavailable")}</span
                >
            {:else}
                <button class="button button--ss" onclick={() => download(r)}
                    >{$_("translation_download")}</button
                >
            {/if}
        </div>
    </div>
{/snippet}

<div>
    <SettingsHeader>
        {$_("settings_translation")}
    </SettingsHeader>

    <div class="settings-wrap">
        {#if !localSupported}
            <p class="settings-group__description">
                {$_("auto_translation_unsupported")}
            </p>
        {:else}
            <p class="settings-group__description">
                {$_("translation_description")}
            </p>

            {#if pendingMajor.length}
                <button
                    class="button button--sm translation-bulk"
                    onclick={downloadNextMajor}
                >
                    {$_("translation_bulk_download")} ({pendingMajor.length})
                </button>
            {/if}

            {#if loading}
                <LoadingSpinner></LoadingSpinner>
            {:else}
                <div class="translation-list">
                    {#each supportedRows as r (r.code)}
                        {@render row(r)}
                    {/each}
                </div>

                {#if unsupportedRows.length}
                    <details class="translation-unsupported">
                        <summary
                            >{$_("translation_unsupported_section")} ({unsupportedRows.length})</summary
                        >
                        <div class="translation-list">
                            {#each unsupportedRows as r (r.code)}
                                {@render row(r)}
                            {/each}
                        </div>
                    </details>
                {/if}
            {/if}
        {/if}
    </div>
</div>

<style lang="postcss">
    .translation-bulk {
        margin: 12px 0;
    }

    .translation-list__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 4px;
        border-bottom: 1px solid var(--border-color-1);
    }

    .translation-list__name {
        font-size: 14px;
        color: var(--text-color-1);
    }

    .translation-list__status {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 130px;
        justify-content: flex-end;
    }

    .translation-list__percent {
        font-size: 12px;
        color: var(--text-color-3);
    }

    .translation-badge {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 4px;
    }

    .translation-badge--available {
        background-color: var(--primary-color);
        color: #fff;
    }

    .translation-badge--unavailable {
        color: var(--text-color-3);
    }

    .dl-progress {
        display: block;
        width: 80px;
        height: 4px;
        border-radius: 2px;
        background-color: var(--border-color-1);
        overflow: hidden;
    }

    .dl-progress__fill {
        display: block;
        height: 100%;
        background-color: var(--primary-color);
        transition: width 0.2s ease;
    }

    .dl-retry {
        color: var(--primary-color);
        text-decoration: underline;
        cursor: pointer;
    }

    .translation-unsupported {
        margin-top: 16px;
    }

    .translation-unsupported summary {
        cursor: pointer;
        color: var(--text-color-3);
        font-size: 13px;
        padding: 8px 0;
    }
</style>
