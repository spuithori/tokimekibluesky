class RefreshSignal {
    count = $state(0);

    bump(): void {
        this.count += 1;
    }
}

export const refreshSignal = new RefreshSignal();
