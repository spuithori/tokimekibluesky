<script lang="ts">
    let { shouldThrow = true } = $props();

    if (shouldThrow) {
        throw new Error('column exploded');
    }
</script>

<p data-testid="child-ok">child rendered</p>
