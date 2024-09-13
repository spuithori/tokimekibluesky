<script lang="ts">
    import {_} from 'svelte-i18n'
    import 'vidstack/player/styles/base.css';
    import 'vidstack/player/styles/plyr/theme.css';
    import 'vidstack/player';
    import 'vidstack/player/layouts/plyr';
    import 'vidstack/player/ui';

    export let video;
    export let isLocal = false;
    let el;

    const plyrLang = {
        'Current time': $_('plyr_current_time'),
        'Disable captions': $_('plyr_disable_captions'),
        'Enable captions': $_('plyr_enable_captions'),
        'Enter Fullscreen': $_('plyr_enter_fullscreen'),
        'Enter PiP': $_('plyr_enter_pip'),
        'Exit Fullscreen': $_('plyr_exit_fullscreen'),
        'Exit PiP': $_('plyr_exit_pip'),
        'Go back to previous menu': $_('plyr_go_back_to_previous_menu'),
        Ad: $_('plyr_ad'),
        AirPlay: $_('plyr_airplay'),
        All: $_('plyr_all'),
        Audio: $_('plyr_audio'),
        Auto: $_('plyr_auto'),
        Buffered: $_('plyr_buffered'),
        Captions: $_('plyr_captions'),
        Default: $_('plyr_default'),
        Disabled: $_('plyr_disabled'),
        Download: $_('plyr_download'),
        Duration: $_('plyr_duration'),
        Enabled: $_('plyr_enabled'),
        End: $_('plyr_end'),
        Forward: $_('plyr_forward'),
        LIVE: $_('plyr_live'),
        Loop: $_('plyr_loop'),
        Mute: $_('plyr_mute'),
        Normal: $_('plyr_normal'),
        Pause: $_('plyr_pause'),
        Play: $_('plyr_play'),
        Played: $_('plyr_played'),
        Quality: $_('plyr_quality'),
        Reset: $_('plyr_reset'),
        Restart: $_('plyr_restart'),
        Rewind: $_('plyr_rewind'),
        Seek: $_('plyr_seek'),
        Settings: $_('plyr_settings'),
        Speed: $_('plyr_speed'),
        Start: $_('plyr_start'),
        Unmute: $_('plyr_unmute'),
        Volume: $_('plyr_volume'),
    };

    $: if (el) {
        el.translations = plyrLang
    }
</script>

<div class="timeline-video-wrap" style="--video-width: {video?.aspectRatio?.width}; --video-height: {video?.aspectRatio?.height}">
  <media-player class="timeline-video-player" class:timeline-video-player--local={isLocal} src="{isLocal ? { src: video?.blob, type: 'video/object' } : video?.playlist}" playsInline crossOrigin>
    <media-provider>
      <media-poster class="timeline-video-player__poster" src="{video?.thumbnail}"></media-poster>
    </media-provider>
    <media-plyr-layout bind:this={el}></media-plyr-layout>
  </media-player>
</div>

<style lang="postcss">
  .timeline-video-wrap {
      aspect-ratio: var(--video-width, 16) / var(--video-height, 9);
      max-height: 600px;

      @container timeline-item (max-width: 345px) {
          margin-left: -50px;
      }
  }
</style>