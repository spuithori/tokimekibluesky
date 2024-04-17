<script lang="ts">
  import {_} from "svelte-i18n";
  import {createEventDispatcher} from "svelte";
  import LabelDetailModal from "$lib/components/post/LabelDetailModal.svelte";
  const dispatch = createEventDispatcher();

  export let labels;
  export let behavior = 'cover';
  let isVisible = false;
  let isInfoOpen = false;

  if (behavior === 'inform') {
      isVisible = true;
  }

  function handleClick() {
      // dispatch('visible');
      isVisible = true;
  }

  function handleHideClick() {
      isVisible = false;
  }
</script>

<div class="timeline-warn" class:timeline-warn--hide={isVisible}>
  <div class="timeline-warn-heading">
    <p class="timeline-warn-title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></p>
    <ul class="timeline-warn-list">
      <li>
        {#if (labels[0]?.source?.type === 'user' || labels[0]?.label?.src === 'did:plc:ar7c4by46qjdydhdevvrndac' || !labels[0]?.labelDef?.locales[0]?.name)}
          {$_('labeling_' + labels[0].label?.val)}
        {:else}
          {labels[0]?.labelDef?.locales[0]?.name}
        {/if}
      </li>

      {#if (labels.length > 1)}
        <li>+ {labels.length - 1} {$_('labeling_more_labels')}</li>
      {/if}
    </ul>
  </div>

  <div class="timeline-warn-button">
    <button class="text-button" on:click={handleClick}>{$_('show_button')}</button>
  </div>

  <button class="timeline-warn-info-button" on:click={() => {isInfoOpen = true}}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  </button>
</div>

{#if isVisible}
  <div class="timeline-warn-hiding">
    <div class="timeline-warn-heading">
      <p class="timeline-warn-title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></p>
      <ul class="timeline-warn-list">
        <li>
          {#if (labels[0]?.source?.type === 'user' || labels[0]?.label?.src === 'did:plc:ar7c4by46qjdydhdevvrndac' || !labels[0]?.labelDef?.locales[0]?.name)}
            {$_('labeling_' + labels[0].label?.val)}
          {:else}
            {labels[0]?.labelDef?.locales[0]?.name}
          {/if}
        </li>

        {#if (labels.length > 1)}
          <li>+ {labels.length - 1}</li>
        {/if}
      </ul>
    </div>

    {#if (behavior !== 'inform')}
      <div class="timeline-warn-button">
        <button class="text-button" on:click={handleHideClick}>{$_('hide_button')}</button>
      </div>
    {/if}
  </div>
{/if}

{#if (isInfoOpen)}
  <LabelDetailModal labels={labels} on:close={() => {isInfoOpen = false}}></LabelDetailModal>
{/if}

<style lang="postcss">
  .timeline-warn-heading {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0 5px;
      margin-bottom: 4px;
  }

  .timeline-warn-hiding {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background-color: var(--bg-color-2);
      border: 1px solid var(--border-color-1);
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 8px;

      .timeline-warn-list {
          font-size: 13px;
      }

      .timeline-warn-heading {
          margin-bottom: 0;
      }
  }

  .timeline-warn-list {
      list-style: none;
      display: flex;
      gap: 0 8px;
      flex-wrap: wrap;
  }

  .timeline-warn-info-button {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      display: grid;
      place-content: center;
      border-radius: 4px;
      transition: background-color .25s ease-in-out;

      &:hover {
          background-color: rgba(0, 0, 0, .1);
      }
  }

  .timeline-warn-button {
      position: relative;
      z-index: 1;
  }
</style>