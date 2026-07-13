<script lang="ts">
  interface Props {
    floor: number;
    settled: number;
    delay: number;
    steps?: Array<{ delay: number; height: number }> | null;
  }

  let { floor, settled, delay, steps = null }: Props = $props();
  let boxHeight = $state(floor);

  $effect(() => {
    const schedule = steps ?? [{ delay, height: settled }];
    const ids = schedule.map((step) => setTimeout(() => {
      requestAnimationFrame(() => {
        boxHeight = step.height;
      });
    }, step.delay));
    return () => ids.forEach(clearTimeout);
  });
</script>

<div class="volatile-box" data-testid="volatile-box" style:height="{boxHeight}px"></div>

<style>
  .volatile-box {
    background: repeating-linear-gradient(-45deg, #bbb, #bbb 8px, #e8e8e8 8px, #e8e8e8 16px);
  }
</style>
