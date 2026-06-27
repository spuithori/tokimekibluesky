<script lang="ts">
    import { agent } from '$lib/stores';
    import { keywordMuteState } from '$lib/classes/keywordMuteState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { keywordFilter } from '$lib/timelineFilter';
    import { createMockAgent } from '$lib/test-fixtures/mockAgent';
    import { makePreferencesResponse, makeMutedWordsPref } from '$lib/test-fixtures/fixtures';
    import SettingsBackup from '$lib/components/settings/SettingsBackup.svelte';
    import KeywordMuteItem from '../../(app)/settings/keyword-mutes/KeywordMuteItem.svelte';
    import OfficialMuteList from '../../(app)/settings/keyword-mutes/OfficialMuteList.svelte';

    const mock = createMockAgent({
        responses: {
            'app.bsky.actor.getPreferences': makePreferencesResponse([makeMutedWordsPref(['official-word'])]),
        },
    });
    agent.set(mock.agent);

    let previewText = $state('');
    let previewTime = $state('12:00');
    const previewHidden = $derived(
        keywordFilter(keywordMuteState.formattedKeywords, previewText, `2024-01-01T${previewTime}:00`),
    );

    function add() {
        keywordMuteState.add('');
    }

    function remove(index: number) {
        keywordMuteState.keywords.splice(index, 1);
    }

    function handleImport(event: CustomEvent<{ word: { word: string } }>) {
        const incoming = event.detail.word;
        if (!keywordMuteState.keywords.some((k) => k.word === incoming.word)) {
            keywordMuteState.keywords.push(incoming as never);
        }
    }

    if (typeof window !== 'undefined') {
        (window as Window & { __keywordMuteTest?: unknown }).__keywordMuteTest = {
            ready: true,
            getSnapshot: () => settingsStore.snapshot,
            getLocalStorage: (key: string) => localStorage.getItem(key),
            addMute: (word: string) => keywordMuteState.add(word),
            getMutes: () => keywordMuteState.keywords.map((k) => ({ ...k })),
            getFormatted: () => keywordMuteState.formattedKeywords.map((k) => ({ ...k })),
            evalHidden: (text: string, time = '12:00') =>
                keywordFilter(keywordMuteState.formattedKeywords, text, `2024-01-01T${time}:00`),
        };
    }
</script>

<main class="harness">
    <h1>keyword-mute test harness</h1>

    <section>
        <button data-testid="add" onclick={add}>add</button>
        <ul data-testid="mute-list">
            {#each keywordMuteState.keywords as keyword, index}
                <li>
                    <KeywordMuteItem bind:keyword={keywordMuteState.keywords[index]} index={index} />
                    <button data-testid={`remove-${index}`} onclick={() => remove(index)}>remove</button>
                </li>
            {/each}
        </ul>
    </section>

    <section data-testid="preview">
        <input data-testid="preview-text" type="text" bind:value={previewText} placeholder="post text" />
        <input data-testid="preview-time" type="time" bind:value={previewTime} />
        <output data-testid="preview-hidden">{previewHidden ? 'hidden' : 'visible'}</output>
    </section>

    <section data-testid="backup">
        <SettingsBackup />
    </section>

    <section data-testid="official">
        <OfficialMuteList on:add={handleImport} />
    </section>
</main>

<style>
    .harness {
        max-width: 720px;
        margin: 0 auto;
        padding: 24px;
    }
</style>
