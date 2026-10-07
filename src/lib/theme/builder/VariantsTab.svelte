<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Plus from '@lucide/svelte/icons/plus';
    import { LIMITS } from '../format';
    import { seedBase, type Draft } from './draft';

    let { draft = $bindable(), selected = $bindable() }: { draft: Draft; selected: string | undefined } = $props();

    function setColor(index: number, color: string) {
        const variant = draft.variants[index];
        variant.swatch = color;
        variant.tokens = [
            ...variant.tokens.filter((t) => t.name !== '--current-theme-color' && t.name !== '--primary-color'),
            { name: '--current-theme-color', value: color },
            { name: '--primary-color', value: 'var(--current-theme-color)' },
        ];
    }

    function add() {
        const used = new Set(draft.variants.map((v) => v.key));
        let n = draft.variants.length + 1;
        while (used.has(`color-${n}`)) n++;
        const color = draft.seeds.accent ?? seedBase(draft).accent;
        draft.variants = [...draft.variants, {
            key: `color-${n}`,
            name: `${$_('builder_accent')} ${n}`,
            swatch: color,
            tokens: [{ name: '--current-theme-color', value: color }, { name: '--primary-color', value: 'var(--current-theme-color)' }],
        }];
        selected = `color-${n}`;
    }

    function remove(index: number) {
        const [removed] = draft.variants.splice(index, 1);
        if (selected === removed?.key) selected = draft.variants[0]?.key;
    }
</script>

<div class="variants">
  <ul class="variants__list">
    {#each draft.variants as variant, index (variant.key)}
      <li class="variants__item">
        <input class="variants__radio" type="radio" name="builder-variant" aria-label={$_('builder_variant_preview', { name: variant.name })} checked={selected === variant.key} onchange={() => (selected = variant.key)}>
        <input class="variants__color" type="color" aria-label={$_('builder_accent')} value={variant.swatch} oninput={(e) => setColor(index, e.currentTarget.value)}>
        <input class="variants__name" aria-label={$_('builder_variant_name')} bind:value={variant.name} maxlength="32">
        <button class="variants__remove" aria-label={$_('builder_variant_remove', { name: variant.name })} onclick={() => remove(index)}>
          <Trash2 size={16} color="currentColor"></Trash2>
        </button>
      </li>
    {/each}
  </ul>
  <button class="variants__add" onclick={add} disabled={draft.variants.length >= LIMITS.variants}>
    <Plus size={16} color="currentColor"></Plus>{$_('builder_variant_add')}
  </button>
</div>

<style lang="postcss">
  .variants {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
  }

  .variants__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .variants__item {
      display: flex;
      align-items: center;
      gap: 10px;
  }

  .variants__radio {
      width: 18px;
      height: 18px;
      accent-color: var(--builder-text);
  }

  .variants__color {
      width: 36px;
      height: 36px;
      padding: 2px;
      border: 1px solid #dfe2e6;
      border-radius: 9px;
      background: #fff;
  }

  .variants__name {
      flex-grow: 1;
      min-width: 0;
      height: 36px;
      padding: 0 10px;
      border: 1px solid #dfe2e6;
      border-radius: 9px;
      font: inherit;
      color: var(--builder-text);
      background: #fff;
  }

  .variants__remove {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      color: var(--builder-muted);
  }

  .variants__add {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border: 1px solid #dfe2e6;
      border-radius: 9px;
      color: var(--builder-text);

      &:disabled {
          opacity: .4;
      }
  }
</style>
