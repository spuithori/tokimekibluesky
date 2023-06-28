<script lang="ts">
    import Notification from "./Notification.svelte";

    export let column;
    export let index;
</script>

<div class="timeline">
  <Notification isPage={true}></Notification>
</div>

<style lang="postcss">

</style>