<script lang="ts">
    import SearchForm from '../../../../routes/(app)/SearchForm.svelte';

    interface Props {
        options?: Record<string, string>;
    }

    let { options = {} }: Props = $props();

    let search = $state('');
</script>

<div class="rice-search-widget">
    <SearchForm bind:search path="/search" autofocus={false} showFilter={false} placeholder={options.placeholder}></SearchForm>
</div>

<style>
    .rice-search-widget {
        padding: 8px;
    }
</style>
