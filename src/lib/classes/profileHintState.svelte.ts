import { AppBskyActorDefs } from "@atproto/api";

class ProfileHintState {
    profile = $state<AppBskyActorDefs.ProfileViewBasic | undefined>();

    hasProfile(handle: string) {
        return this.profile?.handle === handle || this.profile?.did === handle;
    }

    set(profile: AppBskyActorDefs.ProfileViewBasic) {
        this.profile = profile;
    }

    clear() {
        this.profile = undefined;
    }
}

export const profileHintState = new ProfileHintState();
