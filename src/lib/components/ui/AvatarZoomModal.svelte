<script lang="ts">
  import { scale } from 'svelte/transition';
  import { onDestroy } from 'svelte';

  let { avatar, onclose }: { avatar: string, onclose: () => void } = $props();

  let el = $state<HTMLDialogElement>();
  let imgEl: HTMLButtonElement;
  let isDragging = false;
  let wasDragged = false;
  let startX = 0;
  let startY = 0;
  let dx = $state(0);
  let dy = $state(0);
  let currentAnimation: Animation | null = null;

  $effect.pre(() => {
    if (el) {
      el.showModal();
    }
  });

  function handleClick(event: MouseEvent) {
    if (event.target === el) {
      onclose();
    }
  }

  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    wasDragged = false;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    if (currentAnimation) {
      currentAnimation.cancel();
      currentAnimation = null;
    }
    imgEl.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      wasDragged = true;
      e.preventDefault();
    }
  }

  function finishDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (wasDragged) {
      const currentTransform = imgEl.style.transform;
      imgEl.style.transform = '';
      dx = 0;
      dy = 0;

      currentAnimation = imgEl.animate([
        { transform: currentTransform },
        { transform: 'scale(1.05, 0.95)', offset: 0.25 },
        { transform: 'scale(0.97, 1.03)', offset: 0.5 },
        { transform: 'scale(1.02, 0.98)', offset: 0.75 },
        { transform: 'scale(1, 1)' }
      ], {
        duration: 500,
        easing: 'ease-out',
      });
      currentAnimation.onfinish = () => { currentAnimation = null; };
    }
  }

  function cancelDrag() {
    if (!isDragging) return;
    isDragging = false;
    wasDragged = false;
    dx = 0;
    dy = 0;
    imgEl.style.transform = '';
  }

  function handleDragStart(e: DragEvent) {
    e.preventDefault();
  }

  function handleImgClick() {
    if (wasDragged) {
      wasDragged = false;
      return;
    }
    onclose();
  }

  onDestroy(() => {
    currentAnimation?.cancel();
  });

  let mochiTransform = $derived.by(() => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return undefined;

    const factor = Math.min(dist, 120) / 120;
    const angle = Math.atan2(dy, dx);

    const t = 35 * Math.tanh(dist / 120);
    const tx = t * Math.cos(angle);
    const ty = t * Math.sin(angle);

    const stretch = 1 + factor * 0.12;
    const compress = 1 / Math.sqrt(stretch);

    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${angle.toFixed(3)}rad) scale(${stretch.toFixed(3)}, ${compress.toFixed(3)}) rotate(${(-angle).toFixed(3)}rad)`;
  });
</script>

<dialog
  class="avatar-zoom-modal"
  bind:this={el}
  in:scale={{duration: 250, opacity: 0, start: 0.98}}
  onclick={handleClick}
  onclose={onclose}
>
  <button
    type="button"
    class="avatar-zoom-img mochi-enabled"
    bind:this={imgEl}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={finishDrag}
    onpointercancel={cancelDrag}
    onlostpointercapture={cancelDrag}
    ondragstart={handleDragStart}
    onclick={handleImgClick}
    style:transform={mochiTransform}
  >
    <img src={avatar} alt="" draggable="false" width="1000" height="1000">
  </button>
</dialog>

<style lang="postcss">
  .avatar-zoom-modal {
    margin: auto;
    border: none;
    background: transparent;
    overflow: visible;
    padding: 0;

    &::backdrop {
      background-color: rgba(0, 0, 0, .7);
    }
  }

  .avatar-zoom-img {
    width: min(80vw, 400px);
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    overflow: hidden;
    cursor: grab;
    padding: 0;
    border: none;
    background: none;
    -webkit-user-drag: none;
    user-select: none;
    touch-action: none;

    &:active {
      cursor: grabbing;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }
  }
</style>
