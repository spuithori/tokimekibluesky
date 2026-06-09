class CarouselDragState {
    private lastDragEndAt = 0;

    markDragEnd() {
        this.lastDragEndAt = Date.now();
    }

    isRecentlyDragged(windowMs = 300): boolean {
        return Date.now() - this.lastDragEndAt < windowMs;
    }
}

export const carouselDragState = new CarouselDragState();
