<script lang="ts">
  import {settings} from "$lib/stores";
  import { getBluemotionUrl, getGiphyId, getSpotifyUri, getTwitterUrl, getYouTubeUrl, getTenorUrl, getPollUrl } from "$lib/components/post/embedUtil";
  import EmbedTenor from "$lib/components/post/EmbedTenor.svelte";
  import EmbedX from "$lib/components/post/EmbedX.svelte";
  import EmbedPoll from "$lib/components/post/EmbedPoll.svelte";

  interface Props {
    external: any;
    _agent?: any;
  }

  let { external, _agent }: Props = $props();

  const pollInfo = getPollUrl(external.uri);
</script>

{#if pollInfo && _agent}
  <EmbedPoll {pollInfo} {_agent}></EmbedPoll>
{:else if (getTwitterUrl(external.uri) && $settings?.embed?.x && $settings?.design.externalLayout !== 'compact')}
  <div class="timeline-twitter-external">
    <EmbedX uri={getTwitterUrl(external.uri)}></EmbedX>
  </div>
{:else}
  <div
    class="timeline-external timeline-external--{$settings?.design?.postsLayout} timeline-external--{$settings?.design?.externalLayout}"
    class:timeline-external--youtube={getYouTubeUrl(external.uri)}
    class:timeline-external--spotify={getSpotifyUri(external.uri)}
    class:timeline-external--gif={getGiphyId(external.uri) && $settings?.embed?.giphy}
    class:timeline-external--tenor={getTenorUrl(external.uri) && $settings?.embed?.tenor}
  >
    {#if ($settings?.design.externalLayout !== 'compact')}
      {#if (getYouTubeUrl(external.uri) && $settings?.embed?.youtube)}
        <div class="timeline-external__image">
          <iframe loading="lazy" class="youtube-iframe" width="560" height="315" src="https://www.youtube-nocookie.com/embed/{getYouTubeUrl(external.uri)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
      {:else if (getSpotifyUri(external.uri) && $settings?.embed?.spotify)}
        <div class="timeline-external__image">
          <iframe loading="lazy" src="https://open.spotify.com/embed/{getSpotifyUri(external.uri)}" width="100%" height="152" frameBorder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
        </div>
      {:else if (getBluemotionUrl(external.uri) && $settings?.embed?.bluemotion)}
        <div class="timeline-external__image">
          <div class="timeline-bluemotion-external">
            <iframe loading="lazy" src="https://www.bluemotion.app/embed{getBluemotionUrl(external.uri)}" title="Bluemotion video player" frameBorder="0"></iframe>
          </div>
        </div>
      {:else if (getTenorUrl(external.uri) && $settings?.embed?.tenor)}
        <div class="timeline-external__image">
          <div class="timeline-tenor-external">
            <EmbedTenor tenor={getTenorUrl(external.uri)}></EmbedTenor>
          </div>
        </div>
      {:else if (getGiphyId(external.uri) && $settings?.embed?.giphy)}
        <div class="timeline-external__image">
          <div class="timeline-giphy-external">
            <a href={external.uri} target="_blank" rel="noopener nofollow noreferrer">
              <img loading="lazy" src="https://i.giphy.com/media/{getGiphyId(external.uri)}/200.webp" alt="">
            </a>

            <div class="timeline-giphy-external__logo">
              <a href="https://giphy.com/" target="_blank" rel="nofollow">
                <img src="/giphy-logo.png" alt="Powered by GIPHY">
              </a>
            </div>
          </div>
        </div>
      {:else}
        {#if (external.thumb)}
          <div class="timeline-external__image">
            <img src="{external.thumb}" alt="">
          </div>
        {/if}
      {/if}
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

  .youtube-iframe {
    width: 100%;
    height: 100%;
  }
</style>