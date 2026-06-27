<script lang="ts">
    import { muteListsState } from '$lib/classes/muteListsState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import SettingsBackup from '$lib/components/settings/SettingsBackup.svelte';

    if (typeof window !== 'undefined') {
        (window as Window & { __muteListsTest?: unknown }).__muteListsTest = {
            ready: true,
            addPostMute: (uri: string) => muteListsState.mutePost(uri),
            addRepostMute: (did: string) => muteListsState.muteRepost(did),
            getPostMutes: () => [...muteListsState.postMutes],
            getRepostMutes: () => [...muteListsState.repostMutes],
            getSnapshot: () => settingsStore.snapshot,
            getLocalStorage: (key: string) => localStorage.getItem(key),
        };
    }
</script>

<main class="harness">
    <h1>mute-lists test harness</h1>

    <section data-testid="backup">
        <SettingsBackup />
    </section>

    <ul data-testid="post-mutes">
        {#each muteListsState.postMutes as uri}
            <li>{uri}</li>
        {/each}
    </ul>

    <ul data-testid="repost-mutes">
        {#each muteListsState.repostMutes as did}
            <li>{did}</li>
        {/each}
    </ul>
</main>

<style>
    .harness {
        max-width: 720px;
        margin: 0 auto;
        padding: 24px;
    }
</style>
