<script lang="ts">
  import {settings} from "$lib/stores";
  import {getSpotifyUri, getTwitterUrl, getYouTubeUrl} from "$lib/components/post/embedUtil";
  import {Spotify, Tweet, YouTube} from "sveltekit-embed";
  export let external;

  if (!$settings?.embed) {
      $settings.embed = {
          x: true,
          youtube: true,
          spotify: false,
          mastodon: true,
      };
  }

  if (!$settings?.design?.externalLayout) {
      $settings.design.externalLayout = 'normal';
  }
</script>

{#if (getTwitterUrl(external.uri) && $settings?.embed?.x && $settings?.design.externalLayout !== 'compact')}
  <div class="timeline-twitter-external">
    <Tweet tweetLink={getTwitterUrl(external.uri)}></Tweet>
  </div>
{:else}
  <div
    class="timeline-external timeline-external--{$settings?.design.postsLayout} timeline-external--{$settings?.design.externalLayout}"
    class:timeline-external--youtube={getYouTubeUrl(external.uri)}
    class:timeline-external--spotify={getSpotifyUri(external.uri)}
  >
    {#if ($settings?.design.externalLayout !== 'compact')}
      <div class="timeline-external__image">
        {#if (external.thumb)}
          {#if (getYouTubeUrl(external.uri) && $settings?.embed?.youtube)}
            <YouTube youTubeId={getYouTubeUrl(external.uri)}></YouTube>
          {:else if (getSpotifyUri(external.uri) && $settings?.embed?.spotify)}
            <Spotify spotifyLink={getSpotifyUri(external.uri)} height="152px" width="100%"></Spotify>
          {:else}
            <img src="{external.thumb}" alt="">
          {/if}
        {/if}
      </div>
    {/if}

    <div class="timeline-external__content">
      <p class="timeline-external__title"><a href="{external.uri}" target="_blank" rel="noopener nofollow noreferrer">{external.title || external.uri}</a>
      </p>

      {#if (external.description)}
        <p class="timeline-external__description">{external.description}</p>
      {/if}
    </div>
  </div>
{/if}

<style lang="postcss">
  .timeline-twitter-external {

  }
</style>