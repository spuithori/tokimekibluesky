<script>
    import { agent } from '$lib/stores';
    import {onMount} from "svelte";
    let profile = {};

    onMount(async () => {
        if ($agent ? $agent.agent : undefined) {
            profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: $agent.did()});
            profile = profile.data
        }
    })
</script>

<div class="my-profile-badge">
  <a href="/profile/{profile.handle}">
    <img src="{profile.avatar}" alt="">
  </a>
</div>

<style lang="postcss">
  .my-profile-badge {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      overflow: hidden;

      @media (max-width: 767px) {
          width: 38px;
          height: 38px;
      }
  }

  .my-profile-badge img  {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
  }
</style>