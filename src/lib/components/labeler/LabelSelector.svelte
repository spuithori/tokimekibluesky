<script lang="ts">
  import {_} from "svelte-i18n";
  export let value = 'warn';
  export let name;

  export let contentLabelsSelections = [
      {
          value: 'hide',
          text: $_('hide'),
      },
      {
          value: 'warn',
          text: $_('warn'),
      },
      {
          value: 'ignore',
          text: $_('show'),
      }
  ];
</script>

<div class="label-selector">
  {#each contentLabelsSelections as choice}
    <label class="label-selector__item">
      <input type="radio" class="label-selector__input" name={name} value={choice.value} bind:group={value}>
      <span class="label-selector__text">{choice.text}</span>
    </label>
  {/each}
</div>

<style lang="postcss">
  .label-selector {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid var(--border-color-2);
      border-radius: var(--border-radius-2);
      background-color: var(--bg-color-3);
      overflow: hidden;

      &__item {
          height: 40px;
          position: relative;
          cursor: pointer;
          border-right: 1px solid var(--border-color-2);
          display: flex;
          align-items: center;
          justify-content: center;

          &:last-child {
              border-right: none;
          }

          &:has(input:checked) {
              background-color: var(--primary-color);
              color: var(--bg-color-1);
          }
      }

      &__input {
          position: absolute;
          width: 0;
          height: 0;
          visibility: hidden;

          &:checked {

          }
      }
  }
</style>