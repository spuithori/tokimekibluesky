<script lang="ts">
  import {settings} from "$lib/stores";
  export let external;
</script>

<div class="timeline-external">
  <div class="timeline-external__image">
    {#if (external.thumb && $settings?.design.postsLayout !== 'minimum')}
      <img src="{external.thumb}" alt="">
    {/if}
  </div>

  <div class="timeline-external__content">
    <p class="timeline-external__title"><a href="{external.uri}" target="_blank" rel="noopener nofollow noreferrer">{external.title}</a>
    </p>
    <p class="timeline-external__description">{external.description}</p>
    <p class="timeline-external__url">{external.uri}</p>
  </div>
</div>