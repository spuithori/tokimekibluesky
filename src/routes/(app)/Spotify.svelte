<script lang="ts">
    export let uri;
    let pathname;

    pathname = new URL(uri).pathname;
</script>

<span class="spotify-embed">
  <iframe
      style="border-radius:12px"
      src="https://open.spotify.com/embed{pathname}"
      width="100%"
      frameBorder="0"
      allowfullscreen=""
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
  ></iframe>
</span>

<style lang="postcss">
  .spotify-embed {
      display: block;
      margin: 10px 0;

      iframe {
          vertical-align: middle;
          height: 80px;
      }
  }
</style>