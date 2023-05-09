<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    export let data;
    $: {
        const redirectTo = $page.url.searchParams.get('redirect');

        // check if user has been set in session store then redirect
        if (browser && data.session) {
            goto(redirectTo ?? '/');
        }
    }
</script>

<div class="logging-in">
  <p>ログイン中</p>
</div>

<style lang="postcss">
  .logging-in {
      padding: 50px 0;
  }
</style>