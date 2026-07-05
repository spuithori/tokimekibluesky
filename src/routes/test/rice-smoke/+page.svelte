<script lang="ts">
    import '../../styles.css';
    import SearchForm from '../../(app)/SearchForm.svelte';

    let search = $state('');

    if (typeof window !== 'undefined') {
        (window as any).__riceSmokeTest = { ready: true };
    }
</script>

<div class="smoke-section">
    <SearchForm bind:search path="/search"></SearchForm>
</div>
