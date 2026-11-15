class PopoverController {
  #currentClose: (() => void) | null = null;

  register(close: () => void): () => void {
    if (this.#currentClose && this.#currentClose !== close) {
      const prev = this.#currentClose;
      this.#currentClose = null;
      prev();
    }
    this.#currentClose = close;
    return () => {
      if (this.#currentClose === close) this.#currentClose = null;
    };
  }

  _reset(): void {
    this.#currentClose = null;
  }
}

export const popover = new PopoverController();
