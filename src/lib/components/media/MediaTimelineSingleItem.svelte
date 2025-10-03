<script lang="ts">
    import {settings, labelerSettings} from '$lib/stores';
    import {AppBskyEmbedImages} from '@atproto/api';
    import {contentLabelling, detectHide, detectWarn} from "$lib/timelineFilter";
    import {EyeOff, Handshake, BadgeCheck, CircleCheck} from "lucide-svelte";
    import {appState} from "$lib/classes/appState.svelte.js";
    import MediaTimelineSlider from "$lib/components/media/MediaTimelineSlider.svelte";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import {format, parseISO} from "date-fns";
    import {intlRelativeTimeFormatState} from "$lib/classes/intlRelativeTimeFormatState.svelte";
    import TimelineText from "$lib/components/post/TimelineText.svelte";
    import ReactionButtons from "$lib/components/post/ReactionButtons.svelte";

    let { feed, index, data, _agent } = $props();
    let timeDistanceToNow = $state(intlRelativeTimeFormatState.format({ laterDate: parseISO(data.post.indexedAt) }));

    const moderateData = contentLabelling(data.post, _agent.did(), $settings, appState.labelDefs.current, $labelerSettings);
    let isHide: boolean = $state(false);
    let isWarn = $state(detectWarn(moderateData, 'contentList'));
    isHide = detectHide(moderateData, 'contentList', isHide, data.post);
</script>

{#if (!isHide)}
    <div class="media-item">
        <div class="media-timeline-profile">
            <div class="media-timeline-profile__avatar">
                <Avatar href="/profile/{ data.post.author.did }" avatar={data.post.author.avatar} profile={data.post.author} handle={data.post.author.handle} {_agent}></Avatar>

                {#if (data.post.author?.viewer?.followedBy && $settings?.design?.mutualDisplay)}
                    <div class="avatar-mutual-badge">
                        <Handshake size="16" color="var(--primary-color)"></Handshake>
                    </div>
                {/if}
            </div>

            <div class="media-timeline-profile__content">
                <div class="timeline__meta">
                    <p class="timeline__user">
                        { data.post.author.displayName || data.post.author.handle }
                    </p>

                    {#if data?.post?.author?.verification?.trustedVerifierStatus === 'valid'}
                        <span class="timeline__verified" aria-label="(Trusted verifier)">
                            <BadgeCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></BadgeCheck>
                        </span>
                    {/if}

                    {#if data?.post?.author?.verification?.verifiedStatus === 'valid'}
                        <span class="timeline__verified" aria-label="(Verified)">
                           <CircleCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></CircleCheck>
                        </span>
                    {/if}
                </div>
            </div>
        </div>

        <div class="media-timeline-single-slider">
            {#if (AppBskyEmbedImages.isView(data.post?.embed))}
                <MediaTimelineSlider images={data.post.embed.images}></MediaTimelineSlider>
            {:else if (AppBskyEmbedImages.isView(data.post?.embed?.media))}
                <MediaTimelineSlider images={data.post.embed.media.images}></MediaTimelineSlider>
            {/if}

            {#if (isWarn && isWarn.for === 'media')}
                <div class="media-warn" onclick={() => {isWarn = undefined}}>
                    <EyeOff color="#fff"></EyeOff>
                </div>
            {/if}
        </div>

        <div class="media-timeline-single-content">
            <p class="timeline__text">
                <TimelineText record={data.post.record} {_agent} handle={data?.post?.author?.handle}></TimelineText>
            </p>

            <p class="timeline__date">
                {#if $settings?.design.absoluteTime}
                    <Tooltip>
                        {#snippet ref()}
                            <span>{format(parseISO(data.post.indexedAt), $settings.design?.datetimeFormat || 'yyyy-MM-dd HH:mm')}</span>
                        {/snippet}
                        {#snippet content()}
                            <span aria-hidden="true" class="timeline-tooltip">{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                        {/snippet}
                    </Tooltip>
                {:else}
                    <Tooltip>
                        {#snippet ref()}
                            <span>{timeDistanceToNow}</span>
                        {/snippet}
                        {#snippet content()}
                            <span aria-hidden="true" class="timeline-tooltip">{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                        {/snippet}
                    </Tooltip>
                {/if}
            </p>

            <ReactionButtons {_agent} post={data.post} reason={data?.reason}></ReactionButtons>
        </div>
    </div>
{/if}

<style lang="postcss">
    .media-item {
        margin-bottom: 24px;
        margin-inline: calc(var(--timeline-padding) * -1);
        overflow: hidden;
    }

    .media-timeline-single-slider {
        margin: 8px 0;
        position: relative;
        overflow: hidden;
    }

    .media-timeline-single-content {
        padding: 0 var(--timeline-padding);
    }

    .media-warn {
        position: absolute;
        inset: 0;
        background-color: rgba(0, 0, 0, .8);
        backdrop-filter: blur(16px);
        display: grid;
        place-content: center;
    }

    .media-timeline-profile {
        display: grid;
        grid-template-columns: 32px 1fr;
        gap: 8px;
        padding: 0 var(--timeline-padding);
    }

    .timeline__date {
        font-size: 12px;
        margin-top: 2px;
    }
</style>