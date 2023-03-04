<script lang="ts">
    import { enhance } from '$app/forms';
    /** @type {import('./$types').ActionData} */
    export let form;
</script>

<svelte:head>
  <title>Login</title>
</svelte:head>

<h1>Bluesky Web Client Alpha</h1>

<section>
  <form method="POST" use:enhance>
    <div class="group mb-5">
      <label for="email">Email</label>
      <input type="email" name="email" id="email" required />
    </div>

    <div class="group mb-5">
      <label for="password">Password</label>
      <input type="password" name="password" id="password" required />
    </div>

    <div class="submit-container mt-5">
      <button class="btn variant-filled-primary" type="submit">Login</button>
    </div>

    {#if form?.error}
      <div class="notice error">
        {form.error}
      </div>
    {/if}
  </form>
</section>

<style>
  h1 {
      margin-bottom: 20px;
  }

  label {
      margin-bottom: 5px;
  }

  input {
      border-radius: 4px;
      height: 50px;
      padding: 0 20px;
  }
</style>