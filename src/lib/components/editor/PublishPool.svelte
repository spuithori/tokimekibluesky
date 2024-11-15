<script lang="ts">
  import AvatarAgentsSelector from "$lib/components/acp/AvatarAgentsSelector.svelte";
  import {createEventDispatcher} from "svelte";
  const dispatch = createEventDispatcher();

  let {
    post,
    index,
    _agent = $bindable(),
    isEnabled
  } = $props();

  function changeThread() {
      dispatch('change', {
          index: index,
      });
  }
</script>

<div class="publish-pool">
  <div class="publish-pool__avatar">
    <AvatarAgentsSelector
          {_agent}
          isDisabled={'true'}
          style={'publish'}
          onselect={() => {}}
    ></AvatarAgentsSelector>
  </div>

  <div class="publish-pool__content">
    <p class="publish-pool__text">{post.text}</p>
    <button class="publish-pool__button" onclick={changeThread} disabled={isEnabled}></button>
  </div>
</div>

<style lang="postcss">
  .publish-pool {
      max-width: 740px;
      width: 100%;
      margin: 0 auto;
      position: relative;
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 8px;
      padding: 12px 0 12px 12px;


      &::before {
          content: '';
          position: absolute;
          width: 2px;
          top: 40px;
          bottom: -12px;
          left: 31px;
          background-color: var(--border-color-2);
      }

      &:last-child {
          &::before {
              content: none;
          }
      }

      &__text {
          color: var(--text-color-3);
      }

      &__content {
          padding-top: 8px;
      }

      &__button {
          display: block;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
      }
  }
</style>