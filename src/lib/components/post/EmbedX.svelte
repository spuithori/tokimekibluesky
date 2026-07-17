<script lang="ts">
    let { uri } = $props();

    function escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const srcdoc = $derived(
        '<!doctype html><html><head><meta charset="utf-8">'
        + '<style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body>'
        + `<blockquote class="twitter-tweet"><a href="https://twitter.com/${escapeHtml(String(uri))}"></a></blockquote>`
        + '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><' + '/script>'
        + '<script>var p=false;new ResizeObserver(function(){if(p)return;p=true;setTimeout(function(){p=false;if(frameElement){frameElement.style.height=document.body.scrollHeight+"px"}},0)}).observe(document.body)<' + '/script>'
        + '</body></html>'
    );
</script>

<div class="x-embed-wrap" data-vl-flex>
    <iframe
        title="X post"
        data-testid="x-embed-frame"
        {srcdoc}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    ></iframe>
</div>

<style>
    .x-embed-wrap {
        min-height: 175px;
    }

    .x-embed-wrap iframe {
        display: block;
        width: 100%;
        height: 175px;
        border: 0;
    }
</style>
