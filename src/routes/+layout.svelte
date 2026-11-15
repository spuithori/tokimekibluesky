<script lang="ts">
    import type { Snippet } from "svelte";
    import { afterNavigate } from "$app/navigation";
    import { trackPageView } from "$lib/analytics/ga";

    let { children }: { children: Snippet } = $props();

    afterNavigate(({ from, to }) => {
        if (to?.route.id && from?.url.pathname !== to.url.pathname) {
            trackPageView(to.route.id);
        }
    });
</script>

{@render children()}
