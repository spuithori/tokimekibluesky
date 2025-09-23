<script lang="ts">
    import {settings} from "$lib/stores";
    import {_} from "svelte-i18n";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    let { item, _agent } = $props();
</script>

<article class="notifications-item notifications-item--follow" class:notifications-item--bubble={$settings?.design?.bubbleTimeline} data-aturi={item.uri}>
    <div class="notifications-item__avatar">
        {#if $settings?.design.postsLayout !== 'minimum'}
            <Avatar href="/profile/{ item.author.handle }" avatar={item.author.avatar}
                    handle={item.author.handle} profile={item.author} {_agent}></Avatar>
        {/if}
    </div>

    <div class="notifications-item__contents">
        <h2 class="notifications-item__title">
                <span class="notifications-item__name">
                  <ProfileCardWrapper handle="{item.author.handle}" {_agent}>
                    <a class="notifications-item__link" href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a>
                </ProfileCardWrapper>
                </span> {$_('followed_you')}
        </h2>

        {#if (item.author.description)}
            <p class="notifications-item__description">{item.author.description}</p>
        {/if}

        <div class="notifications-item__buttons">
            <UserItem user={item.author} layout={'notification'} {_agent}></UserItem>
        </div>
    </div>
</article>