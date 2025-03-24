<script lang="ts">
    let { uri } = $props();
    let el = $state();

    $effect(() => {
        if (el) {
            try {
                twttr.widgets.load(el.current);
            } catch (e) {
                console.error(e);
            }
        }
    });
</script>

<div class="x-embed-wrap" bind:this={el}>
    <blockquote class="twitter-tweet"><p lang="ja" dir="ltr"></p><a href="https://twitter.com/{uri}"></a></blockquote>
</div>
