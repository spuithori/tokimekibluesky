<script lang="ts">
    import '../../styles.css';
    import ReactionButtons from '$lib/components/post/ReactionButtons.svelte';
    import { settings } from '$lib/stores';
    import { initColumns } from '$lib/classes/columnState.svelte';
    import { setPostState } from '$lib/classes/postState.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';

    initColumns();
    setPostState();

    const post = {
        uri: 'at://did:plc:test/app.bsky.feed.post/1',
        cid: 'cid1',
        author: { did: 'did:plc:test', handle: 'test.example', displayName: 'Test User' },
        record: { text: 'hello tokimeki', createdAt: '2024-01-01T12:00:00Z' },
        replyCount: 2,
        repostCount: 3,
        likeCount: 5,
        indexedAt: '2024-01-01T12:00:00Z',
        viewer: {},
    };

    let wrapStyle = $state('');
    let themeStyle = $state(defaultThemeInline());

    if (typeof window !== 'undefined') {
        (window as any).__riceReactionsTest = {
            ready: true,
            setShown(shown: string[]) {
                settings.update((s: any) => {
                    s.design.reactionButtons = { ...s.design.reactionButtons, shown };
                    return s;
                });
            },
            setWrapStyle(style: string) {
                wrapStyle = style;
            },
            getMetrics() {
                const el = document.querySelector('.timeline-reaction') as HTMLElement | null;
                const cs = el ? getComputedStyle(el) : null;
                const items = [...document.querySelectorAll('.timeline-reaction__item')];
                return {
                    className: el?.className ?? null,
                    display: cs?.display ?? null,
                    justify: cs?.justifyContent ?? null,
                    gap: cs?.gap ?? null,
                    itemWidths: items.map((item) => getComputedStyle(item).width),
                    itemCount: items.length,
                };
            },
        };
    }
</script>

<div class="app" style={themeStyle}>
    <div class="reaction-wrap" style={wrapStyle}>
        <ReactionButtons {post} _agent={undefined}></ReactionButtons>
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
    }

    .reaction-wrap {
        width: 400px;
        padding: 16px;
    }
</style>
