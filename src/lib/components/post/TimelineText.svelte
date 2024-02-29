<script lang="ts">
    import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";

    export let record;
    export let _agent;
    import {getTextArray, isUriLocal} from "$lib/richtext";
    import {linkWarning, settings} from "$lib/stores";
    import {detectDifferentDomainUrl} from "$lib/util";

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
</script>

{#each getTextArray(record) as item}
    {#if (item.isLink() && item.link)}
        {#if (isUriLocal(item.link.uri))}
            <a href="{new URL(item.link.uri).pathname}">{item.text}</a>
        {:else}
            <a href="{item.link.uri}" target="_blank" rel="noopener nofollow noreferrer" on:click={(e) => {handleUrlClick(e, item)}}>{item.text}</a>
        {/if}
    {:else if (item.isMention() && item.mention)}
        <ProfileCardWrapper handle="{item.text.slice(1)}" {_agent}>
            <a href="/profile/{item.text.slice(1)}">{item.text}</a>
        </ProfileCardWrapper>
    {:else if (item.isTag() && item.tag)}
        <a href="/search?q={encodeURIComponent('#' + item.tag?.tag)}">{item.text}</a>
    {:else}
        <span>{item.text}</span>
    {/if}
{/each}