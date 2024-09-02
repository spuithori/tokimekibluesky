<script lang="ts">
    import {_} from "svelte-i18n";
</script>

<div class="embed-detached">
  <p class="embed-detached__text"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>{$_('detach_information')}
  </p>
</div>

<style lang="postcss">
    .embed-detached {
        font-size: 14px;
        color: var(--text-color-3);
        margin-top: 16px;
        padding-top: 8px;
        border-top: 1px solid var(--border-color-1);

        &__text {
            display: grid;
            align-items: flex-start;
            grid-template-columns: 16px 1fr;
            gap: 4px;

            svg {
                margin-top: 3px;
            }
        }
    }
</style>