<script>
    import { agent, settings } from '$lib/stores';
    import Infinite from "$lib/components/utils/Infinite.svelte";
    let cursor = '';
    let topics = $state([]);
    let renderedTopics = $derived.by(() => {
        return topics.map(topic => {
            if (topic.link.includes('/feed/')) {
                return topic;
            } else if (topic.link.includes('/topic/')) {
                const split = topic.link.split('/');
                const word = split.slice(-1)[0];

                return {
                    ...topic,
                    link: `/search?q=${word}`,
                }
            }
        })
    });
    let _agent = $agent;

    async function handleLoadMore(loaded, complete) {
        try {
            let raw = await _agent.agent.api.app.bsky.unspecced.getTrendingTopics({ limit: 20 }, {
                headers: {
                    'accept-language': $settings?.general?.userLanguage || 'en',
                }
            });
            topics = [...topics, ...raw.data.topics];

            complete();
        } catch (e) {
            console.error(e);
            complete();
        }
    }
</script>

<div class="topics">
  {#each renderedTopics as topic (topic)}
    <div class="topic-item">
      <p class="topic-item__title">
        <a href="{topic.link}">
          {topic.topic}
        </a>
      </p>
    </div>
  {/each}

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
    .topics {
        padding: 16px;
    }

    .topic-item {
        margin-bottom: 8px;

        &__title {
            font-weight: bold;
            color: var(--text-color-1);

            a {
                color: var(--text-color-1);
                display: block;
                border: 1px solid var(--border-color-2);
                padding: 8px;
                border-radius: var(--border-radius-3);
            }
        }
    }
</style>