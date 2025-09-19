interface LongPressParams {
  callback: () => void;
  duration: number;
}

interface ActionReturn {
  update: (params: Partial<LongPressParams>) => void;
  destroy: () => void;
}

export function createLongPress(
    node: HTMLElement,
    params: LongPressParams = { callback: () => {}, duration: 1000 }
): ActionReturn {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startX = 0;
  let startY = 0;
  const MOVE_THRESHOLD = 10;

  const handlePointerDown = (event: PointerEvent) => {
    node.setPointerCapture(event.pointerId);

    startX = event.clientX;
    startY = event.clientY;

    timer = setTimeout(() => {
      params.callback();
    }, params.duration);
  };

  const cancelPress = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!timer) return;

    const dx = Math.abs(event.clientX - startX);
    const dy = Math.abs(event.clientY - startY);

    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      cancelPress();
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    node.releasePointerCapture(event.pointerId);
    cancelPress();
  };

  const eventHandlers: [string, (event: Event) => void][] = [
    ['pointerdown', handlePointerDown as (event: Event) => void],
    ['pointermove', handlePointerMove as (event: Event) => void],
    ['pointerup', handlePointerUp as (event: Event) => void],
    ['pointercancel', handlePointerUp as (event: Event) => void],
  ];

  eventHandlers.forEach(([event, handler]) => {
    node.addEventListener(event, handler);
  });

  return {
    update(newParams: Partial<LongPressParams>): void {
      params = { ...params, ...newParams };
    },
    destroy(): void {
      eventHandlers.forEach(([event, handler]) => {
        node.removeEventListener(event, handler);
      });
      cancelPress();
    }
  };
}