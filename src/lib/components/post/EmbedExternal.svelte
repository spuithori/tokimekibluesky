<script lang="ts">
  import {settings} from "$lib/stores";
  import {
      getBluemotionUrl,
      getGiphyId,
      getSpotifyUri,
      getTwitterUrl,
      getYouTubeUrl,
      getTenorUrl
  } from "$lib/components/post/embedUtil";
  import {Spotify, Tweet, YouTube} from "sveltekit-embed";
  import { Gif } from '@giphy/svelte-components';
  import EmbedTenor from "$lib/components/post/EmbedTenor.svelte";
  export let external;

  if (!$settings?.embed) {
      $settings.embed = {
          x: true,
          youtube: true,
          spotify: false,
          mastodon: true,
          bluemotion: true,
      };
  }

  if ($settings?.embed?.bluemotion === undefined) {
      $settings.embed.bluemotion = true;
  }

  if ($settings?.embed?.giphy === undefined) {
      $settings.embed.giphy = true;
  }

  if ($settings?.embed?.tenor === undefined) {
      $settings.embed.tenor = true;
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
    class:timeline-external--gif={getGiphyId(external.uri) && $settings?.embed?.giphy}
    class:timeline-external--tenor={getTenorUrl(external.uri) && $settings?.embed?.tenor}
  >
    {#if ($settings?.design.externalLayout !== 'compact')}
      <div class="timeline-external__image">
        {#if (external.thumb)}
          {#if (getYouTubeUrl(external.uri) && $settings?.embed?.youtube)}
            <YouTube youTubeId={getYouTubeUrl(external.uri)}></YouTube>
          {:else if (getSpotifyUri(external.uri) && $settings?.embed?.spotify)}
            <Spotify spotifyLink={getSpotifyUri(external.uri)} height="152px" width="100%"></Spotify>
          {:else if (getBluemotionUrl(external.uri) && $settings?.embed?.bluemotion)}
            <div class="timeline-bluemotion-external">
              <iframe
                  src="https://www.bluemotion.app/embed{getBluemotionUrl(external.uri)}"
                  title="Bluemotion video player"
                  loading="lazy"
                  frameBorder="0"
              ></iframe>
            </div>
          {:else if (getTenorUrl(external.uri) && $settings?.embed?.tenor)}
            <div class="timeline-tenor-external">
              <EmbedTenor tenor={getTenorUrl(external.uri)}></EmbedTenor>
            </div>
          {:else if (getGiphyId(external.uri) && $settings?.embed?.giphy)}
            {#await getGiphyId(external.uri)}
            {:then gif}
              <div class="timeline-giphy-external">
                <a href="{external.uri}" target="_blank" rel="noopener nofollow noreferrer">
                  <Gif {gif} width={'100%'} borderRadius={0}></Gif>
                </a>

                <div class="timeline-giphy-external__logo">
                  <a href="https://giphy.com/" target="_blank" rel="nofollow">
                    <img src="/giphy-logo.png" alt="Powered by GIPHY">
                  </a>
                </div>
              </div>
            {:catch error}
            {/await}
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

  .timeline-bluemotion-external {
      position: relative;
      height: 100%;
      z-index: 1;

      iframe {
          width: 100%;
          height: 100%;
      }
  }

  .timeline-giphy-external {
      position: relative;
      height: 100%;
      z-index: 1;

      &__logo {
          background-color: var(--bg-color-1);
          position: absolute;
          top: 4px;
          left: 4px;
          opacity: .5;

          a {
              display: block;
              width: 90px;
              height: auto;
          }
      }
  }

  .timeline-external--gif,
  .timeline-external--tenor {
      padding-bottom: 0;
      overflow: hidden;

      .timeline-external__content {
          display: none;
      }
  }
</style>