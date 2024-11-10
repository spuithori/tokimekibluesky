<script lang="ts">
    import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";
    import {getTextArray, isUriLocal} from "$lib/richtext";
    import {linkWarning, settings, timelineHashtags} from "$lib/stores";
    import {detectDifferentDomainUrl} from "$lib/util";
    import TimelineTagLink from "$lib/components/post/TimelineTagLink.svelte";

    let { record, _agent } = $props();
    let textArray = $state(getTextArray(record));

    $effect(() => {
        textArray = getTextArray(record);
    })

    function handleUrlClick(e, item) {
        if (!$settings.general.linkWarningConfirmSkip) {
            $settings.general.linkWarningConfirmSkip = false;
        }

        if ($settings.general.linkWarningConfirmSkip) {
            return true;
        }

        if (!detectDifferentDomainUrl(item.link.uri, item.text)) {
            e.preventDefault();
            linkWarning.set(item.link.uri);
        }
    }

    textArray.forEach(item => {
        if (item.isTag() && item.tag?.tag) {
            const index = $timelineHashtags.indexOf(item.tag.tag);
            if (index > -1) {
                $timelineHashtags.splice(index, 1);
            }

            $timelineHashtags.unshift(item.tag.tag);
            $timelineHashtags.length = 5;
            $timelineHashtags = $timelineHashtags.filter(v => v);
        }
    })
</script>

{#each textArray as item}
    {#if (item.isLink() && item.link)}
        {#if (isUriLocal(item.link.uri))}
            <a href="{new URL(item.link.uri).pathname}">{item.text}</a>
        {:else}
            <a href="{item.link.uri}" target="_blank" rel="noopener nofollow noreferrer" onclick={(e) => {handleUrlClick(e, item)}}>{item.text}</a>
        {/if}
    {:else if (item.isMention() && item.mention)}
        <ProfileCardWrapper handle="{item.text.slice(1)}" {_agent}>
            <a href="/profile/{item.text.slice(1)}">{item.text}</a>
        </ProfileCardWrapper>
    {:else if (item.isTag() && item.tag)}
        <div class="tag-wrap">
            <TimelineTagLink {item}></TimelineTagLink>
        </div>
    {:else}
        <span>{item.text}</span>
    {/if}
{/each}

<style lang="postcss">
    .tag-wrap {
        display: inline-block;
        position: relative;
    }
</style>