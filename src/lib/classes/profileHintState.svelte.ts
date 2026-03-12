class ProfileHintState {
    profile = $state<any | undefined>();

    hasProfile(handle: string) {
        return this.profile?.handle === handle || this.profile?.did === handle;
    }

    set(profile: any) {
        this.profile = profile;
    }

    clear() {
        this.profile = undefined;
    }
}

export const profileHintState = new ProfileHintState();
