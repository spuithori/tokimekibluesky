import {accountsDb} from "$lib/db";

export function createAccountProfileLoader(getAgent: () => any, getKey: () => any) {
    const profile = $state({
        avatar: undefined as string | undefined,
        displayName: undefined as string | undefined,
    });

    accountsDb.accounts.get(getKey())
        .then((value) => {
            profile.avatar = value?.avatar;
            profile.displayName = value?.name;
        })
        .catch(console.error);

    async function loadFresh(): Promise<void> {
        const agent = getAgent();

        try {
            const res = await agent.xrpc.get('app.bsky.actor.getProfile', {actor: agent.did() as string});

            profile.avatar = res?.avatar || '';
            profile.displayName = res?.displayName || '';

            accountsDb.accounts.update(getKey(), {
                avatar: profile.avatar,
                name: profile.displayName,
            }).catch(console.error);
        } catch (e) {
            console.error(e);
        }
    }

    return { profile, loadFresh };
}
