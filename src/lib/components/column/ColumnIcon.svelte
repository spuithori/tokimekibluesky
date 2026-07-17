<script lang="ts">
    import House from '@lucide/svelte/icons/home';
    import Bell from '@lucide/svelte/icons/bell';
    import Newspaper from '@lucide/svelte/icons/newspaper';
    import List from '@lucide/svelte/icons/list';
    import Bookmark from '@lucide/svelte/icons/bookmark';
    import ListTree from '@lucide/svelte/icons/list-tree';
    import Search from '@lucide/svelte/icons/search';
    import Heart from '@lucide/svelte/icons/heart';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Image from '@lucide/svelte/icons/image';
    import Clapperboard from '@lucide/svelte/icons/clapperboard';
    import UserRound from '@lucide/svelte/icons/user-round';
    import MessageCircleReply from '@lucide/svelte/icons/message-circle-reply';
    import Repeat2 from '@lucide/svelte/icons/repeat-2';
    import MessageCircleMore from '@lucide/svelte/icons/message-circle-more';
    import MessagesSquare from '@lucide/svelte/icons/messages-square';
    import BookType from '@lucide/svelte/icons/book-type';

    interface Props {
        type?: string;
        color?: string;
    }

    let { type = "home", color = "var(--deck-heading-icon-color)" }: Props =
        $props();

    const strokeWidth = "var(--icon-stroke-width, 2px)";
</script>

{#if type === "default" || type === "realtime"}
    <House {color} {strokeWidth} />
{:else if type === "notification"}
    <Bell {color} {strokeWidth} />
{:else if type === "custom"}
    <Newspaper {color} {strokeWidth} />
{:else if type === "list" || type === "officialList"}
    <List {color} {strokeWidth} />
{:else if type === "bookmark" || type === "cloudBookmark" || type === "officialBookmark"}
    <Bookmark {color} {strokeWidth} />
{:else if type === "thread"}
    <ListTree {color} {strokeWidth} />
{:else if type === "search"}
    <Search {color} {strokeWidth} />
{:else if type === "like"}
    <Heart {color} {strokeWidth} />
{:else if type === "myPost"}
    <Pencil {color} {strokeWidth} />
{:else if type === "myMedia" || type === "authorMedia"}
    <Image {color} {strokeWidth} />
{:else if type === "myVideo" || type === "authorVideo"}
    <Clapperboard {color} {strokeWidth} />
{:else if type === "author"}
    <UserRound {color} {strokeWidth} />
{:else if type === "authorReplies"}
    <MessageCircleReply {color} {strokeWidth} />
{:else if type === "authorReposts"}
    <Repeat2 {color} {strokeWidth} />
{:else if type === "chat"}
    <MessageCircleMore {color} {strokeWidth} />
{:else if type === "chatList"}
    <MessagesSquare {color} {strokeWidth} />
{:else if type === "networkFeed" || type === "mochottTimeline"}
    <BookType {color} {strokeWidth} />
{/if}
