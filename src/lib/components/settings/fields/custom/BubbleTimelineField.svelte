<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { Rows3, Bubbles } from 'lucide-svelte';
</script>

<div class="layout-radio-group">
    <div class="layout-radio" class:layout-radio--current={settingsStore.design.bubbleTimeline === false}>
        <input type="radio" bind:group={settingsStore.design.bubbleTimeline} id="bubbleTimelineFalse" name="bubbleTimeline" value={false} />
        <label for="bubbleTimelineFalse">
            <Rows3 size="22" color="var(--radio-current-color)"></Rows3>
            {$_('bubble_false')}
        </label>
    </div>

    <div class="layout-radio" class:layout-radio--current={settingsStore.design.bubbleTimeline === true}>
        <input type="radio" bind:group={settingsStore.design.bubbleTimeline} id="bubbleTimelineTrue" name="bubbleTimeline" value={true} />
        <label for="bubbleTimelineTrue">
            <Bubbles size="22" color="var(--radio-current-color)"></Bubbles>
            {$_('bubble_true')}
        </label>
    </div>
</div>
