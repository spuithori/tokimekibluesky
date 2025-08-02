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
            position: relative;
            font-size: 14px;

            a {
              height: 44px;
              display: flex;
              align-items: center;
              padding: 0 12px;
              border: 2px solid var(--bg-color-2);
              background-color: var(--bg-color-2);
              border-radius: var(--border-radius-3);
              color: var(--text-color-1);
              font-weight: bold;
              gap: 8px;
              letter-spacing: .025em;
            }
        }
    }
</style>