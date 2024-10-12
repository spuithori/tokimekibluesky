<script lang="ts">
    import {_} from 'svelte-i18n'
    import {ChevronLeft, ChevronRight, Gauge, Settings, SlidersHorizontal} from "lucide-svelte";
</script>

<media-menu class="video-menu-wrap">
  <media-menu-button class="video-controls-button video-settings-button" aria-label="Settings">
    <Settings size="20" color="#fff" class="vide-settings-button--settings" type="settings"></Settings>
  </media-menu-button>

  <media-menu-items class="video-menu-items" placement="top end" offset="12">
    <!-- //TODO なんかダブらせると動く (マジ謎) -->
    <media-menu class="video-menu-item">
      <media-menu-button class="video-submenu-button" style="display: none !important;">
        <Gauge size="18" type="settings-menu" class="video-submenu-icon"></Gauge>
        <ChevronLeft size="20" type="chevron-left" class="video-submenu-close-button"></ChevronLeft>

        <span class="video-submenu-label">Speed</span>
        <span class="video-submenu-hint" data-part="hint"></span>

        <ChevronRight size="20" type="chevron-right" class="video-submenu-open-button"></ChevronRight>
      </media-menu-button>

      <media-menu-items class="video-submenu">
        <media-speed-radio-group class="video-radio-group">
          <template>
            <media-radio class="video-radio">
              <span class="video-radio-icon" type="check"></span>
              <span class="video-radio-label" data-part="label"></span>
            </media-radio>
          </template>
        </media-speed-radio-group>
      </media-menu-items>
    </media-menu>

    <media-menu class="video-menu-item">
      <media-menu-button class="video-submenu-button">
        <Gauge size="18" type="settings-menu" class="video-submenu-icon"></Gauge>
        <ChevronLeft size="20" type="chevron-left" class="video-submenu-close-button"></ChevronLeft>

        <span class="video-submenu-label">{$_('plyr_speed')}</span>
        <span class="video-submenu-hint" data-part="hint"></span>

        <ChevronRight size="20" type="chevron-right" class="video-submenu-open-button"></ChevronRight>
      </media-menu-button>

      <media-menu-items class="video-submenu">
        <media-speed-radio-group class="video-radio-group" normalLabel={$_('plyr_normal')}>
          <template>
            <media-radio class="video-radio">
              <span class="video-radio-icon" type="check"></span>
              <span class="video-radio-label" data-part="label"></span>
            </media-radio>
          </template>
        </media-speed-radio-group>
      </media-menu-items>
    </media-menu>

    <media-menu class="video-menu-item">
      <media-menu-button class="video-submenu-button">
        <SlidersHorizontal size="18" type="settings-menu" class="video-submenu-icon"></SlidersHorizontal>
        <ChevronLeft size="20" type="chevron-left" class="video-submenu-close-button"></ChevronLeft>

        <span class="video-submenu-label">{$_('plyr_quality')}</span>
        <span class="video-submenu-hint" data-part="hint"></span>

        <ChevronRight size="20" type="chevron-right" class="video-submenu-open-button"></ChevronRight>
      </media-menu-button>

      <media-menu-items class="video-submenu">
        <media-quality-radio-group class="video-radio-group" autoLabel={$_('plyr_auto')}>
          <template>
            <media-radio class="video-radio">
              <span class="video-radio-icon" type="check"></span>
              <span class="video-radio-label" data-part="label"></span>
            </media-radio>
          </template>
        </media-quality-radio-group>
      </media-menu-items>
    </media-menu>
  </media-menu-items>
</media-menu>