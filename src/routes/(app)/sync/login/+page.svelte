<script lang="ts">
    import { Auth } from '@supabase/auth-ui-svelte';
    import { ThemeSupa } from '@supabase/auth-ui-shared';

    export let data;
</script>

<svelte:head>
  <title>User Management</title>
</svelte:head>

<div class="timeline">
  <Auth
      supabaseClient={data.supabase}
      view="magic_link"
      redirectTo={`${data.url}/sync/logging-in?redirect=/`}
      showLinks={false}
      appearance={{ theme: ThemeSupa }}
  />
</div>

<style lang="postcss">
  .supabase-auth-ui_ui-input {
      color: var(--text-color-1) !important;
  }
</style>