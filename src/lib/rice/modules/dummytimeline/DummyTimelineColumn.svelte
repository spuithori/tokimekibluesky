<script lang="ts" module>
    interface DummyAuthor {
        name: string;
        handle: string;
        color: string;
    }

    interface DummyPost {
        author: DummyAuthor;
        text: string;
        time: string;
        reply?: boolean;
        repostBy?: string;
        likes?: number;
        replies?: number;
    }

    const AUTHORS: Record<string, DummyAuthor> = {
        suzu: { name: '鈴木ひばり', handle: 'hibari.example', color: '#7aa2f7' },
        mugi: { name: 'むぎ', handle: 'mugi-bakery.example', color: '#e0af68' },
        tanba: { name: '丹波さとる', handle: 'satoru-farm.example', color: '#9ece6a' },
        koyuki: { name: '小雪', handle: 'koyuki.example', color: '#bb9af7' },
        rakuda: { name: 'らくだ書房', handle: 'rakuda-books.example', color: '#f7768e' },
        pon: { name: 'ぽん', handle: 'pon-camera.example', color: '#2ac3de' },
    };

    const POSTS: DummyPost[] = [
        { author: AUTHORS.suzu, text: '朝の散歩、川沿いの道で白鷺に会った。今日はいい日になりそう', time: '2分前', likes: 12, replies: 2 },
        { author: AUTHORS.mugi, text: '本日のパン、焼き上がりました🍞 くるみカンパーニュは早めの時間になくなりそうです', time: '8分前', likes: 34, replies: 1 },
        { author: AUTHORS.suzu, text: '買いに行きます!とっておいてください', time: '5分前', reply: true, likes: 3 },
        { author: AUTHORS.mugi, text: 'おひとつお取り置きしますね〜', time: '3分前', reply: true, likes: 5 },
        { author: AUTHORS.tanba, text: '畑のトマトがようやく色づいてきた。今年は雨が多かったけれど、味は濃くなりそうだ', time: '26分前', likes: 58, replies: 4 },
        { author: AUTHORS.koyuki, text: '窓辺で猫が丸くなっている。仕事にならない(嬉しい)', time: '41分前', likes: 102, replies: 6 },
        { author: AUTHORS.rakuda, text: '雨上がりの古本市、無事に開催します。濡れた石畳の匂いと古い紙の匂い、どちらも好きです', time: '1時間前', repostBy: '小雪', likes: 77, replies: 3 },
        { author: AUTHORS.pon, text: '夕立のあとの畦道。レンズを向けたら、蛙が一斉に鳴きやんだ', time: '2時間前', likes: 210, replies: 9 },
        { author: AUTHORS.tanba, text: 'かえるは写真が苦手なんですよ', time: '2時間前', reply: true, likes: 18 },
        { author: AUTHORS.pon, text: 'シャイな仕事仲間です', time: '1時間前', reply: true, likes: 25 },
        { author: AUTHORS.koyuki, text: '午後は縁側で豆のすじ取り。単純作業のあいだだけ、頭の中がしんとする', time: '3時間前', likes: 66, replies: 2 },
        { author: AUTHORS.mugi, text: '明日は定休日です。仕込みの粉だけ、静かに発酵しています', time: '4時間前', likes: 41 },
        { author: AUTHORS.suzu, text: '図書館で借りた鳥の図鑑、返す前にもう一周。ヨタカのページに付箋を貼りすぎた', time: '5時間前', likes: 29, replies: 1 },
        { author: AUTHORS.rakuda, text: '棚の整理中に昭和の旅行記を発見。地図の折り目に、前の持ち主の旅程メモが残っていた', time: '6時間前', likes: 133, replies: 7 },
    ];

    function avatarUri(author: DummyAuthor): string {
        const initial = author.name.slice(0, 1);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="92" height="92"><rect width="92" height="92" fill="${author.color}"/><text x="46" y="46" font-family="sans-serif" font-size="40" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initial}</text></svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
</script>

<script lang="ts">
    import Heart from '@lucide/svelte/icons/heart';
    import MessageCircle from '@lucide/svelte/icons/message-circle';
    import Repeat2 from '@lucide/svelte/icons/repeat-2';
    import { riceState } from '$lib/rice/riceState.svelte';

    const options = $derived(riceState.moduleConfig('dummytimeline')?.options ?? {});
    const repeat = $derived(Math.max(1, Math.min(10, Number(options['repeat']) || 1)));

    const posts = $derived(
        Array.from({ length: repeat }, () => POSTS).flat(),
    );
</script>

<div class="rice-dummy-timeline">
    {#each posts as post, i (i)}
        <article class="rice-dummy-post" class:rice-dummy-post--reply={post.reply}>
            {#if post.repostBy}
                <p class="rice-dummy-post__repost">
                    <Repeat2 size={14}></Repeat2>
                    {post.repostBy} がリポスト
                </p>
            {/if}

            <div class="rice-dummy-post__body">
                <div class="rice-dummy-post__avatar-rail">
                    <img class="rice-dummy-post__avatar" src={avatarUri(post.author)} alt="" loading="lazy" />
                    {#if post.reply}
                        <span class="rice-dummy-post__thread-line"></span>
                    {/if}
                </div>

                <div class="rice-dummy-post__main">
                    <p class="rice-dummy-post__meta">
                        <span class="rice-dummy-post__name">{post.author.name}</span>
                        <span class="rice-dummy-post__handle">@{post.author.handle}</span>
                        <span class="rice-dummy-post__time">{post.time}</span>
                    </p>
                    <p class="rice-dummy-post__text">{post.text}</p>
                    <p class="rice-dummy-post__reactions">
                        <span class="rice-dummy-post__reaction"><MessageCircle size={15}></MessageCircle>{post.replies ?? ''}</span>
                        <span class="rice-dummy-post__reaction"><Repeat2 size={15}></Repeat2></span>
                        <span class="rice-dummy-post__reaction"><Heart size={15}></Heart>{post.likes ?? ''}</span>
                    </p>
                </div>
            </div>
        </article>
    {/each}
</div>

<style>
    .rice-dummy-timeline {
        display: flex;
        flex-direction: column;
        background-color: var(--timeline-bg-color);
        color: var(--timeline-color);
        font-size: var(--timeline-content-font-size);
    }

    .rice-dummy-post {
        padding: 12px 16px 8px;
        border-bottom: 1px solid var(--border-color-1);
    }

    .rice-dummy-post--reply {
        padding-left: 32px;
    }

    .rice-dummy-post__repost {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        color: var(--text-color-3);
        font-size: 12px;
    }

    .rice-dummy-post__body {
        display: grid;
        grid-template-columns: var(--avatar-size, 46px) 1fr;
        gap: var(--avatar-gap, 10px);
    }

    .rice-dummy-post__avatar-rail {
        position: relative;
    }

    .rice-dummy-post__avatar {
        width: var(--avatar-size, 46px);
        height: var(--avatar-size, 46px);
        border-radius: var(--avatar-border-radius, 50%);
        display: block;
    }

    .rice-dummy-post__thread-line {
        position: absolute;
        top: calc(var(--avatar-size, 46px) + 4px);
        bottom: -12px;
        left: calc(var(--avatar-size, 46px) / 2);
        width: 2px;
        background-color: var(--border-color-1);
        border-radius: 1px;
    }

    .rice-dummy-post__meta {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
    }

    .rice-dummy-post__name {
        color: var(--timeline-user-color);
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .rice-dummy-post__handle,
    .rice-dummy-post__time {
        color: var(--timeline-date-color);
        font-size: var(--timeline-meta-font-size, 13px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .rice-dummy-post__time {
        margin-left: auto;
        flex-shrink: 0;
    }

    .rice-dummy-post__text {
        margin-top: 2px;
        line-height: 1.6;
        overflow-wrap: anywhere;
    }

    .rice-dummy-post__reactions {
        display: flex;
        justify-content: var(--timeline-reaction-justify, flex-start);
        gap: var(--timeline-reaction-gap, 32px);
        margin-top: 8px;
        color: var(--timeline-reaction-icon-color, var(--text-color-3));
        font-size: 12px;
    }

    .rice-dummy-post__reaction {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
</style>
