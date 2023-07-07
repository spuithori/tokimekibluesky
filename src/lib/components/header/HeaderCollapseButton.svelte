<script lang="ts">
    import { settings } from '$lib/stores';
    let headerHide = $settings.design?.headerHide || false;

    $: {
        $settings.design.headerHide = headerHide;
    }

    function handleKeydown(event: { key: string; }) {
        const activeElement = document.activeElement?.tagName;

        if (event.key === 'h' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
            headerHide = !headerHide
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<button
        class="header-collapse-button"
        aria-hidden="true"
        on:click={() => {headerHide = !headerHide}}
>
    <svg xmlns="http://www.w3.org/2000/svg" width="29.086" height="14.949" viewBox="0 0 29.086 14.949">
        <path id="パス_62" data-name="パス 62" d="M4034,587.19l13.129,12.535,13.129-12.535" transform="translate(-4032.586 -585.776)" fill="none" stroke="var(--bg-color-1)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
    </svg>
</button>