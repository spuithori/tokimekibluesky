import type { ProfileAtmosphereState } from './profileAtmosphere.svelte';

export const PROFILE_ATMOSPHERE_RETAINED = 20;

export class ProfileAtmosphereStore {
    #states: ProfileAtmosphereState[] = [];
    readonly #limit: number;

    constructor(limit: number = PROFILE_ATMOSPHERE_RETAINED) {
        this.#limit = limit;
    }

    find(viewerDid: string | undefined, actor: string | undefined, detect: boolean): ProfileAtmosphereState | undefined {
        if (!actor) {
            return undefined;
        }
        return this.#states.find((state) => state.viewerDid === viewerDid && state.detect === detect && (state.did === actor || state.handle === actor));
    }

    retain(state: ProfileAtmosphereState): ProfileAtmosphereState {
        this.#states = [state, ...this.#states.filter((item) => item !== state && !(item.viewerDid === state.viewerDid && item.did === state.did))].slice(0, this.#limit);
        return state;
    }
}

export const profileAtmosphereStore = new ProfileAtmosphereStore();
