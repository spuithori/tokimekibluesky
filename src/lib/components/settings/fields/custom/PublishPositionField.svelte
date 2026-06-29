<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { publishState } from '$lib/classes/publishState.svelte';
    import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
    import PanelBottomOpen from '@lucide/svelte/icons/panel-bottom-open';
    import AppWindowMac from '@lucide/svelte/icons/app-window-mac';
</script>

<div class="radio-group">
    <div class="radio radio--boxed">
        <input type="radio" bind:group={publishState.layout} id="publishPositionLeft" name="publishPosition" value={'left'} />
        <label for="publishPositionLeft">
            <span class="radio__ui"></span>
            <PanelLeftOpen size="16"></PanelLeftOpen>
            {$_('publish_position_left')}
        </label>
    </div>

    <div class="radio radio--boxed">
        <input type="radio" bind:group={publishState.layout} id="publishPositionBottom" name="publishPosition" value={'bottom'} />
        <label for="publishPositionBottom">
            <span class="radio__ui"></span>
            <PanelBottomOpen size="16"></PanelBottomOpen>
            {$_('publish_position_bottom')}
        </label>
    </div>

    <div class="radio radio--boxed">
        <input type="radio" bind:group={publishState.layout} id="publishPositionPopup" name="publishPosition" value={'popup'} />
        <label for="publishPositionPopup">
            <span class="radio__ui"></span>
            <AppWindowMac size="16"></AppWindowMac>
            {$_('publish_position_popup')}
        </label>
    </div>
</div>
