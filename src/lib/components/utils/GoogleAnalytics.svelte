<script lang="ts">
  import { run } from 'svelte/legacy';

    import { page } from '$app/stores'

    run(() => {
        if (typeof gtag !== 'undefined') {
            gtag('config', 'G-XW80FHPE9G', {
                page_title: document.title,
                page_path: $page.url.pathname,
            })
        }
    });
</script>

<svelte:head>
  <script
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-XW80FHPE9G">
  </script>
  <script>
      window.dataLayer = window.dataLayer || []

      function gtag() {
          dataLayer.push(arguments)
      }

      gtag('js', new Date())
      gtag('config', 'G-XW80FHPE9G')
  </script>
</svelte:head>