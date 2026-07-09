<script lang="ts">
    import '../../styles.css';
    import SearchForm from '../../(app)/SearchForm.svelte';
    import RiceAppearanceField from '$lib/components/settings/fields/custom/RiceAppearanceField.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';

    let search = $state('');

    if (typeof window !== 'undefined') {
        (window as any).__riceSmokeTest = {
            ready: true,
            getRiceConfig() {
                return settingsStore.rice.config;
            },
        };
    }
</script>

<div class="smoke-section">
    <SearchForm bind:search path="/search"></SearchForm>
</div>

<div class="smoke-section">
    <RiceAppearanceField></RiceAppearanceField>
</div>
