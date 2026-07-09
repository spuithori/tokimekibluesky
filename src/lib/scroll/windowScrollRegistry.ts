const positions = new Map<string, number>();

export const windowScrollRegistry = {
    save(id: string): void {
        positions.set(id, window.scrollY);
    },
    restoreAfterFrame(id: string, fallbackTop?: number): void {
        const saved = positions.get(id);
        requestAnimationFrame(() => {
            if (saved !== undefined) {
                window.scrollTo(0, saved);
            } else if (fallbackTop !== undefined) {
                window.scrollTo(0, fallbackTop);
            }
        });
    },
    peek(id: string): number | undefined {
        return positions.get(id);
    },
    clear(): void {
        positions.clear();
    },
};
