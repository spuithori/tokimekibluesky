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
  let isLongPressing = false;
  let startX = 0;
  let startY = 0;
  const MOVE_THRESHOLD = 10;

  function startPress(event: MouseEvent | TouchEvent): void {
    if (event.type === 'touchstart') {
      const touchEvent = event as TouchEvent;
      startX = touchEvent.touches[0].clientX;
      startY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = event as MouseEvent;
      startX = mouseEvent.clientX;
      startY = mouseEvent.clientY;
    }

    isLongPressing = true;
    timer = setTimeout(() => {
      if (isLongPressing) {
        params.callback();
      }
    }, params.duration);
  }

  function endPress(): void {
    isLongPressing = false;
    if (timer) {
      clearTimeout(timer);
    }
  }

  function movePress(event: MouseEvent | TouchEvent): void {
    if (!isLongPressing) return;

    let currentX: number;
    let currentY: number;

    if (event.type === 'touchmove') {
      const touchEvent = event as TouchEvent;
      currentX = touchEvent.touches[0].clientX;
      currentY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = event as MouseEvent;
      currentX = mouseEvent.clientX;
      currentY = mouseEvent.clientY;
    }

    if (
      Math.abs(currentX - startX) > MOVE_THRESHOLD ||
      Math.abs(currentY - startY) > MOVE_THRESHOLD
    ) {
      isLongPressing = false;
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  node.addEventListener('mousedown', startPress);
  node.addEventListener('touchstart', startPress);
  node.addEventListener('mouseup', endPress);
  node.addEventListener('mouseleave', endPress);
  node.addEventListener('touchend', endPress);
  node.addEventListener('touchcancel', endPress);
  node.addEventListener('mousemove', movePress);
  node.addEventListener('touchmove', movePress);

  return {
    update(newParams: Partial<LongPressParams>): void {
      params = { ...params, ...newParams };
    },
    destroy(): void {
      node.removeEventListener('mousedown', startPress);
      node.removeEventListener('touchstart', startPress);
      node.removeEventListener('mouseup', endPress);
      node.removeEventListener('mouseleave', endPress);
      node.removeEventListener('touchend', endPress);
      node.removeEventListener('touchcancel', endPress);
      node.removeEventListener('mousemove', movePress);
      node.removeEventListener('touchmove', movePress);
      if (timer) {
        clearTimeout(timer);
      }
    }
  };
}