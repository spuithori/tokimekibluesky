<script lang="ts">
  import { fly } from 'svelte/transition';
</script>

<div class="tok-bg" in:fly="{{ y: 0, duration: 250 }}">TokMek</div>

<style lang="postcss">
  .tok-bg {
      position: fixed;
      inset: 0;
      background-color: #000;
      z-index: 9999;
      color: #fff;
      font-size: 48px;
      letter-spacing: .1em;
      display: grid;
      place-items: center;
      font-weight: bold;
  }
</style>