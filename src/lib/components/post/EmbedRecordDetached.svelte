<script lang="ts">
    import Info from '@lucide/svelte/icons/info';
    import {_} from "svelte-i18n";
</script>

<div class="embed-detached">
  <p class="embed-detached__text"><Info size={16} />{$_('detach_information')}
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